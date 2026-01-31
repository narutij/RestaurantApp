import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Table } from '@shared/schema';
import { Table2, X, Loader2 } from 'lucide-react';

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

  const handleSubmit = () => {
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

    onSubmit({ number: number.trim(), label: label.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 bg-[#1E2429] border-white/10 overflow-hidden" hideCloseButton>
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent" />
          <div className="relative px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 rounded-xl">
                  <Table2 className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {editingTable ? 'Edit Table' : 'Add Table'}
                  </h2>
                  <p className="text-xs text-muted-foreground">Table details</p>
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
            <Label className="text-xs text-muted-foreground">Table Number</Label>
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g., 5"
              className="mt-1.5 bg-white/5 border-white/10 focus:border-amber-500/50"
            />
            {errors.number && <p className="text-xs text-red-400 mt-1">{errors.number}</p>}
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Near window"
              className="mt-1.5 bg-white/5 border-white/10 focus:border-amber-500/50"
            />
            {errors.label && <p className="text-xs text-red-400 mt-1">{errors.label}</p>}
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
            className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-0"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editingTable ? 'Save Changes' : 'Add Table'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
