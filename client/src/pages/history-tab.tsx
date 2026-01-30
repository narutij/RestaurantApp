import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkday } from '@/contexts/WorkdayContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPrice } from '@/lib/utils';
import { type OrderWithDetails } from '@shared/schema';
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ShoppingCart,
  Users,
  AlertCircle,
  History,
  Receipt
} from 'lucide-react';

interface TableHistoryGroup {
  tableId: number;
  tableNumber: string;
  tableLabel: string;
  peopleCount: number;
  orders: OrderWithDetails[];
  subtotal: number;
}

export default function HistoryTab() {
  const { selectedRestaurant } = useWorkday();
  const { t } = useLanguage();

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<number>>(new Set());

  // Format date for display and API
  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const dateString = selectedDate.toISOString().split('T')[0];

  // Check if today
  const isToday = useMemo(() => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }, [selectedDate]);

  // Fetch history summary
  const { data: summary, isLoading } = useQuery<{
    totalRevenue: number;
    orderCount: number;
    tablesServed: number;
    orders: OrderWithDetails[];
  }>({
    queryKey: ['history-summary', selectedRestaurant?.id, dateString],
    queryFn: async () => {
      if (!selectedRestaurant?.id) return { totalRevenue: 0, orderCount: 0, tablesServed: 0, orders: [] };
      const res = await fetch(`/api/history/summary?restaurantId=${selectedRestaurant.id}&date=${dateString}`);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
    enabled: !!selectedRestaurant?.id
  });

  // Group orders by table
  const tableGroups = useMemo<TableHistoryGroup[]>(() => {
    if (!summary?.orders) return [];

    const groups: Record<number, TableHistoryGroup> = {};

    summary.orders.forEach(order => {
      if (!groups[order.tableId]) {
        groups[order.tableId] = {
          tableId: order.tableId,
          tableNumber: order.tableNumber,
          tableLabel: order.tableLabel || '',
          peopleCount: order.peopleCount || 0,
          orders: [],
          subtotal: 0
        };
      }
      groups[order.tableId].orders.push(order);
      groups[order.tableId].subtotal += order.price;
    });

    return Object.values(groups).sort((a, b) => {
      // Sort by table number
      const numA = parseInt(a.tableNumber) || 0;
      const numB = parseInt(b.tableNumber) || 0;
      return numA - numB;
    });
  }, [summary?.orders]);

  // Change day
  const changeDay = (direction: 'next' | 'prev') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  // Toggle table expansion
  const toggleTable = (tableId: number) => {
    setExpandedTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableId)) {
        newSet.delete(tableId);
      } else {
        newSet.add(tableId);
      }
      return newSet;
    });
  };

  // No restaurant selected
  if (!selectedRestaurant) {
    return (
      <div className="p-4 pb-24 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="p-4 bg-warning/10 rounded-full mb-4">
          <AlertCircle className="h-12 w-12 text-warning" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{t('workday.noRestaurantSelected')}</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          {t('history.selectDate')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Date Picker Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => changeDay('prev')}
              className="h-10 w-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-base font-medium"
                >
                  <CalendarIcon className="h-5 w-5" />
                  {formattedDate}
                  {isToday && (
                    <Badge variant="secondary" className="ml-2">{t('workday.today')}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => changeDay('next')}
              className="h-10 w-10"
              disabled={isToday}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="p-2 bg-success/10 rounded-full w-fit mx-auto mb-2">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div className="text-2xl font-bold text-success">
              {formatPrice(summary?.totalRevenue || 0)}
            </div>
            <div className="text-xs text-muted-foreground">{t('history.totalRevenue')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="p-2 bg-primary/10 rounded-full w-fit mx-auto mb-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold">
              {summary?.orderCount || 0}
            </div>
            <div className="text-xs text-muted-foreground">{t('history.ordersCount')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="p-2 bg-warning/10 rounded-full w-fit mx-auto mb-2">
              <Users className="h-5 w-5 text-warning" />
            </div>
            <div className="text-2xl font-bold">
              {summary?.tablesServed || 0}
            </div>
            <div className="text-xs text-muted-foreground">{t('history.tablesServed')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-5 w-5" />
            Table Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : tableGroups.length === 0 ? (
            <div className="p-8 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {t('history.noData')}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y">
                {tableGroups.map(table => (
                  <div key={table.tableId}>
                    {/* Table Header */}
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      onClick={() => toggleTable(table.tableId)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedTables.has(table.tableId) ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="text-left">
                          <div className="font-medium">
                            Table {table.tableNumber}
                            {table.tableLabel && (
                              <span className="ml-2 text-muted-foreground font-normal">
                                {table.tableLabel}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {table.orders.length} {t('history.ordersCount')} · {table.peopleCount} {t('orders.people')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-success">
                          {formatPrice(table.subtotal)}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Orders */}
                    {expandedTables.has(table.tableId) && (
                      <div className="bg-muted/30 px-4 pb-4 pt-2 ml-8 mr-4 mb-4 rounded-lg">
                        <div className="divide-y divide-border">
                          {table.orders.map(order => (
                            <div key={order.id} className="py-2 flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {order.isSpecialItem && order.specialItemName
                                    ? order.specialItemName
                                    : order.menuItemName}
                                  {order.isSpecialItem && (
                                    <Badge variant="outline" className="ml-2 text-xs">{t('orders.special')}</Badge>
                                  )}
                                </div>
                                {order.notes && (
                                  <p className="text-xs text-muted-foreground">
                                    {t('orders.note')}: {order.notes}
                                  </p>
                                )}
                              </div>
                              <div className="text-sm font-medium">
                                {formatPrice(order.price)}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-3 mt-2 border-t flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Subtotal</span>
                          <span className="font-semibold">{formatPrice(table.subtotal)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Day Total */}
      {tableGroups.length > 0 && (
        <Card className="bg-success/5 border-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Day Total</div>
                <div className="text-sm text-muted-foreground">
                  {summary?.orderCount} orders across {summary?.tablesServed} tables
                </div>
              </div>
              <div className="text-2xl font-bold text-success">
                {formatPrice(summary?.totalRevenue || 0)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
