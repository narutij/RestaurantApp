import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { formatPrice, formatTime, getActiveTime } from '@/lib/utils';
import { WebSocketMessage, type MenuItem, type Table, type OrderWithDetails } from '@shared/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { ToastNotification } from '@/components/ui/toast-notification';

export default function OrderTab() {
  const queryClient = useQueryClient();
  const { addMessageListener } = useWebSocket();
  const [activeTableId, setActiveTableId] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch menu items and tables
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items'],
  });

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['/api/tables'],
  });

  // Listen for WebSocket updates
  useEffect(() => {
    const removeListener = addMessageListener((message: WebSocketMessage) => {
      if (message.type === 'NEW_ORDER' && typeof message.payload === 'object') {
        // Invalidate queries to get fresh data
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
        
        // If active table has orders, refresh them
        if (activeTableId) {
          queryClient.invalidateQueries({ queryKey: ['/api/tables', activeTableId, 'orders'] });
        }
        
        // Show toast notification for new orders
        const order = message.payload as OrderWithDetails;
        setToastMessage(`New order added: ${order.menuItemName} to Table ${order.tableNumber}`);
        setShowToast(true);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
          setShowToast(false);
        }, 3000);
      } else if (message.type === 'ACTIVATE_TABLE' || message.type === 'DEACTIVATE_TABLE') {
        queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      }
    });
    
    return () => removeListener();
  }, [addMessageListener, queryClient, activeTableId]);

  // Get active tables with their orders
  const activeTable = tables.find(table => table.id === activeTableId);
  
  // Fetch orders for active table
  const { data: tableOrders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: [`/api/tables/${activeTableId}/orders`],
    enabled: activeTableId !== null,
    // Refetch at regular intervals to keep orders up to date
    refetchInterval: 2000,
    // Reset cache when activeTableId changes
    staleTime: 0,
    cacheTime: 0
  });

  // Mutations for table activation and orders
  const activateTableMutation = useMutation({
    mutationFn: (tableId: number) => 
      apiRequest(`/api/tables/${tableId}/activate`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
    }
  });
  
  const deactivateTableMutation = useMutation({
    mutationFn: (tableId: number) => 
      apiRequest(`/api/tables/${tableId}/deactivate`, { method: 'POST' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      if (activeTableId === variables) {
        setActiveTableId(null);
      }
    }
  });
  
  const addOrderMutation = useMutation({
    mutationFn: (data: { tableId: number; menuItemId: number; price: number }) => 
      apiRequest('/api/orders', { 
        method: 'POST',
        body: {
          tableId: data.tableId,
          menuItemId: data.menuItemId,
          price: data.price,
          // Remove timestamp as the server will handle this with defaultNow()
          completed: false
        }
      }),
    onSuccess: () => {
      // Refresh the table's orders
      queryClient.invalidateQueries({ queryKey: ['/api/tables', activeTableId, 'orders'] });
      
      // Also refresh kitchen view orders and table orders
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/new'] });
      
      // Force a refetch of the current table's orders immediately
      queryClient.invalidateQueries({ queryKey: ['/api/tables', activeTableId, 'orders'] });
    },
    onError: (error) => {
      console.error('Failed to add order:', error);
      setToastMessage('Failed to add order. Please try again.');
      setShowToast(true);
      
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }
  });

  // Handle table activation - immediately shows table and avoids blank page issue
  const handleTableActivation = (tableId: number, isActive: boolean | null) => {
    // Always set the active table ID right away to avoid blank screen
    setActiveTableId(tableId);
    
    // If not already active, activate it via API
    if (!isActive) {
      activateTableMutation.mutate(tableId);
      
      // Show toast notification for table activation
      const tableNumber = tables.find(t => t.id === tableId)?.number || tableId;
      setToastMessage(`Table ${tableNumber} activated`);
      setShowToast(true);
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }
  };

  // Calculate total price for active table
  const totalPrice = tableOrders.reduce((sum, order) => sum + order.price, 0);

  return (
    <div className="p-4">
      {/* Active Tables */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Active Tables</h2>
        
        {tables.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-gray-500">
              No tables available. Add tables in the Setup tab.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tables.map((table) => (
              <Card 
                key={table.id} 
                className={`${activeTableId === table.id ? 'border-2 border-primary' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="font-semibold text-lg mb-1">Table {table.number}</div>
                  <div className="text-xs text-slate-500 mb-2">{table.label}</div>
                  {table.isActive ? (
                    <div className="flex justify-between items-center">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Active
                      </Badge>
                      {activeTableId !== table.id && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleTableActivation(table.id, Boolean(table.isActive))}
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      className="text-xs rounded-full px-3 py-1 h-auto"
                      onClick={() => handleTableActivation(table.id, Boolean(table.isActive))}
                    >
                      Activate
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Active Table Orders */}
      {activeTable && (
        <div className="mb-6">
          <div className="bg-slate-200 p-3 rounded-t-lg font-medium flex items-center">
            <span>Table {activeTable.number} - {activeTable.label}</span>
            <span className="ml-auto text-sm text-slate-500">
              {activeTable.activatedAt ? `Active for ${getActiveTime(activeTable.activatedAt)}` : 'Active'}
            </span>
          </div>
          
          <Card className="rounded-t-none shadow border-t-0">
            <CardContent className="p-3 divide-y divide-slate-100">
              {tableOrders.length === 0 ? (
                <div className="py-4 text-center text-gray-500">
                  No orders for this table yet. Add items below.
                </div>
              ) : (
                <>
                  {tableOrders.map((order) => (
                    <div key={order.id} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{order.menuItemName}</div>
                        <div className="text-xs text-slate-500">
                          Added at {formatTime(order.timestamp)}
                        </div>
                      </div>
                      <div className="text-sm text-slate-600">{formatPrice(order.price)}</div>
                    </div>
                  ))}
                  
                  <div className="pt-3 pb-1">
                    <div className="font-semibold flex justify-between">
                      <span>Total:</span>
                      <span>{formatPrice(totalPrice)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Items Section */}
      {activeTable ? (
        <div>
          <h2 className="text-lg font-semibold mb-3">Add Items to Table {activeTable.number}</h2>
          
          {menuItems.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center text-gray-500">
                No menu items available. Add menu items in the Setup tab.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  <div className="divide-y divide-slate-200">
                    {menuItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-slate-500 text-sm">{formatPrice(item.price)}</div>
                        </div>
                        <Button 
                          size="icon" 
                          className="rounded-full h-8 w-8 flex items-center justify-center"
                          onClick={() => {
                            addOrderMutation.mutate({
                              tableId: activeTable.id,
                              menuItemId: item.id,
                              price: item.price
                            });
                            
                            // Show toast notification for added item
                            setToastMessage(`Added ${item.name} to Table ${activeTable.number}`);
                            setShowToast(true);
                            
                            // Hide toast after 3 seconds
                            setTimeout(() => {
                              setShowToast(false);
                            }, 3000);
                          }}
                          disabled={addOrderMutation.isPending}
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-4 text-center text-gray-500">
            Select or activate a table to add orders.
          </CardContent>
        </Card>
      )}

      {/* Toast Notification */}
      {showToast && (
        <ToastNotification message={toastMessage} onClose={() => setShowToast(false)} />
      )}
    </div>
  );
}
