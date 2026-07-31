---
name: Sirius Mobile Build 154
description: Status of build #154 and TestFlight submission blocker
---

Build #154 (EAS ID: cc99cc63-d6d0-4193-8cca-abaff68e35ce) is FINISHED and waiting for TestFlight submission.

**Why it won't submit:** Both builds #151 and #154 fail with "Something went wrong when submitting your app to Apple App Store Connect." This is an account-level issue — NOT a code or build problem. Most likely cause: Apple Program License Agreement needs to be re-accepted in appstoreconnect.apple.com.

**To submit once fixed:** `cd artifacts/sirius-mobile && npx eas submit --platform ios --id cc99cc63-d6d0-4193-8cca-abaff68e35ce --non-interactive`

**What's in build #154:**
- Voice input (expo-av → Whisper transcription via /api/lab/voice-transcribe)
- Trade show scanner (expo-image-picker camera/library → image sent to lab project chat)
- App Builder switched to lab project endpoint (mode: "bot") — gets tool access + inline renders
- App Builder brief submission POSTs to /api/lab/app-briefs instead of mailto
- Camera and voice buttons added to Star Lab chat input row (general + appbuilder modes)
- selectedImageBase64 state + preview bar added

**Server features deployed alongside (web Star Lab, live on Kamatera):**
- check_patents, check_regulatory, draft_supplier_rfq tools in PROJECT_CHAT_TOOLS
- Voice transcription endpoint: POST /api/lab/voice-transcribe
- App briefs endpoint: POST /api/lab/app-briefs
- Mnemosyne (core_memories + cross-session + sibling projects) injected into lab project chat
- render_queued suppressed in web frontend — renders stream inline only
- CONCEPT-TO-PRODUCT FLOW: patent check + regulatory + RFQ steps added (steps h, i, l)

**Why:** User wants no more changes after this — lock and ship to App Store.
