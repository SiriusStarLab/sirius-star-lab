---
name: LabFloatingChat navigate-during-streaming bug
description: Why LabFloatingChat used to close mid-stream and how it was fixed
---

## The bug

When Sirius sends `<<NAVIGATE:home>>` (every startup greeting), the backend emits `type: "navigate"`. 
The old LabFloatingChat handler immediately called `onNavigate()` + `setTimeout(() => setOpen(false), 600)`.
This closed the floating chat 600ms later — while the text response was still streaming.
User saw: thinking indicator, tool action cards, then nothing (chat vanished).

## The fix

Added `pendingNavRef` and `pendingNavAndBuildRef` refs. Navigate events now just store the target:
```ts
pendingNavRef.current = { section: evt.section, projectId: evt.projectId || null };
```
After `setMessages` commits the final response, the stored navigation executes with a 300ms delay.

**Why:** Navigation must happen AFTER streaming completes, not during. 
SiriusLabChatPanel already did this correctly — LabFloatingChat now matches.

## Also fixed

`lib/ai-client/src/index.ts` Proxy: `(compTarget.create as Function)(normalised)` → 
`compTarget.create.call(compTarget, normalised)` to preserve `this` binding in OpenAI SDK.
