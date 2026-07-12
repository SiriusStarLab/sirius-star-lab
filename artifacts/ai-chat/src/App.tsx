import { useState, useEffect } from "react";
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
import { DreamLabPage } from "@/pages/dream-lab";
import { WellbeingPage } from "@/pages/wellbeing";
import { UniversePage } from "@/pages/universe";
import { DiscoverPage } from "@/pages/discover";
import { LearnPage } from "@/pages/learn";
import { ComparePage } from "@/pages/compare";
import { AuthGate } from "@/components/auth-gate";
import NotFound from "@/pages/not-found";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { LabAuthGate } from "@/components/lab-auth-gate";
import { SWUpdateBanner } from "@/components/sw-update-banner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 1000 * 60 * 5,
    }
  }
});

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Router() {
  return (
    <Switch>
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/checkout/success" component={CheckoutSuccessPage} />
      <Route path="/checkout/cancel" component={CheckoutCancelPage} />
      <Route path="/star-lab" component={() => <LabAuthGate><StarLabPage /></LabAuthGate>} />
      <Route path="/dream-lab" component={DreamLabPage} />
      <Route path="/wellbeing" component={WellbeingPage} />
      <Route path="/universe" component={UniversePage} />
      <Route path="/admin" component={() => <LabAuthGate><StarLabPage /></LabAuthGate>} />
      <Route path="/learn" component={LearnPage} />
      <Route path="/why-sirius" component={MarketingPage} />
      <Route path="/agency" component={MarketingPage} />
      <Route path="/pricing" component={MarketingPage} />
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

function isLocallyAuthenticated(): boolean {
  const userId = localStorage.getItem("sirius_user_id");
  return !!userId && (userId.startsWith("acct_") || userId === "garry");
}

function App() {
  // Start authenticated if localStorage has a valid userId (fast path, same device)
  const [authed, setAuthed] = useState(() => isLocallyAuthenticated());
  const [sessionChecked, setSessionChecked] = useState(() => isLocallyAuthenticated());

  useEffect(() => {
    // Already authed via localStorage — no need to hit the server
    if (authed) return;

    // Try to restore from server-side session cookie (cross-device / cleared localStorage)
    fetch(`${BASE}/api/auth/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.userId) {
          localStorage.setItem("sirius_user_id", data.userId);
          if (data.email) localStorage.setItem("sirius_account_email", data.email);
          setAuthed(true);
        }
      })
      .catch(() => { /* network error — show auth gate */ })
      .finally(() => setSessionChecked(true));
  }, []);

  // Brief loading state while we check the session cookie
  if (!sessionChecked) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0D1E3A 0%, #0F2040 40%, #0A1830 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(0,196,255,0.3)", borderTopColor: "#00C4FF", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!authed) {
    return <AuthGate onAuth={(userId) => {
      setAuthed(true);
    }} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
        <PWAInstallPrompt />
        <SWUpdateBanner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
