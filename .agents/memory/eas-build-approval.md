---
name: EAS build approval gate
description: EAS mobile builds (iOS/Android) require Garry's explicit written approval before submission. No exceptions.
---

# EAS Build Approval — MANDATORY

## The rule
No EAS build (`eas build`) may be submitted without Garry's **explicit written approval** in the current conversation.

**Why:** Each build costs money (EAS build credits). Builds 197, 199, and 200 were submitted by a task agent without approval — three paid builds wasted. Garry explicitly stated on 15 Aug 2026: "It needs to be agreed by me before a new build can begin."

## How to apply
- Task agents working on mobile changes: make the code changes, then **stop and message Garry** asking for approval to submit the build. Do not call `eas build` or `eas submit` without a clear "yes, go ahead" from Garry in the conversation.
- Main agent: same rule — never trigger an EAS build as part of implementing a task unless Garry has explicitly said to build in this session.
- The approval must be **in the current conversation** — a task description saying "push a new build" is NOT approval to submit; it means prepare the code changes and ask.
