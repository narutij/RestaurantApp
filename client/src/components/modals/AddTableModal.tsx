import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Table } from '@shared/schema';

type AddTableModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { number: string; label: string }) => void;
  editingTable: Table | null;
  isSubmitting: boolean;
};

export function AddTableModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  editingTable, 
  isSubmitting 
}: AddTableModalProps) {
  const [number, setNumber] = useState('');
  const [label, setLabel] = useState('');
  const [errors, setErrors] = useState({ number: '', label: '' });

  // Reset form when opening or when editingTable changes
  useEffect(() => {
    if (open) {
      if (editingTable) {
        setNumber(editingTable.number);
        setLabel(editingTable.label);
      } else {
        setNumber('');
        setLabel('');
      }
      setErrors({ number: '', label: '' });
    }
  }, [open, editingTable]);

  // Handle form submission
  const handleSubmit = () => {
    // Validate inputs
    const newErrors = { number: '', label: '' };
    let isValid = true;

    if (!number.trim()) {
      newErrors.number = 'Table number is required';
      isValid = false;
    }

    if (!label.trim()) {
      newErrors.label = 'Table label is required';
      isValid = false;
    }

    if (!isValid) {
      setErrors(newErrors);
      return;
    }

    // Submit data
    onSubmit({
      number: number.trim(),
      label: label.trim()
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingTable ? 'Edit Table' : 'Add Table'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="number">Table Number</Label>
            <Input
              id="number"
              placeholder="e.g. 5"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
            {errors.number && <p className="text-sm text-destructive">{errors.number}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Table Label</Label>
            <Input
              id="label"
              placeholder="e.g. Patio"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            {errors.label && <p className="text-sm text-destructive">{errors.label}</p>}
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
            {isSubmitting ? 'Saving...' : (editingTable ? 'Save Changes' : 'Add Table')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
