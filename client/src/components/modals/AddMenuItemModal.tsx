import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type MenuItem } from '@shared/schema';
import { UtensilsCrossed, X, Loader2 } from 'lucide-react';

type AddMenuItemModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; price: number }) => void;
  editingItem: MenuItem | null;
  isSubmitting: boolean;
};

export function AddMenuItemModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  editingItem, 
  isSubmitting 
}: AddMenuItemModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState({ name: '', price: '' });

  useEffect(() => {
    if (open) {
      if (editingItem) {
        setName(editingItem.name);
        setPrice(editingItem.price.toString());
      } else {
        setName('');
        setPrice('');
      }
      setErrors({ name: '', price: '' });
    }
  }, [open, editingItem]);

  const handleSubmit = () => {
    const newErrors = { name: '', price: '' };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = 'Item name is required';
      isValid = false;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      newErrors.price = 'Valid price is required';
      isValid = false;
    }

    if (!isValid) {
      setErrors(newErrors);
      return;
    }

    onSubmit({ name: name.trim(), price: priceValue });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 bg-[#1E2429] border-white/10 overflow-hidden" hideCloseButton>
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
                    {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                  </h2>
                  <p className="text-xs text-muted-foreground">Item details</p>
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Margherita Pizza"
              className="mt-1.5 bg-white/5 border-white/10 focus:border-emerald-500/50"
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">Price (€)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="mt-1.5 bg-white/5 border-white/10 focus:border-emerald-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editingItem ? 'Save Changes' : 'Add Item'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
