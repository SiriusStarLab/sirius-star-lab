import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatPage } from "@/pages/chat";
import { TermsPage } from "@/pages/terms";
import { PrivacyPage } from "@/pages/privacy";
import { CheckoutSuccessPage } from "@/pages/checkout-success";
import { CheckoutCancelPage } from "@/pages/checkout-cancel";
import { StarLabPage } from "@/pages/star-lab";
import { MarketingPage } from "@/pages/marketing";
import { DiscoverPage } from "@/pages/discover";
import { LearnPage } from "@/pages/learn";
import { ComparePage } from "@/pages/compare";
import NotFound from "@/pages/not-found";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 1000 * 60 * 5,
    }
  }
});

function Router() {
  return (
    <Switch>
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/checkout/success" component={CheckoutSuccessPage} />
      <Route path="/checkout/cancel" component={CheckoutCancelPage} />
      <Route path="/star-lab" component={StarLabPage} />
      <Route path="/learn" component={LearnPage} />
      <Route path="/why-sirius" component={MarketingPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/discover" component={DiscoverPage} />
      {/*
        ChatPage is the catch-all — it handles "/" and "/c/:id" internally
        via useRoute(). By using a single Route element for both paths, the
        component is never unmounted during navigation between them, which
        preserves in-flight state (messages, streaming) across route changes.
      */}
      <Route component={ChatPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
        <PWAInstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
