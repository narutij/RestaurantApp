import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { FolderOpen, X, Loader2 } from 'lucide-react';

type CategoryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuId: number;
  categoryId?: number;
};

export function CategoryModal({
  open,
  onOpenChange,
  menuId,
  categoryId,
}: CategoryModalProps) {
  const [categoryName, setCategoryName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditMode = !!categoryId;

  useEffect(() => {
    if (!open) {
      setCategoryName("");
    }
  }, [open]);

  useEffect(() => {
    if (open && isEditMode && categoryId) {
      const fetchCategory = async () => {
        try {
          const category = await apiRequest(`/api/menu-categories/${categoryId}`);
          setCategoryName(category.name || "");
        } catch (error) {
          console.error("Error fetching category:", error);
          toast({
            title: "Error",
            description: "Failed to load category data.",
            variant: "destructive",
          });
        }
      };
      fetchCategory();
    }
  }, [open, categoryId, isEditMode, toast]);

  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string, menuId: number, order?: number }) => 
      apiRequest('/api/menu-categories', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-categories', menuId] });
      onOpenChange(false);
      toast({ title: "Category Created", description: "Category has been created successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create category.", variant: "destructive" });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: { name: string, order?: number } }) => 
      apiRequest(`/api/menu-categories/${id}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-categories', menuId] });
      onOpenChange(false);
      toast({ title: "Category Updated", description: "Category has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update category.", variant: "destructive" });
    }
  });

  const handleSubmit = () => {
    if (!categoryName.trim()) {
      toast({ title: "Invalid Input", description: "Category name is required.", variant: "destructive" });
      return;
    }

    if (isEditMode && categoryId) {
      updateCategoryMutation.mutate({ id: categoryId, data: { name: categoryName.trim() } });
    } else {
      createCategoryMutation.mutate({ name: categoryName.trim(), menuId });
    }
  };

  const isPending = createCategoryMutation.isPending || updateCategoryMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 bg-[#1E2429] border-white/10 overflow-hidden" hideCloseButton>
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent" />
          <div className="relative px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 rounded-xl">
                  <FolderOpen className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {isEditMode ? 'Edit Category' : 'Add Category'}
                  </h2>
                  <p className="text-xs text-muted-foreground">Category details</p>
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
            <Label className="text-xs text-muted-foreground">Category Name</Label>
            <Input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g., Main Courses"
              className="mt-1.5 bg-white/5 border-white/10 focus:border-blue-500/50"
            />
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
            disabled={isPending}
            className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-0"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditMode ? 'Update Category' : 'Add Category'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
