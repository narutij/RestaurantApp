import React, { createContext, useContext, useState, useCallback } from 'react';

export type TabId = 'restaurant' | 'workday' | 'orders' | 'kitchen' | 'history';

// Pre-order item type with quantity and badges
interface PreOrderItem {
  id: string;
  menuItem?: {
    id: number;
    name: string;
    price: number;
    categoryId?: number | null;
  };
  specialItemName?: string;
  price: number;
  quantity: number;
  notes?: string;
  badges: string[];
  isSpecialItem: boolean;
}

interface TabContextType {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  // Persisted selected table ID
  selectedTableId: number | null;
  setSelectedTableId: (id: number | null) => void;
  // Persisted pre-order items per table
  preOrderItemsByTable: Record<number, PreOrderItem[]>;
  setPreOrderItems: (tableId: number, items: PreOrderItem[]) => void;
  getPreOrderItems: (tableId: number) => PreOrderItem[];
  clearPreOrderItems: (tableId: number) => void;
}

const TabContext = createContext<TabContextType | null>(null);

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTabState] = useState<TabId>('restaurant');
  const [selectedTableId, setSelectedTableIdState] = useState<number | null>(null);
  const [preOrderItemsByTable, setPreOrderItemsByTableState] = useState<Record<number, PreOrderItem[]>>({});

  const setActiveTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);
  }, []);

  const setSelectedTableId = useCallback((id: number | null) => {
    setSelectedTableIdState(id);
  }, []);

  const setPreOrderItems = useCallback((tableId: number, items: PreOrderItem[]) => {
    setPreOrderItemsByTableState(prev => ({
      ...prev,
      [tableId]: items
    }));
  }, []);

  const getPreOrderItems = useCallback((tableId: number): PreOrderItem[] => {
    return preOrderItemsByTable[tableId] || [];
  }, [preOrderItemsByTable]);

  const clearPreOrderItems = useCallback((tableId: number) => {
    setPreOrderItemsByTableState(prev => {
      const newState = { ...prev };
      delete newState[tableId];
      return newState;
    });
  }, []);

  return (
    <TabContext.Provider value={{ 
      activeTab, 
      setActiveTab,
      selectedTableId,
      setSelectedTableId,
      preOrderItemsByTable,
      setPreOrderItems,
      getPreOrderItems,
      clearPreOrderItems
    }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTab() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTab must be used within a TabProvider');
  }
  return context;
}
