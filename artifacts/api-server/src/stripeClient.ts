import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

function getStripeSecretKey(): string {
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY environment variable is not set. " +
      "Add your Stripe secret key (sk_...) as a secret in Replit."
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

let _stripeSync: StripeSync | null = null;

export function getStripeSync(): StripeSync {
  if (_stripeSync) return _stripeSync;

  const secretKey = getStripeSecretKey();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required for Stripe sync.");

  _stripeSync = new StripeSync({
    poolConfig: { connectionString: databaseUrl, max: 5 },
    stripeSecretKey: secretKey,
  });

  return _stripeSync;
}
