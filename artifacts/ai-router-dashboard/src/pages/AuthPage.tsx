import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login, signup } from "../api.ts";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan]         = useState("dev");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [newKey, setNewKey]     = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        const res = await login(email, password);
        localStorage.setItem("router_token", res.token);
        navigate("/overview");
      } else {
        const res = await signup(email, password, plan);
        localStorage.setItem("router_token", res.token);
        setNewKey(res.apiKey); // Show key before redirecting
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (newKey) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <span className="text-4xl">⚡</span>
            <h1 className="text-2xl font-bold text-white mt-2">Account created!</h1>
            <p className="text-slate-400 mt-1">Save your API key — it's shown only once.</p>
          </div>
          <div className="bg-[#18181f] border border-green-500/30 rounded-xl p-5 mb-4">
            <p className="text-xs text-green-400 font-medium mb-2 uppercase tracking-wider">Your API Key</p>
            <code className="text-sm text-green-300 break-all font-mono">{newKey}</code>
          </div>
          <p className="text-xs text-slate-500 text-center mb-6">
            Use this as your <code className="text-slate-400">Bearer</code> token in all API requests.
          </p>
          <button
            onClick={() => navigate("/overview")}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">⚡</span>
          <h1 className="text-2xl font-bold text-white mt-2">
            {mode === "login" ? "Sign in" : "Create account"}
          </h1>
          <p className="text-slate-400 mt-1">Sirius AI Router</p>
        </div>

        <form onSubmit={submit} className="bg-[#18181f] border border-[#2a2a35] rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full mt-1 bg-[#0f0f13] border border-[#2a2a35] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Password</label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full mt-1 bg-[#0f0f13] border border-[#2a2a35] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Minimum 8 characters"
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Plan</label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {[
                  { id: "dev",      label: "Dev",      price: "Free" },
                  { id: "pro",      label: "Pro",      price: "$49/mo" },
                  { id: "business", label: "Business", price: "$199/mo" },
                ].map(p => (
                  <button
                    key={p.id} type="button"
                    onClick={() => setPlan(p.id)}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                      plan === p.id
                        ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
                        : "border-[#2a2a35] text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <div>{p.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{p.price}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          {mode === "login" ? (
            <>No account? <Link to="/signup" className="text-indigo-400 hover:text-indigo-300">Sign up</Link></>
          ) : (
            <>Already have an account? <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
