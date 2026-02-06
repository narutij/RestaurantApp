import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import { useTab } from '@/contexts/TabContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkday } from '@/contexts/WorkdayContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiRequest } from '@/lib/queryClient';
// formatPrice from useLanguage() context
import { WebSocketMessage, type MenuItem, type Table, type OrderWithDetails, type MenuCategory } from '@shared/schema';
import {
  Plus,
  Minus,
  ChevronRight,
  ChevronDown,
  Users,
  Clock,
  X,
  AlertCircle,
  Loader2,
  Send,
  Sparkles,
  ShoppingCart,
  Trash2,
  Check,
  Tag,
} from 'lucide-react';

// Pre-order item type with quantity and badges
interface PreOrderItem {
  id: string;
  menuItem?: MenuItem;
  specialItemName?: string;
  price: number;
  quantity: number;
  notes?: string;
  badges: string[];
  isSpecialItem: boolean;
}

// Default badge options
const DEFAULT_BADGES = ['Gluten free', 'Make it special', 'Birthday', 'Child'];

// Badge color mapping for consistent styling across the app
export const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Gluten free': { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-600' },
  'Make it special': { bg: 'bg-purple-500/15', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-600' },
  'Birthday': { bg: 'bg-pink-500/15', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-300 dark:border-pink-600' },
  'Child': { bg: 'bg-sky-500/15', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-300 dark:border-sky-600' },
};

// Get badge style classes
export const getBadgeStyle = (badge: string): string => {
  const colors = BADGE_COLORS[badge] || { 
    bg: 'bg-orange-500/15', 
    text: 'text-orange-700 dark:text-orange-400', 
    border: 'border-orange-300 dark:border-orange-600' 
  };
  return `${colors.bg} ${colors.text} ${colors.border} border`;
};

// Group orders by item for display (merging identical items)
interface GroupedOrder {
  key: string;
  name: string;
  price: number;
  quantity: number;
  badges: string[];
  noteText: string;
  isSpecialItem: boolean;
  hasReady: boolean;
  readyCount: number;
  orderIds: number[];
}

// Helper to parse badges from notes (format: "[badge1] [badge2] note text")
const parseNotesWithBadges = (notes: string | null | undefined): { badges: string[]; text: string } => {
  if (!notes) return { badges: [], text: '' };

  const badgeRegex = /\[([^\]]+)\]/g;
  const badges: string[] = [];
  let match;

  while ((match = badgeRegex.exec(notes)) !== null) {
    badges.push(match[1]);
  }

  // Get the text after all badges
  const text = notes.replace(badgeRegex, '').trim();

  return { badges, text };
};

export default function OrderTab() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { addMessageListener } = useWebSocketContext();
  const { activeWorkday, isWorkdayActive } = useWorkday();
  const { t, formatPrice } = useLanguage();

  // Use context for persistent state across tab switches
  const { 
    selectedTableId: activeTableId, 
    setSelectedTableId: setActiveTableId,
    getPreOrderItems,
    setPreOrderItems: setContextPreOrderItems,
    clearPreOrderItems
  } = useTab();

  // Local state
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [tableToActivate, setTableToActivate] = useState<Table | null>(null);
  const [peopleCount, setPeopleCount] = useState('2');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // Track which ready orders have been "seen" (user clicked on table after order became ready)
  const [seenReadyOrders, setSeenReadyOrders] = useState<Set<number>>(() => {
    const stored = localStorage.getItem('seenReadyOrders');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  
  // Close table confirmation dialog state
  const [closeTableDialogOpen, setCloseTableDialogOpen] = useState(false);
  const [tableToClose, setTableToClose] = useState<{ id: number; number: string; total: number; hasUnfinishedOrders: boolean } | null>(null);
  
  // Persist seen ready orders
  useEffect(() => {
    localStorage.setItem('seenReadyOrders', JSON.stringify([...seenReadyOrders]));
  }, [seenReadyOrders]);

  // Pre-order cart state - now synced with context
  const preOrderItems = activeTableId ? getPreOrderItems(activeTableId) : [];
  const setPreOrderItems = (itemsOrUpdater: PreOrderItem[] | ((prev: PreOrderItem[]) => PreOrderItem[])) => {
    if (activeTableId) {
      if (typeof itemsOrUpdater === 'function') {
        const currentItems = getPreOrderItems(activeTableId);
        const newItems = itemsOrUpdater(currentItems);
        setContextPreOrderItems(activeTableId, newItems);
      } else {
        setContextPreOrderItems(activeTableId, itemsOrUpdater);
      }
    }
  };
  const [isConfirming, setIsConfirming] = useState(false);

  // Note and badges for regular items
  const [itemNote, setItemNote] = useState('');
  const [itemBadges, setItemBadges] = useState<string[]>([]);

  // Special item modal state
  const [specialItemDialogOpen, setSpecialItemDialogOpen] = useState(false);
  const [specialItemName, setSpecialItemName] = useState('');
  const [specialItemPrice, setSpecialItemPrice] = useState('');
  const [specialItemNote, setSpecialItemNote] = useState('');
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);

  // Custom badges state (persisted)
  const [customBadges, setCustomBadges] = useState<string[]>(() => {
    const stored = localStorage.getItem('orderCustomBadges');
    return stored ? JSON.parse(stored) : [];
  });
  const [hiddenDefaultBadges, setHiddenDefaultBadges] = useState<string[]>(() => {
    const stored = localStorage.getItem('hiddenDefaultBadges');
    return stored ? JSON.parse(stored) : [];
  });
  const [newBadgeName, setNewBadgeName] = useState('');
  const [showAddBadge, setShowAddBadge] = useState(false);
  const [badgeEditMode, setBadgeEditMode] = useState(false);

  // Persist custom badges and hidden badges
  useEffect(() => {
    localStorage.setItem('orderCustomBadges', JSON.stringify(customBadges));
  }, [customBadges]);

  useEffect(() => {
    localStorage.setItem('hiddenDefaultBadges', JSON.stringify(hiddenDefaultBadges));
  }, [hiddenDefaultBadges]);

  // Remove a badge (custom or hide default)
  const handleRemoveBadge = (badge: string) => {
    if (DEFAULT_BADGES.includes(badge)) {
      setHiddenDefaultBadges(prev => [...prev, badge]);
    } else {
      setCustomBadges(prev => prev.filter(b => b !== badge));
    }
    // Also deselect it if selected
    setItemBadges(prev => prev.filter(b => b !== badge));
    setSelectedBadges(prev => prev.filter(b => b !== badge));
  };

  // All badges combined (filtering out hidden defaults)
  const allBadges = useMemo(() => [
    ...DEFAULT_BADGES.filter(b => !hiddenDefaultBadges.includes(b)),
    ...customBadges
  ], [customBadges, hiddenDefaultBadges]);

  // Active time calculation
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const getActiveTimeDisplay = (activatedAt: string | Date | null | undefined) => {
    if (!activatedAt) return '--:--';
    const start = new Date(activatedAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Fetch tables for the active workday's table layout
  const { data: tables = [], isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: ['tables', activeWorkday?.tableLayoutId],
    queryFn: async () => {
      if (!activeWorkday?.tableLayoutId) return [];
      const res = await fetch(`/api/tables?layoutId=${activeWorkday.tableLayoutId}`);
      if (!res.ok) throw new Error('Failed to fetch tables');
      return res.json();
    },
    enabled: !!activeWorkday?.tableLayoutId
  });

  // Fetch menu items for the active workday's menu
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ['menu-items', activeWorkday?.menuId],
    queryFn: async () => {
      if (!activeWorkday?.menuId) return [];
      const res = await fetch(`/api/menus/${activeWorkday.menuId}/items`);
      if (!res.ok) throw new Error('Failed to fetch menu items');
      return res.json();
    },
    enabled: !!activeWorkday?.menuId
  });

  // Fetch menu categories
  const uniqueCategoryIds = Array.from(
    new Set(menuItems.map(i => i.categoryId).filter((id): id is number => id !== null))
  );

  const { data: menuCategories = [] } = useQuery<MenuCategory[]>({
    queryKey: ['menu-categories', uniqueCategoryIds],
    queryFn: async () => {
      if (uniqueCategoryIds.length === 0) return [];
      const promises = uniqueCategoryIds.map(id =>
        fetch(`/api/menu-categories/${id}`).then(r => r.json())
      );
      return Promise.all(promises);
    },
    enabled: uniqueCategoryIds.length > 0
  });

  // Active table data
  const activeTable = tables.find(t => t.id === activeTableId);

  // Fetch orders for active table
  const { data: tableOrders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['table-orders', activeTableId],
    queryFn: async () => {
      if (!activeTableId) return [];
      const res = await fetch(`/api/tables/${activeTableId}/orders`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    enabled: !!activeTableId,
    refetchInterval: 3000
  });

  // Fetch all orders to track ready notifications across tables
  const { data: allOrders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['all-orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    enabled: isWorkdayActive,
    refetchInterval: 3000
  });

  // Calculate ready orders per table (only for ACTIVE tables, current session, that haven't been seen)
  const readyOrdersByTable = useMemo(() => {
    const result: Record<number, number> = {};
    // Build a map of table id -> activatedAt for active tables
    const activeTableMap = new Map(
      tables.filter(t => t.isActive).map(t => [t.id, t.activatedAt ? new Date(t.activatedAt).getTime() : 0])
    );
    
    allOrders.forEach(order => {
      const tableActivatedAt = activeTableMap.get(order.tableId);
      // Only count ready orders for tables that are:
      // 1. Still active
      // 2. Created AFTER the table was activated (current session)
      // 3. Not already seen by the user
      if (tableActivatedAt !== undefined) {
        const orderTime = new Date(order.timestamp).getTime();
        if (order.completed && !seenReadyOrders.has(order.id) && orderTime >= tableActivatedAt) {
          result[order.tableId] = (result[order.tableId] || 0) + 1;
        }
      }
    });
    return result;
  }, [allOrders, seenReadyOrders, tables]);

  // Group confirmed orders for display (merge identical items)
  const groupedTableOrders = useMemo((): GroupedOrder[] => {
    const groups: Record<string, GroupedOrder> = {};
    
    tableOrders.forEach(order => {
      const { badges, text: noteText } = parseNotesWithBadges(order.notes);
      const name = order.isSpecialItem && order.specialItemName 
        ? order.specialItemName 
        : order.menuItemName;
      
      // Create a key that uniquely identifies "same" orders
      const key = `${name}-${order.price}-${badges.sort().join(',')}-${noteText}-${order.isSpecialItem}`;
      
      if (!groups[key]) {
        groups[key] = {
          key,
          name: name || 'Unknown',
          price: order.price,
          quantity: 0,
          badges,
          noteText,
          isSpecialItem: order.isSpecialItem || false,
          hasReady: false,
          readyCount: 0,
          orderIds: []
        };
      }
      
      groups[key].quantity++;
      groups[key].orderIds.push(order.id);
      if (order.completed) {
        groups[key].hasReady = true;
        groups[key].readyCount++;
      }
    });
    
    return Object.values(groups);
  }, [tableOrders]);

  // Mark ready orders as seen when user clicks on a table
  const handleTableClick = (table: Table) => {
    if (table.isActive) {
      // Toggle selection - if clicking same table, deselect it
      if (activeTableId === table.id) {
        setActiveTableId(null);
        return;
      }
      setActiveTableId(table.id);
      // Mark all ready orders for this table as "seen"
      const readyOrderIds = allOrders
        .filter(o => o.tableId === table.id && o.completed)
        .map(o => o.id);
      if (readyOrderIds.length > 0) {
        setSeenReadyOrders(prev => {
          const newSet = new Set(prev);
          readyOrderIds.forEach(id => newSet.add(id));
          return newSet;
        });
      }
    } else {
      handleActivateTable(table);
    }
  };

  // Listen for WebSocket updates
  useEffect(() => {
    const removeListener = addMessageListener((message: WebSocketMessage) => {
      if (['NEW_ORDER', 'ACTIVATE_TABLE', 'DEACTIVATE_TABLE'].includes(message.type)) {
        queryClient.invalidateQueries({ queryKey: ['tables'] });
        queryClient.invalidateQueries({ queryKey: ['table-orders'] });
      }
    });
    return () => removeListener();
  }, [addMessageListener, queryClient]);

  // Initialize expanded categories - collapsed by default
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    menuItems.forEach(item => {
      initial[item.categoryId?.toString() ?? 'uncategorized'] = false;
    });
    setExpandedCategories(initial);
  }, [menuItems]);

  // Note: Pre-orders are now persisted per-table via context
  // They only clear when user manually removes items or confirms order

  // Mutations
  const activateTableMutation = useMutation({
    mutationFn: async ({ tableId, peopleCount }: { tableId: number; peopleCount: number }) => {
      const res = await apiRequest(`/api/tables/${tableId}/activate-with-count`, {
        method: 'POST',
        body: { peopleCount }
      });
      return res.json();
    },
    onSuccess: (_, { tableId }) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setActiveTableId(tableId);
      addNotification(t('orders.tableActivated'));
    },
    onSettled: () => {
      // Always close the dialog after mutation settles (success or error)
      setActivateDialogOpen(false);
      setTableToActivate(null);
    }
  });

  const deactivateTableMutation = useMutation({
    mutationFn: async ({ tableId, cancelOrders }: { tableId: number; cancelOrders: boolean }) => {
      // If there are unfinished orders and user is closing anyway, mark them as canceled
      if (cancelOrders) {
        const unfinishedOrders = allOrders.filter(o => o.tableId === tableId && !o.completed);
        for (const order of unfinishedOrders) {
          await apiRequest(`/api/orders/${order.id}/cancel`, { method: 'POST' });
        }
      }
      return apiRequest(`/api/tables/${tableId}/deactivate`, { method: 'POST' });
    },
    onSuccess: (_, { tableId }) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['table-orders'] });
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // Invalidate history and statistics data so it updates immediately
      // Use refetchType 'all' to ensure queries refetch even when not actively mounted
      queryClient.invalidateQueries({ queryKey: ['history-summary'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['statistics'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['kitchen-history'], refetchType: 'all' });
      if (activeTableId === tableId) {
        setActiveTableId(null);
      }
      // Clear the pre-order items for this table
      clearPreOrderItems(tableId);
      // Clear the seen ready orders for this table
      setSeenReadyOrders(prev => {
        const newSet = new Set(prev);
        allOrders.filter(o => o.tableId === tableId).forEach(o => newSet.delete(o.id));
        return newSet;
      });
      setCloseTableDialogOpen(false);
      setTableToClose(null);
      addNotification(t('orders.tableClosed'));
    }
  });
  
  // Handle close table button click - open confirmation dialog
  const handleCloseTableClick = () => {
    if (!activeTable) return;
    // Check for unfinished orders
    const unfinishedOrders = tableOrders.filter(o => !o.completed);
    setTableToClose({
      id: activeTable.id,
      number: activeTable.number,
      total: confirmedTotal,
      hasUnfinishedOrders: unfinishedOrders.length > 0
    });
    setCloseTableDialogOpen(true);
  };
  
  // Confirm close table
  const confirmCloseTable = () => {
    if (!tableToClose) return;
    deactivateTableMutation.mutate({ 
      tableId: tableToClose.id, 
      cancelOrders: tableToClose.hasUnfinishedOrders 
    });
  };

  // Create a single order - no automatic query invalidation (we'll do it manually after batch)
  const createOrderRequest = async (data: {
    tableId: number;
    menuItemId: number | null;
    price: number;
    notes?: string;
    specialItemName?: string;
    isSpecialItem?: boolean;
    workdayId?: number;
  }) => {
    const res = await apiRequest('/api/orders', {
      method: 'POST',
      body: { ...data, completed: false }
    });
    return res.json();
  };

  // Handlers
  const handleActivateTable = (table: Table) => {
    setTableToActivate(table);
    setPeopleCount('2');
    setActivateDialogOpen(true);
  };

  const confirmActivateTable = () => {
    if (!tableToActivate) return;
    activateTableMutation.mutate({
      tableId: tableToActivate.id,
      peopleCount: parseInt(peopleCount) || 2
    });
  };

  // Add item to pre-order cart
  const addToPreOrder = (item: MenuItem, quantity: number = 1) => {
    const hasExtras = itemNote.trim() || itemBadges.length > 0;

    setPreOrderItems(prev => {
      // Only stack if no note/badges attached
      if (!hasExtras) {
        const existingIndex = prev.findIndex(
          p => p.menuItem?.id === item.id && p.badges.length === 0 && !p.notes
        );
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + quantity
          };
          return updated;
        }
      }

      return [...prev, {
        id: `${item.id}-${Date.now()}`,
        menuItem: item,
        price: item.price,
        quantity,
        notes: itemNote.trim() || undefined,
        badges: [...itemBadges],
        isSpecialItem: false
      }];
    });

    // Reset note and badges after adding
    setItemNote('');
    setItemBadges([]);
  };

  // Toggle badge for regular items
  const toggleItemBadge = (badge: string) => {
    setItemBadges(prev =>
      prev.includes(badge)
        ? prev.filter(b => b !== badge)
        : [...prev, badge]
    );
  };

  // Update pre-order item quantity
  const updatePreOrderQuantity = (itemId: string, delta: number) => {
    setPreOrderItems(prev => {
      return prev.map(item => {
        if (item.id === itemId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  // Remove item from pre-order
  const removeFromPreOrder = (itemId: string) => {
    setPreOrderItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Add special item to pre-order
  const handleAddSpecialItem = () => {
    if (!specialItemName || !specialItemPrice) return;

    const newItem: PreOrderItem = {
      id: `special-${Date.now()}`,
      specialItemName,
      price: parseFloat(specialItemPrice),
      quantity: 1,
      notes: specialItemNote || undefined,
      badges: [...selectedBadges],
      isSpecialItem: true
    };

    setPreOrderItems(prev => [...prev, newItem]);

    // Reset modal state
    setSpecialItemDialogOpen(false);
    setSpecialItemName('');
    setSpecialItemPrice('');
    setSpecialItemNote('');
    setSelectedBadges([]);
  };

  // Toggle badge selection
  const toggleBadge = (badge: string) => {
    setSelectedBadges(prev =>
      prev.includes(badge)
        ? prev.filter(b => b !== badge)
        : [...prev, badge]
    );
  };

  // Add custom badge
  const handleAddCustomBadge = () => {
    if (!newBadgeName.trim()) return;
    if (!customBadges.includes(newBadgeName.trim())) {
      setCustomBadges(prev => [...prev, newBadgeName.trim()]);
    }
    setNewBadgeName('');
    setShowAddBadge(false);
  };

  // Confirm and send pre-order to kitchen
  const handleConfirmOrder = async () => {
    // Guard against double submission or empty cart
    if (isConfirming || !activeTableId || preOrderItems.length === 0) return;

    // Capture current items immediately to avoid stale closure
    const itemsToSend = [...preOrderItems];
    const tableId = activeTableId;
    const workdayId = activeWorkday?.id;

    // Set confirming and clear cart IMMEDIATELY for instant UI feedback
    setIsConfirming(true);
    setPreOrderItems([]);

    try {
      // Build array of all order requests (expanding quantities)
      const orderPromises: Promise<any>[] = [];

      for (const item of itemsToSend) {
        // Create quantity number of individual orders for each item
        for (let i = 0; i < item.quantity; i++) {
          orderPromises.push(
            createOrderRequest({
              tableId,
              menuItemId: item.menuItem?.id ?? null,
              price: item.price,
              notes: item.badges.length > 0
                ? `${item.badges.map(b => `[${b}]`).join(' ')}${item.notes ? ` ${item.notes}` : ''}`
                : item.notes,
              specialItemName: item.specialItemName,
              isSpecialItem: item.isSpecialItem,
              workdayId
            })
          );
        }
      }

      // Send all orders in parallel
      await Promise.all(orderPromises);

      // Invalidate queries ONCE after all orders are created
      queryClient.invalidateQueries({ queryKey: ['table-orders'] });

      addNotification(t('orders.orderConfirmed') || 'Order sent to kitchen!');
    } catch (error) {
      console.error('Error confirming order:', error);
      // Don't restore items - some orders may have been sent successfully
      // User can check the confirmed orders section to see what was saved
      addNotification(t('orders.orderFailed') || 'Failed to send some orders. Please check confirmed orders.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Calculate pre-order total
  const preOrderTotal = preOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Calculate confirmed orders total
  const confirmedTotal = tableOrders.reduce((sum, order) => sum + order.price, 0);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // No active workday
  if (!isWorkdayActive) {
    return (
      <div className="p-4 pb-24 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="p-4 bg-amber-500/10 rounded-full mb-4">
          <AlertCircle className="h-12 w-12 text-amber-500" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{t('orders.noActiveWorkday')}</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          {t('orders.startWorkdayFirst')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Tables Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 * 0.1 }}
      >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Users className="h-4 w-4 text-primary" />
            </div>
            {t('orders.tables')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tablesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : tables.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              {t('orders.noTables')}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {tables.map(table => {
                const readyCount = readyOrdersByTable[table.id] || 0;
                return (
                  <button
                    key={table.id}
                    className={`relative p-3 rounded-xl border-2 transition-all ${
                      activeTableId === table.id
                        ? 'border-primary bg-primary/10 shadow-md'
                        : table.isActive
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-border bg-muted/30 hover:border-muted-foreground hover:bg-muted/50'
                    }`}
                    onClick={() => handleTableClick(table)}
                  >
                    {/* Ready notification bubble */}
                    {readyCount > 0 && (
                      <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-md">
                        {readyCount}
                      </div>
                    )}
                    <div className="font-bold text-sm">{table.number}</div>
                    {table.isActive ? (
                      <div className="flex items-center justify-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-green-600" />
                          <span className="text-xs font-medium text-green-600">{table.peopleCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-600" />
                          <span className="text-xs font-medium text-amber-600">
                            {getActiveTimeDisplay(table.activatedAt)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-1">{t('orders.tapToOpen') || 'Tap to open'}</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* Active Table Section */}
      {activeTable && activeTable.isActive && (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 * 0.1 }}
        >
          {/* Table Header Card with Confirmed Orders */}
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">
                    {t('orders.table') || 'Table'} {activeTable.number}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {activeTable.peopleCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {getActiveTimeDisplay(activeTable.activatedAt)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                  onClick={handleCloseTableClick}
                  disabled={deactivateTableMutation.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('orders.close')}
                </Button>
              </div>

              {/* Confirmed Orders Section (extension of table card) */}
              {tableOrders.length > 0 && (
                <div className="mt-4 pt-4 border-t border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{t('orders.confirmedOrders') || 'Confirmed Orders'}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">{tableOrders.length}</Badge>
                  </div>
                  <div className="divide-y divide-border/50 max-h-[200px] overflow-y-auto">
                    {groupedTableOrders.map(group => (
                      <div key={group.key} className="py-2 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold bg-muted px-1.5 py-0.5 rounded">
                              {group.quantity}x
                            </span>
                            <span className="font-medium text-sm">{group.name}</span>
                            {group.isSpecialItem && (
                              <Badge variant="outline" className="text-xs">{t('orders.special')}</Badge>
                            )}
                            {group.hasReady && (
                              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-500">
                                {group.readyCount === group.quantity 
                                  ? (t('orders.ready') || 'Ready')
                                  : `${group.readyCount}/${group.quantity} ${t('orders.ready') || 'Ready'}`
                                }
                              </Badge>
                            )}
                          </div>
                          {/* Show badges as badge components with colors */}
                          {group.badges.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {group.badges.map((badge, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="outline" 
                                  className={`text-[10px] px-1.5 py-0 ${getBadgeStyle(badge)}`}
                                >
                                  {badge}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {/* Show remaining note text */}
                          {group.noteText && (
                            <p className="text-xs text-muted-foreground mt-0.5">{group.noteText}</p>
                          )}
                        </div>
                        <div className="text-sm font-medium">{formatPrice(group.price * group.quantity)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 mt-2 border-t border-primary/20 flex items-center justify-between font-semibold">
                    <span>{t('orders.total')}</span>
                    <span className="text-lg">{formatPrice(confirmedTotal)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pre-Order Cart */}
          {preOrderItems.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500/10 rounded-lg">
                    <ShoppingCart className="h-4 w-4 text-amber-600" />
                  </div>
                  {t('orders.pendingOrder') || 'Pending Order'}
                  <Badge variant="secondary" className="ml-auto">{preOrderItems.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="divide-y divide-amber-200/50">
                  {preOrderItems.map(item => (
                    <div key={item.id} className="py-2.5 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {item.isSpecialItem ? item.specialItemName : item.menuItem?.name}
                          </span>
                          {item.isSpecialItem && (
                            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-200">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Special
                            </Badge>
                          )}
                          {item.badges.map(badge => (
                            <Badge
                              key={badge}
                              variant="outline"
                              className={`text-xs ${getBadgeStyle(badge)}`}
                            >
                              {badge}
                            </Badge>
                          ))}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                        )}
                        <p className="text-sm text-muted-foreground">{formatPrice(item.price)}</p>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updatePreOrderQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updatePreOrderQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => removeFromPreOrder(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-amber-200/50 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('orders.subtotal') || 'Subtotal'}</p>
                    <p className="font-bold text-lg">{formatPrice(preOrderTotal)}</p>
                  </div>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleConfirmOrder}
                    disabled={isConfirming}
                  >
                    {isConfirming ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {t('orders.confirmOrder') || 'Send to Kitchen'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Items Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/10 rounded-lg">
                    <Plus className="h-4 w-4 text-blue-600" />
                  </div>
                  {t('orders.addItems')}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSpecialItemDialogOpen(true)}
                  className="border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  {t('orders.specialItem')}
                </Button>
              </div>

              {/* Note and Badges for regular items */}
              <div className="mt-3 space-y-3">
                <Input
                  placeholder={t('orders.addNote') || 'Add note to item...'}
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  className="h-9"
                />
                <div className="flex flex-wrap gap-1.5">
                  {allBadges.map(badge => (
                    <div key={badge} className="relative group">
                      <button
                        type="button"
                        onClick={() => !badgeEditMode && toggleItemBadge(badge)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          badgeEditMode
                            ? 'bg-red-500/10 text-red-600 border border-red-300 animate-[wiggle_0.3s_ease-in-out]'
                            : itemBadges.includes(badge)
                            ? 'bg-blue-500 text-white'
                            : 'bg-muted hover:bg-muted/80 text-foreground'
                        }`}
                      >
                        {badge}
                        {badgeEditMode && (
                          <span
                            className="ml-1 inline-flex cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); handleRemoveBadge(badge); }}
                          >
                            ×
                          </span>
                        )}
                      </button>
                    </div>
                  ))}

                  {/* Edit badges toggle */}
                  <button
                    type="button"
                    onClick={() => setBadgeEditMode(!badgeEditMode)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      badgeEditMode
                        ? 'bg-red-500 text-white'
                        : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {badgeEditMode ? (
                      <>{t('common.done') || 'Done'}</>
                    ) : (
                      <><Tag className="h-3 w-3 inline mr-0.5" />{t('orders.editBadges') || 'Edit'}</>
                    )}
                  </button>

                  {/* Add custom badge button */}
                  {!showAddBadge ? (
                    <button
                      type="button"
                      onClick={() => setShowAddBadge(true)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted/50 hover:bg-muted text-muted-foreground border border-dashed border-muted-foreground/30"
                    >
                      <Plus className="h-3 w-3 inline mr-0.5" />
                      {t('orders.addBadge') || 'Add'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Input
                        value={newBadgeName}
                        onChange={(e) => setNewBadgeName(e.target.value)}
                        placeholder={t('orders.badgeName')}
                        className="h-7 w-24 text-xs"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomBadge()}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={handleAddCustomBadge}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setShowAddBadge(false);
                          setNewBadgeName('');
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[350px]">
                <div className="divide-y">
                  {Object.entries(
                    menuItems.reduce((acc, item) => {
                      const key = item.categoryId?.toString() ?? 'uncategorized';
                      if (!acc[key]) {
                        const name = key === 'uncategorized'
                          ? t('orders.uncategorized')
                          : menuCategories.find(c => c.id === item.categoryId)?.name || t('orders.uncategorized');
                        acc[key] = { name, items: [] };
                      }
                      acc[key].items.push(item);
                      return acc;
                    }, {} as Record<string, { name: string; items: MenuItem[] }>)
                  ).map(([categoryId, { name, items }]) => (
                    <div key={categoryId}>
                      <button
                        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
                        onClick={() => toggleCategory(categoryId)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedCategories[categoryId] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{name}</span>
                        </div>
                        <Badge variant="secondary">{items.length}</Badge>
                      </button>

                      {expandedCategories[categoryId] && (
                        <div className="divide-y">
                          {items.map(item => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {formatPrice(item.price)}
                                </div>
                              </div>

                              {/* Quantity selector with add button */}
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => addToPreOrder(item, 1)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  x1
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => addToPreOrder(item, 2)}
                                >
                                  x2
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  onClick={() => addToPreOrder(item, 3)}
                                >
                                  x3
                                </Button>
                              </div>
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
        </motion.div>
      )}

      {/* Activate Table Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {t('orders.openTable') || 'Open Table'} {tableToActivate?.number}
            </DialogTitle>
            <DialogDescription>
              {t('orders.howManyPeople')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="peopleCount" className="text-sm font-medium">
              {t('orders.numberOfPeople')}
            </Label>
            <div className="flex items-center gap-3 mt-3">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => setPeopleCount(p => String(Math.max(1, parseInt(p) - 1)))}
              >
                <Minus className="h-5 w-5" />
              </Button>
              <Input
                id="peopleCount"
                type="number"
                min="1"
                value={peopleCount}
                onChange={(e) => setPeopleCount(e.target.value)}
                className="h-12 text-center text-xl font-bold"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => setPeopleCount(p => String(parseInt(p) + 1))}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActivateDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={confirmActivateTable}
              disabled={activateTableMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {activateTableMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {t('orders.open') || 'Open'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Special Item Dialog */}
      <Dialog open={specialItemDialogOpen} onOpenChange={setSpecialItemDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              {t('orders.addSpecialItem')}
            </DialogTitle>
            <DialogDescription>
              {t('orders.addCustomItem')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="specialName">{t('orders.itemName')}</Label>
              <Input
                id="specialName"
                placeholder={t('orders.itemNamePlaceholder')}
                value={specialItemName}
                onChange={(e) => setSpecialItemName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialPrice">{t('orders.price')}</Label>
              <Input
                id="specialPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={specialItemPrice}
                onChange={(e) => setSpecialItemPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialNote">{t('orders.note') || 'Note'}</Label>
              <Textarea
                id="specialNote"
                placeholder={t('orders.addNote')}
                value={specialItemNote}
                onChange={(e) => setSpecialItemNote(e.target.value)}
                rows={2}
              />
            </div>

            {/* Badge Selection */}
            <div className="space-y-2">
              <Label>{t('orders.badges') || 'Badges'}</Label>
              <div className="flex flex-wrap gap-2">
                {allBadges.map(badge => (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => toggleBadge(badge)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedBadges.includes(badge)
                        ? 'bg-blue-500 text-white'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                  >
                    {badge}
                  </button>
                ))}

                {/* Add custom badge button */}
                {!showAddBadge ? (
                  <button
                    type="button"
                    onClick={() => setShowAddBadge(true)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted/50 hover:bg-muted text-muted-foreground border border-dashed border-muted-foreground/30"
                  >
                    <Plus className="h-3 w-3 inline mr-1" />
                    {t('orders.addBadge') || 'Add'}
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <Input
                      value={newBadgeName}
                      onChange={(e) => setNewBadgeName(e.target.value)}
                      placeholder={t('orders.badgeName')}
                      className="h-8 w-28 text-xs"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomBadge()}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={handleAddCustomBadge}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setShowAddBadge(false);
                        setNewBadgeName('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setSpecialItemDialogOpen(false);
              setSpecialItemName('');
              setSpecialItemPrice('');
              setSpecialItemNote('');
              setSelectedBadges([]);
            }}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddSpecialItem}
              disabled={!specialItemName || !specialItemPrice}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('orders.addToOrder') || 'Add to Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Table Confirmation Dialog */}
      <Dialog open={closeTableDialogOpen} onOpenChange={setCloseTableDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {t('orders.closeTableConfirm') || 'Close Table?'}
            </DialogTitle>
            <DialogDescription>
              {t('orders.closeTableWarning') || 'Are you sure you want to close this table? All orders will be saved to history.'}
            </DialogDescription>
          </DialogHeader>
          
          {tableToClose && (
            <div className="py-4 space-y-3">
              {/* Warning about unfinished orders */}
              {tableToClose.hasUnfinishedOrders && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      {t('orders.unfinishedOrdersWarning') || 'Orders still in progress!'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('orders.unfinishedOrdersMessage') || 'There are orders that have not been completed by the kitchen. These will be marked as canceled if you close the table.'}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('orders.table') || 'Table'}</span>
                  <span className="font-semibold">{tableToClose.number}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('orders.totalOrders') || 'Total Orders'}</span>
                  <span className="font-semibold">{tableOrders.length}</span>
                </div>
                {tableToClose.hasUnfinishedOrders && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-amber-600">{t('orders.unfinishedOrders') || 'Unfinished Orders'}</span>
                    <span className="font-semibold text-amber-600">{tableOrders.filter(o => !o.completed).length}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">{t('orders.total') || 'Total'}</span>
                  <span className="text-lg font-bold text-green-600">{formatPrice(tableToClose.total)}</span>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setCloseTableDialogOpen(false);
                setTableToClose(null);
              }}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCloseTable}
              disabled={deactivateTableMutation.isPending}
            >
              {deactivateTableMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {tableToClose?.hasUnfinishedOrders 
                ? (t('orders.closeAnyway') || 'Close Anyway')
                : (t('orders.confirmClose') || 'Yes, Close Table')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
