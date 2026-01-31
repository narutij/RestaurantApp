import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Restaurant } from "@shared/schema";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Trash2, Upload, Image as ImageIcon, Store, X, Loader2, Pencil, Plus, ArrowLeft, Check } from "lucide-react";

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

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["/api/restaurants"],
    queryFn: () => apiRequest("/api/restaurants")
  });

  const createRestaurantMutation = useMutation({
    mutationFn: async (data: { name: string; address: string }) => {
      const restaurant = await apiRequest("/api/restaurants", { method: "POST", body: data });
      if (selectedImage && restaurant.id) {
        const formData = new FormData();
        formData.append('image', selectedImage);
        await fetch(`/api/restaurants/${restaurant.id}/upload-image`, { method: 'POST', body: formData });
        const updatedRestaurant = await apiRequest(`/api/restaurants/${restaurant.id}`);
        return updatedRestaurant;
      }
      return restaurant;
    },
    onSuccess: async (data) => {
      resetForm();
      setCreateMode(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      await queryClient.refetchQueries({ queryKey: ["/api/restaurants"] });
      onSelectRestaurant(data);
      window.dispatchEvent(new Event('restaurantSelected'));
      toast({ title: "Restaurant Created", description: `${data.name} has been added successfully.` });
    },
    onError: () => {
      toast({ title: "Failed to Create Restaurant", description: "Please try again.", variant: "destructive" });
    },
  });
  
  const updateRestaurantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: { name: string; address: string } }) => {
      const restaurant = await apiRequest(`/api/restaurants/${id}`, { method: "PUT", body: data });
      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);
        await fetch(`/api/restaurants/${id}/upload-image`, { method: 'POST', body: formData });
        const updatedRestaurant = await apiRequest(`/api/restaurants/${id}`);
        return updatedRestaurant;
      }
      return restaurant;
    },
    onSuccess: async (data) => {
      resetForm();
      setEditMode(false);
      setRestaurantToEdit(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      await queryClient.refetchQueries({ queryKey: ["/api/restaurants"] });
      if (selectedRestaurantId === data.id) {
        onSelectRestaurant(data);
        window.dispatchEvent(new Event('restaurantSelected'));
      }
      toast({ title: "Restaurant Updated", description: `${data.name} has been updated successfully.` });
    },
    onError: () => {
      toast({ title: "Failed to Update Restaurant", description: "Please try again.", variant: "destructive" });
    },
  });

  const deleteRestaurantMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/restaurants/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setRestaurantToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      toast({ title: "Restaurant Deleted", description: "The restaurant has been deleted successfully." });
    },
    onError: () => {
      toast({ title: "Failed to Delete Restaurant", description: "Please try again.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setNewRestaurantName("");
    setNewRestaurantAddress("");
    setSelectedImage(null);
    setImagePreview("");
  };

  const handleCancel = () => {
    setCreateMode(false);
    setEditMode(false);
    setRestaurantToEdit(null);
    resetForm();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRestaurantClick = (restaurant: Restaurant) => {
    onSelectRestaurant(restaurant);
    onOpenChange(false);
  };
  
  const handleEditClick = (e: React.MouseEvent, restaurant: Restaurant) => {
    e.stopPropagation();
    setRestaurantToEdit(restaurant);
    setNewRestaurantName(restaurant.name);
    setNewRestaurantAddress(restaurant.address);
    setEditMode(true);
    if (restaurant.imageUrl) setImagePreview(restaurant.imageUrl);
  };

  const handleCreateRestaurant = () => {
    if (!newRestaurantName.trim() || !newRestaurantAddress.trim()) {
      toast({ title: "Invalid Input", description: "Name and address are required.", variant: "destructive" });
      return;
    }
    createRestaurantMutation.mutate({ name: newRestaurantName.trim(), address: newRestaurantAddress.trim() });
  };

  const handleUpdateRestaurant = () => {
    if (!newRestaurantName.trim() || !newRestaurantAddress.trim() || !restaurantToEdit) return;
    updateRestaurantMutation.mutate({
      id: restaurantToEdit.id,
      data: { name: newRestaurantName.trim(), address: newRestaurantAddress.trim() }
    });
  };

  const isPending = createRestaurantMutation.isPending || updateRestaurantMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[450px] p-0 bg-[#1E2429] border-white/10 overflow-hidden max-h-[85vh]" hideCloseButton>
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent" />
            <div className="relative px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(createMode || editMode) ? (
                    <button
                      onClick={handleCancel}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-2"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  ) : (
                    <div className="p-2.5 bg-cyan-500/20 rounded-xl">
                      <Store className="h-5 w-5 text-cyan-400" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold">
                      {createMode ? 'Create Restaurant' : editMode ? 'Edit Restaurant' : 'Select Restaurant'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {createMode || editMode ? 'Restaurant details' : `${restaurants.length} restaurants`}
                    </p>
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

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : createMode || editMode ? (
            /* Create/Edit Form */
            <div className="p-6 pt-2 space-y-4">
              {/* Image Upload */}
              <div className="flex justify-center">
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
                  className="relative w-20 h-20 border-2 border-dashed border-white/20 rounded-full hover:border-white/40 transition-colors group overflow-hidden"
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Restaurant" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </button>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Restaurant Name</Label>
                <Input
                  value={newRestaurantName}
                  onChange={(e) => setNewRestaurantName(e.target.value)}
                  placeholder="e.g., Vilko Puota"
                  className="mt-1.5 bg-white/5 border-white/10 focus:border-cyan-500/50"
                />
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Address</Label>
                <Input
                  value={newRestaurantAddress}
                  onChange={(e) => setNewRestaurantAddress(e.target.value)}
                  placeholder="e.g., 123 Main Street"
                  className="mt-1.5 bg-white/5 border-white/10 focus:border-cyan-500/50"
                />
              </div>

              {/* Footer for Form */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={handleCancel} className="hover:bg-white/10">
                  Cancel
                </Button>
                <Button
                  onClick={createMode ? handleCreateRestaurant : handleUpdateRestaurant}
                  disabled={isPending}
                  className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border-0"
                >
                  {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {createMode ? 'Create' : 'Update'}
                </Button>
              </div>
            </div>
          ) : (
            /* Restaurant List */
            <ScrollArea className="max-h-[calc(85vh-120px)]">
              <div className="p-6 pt-2 space-y-4">
                {/* Create New Button */}
                <Button
                  variant="outline"
                  className="w-full border-dashed border-white/20 hover:border-white/40 hover:bg-white/5"
                  onClick={() => {
                    resetForm();
                    setCreateMode(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Restaurant
                </Button>

                {restaurants.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 bg-white/5 rounded-full flex items-center justify-center">
                      <Store className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No restaurants yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {restaurants.map((restaurant: Restaurant) => (
                      <div
                        key={restaurant.id}
                        className={`p-4 bg-[#181818] rounded-xl border transition-colors cursor-pointer ${
                          selectedRestaurantId === restaurant.id
                            ? 'border-cyan-500/50 bg-cyan-500/5'
                            : 'border-white/5 hover:border-white/20'
                        }`}
                        onClick={() => handleRestaurantClick(restaurant)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {restaurant.imageUrl ? (
                              <img 
                                src={restaurant.imageUrl} 
                                alt={restaurant.name}
                                className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                <Store className="h-5 w-5 text-cyan-400" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{restaurant.name}</p>
                                {selectedRestaurantId === restaurant.id && (
                                  <Check className="h-4 w-4 text-cyan-400" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{restaurant.address}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-white/10"
                              onClick={(e) => handleEditClick(e, restaurant)}
                            >
                              <Pencil className="h-4 w-4 text-amber-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-500/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRestaurantToDelete(restaurant);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#1E2429] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{restaurantToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-white/5 border-white/10 hover:bg-white/10"
              onClick={() => setRestaurantToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restaurantToDelete && deleteRestaurantMutation.mutate(restaurantToDelete.id)}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0"
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
