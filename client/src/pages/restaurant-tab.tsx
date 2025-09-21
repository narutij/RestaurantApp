import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { RestaurantModal } from "@/components/modals/RestaurantModal";
import { WorkersModal } from "@/components/modals/WorkersModal";
import { Restaurant } from "@shared/schema";
import {
  Store,
  Edit,
  Loader2,
  Users,
  Building2
} from 'lucide-react';

export default function RestaurantInfoTab() {
  const { toast } = useToast();
  const { appUser, isAdmin } = useAuth();

  // State for restaurant modal
  const [restaurantModalOpen, setRestaurantModalOpen] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // State for workers modal
  const [workersModalOpen, setWorkersModalOpen] = useState(false);
  
  // Effect to load selected restaurant from localStorage
  useEffect(() => {
    try {
      const savedRestaurant = localStorage.getItem('selectedRestaurant');
      if (savedRestaurant) {
        const restaurant = JSON.parse(savedRestaurant);
        console.log('Restaurant tab: Loading saved restaurant with imageUrl:', restaurant.imageUrl);
        setSelectedRestaurant(restaurant);
      }
    } catch (e) {
      console.error('Failed to load saved restaurant', e);
    }

    // Listen for restaurant selection events
    const handleRestaurantSelected = () => {
      try {
        const savedRestaurant = localStorage.getItem('selectedRestaurant');
        if (savedRestaurant) {
          const restaurant = JSON.parse(savedRestaurant);
          console.log('Restaurant tab: Restaurant selected event - updating with imageUrl:', restaurant.imageUrl);
          setSelectedRestaurant(restaurant);
        }
      } catch (e) {
        console.error('Failed to update restaurant from event', e);
      }
    };

    window.addEventListener('restaurantSelected', handleRestaurantSelected);

    return () => {
      window.removeEventListener('restaurantSelected', handleRestaurantSelected);
    };
  }, []);

  // Navigation options for Restaurant tab (admin only)
  const options = [
    {
      icon: <Store className="mr-2 h-5 w-5" />,
      label: "Restaurants",
      href: "#restaurants",
      action: () => setRestaurantModalOpen(true)
    },
    {
      icon: <Users className="mr-2 h-5 w-5" />,
      label: "Workers",
      href: "#workers",
      action: () => setWorkersModalOpen(true)
    },
  ];

  // Use selected restaurant data
  const restaurantProfile = selectedRestaurant ? {
    id: selectedRestaurant.id,
    name: selectedRestaurant.name,
    address: selectedRestaurant.address || 'No address set',
    imageUrl: selectedRestaurant.imageUrl || null
  } : null;
  const isLoadingRestaurant = false;

  // Handle selecting a restaurant
  const handleSelectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurantId(restaurant.id);
    setRestaurantModalOpen(false);
    
    console.log("Selected restaurant:", restaurant);
    
    // Save to localStorage and dispatch a custom event to update app-level state
    localStorage.setItem('selectedRestaurant', JSON.stringify(restaurant));
    
    // Create and dispatch a custom event to notify the app layout component
    const event = new Event('restaurantSelected');
    window.dispatchEvent(event);
    
    toast({
      title: "Restaurant Selected",
      description: `${restaurant.name} has been selected.`,
    });
  };

  const handleRestaurantClick = () => {
    if (restaurantProfile) {
      setRestaurantModalOpen(true);
    } else {
      toast({
        title: "No Restaurant Selected",
        description: "Please select a restaurant first",
      });
    }
  };
  

  // Only show to admins
  if (!isAdmin) {
    return (
      <div className="p-4 flex flex-col min-h-[calc(100vh-70px)] items-center justify-center">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground text-center">Restaurant management is only available for administrators.</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col min-h-[calc(100vh-70px)]">
      {/* Restaurant block as a button - horizontal layout */}
      {isLoadingRestaurant ? (
        <div className="flex items-center justify-center my-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : restaurantProfile ? (
        <Button
          variant="ghost"
          className="flex items-center justify-start w-full h-auto p-4 mb-4 mt-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
          onClick={handleRestaurantClick}
          disabled={isLoadingRestaurant}
        >
          <div className="relative">
            {restaurantProfile?.imageUrl ? (
              <img
                src={restaurantProfile.imageUrl}
                alt={restaurantProfile.name}
                className="h-14 w-14 rounded-lg object-cover"
                onLoad={() => console.log('Restaurant tab: Restaurant image loaded:', restaurantProfile?.imageUrl)}
                onError={() => console.log('Restaurant tab: Restaurant image failed to load:', restaurantProfile?.imageUrl)}
              />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
            )}
          </div>
          <div className="ml-4 text-left">
            <h2 className="text-xl font-semibold">{restaurantProfile?.name}</h2>
            <p className="text-muted-foreground text-sm">{restaurantProfile?.address}</p>
          </div>
        </Button>
      ) : (
        <Button
          variant="outline"
          className="flex items-center justify-center w-full h-auto p-4 mb-4 mt-2 border-dashed"
          onClick={() => setRestaurantModalOpen(true)}
        >
          <Building2 className="h-8 w-8 text-muted-foreground mr-3" />
          <div className="text-center">
            <h2 className="text-lg font-semibold">No Restaurant Selected</h2>
            <p className="text-muted-foreground text-sm">Click to select a restaurant</p>
          </div>
        </Button>
      )}

      {/* Restaurant management options */}
      <div className="space-y-1">
        {options.map((option, index) => (
          <Button
            key={index}
            variant="ghost"
            className="w-full justify-start text-base py-6 hover:bg-slate-200 dark:hover:bg-slate-700"
            onClick={() => option.action ? option.action() : console.log(`Clicked: ${option.label}`)}
          >
            {option.icon}
            {option.label}
          </Button>
        ))}
      </div>

      {/* Restaurant Modal */}
      <RestaurantModal
        open={restaurantModalOpen}
        onOpenChange={setRestaurantModalOpen}
        selectedRestaurantId={selectedRestaurantId}
        onSelectRestaurant={handleSelectRestaurant}
      />

      {/* Workers Modal */}
      <WorkersModal
        open={workersModalOpen}
        onOpenChange={setWorkersModalOpen}
      />
    </div>
  );
}