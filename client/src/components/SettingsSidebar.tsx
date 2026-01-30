import React, { useState, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ThemeSwitch } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";
import {
  Palette,
  Languages,
  LogOut,
  User,
  Camera,
  Loader2,
} from 'lucide-react';

interface SettingsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsSidebar({ open, onOpenChange }: SettingsSidebarProps) {
  const { logout, appUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme } = useTheme();

  // Profile edit state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [editedName, setEditedName] = useState(appUser?.name || '');
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeColor = (role: string | undefined) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'manager':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'kitchen':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getTranslatedRole = (role: string | undefined) => {
    switch (role) {
      case 'admin': return t('roles.admin');
      case 'manager': return t('roles.manager');
      case 'kitchen': return t('roles.kitchen');
      case 'worker': return t('roles.worker');
      default: return role || t('roles.worker');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onOpenChange(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleUserBlockClick = () => {
    setEditedName(appUser?.name || '');
    setPreviewUrl('');
    setSelectedFile(null);
    setProfileModalOpen(true);
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
      // TODO: Implement actual profile save
      await new Promise(resolve => setTimeout(resolve, 500));
      setProfileModalOpen(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const currentThemeLabel = theme === 'dark'
    ? (t('settings.dark') || 'Dark')
    : (t('settings.light') || 'Light');

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[300px] sm:w-[340px] flex flex-col p-0">
          {/* User Block - Clickable */}
          <SheetHeader className="p-0">
            <button
              onClick={handleUserBlockClick}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
            >
              <Avatar className="h-11 w-11 ring-2 ring-primary/20 flex-shrink-0">
                <AvatarImage
                  src=""
                  alt={appUser?.name || "User"}
                  className="object-cover"
                />
                <AvatarFallback className="text-sm bg-primary text-primary-foreground font-semibold">
                  {appUser?.name ? getInitials(appUser.name) : <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">
                    {appUser?.name || "Guest"}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getRoleBadgeColor(appUser?.role)}`}>
                    {getTranslatedRole(appUser?.role)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground truncate block mt-0.5">
                  {appUser?.email || ''}
                </span>
              </div>
            </button>
          </SheetHeader>

          <Separator />

          {/* Settings list */}
          <div className="flex-1 overflow-y-auto">
            <div className="py-2">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Palette className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">{t('settings.appTheme')}</span>
                    <p className="text-xs text-muted-foreground">
                      {currentThemeLabel}
                    </p>
                  </div>
                </div>
                <ThemeSwitch />
              </div>

              {/* Language Selection */}
              <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <Languages className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">{t('settings.language')}</span>
                    <p className="text-xs text-muted-foreground">
                      {language === 'en' ? 'English' : 'Lietuvių'}
                    </p>
                  </div>
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
            </div>
          </div>

          {/* Footer with logout */}
          <div className="p-4 border-t">
            <Button
              variant="destructive"
              className="w-full h-11"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-5 w-5" />
              {t('topbar.logout')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Profile Edit Modal */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('settings.editProfile') || 'Edit Profile'}</DialogTitle>
            <DialogDescription>
              {t('settings.editProfileDesc') || 'Update your profile information'}
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
                    alt={editedName}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-semibold">
                    {editedName ? getInitials(editedName) : <User className="h-8 w-8" />}
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
                {t('settings.changePhoto') || 'Change Photo'}
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
                <Label htmlFor="name">{t('settings.name') || 'Name'}</Label>
                <Input
                  id="name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProfileModalOpen(false)}
              disabled={isUpdatingProfile}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isUpdatingProfile}
            >
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.saving') || 'Saving...'}
                </>
              ) : (t('common.save') || 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
