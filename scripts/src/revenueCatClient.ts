import { ReplitConnectors } from "@replit/connectors-sdk";
import { createClient } from "@replit/revenuecat-sdk";

export async function getUncachableRevenueCatClient() {
  const connectors = new ReplitConnectors();
  const connections = await connectors.listConnections({ connector_names: "revenuecat" });
  const connection = (connections as any[])[0];
  if (!connection) {
    throw new Error("No RevenueCat connection found. Connect RevenueCat in Replit Integrations first.");
  }
  const apiKey = connection.settings?.api_key as string;
  if (!apiKey) {
    throw new Error("RevenueCat API key not found in connection settings.");
  }
  return createClient({ apiKey });
}
