/**
 * Sirius Resilient Fetch — Mobile (Tier 1)
 * ==========================================
 * - Checks NetInfo before every request (offline → immediate queue, no wasted timeout)
 * - On 502/503/network error → queues to AsyncStorage, emits 'reconnecting' status
 * - `flushQueue()` retries all pending items (called from AppContext on foreground resume)
 * - `subscribeToStatus` / `onQueueResolved` let screens react without prop-drilling
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

// ── Types ─────────────────────────────────────────────────────────────────────
export type ConnectionStatus = "connected" | "reconnecting" | "reconnected";

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  screen: string; // 'starlab' | 'dreamlab' — so screens know which queue resolved
  queuedAt: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const QUEUE_KEY = "sirius_message_queue";
const MAX_QUEUE_AGE_MS = 5 * 60 * 1000; // discard after 5 minutes

// ── Global status bus ─────────────────────────────────────────────────────────
let currentStatus: ConnectionStatus = "connected";
const statusListeners = new Set<(s: ConnectionStatus) => void>();

function emitStatus(s: ConnectionStatus) {
  currentStatus = s;
  statusListeners.forEach(l => {
    try { l(s); } catch {}
  });
}

export function subscribeToStatus(cb: (s: ConnectionStatus) => void): () => void {
  statusListeners.add(cb);
  cb(currentStatus); // fire immediately with current value
  return () => statusListeners.delete(cb);
}

export function getConnectionStatus(): ConnectionStatus {
  return currentStatus;
}

// ── Queue-resolved event bus ─────────────────────────────────────────────────
// Fired after a successful flush so screens can reload their conversations
const resolvedListeners = new Set<(screen: string) => void>();

export function onQueueResolved(cb: (screen: string) => void): () => void {
  resolvedListeners.add(cb);
  return () => resolvedListeners.delete(cb);
}

function emitResolved(screen: string) {
  resolvedListeners.forEach(l => { try { l(screen); } catch {} });
}

// ── NetInfo monitoring ────────────────────────────────────────────────────────
let netInfoUnsub: (() => void) | null = null;

export function startNetworkMonitoring() {
  if (netInfoUnsub) return;
  netInfoUnsub = NetInfo.addEventListener(state => {
    if (state.isConnected && currentStatus === "reconnecting") {
      // Connection restored — flush queue
      flushQueue().catch(() => {});
    } else if (!state.isConnected && currentStatus === "connected") {
      emitStatus("reconnecting");
    }
  });
}

// ── AsyncStorage queue ────────────────────────────────────────────────────────
async function loadQueue(): Promise<QueuedRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const items: QueuedRequest[] = JSON.parse(raw);
    const cutoff = Date.now() - MAX_QUEUE_AGE_MS;
    return items.filter(i => i.queuedAt > cutoff);
  } catch {
    return [];
  }
}

async function saveQueue(q: QueuedRequest[]) {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {}
}

export async function enqueueRequest(
  req: Omit<QueuedRequest, "id" | "queuedAt">
): Promise<void> {
  const q = await loadQueue();
  q.push({ ...req, id: Math.random().toString(36).slice(2), queuedAt: Date.now() });
  await saveQueue(q);
}

export async function getQueuedCount(): Promise<number> {
  return (await loadQueue()).length;
}

// ── Queue flush ───────────────────────────────────────────────────────────────
export async function flushQueue(): Promise<number> {
  const q = await loadQueue();
  if (q.length === 0) {
    if (currentStatus === "reconnecting") {
      emitStatus("reconnected");
      setTimeout(() => emitStatus("connected"), 3000);
    }
    return 0;
  }

  let flushed = 0;
  const remaining: QueuedRequest[] = [];

  for (const item of q) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body || undefined,
      });
      if (res.ok) {
        flushed++;
        emitResolved(item.screen);
      } else if (res.status >= 500) {
        remaining.push(item); // server still down, keep in queue
      } else {
        flushed++; // 4xx = our problem not server's, treat as resolved
        emitResolved(item.screen);
      }
    } catch {
      remaining.push(item); // network still down
    }
  }

  await saveQueue(remaining);

  if (flushed > 0) {
    emitStatus("reconnected");
    setTimeout(() => emitStatus("connected"), 3000);
  }

  return flushed;
}

// ── Main resilientFetch ───────────────────────────────────────────────────────
function isRetryableError(err: unknown, status?: number): boolean {
  if (status === 502 || status === 503 || status === 504) return true;
  if (err instanceof TypeError) return true; // network failure
  return false;
}

export async function resilientFetch(
  url: string,
  options: RequestInit = {},
  screen = "unknown"
): Promise<Response> {
  // ① Check device connectivity BEFORE attempting (saves timeout on offline devices)
  const netState = await NetInfo.fetch();
  const isOffline = !netState.isConnected;

  if (isOffline) {
    // Queue immediately without trying
    await _queueOptions(url, options, screen);
    emitStatus("reconnecting");
    const err = Object.assign(new Error("Device is offline"), { isOffline: true });
    throw err;
  }

  // ② Attempt request
  try {
    const res = await fetch(url, options);
    if (isRetryableError(null, res.status)) {
      throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, isRetryable: true });
    }
    return res;
  } catch (err: any) {
    if (err?.isOffline) throw err; // already handled above
    if (isRetryableError(err, err?.status)) {
      await _queueOptions(url, options, screen);
      emitStatus("reconnecting");
    }
    throw err;
  }
}

async function _queueOptions(url: string, options: RequestInit, screen: string) {
  const headers: Record<string, string> = {};
  if (options.headers) {
    try {
      new Headers(options.headers as HeadersInit).forEach((v, k) => { headers[k] = v; });
    } catch {}
  }
  await enqueueRequest({
    url,
    method: options.method ?? "GET",
    headers,
    body: (options.body as string) ?? "",
    screen,
  });
}
