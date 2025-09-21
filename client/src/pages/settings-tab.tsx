import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ThemeSwitch } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { MenuModal } from "@/components/modals/MenuModal";
import { TableLayoutsModal } from "@/components/modals/TableLayoutsModal";
import { Restaurant } from "@shared/schema";
import {
  Palette,
  MenuSquare,
  Grid2X2,
  LogOut,
  Edit,
  Loader2,
  Camera
} from 'lucide-react';

export default function SettingsTab() {
  const { toast } = useToast();
  const { logout, appUser } = useAuth();

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

  // State for menu modal
  const [menuModalOpen, setMenuModalOpen] = useState(false);

  // State for table layout modal
  const [tableLayoutModalOpen, setTableLayoutModalOpen] = useState(false);

  // Selected restaurant for modals (loaded from localStorage)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(() => {
    try {
      const savedRestaurant = localStorage.getItem('selectedRestaurant');
      return savedRestaurant ? JSON.parse(savedRestaurant) : null;
    } catch (e) {
      console.error('Failed to load saved restaurant', e);
      return null;
    }
  });

  // Navigation options for Settings
  const options = [
    { icon: <Palette className="mr-2 h-5 w-5" />, label: "App Theme", href: "#theme" },
    {
      icon: <MenuSquare className="mr-2 h-5 w-5" />,
      label: "Menus",
      href: "#menus",
      action: () => setMenuModalOpen(true)
    },
    {
      icon: <Grid2X2 className="mr-2 h-5 w-5" />,
      label: "Table Layouts",
      href: "#tables",
      action: () => setTableLayoutModalOpen(true)
    },
  ];

  // Use Firebase user data
  const profile = appUser ? {
    id: appUser.id,
    name: appUser.name,
    role: appUser.role === 'admin' ? 'Administrator' : 'User',
    avatarUrl: null // We'll implement avatar later if needed
  } : null;
  const isLoadingProfile = false;

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "Failed to log out",
        variant: "destructive"
      });
    }
  };

  const handleProfileClick = () => {
    // Profile editing disabled for Firebase users for now
    toast({
      title: "Profile Management",
      description: "Profile editing will be available in a future update",
    });
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
          className="flex items-center justify-start w-full h-auto p-4 mb-4 mt-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
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
              <div className="relative">
                <Avatar className="h-24 w-24 cursor-pointer hover:opacity-80 transition-opacity" onClick={triggerFileInput}>
                  <AvatarImage
                    src={previewUrl}
                    alt={editedUser.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {editedUser.name.split(' ').map(n => n[0]).join('') || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer" onClick={triggerFileInput}>
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
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
              onClick={() => {}}
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
          className="w-full justify-between text-base py-6 flex items-center hover:bg-slate-200 dark:hover:bg-slate-700"
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
            className="w-full justify-start text-base py-6 hover:bg-slate-200 dark:hover:bg-slate-700"
            onClick={() => option.action ? option.action() : console.log(`Clicked: ${option.label}`)}
          >
            {option.icon}
            {option.label}
          </Button>
        ))}

        {/* Logout button below options with a small gap */}
        <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-700">
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

      {/* Menu Modal */}
      <MenuModal
        open={menuModalOpen}
        onOpenChange={setMenuModalOpen}
        restaurant={selectedRestaurant}
      />

      {/* Table Layout Modal */}
      <TableLayoutsModal
        open={tableLayoutModalOpen}
        onOpenChange={setTableLayoutModalOpen}
        restaurant={selectedRestaurant}
      />
    </div>
  );
}