import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, RotateCcw } from 'lucide-react';
import { formatTime, getActiveTime } from '@/lib/utils';
import { type OrderWithDetails, type Table, WebSocketMessage } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

export default function KitchenTab() {
  const queryClient = useQueryClient();
  const { addMessageListener, sendMessage } = useWebSocket();

  // Fetch active orders
  const { data: orders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders'],
  });

  // Fetch active tables to know activation times
  const { data: activeTables = [] } = useQuery<Table[]>({
    queryKey: ['/api/tables/active'],
  });

  // Tick every minute to keep timers fresh
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Listen for WebSocket updates
  useEffect(() => {
    const removeListener = addMessageListener((message: WebSocketMessage) => {
      if (message.type === 'NEW_ORDER' && typeof message.payload === 'object') {
        // Invalidate queries to get fresh data
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      } else if (message.type === 'COMPLETE_ORDER') {
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      } else if (message.type === 'UNCOMPLETE_ORDER') {
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      } else if (message.type === 'ACTIVATE_TABLE' || message.type === 'DEACTIVATE_TABLE') {
        queryClient.invalidateQueries({ queryKey: ['/api/tables/active'] });
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      }
    });
    
    return () => removeListener();
  }, [addMessageListener, queryClient]);

  // Complete order mutation
  const completeOrderMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/orders/${id}/complete`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    }
  });

  // Handle marking an order as complete
  const handleMarkComplete = (orderId: number, currentlyCompleted: boolean) => {
    if (currentlyCompleted) {
      apiRequest(`/api/orders/${orderId}/uncomplete`, { method: 'POST' }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      });
    } else {
      completeOrderMutation.mutate(orderId);
    }
  };

  // Group orders by table
  const ordersByTable: Record<string, { 
    tableId: number;
    tableNumber: string;
    tableLabel: string;
    activeSince: Date;
    orders: OrderWithDetails[] 
  }> = {};

  // Consider only orders whose table is currently active (server authoritative)
  const activeTableIds = new Set(activeTables.map(t => t.id));

  orders.filter(o => activeTableIds.has(o.tableId)).forEach(order => {
    const tableKey = `${order.tableId}`;
    if (!ordersByTable[tableKey]) {
      const tableInfo = activeTables.find((t) => t.id === order.tableId);
      ordersByTable[tableKey] = {
        tableId: order.tableId,
        tableNumber: order.tableNumber,
        tableLabel: order.tableLabel,
        activeSince: tableInfo?.activatedAt ? new Date(tableInfo.activatedAt) : new Date(),
        orders: []
      };
    }
    ordersByTable[tableKey].orders.push(order);
  });

  // Sort orders within each table by timestamp (newest first)
  Object.values(ordersByTable).forEach(table => {
    table.orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });

  // Hidden tables state and undo stack (max 20)
  const [hiddenTables, setHiddenTables] = useState<Set<number>>(new Set());
  const [undoStack, setUndoStack] = useState<number[]>([]);

  const handleHideTable = (tableId: number) => {
    // Mark all unfinished orders for this table as complete
    const tableData = ordersByTable[tableId.toString()];
    if (tableData) {
      tableData.orders.forEach((order) => {
        if (!order.completed) {
          apiRequest(`/api/orders/${order.id}/complete`, { method: 'POST' });
        }
      });
    }

    // Deactivate table so it's no longer considered active
    apiRequest(`/api/tables/${tableId}/deactivate`, { method: 'POST' }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables/active'] });
    });

    setHiddenTables(prev => new Set(prev).add(tableId));
    setUndoStack(prev => {
      const updated = [...prev, tableId];
      return updated.slice(-20);
    });
  };

  const handleUndo = () => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setHiddenTables(hidden => {
        const newSet = new Set(hidden);
        newSet.delete(last);
        return newSet;
      });
      return prev.slice(0, -1);
    });
  };

  // Helper to know if table has at least one incomplete order
  const tableHasPending = (t: { orders: OrderWithDetails[] }) => t.orders.some(o => !o.completed);

  const visibleTables = Object.values(ordersByTable).filter(t => !hiddenTables.has(t.tableId));
  const activeVisibleTables = visibleTables.filter(tableHasPending);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Kitchen Orders</h2>
        <Button
          size="icon"
          variant="outline"
          className="rounded bg-blue-500 hover:bg-blue-600 text-white h-8 w-8"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      
      {activeVisibleTables.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-center text-gray-500">
            No active orders. Orders will appear here when tables place them.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeVisibleTables.map((tableData) => (
            <Card key={tableData.tableId} className="overflow-hidden">
              <CardHeader onClick={() => handleHideTable(tableData.tableId)} className="bg-slate-800 text-white p-3 font-medium flex items-center justify-between cursor-pointer">
                <span>Table {tableData.tableNumber} - {tableData.tableLabel}</span>
                <span className="text-sm">
                  {tableData.activeSince ? `Active for ${getActiveTime(tableData.activeSince)}` : 'Active'}
                </span>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {tableData.orders.map((order) => (
                    <div 
                      key={order.id} 
                      className="p-4 flex items-center relative"
                    >
                      {!order.completed && (
                        <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-warning rounded-full"></div>
                      )}
                      <div className="flex-1" onClick={() => handleMarkComplete(order.id, order.completed)}>
                        <div className={`font-medium ${order.completed ? 'line-through text-slate-400' : ''}`}>
                          {order.menuItemName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Added at {formatTime(order.timestamp)} ({getActiveTime(order.timestamp)} ago)
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        size="icon"
                        className={`ml-3 ${
                          order.completed 
                            ? 'bg-green-500 text-white hover:bg-green-600' 
                            : 'bg-slate-100 hover:bg-slate-200'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkComplete(order.id, order.completed);
                        }}
                        disabled={completeOrderMutation.isPending}
                      >
                        <Check className={`h-5 w-5 ${order.completed ? 'text-white' : 'text-slate-600'}`} />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
