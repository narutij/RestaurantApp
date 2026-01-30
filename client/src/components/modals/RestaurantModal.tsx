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
import { Trash2, Upload, Image as ImageIcon } from "lucide-react";

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
  const [editMode, setEditMode] = useState(false);
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [newRestaurantAddress, setNewRestaurantAddress] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [restaurantToEdit, setRestaurantToEdit] = useState<Restaurant | null>(null);
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
    mutationFn: async (data: { name: string; address: string }) => {
      // First create the restaurant
      const restaurant = await apiRequest("/api/restaurants", { method: "POST", body: data });
      
      // Then upload the image if one was selected
      if (selectedImage && restaurant.id) {
        const formData = new FormData();
        formData.append('image', selectedImage);
        
        await fetch(`/api/restaurants/${restaurant.id}/upload-image`, {
          method: 'POST',
          body: formData,
        });
        
        // Refresh the restaurant data to get the updated imageUrl
        const updatedRestaurant = await apiRequest(`/api/restaurants/${restaurant.id}`);
        return updatedRestaurant;
      }
      
      return restaurant;
    },
    onSuccess: async (data) => {
      // Reset the form
      setNewRestaurantName("");
      setNewRestaurantAddress("");
      setSelectedImage(null);
      setImagePreview("");
      
      // Exit create mode
      setCreateMode(false);
      
      // Invalidate the restaurants query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      
      // Force refresh the restaurants list to ensure we have the latest data
      await queryClient.refetchQueries({ queryKey: ["/api/restaurants"] });
      
      // Select the newly created restaurant with the updated data including imageUrl
      console.log('RestaurantModal: Selecting created restaurant with imageUrl:', data.imageUrl);
      onSelectRestaurant(data);

      // Trigger custom event to ensure header updates
      window.dispatchEvent(new Event('restaurantSelected'));
      
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
  
  // Update restaurant mutation
  const updateRestaurantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: { name: string; address: string } }) => {
      // First update the restaurant
      const restaurant = await apiRequest(`/api/restaurants/${id}`, { method: "PUT", body: data });
      
      // Then upload the new image if one was selected
      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);
        
        await fetch(`/api/restaurants/${id}/upload-image`, {
          method: 'POST',
          body: formData,
        });
        
        // Refresh the restaurant data to get the updated imageUrl
        const updatedRestaurant = await apiRequest(`/api/restaurants/${id}`);
        return updatedRestaurant;
      }
      
      return restaurant;
    },
    onSuccess: async (data) => {
      // Reset edit mode and form
      setEditMode(false);
      setRestaurantToEdit(null);
      setNewRestaurantName("");
      setNewRestaurantAddress("");
      setSelectedImage(null);
      setImagePreview("");
      
      // Invalidate the restaurants query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      
      // Force refresh the restaurants list to ensure we have the latest data
      await queryClient.refetchQueries({ queryKey: ["/api/restaurants"] });
      
      // If this is the currently selected restaurant, update it
      if (selectedRestaurantId === data.id) {
        console.log('RestaurantModal: Updating selected restaurant with imageUrl:', data.imageUrl);
        onSelectRestaurant(data);
        // Trigger custom event to ensure header updates
        window.dispatchEvent(new Event('restaurantSelected'));
      }
      
      // Show success toast
      toast({
        title: "Restaurant Updated",
        description: `${data.name} has been updated successfully.`,
      });
    },
    onError: (error) => {
      console.error("Error updating restaurant:", error);
      toast({
        title: "Failed to Update Restaurant",
        description: "There was a problem updating the restaurant. Please try again.",
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
    setEditMode(false);
    setRestaurantToEdit(null);
    setNewRestaurantName("");
    setNewRestaurantAddress("");
    setSelectedImage(null);
    setImagePreview("");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRestaurantClick = (restaurant: Restaurant) => {
    onSelectRestaurant(restaurant);
    onOpenChange(false); // Close the modal after selection
  };
  
  const handleDeleteClick = (e: React.MouseEvent, restaurant: Restaurant) => {
    e.stopPropagation(); // Prevent restaurant selection
    setRestaurantToDelete(restaurant);
    setDeleteDialogOpen(true);
  };
  
  const handleEditClick = (e: React.MouseEvent, restaurant: Restaurant) => {
    e.stopPropagation(); // Prevent restaurant selection
    setRestaurantToEdit(restaurant);
    setNewRestaurantName(restaurant.name);
    setNewRestaurantAddress(restaurant.address);
    setEditMode(true);
    // Set existing image if available
    if (restaurant.imageUrl) {
      setImagePreview(restaurant.imageUrl);
    }
  };
  
  const handleUpdateRestaurant = () => {
    if (!newRestaurantName.trim() || !newRestaurantAddress.trim() || !restaurantToEdit) {
      toast({
        title: "Invalid Input",
        description: "Restaurant name and address are required.",
        variant: "destructive",
      });
      return;
    }

    updateRestaurantMutation.mutate({
      id: restaurantToEdit.id,
      data: {
        name: newRestaurantName.trim(),
        address: newRestaurantAddress.trim(),
      }
    });
  };
  
  const confirmDelete = () => {
    if (restaurantToDelete) {
      deleteRestaurantMutation.mutate(restaurantToDelete.id);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {createMode 
                ? "Create New Restaurant" 
                : editMode 
                  ? "Edit Restaurant" 
                  : "Select Restaurant"}
            </DialogTitle>
            <DialogDescription>
              {createMode 
                ? "Enter the details for the new restaurant." 
                : editMode
                  ? "Update the restaurant information."
                  : "Choose a restaurant or create a new one."}
            </DialogDescription>
          </DialogHeader>

          {createMode || editMode ? (
            <div className="space-y-4 py-4">
              {(createMode || editMode) && (
                <div className="flex justify-center mb-4">
                  <Input
                    id="restaurant-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('restaurant-image')?.click()}
                    className="relative w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors group"
                  >
                    {imagePreview ? (
                      <>
                        <img
                          src={imagePreview}
                          alt="Restaurant"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="h-4 w-4 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </button>
                </div>
              )}
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
                        className="w-full justify-start text-left h-auto py-3 pr-24 relative"
                        onClick={() => handleRestaurantClick(restaurant)}
                      >
                        <div className="flex items-center gap-3">
                          {restaurant.imageUrl ? (
                            <img 
                              src={restaurant.imageUrl} 
                              alt={restaurant.name}
                              className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{restaurant.name}</div>
                            <div className="text-sm text-muted-foreground">{restaurant.address}</div>
                          </div>
                        </div>
                        <div className="absolute right-1 flex">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="p-1 h-8 w-8 mr-1"
                            onClick={(e) => handleEditClick(e, restaurant)}
                            title="Edit restaurant"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
                              <path d="M12 20h9"></path>
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="p-1 h-8 w-8"
                            onClick={(e) => handleDeleteClick(e, restaurant)}
                            title="Delete restaurant"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
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
            ) : editMode ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateRestaurant}
                  disabled={updateRestaurantMutation.isPending}
                >
                  {updateRestaurantMutation.isPending ? "Saving..." : "Update Restaurant"}
                </Button>
              </>
            ) : (
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  );
}