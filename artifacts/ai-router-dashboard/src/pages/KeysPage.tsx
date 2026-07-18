import { useEffect, useState } from "react";
import { getKeys, createKey, deleteKey, type ApiKey } from "../api.ts";
import { Plus, Trash2, Copy, Check } from "lucide-react";

export function KeysPage() {
  const [keys, setKeys]       = useState<ApiKey[]>([]);
  const [label, setLabel]     = useState("");
  const [newKey, setNewKey]   = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    getKeys().then(setKeys).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    const res = await createKey(label.trim());
    setNewKey(res.key);
    setLabel("");
    const updated = await getKeys();
    setKeys(updated);
  }

  async function handleDelete(id: number) {
    if (!confirm("Revoke this key?")) return;
    await deleteKey(id);
    setKeys(keys.filter(k => k.id !== id));
  }

  function copyKey() {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-1">API Keys</h1>
      <p className="text-slate-400 text-sm mb-8">Create named keys for different environments (dev, staging, production).</p>

      {/* New key reveal */}
      {newKey && (
        <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl p-5">
          <p className="text-xs text-green-400 font-medium uppercase tracking-wider mb-2">New key — save this, it won't be shown again</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-sm text-green-300 font-mono break-all">{newKey}</code>
            <button onClick={copyKey}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-300 text-xs transition-colors">
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="mb-8 flex gap-3">
        <input
          value={label} onChange={e => setLabel(e.target.value)}
          placeholder="e.g. production, staging, mobile-app"
          className="flex-1 bg-[#18181f] border border-[#2a2a35] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button type="submit"
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors">
          <Plus size={15} /> Create key
        </button>
      </form>

      {/* Keys list */}
      <div className="bg-[#18181f] border border-[#2a2a35] rounded-xl overflow-hidden">
        {keys.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500 text-sm">No keys yet. Create one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a35]">
                <th className="px-6 py-3 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">Label</th>
                <th className="px-6 py-3 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">Prefix</th>
                <th className="px-6 py-3 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">Rate limit</th>
                <th className="px-6 py-3 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">Created</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="border-b border-[#2a2a35]/50 hover:bg-white/2 transition-colors">
                  <td className="px-6 py-3 text-white font-medium">{k.label}</td>
                  <td className="px-6 py-3 font-mono text-xs text-slate-400">{k.keyPrefix}…</td>
                  <td className="px-6 py-3 text-slate-400">{k.rpmLimit} rpm</td>
                  <td className="px-6 py-3 text-slate-500 text-xs">{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => handleDelete(k.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
