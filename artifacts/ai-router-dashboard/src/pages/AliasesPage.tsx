import { useEffect, useState } from "react";
import { getAliases, createAlias, deleteAlias, getFallbacks, createFallback, deleteFallback, type Alias, type Fallback } from "../api.ts";
import { Plus, Trash2, ArrowRight } from "lucide-react";

const POPULAR_MODELS = [
  "anthropic/claude-opus-4",
  "anthropic/claude-sonnet-4-5",
  "anthropic/claude-haiku-4-5",
  "gpt-4o",
  "gpt-4o-mini",
  "meta-llama/llama-3.1-70b-instruct",
  "mistralai/mistral-large",
];

export function AliasesPage() {
  const [aliases, setAliases]     = useState<Alias[]>([]);
  const [fallbacks, setFallbacks] = useState<Fallback[]>([]);
  const [aliasName, setAliasName] = useState("");
  const [aliasTarget, setAliasTarget] = useState(POPULAR_MODELS[2]!);
  const [fbPrimary, setFbPrimary] = useState(POPULAR_MODELS[0]!);
  const [fbFallback, setFbFallback] = useState(POPULAR_MODELS[2]!);

  useEffect(() => {
    getAliases().then(setAliases);
    getFallbacks().then(setFallbacks);
  }, []);

  async function handleAlias(e: React.FormEvent) {
    e.preventDefault();
    if (!aliasName.trim()) return;
    await createAlias(aliasName.trim(), aliasTarget);
    setAliasName("");
    setAliases(await getAliases());
  }

  async function handleFallback(e: React.FormEvent) {
    e.preventDefault();
    await createFallback(fbPrimary, [fbFallback]);
    setFallbacks(await getFallbacks());
  }

  return (
    <div className="p-8 max-w-3xl space-y-10">
      {/* Aliases */}
      <section>
        <h1 className="text-2xl font-bold text-white mb-1">Model Aliases</h1>
        <p className="text-slate-400 text-sm mb-6">
          Map a custom name to any model. Use <code className="text-indigo-300">my-fast</code> in your code and swap models here without touching your app.
        </p>
        <form onSubmit={handleAlias} className="mb-6 grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Alias name</label>
            <input value={aliasName} onChange={e => setAliasName(e.target.value)}
              placeholder="my-fast-model"
              className="w-full bg-[#18181f] border border-[#2a2a35] rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <ArrowRight size={16} className="text-slate-600 mb-2.5 mt-auto" />
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Target model</label>
            <select value={aliasTarget} onChange={e => setAliasTarget(e.target.value)}
              className="w-full bg-[#18181f] border border-[#2a2a35] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
              {POPULAR_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button type="submit" className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors mb-0">
            <Plus size={14} /> Add
          </button>
        </form>
        <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl overflow-hidden">
          {aliases.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500 text-sm">No aliases yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#2a2a35]">
                <th className="px-5 py-3 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">Alias</th>
                <th className="px-5 py-3 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">Maps to</th>
                <th className="px-5 py-3" />
              </tr></thead>
              <tbody>
                {aliases.map(a => (
                  <tr key={a.id} className="border-b border-[#2a2a35]/50">
                    <td className="px-5 py-3 font-mono text-xs text-green-300">{a.alias}</td>
                    <td className="px-5 py-3 font-mono text-xs text-indigo-300">{a.targetModel}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => deleteAlias(a.id).then(() => setAliases(aliases.filter(x => x.id !== a.id)))}
                        className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Fallbacks */}
      <section>
        <h2 className="text-xl font-bold text-white mb-1">Model Fallbacks</h2>
        <p className="text-slate-400 text-sm mb-6">
          If your primary model is down or rate-limited, automatically retry with a backup. Transparent to your app.
        </p>
        <form onSubmit={handleFallback} className="mb-6 grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Primary model</label>
            <select value={fbPrimary} onChange={e => setFbPrimary(e.target.value)}
              className="w-full bg-[#18181f] border border-[#2a2a35] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
              {POPULAR_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <ArrowRight size={16} className="text-slate-600 mb-2.5 mt-auto" />
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Fallback model</label>
            <select value={fbFallback} onChange={e => setFbFallback(e.target.value)}
              className="w-full bg-[#18181f] border border-[#2a2a35] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
              {POPULAR_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button type="submit" className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors">
            <Plus size={14} /> Add
          </button>
        </form>
        <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl overflow-hidden">
          {fallbacks.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500 text-sm">No fallbacks configured.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#2a2a35]">
                <th className="px-5 py-3 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">Primary</th>
                <th className="px-5 py-3 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">Fallback chain</th>
                <th className="px-5 py-3" />
              </tr></thead>
              <tbody>
                {fallbacks.map(f => (
                  <tr key={f.id} className="border-b border-[#2a2a35]/50">
                    <td className="px-5 py-3 font-mono text-xs text-indigo-300">{f.primaryModel}</td>
                    <td className="px-5 py-3 font-mono text-xs text-orange-300">{(f.fallbackModels as string[]).join(" → ")}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => deleteFallback(f.id).then(() => setFallbacks(fallbacks.filter(x => x.id !== f.id)))}
                        className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
