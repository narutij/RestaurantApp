import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Restaurant } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

type RestaurantModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRestaurantId: number | null;
  onSelectRestaurant: (restaurant: Restaurant) => void;
};

export function RestaurantModal({
  open,
  onOpenChange,
  selectedRestaurantId,
  onSelectRestaurant,
}: RestaurantModalProps) {
  const [createMode, setCreateMode] = useState(false);
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [newRestaurantAddress, setNewRestaurantAddress] = useState("");
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch restaurants
  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["/api/restaurants"],
    queryFn: () => apiRequest("/api/restaurants")
  });

  // Create restaurant mutation
  const createRestaurantMutation = useMutation({
    mutationFn: (data: { name: string; address: string }) => 
      apiRequest("/api/restaurants", { method: "POST", body: data }),
    onSuccess: (data) => {
      // Reset the form
      setNewRestaurantName("");
      setNewRestaurantAddress("");
      
      // Exit create mode
      setCreateMode(false);
      
      // Invalidate the restaurants query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      
      // Select the newly created restaurant
      onSelectRestaurant(data);
      
      // Show success toast
      toast({
        title: "Restaurant Created",
        description: `${data.name} has been added successfully.`,
      });
    },
    onError: (error) => {
      console.error("Error creating restaurant:", error);
      toast({
        title: "Failed to Create Restaurant",
        description: "There was a problem creating the restaurant. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Delete restaurant mutation
  const deleteRestaurantMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/restaurants/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      // Close delete dialog
      setDeleteDialogOpen(false);
      setRestaurantToDelete(null);
      
      // Invalidate the restaurants query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      
      // Show success toast
      toast({
        title: "Restaurant Deleted",
        description: `The restaurant has been deleted successfully.`,
      });
    },
    onError: (error) => {
      console.error("Error deleting restaurant:", error);
      toast({
        title: "Failed to Delete Restaurant",
        description: "There was a problem deleting the restaurant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateRestaurant = () => {
    if (!newRestaurantName.trim() || !newRestaurantAddress.trim()) {
      toast({
        title: "Invalid Input",
        description: "Restaurant name and address are required.",
        variant: "destructive",
      });
      return;
    }

    createRestaurantMutation.mutate({
      name: newRestaurantName.trim(),
      address: newRestaurantAddress.trim(),
    });
  };

  const handleCancel = () => {
    setCreateMode(false);
    setNewRestaurantName("");
    setNewRestaurantAddress("");
  };

  const handleRestaurantClick = (restaurant: Restaurant) => {
    onSelectRestaurant(restaurant);
  };
  
  const handleDeleteClick = (e: React.MouseEvent, restaurant: Restaurant) => {
    e.stopPropagation(); // Prevent restaurant selection
    setRestaurantToDelete(restaurant);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (restaurantToDelete) {
      deleteRestaurantMutation.mutate(restaurantToDelete.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{createMode ? "Create New Restaurant" : "Select Restaurant"}</DialogTitle>
          <DialogDescription>
            {createMode 
              ? "Enter the details for the new restaurant." 
              : "Choose a restaurant or create a new one."}
          </DialogDescription>
        </DialogHeader>

        {createMode ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="restaurant-name">Restaurant Name</Label>
              <Input
                id="restaurant-name"
                placeholder="Enter restaurant name"
                value={newRestaurantName}
                onChange={(e) => setNewRestaurantName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restaurant-address">Restaurant Address</Label>
              <Input
                id="restaurant-address"
                placeholder="Enter restaurant address"
                value={newRestaurantAddress}
                onChange={(e) => setNewRestaurantAddress(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="py-4">
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {isLoading ? (
                <div className="text-center py-4">Loading restaurants...</div>
              ) : restaurants.length === 0 ? (
                <div className="text-center py-4">No restaurants found</div>
              ) : (
                restaurants.map((restaurant: Restaurant) => (
                  <div key={restaurant.id} className="flex items-center mb-2">
                    <Button
                      variant={selectedRestaurantId === restaurant.id ? "default" : "outline"}
                      className="w-full justify-start text-left h-auto py-3 pr-12 relative"
                      onClick={() => handleRestaurantClick(restaurant)}
                    >
                      <div>
                        <div className="font-medium">{restaurant.name}</div>
                        <div className="text-sm text-muted-foreground">{restaurant.address}</div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="absolute right-1 p-1 h-8 w-8"
                        onClick={(e) => handleDeleteClick(e, restaurant)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </Button>
                  </div>
                ))
              )}
            </div>
            
            <Separator className="my-4" />
            
            <Button 
              variant="outline" 
              className="w-full justify-start text-left h-auto py-3"
              onClick={() => setCreateMode(true)}
            >
              <div className="font-medium">+ Create New Restaurant</div>
            </Button>
          </div>
        )}

        <DialogFooter>
          {createMode ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateRestaurant}
                disabled={createRestaurantMutation.isPending}
              >
                {createRestaurantMutation.isPending ? "Creating..." : "Save Restaurant"}
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
            This action cannot be undone. This will permanently delete the restaurant 
            "{restaurantToDelete?.name}" and all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setRestaurantToDelete(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={confirmDelete} 
            className="bg-red-500 hover:bg-red-600"
            disabled={deleteRestaurantMutation.isPending}
          >
            {deleteRestaurantMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}