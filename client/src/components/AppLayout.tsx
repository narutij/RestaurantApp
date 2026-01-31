import { useState } from 'react';
import TabNavigation from '@/components/TabNavigation';
import TopBar from '@/components/TopBar';
import { SettingsSidebar } from '@/components/SettingsSidebar';
import { useWorkday } from '@/contexts/WorkdayContext';
import { useTab } from '@/contexts/TabContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationContext';
import type { Restaurant } from '@shared/schema';

// Import all tab components
import RestaurantInfoTab from '@/pages/restaurant-tab';
import WorkdayTab from '@/pages/workday-tab';
import OrderTab from '@/pages/orders-tab';
import KitchenTab from '@/pages/kitchen-tab';
import HistoryTab from '@/pages/history-tab';

export default function AppLayout() {
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false);
  const { selectedRestaurant, setSelectedRestaurant, activeWorkday, elapsedTime } = useWorkday();
  const { activeTab } = useTab();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const { notifications, addNotification, markNotificationRead, markAllAsRead } = useNotifications();

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
        return isAdmin ? <RestaurantInfoTab /> : <WorkdayTab />;
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
      <div className="fixed top-0 left-0 right-0 h-20 bg-gradient-to-b from-background via-background/80 to-transparent z-40 pointer-events-none" />
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent z-40 pointer-events-none" />

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
        <div className="w-full max-w-lg mx-auto">
          {renderTabContent()}
        </div>
      </main>

      {/* Bottom Navigation */}
      <TabNavigation />
    </div>
  );
}
