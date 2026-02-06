import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkday } from "@/contexts/WorkdayContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { type Timeframe } from "@/components/widgets/StatWidget";
import { TopItemsWidget } from "@/components/widgets/TopItemsWidget";
import { TopStaffWidget } from "@/components/widgets/TopStaffWidget";
import { RemindersSection } from "@/components/RemindersSection";
import { MenuModal } from "@/components/modals/MenuModal";
import { TableLayoutsModal } from "@/components/modals/TableLayoutsModal";
import { WorkersModal } from "@/components/modals/WorkersModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Building2,
  DollarSign,
  Euro,
  Users,
  MenuSquare,
  Grid2X2,
  ChevronRight,
  ChevronDown,
  UserCog,
} from 'lucide-react';

interface Statistics {
  revenue: number;
  peopleCount: number;
  topItems: Array<{ name: string; count: number; revenue: number }>;
}

interface TopWorker {
  workerId: string;
  name: string;
  totalMinutes: number;
}

type StaffTimeframe = 'day' | 'week' | 'month';

export default function RestaurantInfoTab() {
  const { isAdmin } = useAuth();
  const { selectedRestaurant } = useWorkday();
  const { t, formatPrice, language } = useLanguage();

  // Modal states
  const [workersModalOpen, setWorkersModalOpen] = useState(false);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [tableLayoutModalOpen, setTableLayoutModalOpen] = useState(false);

  // Separate timeframe states for each widget
  const [revenueTimeframe, setRevenueTimeframe] = useState<Timeframe>('week');
  const [clientsTimeframe, setClientsTimeframe] = useState<Timeframe>('week');
  const [topDishesTimeframe, setTopDishesTimeframe] = useState<Timeframe>('week');
  const [topStaffTimeframe, setTopStaffTimeframe] = useState<StaffTimeframe>('week');

  // Fetch revenue statistics (admin only)
  const { data: revenueStats } = useQuery<Statistics>({
    queryKey: ['statistics', selectedRestaurant?.id, revenueTimeframe, 'revenue'],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return { revenue: 0, peopleCount: 0, topItems: [] };
      const res = await fetch(`/api/statistics?restaurantId=${selectedRestaurant.id}&timeframe=${revenueTimeframe}`);
      if (!res.ok) throw new Error('Failed to fetch statistics');
      return res.json();
    },
    enabled: !!selectedRestaurant?.id && isAdmin,
  });

  // Fetch clients statistics (admin only)
  const { data: clientsStats } = useQuery<Statistics>({
    queryKey: ['statistics', selectedRestaurant?.id, clientsTimeframe, 'clients'],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return { revenue: 0, peopleCount: 0, topItems: [] };
      const res = await fetch(`/api/statistics?restaurantId=${selectedRestaurant.id}&timeframe=${clientsTimeframe}`);
      if (!res.ok) throw new Error('Failed to fetch statistics');
      return res.json();
    },
    enabled: !!selectedRestaurant?.id && isAdmin,
  });

  // Fetch top dishes statistics (admin only)
  const { data: topDishesStats, isLoading: loadingTopDishes } = useQuery<Statistics>({
    queryKey: ['statistics', selectedRestaurant?.id, topDishesTimeframe, 'topDishes'],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return { revenue: 0, peopleCount: 0, topItems: [] };
      const res = await fetch(`/api/statistics?restaurantId=${selectedRestaurant.id}&timeframe=${topDishesTimeframe}`);
      if (!res.ok) throw new Error('Failed to fetch statistics');
      return res.json();
    },
    enabled: !!selectedRestaurant?.id && isAdmin,
  });

  // Fetch top staff statistics (non-admin only)
  const { data: topStaffData, isLoading: loadingTopStaff } = useQuery<{ workers: TopWorker[] }>({
    queryKey: ['top-staff', selectedRestaurant?.id, topStaffTimeframe],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return { workers: [] };
      const res = await fetch(`/api/statistics/top-workers?restaurantId=${selectedRestaurant.id}&timeframe=${topStaffTimeframe}`);
      if (!res.ok) throw new Error('Failed to fetch top staff');
      return res.json();
    },
    enabled: !!selectedRestaurant?.id && !isAdmin,
  });

  const timeframeLabels: Record<Timeframe, string> = {
    week: t('timeframe.week') || 'Week',
    month: t('timeframe.month') || 'Month',
    quarter: t('timeframe.quarter') || 'Quarter',
    year: t('timeframe.year') || 'Year',
  };

  // Show restaurant selection prompt if none selected
  if (!selectedRestaurant) {
    return (
      <div className="p-4 pb-24 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="p-4 bg-muted rounded-full mb-4">
          <Building2 className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{t('restaurant.noRestaurant') || 'No Restaurant Selected'}</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          {t('restaurant.selectFromTopBar') || 'Select a restaurant from the top bar to get started.'}
        </p>
      </div>
    );
  }

  // Restricted view for non-admins (Floor/Kitchen roles)
  if (!isAdmin) {
    return (
      <div className="p-4 pb-24 space-y-4">
        {/* Top Staff Widget - Shows top workers by working time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 * 0.1 }}
        >
          <TopStaffWidget
            workers={topStaffData?.workers || []}
            timeframe={topStaffTimeframe}
            onTimeframeChange={setTopStaffTimeframe}
            isLoading={loadingTopStaff}
          />
        </motion.div>

        {/* Restaurant Board */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 * 0.1 }}
        >
          <RemindersSection restaurantId={selectedRestaurant?.id} />
        </motion.div>

        {/* Action Buttons - Staff (view-only), Menu Designer, Floor Layouts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 * 0.1 }}
        >
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {/* Staff (view-only for non-admins) */}
              <button
                className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
                onClick={() => setWorkersModalOpen(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/10 rounded-xl">
                    <Users className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="text-left">
                    <span className="font-medium block">{t('restaurant.staff') || 'Staff'}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('restaurant.viewTeam') || 'View team members'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>

              {/* Menu Designer */}
              <button
                className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
                onClick={() => setMenuModalOpen(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-500/10 rounded-xl">
                    <MenuSquare className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-left">
                    <span className="font-medium block">{t('restaurant.menuDesigner') || 'Menu Designer'}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('restaurant.viewCreateMenus') || 'View and create menus'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>

              {/* Floor Layouts */}
              <button
                className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
                onClick={() => setTableLayoutModalOpen(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 rounded-xl">
                    <Grid2X2 className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <span className="font-medium block">{t('restaurant.floorLayouts') || 'Floor Layouts'}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('restaurant.viewCreateLayouts') || 'View and create layouts'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Modals - passing canDelete=false for non-admins */}
        <WorkersModal
          open={workersModalOpen}
          onOpenChange={setWorkersModalOpen}
        />

        <MenuModal
          open={menuModalOpen}
          onOpenChange={setMenuModalOpen}
          restaurant={selectedRestaurant}
          canDelete={false}
        />

        <TableLayoutsModal
          open={tableLayoutModalOpen}
          onOpenChange={setTableLayoutModalOpen}
          restaurant={selectedRestaurant}
          canDelete={false}
        />
      </div>
    );
  }

  // Full admin view
  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Revenue & Clients - Horizontal Row */}
      <motion.div
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 * 0.1 }}
      >
        {/* Revenue Widget */}
        <Card className="overflow-hidden border-green-500/20">
          <CardContent className="p-4 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-500/20 rounded-xl">
                  {language === 'lt' ? <Euro className="h-4 w-4 text-green-500" /> : <DollarSign className="h-4 w-4 text-green-500" />}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px] px-2">
                      {timeframeLabels[revenueTimeframe]}
                      <ChevronDown className="h-2.5 w-2.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setRevenueTimeframe('week')}>
                      {timeframeLabels.week}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRevenueTimeframe('month')}>
                      {timeframeLabels.month}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRevenueTimeframe('quarter')}>
                      {timeframeLabels.quarter}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRevenueTimeframe('year')}>
                      {timeframeLabels.year}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-xs text-muted-foreground">{t('restaurant.revenue') || 'Revenue'}</p>
              <p className="text-xl font-bold tracking-tight mt-1 text-green-600 dark:text-green-400">
                {formatPrice(revenueStats?.revenue || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Clients Widget */}
        <Card className="overflow-hidden border-blue-500/20">
          <CardContent className="p-4 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-500/20 rounded-xl">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px] px-2">
                      {timeframeLabels[clientsTimeframe]}
                      <ChevronDown className="h-2.5 w-2.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setClientsTimeframe('week')}>
                      {timeframeLabels.week}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setClientsTimeframe('month')}>
                      {timeframeLabels.month}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setClientsTimeframe('quarter')}>
                      {timeframeLabels.quarter}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setClientsTimeframe('year')}>
                      {timeframeLabels.year}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-xs text-muted-foreground">{t('restaurant.clients') || 'Clients'}</p>
              <p className="text-xl font-bold tracking-tight mt-1 text-blue-600 dark:text-blue-400">
                {clientsStats?.peopleCount || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Dishes Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 * 0.1 }}
      >
        <TopItemsWidget
          items={topDishesStats?.topItems || []}
          timeframe={topDishesTimeframe}
          onTimeframeChange={setTopDishesTimeframe}
          isLoading={loadingTopDishes}
        />
      </motion.div>

      {/* Restaurant Board (formerly Reminders) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 * 0.1 }}
      >
        <RemindersSection restaurantId={selectedRestaurant?.id} />
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3 * 0.1 }}
      >
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {/* Staff Management */}
          <button
            className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
            onClick={() => setWorkersModalOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 rounded-xl">
                <UserCog className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-left">
                <span className="font-medium block">{t('restaurant.staffManagement') || 'Staff Management'}</span>
                <span className="text-xs text-muted-foreground">
                  {t('restaurant.manageTeam') || 'Manage your team and permissions'}
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Menu Designer */}
          <button
            className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
            onClick={() => setMenuModalOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500/10 rounded-xl">
                <MenuSquare className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-left">
                <span className="font-medium block">{t('restaurant.menuDesigner') || 'Menu Designer'}</span>
                <span className="text-xs text-muted-foreground">
                  {t('restaurant.createEditMenus') || 'Create and edit menus'}
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Floor Layouts */}
          <button
            className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
            onClick={() => setTableLayoutModalOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-xl">
                <Grid2X2 className="h-5 w-5 text-amber-500" />
              </div>
              <div className="text-left">
                <span className="font-medium block">{t('restaurant.floorLayouts') || 'Floor Layouts'}</span>
                <span className="text-xs text-muted-foreground">
                  {t('restaurant.manageLayouts') || 'Manage table arrangements'}
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>
      </motion.div>

      {/* Modals */}
      <WorkersModal
        open={workersModalOpen}
        onOpenChange={setWorkersModalOpen}
      />

      <MenuModal
        open={menuModalOpen}
        onOpenChange={setMenuModalOpen}
        restaurant={selectedRestaurant}
        canDelete={true}
      />

      <TableLayoutsModal
        open={tableLayoutModalOpen}
        onOpenChange={setTableLayoutModalOpen}
        restaurant={selectedRestaurant}
        canDelete={true}
      />
    </div>
  );
}
