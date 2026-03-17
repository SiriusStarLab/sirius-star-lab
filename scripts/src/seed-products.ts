import { ReplitConnectors } from "@replit/connectors-sdk";
import Stripe from "stripe";

async function getStripeSecretKey(): Promise<string> {
  const connectors = new ReplitConnectors();
  const connections = await connectors.listConnections({ connector_names: "stripe" });
  const connection = (connections as any[])[0];
  if (!connection) throw new Error("No Stripe connection found. Connect Stripe in Replit Integrations first.");
  return connection.settings?.secret as string;
}

async function createProducts() {
  console.log("Connecting to Stripe...");
  const secretKey = await getStripeSecretKey();
  const stripe = new Stripe(secretKey, { apiVersion: "2025-03-31.basil" as any });

  // --- Sirius Plus ($5/month) ---
  const existingPlus = await stripe.products.search({ query: "name:'Sirius Plus' AND active:'true'" });
  if (existingPlus.data.length > 0) {
    console.log("✓ Sirius Plus already exists:", existingPlus.data[0].id);
  } else {
    const plusProduct = await stripe.products.create({
      name: "Sirius Plus",
      description: "200 messages/day, image generation, full memory, and more.",
      metadata: { tier: "plus" },
    });
    const plusPrice = await stripe.prices.create({
      product: plusProduct.id,
      unit_amount: 500,
      currency: "usd",
      recurring: { interval: "month" },
    });
    console.log("✓ Created Sirius Plus:", plusProduct.id, "| Price:", plusPrice.id, "($5/month)");
  }

  // --- Sirius Pro ($12/month) ---
  const existingPro = await stripe.products.search({ query: "name:'Sirius Pro' AND active:'true'" });
  if (existingPro.data.length > 0) {
    console.log("✓ Sirius Pro already exists:", existingPro.data[0].id);
  } else {
    const proProduct = await stripe.products.create({
      name: "Sirius Pro",
      description: "Unlimited messages, unlimited image generation, deep memory, priority speed.",
      metadata: { tier: "pro" },
    });
    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 1200,
      currency: "usd",
      recurring: { interval: "month" },
    });
    console.log("✓ Created Sirius Pro:", proProduct.id, "| Price:", proPrice.id, "($12/month)");
  }

  console.log("\nDone! Products are live in Stripe and will sync to the database automatically.");
}

createProducts().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
