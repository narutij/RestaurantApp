import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";

import AppLayout from "./components/AppLayout";
import RestaurantInfoTab from "./pages/restaurant-tab";
import WorkdayTab from "./pages/workday-tab";
import OrderTab from "./pages/orders-tab";
import KitchenTab from "./pages/kitchen-tab";
import HistoryTab from "./pages/history-tab";
import SettingsTab from "./pages/settings-tab";
import NotFound from "@/pages/not-found";
import Login from "@/components/Login";

function Router() {
  const { appUser } = useAuth();

  if (!appUser) {
    return <Login />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={() => <Redirect to="/workday" />} />
        <Route path="/restaurant" component={RestaurantInfoTab} />
        <Route path="/workday" component={WorkdayTab} />
        <Route path="/orders" component={OrderTab} />
        <Route path="/kitchen" component={KitchenTab} />
        <Route path="/history" component={HistoryTab} />
        <Route path="/settings" component={SettingsTab} />
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
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
