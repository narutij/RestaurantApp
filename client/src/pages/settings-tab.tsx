import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ThemeSwitch } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkday } from "@/contexts/WorkdayContext";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { MenuModal } from "@/components/modals/MenuModal";
import { TableLayoutsModal } from "@/components/modals/TableLayoutsModal";
import {
  Palette,
  Languages,
  MenuSquare,
  Grid2X2,
  LogOut,
  Edit,
  Loader2,
  Camera,
  User,
  ChevronRight
} from 'lucide-react';

export default function SettingsTab() {
  const { toast } = useToast();
  const { logout, appUser } = useAuth();
  const { selectedRestaurant } = useWorkday();
  const { language, setLanguage, t } = useLanguage();

  // Profile editing state
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [editedUser, setEditedUser] = useState({
    name: appUser?.name || "",
    role: appUser?.role || "",
    avatar: ""
  });
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for menu modal
  const [menuModalOpen, setMenuModalOpen] = useState(false);

  // State for table layout modal
  const [tableLayoutModalOpen, setTableLayoutModalOpen] = useState(false);

  // Profile data from auth
  const profile = appUser ? {
    id: appUser.id,
    name: appUser.name,
    role: appUser.role === 'admin' ? 'Administrator' : 'User',
    avatarUrl: null
  } : null;

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

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSaveProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      // For now, just show a success message
      // In the future, this would save to Firestore
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      setIsProfileDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Profile Card */}
      <Card className="card-hover cursor-pointer" onClick={handleProfileClick}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                <AvatarImage
                  src={profile?.avatarUrl || ""}
                  alt={profile?.name || "User"}
                  className="object-cover"
                />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground font-semibold">
                  {profile?.name ? getInitials(profile.name) : <User className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-sm">
                <Edit className="h-3 w-3" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{profile?.name || "Guest"}</h2>
              <p className="text-sm text-muted-foreground">{profile?.role || "User"}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Settings Options */}
      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {/* App Theme */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium">{t('settings.appTheme')}</span>
            </div>
            <ThemeSwitch />
          </div>

          {/* Language */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Languages className="h-5 w-5 text-blue-500" />
              </div>
              <span className="font-medium">{t('settings.language')}</span>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  language === 'en'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('lt')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  language === 'lt'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                LT
              </button>
            </div>
          </div>

          {/* Menus */}
          <button
            className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
            onClick={() => setMenuModalOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <MenuSquare className="h-5 w-5 text-success" />
              </div>
              <span className="font-medium">{t('settings.menus')}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Table Layouts */}
          <button
            className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors"
            onClick={() => setTableLayoutModalOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Grid2X2 className="h-5 w-5 text-warning" />
              </div>
              <span className="font-medium">{t('settings.tableLayouts')}</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="destructive"
        className="w-full h-12"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-5 w-5" />
        {t('topbar.logout')}
      </Button>

      {/* Profile Edit Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information below
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Avatar with change option */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <Avatar
                  className="h-24 w-24 cursor-pointer ring-4 ring-primary/20 transition-all group-hover:ring-primary/40"
                  onClick={triggerFileInput}
                >
                  <AvatarImage
                    src={previewUrl}
                    alt={editedUser.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-semibold">
                    {editedUser.name ? getInitials(editedUser.name) : <User className="h-8 w-8" />}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={triggerFileInput}
                >
                  <Camera className="h-8 w-8 text-white" />
                </div>
              </div>
              <button
                className="text-sm text-primary hover:underline"
                onClick={triggerFileInput}
              >
                Change Photo
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editedUser.name}
                  onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={editedUser.role}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Role can only be changed by an administrator
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsProfileDialogOpen(false)}
              disabled={isUpdatingProfile}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isUpdatingProfile}
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('settings.saving')}
                </>
              ) : t('settings.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
