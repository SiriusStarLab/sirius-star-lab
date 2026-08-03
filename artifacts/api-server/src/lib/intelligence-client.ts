const INTELLIGENCE_URL = process.env.INTELLIGENCE_URL || "http://127.0.0.1:3001";

async function post(path: string, body: unknown): Promise<void> {
  try {
    const res = await fetch(`${INTELLIGENCE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.warn(`[intelligence-client] ${path} returned ${res.status}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[intelligence-client] ${path} failed: ${msg}`);
  }
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${INTELLIGENCE_URL}${path}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export const intelligence = {
  syncContext: (userId: string, source: "chat" | "star_lab" | "dream_lab" | "voice", snapshot: string, metadata?: Record<string, unknown>) =>
    post("/context/sync", { userId, source, snapshot, metadata }),

  observeMemory: (userId: string, type: "preference" | "pattern" | "goal" | "fact" | "behaviour", key: string, value: unknown) =>
    post("/memory/observe", { userId, type, key, value }),

  logEvent: (userId: string, eventType: string, source: string, data?: unknown) =>
    post("/events", { userId, eventType, source, data }),

  getBriefing: (userId: string) =>
    get<{ briefing: { text: string } | string; cached: boolean; date: string }>(`/briefing/${userId}`),

  getInsights: (userId: string) =>
    get<{ insights: Array<{ type: string; message: string; priority: string }> }>(`/analyze/${userId}/insights`),

  getMemoryPrompt: (userId: string) =>
    get<{ prompt: string }>(`/memory/${userId}/prompt`),

  getUnifiedContext: (userId: string) =>
    get<{ formatted: string; entries: unknown[] }>(`/context/${userId}/unified`),
};
