import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { formatTime, getActiveTime } from '@/lib/utils';
import { type OrderWithDetails, WebSocketMessage } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { ToastNotification } from '@/components/ui/toast-notification';

export default function KitchenTab() {
  const queryClient = useQueryClient();
  const { addMessageListener, sendMessage } = useWebSocket();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [newOrderIds, setNewOrderIds] = useState<number[]>([]);

  // Fetch active orders
  const { data: orders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders'],
  });

  // Listen for WebSocket updates
  useEffect(() => {
    const removeListener = addMessageListener((message: WebSocketMessage) => {
      if (message.type === 'NEW_ORDER' && typeof message.payload === 'object') {
        // Invalidate queries to get fresh data
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        
        // Add to new orders list
        const order = message.payload as OrderWithDetails;
        setNewOrderIds(prev => [...prev, order.id]);
        
        // Show toast notification
        setToastMessage(`Table ${order.tableNumber} added ${order.menuItemName}`);
        setShowToast(true);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
          setShowToast(false);
        }, 3000);
      } else if (message.type === 'COMPLETE_ORDER') {
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      }
    });
    
    return () => removeListener();
  }, [addMessageListener, queryClient]);

  // Complete order mutation
  const completeOrderMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('POST', `/api/orders/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    }
  });

  // Handle marking an order as complete
  const handleMarkComplete = (orderId: number) => {
    completeOrderMutation.mutate(orderId);
    // Also remove from new orders list
    setNewOrderIds(prev => prev.filter(id => id !== orderId));
  };

  // Group orders by table
  const ordersByTable: Record<string, { 
    tableId: number;
    tableNumber: string;
    tableLabel: string;
    activeSince: Date;
    orders: OrderWithDetails[] 
  }> = {};

  orders.forEach(order => {
    const tableKey = `${order.tableId}`;
    if (!ordersByTable[tableKey]) {
      ordersByTable[tableKey] = {
        tableId: order.tableId,
        tableNumber: order.tableNumber,
        tableLabel: order.tableLabel,
        activeSince: new Date(new Date().getTime() - 30 * 60000), // Default to 30 minutes ago if we don't know
        orders: []
      };
    }
    ordersByTable[tableKey].orders.push(order);
  });

  // Sort orders within each table by timestamp (newest first)
  Object.values(ordersByTable).forEach(table => {
    table.orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });

  // Count new/uncompleted orders
  const newOrdersCount = orders.filter(order => !order.completed).length;

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Kitchen Orders</h2>
      
      {Object.keys(ordersByTable).length === 0 ? (
        <Card>
          <CardContent className="p-4 text-center text-gray-500">
            No active orders. Orders will appear here when tables place them.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.values(ordersByTable).map((tableData) => (
            <Card key={tableData.tableId} className="overflow-hidden">
              <CardHeader className="bg-slate-800 text-white p-3 font-medium flex items-center justify-between">
                <span>Table {tableData.tableNumber} - {tableData.tableLabel}</span>
                <span className="text-sm">Active for {getActiveTime(tableData.activeSince)}</span>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {tableData.orders.map((order) => (
                    <div 
                      key={order.id} 
                      className={`p-4 flex items-center relative ${newOrderIds.includes(order.id) ? 'appear-animation' : ''}`}
                    >
                      {!order.completed && (
                        <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-warning rounded-full"></div>
                      )}
                      <div className="flex-1">
                        <div className={`font-medium ${order.completed ? 'line-through text-slate-400' : ''}`}>
                          {order.menuItemName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Added at {formatTime(order.timestamp)} ({getActiveTime(order.timestamp)} ago)
                        </div>
                      </div>
                      {newOrderIds.includes(order.id) && !order.completed && (
                        <div className="notification-dot"></div>
                      )}
                      <Button 
                        variant={order.completed ? "success" : "outline"}
                        size="icon"
                        className={`ml-3 ${
                          order.completed 
                            ? 'bg-success text-white hover:bg-success/90' 
                            : 'bg-slate-100 hover:bg-slate-200'
                        }`}
                        onClick={() => handleMarkComplete(order.id)}
                        disabled={order.completed || completeOrderMutation.isPending}
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
      
      {/* Toast Notification */}
      {showToast && (
        <ToastNotification message={toastMessage} onClose={() => setShowToast(false)} />
      )}
    </div>
  );
}
