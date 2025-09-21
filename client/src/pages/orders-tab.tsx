import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { formatPrice, formatTime, getActiveTime } from '@/lib/utils';
import { WebSocketMessage, type MenuItem, type Table, type OrderWithDetails, type DayTemplate, type MenuCategory } from '@shared/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, ChevronRight } from 'lucide-react';

export default function OrderTab() {
  const queryClient = useQueryClient();
  const { addMessageListener } = useWebSocket();
  const [activeTableId, setActiveTableId] = useState<number | null>(null);

  // Fetch menu items and tables
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items'],
  });

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['/api/tables'],
  });

  // Fetch today's day template to know which tables are configured for the current workday
  const todayDateString = new Date().toISOString().split('T')[0];
  const { data: todayTemplate } = useQuery<DayTemplate | null>({
    queryKey: ['/api/day-templates/date', todayDateString],
    queryFn: async () => {
      try {
        return await apiRequest(`/api/day-templates/date/${todayDateString}`);
      } catch (err) {
        // If no template exists for today return null so UI can fallback gracefully
        return null;
      }
    },
  });

  // Determine which tables should be visible in the Active Tables list
  const tablesForToday = todayTemplate
    ? tables.filter((t) => todayTemplate.tables?.some((tt) => tt.id === t.id))
    : tables;

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
    gcTime: 0
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
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
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
    }
  });

  // Handle table activation - immediately shows table and avoids blank page issue
  const handleTableActivation = (tableId: number, isActive: boolean | null) => {
    // Always set the active table ID right away to avoid blank screen
    setActiveTableId(tableId);
    
    // If not already active, activate it via API
    if (!isActive) {
      activateTableMutation.mutate(tableId);
    }
  };

  // Calculate total price for active table
  const totalPrice = (tableOrders as OrderWithDetails[]).reduce((sum: number, order: OrderWithDetails) => sum + order.price, 0);

  // State for category expansion in Add Items area
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Helper: today's menu items from the day template
  const menuItemsForToday: MenuItem[] = todayTemplate?.menuItems ?? [];

  // Fetch menu categories for all categoryIds present in today's menu items
  const uniqueCategoryIds = Array.from(
    new Set(
      menuItemsForToday
        .map((i) => i.categoryId)
        .filter((id): id is number => typeof id === 'number')
    )
  );

  const { data: menuCategories = [] } = useQuery<MenuCategory[]>({
    queryKey: ['/api/menu-categories/ids', uniqueCategoryIds],
    queryFn: async () => {
      try {
        const promises = uniqueCategoryIds.map((id) => apiRequest(`/api/menu-categories/${id}`));
        return (await Promise.all(promises)) as MenuCategory[];
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        return [];
      }
    },
    enabled: uniqueCategoryIds.length > 0,
  });

  // Initialize expandedCategories when menuItemsForToday changes
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    menuItemsForToday.forEach((item) => {
      const key = item.categoryId?.toString() ?? 'uncategorized';
      initial[key] = true;
    });
    setExpandedCategories(initial);
  }, [menuItemsForToday]);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-4">
      {/* Active Tables */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Active Tables</h2>
        
        {tablesForToday.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-gray-500">
              No tables available. Add tables in the Setup tab.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tablesForToday.map((table) => (
              <Card 
                key={table.id}
                className={`${activeTableId === table.id ? 'border-2 border-primary' : ''} ${table.isActive ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (table.isActive) {
                    handleTableActivation(table.id, Boolean(table.isActive));
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="font-semibold text-lg mb-1">Table {table.number}</div>
                  <div className="text-xs text-slate-500 mb-2">{table.label}</div>
                  {table.isActive ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Active
                    </Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      className="text-xs rounded-full px-3 py-1 h-auto"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card onClick
                        handleTableActivation(table.id, Boolean(table.isActive));
                      }}
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
              {(tableOrders as OrderWithDetails[]).length === 0 ? (
                <div className="py-4 text-center text-gray-500">
                  No orders for this table yet. Add items below.
                </div>
              ) : (
                <>
                  {(tableOrders as OrderWithDetails[]).map((order: OrderWithDetails) => (
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
          {/* Close Table Button */}
          {activeTable.isActive && (
            <Button
              variant="destructive"
              className="w-full mt-3"
              onClick={() => deactivateTableMutation.mutate(activeTable.id)}
              disabled={deactivateTableMutation.isPending}
            >
              {deactivateTableMutation.isPending ? 'Closing...' : 'Close Table'}
            </Button>
          )}
        </div>
      )}

      {/* Add Items Section */}
      {activeTable ? (
        <div>
          <h2 className="text-lg font-semibold mb-3">Add Items to Table {activeTable.number}</h2>
          
          {menuItemsForToday.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center text-gray-500">
                No menu items selected for today. Configure a menu in the Workday tab.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  <div className="divide-y divide-slate-200">
                    {Object.entries(
                      menuItemsForToday.reduce((acc, item) => {
                        const categoryKey = item.categoryId?.toString() ?? 'uncategorized';
                        if (!acc[categoryKey]) {
                          const categoryName = categoryKey === 'uncategorized'
                            ? 'Uncategorized'
                            : menuCategories.find((c) => c.id === item.categoryId)?.name || 'Uncategorized';
                          acc[categoryKey] = { name: categoryName, items: [] as MenuItem[] };
                        }
                        acc[categoryKey].items.push(item);
                        return acc;
                      }, {} as Record<string, { name: string; items: MenuItem[] }>)
                    ).map(([categoryId, { name, items }]) => (
                      <div key={categoryId} className="border-b last:border-none">
                        {/* Category Header */}
                        <div
                          className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer"
                          onClick={() => toggleCategory(categoryId)}
                        >
                          <div className="flex items-center">
                            <ChevronRight
                              className={`h-4 w-4 mr-2 transition-transform ${
                                expandedCategories[categoryId] ? 'transform rotate-90' : ''
                              }`}
                            />
                            <h4 className="font-medium">{name}</h4>
                          </div>
                        </div>

                        {/* Items */}
                        {expandedCategories[categoryId] && (
                          <div className="divide-y divide-slate-200">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-4 hover:bg-slate-50"
                              >
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
                                      price: item.price,
                                    });
                                  }}
                                  disabled={addOrderMutation.isPending}
                                >
                                  <Plus className="h-5 w-5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
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
    </div>
  );
}
