const BASE = import.meta.env.VITE_ROUTER_API ?? "http://localhost:5000";

function getToken(): string | null {
  return localStorage.getItem("router_token");
}

async function req<T>(method: string, path: string, body?: unknown, raw = false): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !raw ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as T;
}

// Auth
export const signup = (email: string, password: string, plan = "dev") =>
  req<{ token: string; customer: Customer; apiKey: string }>("POST", "/auth/signup", { email, password, plan });

export const login = (email: string, password: string) =>
  req<{ token: string; customer: Customer }>("POST", "/auth/login", { email, password });

// Account
export const getMe = () => req<Customer>("GET", "/account/me");
export const getUsage = (period = "today") => req<UsageData>("GET", `/account/usage?period=${period}`);
export const getKeys = () => req<ApiKey[]>("GET", "/account/keys");
export const createKey = (label: string) => req<{ key: string; id: number; label: string }>("POST", "/account/keys", { label });
export const deleteKey = (id: number) => req<{ ok: boolean }>("DELETE", `/account/keys/${id}`);
export const getAliases = () => req<Alias[]>("GET", "/account/aliases");
export const createAlias = (alias: string, targetModel: string) => req<Alias>("POST", "/account/aliases", { alias, targetModel });
export const deleteAlias = (id: number) => req<{ ok: boolean }>("DELETE", `/account/aliases/${id}`);
export const getFallbacks = () => req<Fallback[]>("GET", "/account/fallbacks");
export const createFallback = (primaryModel: string, fallbackModels: string[]) =>
  req<Fallback>("POST", "/account/fallbacks", { primaryModel, fallbackModels });
export const deleteFallback = (id: number) => req<{ ok: boolean }>("DELETE", `/account/fallbacks/${id}`);

// Billing
export const getBalance = () => req<{ balanceUsd: number; plan: string }>("GET", "/billing/balance");
export const getPlans = () => req<{ plans: Plan[]; creditPacks: CreditPack[] }>("GET", "/billing/plans");
export const buyCredits = (packId: string) => req<{ url: string }>("POST", "/billing/checkout", { packId });

// Types
export type Customer = { id: number; email: string; plan: string; balanceUsd: number; createdAt: string };
export type ApiKey = { id: number; label: string; keyPrefix: string; isActive: boolean; rpmLimit: number; createdAt: string };
export type Alias = { id: number; customerId: number; alias: string; targetModel: string; createdAt: string };
export type Fallback = { id: number; primaryModel: string; fallbackModels: string[]; createdAt: string };
export type Plan = { id: string; name: string; priceMonthly: number; description: string };
export type CreditPack = { id: string; usd: number; credits: number; label: string };
export type UsageData = {
  period: string;
  byModel: { model: string; requests: number; promptTokens: number; completionTokens: number; costUsd: number; cached: number }[];
  totals: { totalRequests: number; totalCostUsd: number; cachedHits: number };
};
