import { useState, useEffect } from 'react';
import TabNavigation from '@/components/TabNavigation';
import TopBar from '@/components/TopBar';
import { SettingsSidebar } from '@/components/SettingsSidebar';
import { useWorkday } from '@/contexts/WorkdayContext';
import { useTab } from '@/contexts/TabContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useWebSocketContext } from '@/contexts/WebSocketContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Restaurant, WebSocketMessage } from '@shared/schema';

// Import all tab components
import RestaurantInfoTab from '@/pages/restaurant-tab';
import WorkdayTab from '@/pages/workday-tab';
import OrderTab from '@/pages/orders-tab';
import KitchenTab from '@/pages/kitchen-tab';
import HistoryTab from '@/pages/history-tab';

// Play a notification bell using Web Audio API
const playOrderBell = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(830, now, 0.15);
    playTone(1100, now + 0.15, 0.2);
  } catch (e) {
    // Audio not supported
  }
};

export default function AppLayout() {
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);
  const [roleChangePopup, setRoleChangePopup] = useState<{ open: boolean; roleLabel: string }>({ open: false, roleLabel: '' });
  const { selectedRestaurant, setSelectedRestaurant, activeWorkday, elapsedTime } = useWorkday();
  const { activeTab } = useTab();
  const { isAdmin, userRole, appUser, refreshUser } = useAuth();
  const { t } = useLanguage();
  const { notifications, addNotification, markNotificationRead, markAllAsRead } = useNotifications();
  const { addMessageListener } = useWebSocketContext();

  // Global new-order sound for kitchen role - plays regardless of active tab
  useEffect(() => {
    if (userRole !== 'kitchen') return;
    const removeListener = addMessageListener((message: WebSocketMessage) => {
      if (message.type === 'NEW_ORDER') {
        const soundsEnabled = localStorage.getItem('kitchenSoundsEnabled') !== 'false';
        if (soundsEnabled) {
          playOrderBell();
        }
      }
    });
    return removeListener;
  }, [userRole, addMessageListener]);
  useEffect(() => {
    const removeListener = addMessageListener((message: WebSocketMessage) => {
      if (message.type === 'ROLE_CHANGED') {
        const payload = message.payload as { userId?: string; newRole?: string };
        if (payload?.userId && appUser?.id === payload.userId) {
          refreshUser();
          // Use raw role name — the popup component will translate it at render time
          setRoleChangePopup({ open: true, roleLabel: payload.newRole || '' });
        }
      }
    });
    return removeListener;
  }, [addMessageListener, appUser?.id, refreshUser]);

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    addNotification(`${restaurant.name} ${t('toast.restaurantSelectedDescription')}`);
  };

  const handleMenuClick = () => {
    setSettingsSidebarOpen(true);
  };

  // Render the active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'restaurant':
        return <RestaurantInfoTab />;
      case 'workday':
        return <WorkdayTab />;
      case 'orders':
        return <OrderTab />;
      case 'kitchen':
        return <KitchenTab />;
      case 'history':
        return <HistoryTab />;
      default:
        return <WorkdayTab />;
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Edge Gradients - Behind pills, above content */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-gradient-to-b from-background/80 via-background/40 to-transparent z-40 pointer-events-none" />
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background/80 via-background/40 to-transparent z-40 pointer-events-none" />

      {/* Settings Sidebar */}
      <SettingsSidebar
        open={settingsSidebarOpen}
        onOpenChange={setSettingsSidebarOpen}
      />

      {/* Top Bar */}
      <TopBar
        selectedRestaurant={selectedRestaurant}
        activeWorkday={activeWorkday}
        workdayElapsedTime={elapsedTime}
        onSelectRestaurant={handleSelectRestaurant}
        onMenuClick={handleMenuClick}
        notifications={notifications}
        onMarkNotificationRead={markNotificationRead}
        onMarkAllAsRead={markAllAsRead}
      />

      {/* Main Content - scrollable container */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden ios-scroll pt-16">
        <div className="w-full max-w-lg md:max-w-3xl lg:max-w-5xl mx-auto px-0 md:px-4">
          {renderTabContent()}
        </div>
      </main>

      {/* Bottom Navigation */}
      <TabNavigation />

      {/* Role Change Popup */}
      <AlertDialog open={roleChangePopup.open} onOpenChange={(open) => setRoleChangePopup(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('toast.roleChanged') || 'Role Changed'}</AlertDialogTitle>
            <AlertDialogDescription>
              {roleChangePopup.roleLabel
                ? `${t('toast.roleChangedDesc') || 'Your role has been changed to'} ${
                    ({ admin: t('roles.admin'), kitchen: t('roles.kitchen'), floor: t('roles.floor') } as Record<string, string>)[roleChangePopup.roleLabel] || roleChangePopup.roleLabel
                  }`
                : t('toast.roleChangedGeneric') || 'Your role has been updated'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setRoleChangePopup({ open: false, roleLabel: '' })}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
