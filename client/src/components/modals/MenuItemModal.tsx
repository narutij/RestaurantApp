import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { formatPrice } from '@/lib/utils';

type MenuItemModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: number;
  itemId?: number;
};

export function MenuItemModal({
  open,
  onOpenChange,
  categoryId,
  itemId,
}: MenuItemModalProps) {
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!itemId;

  // Reset state when the modal is opened/closed
  useEffect(() => {
    if (!open) {
      setItemName("");
      setItemPrice("");
      setItemDescription("");
    }
  }, [open]);

  // Fetch item data if in edit mode
  useEffect(() => {
    if (open && isEditMode && itemId) {
      const fetchItem = async () => {
        try {
          const item = await apiRequest(`/api/menu-items/${itemId}`);
          setItemName(item.name || "");
          setItemPrice(item.price ? item.price.toString() : "");
          setItemDescription(item.description || "");
        } catch (error) {
          console.error("Error fetching menu item:", error);
          toast({
            title: "Error",
            description: "Failed to load menu item data.",
            variant: "destructive",
          });
        }
      };

      fetchItem();
    }
  }, [open, itemId, isEditMode, toast]);

  // Mutations
  const createItemMutation = useMutation({
    mutationFn: (data: { name: string; price: number; categoryId: number; description?: string }) => 
      apiRequest('/api/menu-items', {
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items', categoryId] });
      onOpenChange(false);
      toast({
        title: "Menu Item Created",
        description: "Your menu item has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Creating Menu Item",
        description: "There was an error creating your menu item. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: { name: string; price: number; description?: string } }) => 
      apiRequest(`/api/menu-items/${id}`, {
        method: 'PUT',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items', categoryId] });
      onOpenChange(false);
      toast({
        title: "Menu Item Updated",
        description: "Your menu item has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Updating Menu Item",
        description: "There was an error updating your menu item. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handlers
  const handleSubmit = () => {
    if (!itemName.trim()) {
      toast({
        title: "Invalid Input",
        description: "Item name is required.",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(itemPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid price.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name: itemName.trim(),
      price,
      categoryId,
      ...(itemDescription.trim() ? { description: itemDescription.trim() } : {})
    };

    if (isEditMode && itemId) {
      updateItemMutation.mutate({
        id: itemId,
        data
      });
    } else {
      createItemMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Menu Item" : "Add Menu Item"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">Item Name</Label>
            <Input
              id="item-name"
              placeholder="Enter item name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="item-price">Price</Label>
            <Input
              id="item-price"
              placeholder="Enter price"
              type="number"
              min="0"
              step="0.01"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="item-description">Description (Optional)</Label>
            <Input
              id="item-description"
              placeholder="Enter description"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createItemMutation.isPending || updateItemMutation.isPending}
          >
            {isEditMode ? "Update Item" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}