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

  // Feature 1: Semantic memory search
  searchMemory: (userId: string, query: string, limit = 8) =>
    fetch(`${process.env.INTELLIGENCE_URL || "http://127.0.0.1:3001"}/memory/${userId}/search`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit }),
      signal: AbortSignal.timeout(4000),
    }).then(r => r.ok ? r.json() : null).catch(() => null) as Promise<{ results: Array<{ memory_type: string; key: string; value: unknown }> } | null>,

  // Feature 2: Emotional weight tracker
  observeEmotion: (userId: string, conversationSnippet: string, sessionId?: string) =>
    post(`/emotion/${userId}/observe`, { conversationSnippet, sessionId }),

  getEmotionalState: (userId: string) =>
    get<{ current: { emotion_state: string; energy_level: number; triggers: string[]; recorded_at: string } | null }>(`/emotion/${userId}/current`),

  // Feature 3: Contradiction detector
  getContradictions: (userId: string) =>
    get<{ contradictions: unknown[]; count: number }>(`/contradictions/${userId}`),

  // Feature 4: Procedural memory
  storeProcedure: (userId: string, problemType: string, title: string, steps: string, tags?: string[]) =>
    post(`/procedures/${userId}/store`, { problem_type: problemType, title, solution_steps: steps, context_tags: tags }),

  matchProcedure: (userId: string, problem: string) =>
    fetch(`${process.env.INTELLIGENCE_URL || "http://127.0.0.1:3001"}/procedures/${userId}/match`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem }),
      signal: AbortSignal.timeout(5000),
    }).then(r => r.ok ? r.json() : null).catch(() => null) as Promise<{ match: { title: string; solution_steps: string } | null; confidence: number } | null>,

  // Feature 5: Temporal knowledge graph
  updateBelief: (userId: string, concept: string, belief: string, confidence = 0.8, source = "observation") =>
    post(`/knowledge/${userId}/update`, { concept, belief, confidence, source }),

  getCurrentBeliefs: (userId: string) =>
    get<{ beliefs: Array<{ concept: string; belief: string; confidence: number; recorded_at: string }> }>(`/knowledge/${userId}/current`),
};
