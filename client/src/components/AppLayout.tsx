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
  
  // Load selected restaurant from localStorage on mount
  useEffect(() => {
    const savedRestaurant = localStorage.getItem('selectedRestaurant');
    if (savedRestaurant) {
      try {
        setSelectedRestaurant(JSON.parse(savedRestaurant));
      } catch (e) {
        console.error('Failed to parse saved restaurant', e);
        localStorage.removeItem('selectedRestaurant');
      }
    }
  }, []);
  
  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    localStorage.setItem('selectedRestaurant', JSON.stringify(restaurant));
    setRestaurantModalOpen(false);
    
    toast({
      title: "Restaurant Selected",
      description: `${restaurant.name} is now active.`,
    });
  };
  
  return (
    <div className="flex flex-col min-h-screen dark:bg-slate-900">
      {/* Restaurant Modal - Only shown when button in header is clicked */}
      {restaurantModalOpen && (
        <RestaurantModal
          open={restaurantModalOpen}
          onOpenChange={setRestaurantModalOpen}
          selectedRestaurantId={selectedRestaurant?.id || null}
          onSelectRestaurant={handleSelectRestaurant}
        />
      )}
      
      {/* Header */}
      <header className="bg-white shadow-sm dark:bg-slate-800">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white mr-3">Order Manager</h1>
            <Button 
              id="restaurants-button"
              variant="outline" 
              size="sm" 
              className="text-xs flex items-center gap-1" 
              onClick={() => setRestaurantModalOpen(true)}
            >
              <span>{selectedRestaurant ? selectedRestaurant.name : 'Select Restaurant'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 9l-7 7-7-7"></path>
              </svg>
            </Button>
          </div>
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
