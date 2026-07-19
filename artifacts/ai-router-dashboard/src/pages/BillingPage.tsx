import { useEffect, useState } from "react";
import { getBalance, getPlans, buyCredits, type Plan, type CreditPack } from "../api.ts";

function toTokens(usd: number) {
  return Math.round(usd * 100).toLocaleString();
}

export function BillingPage() {
  const [balance, setBalance]   = useState(0);
  const [plan, setPlan]         = useState("dev");
  const [plans, setPlans]       = useState<Plan[]>([]);
  const [packs, setPacks]       = useState<CreditPack[]>([]);
  const [loading, setLoading]   = useState(true);
  const [buying, setBuying]     = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getBalance(), getPlans()])
      .then(([b, p]) => { setBalance(b.balanceUsd); setPlan(b.plan); setPlans(p.plans); setPacks(p.creditPacks); })
      .finally(() => setLoading(false));

    if (window.location.search.includes("success=1")) {
      getBalance().then(b => setBalance(b.balanceUsd));
    }
  }, []);

  async function handleBuy(packId: string) {
    setBuying(packId);
    try {
      const { url } = await buyCredits(packId);
      if (url) window.location.href = url;
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBuying(null);
    }
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;

  const LOW_TOKENS = 500;
  const balanceTokens = Math.round(balance * 100);

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-1">Billing</h1>
      <p className="text-slate-400 text-sm mb-8">Manage your tokens and subscription.</p>

      {/* Token balance */}
      <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-6 mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Token balance</p>
          <p className={`text-4xl font-bold mt-1 ${balanceTokens < LOW_TOKENS ? "text-red-400" : "text-green-400"}`}>
            {toTokens(balance)} <span className="text-xl font-normal text-slate-400">tokens</span>
          </p>
          <p className="text-xs text-slate-500 mt-1 capitalize">{plan} plan · 100 tokens = $1</p>
        </div>
        {balanceTokens < LOW_TOKENS && (
          <div className="text-right">
            <span className="text-2xl">⚠️</span>
            <p className="text-red-400 text-xs mt-1">Low tokens</p>
          </div>
        )}
      </div>

      {/* Token packs */}
      <h2 className="text-base font-semibold text-white mb-4">Top up tokens</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {packs.map(pack => (
          <button key={pack.id}
            onClick={() => handleBuy(pack.id)}
            disabled={!!buying}
            className="bg-[#18181f] border border-[#2a2a35] hover:border-indigo-500/50 rounded-xl p-4 text-left transition-all disabled:opacity-50 group">
            <p className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">
              {(pack.credits * 100).toLocaleString()} tk
            </p>
            <p className="text-xs text-slate-400 mt-0.5">${pack.usd}</p>
            <p className="text-xs text-slate-500 mt-3">{buying === pack.id ? "Redirecting…" : "Pay with card →"}</p>
          </button>
        ))}
      </div>

      {/* Plans */}
      <h2 className="text-base font-semibold text-white mb-4">Plans</h2>
      <div className="space-y-3">
        {plans.map(p => (
          <div key={p.id}
            className={`bg-[#18181f] border rounded-xl p-5 flex items-center justify-between ${
              p.name.toLowerCase() === plan ? "border-indigo-500/50 bg-indigo-500/5" : "border-[#2a2a35]"
            }`}>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold">{p.name}</p>
                {p.name.toLowerCase() === plan && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">Current</span>
                )}
              </div>
              <p className="text-slate-400 text-sm mt-0.5">{p.description}</p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-white font-bold">
                {p.priceMonthly === 0 ? "Free" : `$${p.priceMonthly}/mo`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
