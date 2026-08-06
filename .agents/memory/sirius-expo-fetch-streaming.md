---
name: expo/fetch streaming — MANDATORY
description: React Native's global fetch does not support response.body.getReader() streaming on iOS. All streaming calls must use expo/fetch.
---

## Rule
Any file that reads a streaming HTTP response (SSE / chunked) on iOS MUST import `fetch` from `"expo/fetch"`. React Native's built-in global `fetch` silently returns a non-streaming body — `response.body.getReader()` either hangs or produces no chunks.

**Why:** `resilient-fetch.ts` used the global fetch for 10+ builds, causing App Builder, Code Builder, and Lab Chat to silently produce no output on every send. The stream appeared to start (HTTP 200) but never delivered data.

**How to apply:**
- Every `.ts` / `.tsx` file in the mobile app that calls `fetch()` and reads `response.body` must have `import { fetch } from "expo/fetch"` at the top.
- When adding new utility files that make streaming requests, always add this import — do not rely on the global.
- The `flushQueue()` path in resilient-fetch.ts does NOT need streaming so using `fetch as any` there is fine.
