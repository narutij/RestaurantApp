import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Menu, Restaurant } from '@shared/schema';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menus', restaurant?.id] });
      setDeleteDialogOpen(false);
      setMenuToDelete(null);
      toast({
        title: "Menu Deleted",
        description: "Your menu has been deleted successfully.",
      });
    },
    onError: (error) => {
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
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="categories">
                    <AccordionTrigger>Categories</AccordionTrigger>
                    <AccordionContent>
                      <CategoryList menuId={selectedMenu.id} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
                          size="icon"
                          onClick={(e) => handleEditClick(e, menu)}
                          title="Edit menu"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => handleDeleteClick(e, menu)}
                          title="Delete menu"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          title="View menu details"
                        >
                          <ChevronRight className="h-4 w-4" />
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
          onOpenChange={setCategoryModalOpen}
          menuId={selectedMenu.id}
        />
      )}
    </>
  );
}

function CategoryList({ menuId }: { menuId: number }) {
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [menuItemModalOpen, setMenuItemModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItemName, setDeletingItemName] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['/api/menu-categories', menuId],
    queryFn: () => apiRequest(`/api/menu-categories?menuId=${menuId}`),
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/menu-categories/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-categories', menuId] });
      toast({
        title: "Category Deleted",
        description: "Category has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Deleting Category",
        description: "There was an error deleting the category. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete menu item mutation
  const deleteMenuItemMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/menu-items/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      if (selectedCategoryId) {
        queryClient.invalidateQueries({ queryKey: ['/api/menu-items', selectedCategoryId] });
      }
      setDeleteDialogOpen(false);
      setDeletingItemId(null);
      toast({
        title: "Menu Item Deleted",
        description: "Menu item has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Deleting Menu Item",
        description: "There was an error deleting the menu item. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDeleteCategory = (id: number) => {
    deleteCategoryMutation.mutate(id);
  };

  const handleAddItem = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setEditingItemId(null);
    setMenuItemModalOpen(true);
  };

  const handleEditItem = (categoryId: number, itemId: number) => {
    setSelectedCategoryId(categoryId);
    setEditingItemId(itemId);
    setMenuItemModalOpen(true);
  };

  const handleDeleteItemClick = (categoryId: number, itemId: number, itemName: string) => {
    setSelectedCategoryId(categoryId);
    setDeletingItemId(itemId);
    setDeletingItemName(itemName);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteItem = () => {
    if (deletingItemId) {
      deleteMenuItemMutation.mutate(deletingItemId);
    }
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
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800">
              <h4 className="font-medium">{category.name}</h4>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleAddItem(category.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setEditingCategoryId(category.id)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleDeleteCategory(category.id)}
                >
                  <Trash className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
            <CategoryItems 
              categoryId={category.id} 
              onEditItem={(itemId) => handleEditItem(category.id, itemId)}
              onDeleteItem={(itemId, itemName) => handleDeleteItemClick(category.id, itemId, itemName)}
            />
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
              onClick={() => onEditItem(item.id)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onDeleteItem(item.id, item.name)}
            >
              <Trash className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}