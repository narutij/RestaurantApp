import { useLocation, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { type OrderWithDetails, Restaurant } from '@shared/schema';
import { Building2, CalendarDays, Receipt, UtensilsCrossed, Store } from 'lucide-react';
import { useState, useEffect } from 'react';
import { RestaurantModal } from './modals/RestaurantModal'; 
import { useToast } from '@/hooks/use-toast';

export default function TabNavigation() {
  const [location] = useLocation();
  const [restaurantModalOpen, setRestaurantModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const { toast } = useToast();
  
  // Fetch new orders for notification badge
  const { data: orders = [] } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders/new'],
  });

  // Count incomplete orders for notification badge
  const newOrdersCount = orders.filter(order => !order.completed).length;
  
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
    <>
      {/* Restaurant Modal */}
      <RestaurantModal
        open={restaurantModalOpen}
        onOpenChange={setRestaurantModalOpen}
        selectedRestaurantId={selectedRestaurant?.id || null}
        onSelectRestaurant={handleSelectRestaurant}
      />
      
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 shadow-md">
        <div className="max-w-md mx-auto flex justify-around">
          <Link href="/restaurant">
            <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
              location === '/restaurant' ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
            }`}>
              <Building2 className="h-6 w-6" />
              <span className="text-xs mt-1">Setup</span>
            </a>
          </Link>
          
          {/* New Restaurants Tab Button */}
          <button
            id="restaurants-button"
            onClick={() => setRestaurantModalOpen(true)}
            className={`tab-button flex-1 flex flex-col items-center justify-center py-3
              text-slate-500 dark:text-slate-400
              ${restaurantModalOpen ? 'text-primary' : ''}
            `}
          >
            <Store className="h-6 w-6" />
            <span className="text-xs mt-1">Restaurants</span>
          </button>
          
          <Link href="/">
            <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
              location === '/' ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
            }`}>
              <CalendarDays className="h-6 w-6" />
              <span className="text-xs mt-1">Workday</span>
            </a>
          </Link>
          <Link href="/orders">
            <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 ${
              location === '/orders' ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
            }`}>
              <Receipt className="h-6 w-6" />
              <span className="text-xs mt-1">Orders</span>
            </a>
          </Link>
          <Link href="/kitchen">
            <a className={`tab-button flex-1 flex flex-col items-center justify-center py-3 relative ${
              location === '/kitchen' ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
            }`}>
              <UtensilsCrossed className="h-6 w-6" />
              <span className="text-xs mt-1">Kitchen</span>
              {newOrdersCount > 0 && (
                <span className="absolute top-2 right-6 bg-warning text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {newOrdersCount}
                </span>
              )}
            </a>
          </Link>
        </div>
      </nav>
    </>
  );
}
