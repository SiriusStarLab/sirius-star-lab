import { db } from "@workspace/db";
import { userProfilesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export class StripeStorage {
  async getUserProfile(userId: string) {
    const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId));
    return profile || null;
  }

  async upsertStripeCustomerId(userId: string, stripeCustomerId: string) {
    await db
      .insert(userProfilesTable)
      .values({ userId, aiName: "Sirius", stripeCustomerId })
      .onConflictDoUpdate({
        target: userProfilesTable.userId,
        set: { stripeCustomerId },
      });
  }

  async updateSubscriptionTier(userId: string, tier: string) {
    await db
      .insert(userProfilesTable)
      .values({ userId, aiName: "Sirius", subscriptionTier: tier })
      .onConflictDoUpdate({
        target: userProfilesTable.userId,
        set: { subscriptionTier: tier },
      });
  }

  async getPriceIdForTier(tier: "plus" | "pro"): Promise<string | null> {
    try {
      const tierName = tier === "pro" ? "Sirius Pro" : "Sirius Plus";
      const result = await db.execute(
        sql`
          SELECT pr.id as price_id
          FROM stripe.products p
          JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
          WHERE p.name = ${tierName} AND p.active = true
          ORDER BY pr.unit_amount ASC
          LIMIT 1
        `
      );
      return (result.rows[0] as any)?.price_id || null;
    } catch {
      return null;
    }
  }

  async getUserIdByStripeCustomer(stripeCustomerId: string): Promise<string | null> {
    const [profile] = await db
      .select({ userId: userProfilesTable.userId })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.stripeCustomerId, stripeCustomerId));
    return profile?.userId || null;
  }

  async getSubscriptionStatus(userId: string) {
    try {
      const profile = await this.getUserProfile(userId);
      const stripeCustomerId = profile?.stripeCustomerId;

      if (stripeCustomerId) {
        const result = await db.execute(
          sql`
            SELECT s.status, s.items
            FROM stripe.subscriptions s
            WHERE s.customer = ${stripeCustomerId}
              AND s.status = 'active'
            ORDER BY s.created DESC
            LIMIT 1
          `
        );
        if (result.rows[0]) {
          return { hasActiveStripeSubscription: true };
        }
      }
    } catch {
    }
    return { hasActiveStripeSubscription: false };
  }
}

export const stripeStorage = new StripeStorage();
