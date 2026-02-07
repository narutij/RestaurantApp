import React, { useState, useRef, useEffect } from 'react';
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

import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { purgeFirestoreRestaurantData } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
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
  KeyRound,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    const stored = localStorage.getItem('kitchenSoundsEnabled');
    return stored !== null ? stored === 'true' : true;
  });

  // Persist sound setting
  useEffect(() => {
    localStorage.setItem('kitchenSoundsEnabled', String(soundsEnabled));
  }, [soundsEnabled]);

  // Help & Policy modals
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  // Change password state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { toast } = useToast();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeColor = (role: string | undefined) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'kitchen':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'floor':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getTranslatedRole = (role: string | undefined) => {
    switch (role) {
      case 'admin': return t('roles.admin');
      case 'kitchen': return t('roles.kitchen');
      case 'floor': return t('roles.floor');
      default: return role || t('roles.floor');
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

  const compressImage = (file: File, maxSize = 200, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down to fit within maxSize x maxSize
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim()) return;

    setIsUpdatingProfile(true);
    try {
      // Upload photo if selected
      let photoUrl: string | undefined;
      if (selectedFile) {
        // Compress and resize to ~200x200 JPEG to fit Firestore's 1MB doc limit
        photoUrl = await compressImage(selectedFile);
      }

      // Save name + photo together so local state updates with both
      await updateProfile({
        name: editedName.trim(),
        ...(photoUrl && { photoUrl }),
      });

      setProfileModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl('');
      toast({ title: "Profile Updated", description: "Your profile has been saved" });
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast({ title: "Error", description: "Failed to save profile", variant: "destructive" });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Error", description: "New passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("Not authenticated");

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast({ title: "Password Changed", description: "Your password has been updated successfully" });
    } catch (error: any) {
      const msg = error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential'
        ? 'Current password is incorrect'
        : error.message || 'Failed to change password';
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const [isPurging, setIsPurging] = useState(false);

  const handlePurgeFirestore = async () => {
    setIsPurging(true);
    try {
      const deleted = await purgeFirestoreRestaurantData();
      toast({
        title: "Firestore Cleaned",
        description: deleted > 0
          ? `Removed ${deleted} stale document${deleted !== 1 ? 's' : ''} from Firestore`
          : "No stale data found — Firestore is clean",
      });
    } catch (error: any) {
      toast({ title: "Cleanup Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsPurging(false);
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
      className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors rounded-xl mx-2 group ${onClick ? 'cursor-pointer' : ''}`}
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
        <SheetContent side="left" className="w-[320px] sm:w-[360px] flex flex-col p-0 bg-white dark:bg-[#181818] border-r border-gray-200 dark:border-white/5">
          {/* Header with gradient */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-transparent" />
            <div className="relative px-5 pt-6 pb-5">
              <h2 className="text-lg font-semibold mb-5">
                {t('settings.title')}
              </h2>

              {/* User Profile Card */}
              <button
                onClick={handleUserBlockClick}
                className="w-full p-4 bg-gray-100 dark:bg-[#1E2429] hover:bg-gray-200 dark:hover:bg-[#252B32] rounded-2xl transition-all group border border-gray-200 dark:border-white/5"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 ring-2 ring-primary/30 flex-shrink-0">
                    <AvatarImage
                      src={appUser?.photoUrl || ""}
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
                {t('settings.appearance')}
              </p>
              <div className="space-y-1">
                <SettingItem
                  icon={Palette}
                  iconColor="bg-violet-500/20 text-violet-400"
                  label={t('settings.appTheme')}
                  description={currentThemeLabel}
                  action={<ThemeSwitch />}
                />
                <SettingItem
                  icon={Languages}
                  iconColor="bg-blue-500/20 text-blue-400"
                  label={t('settings.language')}
                  description={language === 'en' ? 'English' : 'Lietuvių'}
                  action={
                    <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-white/5 rounded-full p-1">
                      <button
                        type="button"
                        onClick={() => setLanguage('en')}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                          language === 'en'
                            ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
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
                            ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
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
                {t('settings.notifications')}
              </p>
              <div className="space-y-1">
                <SettingItem
                  icon={Bell}
                  iconColor="bg-amber-500/20 text-amber-400"
                  label={t('settings.pushNotifications')}
                  description={notificationsEnabled ? t('settings.enabled') : t('settings.disabled')}
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
                  label={t('settings.sounds')}
                  description={soundsEnabled ? t('settings.enabled') : t('settings.disabled')}
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
                {t('settings.support')}
              </p>
              <div className="space-y-1">
                <SettingItem
                  icon={HelpCircle}
                  iconColor="bg-pink-500/20 text-pink-400"
                  label={t('settings.helpSupport')}
                  onClick={() => setHelpModalOpen(true)}
                />
                <SettingItem
                  icon={Shield}
                  iconColor="bg-emerald-500/20 text-emerald-400"
                  label={t('settings.privacyPolicy')}
                  onClick={() => setPrivacyModalOpen(true)}
                />
              </div>
            </div>

            {/* Admin Section */}
            {appUser?.role === 'admin' && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 mb-2">
                  {t('settings.admin')}
                </p>
                <div className="space-y-1">
                  <SettingItem
                    icon={Trash2}
                    iconColor="bg-red-500/20 text-red-400"
                    label={t('settings.cleanAccounts')}
                    description={isPurging ? t('settings.cleaning') : t('settings.cleanAccountsDesc')}
                    onClick={isPurging ? undefined : handlePurgeFirestore}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer with version and logout */}
          <div className="p-4 border-t border-gray-200 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between px-2 py-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t('settings.appVersion')}</span>
              </div>
              <span className="text-xs text-muted-foreground">1.0.0</span>
            </div>
            <Button
              variant="ghost"
              className="w-full h-12 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl border border-red-500/20"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-5 w-5" />
              {t('settings.logOut')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Change Password Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10 overflow-hidden" hideCloseButton>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent" />
            <div className="relative px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 rounded-xl">
                    <KeyRound className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{t('settings.changePassword')}</h2>
                    <p className="text-xs text-muted-foreground">{t('settings.updatePassword')}</p>
                  </div>
                </div>
                <button onClick={() => setPasswordModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            </div>
          </div>
          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('settings.currentPassword')}</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('settings.enterCurrentPassword')}
                  className="h-11 pr-10 bg-gray-50 dark:bg-[#181818] border-gray-200 dark:border-white/10 rounded-xl"
                />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('settings.newPassword')}</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('settings.enterNewPassword')}
                  className="h-11 pr-10 bg-gray-50 dark:bg-[#181818] border-gray-200 dark:border-white/10 rounded-xl"
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('settings.confirmNewPassword')}</Label>
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder={t('settings.confirmNewPasswordPlaceholder')}
                className="h-11 bg-gray-50 dark:bg-[#181818] border-gray-200 dark:border-white/10 rounded-xl"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1 h-11 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl" onClick={() => setPasswordModalOpen(false)} disabled={isChangingPassword}>
                {t('common.cancel')}
              </Button>
              <Button className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-white rounded-xl" onClick={handleChangePassword} disabled={isChangingPassword}>
                {isChangingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('settings.changing')}</> : t('settings.changePassword')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help & Support Modal */}
      <Dialog open={helpModalOpen} onOpenChange={setHelpModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10 overflow-hidden max-h-[85vh]" hideCloseButton>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-rose-500/10 to-transparent" />
            <div className="relative px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-pink-500/20 rounded-xl">
                    <HelpCircle className="h-5 w-5 text-pink-400" />
                  </div>
                  <h2 className="text-lg font-semibold">{t('help.title')}</h2>
                </div>
                <button onClick={() => setHelpModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            </div>
          </div>
          <ScrollArea className="max-h-[calc(85vh-80px)]">
            <div className="px-6 pb-6 space-y-5 text-sm">
              <div>
                <h3 className="font-semibold text-base mb-2">{t('help.welcomeTitle')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t('help.welcomeText')}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5">{t('help.howTitle')}</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {t('help.howText')}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5">{t('help.buttonsTitle')}</h4>
                <ul className="text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li><span className="text-foreground font-medium">{t('nav.orders')}</span> — {t('help.ordersDesc')}</li>
                  <li><span className="text-foreground font-medium">{t('nav.kitchen')}</span> — {t('help.kitchenDesc')}</li>
                  <li><span className="text-foreground font-medium">{t('nav.workday')}</span> — {t('help.workdayDesc')}</li>
                  <li><span className="text-foreground font-medium">{t('nav.history')}</span> — {t('help.historyDesc')}</li>
                  <li><span className="text-foreground font-medium">{t('nav.restaurant')}</span> — {t('help.restaurantDesc')}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5">{t('help.tipsTitle')}</h4>
                <ul className="text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li>{t('help.tip1')}</li>
                  <li>{t('help.tip2')}</li>
                  <li>{t('help.tip3')}</li>
                  <li>{t('help.tip4')}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5">{t('help.actualHelpTitle')}</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {t('help.actualHelpText')}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-white/5">
                <p className="text-xs text-muted-foreground text-center">
                  {t('help.footer')}
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Modal */}
      <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10 overflow-hidden max-h-[85vh]" hideCloseButton>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-transparent" />
            <div className="relative px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                    <Shield className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-semibold">{t('privacy.title')}</h2>
                </div>
                <button onClick={() => setPrivacyModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            </div>
          </div>
          <ScrollArea className="max-h-[calc(85vh-80px)]">
            <div className="px-6 pb-6 space-y-5 text-sm">
              <div>
                <p className="text-muted-foreground leading-relaxed italic">
                  {t('privacy.lastUpdated')}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5">{t('privacy.collectTitle')}</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {t('privacy.collectText')}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5">{t('privacy.useTitle')}</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {t('privacy.useText')}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5">{t('privacy.whereTitle')}</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {t('privacy.whereText')}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5">{t('privacy.rightsTitle')}</h4>
                <ul className="text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li>{t('privacy.right1')}</li>
                  <li>{t('privacy.right2')}</li>
                  <li>{t('privacy.right3')}</li>
                  <li>{t('privacy.right4')}</li>
                  <li>{t('privacy.right5')}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5">{t('privacy.cookiesTitle')}</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {t('privacy.cookiesText')}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5">{t('privacy.changeTitle')}</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {t('privacy.changeText')}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-white/5">
                <p className="text-xs text-muted-foreground text-center">
                  {t('privacy.footer')}
                </p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Profile Edit Modal */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 bg-white dark:bg-[#1E2429] border-gray-200 dark:border-white/10 overflow-hidden" hideCloseButton>
          {/* Header with gradient */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-transparent" />
            <div className="relative px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{t('settings.editProfile')}</h2>
                  <p className="text-xs text-muted-foreground">{t('settings.updateInfo')}</p>
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
                    src={previewUrl || appUser?.photoUrl || ""}
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
                {t('settings.changePhoto')}
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
                  {t('settings.displayName')}
                </Label>
                <Input
                  id="edit-name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder={t('settings.enterYourName')}
                  className="h-11 bg-gray-50 dark:bg-[#181818] border-gray-200 dark:border-white/10 focus:border-primary/50 rounded-xl"
                />
              </div>
              
              {/* Read-only email field */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t('settings.emailAddress')}
                </Label>
                <div className="h-11 px-3 flex items-center bg-gray-50 dark:bg-[#181818]/50 border border-gray-200 dark:border-white/5 rounded-xl">
                  <span className="text-sm text-muted-foreground">{appUser?.email || t('common.notSet')}</span>
                </div>
              </div>
              
              {/* Read-only role field */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t('settings.role')}
                </Label>
                <div className="h-11 px-3 flex items-center justify-between bg-gray-50 dark:bg-[#181818]/50 border border-gray-200 dark:border-white/5 rounded-xl">
                  <span className="text-sm text-muted-foreground">{getTranslatedRole(appUser?.role)}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getRoleBadgeColor(appUser?.role)}`}>
                    {appUser?.role === 'admin' ? t('settings.fullAccess') : t('settings.limited')}
                  </span>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <Button
              variant="ghost"
              className="w-full h-11 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl justify-start"
              onClick={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
                setPasswordModalOpen(true);
              }}
            >
              <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />
              {t('settings.changePassword')}
            </Button>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                className="flex-1 h-11 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl"
                onClick={() => setProfileModalOpen(false)}
                disabled={isUpdatingProfile}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1 h-11 bg-primary hover:bg-primary/90 rounded-xl"
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
