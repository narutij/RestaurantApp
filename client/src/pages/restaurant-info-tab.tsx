import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ThemeSwitch } from "@/components/ThemeToggle";
import { 
  Palette, 
  Store, 
  MenuSquare, 
  Grid2X2, 
  LogOut,
  Edit,
  Loader2,
  Camera
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
    role: "",
    avatar: ""
  });
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        role: profile.role,
        avatar: profile.avatarUrl || ""
      });
      setPreviewUrl(profile.avatarUrl || "");
      setIsProfileDialogOpen(true);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Save the file for later upload
    setSelectedFile(file);
    
    // Create a preview URL for the selected image
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedUser({ ...editedUser, name: e.target.value });
  };
  
  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedUser({ ...editedUser, role: e.target.value });
  };

  // Function to update the profile with the profile picture
  const saveProfile = async () => {
    try {
      setIsUpdatingProfile(true);
      
      const avatarUrl = selectedFile ? previewUrl : (profile?.avatarUrl || null);
      
      // Use apiRequest with profile picture
      const updatedProfile = await apiRequest('/api/user-profile', {
        method: 'POST',
        body: {
          name: editedUser.name,
          role: editedUser.role,
          avatarUrl: avatarUrl
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
          role: editedUser.role,
          avatarUrl: avatarUrl
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
          className="flex items-center justify-start w-full h-auto p-4 mb-4 mt-2 hover:bg-slate-100 rounded-lg"
          onClick={handleProfileClick}
          disabled={isLoadingProfile}
        >
          <div className="relative">
            <Avatar className="h-14 w-14">
              <AvatarImage 
                src={profile?.avatarUrl || ""} 
                alt={profile?.name || "User"} 
                className="object-cover"
              />
              <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                {profile?.name.split(' ').map(n => n[0]).join('') || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1">
              <Edit className="h-2.5 w-2.5" />
            </div>
          </div>
          <div className="ml-4 text-left">
            <h2 className="text-xl font-semibold">{profile?.name}</h2>
            <p className="text-muted-foreground text-sm">{profile?.role}</p>
          </div>
        </Button>
      )}
      
      {/* Profile Edit Dialog with Avatar */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information below
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Avatar with change option */}
            <div className="flex flex-col items-center justify-center gap-2">
              <Avatar className="h-24 w-24 cursor-pointer" onClick={triggerFileInput}>
                <AvatarImage 
                  src={previewUrl} 
                  alt={editedUser.name} 
                  className="object-cover"
                />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {editedUser.name.split(' ').map(n => n[0]).join('') || "U"}
                </AvatarFallback>
              </Avatar>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
              />
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={triggerFileInput}
              >
                <Camera className="mr-2 h-4 w-4" />
                Change Picture
              </Button>
            </div>
            
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
        {/* App Theme with toggle */}
        <Button 
          variant="ghost" 
          className="w-full justify-between text-base py-6 flex items-center"
          onClick={() => console.log(`Clicked: ${options[0].label}`)}
        >
          <div className="flex items-center">
            {options[0].icon}
            {options[0].label}
          </div>
          <ThemeSwitch />
        </Button>
        
        {/* Other options */}
        {options.slice(1).map((option, index) => (
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