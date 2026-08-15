import Stripe from "stripe";

function getStripeSecretKey(): string {
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY environment variable is not set. " +
      "Add STRIPE_SECRET_KEY to your server environment variables."
    );
  }
  return key;
}

export function getStripePublishableKey(): string {
  return process.env.STRIPE_PUBLISHABLE_KEY ?? "";
}

export function getUncachableStripeClient(): Stripe {
  const secretKey = getStripeSecretKey();
  return new Stripe(secretKey, { apiVersion: "2025-03-31.basil" as any });
}

export function getStripeSync(): never {
  throw new Error("Stripe sync is not used in this deployment.");
}
