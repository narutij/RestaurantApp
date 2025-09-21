import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Restaurant } from '@shared/schema';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Layout = {
  id: string;
  name: string;
  tables: Table[];
};

type Table = {
  id: number;
  number: string;
  label: string;
  isActive: boolean;
};

type TableLayoutsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: Restaurant | null;
  onSelectLayout?: (layout: Layout) => void;
};

export function TableLayoutsModal({
  open,
  onOpenChange,
  restaurant,
  onSelectLayout,
}: TableLayoutsModalProps) {
  const [selectedLayout, setSelectedLayout] = useState<Layout | null>(null);
  const [showLayoutForm, setShowLayoutForm] = useState(false);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [layoutName, setLayoutName] = useState("");
  const [showTableForm, setShowTableForm] = useState(false);
  const [isEditingTable, setIsEditingTable] = useState(false);
  const [tableToEdit, setTableToEdit] = useState<Table | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const [layoutToDelete, setLayoutToDelete] = useState<Layout | null>(null);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [deleteLayoutDialog, setDeleteLayoutDialog] = useState(false);
  const [deleteTableDialog, setDeleteTableDialog] = useState(false);
  const [tempSelectedLayoutId, setTempSelectedLayoutId] = useState<string | null>(null);
  const isSelectionMode = !!onSelectLayout;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get tables from server
  const { data: serverTables = [], isLoading: isLoadingTables } = useQuery<Table[]>({
    queryKey: ['/api/tables'],
    queryFn: () => apiRequest('/api/tables'),
    enabled: open,
  });

  // Get layouts from server
  const { data: layouts = [], isLoading: isLoadingLayouts } = useQuery<Layout[]>({
    queryKey: ['/api/table-layouts', restaurant?.id],
    queryFn: () => apiRequest(`/api/table-layouts${restaurant?.id ? `?restaurantId=${restaurant.id}` : ''}`),
    enabled: open && !!restaurant?.id,
  });

  // Reset state when modal is closed
  useEffect(() => {
    if (!open) {
      setSelectedLayout(null);
      setShowLayoutForm(false);
      setIsEditingLayout(false);
      setLayoutName("");
      setShowTableForm(false);
      setIsEditingTable(false);
      setTableToEdit(null);
      setTableNumber("");
      setTableLabel("");
      setLayoutToDelete(null);
      setTableToDelete(null);
      setDeleteLayoutDialog(false);
      setDeleteTableDialog(false);
      setTempSelectedLayoutId(null);
    }
  }, [open]);

  // Table mutations
  const createTableMutation = useMutation({
    mutationFn: (data: { number: string; label: string }) => 
      apiRequest('/api/tables', { 
        method: 'POST',
        body: {
          number: data.number,
          label: data.label,
          isActive: false,
          layoutId: selectedLayout ? Number(selectedLayout.id) : undefined,
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/table-layouts', restaurant?.id] });
      setShowTableForm(false);
      setTableNumber("");
      setTableLabel("");
      toast({
        title: "Success",
        description: "Table was added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create table. Please try again.",
        variant: "destructive",
      });
      console.error("Create table error:", error);
    }
  });

  const updateTableMutation = useMutation({
    mutationFn: (data: { id: number; data: { number: string; label: string } }) => 
      apiRequest(`/api/tables/${data.id}`, { 
        method: 'PUT',
        body: data.data
      }),
    onSuccess: (updatedTable, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      
      if (selectedLayout) {
        // Update the table in the selected layout
        const updatedLayouts = layouts.map(layout => {
          if (layout.id === selectedLayout.id) {
            return {
              ...layout,
              tables: layout.tables.map(table => 
                table.id === variables.id ? updatedTable : table
              )
            };
          }
          return layout;
        });
        
        setLayouts(updatedLayouts);
        
        // Update the selected layout with the updated table
        setSelectedLayout({
          ...selectedLayout,
          tables: selectedLayout.tables.map(table => 
            table.id === variables.id ? updatedTable : table
          )
        });
      }
      
      setShowTableForm(false);
      setIsEditingTable(false);
      setTableToEdit(null);
      setTableNumber("");
      setTableLabel("");
      toast({
        title: "Success",
        description: "Table was updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update table. Please try again.",
        variant: "destructive",
      });
      console.error("Update table error:", error);
    }
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/tables/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      
      if (selectedLayout && tableToDelete) {
        // Remove the table from the selected layout
        const updatedLayouts = layouts.map(layout => {
          if (layout.id === selectedLayout.id) {
            return {
              ...layout,
              tables: layout.tables.filter(table => table.id !== tableToDelete.id)
            };
          }
          return layout;
        });
        
        setLayouts(updatedLayouts);
        
        // Update the selected layout without the deleted table
        setSelectedLayout({
          ...selectedLayout,
          tables: selectedLayout.tables.filter(table => table.id !== tableToDelete.id)
        });
      }
      
      setDeleteTableDialog(false);
      setTableToDelete(null);
      toast({
        title: "Success",
        description: "Table was deleted successfully.",
      });
    },
    onError: (error: any) => {
      // Handle 204 No Content response
      if (error && typeof error === 'object' && error.message === 'Failed to execute \'json\' on \'Response\': Unexpected end of JSON input') {
        if (selectedLayout && tableToDelete) {
          // Remove the table from the selected layout
          const updatedLayouts = layouts.map(layout => {
            if (layout.id === selectedLayout.id) {
              return {
                ...layout,
                tables: layout.tables.filter(table => table.id !== tableToDelete.id)
              };
            }
            return layout;
          });
          
          setLayouts(updatedLayouts);
          
          // Update the selected layout without the deleted table
          setSelectedLayout({
            ...selectedLayout,
            tables: selectedLayout.tables.filter(table => table.id !== tableToDelete.id)
          });
        }
        
        setDeleteTableDialog(false);
        setTableToDelete(null);
        toast({
          title: "Success",
          description: "Table was deleted successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete table. Please try again.",
          variant: "destructive",
        });
        console.error("Delete table error:", error);
      }
    }
  });

  // Layout mutations
  const createLayoutMutation = useMutation({
    mutationFn: (data: { name: string; restaurantId: number }) =>
      apiRequest('/api/table-layouts', {
        method: 'POST',
        body: {
          name: data.name,
          restaurantId: data.restaurantId,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/table-layouts', restaurant?.id] });
      setShowLayoutForm(false);
      setLayoutName('');
      toast({
        title: 'Success',
        description: 'Layout was created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create layout. Please try again.',
        variant: 'destructive',
      });
      console.error('Create layout error:', error);
    },
  });

  // Layout handlers
  const handleCreateLayout = () => {
    if (!layoutName.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Layout name is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!restaurant) {
      toast({
        title: 'No restaurant selected',
        description: 'Please select a restaurant first.',
        variant: 'destructive',
      });
      return;
    }

    createLayoutMutation.mutate({
      name: layoutName.trim(),
      restaurantId: restaurant.id,
    });
  };

  const handleUpdateLayout = () => {
    if (!layoutName.trim() || !selectedLayout) {
      toast({
        title: "Invalid Input",
        description: "Layout name is required.",
        variant: "destructive",
      });
      return;
    }

    const updatedLayouts = layouts.map(layout => 
      layout.id === selectedLayout.id 
        ? { ...layout, name: layoutName.trim() } 
        : layout
    );

    setLayouts(updatedLayouts);
    setSelectedLayout({ ...selectedLayout, name: layoutName.trim() });
    setShowLayoutForm(false);
    setIsEditingLayout(false);
    setLayoutName("");
    
    toast({
      title: "Success",
      description: "Layout was updated successfully.",
    });
  };

  const handleDeleteLayout = () => {
    if (!layoutToDelete) return;
    
    // Delete all tables in this layout from the server
    layoutToDelete.tables.forEach(table => {
      deleteTableMutation.mutate(table.id);
    });
    
    // Remove the layout from the layouts array
    const updatedLayouts = layouts.filter(layout => layout.id !== layoutToDelete.id);
    setLayouts(updatedLayouts);
    
    // If we're deleting the currently selected layout, clear the selection
    if (selectedLayout && selectedLayout.id === layoutToDelete.id) {
      setSelectedLayout(null);
    }
    
    setDeleteLayoutDialog(false);
    setLayoutToDelete(null);
    
    toast({
      title: "Success",
      description: "Layout and its tables were deleted successfully.",
    });
  };

  // Table handlers
  const handleCreateTable = () => {
    if (!tableNumber.trim() || !tableLabel.trim()) {
      toast({
        title: "Invalid Input",
        description: "Table number and label are required.",
        variant: "destructive",
      });
      return;
    }

    createTableMutation.mutate({
      number: tableNumber.trim(),
      label: tableLabel.trim()
    });
  };

  const handleUpdateTable = () => {
    if (!tableNumber.trim() || !tableLabel.trim() || !tableToEdit) {
      toast({
        title: "Invalid Input",
        description: "Table number and label are required.",
        variant: "destructive",
      });
      return;
    }

    updateTableMutation.mutate({
      id: tableToEdit.id,
      data: {
        number: tableNumber.trim(),
        label: tableLabel.trim()
      }
    });
  };

  const handleDeleteTable = () => {
    if (!tableToDelete) return;
    
    deleteTableMutation.mutate(tableToDelete.id);
  };

  const handleSelectLayout = (layout: Layout) => {
    if (isSelectionMode) {
      setTempSelectedLayoutId(layout.id);
    } else {
      setSelectedLayout(layout);
    }
  };

  const handleEditLayout = (layout: Layout) => {
    setLayoutName(layout.name);
    setIsEditingLayout(true);
    setShowLayoutForm(true);
  };

  const handleEditTable = (table: Table) => {
    setTableToEdit(table);
    setTableNumber(table.number);
    setTableLabel(table.label);
    setIsEditingTable(true);
    setShowTableForm(true);
  };

  const renderLayoutList = () => {
    return (
      <div className="py-4">
        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {layouts.length === 0 ? (
            <div className="text-center py-4">No table layouts found. Create your first layout!</div>
          ) : (
            <div className="grid gap-2">
              {layouts.map((layout) => (
                <div key={layout.id} 
                  className={`border rounded-md p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    isSelectionMode
                      ? (tempSelectedLayoutId === layout.id ? 'border-primary bg-gray-50 dark:bg-gray-900' : '')
                      : (selectedLayout?.id === layout.id ? 'border-primary bg-gray-50 dark:bg-gray-900' : '')
                  }`}
                  onClick={() => handleSelectLayout(layout)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{layout.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {layout.tables?.length || 0} table{(layout.tables?.length || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {!isSelectionMode && (
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditLayout(layout);
                          }}
                        >
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLayoutToDelete(layout);
                            setDeleteLayoutDialog(true);
                          }}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {!showLayoutForm && !isSelectionMode && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => {
              setLayoutName("");
              setIsEditingLayout(false);
              setShowLayoutForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Table Layout
          </Button>
        )}
        
        {showLayoutForm && (
          <div className="mt-4 border rounded-md p-4">
            <h3 className="text-sm font-medium mb-2">
              {isEditingLayout ? 'Edit Layout' : 'New Layout'}
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="layout-name">Layout Name</Label>
                <Input
                  id="layout-name"
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  placeholder="Summer Setup, Winter Layout, etc."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowLayoutForm(false);
                    setIsEditingLayout(false);
                    setLayoutName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={isEditingLayout ? handleUpdateLayout : handleCreateLayout}
                >
                  {isEditingLayout ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLayoutDetail = () => {
    if (!selectedLayout) return null;

    return (
      <div className="py-4">
        <Button 
          variant="ghost" 
          className="mb-4 pl-0" 
          onClick={() => {
            setSelectedLayout(null);
            setShowTableForm(false);
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to layouts
        </Button>
        
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{selectedLayout.name}</h3>
          
          {!showTableForm && (
            <Button
              size="sm"
              onClick={() => {
                setTableNumber("");
                setTableLabel("");
                setIsEditingTable(false);
                setShowTableForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          )}
        </div>
        
        {showTableForm && (
          <div className="mb-4 border rounded-md p-4">
            <h3 className="text-sm font-medium mb-2">
              {isEditingTable ? 'Edit Table' : 'New Table'}
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="table-number">Table Number</Label>
                <Input
                  id="table-number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div>
                <Label htmlFor="table-label">Table Label</Label>
                <Input
                  id="table-label"
                  value={tableLabel}
                  onChange={(e) => setTableLabel(e.target.value)}
                  placeholder="Near window"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowTableForm(false);
                    setIsEditingTable(false);
                    setTableToEdit(null);
                    setTableNumber("");
                    setTableLabel("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={isEditingTable ? handleUpdateTable : handleCreateTable}
                  disabled={createTableMutation.isPending || updateTableMutation.isPending}
                >
                  {createTableMutation.isPending || updateTableMutation.isPending
                    ? 'Saving...'
                    : (isEditingTable ? 'Update' : 'Add')}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <div className="max-h-[300px] overflow-y-auto">
          {(selectedLayout?.tables?.length || 0) === 0 ? (
            <div className="text-center py-4">No tables in this layout. Add your first table!</div>
          ) : (
            <div className="grid gap-2">
              {(selectedLayout?.tables || []).map((table) => (
                <div key={table.id} className="border rounded-md p-3 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{table.number}</div>
                    <div className="text-sm text-muted-foreground">{table.label}</div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8"
                      onClick={() => handleEditTable(table)}
                    >
                      <Edit className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8"
                      onClick={() => {
                        setTableToDelete(table);
                        setDeleteTableDialog(true);
                      }}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedLayout 
                ? `Layout: ${selectedLayout.name}` 
                : 'Table Layouts'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLayout ? renderLayoutDetail() : renderLayoutList()}
          {isSelectionMode && (
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const chosen = layouts.find(l => l.id === tempSelectedLayoutId);
                  if (chosen) {
                    onSelectLayout?.(chosen);
                    onOpenChange(false);
                  }
                }}
                disabled={!tempSelectedLayoutId}
              >
                Save
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Layout Confirmation Dialog */}
      <AlertDialog open={deleteLayoutDialog} onOpenChange={setDeleteLayoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Layout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{layoutToDelete?.name}"? This will also delete all tables within this layout.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLayout}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Table Confirmation Dialog */}
      <AlertDialog open={deleteTableDialog} onOpenChange={setDeleteTableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete table "{tableToDelete?.number}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTable}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}