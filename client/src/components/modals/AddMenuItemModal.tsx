import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type MenuItem } from '@shared/schema';

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

  // Reset form when opening or when editingItem changes
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

  // Handle form submission
  const handleSubmit = () => {
    // Validate inputs
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

    // Submit data
    onSubmit({
      name: name.trim(),
      price: priceValue
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name</Label>
            <Input
              id="name"
              placeholder="e.g. Margherita Pizza"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="12.99"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (editingItem ? 'Save Changes' : 'Add Item')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
