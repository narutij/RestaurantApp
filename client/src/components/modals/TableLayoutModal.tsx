import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash, ChevronRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Restaurant, TableLayout } from '@shared/schema';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TableEntryModal } from './TableEntryModal';

type TableLayoutModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: Restaurant | null;
};

export function TableLayoutModal({
  open,
  onOpenChange,
  restaurant,
}: TableLayoutModalProps) {
  const [createMode, setCreateMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [layoutName, setLayoutName] = useState("");
  const [layoutToDelete, setLayoutToDelete] = useState<TableLayout | null>(null);
  const [layoutToEdit, setLayoutToEdit] = useState<TableLayout | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<TableLayout | null>(null);
  const [tableEntryModalOpen, setTableEntryModalOpen] = useState(false);
  const [editingTableId, setEditingTableId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset state when the modal is opened/closed
  useEffect(() => {
    if (!open) {
      setCreateMode(false);
      setEditMode(false);
      setLayoutName("");
      setLayoutToEdit(null);
      setSelectedLayout(null);
    }
  }, [open]);

  // Fetch table layouts for the current restaurant
  const { data: layouts = [], isLoading } = useQuery({
    queryKey: ["/api/table-layouts", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) {
        console.log('No restaurant ID available, returning empty array');
        return [];
      }
      console.log(`Fetching table layouts for restaurant ${restaurant.id}`);
      try {
        const response = await apiRequest(`/api/table-layouts?restaurantId=${restaurant.id}`);
        console.log('Table layouts response:', response);
        return response;
      } catch (error) {
        console.error('Error fetching table layouts:', error);
        return [];
      }
    },
    enabled: !!restaurant?.id,
  });

  // Add debug logging for layouts and loading state
  useEffect(() => {
    console.log('Current layouts:', layouts);
    console.log('Loading state:', isLoading);
    console.log('Current restaurant:', restaurant);
  }, [layouts, isLoading, restaurant]);

  // Create table layout mutation
  const createLayoutMutation = useMutation({
    mutationFn: (data: { name: string; restaurantId: number }) => {
      console.log('Creating layout with data:', data);
      return apiRequest('/api/table-layouts', {
        method: 'POST',
        body: {
          name: data.name,
          restaurantId: data.restaurantId,
          isActive: false,
          activatedAt: null
        }
      });
    },
    onSuccess: (data) => {
      console.log('Layout created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/table-layouts", restaurant?.id] });
      setCreateMode(false);
      setLayoutName("");
      toast({
        title: "Success",
        description: "Table layout was created successfully.",
      });
    },
    onError: (error) => {
      console.error('Error creating layout:', error);
      toast({
        title: "Error",
        description: "Failed to create table layout. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update table layout mutation
  const updateLayoutMutation = useMutation({
    mutationFn: (data: { id: number; data: { name: string } }) => 
      apiRequest(`/api/table-layouts/${data.id}`, { 
        method: 'PUT',
        body: data.data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/table-layouts', restaurant?.id] });
      setEditMode(false);
      setLayoutToEdit(null);
      setLayoutName("");
      toast({
        title: "Success",
        description: "Table layout was updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update table layout. Please try again.",
        variant: "destructive",
      });
      console.error("Update layout error:", error);
    }
  });

  // Delete table layout mutation
  const deleteLayoutMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/table-layouts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/table-layouts', restaurant?.id] });
      setDeleteDialogOpen(false);
      setLayoutToDelete(null);
      toast({
        title: "Success",
        description: "Table layout was deleted successfully.",
      });
    },
    onError: (error: any) => {
      // Success even on 204 No Content response, which might not be parsed as JSON
      if (error && typeof error === 'object' && error.message === 'Failed to execute \'json\' on \'Response\': Unexpected end of JSON input') {
        // This is actually a success case (204 No Content)
        queryClient.invalidateQueries({ queryKey: ['/api/table-layouts', restaurant?.id] });
        setDeleteDialogOpen(false);
        setLayoutToDelete(null);
        toast({
          title: "Success",
          description: "Table layout was deleted successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete table layout. Please try again.",
          variant: "destructive",
        });
        console.error("Delete layout error:", error);
      }
    }
  });

  const handleCreateLayout = () => {
    if (!layoutName.trim() || !restaurant?.id) {
      toast({
        title: "Invalid Input",
        description: "Layout name and restaurant are required.",
        variant: "destructive",
      });
      return;
    }

    createLayoutMutation.mutate({
      name: layoutName.trim(),
      restaurantId: restaurant.id
    });
  };

  const handleUpdateLayout = () => {
    if (!layoutName.trim() || !layoutToEdit) {
      toast({
        title: "Invalid Input",
        description: "Layout name is required.",
        variant: "destructive",
      });
      return;
    }

    updateLayoutMutation.mutate({
      id: layoutToEdit.id,
      data: {
        name: layoutName.trim()
      }
    });
  };
  
  const handleDeleteClick = (e: React.MouseEvent, layout: TableLayout) => {
    e.stopPropagation(); // Prevent other actions
    setLayoutToDelete(layout);
    setDeleteDialogOpen(true);
  };
  
  const handleEditClick = (e: React.MouseEvent, layout: TableLayout) => {
    e.stopPropagation(); // Prevent other actions
    setLayoutToEdit(layout);
    setLayoutName(layout.name);
    setEditMode(true);
  };
  
  const confirmDelete = () => {
    if (layoutToDelete) {
      deleteLayoutMutation.mutate(layoutToDelete.id);
    }
  };

  const handleSelectLayout = (layout: TableLayout) => {
    setSelectedLayout(layout);
  };

  const handleBackToList = () => {
    setSelectedLayout(null);
  };

  // Fetch tables for selected layout
  const { data: tables = [] } = useQuery({
    queryKey: ["/api/tables", selectedLayout?.id],
    queryFn: () => selectedLayout?.id 
      ? apiRequest(`/api/tables?layoutId=${selectedLayout.id}`) 
      : Promise.resolve([]),
    enabled: !!selectedLayout?.id,
  });

  // Render functions
  const renderLayoutList = () => {
    return (
      <div className="py-4">
        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="text-center py-4">Loading layouts...</div>
          ) : layouts.length === 0 ? (
            <div className="text-center py-4">No table layouts found</div>
          ) : (
            layouts.map((layout: TableLayout) => (
              <div key={layout.id} className="flex items-center mb-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 pr-24 relative"
                  onClick={() => handleSelectLayout(layout)}
                >
                  <div>
                    <div className="font-medium">{layout.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(layout.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="absolute right-1 flex">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-1 h-8 w-8 mr-1"
                      onClick={(e) => handleEditClick(e, layout)}
                      title="Edit layout"
                    >
                      <Edit className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-1 h-8 w-8 mr-1"
                      onClick={(e) => handleDeleteClick(e, layout)}
                      title="Delete layout"
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Button>
              </div>
            ))
          )}
        </div>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-left h-auto py-3 mt-4"
          onClick={() => setCreateMode(true)}
        >
          <div className="font-medium flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Create New Table Layout
          </div>
        </Button>
      </div>
    );
  };

  const renderFormContent = () => {
    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="layout-name">Layout Name</Label>
          <Input
            id="layout-name"
            placeholder="Enter layout name"
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
          />
        </div>
      </div>
    );
  };

  const renderLayoutDetail = () => {
    if (!selectedLayout) return null;

    return (
      <div className="py-4">
        <Button variant="ghost" onClick={handleBackToList} className="mb-4 pl-0">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to layouts
        </Button>
        
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{selectedLayout.name}</h3>
          <Button 
            size="sm" 
            onClick={() => {
              setEditingTableId(null);
              setTableEntryModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Table
          </Button>
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {tables.length === 0 ? (
            <div className="text-center py-4">No tables in this layout. Add your first table!</div>
          ) : (
            <div className="grid gap-2">
              {tables.map(table => (
                <div key={table.id} className="border rounded-md p-3 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{table.number}</div>
                    <div className="text-sm text-muted-foreground">{table.label}</div>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-1 h-8 w-8"
                      onClick={() => {
                        setEditingTableId(table.id);
                        setTableEntryModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-1 h-8 w-8"
                      onClick={(e) => {
                        // We would handle table deletion here
                        // Similar to layout deletion
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
                : createMode
                  ? "Create New Table Layout"
                  : editMode
                    ? "Edit Table Layout"
                    : "Manage Table Layouts"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLayout ? (
            renderLayoutDetail()
          ) : createMode || editMode ? (
            <>
              {renderFormContent()}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (createMode) setCreateMode(false);
                    if (editMode) setEditMode(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={createMode ? handleCreateLayout : handleUpdateLayout}
                  disabled={createLayoutMutation.isPending || updateLayoutMutation.isPending}
                >
                  {createLayoutMutation.isPending || updateLayoutMutation.isPending
                    ? "Saving..."
                    : createMode
                    ? "Create Layout"
                    : "Update Layout"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            renderLayoutList()
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the layout "{layoutToDelete?.name}" and all its tables. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Table Entry Modal */}
      {selectedLayout && (
        <TableEntryModal
          open={tableEntryModalOpen}
          onOpenChange={setTableEntryModalOpen}
          layoutId={selectedLayout.id}
          tableId={editingTableId || undefined}
        />
      )}
    </>
  );
}