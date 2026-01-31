import React, { useState, useRef } from 'react';
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Bell,
  Volume2,
  ChevronRight,
  Smartphone,
  HelpCircle,
  Shield,
} from 'lucide-react';

interface SettingsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsSidebar({ open, onOpenChange }: SettingsSidebarProps) {
  const { logout, appUser, updateProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme } = useTheme();

  // Profile edit state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [editedName, setEditedName] = useState(appUser?.name || '');
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);

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
    if (!editedName.trim()) return;
    
    setIsUpdatingProfile(true);
    try {
      await updateProfile({ name: editedName.trim() });
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

  // Setting item component for consistent styling (no motion to prevent re-render flicker)
  const SettingItem = ({ 
    icon: Icon, 
    iconColor, 
    label, 
    description, 
    action, 
    onClick,
  }: { 
    icon: any; 
    iconColor: string; 
    label: string; 
    description?: string; 
    action?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <div
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors rounded-xl mx-2 group ${onClick ? 'cursor-pointer' : ''}`}
      style={{ width: 'calc(100% - 16px)' }}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-left">
          <span className="text-sm font-medium block">{label}</span>
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        {action || (onClick && <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />)}
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[320px] sm:w-[360px] flex flex-col p-0 bg-[#181818] border-r border-white/5">
          {/* Header with gradient */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-transparent" />
            <div className="relative px-5 pt-6 pb-5">
              <h2 className="text-lg font-semibold mb-5">
                Settings
              </h2>

              {/* User Profile Card */}
              <button
                onClick={handleUserBlockClick}
                className="w-full p-4 bg-[#1E2429] hover:bg-[#252B32] rounded-2xl transition-all group border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 ring-2 ring-primary/30 flex-shrink-0">
                    <AvatarImage
                      src=""
                      alt={appUser?.name || "User"}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-base bg-gradient-to-br from-primary to-purple-600 text-white font-semibold">
                      {appUser?.name ? getInitials(appUser.name) : <User className="h-6 w-6" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold truncate">
                        {appUser?.name || "Guest"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate block mt-0.5">
                      {appUser?.email || ''}
                    </span>
                    <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-2 ${getRoleBadgeColor(appUser?.role)}`}>
                      {getTranslatedRole(appUser?.role)}
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </button>
            </div>
          </div>

          {/* Settings Sections */}
          <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
            {/* Appearance Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 mb-2">
                Appearance
              </p>
              <div className="space-y-1">
                <SettingItem
                  icon={Palette}
                  iconColor="bg-violet-500/20 text-violet-400"
                  label="App Theme"
                  description={currentThemeLabel}
                  action={<ThemeSwitch />}
                />
                <SettingItem
                  icon={Languages}
                  iconColor="bg-blue-500/20 text-blue-400"
                  label="Language"
                  description={language === 'en' ? 'English' : 'Lietuvių'}
                  action={
                    <div className="flex items-center gap-0.5 bg-white/5 rounded-full p-1">
                      <button
                        type="button"
                        onClick={() => setLanguage('en')}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                          language === 'en'
                            ? 'bg-white/10 text-white'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        EN
                      </button>
                      <button
                        type="button"
                        onClick={() => setLanguage('lt')}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                          language === 'lt'
                            ? 'bg-white/10 text-white'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        LT
                      </button>
                    </div>
                  }
                />
              </div>
            </div>

            {/* Notifications Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 mb-2">
                Notifications
              </p>
              <div className="space-y-1">
                <SettingItem
                  icon={Bell}
                  iconColor="bg-amber-500/20 text-amber-400"
                  label="Push Notifications"
                  description={notificationsEnabled ? 'Enabled' : 'Disabled'}
                  action={
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={(checked) => setNotificationsEnabled(checked)}
                    />
                  }
                />
                <SettingItem
                  icon={Volume2}
                  iconColor="bg-green-500/20 text-green-400"
                  label="Sounds"
                  description={soundsEnabled ? 'Enabled' : 'Disabled'}
                  action={
                    <Switch
                      checked={soundsEnabled}
                      onCheckedChange={(checked) => setSoundsEnabled(checked)}
                    />
                  }
                />
              </div>
            </div>

            {/* Support Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 mb-2">
                Support
              </p>
              <div className="space-y-1">
                <SettingItem
                  icon={HelpCircle}
                  iconColor="bg-pink-500/20 text-pink-400"
                  label="Help & Support"
                  onClick={() => {}}
                />
                <SettingItem
                  icon={Shield}
                  iconColor="bg-emerald-500/20 text-emerald-400"
                  label="Privacy Policy"
                  onClick={() => {}}
                />
              </div>
            </div>
          </div>

          {/* Footer with version and logout */}
          <div className="p-4 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between px-2 py-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">App Version</span>
              </div>
              <span className="text-xs text-muted-foreground">1.0.0</span>
            </div>
            <Button
              variant="ghost"
              className="w-full h-12 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl border border-red-500/20"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-5 w-5" />
              Log out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Profile Edit Modal */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 bg-[#1E2429] border-white/10 overflow-hidden" hideCloseButton>
          {/* Header with gradient */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-transparent" />
            <div className="relative px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Edit Profile</h2>
                  <p className="text-xs text-muted-foreground">Update your information</p>
                </div>
                <button
                  onClick={() => setProfileModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <Avatar
                  className="h-28 w-28 cursor-pointer ring-4 ring-primary/20 transition-all group-hover:ring-primary/40"
                  onClick={triggerFileInput}
                >
                  <AvatarImage
                    src={previewUrl}
                    alt={editedName}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-purple-600 text-white font-semibold">
                    {editedName ? getInitials(editedName) : <User className="h-10 w-10" />}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={triggerFileInput}
                >
                  <Camera className="h-8 w-8 text-white" />
                </div>
                {/* Camera badge */}
                <div 
                  className="absolute -bottom-1 -right-1 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
                  onClick={triggerFileInput}
                >
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </div>
              <button
                className="mt-3 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
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

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-xs text-muted-foreground">
                  Display Name
                </Label>
                <Input
                  id="edit-name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Enter your name"
                  className="h-11 bg-[#181818] border-white/10 focus:border-primary/50 rounded-xl"
                />
              </div>
              
              {/* Read-only email field */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Email Address
                </Label>
                <div className="h-11 px-3 flex items-center bg-[#181818]/50 border border-white/5 rounded-xl">
                  <span className="text-sm text-muted-foreground">{appUser?.email || 'Not set'}</span>
                </div>
              </div>
              
              {/* Read-only role field */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Role
                </Label>
                <div className="h-11 px-3 flex items-center justify-between bg-[#181818]/50 border border-white/5 rounded-xl">
                  <span className="text-sm text-muted-foreground">{getTranslatedRole(appUser?.role)}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getRoleBadgeColor(appUser?.role)}`}>
                    {appUser?.role === 'admin' ? 'Full Access' : 'Limited'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                className="flex-1 h-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl"
                onClick={() => setProfileModalOpen(false)}
                disabled={isUpdatingProfile}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 bg-primary hover:bg-primary/90 rounded-xl"
                onClick={handleSaveProfile}
                disabled={isUpdatingProfile}
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
