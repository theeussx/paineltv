import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TVs from "./pages/TVs";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Locations from "./pages/Locations";
import Logs from "./pages/Logs";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/tvs" component={TVs} />
      <Route path="/settings" component={Settings} />
      <Route path="/users" component={Users} />
      <Route path="/locations" component={Locations} />
      <Route path="/locations/:locationId/tvs" component={TVs} />
      <Route path="/locations/:locationId/users" component={Users} />
      <Route path="/logs" component={Logs} />
      <Route path="/locations/:locationId/logs" component={Logs} />
      <Route path="/404" component={NotFound} />
      <Route component={Login} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
