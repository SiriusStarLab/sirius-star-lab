import { ReplitConnectors } from "@replit/connectors-sdk";
import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

async function getStripeSecretKey(): Promise<string> {
  const connectors = new ReplitConnectors();
  const connections = await connectors.listConnections({
    connector_names: "stripe",
    refresh_policy: "auto",
  } as any);
  const connection = (connections as any[])[0];
  if (!connection) {
    throw new Error("No Stripe connection found. Please connect Stripe in Replit Integrations.");
  }
  const key = (connection.settings?.secret ?? connection.settings?.api_key ?? connection.settings?.secretKey) as string | undefined;
  if (!key) {
    console.error("Stripe connection settings keys:", Object.keys(connection.settings || {}));
    throw new Error("Stripe secret key not found in connection settings.");
  }
  return key;
}

export async function getStripePublishableKey(): Promise<string> {
  const connectors = new ReplitConnectors();
  const connections = await connectors.listConnections({
    connector_names: "stripe",
    refresh_policy: "auto",
  } as any);
  const connection = (connections as any[])[0];
  if (!connection) throw new Error("No Stripe connection found.");
  return (connection.settings?.publishable ?? connection.settings?.publishableKey ?? "") as string;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const secretKey = await getStripeSecretKey();
  return new Stripe(secretKey, { apiVersion: "2025-03-31.basil" as any });
}

let _stripeSync: StripeSync | null = null;

export async function getStripeSync(): Promise<StripeSync> {
  if (_stripeSync) return _stripeSync;

  const secretKey = await getStripeSecretKey();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required for Stripe sync.");

  _stripeSync = new StripeSync({
    poolConfig: { connectionString: databaseUrl, max: 5 },
    stripeSecretKey: secretKey,
  });

  return _stripeSync;
}
