import { useEffect, useState } from "react";
import { getMe, getUsage, type Customer, type UsageData } from "../api.ts";
import { Zap, DollarSign, Database, TrendingUp } from "lucide-react";

const PERIODS = ["today", "week", "month"] as const;

export function OverviewPage() {
  const [customer, setCustomer]   = useState<Customer | null>(null);
  const [usage, setUsage]         = useState<UsageData | null>(null);
  const [period, setPeriod]       = useState<"today" | "week" | "month">("today");
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getMe(), getUsage(period)])
      .then(([c, u]) => { setCustomer(c); setUsage(u); })
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;

  const balance   = customer ? Number(customer.balanceUsd) : 0;
  const totalCost = usage?.totals?.totalCostUsd ?? 0;
  const totalReqs = usage?.totals?.totalRequests ?? 0;
  const cached    = usage?.totals?.cachedHits ?? 0;
  const cacheRate = totalReqs > 0 ? Math.round((cached / totalReqs) * 100) : 0;

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-slate-400 text-sm mt-0.5">{customer?.email} · <span className="capitalize">{customer?.plan}</span> plan</p>
        </div>
        <div className="flex gap-1 bg-[#18181f] border border-[#2a2a35] rounded-lg p-1">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                period === p ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Balance",      value: `$${balance.toFixed(2)}`,  icon: DollarSign, color: balance < 5 ? "text-red-400" : "text-green-400"  },
          { label: "Cost",         value: `$${Number(totalCost).toFixed(4)}`, icon: TrendingUp, color: "text-orange-400" },
          { label: "Requests",     value: totalReqs.toLocaleString(), icon: Zap,         color: "text-indigo-400" },
          { label: "Cache hit %",  value: `${cacheRate}%`,            icon: Database,    color: "text-cyan-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</span>
              <Icon size={14} className={color} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Balance warning */}
      {balance < 5 && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <span className="text-red-400 text-xl">⚠️</span>
          <div>
            <p className="text-red-300 font-medium text-sm">Low balance — ${balance.toFixed(2)} remaining</p>
            <p className="text-red-400/70 text-xs mt-0.5">
              <a href="/dashboard/billing" className="underline">Top up credits</a> to keep your API working.
            </p>
          </div>
        </div>
      )}

      {/* Usage by model table */}
      <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2a35]">
          <h2 className="text-sm font-semibold text-white">Usage by model</h2>
        </div>
        {(usage?.byModel?.length ?? 0) === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500 text-sm">No requests yet for this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a35]">
                {["Model", "Requests", "Input tokens", "Output tokens", "Cost", "Cached"].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usage?.byModel.map(row => (
                <tr key={row.model} className="border-b border-[#2a2a35]/50 hover:bg-white/2 transition-colors">
                  <td className="px-6 py-3 font-mono text-xs text-indigo-300">{row.model}</td>
                  <td className="px-6 py-3 text-slate-300">{Number(row.requests).toLocaleString()}</td>
                  <td className="px-6 py-3 text-slate-400">{Number(row.promptTokens).toLocaleString()}</td>
                  <td className="px-6 py-3 text-slate-400">{Number(row.completionTokens).toLocaleString()}</td>
                  <td className="px-6 py-3 text-orange-400">${Number(row.costUsd).toFixed(4)}</td>
                  <td className="px-6 py-3 text-cyan-400">{row.cached}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
