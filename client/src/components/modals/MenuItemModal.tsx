import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { UtensilsCrossed, X, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    if (!open) {
      setItemName("");
      setItemPrice("");
      setItemDescription("");
    }
  }, [open]);

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

  const createItemMutation = useMutation({
    mutationFn: (data: { name: string; price: number; categoryId: number; description?: string }) => 
      apiRequest('/api/menu-items', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items', categoryId] });
      onOpenChange(false);
      toast({ title: "Item Created", description: "Menu item has been created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create menu item.", variant: "destructive" });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: { name: string; price: number; description?: string } }) => 
      apiRequest(`/api/menu-items/${id}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-items', categoryId] });
      onOpenChange(false);
      toast({ title: "Item Updated", description: "Menu item has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update menu item.", variant: "destructive" });
    }
  });

  const handleSubmit = () => {
    if (!itemName.trim()) {
      toast({ title: "Invalid Input", description: "Item name is required.", variant: "destructive" });
      return;
    }

    const price = parseFloat(itemPrice);
    if (isNaN(price) || price <= 0) {
      toast({ title: "Invalid Input", description: "Please enter a valid price.", variant: "destructive" });
      return;
    }

    const data = {
      name: itemName.trim(),
      price,
      categoryId,
      ...(itemDescription.trim() ? { description: itemDescription.trim() } : {})
    };

    if (isEditMode && itemId) {
      updateItemMutation.mutate({ id: itemId, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const isPending = createItemMutation.isPending || updateItemMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 glass-panel border-white/50 dark:border-white/10 overflow-hidden" hideCloseButton>
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-transparent" />
          <div className="relative px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                  <UtensilsCrossed className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {isEditMode ? 'Edit Item' : 'Add Item'}
                  </h2>
                  <p className="text-xs text-muted-foreground">Menu item details</p>
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

        {/* Form */}
        <div className="p-6 pt-2 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Item Name</Label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g., Margherita Pizza"
              className="mt-1.5 bg-white/30 dark:bg-white/5 border-white/40 dark:border-white/10 focus:border-emerald-500/50"
            />
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">Price (€)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
              placeholder="0.00"
              className="mt-1.5 bg-white/30 dark:bg-white/5 border-white/40 dark:border-white/10 focus:border-emerald-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">Description (Optional)</Label>
            <Textarea
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="Brief description of the item..."
              className="mt-1.5 bg-white/30 dark:bg-white/5 border-white/40 dark:border-white/10 focus:border-emerald-500/50 resize-none h-20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/30 dark:border-white/5 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditMode ? 'Update Item' : 'Add Item'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
