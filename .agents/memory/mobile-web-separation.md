---
name: Mobile / web separation rule
description: Sirius mobile app and sirius-ai.live main site are completely separate — never touch one when working on the other.
---

# Mobile / Web Separation Rule

The Sirius mobile app (`artifacts/sirius-mobile`) and the main website (`sirius-ai.live`, `artifacts/ai-chat` on Kamatera) are completely separate products.

**The rule:**
- Working on mobile → do NOT touch `artifacts/ai-chat`, the Kamatera server, or any live site files.
- Working on the main site → do NOT touch `artifacts/sirius-mobile` or submit EAS builds.
- If scope seems to overlap, STOP and ask Garry before touching anything.

**Why:** Both products share the same monorepo, so all code is always visible. Previous sessions made changes to both when working on one, causing broken features, wasted builds (20+ App Store rejections), and lost work. The rule was established by Garry explicitly on 5 August 2026.

**How to apply:** At the start of any task, identify which product is in scope. Then treat all other artifacts as read-only at most. Never edit them.

**Also written to:** `replit.md` under "MOBILE / WEB SEPARATION RULE" — so it is visible to every future session immediately.
