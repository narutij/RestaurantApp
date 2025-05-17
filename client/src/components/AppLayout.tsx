import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import TabNavigation from '@/components/TabNavigation';
import { useLocation } from 'wouter';
import { RestaurantModal } from '@/components/modals/RestaurantModal';
import { Button } from '@/components/ui/button';
import { Restaurant } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { connectedUsers, status } = useWebSocket();
  const [restaurantModalOpen, setRestaurantModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const { toast } = useToast();
  
  // Load selected restaurant from localStorage (both on mount and when it changes)
  useEffect(() => {
    // Function to load restaurant from localStorage
    const loadRestaurantFromStorage = () => {
      try {
        const savedRestaurant = localStorage.getItem('selectedRestaurant');
        console.log("Selected restaurant:", null);
        if (savedRestaurant) {
          const restaurant = JSON.parse(savedRestaurant);
          console.log("Loading saved restaurant:", restaurant);
          setSelectedRestaurant(restaurant);
        }
      } catch (e) {
        console.error('Failed to load saved restaurant', e);
        localStorage.removeItem('selectedRestaurant');
      }
    };
    
    // Initial load
    loadRestaurantFromStorage();
    
    // Set up event listener for our custom event
    const handleRestaurantSelected = () => {
      loadRestaurantFromStorage();
    };
    
    // Listen for both storage events (for cross-tab sync) and our custom event
    window.addEventListener('restaurantSelected', handleRestaurantSelected);
    window.addEventListener('storage', (e) => {
      if (e.key === 'selectedRestaurant') {
        loadRestaurantFromStorage();
      }
    });
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('restaurantSelected', handleRestaurantSelected);
      window.removeEventListener('storage', () => {});
    };
  }, []);
  
  const handleSelectRestaurant = (restaurant: Restaurant) => {
    // Store the restaurant data and update state
    setSelectedRestaurant(restaurant);
    localStorage.setItem('selectedRestaurant', JSON.stringify(restaurant));
    setRestaurantModalOpen(false);
    
    // Show confirmation toast
    toast({
      title: "Restaurant Selected",
      description: `${restaurant.name} is now active.`,
    });
  };
  
  return (
    <div className="flex flex-col min-h-screen dark:bg-slate-900">
      {/* Restaurant Modal */}
      <RestaurantModal
        open={restaurantModalOpen}
        onOpenChange={setRestaurantModalOpen}
        selectedRestaurantId={selectedRestaurant?.id || null}
        onSelectRestaurant={handleSelectRestaurant}
      />
      
      {/* Header */}
      <header className="bg-white shadow-sm dark:bg-slate-800">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {selectedRestaurant?.name || "Order Manager"}
          </h1>
          <div 
            id="sync-status" 
            className={`flex items-center text-xs ${
              status === 'open' ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
            <span>
              {status === 'open' 
                ? `${connectedUsers} user${connectedUsers === 1 ? '' : 's'} connected` 
                : 'Connecting...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full pb-20">
        {children}
      </main>

      {/* Navigation Tabs */}
      <TabNavigation />
    </div>
  );
}
