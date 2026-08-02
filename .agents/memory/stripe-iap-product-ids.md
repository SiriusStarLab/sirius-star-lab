---
name: Sirius IAP product IDs
description: Exact App Store Connect product identifiers for Plus and Pro subscriptions — IDs are NOT consistently formatted.
---

# Sirius IAP Product IDs

## App Store Connect (Subscription Group 22145167)

| Level | Reference Name | Product ID | Duration |
|-------|---------------|------------|----------|
| 1 | Sirius_Plus | `live.siriusai.app.plus_monthly` | 1 month |
| 2 | Sirius_Pro  | `sirius_pro_monthly`             | 1 month |

## Code location
`artifacts/sirius-mobile/lib/revenuecat.tsx` lines 11-12.

**Why IDs differ in format:** Plus was created with the full bundle prefix, Pro was not. Apple doesn't enforce consistency — both are valid as long as they match exactly.

**Critical rule:** Never "fix" `sirius_pro_monthly` to add a bundle prefix. It is correct as-is.

## RevenueCat entitlements checked
- Plus: `"sirius_plus" in entitlements || "plus" in entitlements`
- Pro:  `"sirius_pro" in entitlements  || "pro" in entitlements`

## Stripe Webhook (web subscriptions)
- Endpoint: `https://sirius-ai.live/api/stripe/webhook`
- Webhook ID: `we_1TzuazLPyTHbLjGhsGVasDVm`
- `STRIPE_WEBHOOK_SECRET` set in ecosystem.config.json for sirius-api, sirius-worker, sirius-router
- Events: checkout.session.completed, customer.subscription.deleted, customer.subscription.updated, invoice.payment_failed
