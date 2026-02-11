import { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useWorkday } from '@/contexts/WorkdayContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { formatTime } from '@/lib/utils';
import { type OrderWithDetails, type Table, WebSocketMessage } from '@shared/schema';
import { getBadgeStyle } from './orders-tab';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Clock,
  Users,
  AlertCircle,
  ChefHat,
  ChevronDown,
  ChevronRight,
  History,
  RotateCcw,
  Flame,
  Sparkles,
  Ban,
  X,
  Archive,
} from 'lucide-react';

// Helper to parse badges from notes
const parseNotesWithBadges = (notes: string | null | undefined): { badges: string[]; text: string } => {
  if (!notes) return { badges: [], text: '' };
  const badgeRegex = /\[([^\]]+)\]/g;
  const badges: string[] = [];
  let match;
  while ((match = badgeRegex.exec(notes)) !== null) {
    badges.push(match[1]);
  }
  const text = notes.replace(badgeRegex, '').trim();
  return { badges, text };
};

// Running time display component
const RunningTime = ({ startTime }: { startTime: Date | string }) => {
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

  if (hours > 0) {
    return <span>{hours}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>;
  }
  return <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>;
};

// Merged order item type
interface MergedOrderItem {
  key: string;
  name: string;
  isSpecialItem: boolean;
  badges: string[];
  noteText: string;
  orders: OrderWithDetails[];
  allCompleted: boolean;
  completedCount: number;
}

interface TableGroup {
  tableId: number;
  tableNumber: string;
  tableLabel: string;
  peopleCount: number;
  activeSince: Date;
  orders: OrderWithDetails[];
  hasPendingOrders: boolean;
  latestOrderTime: Date;
  oldestPendingTime: Date | null;
}

// Merge orders into groups
const mergeOrders = (orders: OrderWithDetails[]): MergedOrderItem[] => {
  const groups: Record<string, MergedOrderItem> = {};

  orders.forEach(order => {
    const { badges, text: noteText } = parseNotesWithBadges(order.notes);
    const name = order.isSpecialItem && order.specialItemName
      ? order.specialItemName
      : order.menuItemName;

    // Create a key based on name, badges, and note
    const key = `${name}-${badges.sort().join(',')}-${noteText}-${order.isSpecialItem}`;

    if (!groups[key]) {
      groups[key] = {
        key,
        name: name || 'Unknown',
        isSpecialItem: order.isSpecialItem || false,
        badges,
        noteText,
        orders: [],
        allCompleted: true,
        completedCount: 0,
      };
    }

    groups[key].orders.push(order);
    if (order.completed) {
      groups[key].completedCount++;
    } else {
      groups[key].allCompleted = false;
    }
  });

  // Sort: pending items first, then by oldest order time
  return Object.values(groups).sort((a, b) => {
    if (a.allCompleted !== b.allCompleted) return a.allCompleted ? 1 : -1;
    const aOldest = Math.min(...a.orders.map(o => new Date(o.timestamp).getTime()));
    const bOldest = Math.min(...b.orders.map(o => new Date(o.timestamp).getTime()));
    return aOldest - bOldest;
  });
};

// Single merged order item component
const MergedOrderItemRow = ({
  item,
  onMarkReady,
  onMarkSingleReady,
  isExpanded,
  onToggleExpand,
  isPending,
  readOnly = false,
}: {
  item: MergedOrderItem;
  onMarkReady: (orderIds: number[]) => void;
  onMarkSingleReady: (orderId: number, completed: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isPending: boolean;
  readOnly?: boolean;
}) => {
  const { t } = useLanguage();
  const quantity = item.orders.length;
  const pendingCount = quantity - item.completedCount;

  return (
    <div className="overflow-hidden">
      {/* Main row */}
      <motion.div
        className={`p-4 flex items-center gap-3 transition-all ${
          item.allCompleted
            ? 'bg-green-500/5'
            : 'bg-gradient-to-r from-amber-500/5 to-transparent'
        }`}
        initial={false}
        animate={{ opacity: 1 }}
      >
        {/* Expand button (only if quantity > 1) */}
        <button
          onClick={onToggleExpand}
          className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
            quantity > 1
              ? 'hover:bg-muted cursor-pointer'
              : 'cursor-default opacity-0'
          }`}
          disabled={quantity <= 1}
        >
          {quantity > 1 && (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          )}
        </button>

        {/* Status indicator */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
          item.allCompleted
            ? 'bg-green-500'
            : 'bg-amber-500 animate-pulse'
        }`} />

        {/* Order details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quantity multiplier - always shown */}
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              item.allCompleted
                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>
              {quantity}x
            </span>

            <span className={`font-semibold ${
              item.allCompleted ? 'line-through text-muted-foreground' : ''
            }`}>
              {item.name}
            </span>

            {item.isSpecialItem && (
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-300">
                <Sparkles className="h-3 w-3 mr-1" />
                {t('orders.special')}
              </Badge>
            )}

            {/* Progress indicator for partially completed */}
            {item.completedCount > 0 && !item.allCompleted && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-300">
                {item.completedCount}/{quantity} {t('kitchen.ready')}
              </Badge>
            )}
          </div>

          {/* Badges */}
          {item.badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.badges.map((badge, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className={`text-xs ${getBadgeStyle(badge)}`}
                >
                  {badge}
                </Badge>
              ))}
            </div>
          )}

          {/* Note */}
          {item.noteText && (
            <p className={`text-sm mt-1 ${
              item.allCompleted
                ? 'text-muted-foreground'
                : 'text-amber-600 dark:text-amber-400 font-medium'
            }`}>
              📝 {item.noteText}
            </p>
          )}
        </div>

        {/* Mark all ready button */}
        {!readOnly && (
          <Button
            variant={item.allCompleted ? "default" : "outline"}
            size="sm"
            className={`flex-shrink-0 h-10 px-4 ${
              item.allCompleted
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'border-green-500/50 text-green-600 hover:bg-green-500/10 hover:border-green-500'
            }`}
            onClick={() => {
              if (!item.allCompleted) {
                const pendingIds = item.orders.filter(o => !o.completed).map(o => o.id);
                onMarkReady(pendingIds);
              }
            }}
            disabled={isPending || item.allCompleted}
          >
            <Check className="h-4 w-4 mr-1" />
            {item.allCompleted ? t('kitchen.ready') : (quantity > 1 ? t('kitchen.readyAll') : t('kitchen.ready'))}
          </Button>
        )}
      </motion.div>

      {/* Expanded individual items */}
      <AnimatePresence>
        {isExpanded && quantity > 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-12 pr-4 pb-2 space-y-1">
              {item.orders.map((order, idx) => (
                <div
                  key={order.id}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    order.completed
                      ? 'bg-green-500/10'
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6">#{idx + 1}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      order.completed ? 'bg-green-500' : 'bg-amber-500'
                    }`} />
                    <span className={`text-sm ${order.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(order.timestamp)}
                    </span>
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 px-2 ${
                        order.completed
                          ? 'text-green-600 hover:text-green-700'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => onMarkSingleReady(order.id, order.completed)}
                      disabled={isPending}
                    >
                      {order.completed ? (
                        <>
                          <RotateCcw className="h-3 w-3 mr-1" />
                          {t('kitchen.undo')}
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          {t('kitchen.ready')}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Kitchen history table group - includes closed tables
interface HistoryTableGroup extends TableGroup {
  isTableClosed: boolean;
  hasCanceledOrders: boolean;
}

// Kitchen History Sheet
const KitchenHistorySheet = ({
  historyTables,
  onRevoke,
  isPending,
  readOnly = false,
}: {
  historyTables: HistoryTableGroup[];
  onRevoke: (orderIds: number[]) => void;
  isPending: boolean;
  readOnly?: boolean;
}) => {
  const { t } = useLanguage();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedForRevoke, setSelectedForRevoke] = useState<Set<number>>(new Set());

  const toggleExpand = (key: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const toggleSelectForRevoke = (orderId: number) => {
    setSelectedForRevoke(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleRevoke = () => {
    if (selectedForRevoke.size > 0) {
      onRevoke(Array.from(selectedForRevoke));
      setSelectedForRevoke(new Set());
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-9 px-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg"
        >
          <History className="h-4 w-4 mr-2 text-orange-500" />
          <span className="text-sm font-medium text-orange-600 dark:text-orange-400">{t('kitchen.history')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <SheetHeader className="p-4 border-b bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent">
          <SheetTitle>{t('kitchen.kitchenHistory')}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          {historyTables.length === 0 ? (
            <div className="p-8 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t('kitchen.noCompletedOrders')}</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {historyTables.map(table => {
                const mergedItems = mergeOrders(table.orders);
                const canRevoke = !table.isTableClosed && !readOnly;

                return (
                  <Card key={`${table.tableId}-${table.isTableClosed ? 'closed' : 'active'}`} className="overflow-hidden">
                    <div className={`p-3 border-b flex items-center justify-between ${
                      table.isTableClosed 
                        ? 'bg-muted/30' 
                        : 'bg-green-500/10'
                    }`}>
                      <div>
                        <span className="font-semibold">{t('kitchen.table')} {table.tableNumber}</span>
                        {table.tableLabel && (
                          <span className="ml-2 text-muted-foreground">{table.tableLabel}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {table.hasCanceledOrders && (
                          <Badge variant="outline" className="bg-red-500/20 text-red-600 border-red-300">
                            {t('kitchen.canceled')}
                          </Badge>
                        )}
                        <Badge variant="outline" className={
                          table.isTableClosed
                            ? "bg-muted text-muted-foreground border-muted-foreground/30"
                            : "bg-green-500/20 text-green-600 border-green-300"
                        }>
                          {table.isTableClosed ? (
                            <>{t('kitchen.closed')}</>
                          ) : (
                            <><Check className="h-3 w-3 mr-1" />{t('kitchen.completed')}</>
                          )}
                        </Badge>
                      </div>
                    </div>

                    <div className="divide-y">
                      {mergedItems.map(item => {
                        const isExpanded = expandedItems.has(`${table.tableId}-${item.key}`);
                        const quantity = item.orders.length;
                        const canceledCount = item.orders.filter(o => o.canceled).length;

                        return (
                          <div key={item.key} className="p-3">
                            <div className="flex items-center gap-2">
                              {quantity > 1 && canRevoke && (
                                <button
                                  onClick={() => toggleExpand(`${table.tableId}-${item.key}`)}
                                  className="p-1 hover:bg-muted rounded"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                canceledCount > 0 
                                  ? 'bg-red-500/20 text-red-600' 
                                  : 'bg-muted'
                              }`}>
                                {quantity}x
                              </span>
                              <span className={`text-sm ${canceledCount === quantity ? 'line-through text-muted-foreground' : ''}`}>
                                {item.name}
                              </span>
                              {canceledCount > 0 && canceledCount < quantity && (
                                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-300">
                                  {canceledCount} {t('kitchen.canceled').toLowerCase()}
                                </Badge>
                              )}
                              {canceledCount === quantity && (
                                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-300">
                                  {t('kitchen.canceled')}
                                </Badge>
                              )}
                              {item.badges.map((badge, idx) => (
                                <Badge key={idx} variant="outline" className={`text-xs ${getBadgeStyle(badge)}`}>
                                  {badge}
                                </Badge>
                              ))}
                            </div>

                            {/* Expanded items for revoke selection - only for active tables */}
                            {isExpanded && quantity > 1 && canRevoke && (
                              <div className="mt-2 pl-8 space-y-1">
                                {item.orders.map((order, idx) => (
                                  <label
                                    key={order.id}
                                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedForRevoke.has(order.id)}
                                      onChange={() => toggleSelectForRevoke(order.id)}
                                      className="rounded"
                                    />
                                    <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                                    <span className="text-sm">{item.name}</span>
                                  </label>
                                ))}
                              </div>
                            )}

                            {/* Single item revoke checkbox - only for active tables */}
                            {quantity === 1 && canRevoke && (
                              <label className="flex items-center gap-2 mt-2 pl-8 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedForRevoke.has(item.orders[0].id)}
                                  onChange={() => toggleSelectForRevoke(item.orders[0].id)}
                                  className="rounded"
                                />
                                <span className="text-xs text-muted-foreground">{t('kitchen.selectToRevoke')}</span>
                              </label>
                            )}

                            {/* Show message for closed tables */}
                            {!canRevoke && (
                              <p className="text-xs text-muted-foreground mt-2 pl-8 italic">
                                {t('kitchen.tableClosedRevoke')}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Revoke button */}
        {selectedForRevoke.size > 0 && !readOnly && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700"
              onClick={handleRevoke}
              disabled={isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('kitchen.revokeItems')} ({selectedForRevoke.size})
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

// Play a bell chime using Web Audio API
const playOrderBell = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(830, now, 0.15);
    playTone(1100, now + 0.15, 0.2);
  } catch (e) {
    // Audio not supported, silently fail
  }
};

export default function KitchenTab() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { addMessageListener } = useWebSocketContext();
  const { activeWorkday, isWorkdayActive } = useWorkday();
  const { t } = useLanguage();
  const { userRole } = useAuth();

  // Floor role = view-only in Kitchen tab (no marking ready, no revoke)
  const isReadOnly = userRole === 'floor';

  // Expanded items state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Dismissed canceled order IDs (client-side only)
  const [dismissedCancelIds, setDismissedCancelIds] = useState<Set<number>>(new Set());
  // Track when canceled orders first appeared (for auto-dismiss)
  const [cancelAppearTimes, setCancelAppearTimes] = useState<Map<number, number>>(new Map());

  // Archived table IDs - tables manually or auto-archived to history
  const [archivedTableIds, setArchivedTableIds] = useState<Set<number>>(new Set());
  // Track when canceled-only tables first appeared (for auto-archive after 3min)
  const [canceledTableAppearTimes, setCanceledTableAppearTimes] = useState<Map<number, number>>(new Map());

  // Fetch active tables
  const { data: activeTables = [] } = useQuery<Table[]>({
    queryKey: ['active-tables', activeWorkday?.tableLayoutId],
    queryFn: async () => {
      const res = await fetch('/api/tables/active');
      if (!res.ok) throw new Error('Failed to fetch tables');
      return res.json();
    },
    enabled: isWorkdayActive,
    refetchInterval: 5000,
  });

  // Fetch orders
  const { data: orders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    enabled: isWorkdayActive,
    refetchInterval: 3000,
  });

  // Listen for WebSocket updates
  useEffect(() => {
    const removeListener = addMessageListener((message: WebSocketMessage) => {
      if (['NEW_ORDER', 'COMPLETE_ORDER', 'UNCOMPLETE_ORDER', 'ACTIVATE_TABLE', 'DEACTIVATE_TABLE', 'KITCHEN_NOTIFICATION', 'CANCEL_ORDER'].includes(message.type)) {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['active-tables'] });

        // Play bell sound for new orders if sounds are enabled
        if (message.type === 'NEW_ORDER') {
          const soundsEnabled = localStorage.getItem('kitchenSoundsEnabled') !== 'false';
          if (soundsEnabled) {
            playOrderBell();
          }
        }

        if (message.type === 'KITCHEN_NOTIFICATION') {
          addNotification(`Table ${(message.payload as any)?.tableNumber} needs attention!`);
        }
      }
    });
    return () => removeListener();
  }, [addMessageListener, queryClient, addNotification]);

  // Track canceled orders appearance time and auto-dismiss after 3 minutes
  useEffect(() => {
    const allCanceledIds = orders.filter(o => o.canceled).map(o => o.id);
    const now = Date.now();

    // Register new canceled orders
    setCancelAppearTimes(prev => {
      const next = new Map(prev);
      let changed = false;
      allCanceledIds.forEach(id => {
        if (!next.has(id)) {
          next.set(id, now);
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    // Auto-dismiss after 3 minutes
    const timer = setInterval(() => {
      const cutoff = Date.now() - 3 * 60 * 1000;
      setDismissedCancelIds(prev => {
        const next = new Set(prev);
        let changed = false;
        cancelAppearTimes.forEach((appearTime, id) => {
          if (appearTime < cutoff && !next.has(id)) {
            next.add(id);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 10000);

    return () => clearInterval(timer);
  }, [orders, cancelAppearTimes]);

  // Mutations
  const completeOrderMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/orders/${id}/complete`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const uncompleteOrderMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/orders/${id}/uncomplete`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const isPending = completeOrderMutation.isPending || uncompleteOrderMutation.isPending;

  // Mark multiple orders ready
  const handleMarkReady = useCallback(async (orderIds: number[]) => {
    for (const id of orderIds) {
      await completeOrderMutation.mutateAsync(id);
    }
  }, [completeOrderMutation]);

  // Mark single order
  const handleMarkSingleReady = useCallback((orderId: number, isCompleted: boolean) => {
    if (isCompleted) {
      uncompleteOrderMutation.mutate(orderId);
    } else {
      completeOrderMutation.mutate(orderId);
    }
  }, [completeOrderMutation, uncompleteOrderMutation]);

  // Revoke orders (mark as incomplete)
  const handleRevoke = useCallback(async (orderIds: number[]) => {
    for (const id of orderIds) {
      await uncompleteOrderMutation.mutateAsync(id);
    }
    addNotification(`Revoked ${orderIds.length} item${orderIds.length > 1 ? 's' : ''}`);
  }, [uncompleteOrderMutation, addNotification]);

  // Toggle expand
  const toggleExpand = useCallback((key: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  // Group orders by table for active tables (pending orders view)
  // Only include orders from the CURRENT session (after table was activated)
  const tableGroups = useMemo(() => {
    const groups: Record<number, TableGroup> = {};

    // For each active table, filter orders to only include those from current session
    activeTables.forEach(table => {
      const tableActivatedAt = table.activatedAt ? new Date(table.activatedAt).getTime() : 0;
      
      // Filter orders for this table that were created AFTER activation
      const tableOrders = orders.filter(order => {
        if (order.tableId !== table.id) return false;
        const orderTime = new Date(order.timestamp).getTime();
        return orderTime >= tableActivatedAt;
      });

      if (tableOrders.length === 0) return;

      // Initialize the group
      groups[table.id] = {
        tableId: table.id,
        tableNumber: table.number,
        tableLabel: table.label || '',
        peopleCount: table.peopleCount || 0,
        activeSince: table.activatedAt ? new Date(table.activatedAt) : new Date(),
        orders: [],
        hasPendingOrders: false,
        latestOrderTime: new Date(tableOrders[0].timestamp),
        oldestPendingTime: null,
      };

      // Add orders and calculate stats
      tableOrders.forEach(order => {
        groups[table.id].orders.push(order);

        if (!order.completed && !order.canceled) {
          groups[table.id].hasPendingOrders = true;
          const orderTime = new Date(order.timestamp);
          if (!groups[table.id].oldestPendingTime || orderTime < groups[table.id].oldestPendingTime!) {
            groups[table.id].oldestPendingTime = orderTime;
          }
        }

        const orderTime = new Date(order.timestamp);
        if (orderTime > groups[table.id].latestOrderTime) {
          groups[table.id].latestOrderTime = orderTime;
        }
      });
    });

    // Sort tables: tables with pending orders first, then by oldest pending time
    return Object.values(groups).sort((a, b) => {
      if (a.hasPendingOrders !== b.hasPendingOrders) {
        return a.hasPendingOrders ? -1 : 1;
      }
      if (a.oldestPendingTime && b.oldestPendingTime) {
        return a.oldestPendingTime.getTime() - b.oldestPendingTime.getTime();
      }
      return b.latestOrderTime.getTime() - a.latestOrderTime.getTime();
    });
  }, [orders, activeTables]);

  // Separate pending, canceled-lingering, and completed tables
  const tablesWithPendingOrders = tableGroups.filter(t => t.hasPendingOrders);

  // Tables with no pending orders - split into canceled-lingering and truly completed
  const doneTables = tableGroups.filter(t => !t.hasPendingOrders && t.orders.length > 0);

  // Tables that have canceled orders and haven't been archived yet - keep in main view
  const canceledLingeringTables = doneTables.filter(t =>
    t.orders.some(o => o.canceled) && !archivedTableIds.has(t.tableId)
  );

  // Tables that are fully completed (no canceled) or have been archived
  const completedActiveTables = doneTables.filter(t =>
    !t.orders.some(o => o.canceled) || archivedTableIds.has(t.tableId)
  );

  // Track canceled-lingering tables and auto-archive after 3 minutes
  useEffect(() => {
    const now = Date.now();

    // Register appearance times for newly canceled-lingering tables
    setCanceledTableAppearTimes(prev => {
      const next = new Map(prev);
      let changed = false;
      canceledLingeringTables.forEach(t => {
        if (!next.has(t.tableId)) {
          next.set(t.tableId, now);
          changed = true;
        }
      });
      // Clean up tables that are no longer lingering
      for (const tableId of next.keys()) {
        if (!canceledLingeringTables.find(tbl => tbl.tableId === tableId)) {
          next.delete(tableId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    // Auto-archive after 3 minutes
    const timer = setInterval(() => {
      const cutoff = Date.now() - 3 * 60 * 1000;
      setArchivedTableIds(prev => {
        const next = new Set(prev);
        let changed = false;
        canceledTableAppearTimes.forEach((appearTime, tableId) => {
          if (appearTime < cutoff && !next.has(tableId)) {
            next.add(tableId);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 10000);

    return () => clearInterval(timer);
  }, [canceledLingeringTables, canceledTableAppearTimes]);

  // Build kitchen history: includes completed orders from active tables + all orders from closed tables
  const historyTables = useMemo((): HistoryTableGroup[] => {
    const activeTableIds = new Set(activeTables.map(t => t.id));
    const result: HistoryTableGroup[] = [];
    
    // Add completed orders from active tables (can be revoked)
    completedActiveTables.forEach(table => {
      result.push({
        ...table,
        isTableClosed: false,
        hasCanceledOrders: table.orders.some(o => o.canceled)
      });
    });

    // Group orders from closed tables (tables that are NOT active but have orders)
    const closedTableGroups: Record<number, HistoryTableGroup> = {};
    
    orders.filter(o => !activeTableIds.has(o.tableId)).forEach(order => {
      if (!closedTableGroups[order.tableId]) {
        closedTableGroups[order.tableId] = {
          tableId: order.tableId,
          tableNumber: order.tableNumber,
          tableLabel: order.tableLabel || '',
          peopleCount: order.peopleCount ?? 0,
          activeSince: new Date(order.timestamp),
          orders: [],
          hasPendingOrders: false,
          latestOrderTime: new Date(order.timestamp),
          oldestPendingTime: null,
          isTableClosed: true,
          hasCanceledOrders: false
        };
      }

      closedTableGroups[order.tableId].orders.push(order);
      
      if (order.canceled) {
        closedTableGroups[order.tableId].hasCanceledOrders = true;
      }

      const orderTime = new Date(order.timestamp);
      if (orderTime > closedTableGroups[order.tableId].latestOrderTime) {
        closedTableGroups[order.tableId].latestOrderTime = orderTime;
      }
    });

    // Add closed table groups to result
    result.push(...Object.values(closedTableGroups));

    // Sort: active tables first, then by latest order time (most recent first)
    return result.sort((a, b) => {
      if (a.isTableClosed !== b.isTableClosed) {
        return a.isTableClosed ? 1 : -1; // Active tables first
      }
      return b.latestOrderTime.getTime() - a.latestOrderTime.getTime();
    });
  }, [orders, activeTables, completedActiveTables]);

  // No active workday
  if (!isWorkdayActive) {
    return (
      <div className="p-4 pb-24 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="p-4 bg-amber-500/10 rounded-full mb-4">
          <AlertCircle className="h-12 w-12 text-amber-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{t('kitchen.noActiveWorkday')}</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          {t('kitchen.startWorkdayFirst')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 * 0.1 }}
      >
        <Card className="overflow-hidden border-orange-500/20">
          <div className="p-4 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{t('kitchen.title')}</h2>
                {tablesWithPendingOrders.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {tablesWithPendingOrders.length} {t('kitchen.waiting')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {tablesWithPendingOrders.length > 0 && (
                  <Badge className="bg-amber-500 text-white animate-pulse">
                    <Flame className="h-3 w-3 mr-1" />
                    {tablesWithPendingOrders.reduce((acc, tbl) => acc + tbl.orders.filter(o => !o.completed && !o.canceled).length, 0)} {t('kitchen.pending')}
                  </Badge>
                )}
                <KitchenHistorySheet
                  historyTables={historyTables}
                  onRevoke={handleRevoke}
                  isPending={isPending}
                  readOnly={isReadOnly}
                />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* No pending orders (but may have canceled-lingering tables below) */}
      {tablesWithPendingOrders.length === 0 && canceledLingeringTables.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 * 0.1 }}
        >
        <Card className="overflow-hidden">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <Check className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{t('kitchen.allCaughtUp')}</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {t('kitchen.noPendingOrders')}
            </p>
            {historyTables.length > 0 && (
              <p className="text-sm text-muted-foreground mt-4">
                {historyTables.length} {t('kitchen.tablesInHistory')}
              </p>
            )}
          </CardContent>
        </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 * 0.1 }}
        >
        <div className="space-y-4">
          <AnimatePresence>
            {tablesWithPendingOrders.map(table => {
              const nonCanceledOrders = table.orders.filter(o => !o.canceled);
              const canceledOrders = table.orders.filter(o => o.canceled);
              const mergedItems = mergeOrders(nonCanceledOrders);
              const pendingCount = nonCanceledOrders.filter(o => !o.completed).length;

              return (
                <motion.div
                  key={table.tableId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden border-l-4 border-l-amber-500 shadow-md">
                    {/* Table Header */}
                    <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold">
                            {t('kitchen.table')} {table.tableNumber}
                            {table.tableLabel && (
                              <span className="ml-2 text-sm font-normal opacity-70">
                                {table.tableLabel}
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm opacity-80">
                            <span className="flex items-center gap-1.5">
                              <Users className="h-4 w-4" />
                              {table.peopleCount}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              <RunningTime startTime={table.oldestPendingTime || table.activeSince} />
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-500/90 text-white font-semibold px-3 py-1">
                            {pendingCount} {t('kitchen.pending')}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Orders List */}
                    <div className="divide-y divide-border">
                      {mergedItems.filter(item => !item.allCompleted).map(item => (
                        <MergedOrderItemRow
                          key={item.key}
                          item={item}
                          onMarkReady={handleMarkReady}
                          onMarkSingleReady={handleMarkSingleReady}
                          isExpanded={expandedItems.has(`${table.tableId}-${item.key}`)}
                          onToggleExpand={() => toggleExpand(`${table.tableId}-${item.key}`)}
                          isPending={isPending}
                          readOnly={isReadOnly}
                        />
                      ))}

                      {/* Completed items (collapsed by default) */}
                      {mergedItems.some(item => item.allCompleted) && (
                        <div className="p-3 bg-green-500/5">
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium mb-2">
                            <Check className="h-4 w-4" />
                            Completed Items
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {mergedItems.filter(item => item.allCompleted).map(item => (
                              <Badge
                                key={item.key}
                                variant="outline"
                                className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-300"
                              >
                                {item.orders.length}x {item.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Canceled items section */}
                      {(() => {
                        const visibleCanceled = canceledOrders.filter(o => !dismissedCancelIds.has(o.id));
                        if (visibleCanceled.length === 0) return null;
                        // Group canceled orders by name
                        const canceledGroups: Record<string, { name: string; count: number; ids: number[] }> = {};
                        visibleCanceled.forEach(o => {
                          const name = o.isSpecialItem && o.specialItemName ? o.specialItemName : o.menuItemName;
                          const key = name || 'Unknown';
                          if (!canceledGroups[key]) canceledGroups[key] = { name: key, count: 0, ids: [] };
                          canceledGroups[key].count++;
                          canceledGroups[key].ids.push(o.id);
                        });
                        return (
                          <div className="p-3 bg-red-500/5 border-t border-red-200/30 dark:border-red-800/30">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
                                <Ban className="h-4 w-4" />
                                {t('kitchen.canceledItems')}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Object.values(canceledGroups).map(cg => (
                                <div key={cg.name} className="flex items-center gap-1">
                                  <Badge
                                    variant="outline"
                                    className="bg-red-500/10 text-red-500 border-red-300 dark:border-red-700 line-through"
                                  >
                                    {cg.count}x {cg.name}
                                  </Badge>
                                  <button
                                    className="p-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                                    onClick={() => {
                                      setDismissedCancelIds(prev => {
                                        const next = new Set(prev);
                                        cg.ids.forEach(id => next.add(id));
                                        return next;
                                      });
                                    }}
                                    title={t('kitchen.dismiss')}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        </motion.div>
      )}

      {/* Canceled-lingering tables - stay visible for 3min with Archive button */}
      {canceledLingeringTables.length > 0 && (
        <div className="space-y-4">
          <AnimatePresence>
            {canceledLingeringTables.map(table => {
              const canceledOrders = table.orders.filter(o => o.canceled);
              const completedOrders = table.orders.filter(o => !o.canceled && o.completed);
              // Group canceled orders by name
              const canceledGroups: Record<string, { name: string; count: number }> = {};
              canceledOrders.forEach(o => {
                const name = o.isSpecialItem && o.specialItemName ? o.specialItemName : o.menuItemName;
                const key = name || 'Unknown';
                if (!canceledGroups[key]) canceledGroups[key] = { name: key, count: 0 };
                canceledGroups[key].count++;
              });

              return (
                <motion.div
                  key={`canceled-${table.tableId}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden border-l-4 border-l-red-500 shadow-md">
                    {/* Table Header */}
                    <div className="p-4 bg-gradient-to-r from-red-900/80 to-red-800/60 dark:from-red-900/60 dark:to-red-800/40 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold">
                            {t('kitchen.table')} {table.tableNumber}
                            {table.tableLabel && (
                              <span className="ml-2 text-sm font-normal opacity-70">
                                {table.tableLabel}
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-sm opacity-80">
                            <Ban className="h-4 w-4" />
                            <span>{t('orders.canceledOrders')}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                          onClick={() => {
                            setArchivedTableIds(prev => {
                              const next = new Set(prev);
                              next.add(table.tableId);
                              return next;
                            });
                          }}
                        >
                          <Archive className="h-4 w-4 mr-1.5" />
                          {t('kitchen.archive')}
                        </Button>
                      </div>
                    </div>

                    {/* Canceled items */}
                    <div className="p-3 bg-red-500/5">
                      <div className="flex flex-wrap gap-2">
                        {Object.values(canceledGroups).map(cg => (
                          <Badge
                            key={cg.name}
                            variant="outline"
                            className="bg-red-500/10 text-red-500 border-red-300 dark:border-red-700 line-through"
                          >
                            {cg.count}x {cg.name}
                          </Badge>
                        ))}
                      </div>

                      {/* Also show completed items if any */}
                      {completedOrders.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(() => {
                            const completedGroups: Record<string, { name: string; count: number }> = {};
                            completedOrders.forEach(o => {
                              const name = o.isSpecialItem && o.specialItemName ? o.specialItemName : o.menuItemName;
                              const key = name || 'Unknown';
                              if (!completedGroups[key]) completedGroups[key] = { name: key, count: 0 };
                              completedGroups[key].count++;
                            });
                            return Object.values(completedGroups).map(cg => (
                              <Badge
                                key={cg.name}
                                variant="outline"
                                className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-300"
                              >
                                {cg.count}x {cg.name}
                              </Badge>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
