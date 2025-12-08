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
import PdfSplit from "@/pages/tools/pdf-split";
import PdfLock from "@/pages/tools/pdf-lock";
import PdfUnlock from "@/pages/tools/pdf-unlock";
import ImageCompress from "@/pages/tools/image-compress";
import ImageResize from "@/pages/tools/image-resize";
import ImageConvert from "@/pages/tools/image-convert";
import BgRemove from "@/pages/tools/bg-remove";
import CsvToExcel from "@/pages/tools/csv-to-excel";
import ExcelClean from "@/pages/tools/excel-clean";
import JsonFormat from "@/pages/tools/json-format";
import PdfToImage from "@/pages/tools/pdf-to-image";
import PdfWatermark from "@/pages/tools/pdf-watermark";
import PdfRotate from "@/pages/tools/pdf-rotate";
import ImageToPdf from "@/pages/tools/image-to-pdf";

import AIChat from "@/pages/ai/chat";
import AISummary from "@/pages/ai/summary";
import AIInvoice from "@/pages/ai/invoice";
import AIResume from "@/pages/ai/resume";
import AILegal from "@/pages/ai/legal";
import AIDataClean from "@/pages/ai/data-clean";
import AIVoice from "@/pages/ai/voice";

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tools" component={Tools} />
      <Route path="/tools/pdf-to-word" component={PdfToWord} />
      <Route path="/tools/word-to-pdf" component={WordToPdf} />
      <Route path="/tools/pdf-merge" component={PdfMerge} />
      <Route path="/tools/pdf-compress" component={PdfCompress} />
      <Route path="/tools/pdf-split" component={PdfSplit} />
      <Route path="/tools/pdf-lock" component={PdfLock} />
      <Route path="/tools/pdf-unlock" component={PdfUnlock} />
      <Route path="/tools/image-compress" component={ImageCompress} />
      <Route path="/tools/image-resize" component={ImageResize} />
      <Route path="/tools/image-convert" component={ImageConvert} />
      <Route path="/tools/bg-remove" component={BgRemove} />
      <Route path="/tools/csv-to-excel" component={CsvToExcel} />
      <Route path="/tools/excel-clean" component={ExcelClean} />
      <Route path="/tools/json-format" component={JsonFormat} />
      <Route path="/tools/pdf-to-image" component={PdfToImage} />
      <Route path="/tools/pdf-watermark" component={PdfWatermark} />
      <Route path="/tools/pdf-rotate" component={PdfRotate} />
      <Route path="/tools/image-to-pdf" component={ImageToPdf} />
      <Route path="/ai" component={AIFeatures} />
      <Route path="/ai/chat" component={AIChat} />
      <Route path="/ai/summary" component={AISummary} />
      <Route path="/ai/invoice" component={AIInvoice} />
      <Route path="/ai/resume" component={AIResume} />
      <Route path="/ai/legal" component={AILegal} />
      <Route path="/ai/data-clean" component={AIDataClean} />
      <Route path="/ai/voice" component={AIVoice} />
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
