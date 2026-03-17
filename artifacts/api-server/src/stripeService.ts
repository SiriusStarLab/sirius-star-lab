import { getUncachableStripeClient } from "./stripeClient";
import { stripeStorage } from "./stripeStorage";

export class StripeService {
  async getOrCreateCustomer(userId: string): Promise<string> {
    const profile = await stripeStorage.getUserProfile(userId);

    if (profile?.stripeCustomerId) {
      return profile.stripeCustomerId;
    }

    const stripe = await getUncachableStripeClient();
    const customer = await stripe.customers.create({
      metadata: { userId },
      description: `Sirius AI user: ${userId}`,
    });

    await stripeStorage.upsertStripeCustomerId(userId, customer.id);
    return customer.id;
  }

  async createCheckoutSession(
    userId: string,
    tier: "plus" | "pro",
    baseUrl: string
  ) {
    const priceId = await stripeStorage.getPriceIdForTier(tier);
    if (!priceId) {
      throw new Error(`No price found for tier "${tier}". Run the seed-products script first.`);
    }

    const customerId = await this.getOrCreateCustomer(userId);
    const stripe = await getUncachableStripeClient();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
      metadata: { userId, tier },
      subscription_data: {
        metadata: { userId, tier },
      },
    });

    return session;
  }

  async createBillingPortalSession(userId: string, baseUrl: string) {
    const profile = await stripeStorage.getUserProfile(userId);
    if (!profile?.stripeCustomerId) {
      throw new Error("No Stripe customer found for this user.");
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${baseUrl}/`,
    });

    return session;
  }

  async handleSubscriptionActivated(customerId: string, tier: string) {
    const userId = await stripeStorage.getUserIdByStripeCustomer(customerId);
    if (!userId) {
      console.error("No userId found for Stripe customer:", customerId);
      return;
    }
    await stripeStorage.updateSubscriptionTier(userId, tier);
    console.log(`Subscription activated: userId=${userId}, tier=${tier}`);
  }

  async handleSubscriptionCanceled(customerId: string) {
    const userId = await stripeStorage.getUserIdByStripeCustomer(customerId);
    if (!userId) return;
    await stripeStorage.updateSubscriptionTier(userId, "free");
    console.log(`Subscription canceled: userId=${userId}`);
  }
}

export const stripeService = new StripeService();
