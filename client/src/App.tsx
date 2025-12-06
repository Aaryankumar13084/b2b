import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Tools from "@/pages/tools";
import AIFeatures from "@/pages/ai-features";
import History from "@/pages/history";
import Subscription from "@/pages/subscription";
import Settings from "@/pages/settings";
import AdminDashboard from "@/pages/admin/index";
import AdminUsers from "@/pages/admin/users";
import AdminAnalytics from "@/pages/admin/analytics";

import PdfToWord from "@/pages/tools/pdf-to-word";
import WordToPdf from "@/pages/tools/word-to-pdf";
import PdfMerge from "@/pages/tools/pdf-merge";
import PdfCompress from "@/pages/tools/pdf-compress";

import AIChat from "@/pages/ai/chat";
import AISummary from "@/pages/ai/summary";

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tools" component={Tools} />
      <Route path="/tools/pdf-to-word" component={PdfToWord} />
      <Route path="/tools/word-to-pdf" component={WordToPdf} />
      <Route path="/tools/pdf-merge" component={PdfMerge} />
      <Route path="/tools/pdf-compress" component={PdfCompress} />
      <Route path="/ai" component={AIFeatures} />
      <Route path="/ai/chat" component={AIChat} />
      <Route path="/ai/summary" component={AISummary} />
      <Route path="/history" component={History} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return <AuthenticatedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
