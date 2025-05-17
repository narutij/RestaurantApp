import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";

import AppLayout from "./components/AppLayout";
import RestaurantInfoTab from "./pages/restaurant-tab";
import WorkdayTab from "./pages/workday-tab";
import OrderTab from "./pages/orders-tab";
import KitchenTab from "./pages/kitchen-tab";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/restaurant" component={RestaurantInfoTab} />
        <Route path="/" component={WorkdayTab} />
        <Route path="/orders" component={OrderTab} />
        <Route path="/kitchen" component={KitchenTab} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
