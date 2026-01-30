import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WorkdayProvider } from "@/contexts/WorkdayContext";
import { TabProvider } from "@/contexts/TabContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";

import AppLayout from "./components/AppLayout";
import Login from "@/components/Login";

function MainApp() {
  const { appUser } = useAuth();

  if (!appUser) {
    return <Login />;
  }

  return (
    <WebSocketProvider>
      <NotificationProvider>
        <TabProvider>
          <WorkdayProvider>
            <AppLayout />
          </WorkdayProvider>
        </TabProvider>
      </NotificationProvider>
    </WebSocketProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <LanguageProvider>
          <TooltipProvider>
            <AuthProvider>
              <MainApp />
            </AuthProvider>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
