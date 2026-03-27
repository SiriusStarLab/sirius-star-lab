import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";

// Ensure safe URL prefixing
const getApiUrl = (path: string) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

// ============================================================================
// Schemas
// ============================================================================

export const checkoutRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  plan: z.enum(["monthly", "annual"]),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const checkoutResponseSchema = z.object({
  url: z.string().url(),
});

export const verifyResponseSchema = z.object({
  success: z.boolean(),
  customerEmail: z.string().optional(),
  plan: z.string().optional(),
  error: z.string().optional(),
});

// ============================================================================
// Hooks
// ============================================================================

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (data: CheckoutRequest) => {
      const validated = checkoutRequestSchema.parse(data);
      
      const res = await fetch(getApiUrl("/api/fitstack/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const json = await res.json();
      return checkoutResponseSchema.parse(json);
    },
  });
}

export function useVerifySession(sessionId: string | null) {
  return useQuery({
    queryKey: ["checkout-session", sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error("No session ID provided");
      
      const res = await fetch(getApiUrl(`/api/fitstack/verify?session_id=${encodeURIComponent(sessionId)}`));
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to verify session");
      }

      const json = await res.json();
      return verifyResponseSchema.parse(json);
    },
    enabled: !!sessionId,
    retry: false,
  });
}
