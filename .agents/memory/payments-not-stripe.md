---
name: Payments — not Stripe
description: Sirius does not use Stripe. Never suggest it.
---

Sirius Star Lab does **not** use Stripe for payments.

**Why:** User has explicitly stated this multiple times and finds it frustrating when Stripe is mentioned.

**How to apply:** Never suggest Stripe, Stripe keys, Stripe webhooks, or Stripe dashboard for anything related to Sirius. If a checkout or payment error appears in logs referencing `sk_live_`, do not assume it is relevant or actionable — it may be a dead code path or legacy artifact.
