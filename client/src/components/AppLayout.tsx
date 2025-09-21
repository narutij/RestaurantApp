import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import TabNavigation from '@/components/TabNavigation';
import { useLocation } from 'wouter';
import { RestaurantModal } from '@/components/modals/RestaurantModal';
import { Button } from '@/components/ui/button';
import { Restaurant } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { Users, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    console.log('AppLayout: Selecting restaurant with imageUrl:', restaurant.imageUrl);

    // Store the restaurant data and update state
    setSelectedRestaurant(restaurant);
    localStorage.setItem('selectedRestaurant', JSON.stringify(restaurant));
    setRestaurantModalOpen(false);

    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('restaurantSelected'));

    // Show confirmation toast
    toast({
      title: "Restaurant Selected",
      description: `${restaurant.name} is now active.`,
    });
  };
  
  return (
    <div className="flex flex-col min-h-screen dark:bg-background">
      {/* Restaurant Modal */}
      <RestaurantModal
        open={restaurantModalOpen}
        onOpenChange={setRestaurantModalOpen}
        selectedRestaurantId={selectedRestaurant?.id || null}
        onSelectRestaurant={handleSelectRestaurant}
      />
      
      {/* Header */}
      <header className="bg-white shadow-sm dark:bg-card">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedRestaurant?.imageUrl ? (
              <img
                src={selectedRestaurant.imageUrl}
                alt={selectedRestaurant.name}
                className="h-10 w-10 rounded-lg object-cover"
                onLoad={() => console.log('AppLayout: Image loaded successfully:', selectedRestaurant.imageUrl)}
                onError={() => console.log('AppLayout: Image failed to load:', selectedRestaurant.imageUrl)}
              />
            ) : selectedRestaurant ? (
              <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
            ) : null}
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              {selectedRestaurant?.name || "Order Manager"}
            </h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                id="sync-status" 
                className={`flex items-center text-xs hover:opacity-80 transition-opacity ${
                  status === 'open' ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'
                }`}
              >
                <Users className="h-4 w-4 mr-1" />
                <span>
                  {status === 'open' 
                    ? `${connectedUsers} user${connectedUsers === 1 ? '' : 's'} connected` 
                    : 'Connecting...'}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Connected Users</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {status === 'open' ? (
                connectedUsers > 0 ? (
                  <div className="py-2">
                    <DropdownMenuItem disabled className="text-sm text-muted-foreground">
                      {connectedUsers} anonymous user{connectedUsers === 1 ? '' : 's'} connected
                    </DropdownMenuItem>
                  </div>
                ) : (
                  <DropdownMenuItem disabled className="text-sm text-muted-foreground">
                    No users connected
                  </DropdownMenuItem>
                )
              ) : (
                <DropdownMenuItem disabled className="text-sm text-muted-foreground">
                  Connecting to server...
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
