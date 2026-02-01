import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Pencil, Trash2, ArrowLeft, Grid2X2, X, Loader2, Table2 } from 'lucide-react';
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

  useEffect(() => {
    if (!open) {
      setCreateMode(false);
      setEditMode(false);
      setLayoutName("");
      setLayoutToEdit(null);
      setSelectedLayout(null);
    }
  }, [open]);

  const { data: layouts = [], isLoading } = useQuery({
    queryKey: ["/api/table-layouts", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      try {
        return await apiRequest(`/api/table-layouts?restaurantId=${restaurant.id}`);
      } catch (error) {
        console.error('Error fetching table layouts:', error);
        return [];
      }
    },
    enabled: !!restaurant?.id,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["/api/tables", selectedLayout?.id],
    queryFn: () => selectedLayout?.id 
      ? apiRequest(`/api/tables?layoutId=${selectedLayout.id}`) 
      : Promise.resolve([]),
    enabled: !!selectedLayout?.id,
  });

  const createLayoutMutation = useMutation({
    mutationFn: (data: { name: string; restaurantId: number }) =>
      apiRequest('/api/table-layouts', {
        method: 'POST',
        body: { name: data.name, restaurantId: data.restaurantId, isActive: false, activatedAt: null }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/table-layouts", restaurant?.id] });
      setCreateMode(false);
      setLayoutName("");
      toast({ title: "Success", description: "Table layout was created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create table layout.", variant: "destructive" });
    }
  });

  const updateLayoutMutation = useMutation({
    mutationFn: (data: { id: number; data: { name: string } }) => 
      apiRequest(`/api/table-layouts/${data.id}`, { method: 'PUT', body: data.data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/table-layouts', restaurant?.id] });
      setEditMode(false);
      setLayoutToEdit(null);
      setLayoutName("");
      toast({ title: "Success", description: "Table layout was updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update table layout.", variant: "destructive" });
    }
  });

  const deleteLayoutMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/table-layouts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/table-layouts', restaurant?.id] });
      setDeleteDialogOpen(false);
      setLayoutToDelete(null);
      toast({ title: "Success", description: "Table layout was deleted successfully." });
    },
    onError: (error: any) => {
      if (error?.message?.includes('JSON')) {
        queryClient.invalidateQueries({ queryKey: ['/api/table-layouts', restaurant?.id] });
        setDeleteDialogOpen(false);
        setLayoutToDelete(null);
        toast({ title: "Success", description: "Table layout was deleted successfully." });
      } else {
        toast({ title: "Error", description: "Failed to delete table layout.", variant: "destructive" });
      }
    }
  });

  const handleCreateLayout = () => {
    if (!layoutName.trim() || !restaurant?.id) return;
    createLayoutMutation.mutate({ name: layoutName.trim(), restaurantId: restaurant.id });
  };

  const handleUpdateLayout = () => {
    if (!layoutName.trim() || !layoutToEdit) return;
    updateLayoutMutation.mutate({ id: layoutToEdit.id, data: { name: layoutName.trim() } });
  };

  const isPending = createLayoutMutation.isPending || updateLayoutMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] p-0 bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10 overflow-hidden max-h-[85vh]" hideCloseButton>
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent" />
            <div className="relative px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedLayout ? (
                    <button
                      onClick={() => setSelectedLayout(null)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-2"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  ) : (createMode || editMode) ? (
                    <button
                      onClick={() => { setCreateMode(false); setEditMode(false); }}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-2"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  ) : (
                    <div className="p-2.5 bg-amber-500/20 rounded-xl">
                      <Grid2X2 className="h-5 w-5 text-amber-400" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selectedLayout ? selectedLayout.name : createMode ? 'Create Layout' : editMode ? 'Edit Layout' : 'Floor Layouts'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedLayout ? `${tables.length} tables` : `${layouts.length} layouts`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedLayout ? (
            /* Layout Detail - Tables */
            <ScrollArea className="max-h-[calc(85vh-120px)]">
              <div className="p-6 pt-2 space-y-4">
                <Button
                  variant="outline"
                  className="w-full border-dashed border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/40 hover:bg-gray-100 dark:hover:bg-white/5"
                  onClick={() => {
                    setEditingTableId(null);
                    setTableEntryModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Table
                </Button>

                {tables.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 bg-white/5 rounded-full flex items-center justify-center">
                      <Table2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No tables yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tables.map((table: any) => (
                      <div
                        key={table.id}
                        className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-bold text-amber-400">{String(table.number).slice(0, 2)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Table {table.number}</p>
                            <p className="text-xs text-muted-foreground">{table.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-white/10"
                            onClick={() => {
                              setEditingTableId(table.id);
                              setTableEntryModalOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-amber-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (createMode || editMode) ? (
            /* Create/Edit Form */
            <div className="p-6 pt-2 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Layout Name</Label>
                <Input
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  placeholder="e.g., Summer Setup"
                  className="mt-1.5 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 focus:border-amber-500/50"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => { setCreateMode(false); setEditMode(false); }}
                  className="hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={createMode ? handleCreateLayout : handleUpdateLayout}
                  disabled={isPending}
                  className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-0"
                >
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {createMode ? 'Create' : 'Update'}
                </Button>
              </div>
            </div>
          ) : (
            /* Layout List */
            <ScrollArea className="max-h-[calc(85vh-120px)]">
              <div className="p-6 pt-2 space-y-4">
                <Button
                  variant="outline"
                  className="w-full border-dashed border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/40 hover:bg-gray-100 dark:hover:bg-white/5"
                  onClick={() => {
                    setLayoutName("");
                    setCreateMode(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Layout
                </Button>

                {layouts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 bg-white/5 rounded-full flex items-center justify-center">
                      <Grid2X2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No layouts yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {layouts.map((layout: TableLayout) => (
                      <div
                        key={layout.id}
                        className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 transition-colors cursor-pointer"
                        onClick={() => setSelectedLayout(layout)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                              <Grid2X2 className="h-5 w-5 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{layout.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(layout.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-white/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLayoutToEdit(layout);
                                setLayoutName(layout.name);
                                setEditMode(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 text-amber-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-500/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLayoutToDelete(layout);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Layout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{layoutToDelete?.name}"? This will also delete all tables within this layout.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => layoutToDelete && deleteLayoutMutation.mutate(layoutToDelete.id)}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0"
            >
              Delete
            </AlertDialogAction>
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
