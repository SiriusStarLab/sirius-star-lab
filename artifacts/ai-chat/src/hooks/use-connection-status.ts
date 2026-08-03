import { useState, useEffect } from "react";
import { type ConnectionStatus, onConnectionStatus } from "@/lib/resilient-fetch";

/**
 * React hook — subscribes to global connection status events.
 * Returns "connected" | "reconnecting" | "reconnected"
 */
export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>("connected");
  useEffect(() => onConnectionStatus(setStatus), []);
  return status;
}
