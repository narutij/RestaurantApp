import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Palette, 
  Store, 
  MenuSquare, 
  Grid2X2, 
  LogOut,
  Edit,
  Loader2
} from 'lucide-react';

// Type for user profile
type UserProfile = {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
};

export default function RestaurantInfoTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Profile editing state
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [editedUser, setEditedUser] = useState({
    name: "",
    role: ""
  });

  // Navigation options
  const options = [
    { icon: <Palette className="mr-2 h-5 w-5" />, label: "App Theme", href: "#theme" },
    { icon: <Store className="mr-2 h-5 w-5" />, label: "Restaurants", href: "#restaurants" },
    { icon: <MenuSquare className="mr-2 h-5 w-5" />, label: "Menus", href: "#menus" },
    { icon: <Grid2X2 className="mr-2 h-5 w-5" />, label: "Table Layouts", href: "#tables" },
  ];

  // Fetch user profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['/api/user-profile'],
    queryFn: async () => {
      try {
        const data = await apiRequest('/api/user-profile');
        return data as UserProfile;
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Return default profile if none exists yet
        return {
          id: 1,
          name: "John Doe",
          role: "Restaurant Manager",
          avatarUrl: null
        } as UserProfile;
      }
    },
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const handleLogout = () => {
    // In a real app, this would call a logout function
    console.log("Logout clicked");
  };
  
  const handleProfileClick = () => {
    if (profile) {
      setEditedUser({
        name: profile.name,
        role: profile.role
      });
      setIsProfileDialogOpen(true);
    }
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedUser({ ...editedUser, name: e.target.value });
  };
  
  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedUser({ ...editedUser, role: e.target.value });
  };

  // Function to update the profile with simplified data
  const saveProfile = async () => {
    try {
      setIsUpdatingProfile(true);
      
      // Use apiRequest with the simplified data structure
      const updatedProfile = await apiRequest('/api/user-profile', {
        method: 'POST',
        body: {
          name: editedUser.name,
          role: editedUser.role,
          avatarUrl: null // Set avatarUrl to null for simplicity
        }
      });
      
      // Force refetch to ensure the UI gets the latest data
      await queryClient.refetchQueries({ 
        queryKey: ['/api/user-profile'],
        exact: true
      });
      
      // Update the state without waiting for a server refresh
      if (profile) {
        queryClient.setQueryData(['/api/user-profile'], {
          ...profile,
          name: editedUser.name,
          role: editedUser.role
        });
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated"
      });
      
      setIsProfileDialogOpen(false);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Update failed",
        description: "There was a problem updating your profile",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div className="p-4 flex flex-col min-h-[calc(100vh-70px)]">
      {/* User avatar block as a button - horizontal layout */}
      {isLoadingProfile ? (
        <div className="flex items-center justify-center my-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Button 
          variant="ghost" 
          className="flex items-center justify-start w-full h-auto p-4 mb-8 mt-4 hover:bg-slate-100 rounded-lg"
          onClick={handleProfileClick}
          disabled={isLoadingProfile}
        >
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                {profile?.name.split(' ').map(n => n[0]).join('') || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1">
              <Edit className="h-3 w-3" />
            </div>
          </div>
          <div className="ml-4 text-left">
            <h2 className="text-xl font-semibold">{profile?.name}</h2>
            <p className="text-muted-foreground text-sm">{profile?.role}</p>
          </div>
        </Button>
      )}
      
      {/* Profile Edit Dialog - Simplified Version */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information below
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={editedUser.name} 
                onChange={handleNameChange} 
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Input 
                id="role" 
                value={editedUser.role} 
                onChange={handleRoleChange} 
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsProfileDialogOpen(false)}
              disabled={isUpdatingProfile}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={saveProfile}
              disabled={isUpdatingProfile}
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Option buttons - reduced spacing */}
      <div className="space-y-1">
        {options.map((option, index) => (
          <Button 
            key={index} 
            variant="ghost" 
            className="w-full justify-start text-base py-6"
            onClick={() => console.log(`Clicked: ${option.label}`)}
          >
            {option.icon}
            {option.label}
          </Button>
        ))}
        
        {/* Logout button below options with a small gap */}
        <div className="pt-4 mt-2 border-t border-gray-100">
          <Button 
            variant="destructive" 
            className="w-full py-6 text-base"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-5 w-5" />
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}