import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Palette, 
  Store, 
  MenuSquare, 
  Grid2X2, 
  LogOut,
  Camera,
  Edit
} from 'lucide-react';

export default function RestaurantInfoTab() {
  // User state for profile information
  const [user, setUser] = useState({
    name: "John Doe",
    role: "Restaurant Manager",
    avatar: "" // Empty for now, will use fallback
  });
  
  // Profile editing state
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [editedUser, setEditedUser] = useState({ ...user });
  const [previewUrl, setPreviewUrl] = useState(user.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Navigation options
  const options = [
    { icon: <Palette className="mr-2 h-5 w-5" />, label: "App Theme", href: "#theme" },
    { icon: <Store className="mr-2 h-5 w-5" />, label: "Restaurants", href: "#restaurants" },
    { icon: <MenuSquare className="mr-2 h-5 w-5" />, label: "Menus", href: "#menus" },
    { icon: <Grid2X2 className="mr-2 h-5 w-5" />, label: "Table Layouts", href: "#tables" },
  ];

  const handleLogout = () => {
    // In a real app, this would call a logout function
    console.log("Logout clicked");
  };
  
  const handleProfileClick = () => {
    setEditedUser({ ...user });
    setPreviewUrl(user.avatar);
    setIsProfileDialogOpen(true);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create a preview URL for the selected image
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    
    // In a full implementation, we would handle the file upload to a server
    // and update the editedUser.avatar with the file path or URL
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
  
  const saveProfile = async () => {
    try {
      // In a real app, this would send the data to a server API
      // Example:
      // const response = await fetch('/api/user/profile', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(editedUser)
      // });
      
      // For now, we'll just update our local state
      console.log('Saving profile:', editedUser);
      setUser({
        ...editedUser,
        avatar: previewUrl // In a real app, this would be the URL from the server
      });
      
      setIsProfileDialogOpen(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  return (
    <div className="p-4 flex flex-col min-h-[calc(100vh-70px)]">
      {/* User avatar block as a button - horizontal layout */}
      <Button 
        variant="ghost" 
        className="flex items-center justify-start w-full h-auto p-4 mb-8 mt-4 hover:bg-slate-100 rounded-lg"
        onClick={handleProfileClick}
      >
        <div className="relative">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-xl bg-primary text-primary-foreground">
              {user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1">
            <Edit className="h-3 w-3" />
          </div>
        </div>
        <div className="ml-4 text-left">
          <h2 className="text-xl font-semibold">{user.name}</h2>
          <p className="text-muted-foreground text-sm">{user.role}</p>
        </div>
      </Button>
      
      {/* Profile Edit Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Avatar with change option */}
            <div className="flex flex-col items-center justify-center gap-2">
              <Avatar className="h-24 w-24 cursor-pointer" onClick={triggerFileInput}>
                <AvatarImage src={previewUrl} alt={editedUser.name} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {editedUser.name.split(' ').map(n => n[0]).join('')}
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
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveProfile}>
              Save Changes
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