import React, { useState } from "react";
import { Check, Loader2, LockKeyhole, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { getApiBase } from "@/lib/api-base";
import { getUserId } from "@/lib/user-id";
import { useSubscription } from "@/hooks/use-subscription";

type ProAccessGateProps = {
  featureName: "Dream Lab" | "Star Lab";
  children: React.ReactNode;
};

function isSignedIn(userId: string) {
  return userId === "garry" || userId.startsWith("acct_");
}

export function ProAccessGate({ featureName, children }: ProAccessGateProps) {
  const [, setLocation] = useLocation();
  const { isLoading, isPro, status } = useSubscription();
  const userId = getUserId();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const authenticated = isSignedIn(userId);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`${getApiBase()}auth/${authMode === "signup" ? "signup" : "login"}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.userId) {
        throw new Error(data.error || "We could not sign you in. Please try again.");
      }
      localStorage.setItem("sirius_user_id", data.userId);
      localStorage.setItem("sirius_account_email", data.email || email.trim().toLowerCase());
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not sign you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProCheckout = async () => {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`${getApiBase()}stripe/checkout`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier: "pro" }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || "We could not start checkout. Please try again.");
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not start checkout. Please try again.");
      setSubmitting(false);
    }
  };

  if (isLoading && authenticated) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#080c1a]">
        <Loader2 className="w-7 h-7 animate-spin text-cyan-300" />
      </div>
    );
  }

  if (authenticated && isPro) return <>{children}</>;

  const needsAccount = !authenticated;
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,212,255,0.14),_transparent_42%),linear-gradient(160deg,_#04081a,_#080d20_58%,_#050914)] text-white flex items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-cyan-300/15 bg-[#0d1428]/95 p-7 shadow-[0_24px_90px_rgba(0,0,0,0.45)]">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/25 bg-amber-300/10">
          <Sparkles className="h-6 w-6 text-amber-300" />
        </div>
        <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">Sirius Pro</p>
        <h1 className="text-center text-2xl font-bold">{featureName}</h1>
        <p className="mt-3 text-center text-sm leading-6 text-white/60">
          {needsAccount
            ? `Create a Sirius account or sign in to access ${featureName}.`
            : `${featureName} is included with Sirius Pro for £19.99 per month.`}
        </p>

        {needsAccount ? (
          <form className="mt-7 space-y-4" onSubmit={handleAuth}>
            <div className="grid grid-cols-2 rounded-xl bg-white/5 p-1 text-sm">
              <button type="button" onClick={() => setAuthMode("signin")} className={`rounded-lg py-2 font-medium ${authMode === "signin" ? "bg-cyan-300 text-[#06101d]" : "text-white/55"}`}>Sign in</button>
              <button type="button" onClick={() => setAuthMode("signup")} className={`rounded-lg py-2 font-medium ${authMode === "signup" ? "bg-cyan-300 text-[#06101d]" : "text-white/55"}`}>Create account</button>
            </div>
            <label className="block text-sm text-white/70">
              Email address
              <input type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-white outline-none focus:border-cyan-300/70" />
            </label>
            <label className="block text-sm text-white/70">
              Password
              <input type="password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} autoComplete={authMode === "signin" ? "current-password" : "new-password"} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-white outline-none focus:border-cyan-300/70" />
            </label>
            {error && <p className="text-center text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3.5 font-bold text-[#06101d] disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {authMode === "signin" ? "Sign in to continue" : "Create account"}
            </button>
          </form>
        ) : (
          <div className="mt-7 space-y-4">
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4">
              <p className="font-semibold text-amber-200">Sirius Pro · £19.99/month</p>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />Dream Lab included</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />Star Lab included</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />Unlimited Sirius messages</li>
              </ul>
            </div>
            {status.tier === "plus" && <p className="text-center text-xs leading-5 text-white/45">Your Sirius Plus plan does not include the Labs. Upgrade to Pro to continue.</p>}
            {error && <p className="text-center text-sm text-red-300">{error}</p>}
            <button type="button" onClick={handleProCheckout} disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3.5 font-bold text-[#241505] disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue to secure checkout
            </button>
          </div>
        )}

        <button type="button" onClick={() => setLocation("/")} className="mt-5 w-full text-center text-xs text-white/40 hover:text-white/70">Back to Sirius</button>
      </section>
    </main>
  );
}