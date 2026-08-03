---
name: Sirius auth routes and subscription table
description: DB table names, auth headers per route, known missing routes
---

## Subscription tier table
- Table: `user_profiles` (NOT `users`)
- Column: `subscription_tier` (text, default 'free')
- User ID column: `user_id`
- DB: `postgresql://sirius:Sirius2026Secure!@127.0.0.1:5432/siriusdb`

## Auth header per route family
| Route prefix | Header required | Notes |
|---|---|---|
| `/api/dream-lab/*` | `x-dream-user` | Has own requireUser/requirePaid middleware |
| `/api/lab/*` | `x-lab-pin` OR `x-user-id` (Pro/Plus) | authMiddleware patched Aug 2026 |
| `/api/openai/*` | `x-user-id` | General chat |
| `/api/subscription/:userId` | none | Public endpoint |
| `/api/auth/*` | none | Login/signup |

## authMiddleware patch (Aug 2026)
`lab-auth.ts` `authMiddleware` was made async and now:
1. Checks `x-lab-pin` first (Garry owner bypass)
2. If `x-user-id` header present with length ≥ 4, checks `user_profiles.subscription_tier`
3. Pro or Plus → allowed; free → 403 "Star Lab requires a Pro subscription"
4. No valid userId → original PIN failure path

## Known missing routes
- `DELETE /api/users/:userId` — account deletion from Settings tab returns 404/HTML fallback; route not registered anywhere

## "Back to Sirius" link
Removed from pricing page (the one mobile app opens). Still present in:
- `src/pages/learn.tsx`
- `src/pages/privacy.tsx`
- `src/pages/terms.tsx`
- `src/pages/star-lab/index.tsx`
- `src/pages/checkout-cancel.tsx`
These are web-only pages, not opened from the mobile app.

**Why:** Mobile app opens `https://sirius-ai.live/pricing` via WebBrowser. The link must not appear there or it takes users to the web app instead of returning to the mobile app.
