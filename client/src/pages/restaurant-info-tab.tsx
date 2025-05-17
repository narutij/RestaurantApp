import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Palette, 
  Store, 
  MenuSquare, 
  Grid2X2, 
  LogOut
} from 'lucide-react';

export default function RestaurantInfoTab() {
  // Mock user data - in a real app this would come from authentication
  const user = {
    name: "John Doe",
    role: "Restaurant Manager",
    avatar: "" // Empty for now, will use fallback
  };

  // Navigation options
  const options = [
    { icon: <Palette className="mr-2 h-5 w-5" />, label: "App Theme", href: "#theme" },
    { icon: <Store className="mr-2 h-5 w-5" />, label: "Restaurants", href: "#restaurants" },
    { icon: <MenuSquare className="mr-2 h-5 w-5" />, label: "Menus", href: "#menus" },
    { icon: <Grid2X2 className="mr-2 h-5 w-5" />, label: "Table Layouts", href: "#tables" },
  ];

  const handleLogout = () => {
    // In a real app, this would call a logout function
    console.log("Logout clicked");
  };

  return (
    <div className="p-4 flex flex-col min-h-[calc(100vh-70px)]">
      {/* User avatar block */}
      <div className="flex flex-col items-center mb-10 mt-4">
        <Avatar className="h-20 w-20 mb-3">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="text-xl bg-primary text-primary-foreground">
            {user.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-semibold">{user.name}</h2>
        <p className="text-muted-foreground text-sm">{user.role}</p>
      </div>
      
      {/* Option buttons */}
      <div className="space-y-2 flex-1">
        {options.map((option, index) => (
          <Button 
            key={index} 
            variant="ghost" 
            className="w-full justify-start text-base py-6"
            onClick={() => console.log(`Clicked: ${option.label}`)}
          >
            {option.icon}
            {option.label}
          </Button>
        ))}
      </div>
      
      {/* Logout button at the bottom */}
      <div className="mt-auto mb-6">
        <Button 
          variant="destructive" 
          className="w-full py-6 text-base"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-5 w-5" />
          Log out
        </Button>
      </div>
    </div>
  );
}