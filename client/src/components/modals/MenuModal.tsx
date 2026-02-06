import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Pencil, Trash2, ArrowLeft, MenuSquare, X, Loader2, ChevronRight, PlusCircle, UtensilsCrossed, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Menu, Restaurant } from '@shared/schema';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useLanguage } from '@/contexts/LanguageContext';

type MenuModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: Restaurant | null;
  canDelete?: boolean;
};

export function MenuModal({ open, onOpenChange, restaurant, canDelete = true }: MenuModalProps) {
  const { formatPrice, t } = useLanguage();
  // Menu states
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [menuToEdit, setMenuToEdit] = useState<Menu | null>(null);
  const [menuName, setMenuName] = useState("");
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);
  const [deleteMenuDialog, setDeleteMenuDialog] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) {
      setShowMenuForm(false);
      setIsEditingMenu(false);
      setMenuToEdit(null);
      setMenuName("");
      setSelectedMenu(null);
    }
  }, [open]);

  const { data: menus = [], isLoading } = useQuery({
    queryKey: ['/api/menus', restaurant?.id],
    queryFn: () => apiRequest(`/api/menus?restaurantId=${restaurant?.id}`),
    enabled: !!restaurant?.id && open
  });

  // Menu mutations
  const createMenuMutation = useMutation({
    mutationFn: (data: { name: string, restaurantId: number }) => 
      apiRequest('/api/menus', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menus', restaurant?.id] });
      setShowMenuForm(false);
      setMenuName("");
      toast({ title: t('menu.menuCreated'), description: t('menu.menuCreatedDesc') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('menu.failedCreate'), variant: "destructive" });
    }
  });

  const updateMenuMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: { name: string } }) => 
      apiRequest(`/api/menus/${id}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menus', restaurant?.id] });
      setShowMenuForm(false);
      setIsEditingMenu(false);
      setMenuToEdit(null);
      setMenuName("");
      toast({ title: t('menu.menuUpdated'), description: t('menu.menuUpdatedDesc') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('menu.failedUpdate'), variant: "destructive" });
    }
  });

  const deleteMenuMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/menus/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menus'] });
      if (restaurant?.id) queryClient.invalidateQueries({ queryKey: ['/api/menus', restaurant.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/menu-categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      setDeleteMenuDialog(false);
      setMenuToDelete(null);
      toast({ title: t('menu.menuDeleted'), description: t('menu.menuDeletedDesc') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('menu.failedDelete'), variant: "destructive" });
    }
  });

  const handleCreateMenu = () => {
    if (!menuName.trim() || !restaurant?.id) return;
    createMenuMutation.mutate({ name: menuName.trim(), restaurantId: restaurant.id });
  };

  const handleUpdateMenu = () => {
    if (!menuName.trim() || !menuToEdit) return;
    updateMenuMutation.mutate({ id: menuToEdit.id, data: { name: menuName.trim() } });
  };

  if (!restaurant) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px] p-0 bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10 overflow-hidden" hideCloseButton>
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
              <MenuSquare className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('menu.noRestaurant')}</h3>
            <p className="text-sm text-muted-foreground">{t('menu.selectRestaurantFirst')}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] p-0 bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10 overflow-hidden max-h-[85vh]" hideCloseButton>
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-transparent" />
            <div className="relative px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedMenu ? (
                    <button
                      onClick={() => setSelectedMenu(null)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-2"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  ) : (
                    <div className="p-2.5 bg-green-500/20 rounded-xl">
                      <MenuSquare className="h-5 w-5 text-green-400" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selectedMenu ? selectedMenu.name : t('menu.designer')}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedMenu ? t('menu.manageCategoriesItems') : `${menus.length} ${t('menu.menusCount')}`}
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
          ) : selectedMenu ? (
            /* Menu Detail View - Categories */
            <CategoryList menuId={selectedMenu.id} canDelete={canDelete} />
          ) : (
            /* Menu List View */
            <ScrollArea className="max-h-[calc(85vh-120px)]">
              <div className="p-6 pt-2 space-y-4">
                {/* Menu Form */}
                {showMenuForm ? (
                  <div className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 space-y-4">
                    <h3 className="text-sm font-medium">
                      {isEditingMenu ? t('menu.editMenu') : t('menu.createNewMenu')}
                    </h3>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('menu.menuName')}</Label>
                      <Input
                        value={menuName}
                        onChange={(e) => setMenuName(e.target.value)}
                        placeholder="e.g., Lunch Menu"
                        className="mt-1 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowMenuForm(false);
                          setIsEditingMenu(false);
                          setMenuToEdit(null);
                          setMenuName("");
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={isEditingMenu ? handleUpdateMenu : handleCreateMenu}
                        disabled={createMenuMutation.isPending || updateMenuMutation.isPending}
                      >
                        {(createMenuMutation.isPending || updateMenuMutation.isPending) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {isEditingMenu ? t('menu.update') : t('common.create')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-dashed border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/40 hover:bg-gray-100 dark:hover:bg-white/5"
                    onClick={() => {
                      setMenuName("");
                      setIsEditingMenu(false);
                      setShowMenuForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('menu.createNewMenu')}
                  </Button>
                )}

                {menus.length === 0 && !showMenuForm ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 bg-white/5 rounded-full flex items-center justify-center">
                      <MenuSquare className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">{t('menu.noMenus')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {menus.map((menu: Menu) => (
                      <div
                        key={menu.id}
                        className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 transition-colors cursor-pointer"
                        onClick={() => setSelectedMenu(menu)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                              <MenuSquare className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{menu.name}</p>
                              <p className="text-xs text-muted-foreground">{t('menu.clickToManage')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-white/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuToEdit(menu);
                                setMenuName(menu.name);
                                setIsEditingMenu(true);
                                setShowMenuForm(true);
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
                                  setMenuToDelete(menu);
                                  setDeleteMenuDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            )}
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
      
      {/* Delete Menu Dialog */}
      <AlertDialog open={deleteMenuDialog} onOpenChange={setDeleteMenuDialog}>
        <AlertDialogContent className="bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('menu.deleteMenu')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.delete')} "{menuToDelete?.name}" {t('menu.deleteAndAllItems')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-white/10">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => menuToDelete && deleteMenuMutation.mutate(menuToDelete.id)}
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

function CategoryList({ menuId, canDelete = true }: { menuId: number; canDelete?: boolean }) {
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});
  
  // Category form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any>(null);
  const [categoryName, setCategoryName] = useState("");
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [deletingCategoryName, setDeletingCategoryName] = useState("");
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  
  // Item form states
  const [showItemForm, setShowItemForm] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<any>(null);
  const [itemCategoryId, setItemCategoryId] = useState<number | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [deletingItemName, setDeletingItemName] = useState("");
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['/api/menu-categories', menuId],
    queryFn: () => apiRequest(`/api/menu-categories?menuId=${menuId}`),
  });

  // Categories are collapsed by default - no auto-expand

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string, menuId: number }) => 
      apiRequest('/api/menu-categories', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-categories', menuId] });
      setShowCategoryForm(false);
      setCategoryName("");
      toast({ title: t('menu.categoryCreated'), description: t('menu.categoryCreatedDesc') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('menu.failedCreateCategory'), variant: "destructive" });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: { name: string } }) => 
      apiRequest(`/api/menu-categories/${id}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-categories', menuId] });
      setShowCategoryForm(false);
      setIsEditingCategory(false);
      setCategoryToEdit(null);
      setCategoryName("");
      toast({ title: t('menu.categoryUpdated'), description: t('menu.categoryUpdatedDesc') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('menu.failedUpdateCategory'), variant: "destructive" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/menu-categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-categories', menuId] });
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      setDeleteCategoryDialogOpen(false);
      setDeletingCategoryId(null);
      toast({ title: t('menu.categoryDeleted'), description: t('menu.categoryDeletedDesc') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('menu.failedDeleteCategory'), variant: "destructive" });
    }
  });

  // Item mutations
  const createItemMutation = useMutation({
    mutationFn: (data: { name: string; price: number; categoryId: number; description?: string }) => 
      apiRequest('/api/menu-items', { method: 'POST', body: data }),
    onSuccess: () => {
      if (itemCategoryId) queryClient.invalidateQueries({ queryKey: ['/api/menu-items', itemCategoryId] });
      resetItemForm();
      toast({ title: t('menu.itemCreated'), description: t('menu.itemCreatedDesc') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('menu.failedCreateItem'), variant: "destructive" });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: { name: string; price: number; description?: string } }) => 
      apiRequest(`/api/menu-items/${id}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      if (itemCategoryId) queryClient.invalidateQueries({ queryKey: ['/api/menu-items', itemCategoryId] });
      resetItemForm();
      toast({ title: t('menu.itemUpdated'), description: t('menu.itemUpdatedDesc') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('menu.failedUpdateItem'), variant: "destructive" });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/menu-items/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      setDeleteItemDialogOpen(false);
      setDeletingItemId(null);
      toast({ title: t('menu.itemDeleted'), description: t('menu.itemDeletedDesc') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('menu.failedDeleteItem'), variant: "destructive" });
    }
  });

  const resetItemForm = () => {
    setShowItemForm(false);
    setIsEditingItem(false);
    setItemToEdit(null);
    setItemCategoryId(null);
    setItemName("");
    setItemPrice("");
    setItemDescription("");
  };

  const handleCreateCategory = () => {
    if (!categoryName.trim()) return;
    createCategoryMutation.mutate({ name: categoryName.trim(), menuId });
  };

  const handleUpdateCategory = () => {
    if (!categoryName.trim() || !categoryToEdit) return;
    updateCategoryMutation.mutate({ id: categoryToEdit.id, data: { name: categoryName.trim() } });
  };

  const handleCreateItem = () => {
    if (!itemName.trim() || !itemCategoryId) return;
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price <= 0) {
      toast({ title: t('menu.invalidPrice'), description: t('menu.enterValidPrice'), variant: "destructive" });
      return;
    }
    createItemMutation.mutate({
      name: itemName.trim(),
      price,
      categoryId: itemCategoryId,
      ...(itemDescription.trim() ? { description: itemDescription.trim() } : {})
    });
  };

  const handleUpdateItem = () => {
    if (!itemName.trim() || !itemToEdit) return;
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price <= 0) {
      toast({ title: t('menu.invalidPrice'), description: t('menu.enterValidPrice'), variant: "destructive" });
      return;
    }
    updateItemMutation.mutate({
      id: itemToEdit.id,
      data: {
        name: itemName.trim(),
        price,
        ...(itemDescription.trim() ? { description: itemDescription.trim() } : {})
      }
    });
  };

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="max-h-[calc(85vh-120px)]">
        <div className="p-6 pt-2 space-y-4">
          {/* Category Form */}
          {showCategoryForm ? (
            <div className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-blue-400" />
                {isEditingCategory ? t('menu.editCategory') : t('menu.addCategory')}
              </h3>
              <div>
                <Label className="text-xs text-muted-foreground">{t('menu.categoryName')}</Label>
                <Input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g., Main Courses"
                  className="mt-1 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCategoryForm(false);
                    setIsEditingCategory(false);
                    setCategoryToEdit(null);
                    setCategoryName("");
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={isEditingCategory ? handleUpdateCategory : handleCreateCategory}
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                >
                  {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {isEditingCategory ? t('menu.update') : t('workday.add')}
                </Button>
              </div>
            </div>
          ) : showItemForm ? (
            /* Item Form */
            <div className="p-4 bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-emerald-400" />
                {isEditingItem ? t('menu.editItem') : t('menu.addItem')}
              </h3>
              <div>
                <Label className="text-xs text-muted-foreground">{t('menu.itemName')}</Label>
                <Input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g., Margherita Pizza"
                  className="mt-1 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('menu.price')} (€)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('menu.descriptionOptional')}</Label>
                <Textarea
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Brief description..."
                  className="mt-1 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 resize-none h-16"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={resetItemForm}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={isEditingItem ? handleUpdateItem : handleCreateItem}
                  disabled={createItemMutation.isPending || updateItemMutation.isPending}
                >
                  {(createItemMutation.isPending || updateItemMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {isEditingItem ? t('menu.update') : t('workday.add')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/40 hover:bg-gray-100 dark:hover:bg-white/5"
              onClick={() => {
                setCategoryName("");
                setIsEditingCategory(false);
                setShowCategoryForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('menu.addCategory')}
            </Button>
          )}

          {categories.length === 0 && !showCategoryForm ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 bg-white/5 rounded-full flex items-center justify-center">
                <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t('menu.noCategories')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category: any) => (
                <div key={category.id} className="bg-gray-50 dark:bg-[#181818] rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
                  {/* Category Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`transition-transform ${expandedCategories[category.id] ? 'rotate-90' : ''}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="font-medium text-sm">{category.name}</span>
                      <CategoryItemCount categoryId={category.id} />
                    </div>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-green-500/20"
                        onClick={() => {
                          setItemCategoryId(category.id);
                          setItemName("");
                          setItemPrice("");
                          setItemDescription("");
                          setIsEditingItem(false);
                          setShowItemForm(true);
                          setShowCategoryForm(false);
                        }}
                      >
                        <PlusCircle className="h-4 w-4 text-green-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-white/10"
                        onClick={() => {
                          setCategoryToEdit(category);
                          setCategoryName(category.name);
                          setIsEditingCategory(true);
                          setShowCategoryForm(true);
                          setShowItemForm(false);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-amber-400" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-red-500/20"
                          onClick={() => {
                            setDeletingCategoryId(category.id);
                            setDeletingCategoryName(category.name);
                            setDeleteCategoryDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Category Items */}
                  {expandedCategories[category.id] && (
                    <CategoryItems
                      categoryId={category.id}
                      canDelete={canDelete}
                      onEditItem={(item) => {
                        setItemToEdit(item);
                        setItemCategoryId(category.id);
                        setItemName(item.name);
                        setItemPrice(item.price.toString());
                        setItemDescription(item.description || "");
                        setIsEditingItem(true);
                        setShowItemForm(true);
                        setShowCategoryForm(false);
                      }}
                      onDeleteItem={(itemId, itemName) => {
                        setDeletingItemId(itemId);
                        setDeletingItemName(itemName);
                        setDeleteItemDialogOpen(true);
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Delete Item Dialog */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('menu.deleteItem')}</AlertDialogTitle>
            <AlertDialogDescription>{t('common.delete')} "{deletingItemName}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-white/10">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItemId && deleteItemMutation.mutate(deletingItemId)}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Category Dialog */}
      <AlertDialog open={deleteCategoryDialogOpen} onOpenChange={setDeleteCategoryDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('menu.deleteCategory')}</AlertDialogTitle>
            <AlertDialogDescription>{t('common.delete')} "{deletingCategoryName}" {t('menu.deleteCategoryAndItems')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-white/10">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCategoryId && deleteCategoryMutation.mutate(deletingCategoryId)}
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

function CategoryItemCount({ categoryId }: { categoryId: number }) {
  const { t } = useLanguage();
  const { data: items = [] } = useQuery({
    queryKey: ['/api/menu-items', categoryId],
    queryFn: () => apiRequest(`/api/menu-items?categoryId=${categoryId}`),
  });

  return (
    <span className="ml-2 text-xs text-muted-foreground">
      ({items.length} {items.length !== 1 ? t('menu.items') : t('menu.item')})
    </span>
  );
}

function CategoryItems({ categoryId, canDelete = true, onEditItem, onDeleteItem }: {
  categoryId: number,
  canDelete?: boolean,
  onEditItem: (item: any) => void,
  onDeleteItem: (itemId: number, itemName: string) => void
}) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['/api/menu-items', categoryId],
    queryFn: () => apiRequest(`/api/menu-items?categoryId=${categoryId}`),
  });
  const { t, formatPrice } = useLanguage();

  if (isLoading) {
    return (
      <div className="p-4 border-t border-gray-200 dark:border-white/5">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4 border-t border-gray-200 dark:border-white/5 text-center">
        <p className="text-xs text-muted-foreground">{t('menu.noItems')}</p>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 dark:border-white/5 divide-y divide-gray-200 dark:divide-white/5">
      {items.map((item: any) => (
        <div key={item.id} className="flex items-center justify-between p-3 pl-10 hover:bg-white/5 transition-colors">
          <div>
            <p className="text-sm font-medium">{item.name}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
            )}
            <p className="text-xs font-medium text-green-400 mt-0.5">{formatPrice(item.price)}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-white/10"
              onClick={() => onEditItem(item)}
            >
              <Pencil className="h-3.5 w-3.5 text-amber-400" />
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-red-500/20"
                onClick={() => onDeleteItem(item.id, item.name)}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
