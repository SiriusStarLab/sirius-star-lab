/**
 * Sirius Resilient Fetch — Tier 1 Client-Side Request Queue
 * ==========================================================
 * Wraps fetch with:
 * - Automatic retry on network failure or 502/503
 * - Persistent localStorage queue for failed requests
 * - Exponential backoff health polling
 * - Global connection status events
 */

const HEALTH_URL = "/api/health";
const QUEUE_KEY = "sirius_request_queue";
const POLL_INTERVAL_MS = 2500;
const MAX_QUEUE_AGE_MS = 5 * 60 * 1000; // 5 minutes — discard older queued requests

export type ConnectionStatus = "connected" | "reconnecting" | "reconnected";

// ── Event bus for connection status changes ────────────────────────────────
const STATUS_EVENT = "sirius:connection_status";

export function onConnectionStatus(cb: (status: ConnectionStatus) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<ConnectionStatus>).detail);
  window.addEventListener(STATUS_EVENT, handler);
  return () => window.removeEventListener(STATUS_EVENT, handler);
}

function emit(status: ConnectionStatus) {
  window.dispatchEvent(new CustomEvent<ConnectionStatus>(STATUS_EVENT, { detail: status }));
}

// ── Queue persistence ──────────────────────────────────────────────────────
type QueuedRequest = {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  queuedAt: number;
};

function loadQueue(): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const items: QueuedRequest[] = JSON.parse(raw);
    // Drop stale items
    const cutoff = Date.now() - MAX_QUEUE_AGE_MS;
    return items.filter(i => i.queuedAt > cutoff);
  } catch {
    return [];
  }
}

function saveQueue(q: QueuedRequest[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* storage full */ }
}

function enqueue(req: Omit<QueuedRequest, "id" | "queuedAt">) {
  const q = loadQueue();
  q.push({ ...req, id: Math.random().toString(36).slice(2), queuedAt: Date.now() });
  saveQueue(q);
}

function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

// ── Health polling state ───────────────────────────────────────────────────
let pollingActive = false;
let pollingTimer: ReturnType<typeof setTimeout> | null = null;

async function pollUntilHealthy(): Promise<void> {
  if (pollingActive) return;
  pollingActive = true;
  emit("reconnecting");

  return new Promise(resolve => {
    const attempt = async () => {
      try {
        const res = await fetch(HEALTH_URL, { cache: "no-store" });
        if (res.ok) {
          pollingActive = false;
          pollingTimer = null;
          emit("reconnected");
          await flushQueue();
          // Reset to connected after brief "Reconnected" display
          setTimeout(() => emit("connected"), 3000);
          resolve();
          return;
        }
      } catch { /* still down */ }
      pollingTimer = setTimeout(attempt, POLL_INTERVAL_MS);
    };
    attempt();
  });
}

// ── Queue flush ────────────────────────────────────────────────────────────
type QueueFlushResult = { succeeded: number; failed: number };

async function flushQueue(): Promise<QueueFlushResult> {
  const q = loadQueue();
  if (q.length === 0) return { succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  const remaining: QueuedRequest[] = [];

  for (const item of q) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body || undefined,
      });
      if (res.ok || res.status < 500) {
        succeeded++;
      } else {
        failed++;
        remaining.push(item);
      }
    } catch {
      failed++;
      remaining.push(item);
    }
  }

  saveQueue(remaining);
  return { succeeded, failed };
}

// ── Retryable error detection ─────────────────────────────────────────────
function isRetryableError(error: unknown, status?: number): boolean {
  if (status === 502 || status === 503 || status === 504) return true;
  if (error instanceof TypeError && error.message.includes("fetch")) return true;
  if (error instanceof DOMException && error.name === "NetworkError") return true;
  return false;
}

// ── Main resilient fetch export ────────────────────────────────────────────
export async function resilientFetch(
  url: string,
  options: RequestInit = {},
  opts: { queue?: boolean; retries?: number } = {}
): Promise<Response> {
  const { queue = true, retries = 1 } = opts;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (isRetryableError(null, res.status)) {
        throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      }
      return res;
    } catch (err: any) {
      if (!isRetryableError(err, err?.status)) throw err; // non-retryable
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      // All retries exhausted — queue if requested
      if (queue && options.method === "POST" && options.body) {
        const headers: Record<string, string> = {};
        if (options.headers) {
          const h = new Headers(options.headers as HeadersInit);
          h.forEach((v, k) => { headers[k] = v; });
        }
        enqueue({ url, method: options.method, headers, body: options.body as string });
      }
      // Start health polling if not already running
      pollUntilHealthy();
      throw err;
    }
  }
  throw new Error("unreachable");
}

export { loadQueue, clearQueue };
