import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash, Trash2, ChevronRight, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Menu, Restaurant } from '@shared/schema';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { formatTime, formatPrice } from '@/lib/utils';
import { CategoryModal } from '@/components/modals/CategoryModal';
import { MenuItemModal } from '@/components/modals/MenuItemModal';

type MenuModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: Restaurant | null;
};

export function MenuModal({
  open,
  onOpenChange,
  restaurant,
}: MenuModalProps) {
  const [createMode, setCreateMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newMenuName, setNewMenuName] = useState("");
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);
  const [menuToEdit, setMenuToEdit] = useState<Menu | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  
  // Function to open the category modal for editing
  const openEditCategoryModal = (categoryId: number) => {
    setEditingCategoryId(categoryId);
    setCategoryModalOpen(true);
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset state when the modal is opened/closed
  useEffect(() => {
    if (!open) {
      setCreateMode(false);
      setEditMode(false);
      setNewMenuName("");
      setMenuToEdit(null);
      setSelectedMenu(null);
    }
  }, [open]);

  // Fetch menus for the current restaurant
  const { data: menus = [], isLoading } = useQuery({
    queryKey: ['/api/menus', restaurant?.id],
    queryFn: () => apiRequest(`/api/menus?restaurantId=${restaurant?.id}`),
    enabled: !!restaurant?.id && open
  });

  // Mutations
  const createMenuMutation = useMutation({
    mutationFn: (data: { name: string, restaurantId: number }) => 
      apiRequest('/api/menus', {
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menus', restaurant?.id] });
      setCreateMode(false);
      setNewMenuName("");
      toast({
        title: "Menu Created",
        description: "Your menu has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Creating Menu",
        description: "There was an error creating your menu. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateMenuMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: { name: string } }) => 
      apiRequest(`/api/menus/${id}`, {
        method: 'PUT',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menus', restaurant?.id] });
      setEditMode(false);
      setMenuToEdit(null);
      setNewMenuName("");
      toast({
        title: "Menu Updated",
        description: "Your menu has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Updating Menu",
        description: "There was an error updating your menu. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteMenuMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/menus/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: (data) => {
      console.log(`Delete menu success!`, data);
      // Invalidate all relevant cache entries
      queryClient.invalidateQueries({ queryKey: ['/api/menus'] });
      
      // Also invalidate restaurant-specific menu queries
      if (restaurant?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/menus', restaurant.id] });
      }
      
      // Also invalidate menu categories that might have been associated with this menu
      queryClient.invalidateQueries({ queryKey: ['/api/menu-categories'] });
      
      // And invalidate all menu items to be safe
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      
      setDeleteDialogOpen(false);
      setMenuToDelete(null);
      toast({
        title: "Menu Deleted",
        description: "Your menu has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Error deleting menu:", error);
      toast({
        title: "Error Deleting Menu",
        description: "There was an error deleting your menu. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handlers
  const handleCreateMenu = () => {
    if (!newMenuName.trim()) {
      toast({
        title: "Invalid Input",
        description: "Menu name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!restaurant?.id) {
      toast({
        title: "Restaurant Required",
        description: "Please select a restaurant first.",
        variant: "destructive",
      });
      return;
    }

    createMenuMutation.mutate({
      name: newMenuName.trim(),
      restaurantId: restaurant.id
    });
  };

  const handleUpdateMenu = () => {
    if (!newMenuName.trim() || !menuToEdit) {
      toast({
        title: "Invalid Input",
        description: "Menu name is required.",
        variant: "destructive",
      });
      return;
    }

    updateMenuMutation.mutate({
      id: menuToEdit.id,
      data: {
        name: newMenuName.trim()
      }
    });
  };

  const confirmDelete = () => {
    if (menuToDelete) {
      deleteMenuMutation.mutate(menuToDelete.id);
    }
  };

  const handleEditClick = (e: React.MouseEvent, menu: Menu) => {
    e.stopPropagation();
    setMenuToEdit(menu);
    setNewMenuName(menu.name);
    setEditMode(true);
    setCreateMode(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, menu: Menu) => {
    e.stopPropagation();
    setMenuToDelete(menu);
    setDeleteDialogOpen(true);
  };

  const handleMenuClick = (menu: Menu) => {
    setSelectedMenu(menu);
  };

  const handleBackToList = () => {
    setSelectedMenu(null);
  };

  if (!restaurant) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Menus</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p>Please select a restaurant first.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedMenu 
                ? `Menu: ${selectedMenu.name}`
                : createMode || editMode 
                  ? (createMode ? "Create New Menu" : "Edit Menu") 
                  : "Manage Menus"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedMenu ? (
            // Menu detail view
            <div className="py-4">
              <div className="mb-4">
                <Button variant="ghost" onClick={handleBackToList} className="mb-4">← Back to menus</Button>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">{selectedMenu.name}</h3>
                  <Button 
                    size="sm" 
                    onClick={() => setCategoryModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Category
                  </Button>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="mb-2">
                  <h3 className="text-lg font-semibold">Categories</h3>
                </div>
                <CategoryList 
                  menuId={selectedMenu.id} 
                  onEditCategory={(categoryId) => {
                    setEditingCategoryId(categoryId);
                    setCategoryModalOpen(true);
                  }} 
                />
              </div>
            </div>
          ) : createMode || editMode ? (
            // Create/Edit mode
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="menu-name">Menu Name</Label>
                <Input
                  id="menu-name"
                  placeholder="Enter menu name"
                  value={newMenuName}
                  onChange={(e) => setNewMenuName(e.target.value)}
                />
              </div>
            </div>
          ) : (
            // Menu list view
            <div className="py-4">
              <div className="mb-4 flex justify-end">
                <Button 
                  onClick={() => {
                    setCreateMode(true);
                    setEditMode(false);
                    setNewMenuName("");
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create New Menu
                </Button>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {isLoading ? (
                  <div className="text-center py-4">Loading menus...</div>
                ) : menus.length === 0 ? (
                  <div className="text-center py-4">No menus found</div>
                ) : (
                  menus.map((menu: Menu) => (
                    <div 
                      key={menu.id} 
                      className="flex items-center mb-2 p-3 border rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      onClick={() => handleMenuClick(menu)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{menu.name}</div>
                        <div className="text-sm text-slate-500">Created: {formatTime(menu.createdAt)}</div>
                      </div>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="p-1 h-8 w-8 mr-1"
                          onClick={(e) => handleEditClick(e, menu)}
                          title="Rename menu"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                          </svg>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="p-1 h-8 w-8"
                          onClick={(e) => handleDeleteClick(e, menu)}
                          title="Delete menu"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            {selectedMenu ? (
              <Button onClick={() => setSelectedMenu(null)}>Back</Button>
            ) : createMode || editMode ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCreateMode(false);
                    setEditMode(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createMode ? handleCreateMenu : handleUpdateMenu}
                  disabled={createMenuMutation.isPending || updateMenuMutation.isPending}
                >
                  {createMode ? "Create Menu" : "Update Menu"}
                </Button>
              </>
            ) : (
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the menu "{menuToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Category Modal */}
      {selectedMenu && (
        <CategoryModal
          open={categoryModalOpen}
          onOpenChange={(open) => {
            setCategoryModalOpen(open);
            if (!open) {
              // Reset the editing category ID when closing the modal
              setEditingCategoryId(null);
            }
          }}
          menuId={selectedMenu.id}
          categoryId={editingCategoryId || undefined}
        />
      )}
    </>
  );
}

function CategoryList({ 
  menuId, 
  onEditCategory 
}: { 
  menuId: number,
  onEditCategory: (categoryId: number) => void 
}) {
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [menuItemModalOpen, setMenuItemModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [deletingItemName, setDeletingItemName] = useState("");
  const [deletingCategoryName, setDeletingCategoryName] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Debug state for console logging  
  const [lastDeletedItem, setLastDeletedItem] = useState<string | null>(null);

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['/api/menu-categories', menuId],
    queryFn: () => apiRequest(`/api/menu-categories?menuId=${menuId}`),
  });

  // Auto-expand all categories when they load
  useEffect(() => {
    if (categories.length > 0) {
      const expanded: Record<number, boolean> = {};
      categories.forEach((category: any) => {
        expanded[category.id] = true;
      });
      setExpandedCategories(expanded);
    }
  }, [categories]);

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => {
      console.log(`Sending delete request for category with id: ${id}`);
      return apiRequest(`/api/menu-categories/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: (data) => {
      console.log(`Delete category success!`, data);
      
      // Store category ID before clearing it
      const catId = deletingCategoryId;
      
      // Close the dialog and clear state
      setDeleteCategoryDialogOpen(false);
      setDeletingCategoryId(null);
      
      // Make sure we invalidate both the categories list and any items that might have been in this category
      if (menuId) {
        console.log(`Invalidating cache for menu ${menuId}`);
        queryClient.invalidateQueries({ queryKey: ['/api/menu-categories', menuId] });
      }
      
      // Also invalidate the menu items cache as they may have changed
      if (catId) {
        console.log(`Invalidating cache for items in category ${catId}`);
        queryClient.invalidateQueries({ queryKey: ['/api/menu-items', catId] });
        // Also refresh all menu items to be safe
        queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      }
      
      // Completely refresh the menus list too
      queryClient.invalidateQueries({ queryKey: ['/api/menus'] });
      
      toast({
        title: "Category Deleted",
        description: "Category and all its items have been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Error deleting category:", error);
      // Show clear error message with details
      toast({
        title: "Error Deleting Category",
        description: "There was an error deleting the category. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete menu item mutation
  const deleteMenuItemMutation = useMutation({
    mutationFn: (id: number) => {
      console.log(`Sending delete request for menu item with id: ${id}`);
      return apiRequest(`/api/menu-items/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: (data) => {
      console.log(`Delete menu item success!`, data);
      
      // Store these values before clearing them
      const catId = data?.categoryId || selectedCategoryId;
      const itemId = data?.itemId || deletingItemId;
      const itemName = deletingItemName;
      
      // Ensure we invalidate the correct cache entries
      if (catId) {
        console.log(`Invalidating cache for category ${catId}`);
        queryClient.invalidateQueries({ queryKey: ['/api/menu-items', catId] });
      }
      
      // Also invalidate the general menu items cache
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items'] });
      
      // Then update UI state
      setDeleteItemDialogOpen(false);
      setDeletingItemId(null);
      setLastDeletedItem(`Item ${itemId} (${itemName})`);
      
      toast({
        title: "Menu Item Deleted",
        description: "Menu item has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Error deleting menu item:", error);
      toast({
        title: "Error Deleting Menu Item",
        description: "There was an error deleting the menu item. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDeleteCategoryClick = (id: number, name: string) => {
    setDeletingCategoryId(id);
    setDeletingCategoryName(name);
    setDeleteCategoryDialogOpen(true);
  };

  const confirmDeleteCategory = () => {
    if (deletingCategoryId) {
      console.log(`Confirming deletion of category ID: ${deletingCategoryId}`);
      deleteCategoryMutation.mutate(deletingCategoryId);
      // Dialog will be closed in onSuccess
    }
  };

  const handleAddItem = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setEditingItemId(null);
    setMenuItemModalOpen(true);
    
    // Auto-expand the category when adding a new item
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: true
    }));
  };

  const handleEditItem = (categoryId: number, itemId: number) => {
    setSelectedCategoryId(categoryId);
    setEditingItemId(itemId);
    setMenuItemModalOpen(true);
  };

  const handleDeleteItemClick = (categoryId: number, itemId: number, itemName: string) => {
    console.log(`Preparing to delete item: ID=${itemId}, Name=${itemName}, CategoryID=${categoryId}`);
    setSelectedCategoryId(categoryId);
    setDeletingItemId(itemId);
    setDeletingItemName(itemName);
    setDeleteItemDialogOpen(true);
  };

  const confirmDeleteItem = () => {
    if (deletingItemId) {
      console.log(`Confirming deletion of item ID: ${deletingItemId}`);
      deleteMenuItemMutation.mutate(deletingItemId);
      // The setDeleteItemDialogOpen(false) is now in onSuccess to prevent UI from updating before the API call completes
    }
  };

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  if (loadingCategories) {
    return <div className="py-2">Loading categories...</div>;
  }

  if (categories.length === 0) {
    return <div className="py-2">No categories found. Add your first category!</div>;
  }

  return (
    <>
      <div className="space-y-4">
        {categories.map((category: any) => (
          <div key={category.id} className="border rounded">
            <div 
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 cursor-pointer"
              onClick={() => toggleCategory(category.id)}
            >
              <div className="flex items-center">
                <ChevronRight 
                  className={`h-4 w-4 mr-2 transition-transform ${expandedCategories[category.id] ? 'transform rotate-90' : ''}`} 
                />
                <h4 className="font-medium">{category.name}</h4>
              </div>
              <div className="flex space-x-1" onClick={e => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="p-1 h-8 w-8 mr-1"
                  onClick={() => handleAddItem(category.id)}
                  title="Add Item"
                >
                  <PlusCircle className="h-4 w-4 text-green-500" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="p-1 h-8 w-8 mr-1"
                  onClick={() => onEditCategory(category.id)}
                  title="Edit Category"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="p-1 h-8 w-8"
                  onClick={() => handleDeleteCategoryClick(category.id, category.name)}
                  title="Delete Category"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
            {expandedCategories[category.id] && (
              <CategoryItems 
                categoryId={category.id} 
                onEditItem={(itemId) => handleEditItem(category.id, itemId)}
                onDeleteItem={(itemId, itemName) => handleDeleteItemClick(category.id, itemId, itemName)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Menu Item Modal */}
      {selectedCategoryId && (
        <MenuItemModal
          open={menuItemModalOpen}
          onOpenChange={setMenuItemModalOpen}
          categoryId={selectedCategoryId}
          itemId={editingItemId || undefined}
        />
      )}

      {/* Delete Menu Item Confirmation Dialog */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the menu item "{deletingItemName}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={deleteCategoryDialogOpen} onOpenChange={setDeleteCategoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category "{deletingCategoryName}" and all items within it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CategoryItems({ 
  categoryId, 
  onEditItem, 
  onDeleteItem 
}: { 
  categoryId: number,
  onEditItem: (itemId: number) => void,
  onDeleteItem: (itemId: number, itemName: string) => void
}) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['/api/menu-items', categoryId],
    queryFn: () => apiRequest(`/api/menu-items?categoryId=${categoryId}`),
  });

  if (isLoading) {
    return <div className="p-3">Loading items...</div>;
  }

  if (items.length === 0) {
    return <div className="p-3 text-center text-slate-500">No items in this category yet.</div>;
  }

  return (
    <div className="divide-y">
      {items.map((item: any) => (
        <div key={item.id} className="flex items-center justify-between p-3">
          <div>
            <div className="font-medium">{item.name}</div>
            {item.description && (
              <div className="text-sm text-slate-500">{item.description}</div>
            )}
            <div className="text-sm font-medium text-primary">{formatPrice(item.price)}</div>
          </div>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="sm"
              className="p-1 h-8 w-8 mr-1"
              onClick={() => onEditItem(item.id)}
              title="Edit Item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="p-1 h-8 w-8"
              onClick={() => onDeleteItem(item.id, item.name)}
              title="Delete Item"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}