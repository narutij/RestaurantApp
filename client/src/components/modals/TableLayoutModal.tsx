import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Restaurant, Table } from '@shared/schema';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatTime } from '@/lib/utils';

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
  const [tableNumber, setTableNumber] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [tableToEdit, setTableToEdit] = useState<Table | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset state when the modal is opened/closed
  useEffect(() => {
    if (!open) {
      setCreateMode(false);
      setEditMode(false);
      setTableNumber("");
      setTableLabel("");
      setTableToEdit(null);
    }
  }, [open]);

  // Fetch tables data
  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["/api/tables"],
    queryFn: () => apiRequest("/api/tables"),
    enabled: open,
  });

  // Create table mutation
  const createTableMutation = useMutation({
    mutationFn: (data: { number: string; label: string }) => 
      apiRequest('/api/tables', { 
        method: 'POST',
        body: {
          number: data.number,
          label: data.label,
          isActive: false,
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setCreateMode(false);
      setTableNumber("");
      setTableLabel("");
      toast({
        title: "Success",
        description: "Table layout was created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create table layout. Please try again.",
        variant: "destructive",
      });
      console.error("Create table error:", error);
    }
  });

  // Update table mutation
  const updateTableMutation = useMutation({
    mutationFn: (data: { id: number; data: { number: string; label: string } }) => 
      apiRequest(`/api/tables/${data.id}`, { 
        method: 'PUT',
        body: {
          number: data.data.number,
          label: data.data.label,
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setEditMode(false);
      setTableToEdit(null);
      setTableNumber("");
      setTableLabel("");
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
      console.error("Update table error:", error);
    }
  });

  // Delete table mutation
  const deleteTableMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/tables/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setDeleteDialogOpen(false);
      setTableToDelete(null);
      toast({
        title: "Success",
        description: "Table layout was deleted successfully.",
      });
    },
    onError: (error: any) => {
      // Success even on 204 No Content response, which might not be parsed as JSON
      if (error && typeof error === 'object' && error.message === 'Failed to execute \'json\' on \'Response\': Unexpected end of JSON input') {
        // This is actually a success case (204 No Content)
        queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
        setDeleteDialogOpen(false);
        setTableToDelete(null);
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
        console.error("Delete table error:", error);
      }
    }
  });

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
      label: tableLabel.trim(),
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
        label: tableLabel.trim(),
      }
    });
  };
  
  const handleDeleteClick = (e: React.MouseEvent, table: Table) => {
    e.stopPropagation(); // Prevent other actions
    setTableToDelete(table);
    setDeleteDialogOpen(true);
  };
  
  const handleEditClick = (e: React.MouseEvent, table: Table) => {
    e.stopPropagation(); // Prevent other actions
    setTableToEdit(table);
    setTableNumber(table.number);
    setTableLabel(table.label);
    setEditMode(true);
  };
  
  const confirmDelete = () => {
    if (tableToDelete) {
      deleteTableMutation.mutate(tableToDelete.id);
    }
  };

  // Render functions
  const renderTableList = () => {
    return (
      <div className="py-4">
        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="text-center py-4">Loading tables...</div>
          ) : tables.length === 0 ? (
            <div className="text-center py-4">No table layouts found</div>
          ) : (
            tables.map((table: Table) => (
              <div key={table.id} className="flex items-center mb-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 pr-24 relative"
                >
                  <div>
                    <div className="font-medium">{table.number}</div>
                    <div className="text-sm text-muted-foreground">{table.label}</div>
                  </div>
                  <div className="absolute right-1 flex">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-1 h-8 w-8 mr-1"
                      onClick={(e) => handleEditClick(e, table)}
                      title="Edit table"
                    >
                      <Edit className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-1 h-8 w-8"
                      onClick={(e) => handleDeleteClick(e, table)}
                      title="Delete table"
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
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
          <Label htmlFor="table-number">Table Number</Label>
          <Input
            id="table-number"
            placeholder="Enter table number"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="table-label">Table Label/Comment</Label>
          <Input
            id="table-label"
            placeholder="Enter label or description"
            value={tableLabel}
            onChange={(e) => setTableLabel(e.target.value)}
          />
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
              {createMode
                ? "Create New Table Layout"
                : editMode
                ? "Edit Table Layout"
                : "Manage Table Layouts"}
            </DialogTitle>
          </DialogHeader>
          
          {createMode || editMode ? (
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
                  onClick={createMode ? handleCreateTable : handleUpdateTable}
                  disabled={createTableMutation.isPending || updateTableMutation.isPending}
                >
                  {createTableMutation.isPending || updateTableMutation.isPending
                    ? "Saving..."
                    : createMode
                    ? "Create Table"
                    : "Update Table"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            renderTableList()
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete table "{tableToDelete?.number}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}