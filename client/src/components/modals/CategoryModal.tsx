import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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

  // Reset state when the modal is opened/closed
  useEffect(() => {
    if (!open) {
      setCategoryName("");
    }
  }, [open]);

  // Fetch category data if in edit mode
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

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string, menuId: number, order?: number }) => 
      apiRequest('/api/menu-categories', {
        method: 'POST',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-categories', menuId] });
      onOpenChange(false);
      toast({
        title: "Category Created",
        description: "Your category has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Creating Category",
        description: "There was an error creating your category. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: { name: string, order?: number } }) => 
      apiRequest(`/api/menu-categories/${id}`, {
        method: 'PUT',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/menu-categories', menuId] });
      onOpenChange(false);
      toast({
        title: "Category Updated",
        description: "Your category has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Updating Category",
        description: "There was an error updating your category. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handlers
  const handleSubmit = () => {
    if (!categoryName.trim()) {
      toast({
        title: "Invalid Input",
        description: "Category name is required.",
        variant: "destructive",
      });
      return;
    }

    if (isEditMode && categoryId) {
      updateCategoryMutation.mutate({
        id: categoryId,
        data: {
          name: categoryName.trim()
        }
      });
    } else {
      createCategoryMutation.mutate({
        name: categoryName.trim(),
        menuId
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Category" : "Add Category"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              placeholder="Enter category name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
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
            disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
          >
            {isEditMode ? "Update Category" : "Add Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}