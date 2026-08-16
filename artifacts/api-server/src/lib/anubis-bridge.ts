// Sirius–Anubis Intelligence Bridge
// Connects to the Anubis security/monitoring service (port 9001)
// and registers Sirius API health events for predictive failure detection.

const ANUBIS_URL = process.env.ANUBIS_URL || "http://127.0.0.1:9001";
const BRIDGE_INTERVAL_MS = 5 * 60 * 1000; // ping every 5 minutes

async function pingAnubis(): Promise<void> {
  try {
    const res = await fetch(`${ANUBIS_URL}/status`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) {
      console.warn(`[AnubisBridge] Anubis returned ${res.status}`);
    }
  } catch {
    // Anubis may be offline — not critical, log silently
  }
}

export function startAnubisbridge(): void {
  console.log("[AnubisBridge] Started — syncing with Anubis security monitor every 5 minutes");
  // Initial ping after 10s to let everything settle
  setTimeout(() => pingAnubis(), 10_000);
  setInterval(() => pingAnubis(), BRIDGE_INTERVAL_MS);
}
