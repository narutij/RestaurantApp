import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AddMenuItemModal } from '@/components/modals/AddMenuItemModal';
import { AddTableModal } from '@/components/modals/AddTableModal';
import { apiRequest } from '@/lib/queryClient';
import { Pencil, Trash } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { type MenuItem, type Table } from '@shared/schema';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SetupTab() {
  const queryClient = useQueryClient();
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [confirmDeleteMenu, setConfirmDeleteMenu] = useState<number | null>(null);
  const [confirmDeleteTable, setConfirmDeleteTable] = useState<number | null>(null);

  // Fetch menu items and tables
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items'],
  });

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['/api/tables'],
  });

  // Mutations for menu items
  const createMenuItemMutation = useMutation({
    mutationFn: (item: { name: string; price: number }) => 
      apiRequest('POST', '/api/menu-items', item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      setMenuModalOpen(false);
    }
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, item }: { id: number; item: { name: string; price: number } }) => 
      apiRequest('PUT', `/api/menu-items/${id}`, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      setMenuModalOpen(false);
      setEditingMenuItem(null);
    }
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('DELETE', `/api/menu-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      setConfirmDeleteMenu(null);
    }
  });

  // Mutations for tables
  const createTableMutation = useMutation({
    mutationFn: (table: { number: string; label: string }) => 
      apiRequest('POST', '/api/tables', table),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setTableModalOpen(false);
    }
  });

  const updateTableMutation = useMutation({
    mutationFn: ({ id, table }: { id: number; table: { number: string; label: string } }) => 
      apiRequest('PUT', `/api/tables/${id}`, table),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setTableModalOpen(false);
      setEditingTable(null);
    }
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('DELETE', `/api/tables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setConfirmDeleteTable(null);
    }
  });

  // Handle edit menu item
  const handleEditMenuItem = (item: MenuItem) => {
    setEditingMenuItem(item);
    setMenuModalOpen(true);
  };

  // Handle edit table
  const handleEditTable = (table: Table) => {
    setEditingTable(table);
    setTableModalOpen(true);
  };

  return (
    <div className="p-4">
      {/* Menu Items Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Menu Items</h2>
          <Button 
            size="sm" 
            onClick={() => {
              setEditingMenuItem(null);
              setMenuModalOpen(true);
            }}
            className="flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-0">
            {menuItems.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No menu items yet. Add your first menu item!
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {menuItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-slate-500 text-sm">{formatPrice(item.price)}</div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditMenuItem(item)}>
                        <Pencil className="h-5 w-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => setConfirmDeleteMenu(item.id)}
                      >
                        <Trash className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Tables</h2>
          <Button 
            size="sm" 
            onClick={() => {
              setEditingTable(null);
              setTableModalOpen(true);
            }}
            className="flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Table
          </Button>
        </div>
        
        {tables.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-gray-500">
              No tables yet. Add your first table!
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tables.map((table) => (
              <Card key={table.id} className="bg-white">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-lg">Table {table.number}</span>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditTable(table)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive" 
                        onClick={() => setConfirmDeleteTable(table.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">Label: {table.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddMenuItemModal 
        open={menuModalOpen} 
        onOpenChange={setMenuModalOpen}
        onSubmit={(data) => {
          if (editingMenuItem) {
            updateMenuItemMutation.mutate({ id: editingMenuItem.id, item: data });
          } else {
            createMenuItemMutation.mutate(data);
          }
        }}
        editingItem={editingMenuItem}
        isSubmitting={createMenuItemMutation.isPending || updateMenuItemMutation.isPending}
      />

      <AddTableModal 
        open={tableModalOpen} 
        onOpenChange={setTableModalOpen}
        onSubmit={(data) => {
          if (editingTable) {
            updateTableMutation.mutate({ id: editingTable.id, table: data });
          } else {
            createTableMutation.mutate(data);
          }
        }}
        editingTable={editingTable}
        isSubmitting={createTableMutation.isPending || updateTableMutation.isPending}
      />

      {/* Confirm Delete Menu Item Dialog */}
      <AlertDialog open={confirmDeleteMenu !== null} onOpenChange={() => setConfirmDeleteMenu(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the menu item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteMenu !== null) {
                  deleteMenuItemMutation.mutate(confirmDeleteMenu);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMenuItemMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Table Dialog */}
      <AlertDialog open={confirmDeleteTable !== null} onOpenChange={() => setConfirmDeleteTable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteTable !== null) {
                  deleteTableMutation.mutate(confirmDeleteTable);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTableMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
