import { useState, useEffect, useCallback } from "react";
import { getUserId } from "@/lib/user-id";

export type SubscriptionTier = "free" | "plus" | "pro";

export type SubscriptionStatus = {
  tier: SubscriptionTier;
  dailyMessageCount: number;
  dailyLimit: number | null;
  canSendMessage: boolean;
  hasStripeCustomer: boolean;
};

const DEFAULT: SubscriptionStatus = {
  tier: "free",
  dailyMessageCount: 0,
  dailyLimit: 30,
  canSendMessage: true,
  hasStripeCustomer: false,
};

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus>(DEFAULT);
  const [isLoading, setIsLoading] = useState(true);
  const userId = getUserId();

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`/api/subscription/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const isPremium = status.tier !== "free";
  const isPlus = status.tier === "plus";
  const isPro = status.tier === "pro";

  const usagePercent = status.dailyLimit
    ? Math.min(100, (status.dailyMessageCount / status.dailyLimit) * 100)
    : 0;

  return { status, isLoading, isPremium, isPlus, isPro, usagePercent, refetch: fetch_ };
}
