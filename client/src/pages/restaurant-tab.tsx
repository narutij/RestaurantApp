import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkday } from "@/contexts/WorkdayContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { type Timeframe } from "@/components/widgets/StatWidget";
import { TopItemsWidget } from "@/components/widgets/TopItemsWidget";
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

export default function RestaurantInfoTab() {
  const { isAdmin } = useAuth();
  const { selectedRestaurant } = useWorkday();
  const { t } = useLanguage();

  // Modal states
  const [workersModalOpen, setWorkersModalOpen] = useState(false);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [tableLayoutModalOpen, setTableLayoutModalOpen] = useState(false);

  // Separate timeframe states for each widget
  const [revenueTimeframe, setRevenueTimeframe] = useState<Timeframe>('week');
  const [clientsTimeframe, setClientsTimeframe] = useState<Timeframe>('week');
  const [topDishesTimeframe, setTopDishesTimeframe] = useState<Timeframe>('week');

  // Fetch revenue statistics
  const { data: revenueStats } = useQuery<Statistics>({
    queryKey: ['statistics', selectedRestaurant?.id, revenueTimeframe, 'revenue'],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return { revenue: 0, peopleCount: 0, topItems: [] };
      const res = await fetch(`/api/statistics?restaurantId=${selectedRestaurant.id}&timeframe=${revenueTimeframe}`);
      if (!res.ok) throw new Error('Failed to fetch statistics');
      return res.json();
    },
    enabled: !!selectedRestaurant?.id,
  });

  // Fetch clients statistics
  const { data: clientsStats } = useQuery<Statistics>({
    queryKey: ['statistics', selectedRestaurant?.id, clientsTimeframe, 'clients'],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return { revenue: 0, peopleCount: 0, topItems: [] };
      const res = await fetch(`/api/statistics?restaurantId=${selectedRestaurant.id}&timeframe=${clientsTimeframe}`);
      if (!res.ok) throw new Error('Failed to fetch statistics');
      return res.json();
    },
    enabled: !!selectedRestaurant?.id,
  });

  // Fetch top dishes statistics
  const { data: topDishesStats, isLoading: loadingTopDishes } = useQuery<Statistics>({
    queryKey: ['statistics', selectedRestaurant?.id, topDishesTimeframe, 'topDishes'],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return { revenue: 0, peopleCount: 0, topItems: [] };
      const res = await fetch(`/api/statistics?restaurantId=${selectedRestaurant.id}&timeframe=${topDishesTimeframe}`);
      if (!res.ok) throw new Error('Failed to fetch statistics');
      return res.json();
    },
    enabled: !!selectedRestaurant?.id,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('lt-LT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const timeframeLabels: Record<Timeframe, string> = {
    week: t('timeframe.week') || 'Week',
    month: t('timeframe.month') || 'Month',
    quarter: t('timeframe.quarter') || 'Quarter',
    year: t('timeframe.year') || 'Year',
  };

  // Only show to admins
  if (!isAdmin) {
    return (
      <div className="p-4 pb-24 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="p-4 bg-destructive/10 rounded-full mb-4">
          <Building2 className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{t('common.accessRestricted') || 'Access Restricted'}</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          {t('restaurant.adminOnly') || 'Restaurant management is only available for administrators.'}
        </p>
      </div>
    );
  }

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

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Revenue & Clients - Horizontal Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Revenue Widget */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-500/10 rounded-xl">
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
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
            <p className="text-xl font-bold tracking-tight mt-1">
              {formatPrice(revenueStats?.revenue || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Clients Widget */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
            <p className="text-xl font-bold tracking-tight mt-1">
              {clientsStats?.peopleCount || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Dishes Widget */}
      <TopItemsWidget
        items={topDishesStats?.topItems || []}
        timeframe={topDishesTimeframe}
        onTimeframeChange={setTopDishesTimeframe}
        isLoading={loadingTopDishes}
      />

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {/* Workers Management */}
          <button
            className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
            onClick={() => setWorkersModalOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 rounded-xl">
                <UserCog className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-left">
                <span className="font-medium block">{t('restaurant.workersManagement') || 'Workers Management'}</span>
                <span className="text-xs text-muted-foreground">
                  {t('restaurant.manageTeam') || 'Manage your team and permissions'}
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Menu Management */}
          <button
            className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
            onClick={() => setMenuModalOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500/10 rounded-xl">
                <MenuSquare className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-left">
                <span className="font-medium block">{t('restaurant.menuManagement') || 'Menu Management'}</span>
                <span className="text-xs text-muted-foreground">
                  {t('restaurant.createEditMenus') || 'Create and edit menus'}
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Table Layouts */}
          <button
            className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
            onClick={() => setTableLayoutModalOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-xl">
                <Grid2X2 className="h-5 w-5 text-amber-500" />
              </div>
              <div className="text-left">
                <span className="font-medium block">{t('restaurant.tableLayouts') || 'Table Layouts'}</span>
                <span className="text-xs text-muted-foreground">
                  {t('restaurant.manageLayouts') || 'Manage table arrangements'}
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Reminders Section */}
      <RemindersSection restaurantId={selectedRestaurant?.id} />

      {/* Modals */}
      <WorkersModal
        open={workersModalOpen}
        onOpenChange={setWorkersModalOpen}
      />

      <MenuModal
        open={menuModalOpen}
        onOpenChange={setMenuModalOpen}
        restaurant={selectedRestaurant}
      />

      <TableLayoutsModal
        open={tableLayoutModalOpen}
        onOpenChange={setTableLayoutModalOpen}
        restaurant={selectedRestaurant}
      />
    </div>
  );
}
