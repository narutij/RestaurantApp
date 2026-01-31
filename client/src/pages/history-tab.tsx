import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useWorkday } from '@/contexts/WorkdayContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatPrice, formatTime } from '@/lib/utils';
import { type OrderWithDetails, type WebSocketMessage } from '@shared/schema';
import { motion, AnimatePresence } from 'framer-motion';
import { type DateRange } from 'react-day-picker';
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  DollarSign,
  ShoppingCart,
  Users,
  AlertCircle,
  History,
  Receipt,
  Clock,
  UserCheck,
  Layers,
  Timer,
  Play,
  Square,
  CircleDot,
  Utensils,
  Activity,
  Briefcase,
  Download,
  Loader2,
  FileSpreadsheet,
  X,
} from 'lucide-react';

// Types for detailed history
interface ShiftWorker {
  workerId: string;
  joinedAt: Date;
}

interface Shift {
  id: number;
  startedAt: Date | null;
  endedAt: Date | null;
  isActive: boolean;
  workers: ShiftWorker[];
  revenue: number;
  orderCount: number;
  tablesServed: number;
  peopleServed: number;
  orders: OrderWithDetails[];
}

interface DetailedHistory {
  shifts: Shift[];
  totals: {
    revenue: number;
    orderCount: number;
    tablesServed: number;
    peopleServed: number;
    workersCount: number;
  };
}

interface TableHistoryGroup {
  tableId: number;
  tableNumber: string;
  peopleCount: number;
  orders: OrderWithDetails[];
  subtotal: number;
  sessionKey: string; // Unique key for each table session
  sessionStart: Date; // When this session started (first order)
  sessionEnd: Date; // When this session ended (last order)
  sessionDuration: string; // Formatted duration
}

// Running time component for active shifts
const RunningShiftTime = ({ startTime }: { startTime: Date | string }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - start.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <span className="font-mono">
      {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  );
};

// Format shift duration
const formatShiftDuration = (startedAt: Date | null, endedAt: Date | null): string => {
  if (!startedAt) return '-';
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

// Format time range
const formatTimeRange = (startedAt: Date | null, endedAt: Date | null): string => {
  if (!startedAt) return 'Not started';
  const start = new Date(startedAt);
  const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (!endedAt) return `${startStr} - ongoing`;
  const end = new Date(endedAt);
  const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${startStr} - ${endStr}`;
};

// Stat Card Component
const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  color = 'primary',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'primary' | 'success' | 'warning' | 'info';
}) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            <div className="text-xs text-muted-foreground truncate">{label}</div>
            {subValue && (
              <div className="text-xs text-muted-foreground/70 mt-0.5">{subValue}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Worker stats for breakdown
interface WorkerStats {
  workerId: string;
  joinedAt: Date;
  workingTime: string;
  tablesServed: number;
}

// Shift Card Component
const ShiftCard = ({
  shift,
  shiftNumber,
  totalShifts,
}: {
  shift: Shift;
  shiftNumber: number;
  totalShifts: number;
}) => {
  const [isTableBreakdownOpen, setIsTableBreakdownOpen] = useState(false);
  const [isWorkersBreakdownOpen, setIsWorkersBreakdownOpen] = useState(false);
  const [expandedTables, setExpandedTables] = useState<string[]>([]);

  // Group orders by table SESSION (not just tableId)
  // A session is identified by grouping consecutive orders for a table
  // with a max gap of 30 minutes between orders
  const tableGroups = useMemo<TableHistoryGroup[]>(() => {
    const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes gap = new session
    
    // Sort all orders chronologically first
    const sortedOrders = [...shift.orders].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Group by sessions
    const sessions: TableHistoryGroup[] = [];
    const tableSessionMap: Record<number, { lastOrderTime: number; sessionIndex: number }> = {};
    
    sortedOrders.forEach(order => {
      const orderTime = new Date(order.timestamp).getTime();
      const tableId = order.tableId;
      
      // Check if this is a new session for this table
      const existingSession = tableSessionMap[tableId];
      const isNewSession = !existingSession || (orderTime - existingSession.lastOrderTime > SESSION_GAP_MS);
      
      if (isNewSession) {
        // Create a new session
        const sessionIndex = sessions.length;
        const sessionStart = new Date(order.timestamp);
        sessions.push({
          tableId: order.tableId,
          tableNumber: order.tableNumber,
          peopleCount: order.peopleCount || 0,
          orders: [order],
          subtotal: order.price,
          sessionKey: `${order.tableId}-${sessionIndex}`,
          sessionStart,
          sessionEnd: sessionStart,
          sessionDuration: '0m'
        });
        tableSessionMap[tableId] = { lastOrderTime: orderTime, sessionIndex };
      } else {
        // Add to existing session
        const session = sessions[existingSession.sessionIndex];
        session.orders.push(order);
        session.subtotal += order.price;
        session.sessionEnd = new Date(order.timestamp);
        tableSessionMap[tableId].lastOrderTime = orderTime;
        
        // Update duration
        const durationMs = session.sessionEnd.getTime() - session.sessionStart.getTime();
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        session.sessionDuration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      }
    });

    // Sort sessions by start time (latest first)
    return sessions.sort((a, b) => 
      b.sessionStart.getTime() - a.sessionStart.getTime()
    );
  }, [shift.orders]);

  // Calculate worker stats
  const workerStats = useMemo<WorkerStats[]>(() => {
    return shift.workers.map(worker => {
      const joinedAt = new Date(worker.joinedAt);
      const endTime = shift.endedAt ? new Date(shift.endedAt) : new Date();
      const diffMs = endTime.getTime() - joinedAt.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      // Count unique tables this worker could have served (simplified - all tables in shift)
      const tablesServed = tableGroups.length;
      
      return {
        workerId: worker.workerId,
        joinedAt: joinedAt,
        workingTime: `${hours}h ${minutes}m`,
        tablesServed,
      };
    });
  }, [shift.workers, shift.endedAt, tableGroups.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: shiftNumber * 0.1 }}
    >
      <Card className={`overflow-hidden ${shift.isActive ? 'border-green-500/50 shadow-green-500/10 shadow-lg' : ''}`}>
        {/* Shift Header */}
        <div className={`p-4 ${shift.isActive 
          ? 'bg-gradient-to-r from-green-500/20 via-emerald-500/10 to-transparent' 
          : 'bg-gradient-to-r from-slate-100 to-transparent dark:from-slate-800/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${shift.isActive 
                ? 'bg-green-500 text-white' 
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {shift.isActive ? (
                  <Activity className="h-5 w-5 animate-pulse" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">
                    Shift {shiftNumber}
                    {totalShifts > 1 && <span className="text-muted-foreground">/{totalShifts}</span>}
                  </h3>
                  {shift.isActive && (
                    <Badge className="bg-green-500 text-white animate-pulse">
                      <CircleDot className="h-3 w-3 mr-1" />
                      Live
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Timer className="h-3.5 w-3.5" />
                  {formatTimeRange(shift.startedAt, shift.endedAt)}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                {shift.isActive && shift.startedAt ? (
                  <Badge variant="outline" className="font-mono bg-green-500/10 border-green-500/30">
                    <Play className="h-3 w-3 mr-1 text-green-500" />
                    <RunningShiftTime startTime={shift.startedAt} />
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted/50">
                    <Square className="h-3 w-3 mr-1" />
                    {formatShiftDuration(shift.startedAt, shift.endedAt)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Shift Stats */}
        <div className="p-4 border-b bg-muted/30">
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatPrice(shift.revenue)}
              </div>
              <div className="text-xs text-muted-foreground">Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{shift.orderCount}</div>
              <div className="text-xs text-muted-foreground">Orders</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{shift.tablesServed}</div>
              <div className="text-xs text-muted-foreground">Tables</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{shift.peopleServed}</div>
              <div className="text-xs text-muted-foreground">Guests</div>
            </div>
          </div>
        </div>

        {/* Workers Breakdown - Collapsible */}
        {shift.workers.length > 0 && (
          <Collapsible open={isWorkersBreakdownOpen} onOpenChange={setIsWorkersBreakdownOpen}>
            <CollapsibleTrigger className="w-full p-4 border-b hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Workers</span>
                  <Badge variant="secondary" className="text-xs">
                    {shift.workers.length}
                  </Badge>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isWorkersBreakdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-2 space-y-2">
                {workerStats.map((worker, idx) => (
                  <div 
                    key={`${worker.workerId}-${idx}`}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Users className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <div className="font-medium">{worker.workerId}</div>
                        <div className="text-xs text-muted-foreground">
                          Started {worker.joinedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{worker.workingTime}</div>
                      <div className="text-xs text-muted-foreground">
                        {worker.tablesServed} tables
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Tables Breakdown - Collapsible */}
        {tableGroups.length > 0 && (
          <Collapsible open={isTableBreakdownOpen} onOpenChange={setIsTableBreakdownOpen}>
            <CollapsibleTrigger className="w-full p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Table Breakdown</span>
                  <Badge variant="secondary" className="text-xs">
                    {tableGroups.length} sessions
                  </Badge>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isTableBreakdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-2">
                <Accordion 
                  type="multiple" 
                  value={expandedTables}
                  onValueChange={setExpandedTables}
                  className="space-y-2"
                >
                  {tableGroups.map(table => (
                    <AccordionItem 
                      key={table.sessionKey} 
                      value={table.sessionKey}
                      className="border rounded-lg overflow-hidden"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                        <div className="flex items-center justify-between w-full pr-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Utensils className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Table {table.tableNumber}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {table.orders.length} items
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {table.peopleCount}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400">
                              <Clock className="h-3 w-3 mr-1" />
                              {table.sessionDuration || '< 1m'}
                            </Badge>
                          </div>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {formatPrice(table.subtotal)}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="px-4 pb-3 pt-1">
                          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                            <Timer className="h-3 w-3" />
                            {table.sessionStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {' → '}
                            {table.sessionEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="space-y-2">
                            {table.orders.map(order => (
                              <div 
                                key={order.id} 
                                className="flex items-center justify-between py-2 border-b last:border-0"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">
                                      {order.isSpecialItem && order.specialItemName
                                        ? order.specialItemName
                                        : order.menuItemName}
                                    </span>
                                    {order.isSpecialItem && (
                                      <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600">
                                        Special
                                      </Badge>
                                    )}
                                  </div>
                                  {order.notes && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      📝 {order.notes}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    {formatTime(order.timestamp)}
                                  </p>
                                </div>
                                <span className="text-sm font-medium">
                                  {formatPrice(order.price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Empty State */}
        {tableGroups.length === 0 && shift.workers.length === 0 && (
          <div className="p-8 text-center">
            <History className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">No orders in this shift yet</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

// Main History Tab Component
export default function HistoryTab() {
  const { selectedRestaurant } = useWorkday();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { addMessageListener } = useWebSocketContext();
  const { addNotification } = useNotifications();

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Export modal state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportDateRange, setExportDateRange] = useState<DateRange | undefined>(undefined);
  const [exportRangeCalendarOpen, setExportRangeCalendarOpen] = useState(false);

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

  // Fetch detailed history with shifts
  const { data: history, isLoading, refetch } = useQuery<DetailedHistory>({
    queryKey: ['history-detailed', selectedRestaurant?.id, dateString],
    queryFn: async () => {
      if (!selectedRestaurant?.id) {
        return { shifts: [], totals: { revenue: 0, orderCount: 0, tablesServed: 0, peopleServed: 0, workersCount: 0 } };
      }
      const res = await fetch(`/api/history/detailed?restaurantId=${selectedRestaurant.id}&date=${dateString}`);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
    enabled: !!selectedRestaurant?.id,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: isToday ? 5000 : false,
  });

  // Listen for WebSocket updates for live updates
  useEffect(() => {
    const removeListener = addMessageListener((message: WebSocketMessage) => {
      if ([
        'NEW_ORDER',
        'COMPLETE_ORDER', 
        'UNCOMPLETE_ORDER',
        'ACTIVATE_TABLE',
        'DEACTIVATE_TABLE',
        'WORKDAY_STARTED',
        'WORKDAY_ENDED',
      ].includes(message.type)) {
        queryClient.invalidateQueries({ queryKey: ['history-detailed'] });
        queryClient.invalidateQueries({ queryKey: ['history-summary'] });
        refetch();
      }
    });
    return () => removeListener();
  }, [addMessageListener, queryClient, refetch]);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Handle export - direct download
  const handleExport = async () => {
    if (!exportDateRange?.from || !selectedRestaurant) return;
    
    setIsExporting(true);
    
    try {
      const startDate = exportDateRange.from.toISOString().split('T')[0];
      const endDate = (exportDateRange.to || exportDateRange.from).toISOString().split('T')[0];
      
      const response = await fetch(`/api/reports/download?restaurantId=${selectedRestaurant.id}&startDate=${startDate}&endDate=${endDate}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedRestaurant.name.replace(/[^a-z0-9]/gi, '_')}_Report_${startDate}_to_${endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      addNotification('Report downloaded successfully!');
      setExportModalOpen(false);
      setExportDateRange(undefined);
    } catch (error: any) {
      addNotification('Failed to download report: ' + (error.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  // Check if export is valid (just need date range now, no email)
  const isExportValid = !!exportDateRange?.from;

  // Change day
  const changeDay = (direction: 'next' | 'prev') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  // Go to today
  const goToToday = () => {
    setSelectedDate(new Date());
    setCalendarOpen(false);
  };

  // No restaurant selected
  if (!selectedRestaurant) {
    return (
      <div className="p-4 pb-24 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="p-4 bg-amber-500/10 rounded-full mb-4">
          <AlertCircle className="h-12 w-12 text-amber-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{t('workday.noRestaurantSelected')}</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Select a restaurant to view history
        </p>
      </div>
    );
  }

  const hasData = history && (history.shifts.length > 0 || history.totals.orderCount > 0);
  const hasMultipleShifts = history && history.shifts.length > 1;
  const hasActiveShift = history?.shifts.some(s => s.isActive);

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header with Date Picker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 * 0.1 }}
      >
      <Card className="overflow-hidden border-indigo-500/20">
        <div className="p-4 bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">History</h2>
              <p className="text-sm text-muted-foreground">
                Daily statistics & orders
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveShift && isToday && (
                <Badge className="bg-green-500 text-white animate-pulse">
                  <Activity className="h-3 w-3 mr-1" />
                  Live Updates
                </Badge>
              )}
              {!hasActiveShift && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg"
                  onClick={() => setExportModalOpen(true)}
                >
                  <Download className="h-4 w-4 mr-2 text-indigo-500" />
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Export</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <CardContent className="p-4 border-t">
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
                  className="flex items-center gap-2 text-base font-medium hover:bg-muted/50"
                >
                  <CalendarIcon className="h-5 w-5" />
                  <span>{formattedDate}</span>
                  {isToday && (
                    <Badge variant="secondary" className="ml-2">Today</Badge>
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
                <div className="p-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={goToToday}
                  >
                    Go to Today
                  </Button>
                </div>
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
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 * 0.1 }}
        >
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-20 bg-muted/50" />
              </Card>
            ))}
          </div>
        </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && !hasData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 * 0.1 }}
        >
        <Card className="overflow-hidden">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center">
              <History className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Activity</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              No shifts or orders recorded for this day.
              {isToday && " Start a workday to begin tracking."}
            </p>
          </CardContent>
        </Card>
        </motion.div>
      )}

      {/* Day Totals Summary - OVERALL stats from ALL shifts */}
      {!isLoading && hasData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 * 0.1 }}
          className="space-y-4"
        >
            {/* Total Stats Grid - These are COMBINED totals from all shifts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={DollarSign}
                label="Total Revenue"
                value={formatPrice(history?.totals.revenue || 0)}
                color="success"
              />
              <StatCard
                icon={ShoppingCart}
                label="Total Orders"
                value={history?.totals.orderCount || 0}
                color="primary"
              />
              <StatCard
                icon={Utensils}
                label="Tables Served"
                value={history?.totals.tablesServed || 0}
                color="warning"
              />
              <StatCard
                icon={Users}
                label="Guests Served"
                value={history?.totals.peopleServed || 0}
                color="info"
              />
            </div>

            {/* Workers Widget - Extended */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Left side - icon and stats */}
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold tracking-tight">{history?.totals.workersCount || 0}</div>
                      <div className="text-xs text-muted-foreground">Workers</div>
                      <div className="text-xs text-muted-foreground/70 mt-0.5">
                        {history?.shifts.length || 0} shift{(history?.shifts.length || 0) > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-16 bg-border self-center" />

                  {/* Right side - worker list */}
                  <div className="flex-1 min-w-0">
                    <ScrollArea className="h-[68px]">
                      <div className="space-y-2 pr-2">
                        {/* Mock worker data - replace with real data later */}
                        {[
                          { name: 'John Smith', shift: 1, time: '09:00 - 17:30' },
                          { name: 'Emma Wilson', shift: 1, time: '09:15 - 17:00' },
                          { name: 'Mike Johnson', shift: 2, time: '17:00 - 23:30' },
                          { name: 'Sarah Davis', shift: 2, time: '17:30 - 23:45' },
                          { name: 'Alex Brown', shift: 2, time: '18:00 - 00:15' },
                        ].slice(0, Math.max(3, history?.totals.workersCount || 0)).map((worker, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-semibold text-primary">
                                  {worker.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <span className="text-sm font-medium truncate">{worker.name}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <span className="text-xs text-muted-foreground">{worker.time}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] px-1.5 py-0 h-5 ${
                                  worker.shift === 1 
                                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' 
                                    : 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                                }`}
                              >
                                S{worker.shift}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Multi-Shift Indicator */}
            {hasMultipleShifts && (
              <Card className="overflow-hidden border-indigo-500/30 bg-indigo-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Multiple Shifts Today</div>
                      <div className="text-sm text-muted-foreground">
                        {history.shifts.length} shifts recorded. Above stats are combined totals.
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {[...history.shifts].reverse().map((shift, idx) => (
                        <div
                          key={shift.id}
                          className={`w-2.5 h-2.5 rounded-full ${
                            shift.isActive 
                              ? 'bg-green-500 animate-pulse' 
                              : 'bg-indigo-400'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Shifts List - Reversed to show latest first */}
            <div className="space-y-4">
              {[...(history?.shifts || [])].reverse().map((shift, idx, arr) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  shiftNumber={arr.length - idx}
                  totalShifts={arr.length}
                />
              ))}
            </div>
        </motion.div>
      )}

      {/* Export Modal */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-[480px]" hideCloseButton>
          {/* Custom Header */}
          <div className="relative p-6 pb-4 -m-6 mb-0 bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent rounded-t-2xl">
            <button
              onClick={() => setExportModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl">
                <FileSpreadsheet className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Export Report</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Download Excel report to your device
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 pt-2">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Date Range</Label>
              <Popover open={exportRangeCalendarOpen} onOpenChange={setExportRangeCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal h-11"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {exportDateRange?.from ? (
                      exportDateRange.to ? (
                        <>
                          {exportDateRange.from.toLocaleDateString()} - {exportDateRange.to.toLocaleDateString()}
                        </>
                      ) : (
                        exportDateRange.from.toLocaleDateString()
                      )
                    ) : (
                      <span className="text-muted-foreground">Select date range...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={exportDateRange}
                    onSelect={setExportDateRange}
                    numberOfMonths={1}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                  <div className="p-3 border-t flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const today = new Date();
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                        setExportDateRange({ from: weekAgo, to: today });
                      }}
                    >
                      Last 7 days
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const today = new Date();
                        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                        setExportDateRange({ from: monthAgo, to: today });
                      }}
                    >
                      Last 30 days
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={!isExportValid || isExporting}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
