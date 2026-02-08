import React, { useState, useMemo } from 'react';
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
import { userService, type AppUser } from "@/lib/firestore";
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
  Clock,
  Calendar,
  ChevronLeft,
  TrendingUp,
} from 'lucide-react';

interface Statistics {
  revenue: number;
  peopleCount: number;
  topItems: Array<{ name: string; count: number; revenue: number }>;
}

interface WorkerStatistics {
  totalHours: number;
  shiftsCount: number;
  averageShiftLength: number;
  restaurants: Array<{ id: number; name: string; hours: number }>;
}

interface TopWorker {
  workerId: string;
  name: string;
  totalMinutes: number;
  avatarUrl?: string | null;
}

type StaffTimeframe = 'day' | 'week' | 'month' | 'year';

// Mini calendar component for showing worked days
function MiniCalendar({ workedDates, year, month, onMonthChange }: {
  workedDates: string[];
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
}) {
  const { language } = useLanguage();

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  // Adjust for Monday start (0=Mon, 6=Sun)
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const workedSet = useMemo(() => new Set(workedDates), [workedDates]);

  const dayLabels = language === 'lt'
    ? ['P', 'A', 'T', 'K', 'P', 'Š', 'S']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const monthNames = language === 'lt'
    ? ['Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handlePrevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };

  const handleNextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  return (
    <div className="mt-2">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-1.5">
        <button onClick={handlePrevMonth} className="p-0.5 hover:bg-muted rounded transition-colors">
          <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        </button>
        <span className="text-[10px] font-medium text-muted-foreground">
          {monthNames[month - 1]} {year}
        </span>
        <button onClick={handleNextMonth} className="p-0.5 hover:bg-muted rounded transition-colors">
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {dayLabels.map((d, i) => (
          <div key={i} className="text-center text-[8px] text-muted-foreground font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells for offset */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="h-5" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isWorked = workedSet.has(dateStr);
          const isToday = dateStr === todayStr;

          return (
            <div
              key={day}
              className={`h-5 flex items-center justify-center rounded-sm text-[9px] font-medium ${
                isWorked
                  ? 'bg-green-500/30 text-green-600 dark:text-green-400'
                  : isToday
                  ? 'bg-blue-500/20 text-blue-500'
                  : 'text-muted-foreground/60'
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RestaurantInfoTab() {
  const { isAdmin, appUser, currentUser } = useAuth();
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

  // Non-admin specific states
  const [hoursTimeframe, setHoursTimeframe] = useState<StaffTimeframe>('week');
  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);

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

  // Fetch all Firestore users for name/avatar resolution
  const { data: allUsers = [] } = useQuery<AppUser[]>({
    queryKey: ['all-workers'],
    queryFn: () => userService.getAll(),
    enabled: !isAdmin,
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

  // Resolve worker names and avatars from Firestore users
  const resolvedTopStaff = useMemo(() => {
    if (!topStaffData?.workers) return [];
    return topStaffData.workers.map(w => {
      const user = allUsers.find(u => u.id === w.workerId);
      return {
        ...w,
        name: user?.name || w.name,
        avatarUrl: user?.photoUrl || null,
      };
    });
  }, [topStaffData, allUsers]);

  // Fetch current user's working statistics (non-admin only)
  const { data: myStats } = useQuery<WorkerStatistics>({
    queryKey: ['worker-statistics', appUser?.id, hoursTimeframe],
    queryFn: async () => {
      if (!appUser?.id) return { totalHours: 0, shiftsCount: 0, averageShiftLength: 0, restaurants: [] };
      const res = await fetch(`/api/workers/${appUser.id}/statistics?period=${hoursTimeframe}`);
      if (!res.ok) throw new Error('Failed to fetch statistics');
      return res.json();
    },
    enabled: !!appUser?.id && !isAdmin,
  });

  // Fetch shift dates for mini calendar (non-admin only)
  const { data: shiftDatesData } = useQuery<{ dates: string[] }>({
    queryKey: ['worker-shift-dates', appUser?.id, calendarYear, calendarMonth],
    queryFn: async () => {
      if (!appUser?.id) return { dates: [] };
      const res = await fetch(`/api/workers/${appUser.id}/shift-dates?year=${calendarYear}&month=${calendarMonth}`);
      if (!res.ok) throw new Error('Failed to fetch shift dates');
      return res.json();
    },
    enabled: !!appUser?.id && !isAdmin,
  });

  const timeframeLabels: Record<Timeframe, string> = {
    week: t('timeframe.week') || 'Week',
    month: t('timeframe.month') || 'Month',
    quarter: t('timeframe.quarter') || 'Quarter',
    year: t('timeframe.year') || 'Year',
  };

  const staffTimeframeLabels: Record<StaffTimeframe, string> = {
    day: t('timeframe.day') || 'Day',
    week: t('timeframe.week') || 'Week',
    month: t('timeframe.month') || 'Month',
    year: t('timeframe.year') || 'Year',
  };

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
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
        {/* Top Widgets — phone: stack, tablet: row with Top Staff beside */}
        <motion.div
          className="flex flex-col lg:flex-row gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 * 0.1 }}
        >
          {/* Working Hours & Shifts — always side-by-side, keep phone proportions */}
          <div className="grid grid-cols-2 gap-3 lg:basis-1/2 lg:flex-shrink-0">
          {/* Working Hours Widget */}
          <Card className="overflow-hidden border-green-500/20 h-full">
            <CardContent className="p-4 relative h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-green-500/20 rounded-xl">
                    <Clock className="h-4 w-4 text-green-500" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px] px-2">
                        {staffTimeframeLabels[hoursTimeframe]}
                        <ChevronDown className="h-2.5 w-2.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setHoursTimeframe('day')}>
                        {staffTimeframeLabels.day}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setHoursTimeframe('week')}>
                        {staffTimeframeLabels.week}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setHoursTimeframe('month')}>
                        {staffTimeframeLabels.month}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setHoursTimeframe('year')}>
                        {staffTimeframeLabels.year}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-xs text-muted-foreground">{t('restaurant.workingHours') || 'Working Hours'}</p>
                <p className="text-2xl font-bold tracking-tight mt-1.5 text-green-600 dark:text-green-400">
                  {formatHours(myStats?.totalHours || 0)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {myStats?.shiftsCount || 0} {t('restaurant.shiftsCount') || 'shifts'}
                </p>
                <div className="mt-2 pt-2 border-t border-green-500/10">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded bg-green-500/10">
                      <TrendingUp className="h-2.5 w-2.5 text-green-500" />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{t('restaurant.avgPerShift') || 'Avg/shift'}</span>
                  </div>
                  <p className="text-sm font-semibold mt-0.5 text-green-600 dark:text-green-400">
                    {formatHours(myStats?.averageShiftLength || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shifts Widget with Mini Calendar */}
          <Card className="overflow-hidden border-blue-500/20 h-full">
            <CardContent className="p-3 relative h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent" />
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {t('restaurant.shifts') || 'Shifts'}
                  </span>
                </div>
                <MiniCalendar
                  workedDates={shiftDatesData?.dates || []}
                  year={calendarYear}
                  month={calendarMonth}
                  onMonthChange={(y, m) => {
                    setCalendarYear(y);
                    setCalendarMonth(m);
                  }}
                />
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Top Staff — full width on phone, fills remaining space on tablet */}
          <div className="lg:flex-1 lg:min-w-0">
            <TopStaffWidget
              workers={resolvedTopStaff}
              timeframe={topStaffTimeframe}
              onTimeframeChange={setTopStaffTimeframe}
              isLoading={loadingTopStaff}
            />
          </div>
        </motion.div>

        {/* Restaurant Board */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 * 0.1 }}
        >
          <RemindersSection restaurantId={selectedRestaurant?.id} />
        </motion.div>

        {/* Action Buttons - Staff (view-only), Menu Designer, Floor Layouts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3 * 0.1 }}
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

        {/* Modals */}
        <WorkersModal
          open={workersModalOpen}
          onOpenChange={setWorkersModalOpen}
          viewOnly={true}
        />

        <MenuModal
          open={menuModalOpen}
          onOpenChange={setMenuModalOpen}
          restaurant={selectedRestaurant}
          currentUserId={currentUser?.uid || appUser?.uid}
        />

        <TableLayoutsModal
          open={tableLayoutModalOpen}
          onOpenChange={setTableLayoutModalOpen}
          restaurant={selectedRestaurant}
          currentUserId={currentUser?.uid || appUser?.uid}
        />
      </div>
    );
  }

  // Full admin view
  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Top Widgets — phone: stack, tablet: row with Top Dishes beside */}
      <motion.div
        className="flex flex-col lg:flex-row gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 * 0.1 }}
      >
        {/* Revenue & Clients — always side-by-side, keep phone proportions */}
        <div className="grid grid-cols-2 gap-3 lg:basis-1/2 lg:flex-shrink-0">
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
        </div>

        {/* Top Dishes — full width on phone, fills remaining space on tablet */}
        <div className="lg:flex-1 lg:min-w-0">
          <TopItemsWidget
            items={topDishesStats?.topItems || []}
            timeframe={topDishesTimeframe}
            onTimeframeChange={setTopDishesTimeframe}
            isLoading={loadingTopDishes}
          />
        </div>
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
        currentUserId={currentUser?.uid || appUser?.uid}
      />

      <TableLayoutsModal
        open={tableLayoutModalOpen}
        onOpenChange={setTableLayoutModalOpen}
        restaurant={selectedRestaurant}
        currentUserId={currentUser?.uid || appUser?.uid}
      />
    </div>
  );
}
