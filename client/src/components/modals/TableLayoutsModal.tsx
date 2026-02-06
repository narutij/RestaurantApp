import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ArrowLeft, Grid2X2, X, Loader2, Table2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Restaurant } from '@shared/schema';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';

type Layout = {
  id: number;
  name: string;
  tables: Table[];
};

type Table = {
  id: number;
  number: string;
  label: string;
  isActive: boolean;
  layoutId?: number | null;
};

type TableLayoutsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: Restaurant | null;
  onSelectLayout?: (layout: Layout) => void;
  canDelete?: boolean;
};

export function TableLayoutsModal({
  open,
  onOpenChange,
  restaurant,
  onSelectLayout,
  canDelete = true,
}: TableLayoutsModalProps) {
  const [selectedLayout, setSelectedLayout] = useState<Layout | null>(null);
  const [showLayoutForm, setShowLayoutForm] = useState(false);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [layoutToEdit, setLayoutToEdit] = useState<Layout | null>(null);
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
  const [tempSelectedLayoutId, setTempSelectedLayoutId] = useState<number | null>(null);
  const isSelectionMode = !!onSelectLayout;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data: serverTables = [], isLoading: isLoadingTables } = useQuery<Table[]>({
    queryKey: ['/api/tables'],
    queryFn: () => apiRequest('/api/tables'),
    enabled: open,
  });

  const { data: serverLayouts = [], isLoading: isLoadingLayouts } = useQuery<Layout[]>({
    queryKey: ['/api/table-layouts', restaurant?.id],
    queryFn: () => apiRequest(`/api/table-layouts${restaurant?.id ? `?restaurantId=${restaurant.id}` : ''}`),
    enabled: open && !!restaurant?.id,
  });

  const layouts = useMemo(() => {
    return serverLayouts.map(layout => ({
      ...layout,
      tables: serverTables.filter(table => table.layoutId === layout.id)
    }));
  }, [serverLayouts, serverTables]);

  useEffect(() => {
    if (selectedLayout) {
      const updatedLayout = layouts.find(l => l.id === selectedLayout.id);
      if (updatedLayout && JSON.stringify(updatedLayout.tables) !== JSON.stringify(selectedLayout.tables)) {
        setSelectedLayout(updatedLayout);
      }
    }
  }, [layouts, selectedLayout]);

  useEffect(() => {
    if (!open) {
      setSelectedLayout(null);
      setShowLayoutForm(false);
      setIsEditingLayout(false);
      setLayoutToEdit(null);
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

  // Mutations
  const createTableMutation = useMutation({
    mutationFn: (data: { number: string; label: string }) => 
      apiRequest('/api/tables', { 
        method: 'POST',
        body: { number: data.number, label: data.label, isActive: false, layoutId: selectedLayout?.id }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/table-layouts', restaurant?.id] });
      setShowTableForm(false);
      setTableNumber("");
      setTableLabel("");
      toast({ title: t('common.success'), description: t('layout.tableAdded') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('layout.failedCreateTable'), variant: "destructive" });
    }
  });

  const updateTableMutation = useMutation({
    mutationFn: (data: { id: number; data: { number: string; label: string } }) =>
      apiRequest(`/api/tables/${data.id}`, { method: 'PUT', body: data.data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setShowTableForm(false);
      setIsEditingTable(false);
      setTableToEdit(null);
      setTableNumber("");
      setTableLabel("");
      toast({ title: t('common.success'), description: t('layout.tableUpdated') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('layout.failedUpdateTable'), variant: "destructive" });
    }
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/tables/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setDeleteTableDialog(false);
      setTableToDelete(null);
      toast({ title: t('common.success'), description: t('layout.tableDeleted') });
    },
    onError: (error: any) => {
      if (error?.message?.includes('JSON')) {
        queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
        setDeleteTableDialog(false);
        setTableToDelete(null);
        toast({ title: t('common.success'), description: t('layout.tableDeleted') });
      } else {
        toast({ title: t('common.error'), description: t('layout.failedDeleteTable'), variant: "destructive" });
      }
    }
  });

  const createLayoutMutation = useMutation({
    mutationFn: (data: { name: string; restaurantId: number }) =>
      apiRequest('/api/table-layouts', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/table-layouts', restaurant?.id] });
      setShowLayoutForm(false);
      setLayoutName('');
      toast({ title: t('common.success'), description: t('layout.layoutCreated') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('layout.failedCreateLayout'), variant: 'destructive' });
    },
  });

  const updateLayoutMutation = useMutation({
    mutationFn: (data: { id: number; name: string }) =>
      apiRequest(`/api/table-layouts/${data.id}`, { method: 'PUT', body: { name: data.name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/table-layouts', restaurant?.id] });
      setShowLayoutForm(false);
      setIsEditingLayout(false);
      setLayoutToEdit(null);
      setLayoutName('');
      toast({ title: t('common.success'), description: t('layout.layoutUpdated') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('layout.failedUpdateLayout'), variant: 'destructive' });
    },
  });

  const deleteLayoutMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/table-layouts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/table-layouts', restaurant?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      setDeleteLayoutDialog(false);
      setLayoutToDelete(null);
      if (selectedLayout && layoutToDelete && selectedLayout.id === layoutToDelete.id) {
        setSelectedLayout(null);
      }
      toast({ title: t('common.success'), description: t('layout.layoutDeleted') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('layout.failedDeleteLayout'), variant: 'destructive' });
    },
  });

  // Handlers
  const handleCreateLayout = () => {
    if (!layoutName.trim() || !restaurant) return;
    createLayoutMutation.mutate({ name: layoutName.trim(), restaurantId: restaurant.id });
  };

  const handleUpdateLayout = () => {
    if (!layoutName.trim() || !layoutToEdit) return;
    updateLayoutMutation.mutate({ id: layoutToEdit.id, name: layoutName.trim() });
  };

  const handleCreateTable = () => {
    if (!tableNumber.trim() || !tableLabel.trim()) return;
    createTableMutation.mutate({ number: tableNumber.trim(), label: tableLabel.trim() });
  };

  const handleUpdateTable = () => {
    if (!tableNumber.trim() || !tableLabel.trim() || !tableToEdit) return;
    updateTableMutation.mutate({ id: tableToEdit.id, data: { number: tableNumber.trim(), label: tableLabel.trim() } });
  };

  const handleSelectLayout = (layout: Layout) => {
    if (isSelectionMode) {
      setTempSelectedLayoutId(layout.id);
    } else {
      setSelectedLayout(layout);
    }
  };

  const isLoading = isLoadingTables || isLoadingLayouts;

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
                  {selectedLayout && !isSelectionMode ? (
                    <button
                      onClick={() => {
                        setSelectedLayout(null);
                        setShowTableForm(false);
                      }}
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
                      {selectedLayout ? selectedLayout.name : t('layout.floorLayouts')}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedLayout
                        ? `${selectedLayout.tables?.length || 0} ${t('layout.tables')}`
                        : `${layouts.length} ${t('layout.layouts')}`
                      }
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
          ) : selectedLayout && !isSelectionMode ? (
            /* Layout Detail View */
            <ScrollArea className="max-h-[calc(85vh-120px)]">
              <div className="p-6 pt-2 space-y-4">
                {/* Add Table Form */}
                {showTableForm ? (
                  <div className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 space-y-4">
                    <h3 className="text-sm font-medium">
                      {isEditingTable ? t('layout.editTable') : t('layout.addNewTable')}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('layout.tableNumber')}</Label>
                        <Input
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                          placeholder="e.g., 5"
                          className="mt-1 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('layout.description')}</Label>
                        <Input
                          value={tableLabel}
                          onChange={(e) => setTableLabel(e.target.value)}
                          placeholder="e.g., Near window"
                          className="mt-1 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowTableForm(false);
                          setIsEditingTable(false);
                          setTableToEdit(null);
                          setTableNumber("");
                          setTableLabel("");
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={isEditingTable ? handleUpdateTable : handleCreateTable}
                        disabled={createTableMutation.isPending || updateTableMutation.isPending}
                      >
                        {(createTableMutation.isPending || updateTableMutation.isPending) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {isEditingTable ? t('menu.update') : t('layout.addTable')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-dashed border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/40 hover:bg-gray-100 dark:hover:bg-white/5"
                    onClick={() => {
                      setTableNumber("");
                      setTableLabel("");
                      setIsEditingTable(false);
                      setShowTableForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('layout.addTable')}
                  </Button>
                )}

                {/* Tables List */}
                {(selectedLayout?.tables?.length || 0) === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 bg-white/5 rounded-full flex items-center justify-center">
                      <Table2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">{t('layout.noTables')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(selectedLayout?.tables || []).map((table) => (
                      <div
                        key={table.id}
                        className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-bold text-amber-400">{String(table.number).slice(0, 2)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{t('layout.table')} {table.number}</p>
                            <p className="text-xs text-muted-foreground">{table.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-white/10"
                            onClick={() => {
                              setTableToEdit(table);
                              setTableNumber(table.number);
                              setTableLabel(table.label);
                              setIsEditingTable(true);
                              setShowTableForm(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-amber-400" />
                          </Button>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-500/20"
                              onClick={() => {
                                setTableToDelete(table);
                                setDeleteTableDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            /* Layout List View */
            <ScrollArea className="max-h-[calc(85vh-120px)]">
              <div className="p-6 pt-2 space-y-4">
                {/* Add Layout Form */}
                {showLayoutForm && !isSelectionMode ? (
                  <div className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 space-y-4">
                    <h3 className="text-sm font-medium">
                      {isEditingLayout ? t('layout.editLayout') : t('layout.createNewLayout')}
                    </h3>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('layout.layoutName')}</Label>
                      <Input
                        value={layoutName}
                        onChange={(e) => setLayoutName(e.target.value)}
                        placeholder="e.g., Summer Setup"
                        className="mt-1 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowLayoutForm(false);
                          setIsEditingLayout(false);
                          setLayoutToEdit(null);
                          setLayoutName("");
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={isEditingLayout ? handleUpdateLayout : handleCreateLayout}
                        disabled={createLayoutMutation.isPending || updateLayoutMutation.isPending}
                      >
                        {(createLayoutMutation.isPending || updateLayoutMutation.isPending) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {isEditingLayout ? t('menu.update') : t('common.create')}
                      </Button>
                    </div>
                  </div>
                ) : !isSelectionMode && (
                  <Button
                    variant="outline"
                    className="w-full border-dashed border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/40 hover:bg-gray-100 dark:hover:bg-white/5"
                    onClick={() => {
                      setLayoutName("");
                      setIsEditingLayout(false);
                      setShowLayoutForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('layout.createNewLayout')}
                  </Button>
                )}

                {/* Layouts List */}
                {layouts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 bg-white/5 rounded-full flex items-center justify-center">
                      <Grid2X2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">{t('layout.noLayouts')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {layouts.map((layout) => (
                      <div
                        key={layout.id}
                        className={`p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border transition-colors cursor-pointer ${
                          (isSelectionMode ? tempSelectedLayoutId === layout.id : selectedLayout?.id === layout.id)
                            ? 'border-amber-500/50 bg-amber-500/5'
                            : 'border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20'
                        }`}
                        onClick={() => handleSelectLayout(layout)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                              <Grid2X2 className="h-5 w-5 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{layout.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {layout.tables?.length || 0} {(layout.tables?.length || 0) !== 1 ? t('layout.tables') : t('layout.table1')}
                              </p>
                            </div>
                          </div>
                          {!isSelectionMode && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-white/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLayoutName(layout.name);
                                  setLayoutToEdit(layout);
                                  setIsEditingLayout(true);
                                  setShowLayoutForm(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 text-amber-400" />
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-red-500/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLayoutToDelete(layout);
                                    setDeleteLayoutDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-red-400" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Selection Mode Footer */}
          {isSelectionMode && (
            <div className="p-4 border-t border-gray-200 dark:border-white/5">
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  {t('common.cancel')}
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
                  {t('layout.selectLayout')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Layout Dialog */}
      <AlertDialog open={deleteLayoutDialog} onOpenChange={setDeleteLayoutDialog}>
        <AlertDialogContent className="bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('layout.deleteLayout')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.delete')} "{layoutToDelete?.name}"? {t('layout.deleteLayoutDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-white/10">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => layoutToDelete && deleteLayoutMutation.mutate(layoutToDelete.id)}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Table Dialog */}
      <AlertDialog open={deleteTableDialog} onOpenChange={setDeleteTableDialog}>
        <AlertDialogContent className="bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('layout.deleteTable')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.delete')} {t('layout.table1')} "{tableToDelete?.number}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-white/10">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => tableToDelete && deleteTableMutation.mutate(tableToDelete.id)}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
