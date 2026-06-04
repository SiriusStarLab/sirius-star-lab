---
name: Stripe on web vs iOS
description: Stripe IS valid for the web platform; must NOT be used for iOS in-app purchases (Apple 3.1.1).
---

Sirius Star Lab uses Stripe for **web** subscriptions. LIVE Stripe keys (sk_live, pk_live, webhook secret) are set in `/opt/sirius/.env`.

**What is NOT set up yet:** No Stripe products or prices exist in the account. The code in `payment.ts` defines Plus (£5/month) and Pro (£12/month) tiers but these have not been registered in Stripe dashboard yet.

**Why the old note said "not Stripe":** That was specific to the iOS app — Apple Guideline 3.1.1 requires in-app purchases to use Apple's IAP system, not Stripe. That restriction applies only to iOS. For the web app, Stripe is correct.

**How to apply:**
- Web payments → Stripe is fine
- iOS in-app purchases → never Stripe, always Apple IAP
- .env corruption note: STRIPE_PUBLISHABLE_KEY previously had a trailing ` —` (em-dash) that caused `source /opt/sirius/.env` to error on line 4. Fixed June 2026.
