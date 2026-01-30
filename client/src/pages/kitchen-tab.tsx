import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkday } from '@/contexts/WorkdayContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiRequest } from '@/lib/queryClient';
import { formatTime, getActiveTime } from '@/lib/utils';
import { type OrderWithDetails, type Table, WebSocketMessage } from '@shared/schema';
import { getBadgeStyle } from './orders-tab';
import {
  Check,
  RotateCcw,
  Clock,
  Users,
  AlertCircle,
  ChefHat,
  X
} from 'lucide-react';

// Helper to parse badges from notes (format: "[badge1] [badge2] note text")
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

interface TableGroup {
  tableId: number;
  tableNumber: string;
  tableLabel: string;
  peopleCount: number;
  activeSince: Date;
  orders: OrderWithDetails[];
  hasPendingOrders: boolean;
  latestOrderTime: Date;
}

export default function KitchenTab() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { addMessageListener } = useWebSocketContext();
  const { activeWorkday, isWorkdayActive } = useWorkday();
  const { t } = useLanguage();

  // Tick every 30 seconds to keep timers fresh
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Fetch active tables for the current workday
  const { data: activeTables = [] } = useQuery<Table[]>({
    queryKey: ['active-tables', activeWorkday?.tableLayoutId],
    queryFn: async () => {
      const res = await fetch('/api/tables/active');
      if (!res.ok) throw new Error('Failed to fetch tables');
      return res.json();
    },
    enabled: isWorkdayActive,
    refetchInterval: 5000
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
    refetchInterval: 3000
  });

  // Listen for WebSocket updates
  useEffect(() => {
    const removeListener = addMessageListener((message: WebSocketMessage) => {
      if (['NEW_ORDER', 'COMPLETE_ORDER', 'UNCOMPLETE_ORDER', 'ACTIVATE_TABLE', 'DEACTIVATE_TABLE', 'KITCHEN_NOTIFICATION'].includes(message.type)) {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['active-tables'] });

        if (message.type === 'KITCHEN_NOTIFICATION') {
          addNotification(`Table ${(message.payload as any)?.tableNumber} needs attention!`);
        }
      }
    });
    return () => removeListener();
  }, [addMessageListener, queryClient, addNotification]);

  // Complete order mutation
  const completeOrderMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/orders/${id}/complete`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  // Uncomplete order mutation
  const uncompleteOrderMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/orders/${id}/uncomplete`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  // Toggle order completion
  const handleToggleComplete = (orderId: number, isCompleted: boolean) => {
    if (isCompleted) {
      uncompleteOrderMutation.mutate(orderId);
    } else {
      completeOrderMutation.mutate(orderId);
    }
  };

  // Group orders by table
  const tableGroups = useMemo(() => {
    const activeTableIds = new Set(activeTables.map(t => t.id));
    const groups: Record<number, TableGroup> = {};

    orders.filter(o => activeTableIds.has(o.tableId)).forEach(order => {
      if (!groups[order.tableId]) {
        const table = activeTables.find(t => t.id === order.tableId);
        groups[order.tableId] = {
          tableId: order.tableId,
          tableNumber: order.tableNumber,
          tableLabel: order.tableLabel || '',
          peopleCount: table?.peopleCount || 0,
          activeSince: table?.activatedAt ? new Date(table.activatedAt) : new Date(),
          orders: [],
          hasPendingOrders: false,
          latestOrderTime: new Date(order.timestamp)
        };
      }

      groups[order.tableId].orders.push(order);

      if (!order.completed) {
        groups[order.tableId].hasPendingOrders = true;
      }

      const orderTime = new Date(order.timestamp);
      if (orderTime > groups[order.tableId].latestOrderTime) {
        groups[order.tableId].latestOrderTime = orderTime;
      }
    });

    // Sort orders within each table: pending first, then by time
    Object.values(groups).forEach(group => {
      group.orders.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    });

    // Sort tables: tables with pending orders first, then by latest order time
    return Object.values(groups).sort((a, b) => {
      if (a.hasPendingOrders !== b.hasPendingOrders) {
        return a.hasPendingOrders ? -1 : 1;
      }
      return b.latestOrderTime.getTime() - a.latestOrderTime.getTime();
    });
  }, [orders, activeTables]);

  // Filter to only show tables with pending orders
  const tablesWithPendingOrders = tableGroups.filter(t => t.hasPendingOrders);

  // No active workday
  if (!isWorkdayActive) {
    return (
      <div className="p-4 pb-24 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="p-4 bg-warning/10 rounded-full mb-4">
          <AlertCircle className="h-12 w-12 text-warning" />
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold">{t('kitchen.title')}</h2>
          {tablesWithPendingOrders.length > 0 && (
            <Badge variant="default">
              {tablesWithPendingOrders.length} active
            </Badge>
          )}
        </div>
      </div>

      {/* No orders */}
      {tablesWithPendingOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ChefHat className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">All caught up!</h3>
            <p className="text-muted-foreground">
              No pending orders. New orders will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tablesWithPendingOrders.map(table => (
            <Card key={table.tableId} className="overflow-hidden">
              {/* Table Header */}
              <CardHeader className="bg-primary text-primary-foreground p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Table {table.tableNumber}
                      {table.tableLabel && (
                        <span className="ml-2 font-normal opacity-80">
                          {table.tableLabel}
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-1 text-sm opacity-80">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {table.peopleCount} {t('orders.people')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {getActiveTime(table.activeSince)}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {table.orders.filter(o => !o.completed).length} {t('kitchen.pendingOrders')}
                  </Badge>
                </div>
              </CardHeader>

              {/* Orders List */}
              <CardContent className="p-0 divide-y">
                {table.orders.map(order => {
                  const { badges: orderBadges, text: noteText } = parseNotesWithBadges(order.notes);
                  return (
                    <div
                      key={order.id}
                      className={`p-4 flex items-start gap-3 transition-colors ${
                        order.completed ? 'bg-muted/50' : 'hover:bg-muted/30'
                      }`}
                      onClick={() => handleToggleComplete(order.id, order.completed)}
                    >
                      {/* Status indicator */}
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        order.completed ? 'bg-success' : 'bg-warning animate-pulse'
                      }`} />

                      {/* Order details */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${order.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {order.isSpecialItem && order.specialItemName
                            ? order.specialItemName
                            : order.menuItemName}
                          {order.isSpecialItem && (
                            <Badge variant="outline" className="ml-2 text-xs">{t('orders.special')}</Badge>
                          )}
                        </div>

                        {/* Color-coded badges */}
                        {orderBadges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {orderBadges.map((badge, idx) => (
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

                        {/* Note text (without badges) */}
                        {noteText && (
                          <p className={`text-sm mt-1 ${order.completed ? 'text-muted-foreground' : 'text-warning font-medium'}`}>
                            {t('orders.note')}: {noteText}
                          </p>
                        )}

                        {/* Time info */}
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatTime(order.timestamp)} ({getActiveTime(order.timestamp)} ago)
                        </div>
                      </div>

                      {/* Complete button */}
                      <Button
                        variant={order.completed ? "default" : "outline"}
                        size="icon"
                        className={`flex-shrink-0 ${
                          order.completed
                            ? 'bg-success hover:bg-success/90 text-success-foreground'
                            : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleComplete(order.id, order.completed);
                        }}
                        disabled={completeOrderMutation.isPending || uncompleteOrderMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed Tables Summary */}
      {tableGroups.filter(t => !t.hasPendingOrders && t.orders.length > 0).length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Completed Tables
            </h4>
            <div className="flex flex-wrap gap-2">
              {tableGroups.filter(t => !t.hasPendingOrders && t.orders.length > 0).map(table => (
                <Badge key={table.tableId} variant="outline" className="text-success">
                  <Check className="h-3 w-3 mr-1" />
                  Table {table.tableNumber}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
