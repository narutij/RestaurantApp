import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Table } from '@shared/schema';

type TableEntryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layoutId: number;
  tableId?: number;
};

export function TableEntryModal({
  open,
  onOpenChange,
  layoutId,
  tableId,
}: TableEntryModalProps) {
  const [tableNumber, setTableNumber] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const [errors, setErrors] = useState({ number: '', label: '' });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!tableId;

  // Reset form when opening or when tableId changes
  useEffect(() => {
    if (open) {
      if (!isEditMode) {
        setTableNumber('');
        setTableLabel('');
      }
      setErrors({ number: '', label: '' });
    }
  }, [open, isEditMode]);

  // Fetch table data if in edit mode
  useEffect(() => {
    if (open && isEditMode && tableId) {
      const fetchTable = async () => {
        try {
          const table = await apiRequest(`/api/tables/${tableId}`);
          setTableNumber(table.number || '');
          setTableLabel(table.label || '');
        } catch (error) {
          console.error('Error fetching table:', error);
          toast({
            title: "Error",
            description: "Failed to load table data.",
            variant: "destructive",
          });
        }
      };

      fetchTable();
    }
  }, [open, tableId, isEditMode, toast]);

  // Create table mutation
  const createTableMutation = useMutation({
    mutationFn: (data: { number: string; label: string; layoutId: number }) => 
      apiRequest('/api/tables', { 
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables', layoutId] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Table was added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add table. Please try again.",
        variant: "destructive",
      });
      console.error("Create table error:", error);
    }
  });

  // Update table mutation
  const updateTableMutation = useMutation({
    mutationFn: (data: { id: number; data: { number: string; label: string } }) => 
      apiRequest(`/api/tables/${data.id}`, { 
        method: 'PUT',
        body: data.data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables', layoutId] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Table was updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update table. Please try again.",
        variant: "destructive",
      });
      console.error("Update table error:", error);
    }
  });

  // Validate inputs
  const validateInputs = (): boolean => {
    const newErrors = { number: '', label: '' };
    let isValid = true;

    if (!tableNumber.trim()) {
      newErrors.number = 'Table number is required';
      isValid = false;
    }

    if (!tableLabel.trim()) {
      newErrors.label = 'Table label is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!validateInputs()) {
      return;
    }

    if (isEditMode && tableId) {
      updateTableMutation.mutate({
        id: tableId,
        data: {
          number: tableNumber.trim(),
          label: tableLabel.trim()
        }
      });
    } else {
      createTableMutation.mutate({
        number: tableNumber.trim(),
        label: tableLabel.trim(),
        layoutId
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Table' : 'Add Table'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="number">Table Number</Label>
            <Input
              id="number"
              placeholder="e.g. 5"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
            />
            {errors.number && <p className="text-sm text-destructive">{errors.number}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Table Label</Label>
            <Input
              id="label"
              placeholder="e.g. Patio"
              value={tableLabel}
              onChange={(e) => setTableLabel(e.target.value)}
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
            disabled={createTableMutation.isPending || updateTableMutation.isPending}
          >
            {createTableMutation.isPending || updateTableMutation.isPending 
              ? 'Saving...' 
              : (isEditMode ? 'Save Changes' : 'Add Table')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}