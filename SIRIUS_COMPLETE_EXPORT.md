# SIRIUS STAR LAB — COMPLETE PROJECT EXPORT
### Full source code, build history, and technical documentation
**Exported: August 2026 | Final build: iOS #18**

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Complete Build History](#3-complete-build-history)
4. [Mobile App — Full Source Code](#4-mobile-app--full-source-code)
5. [Web App — Source Map](#5-web-app--source-map)
6. [API Server](#6-api-server)
7. [Infrastructure & Deployment](#7-infrastructure--deployment)
8. [Subscriptions & Payments](#8-subscriptions--payments)
9. [Known Issues at Export](#9-known-issues-at-export)
10. [How to Rebuild From Scratch](#10-how-to-rebuild-from-scratch)

---

## 1. PROJECT OVERVIEW

**Sirius Star Lab** is an AI assistant platform consisting of:

| Product | Description | Status |
|---------|-------------|--------|
| iOS mobile app | React Native / Expo — main consumer product | Build #18, submitted |
| Web app (ai-chat) | React / Vite SPA — sirius-ai.live | Live on Kamatera |
| API server | Node.js / Express — sirius-ai.live/api | Live on Kamatera |
| Star Lab (web) | React — advanced R&D workspace | Live, Pro-gated |

**Live domain:** https://sirius-ai.live  
**API base:** https://sirius-ai.live/api/  
**Server:** Kamatera VPS (managed via PM2, /opt/sirius/)  
**App Store ID:** live.siriusai.app  
**EAS Project ID:** 44095ebc-6e60-4f8a-8b90-d2b2bc85588b  
**RevenueCat:** Products — `live.siriusai.app.plus_monthly` (Plus), `sirius_pro_monthly` (Pro)  
**Support email:** support@sirius-ai.live  
**Company:** GCTH Supplies Ltd (Mettle bank, account 26359434, sort 04-03-33)

---

## 2. ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│  iOS App (Expo/RN)           Web App (React/Vite)        │
│  - Chat (Sirius AI)          - Chat page                 │
│  - Star Lab (Pro)            - Star Lab (Pro)            │
│  - Dream Lab                 - Learn, Dream Lab          │
│  - Learn                     - Marketing/pricing pages   │
│  - Settings/Pricing          - PWA (installable)         │
└────────────────┬─────────────────────────────────────────┘
                 │ HTTPS / SSE streaming
┌────────────────▼─────────────────────────────────────────┐
│  API Server (Express + Node.js)   Kamatera /opt/sirius/   │
│  PM2: sirius-api (port 3000)                              │
│  Routes:                                                  │
│  /api/openai/...     — chat, conversations, transcribe   │
│  /api/auth/...       — login, signup, password reset     │
│  /api/subscription/  — tier check                        │
│  /api/lab/...        — Star Lab projects, voice          │
│  /api/stripe/...     — activate-lab                      │
│  /api/payment/...    — bank transfer requests            │
│  /api/intelligence/  — mood, portrait, briefing, arc     │
└────────────────┬─────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────┐
│  PostgreSQL (Kamatera)                                    │
│  Tables: conversations, messages, users, subscriptions,  │
│  core_memories, sirius_tasks, sirius_automations,        │
│  mood_checkins, sirius_router_logs, lab_projects         │
└──────────────────────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────┐
│  AI Router (sirius-router, port 5000)                    │
│  Mini OpenRouter proxy — cost tracking, model routing    │
│  Models: anthropic/claude-opus-4.8 (primary)             │
│          openai/gpt-4o (image gen)                       │
└──────────────────────────────────────────────────────────┘
```

---

## 3. COMPLETE BUILD HISTORY

### Phase 1 — Concept & Initial Build (Builds 1–30)
- Project started as a simple AI chat app
- Initial Expo setup with basic message streaming
- First TestFlight submissions
- Basic auth (email/password), PostgreSQL schema
- Early SSE streaming implementation
- Sirius character and branding established ("I think, so I am")
- Voice TTS added (expo-speech, en-GB Kate voice)
- Kamatera server provisioned — API moved off Replit

### Phase 2 — Core Features (Builds 31–80)
- Dream Lab added — dream board with AI coaching per dream
- Learn tab — Study Plan, Quiz, Document Analysis panels
- RevenueCat IAP integration (iOS)
- Subscription tiers: Free (30 msg/day), Plus (75), Pro (500)
- Star Lab added — Pro-gated advanced workspace
  - App Builder mode (product brief assistant)
  - Code Builder mode (production code generation)
  - Lab Chat / General mode (Kimi-style R&D product intelligence)
- PIN security layer for Star Lab
- Bank transfer payment flow (Android/web fallback)
- Memory Portrait feature (AI synthesises user personality)
- Daily briefing system

### Phase 3 — AI Intelligence Layer (Builds 81–120)
- Sirius Intelligence service (Docker on port 3001)
- `core_memories` table — Sirius saves memories across sessions
- Mood check-in system with emotional arc tracking
- Self-modification system — Sirius can propose code changes
- Sirius AI Router — cost tracking proxy (port 5000)
- Piper TTS integration (server-side voice synthesis)
- Telegram integration — proactive messages to owner
- Lab project system — persistent projects with build queue
- Trade show scanner — reverse-engineer products from photos
- Voice transcription in Star Lab (audio/m4a → Whisper)

### Phase 4 — Stability & Polish (Builds 121–163)
- Star Lab drawer history (sessions stored in AsyncStorage)
- LabSession system — App Builder / Code / General modes unified
- MessageBubble.tsx: full-width images, tap-to-expand, code copy
- Full Markdown rendering throughout app (react-native-markdown-display)
- Mission Guardian — detects AI model drift, auto-corrects
- Server self-build pipeline — Sirius rebuilds itself on Kamatera
- EAS build pipeline debugged for pnpm monorepo
  - expo-entry.js pattern
  - ios/ directory pre-generation
  - EAS_NO_VCS=1 behavior documented
- Sirius context budget fixes (200K token limit)
- Self-repair cooldown (prevented autonomous restart loops)
- AWS S3 migration for object storage
- GitHub set up for source control on server

### Phase 5 — Pre-App Store Launch (Builds 164 / iOS #18)
**This session — final fixes before App Store submission:**

| # | Issue | Fix |
|---|-------|-----|
| 1 | Dream Lab crash on Add Dream | `TextInput` was missing from React Native imports |
| 2 | Past conversations shown as popup modal | Removed bottom-sheet modal. History now loads inline in slide-out drawer |
| 3 | Star Lab SSE hangs on render events | Added handlers for `render_queued`, `render_started`, `tool_call` |
| 4 | GARRY_BYPASS = true for ALL users | Changed to check `sirius_user_id === "garry"` — only owner bypasses auth |
| 5 | Learn from Document silent errors | Real errors now surface via Alert. DOC/DOCX rejected with clear message |
| 6 | Learn SSE missing `delta` field | SSE now handles both `content` and `delta` field names |
| 7 | Learn system prompt never sent | `systemPrompt: panel.system` added to each request body |
| 8 | Learn AI responses plain text | Replaced `<Text>` with `<Markdown>` for all assistant messages |
| 9 | TTS `onDone` TypeScript error | `() => setTimeout(next, 600)` → `() => { setTimeout(next, 600); }` |
| 10 | `loadSessions` used before declaration | Moved `loadSessions` useCallback above `openDrawer` and mount useEffect |
| — | TypeScript | Zero errors — `tsc --noEmit` passes clean |
| — | Build number | Bumped to 18 |

---

## 4. MOBILE APP — FULL SOURCE CODE

### app.json
```json
{
  "expo": {
    "name": "Sirius Star Lab",
    "slug": "sirius-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "siriusai",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "description": "Sirius Star Lab is your personal AI intelligence partner — always thinking, so you can live with clarity.",
    "primaryColor": "#00b4d8",
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#090d1b"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "live.siriusai.app",
      "buildNumber": "18",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "NSMicrophoneUsageDescription": "Sirius Star Lab uses your microphone to let you speak your messages using voice input.",
        "NSSpeechRecognitionUsageDescription": "Sirius Star Lab uses speech recognition to convert your voice into text messages.",
        "NSCameraUsageDescription": "Sirius Star Lab uses your camera so you can share images directly in your conversations.",
        "NSPhotoLibraryUsageDescription": "Sirius Star Lab accesses your photo library so you can attach images to your conversations.",
        "NSLocationWhenInUseUsageDescription": "Sirius Star Lab may use your location to provide localised answers and relevant information."
      }
    },
    "extra": {
      "eas": {
        "projectId": "44095ebc-6e60-4f8a-8b90-d2b2bc85588b"
      }
    },
    "owner": "garryboy"
  }
}
```

### package.json — Key Dependencies
```
expo ~54.0.36
react-native 0.81.5
expo-router ~6.0.24
expo-speech ~14.0.8
expo-av ~16.0.8
expo-document-picker ~14.0.8
expo-file-system ^19.0.23
expo-image-picker ~17.0.11
react-native-markdown-display ^7.0.2
react-native-purchases 10.4.4  (RevenueCat IAP)
@react-native-async-storage/async-storage 2.2.0
@expo/vector-icons ^15.0.3
@expo-google-fonts/inter ^0.4.0
```

### constants/colors.ts
```typescript
const PRIMARY          = "#0099b3";
const BACKGROUND       = "#f0f5fb";
const SURFACE          = "#ffffff";
const SURFACE_ELEVATED = "#e8f0f8";
const BORDER           = "#d4dde8";
const BORDER_LIGHT     = "#eaf0f7";
const TEXT             = "#0e1629";
const TEXT_MUTED       = "rgba(14,22,41,0.55)";
const TEXT_DIM         = "rgba(14,22,41,0.35)";

export default {
  primary:        PRIMARY,
  background:     BACKGROUND,
  surface:        SURFACE,
  surfaceElevated: SURFACE_ELEVATED,
  border:         BORDER,
  borderLight:    BORDER_LIGHT,
  text:           TEXT,
  textMuted:      TEXT_MUTED,
  textDim:        TEXT_DIM,
  success:        "#16a34a",
  error:          "#ef4444",
  warning:        "#d97706",
  tint:           PRIMARY,
  tabIconDefault: "rgba(14,22,41,0.35)",
  tabIconSelected: PRIMARY,
  userBubble:     "#d8f0f5",
  aiBubble:       "#ffffff",
  gradient: { start: "#0099b3", end: "#0066cc" },
};
```

### lib/api.ts — API Client
```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";

export const USER_ID_KEY = "sirius_user_id";
export const PROFILE_KEY = "sirius_profile";

export function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api/`;
  return "/api/";
}

export async function getUserId(): Promise<string> {
  const id = await AsyncStorage.getItem(USER_ID_KEY);
  return id ?? "";
}

// fetchSubscription, createConversation, fetchConversations,
// deleteConversation, logMood, fetchMoodHistory,
// fetchEmotionalArc, generatePortrait, generateBriefing,
// streamResearch — all use getApiBase() + /api/* routes
```

### lib/revenuecat.tsx — IAP Integration
- Wraps react-native-purchases
- Products: `live.siriusai.app.plus_monthly` (Plus), `sirius_pro_monthly` (Pro)
- iOS only — Android/web use bank transfer
- Exposes: `useSubscription()` hook
  - `isPlus`, `isPro`, `isSubscribed`
  - `plusPackage`, `proPackage` (IAPPackage objects)
  - `purchase(pkg)`, `restore()`, `refetchCustomerInfo()`
  - `isPurchasing`, `isRestoring`, `isLoading`

### context/AppContext.tsx — Global State
```typescript
interface AppProfile {
  aiName: string;           // "Sirius" default, user-customisable
  userName: string;
  subscriptionTier: "free" | "plus" | "pro";
  dailyMessageCount: number;
  dailyLimit: number | null; // null on iOS (RevenueCat handles limits)
  canSendMessage: boolean;
}
```
- iOS: profile loaded from AsyncStorage only (no server calls for tier)
- Android/web: profile fetched from /api/subscription/:userId

### app/_layout.tsx — Root Navigation
- Stack navigator: `(tabs)` → `login` → `onboarding`
- Providers: SafeAreaProvider, ErrorBoundary, QueryClientProvider,
  SubscriptionProvider, AppProvider, GestureHandlerRootView
- Fonts: Inter_400Regular, 500Medium, 600SemiBold, 700Bold
- On mount: checks AsyncStorage for userId → redirects to login if none

### app/(tabs)/_layout.tsx — Tab Configuration
```typescript
// tabBarStyle: { display: "none" } — ALL tabs hidden
// Navigation is handled programmatically via router.push()
// Registered screens: index, learn, dreamlab, starlab,
//                     projects, history, settings, pricing
```

---

### app/(tabs)/index.tsx — Home / Sirius Chat

**What it does:**
- Landing screen with Sirius logo and tagline "I'M SIRIUS · I THINK, SO I AM"
- Full streaming SSE chat with Sirius AI
- Voice TTS (en-GB Kate voice, chunked speech)
- Hamburger drawer with inline conversation history
- Surprise prompts button
- Action steps log (shows tool calls during streaming)
- Image generation display (base64 + full-width ExpandableImage)
- Upgrade modal with RevenueCat IAP (iOS) + bank transfer (Android)
- Auto-resets to landing after 3 min background

**Key state:**
```typescript
messages, isStreaming, showTyping, conversationId
voiceMode, actionSteps, stepsExpanded
showUpgradeModal, hitLimitTier
drawerOpen, historyList, historyLoading
```

**SSE events handled:**
- `parsed.content` → stream text into assistant bubble
- `parsed.type === "image"` → set imageB64/imageMimeType on last message
- `parsed.type === "replace_content"` → replace assistant message content
- `parsed.type === "image_error"` → append error note to message
- `parsed.type === "action"` → push to actionSteps array

**Drawer:** Opens via hamburger menu → fetches last 50 conversations from `/api/openai/conversations?userId=...` → renders inline scrollable list → tap loads conversation → tap "New Chat" resets

---

### app/(tabs)/dreamlab.tsx — Dream Lab

**What it does:**
- Dream board — visual grid of user's dreams by category
- 8 categories: Career, Wealth, Health, Love, Travel, Creativity, Growth, Freedom
- Add Dream modal (TextInput for title + notes, category grid picker)
- Tap any dream → DreamChat component
  - Auto-opens with coaching message seeded from dream title/notes
  - Streaming SSE chat with `/api/openai/conversations/:id/messages`
  - Mode: "coach"
  - Full Markdown rendering (dreamMarkdownStyles)
  - Voice TTS toggle (en-GB Kate voice)
- Dreams stored in AsyncStorage (`sirius_dreamlab_dreams`)

**Fixed this session:**
- `TextInput` import added to React Native imports
- `onDone: () => { setTimeout(next, 600); }` — void return type fix

---

### app/(tabs)/learn.tsx — Learn

**What it does:**
- Home screen: 3 panel cards
  1. Build a Study Plan (colour: teal #00b4d8)
  2. Test Yourself / Quiz (colour: purple #8b5cf6)  
  3. Learn from a Document (colour: amber #f59e0b)
- Each panel → ChatView component with its own system prompt
- Document panel has a `+` attach button (PDF → base64, txt → pasted text)
- DOC/DOCX → Alert "Format not supported — paste text or save as PDF"

**System prompts:**
- Study Plan: "world-class learning coach. Week-by-week study plans."
- Quiz: "expert quiz generator. Multiple-choice + short-answer."
- Document: "expert educator. Analyse text, Socratic dialogue."

**SSE handling:**
```typescript
const chunk = parsed.content ?? (parsed.type === "text" ? parsed.delta : null);
```
Handles both field names — `content` (standard) and `delta` (text event type).

**Rendering:**
- User messages: `<Text>`
- Assistant messages: `<Markdown style={learnMarkdownStyles}>`

**Fixed this session:**
- `pickDocument` — real errors surface via Alert, DOC/DOCX rejected
- SSE reader — handles both `content` and `delta` fields
- `systemPrompt: panel.system` — now sent in every request
- Markdown rendering for assistant messages (was plain `<Text>`)

---

### app/(tabs)/starlab.tsx — Star Lab (Pro-gated)

**Auth flow:**
```
Mount → check sirius_user_id
  → if "garry": skip to home (owner bypass)
  → else: check LAB_AUTH_KEY in AsyncStorage
      → if none: show login screen
      → if exists: checkTier(userId)
          → "pro": go to PIN (create or enter)
          → else: show payment screen

Auto-activation: if RevenueCat isPro && stuck at gate view
  → create internal account (uid@sirius-app.internal)
  → call /api/stripe/activate-lab
  → go to PIN setup
```

**Views:** loading | login | signup | forgot | forgot_sent | payment | payment_bank | waiting | pin_create | pin_enter | home | chat

**Chat modes:**
- `appbuilder` — guided brief assistant, hands off to build team
- `code` — production code writer, any language/framework
- `general` — Kimi-style R&D intelligence (full product spec from idea)

**General mode system prompt** produces full product package:
- Dimensions & Physical Spec (table)
- Colour Options (with hex codes)
- Packaging spec
- Materials & Where to Buy (real suppliers: RS Components, Aalco, McMaster-Carr)
- Market & Pricing (TAM, competitors, channels)
- Manufacturing (process, MOQ, lead time)
- Unit Economics (COGS breakdown)

**SSE events handled:**
- `parsed.content` → stream text
- `render_queued` → "🎨 Generating render…" message
- `render_started` → "🎨 Rendering…" message
- `tool_call`, `action`, `tool_result` → silently acknowledged

**History drawer:**
- Sessions stored in AsyncStorage (`sirius_lab_sessions_v1`)
- Max 50 sessions, LRU ordering
- `loadSessions` defined before `openDrawer` (TypeScript ordering fix)
- Tap session → `loadSessionFromHistory` → restores messages + mode

**Voice in Star Lab:**
- TTS: same en-GB Kate voice system as Home
- Recording: expo-av → base64 → `/api/lab/voice-transcribe`
- NOTE: voice transcription still hardcodes `"x-user-id": "garry"` (line 738)
  → This must be fixed before Star Lab works for other users

**Trade show scanner:**
- Camera / library → base64 image → auto-populates input with reverse-engineering prompt

**Payment (web/Android):**
- Stripe checkout link (opens browser)
- Bank transfer option
- Poll for payment confirmation (every 3s, max 40 attempts = 2 min)

---

### components/MessageBubble.tsx — Message Renderer

**Features:**
- User bubbles: plain `<Text>`
- AI bubbles: `<Markdown>` with custom rules
- `ExpandableImage` — tap to full-screen any image
- `CodeBlock` — syntax block with "Copy" button (expo-clipboard)
- Uploaded images: `uploadedImageBase64` full-width
- Generated images: `imageB64` + `imageMimeType` full-width
- Lab render arrays: `images[]` URLs

**Markdown custom rules:**
```typescript
fence: (node) => <CodeBlock content={node.content.trimEnd()} />
code_block: (node) => <CodeBlock content={node.content.trimEnd()} />
```

---

### components/ChatInput.tsx — Input Component

**Features:**
- Text input with multiline support
- `+` button → attach modal with 3 options:
  - Take Photo (camera)
  - Choose from Library (photo picker)
  - Attach Document (PDF/txt/md)
- Voice input (hold mic → record → release → transcribe via `/api/openai/transcribe`)
- Speaker toggle (TTS on/off)
- Send button (appears when text or attachment present)
- Image preview strip with remove button
- Document preview strip with filename

---

### components/TypingIndicator.tsx
Three animated dots indicating AI is processing.

### components/ErrorBoundary.tsx
Catches React render errors, shows ErrorFallback with reload option.

---

### app/login.tsx — Main App Login

- Email + password authentication
- Sign in / Create account toggle
- Forgot password flow (sends reset link)
- Calls `/api/auth/login` or `/api/auth/signup`
- Stores `sirius_user_id` in AsyncStorage on success
- Routes to `/onboarding` (first time) or `/(tabs)` (returning)

---

### app/(tabs)/pricing.tsx — Pricing Screen

**Plans:**
- Free: £0 — 30 msg/day, basic chat
- Plus: £9.99/mo — 75 msg/day, Dream Lab, memory
- Pro: £19.99/mo — 500 msg/day, Star Lab, voice, Telegram

**iOS:** Shows RevenueCat IAP prices from App Store  
**Android/web:** Bank transfer flow (GCTH Supplies Ltd, Mettle)

---

### app/(tabs)/settings.tsx — Settings Screen

- Edit your name and AI name
- Memory Portrait generator (AI describes who you are)
- Daily message usage bar (Android only)
- Subscription tier badge
- IAP upgrade (iOS) / bank transfer (Android)
- Restore purchases
- Privacy Policy, Terms, Contact Support links
- Report Content (mailto:safety@sirius-ai.live)
- Sign Out, Delete Account

---

### EAS Configuration (eas.json)
```json
{
  "cli": { "version": ">= 7.6.2", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 5. WEB APP — SOURCE MAP

**Location:** `artifacts/ai-chat/`  
**Framework:** React 18 + Vite  
**Live at:** https://sirius-ai.live

### Pages
| Route | File | Description |
|-------|------|-------------|
| / | splash.tsx | Landing / marketing page |
| /chat | chat.tsx | Main chat with Sirius |
| /star-lab | star-lab/index.tsx | Star Lab (Pro workspace) |
| /learn | learn.tsx | Learn tab |
| /dream-lab | dream-lab.tsx | Dream Lab |
| /pricing | pricing.tsx | Subscription plans |
| /settings | (via sidebar) | Settings panel |
| /privacy | privacy.tsx | Privacy policy |
| /terms | terms.tsx | Terms of service |
| /checkout-success | checkout-success.tsx | Stripe post-payment |
| /checkout-cancel | checkout-cancel.tsx | Stripe cancelled |

### Star Lab Panels (src/pages/star-lab/)
- `SiriusLabChatPanel.tsx` — General Lab Chat
- `AppBuilderPanel.tsx` — App brief assistant
- `LabFloatingChat.tsx` — Floating chat overlay
- `AgencyHubPanel.tsx` — Agency project management
- `AutoLabPanel.tsx` — Automation lab
- `OrchestratorPanel.tsx` — Task orchestration
- `OutreachHubPanel.tsx` — Outreach management
- `RevenuePanel.tsx` — Revenue tracking
- `SystemAuditPanel.tsx` — System health/audit
- `TasksPanel.tsx` — Task management
- `TeamPanel.tsx` — Team panel
- `UpgradesPanel.tsx` — Upgrade paths
- `NotificationBell.tsx` — Real-time notifications
- `LabMarkdown.tsx` — Markdown renderer
- `voice-utils.ts` — Voice utilities

### Key Components (src/components/)
- `sidebar.tsx` — Main navigation sidebar
- `chat-message.tsx` — Message bubble with Markdown
- `chat-input.tsx` — Input with voice, attach, send
- `auth-gate.tsx` — Auth wrapper
- `lab-auth-gate.tsx` — Star Lab PIN gate
- `pricing-modal.tsx` — Subscription upsell
- `daily-wisdom.tsx` — Daily wisdom card
- `memory-portrait.tsx` — Portrait display
- `mood-checkin.tsx` — Mood logging widget
- `settings-panel.tsx` — Settings drawer
- `spotify-widget.tsx` — Spotify integration
- `pwa-install-prompt.tsx` — PWA install banner

### Hooks (src/hooks/)
- `use-chat.ts` — SSE streaming chat hook
- `use-subscription.ts` — Subscription state
- `use-profile.ts` — User profile
- `use-mobile.tsx` — Mobile viewport detection
- `use-toast.ts` — Toast notifications

---

## 6. API SERVER

**Location on server:** `/opt/sirius/artifacts/api-server/`  
**Entry:** `dist/index.cjs`  
**PM2 name:** `sirius-api`  
**Port:** 3000

### Route Groups
```
/api/auth/          login, signup, request-reset, reset-password
/api/openai/        conversations CRUD, messages (SSE), transcribe
/api/subscription/  GET /:userId — returns tier + daily counts
/api/lab/           projects CRUD, voice-transcribe
/api/stripe/        activate-lab (marks userId as Pro)
/api/payment/       request (bank transfer notification)
/api/intelligence/  mood log/fetch, arc, portrait, briefing, research
/api/users/         DELETE /:userId (account deletion)
/api/health         health check
```

### Key Server Files (on Kamatera only — workspace copies stale)
```
/opt/sirius/artifacts/api-server/src/
  index.ts              — Express app, middleware, route mounting
  routes/
    auth.ts             — bcryptjs auth, JWT/session
    openai.ts           — SSE streaming, conversation management
    subscription.ts     — tier checking
    lab.ts              — Star Lab projects
    stripe.ts           — Lab activation
    intelligence.ts     — Mood, portrait, briefing
  lib/
    db.ts               — PostgreSQL (pg client)
    openai.ts           — OpenRouter proxy client
  lab.ts                — Agentic lab loop (MAX_TOOL_ROUNDS=25)
  self-repair.ts        — Autonomous self-repair (cooldown protected)
  mission-guardian.ts   — Model drift detection
```

### Database Tables
```sql
users              (id, email, passwordHash, createdAt)
conversations      (id, userId, title, createdAt)
messages           (id, conversationId, role, content, createdAt)
subscriptions      (userId, tier, dailyMessageCount, lastResetDate)
core_memories      (id, userId, category, content, importance, createdAt)
mood_checkins      (id, userId, mood, note, createdAt)
lab_projects       (id, userId, name, industry, status, createdAt)
sirius_tasks       (id, title, status, assignee, createdAt)
sirius_automations (id, name, trigger, action, enabled)
sirius_router_logs (id, model, tokens, cost, createdAt)
```

---

## 7. INFRASTRUCTURE & DEPLOYMENT

### Server
- **Provider:** Kamatera
- **OS:** Ubuntu
- **Process manager:** PM2
- **Web server:** Nginx (reverse proxy → port 3000)
- **SSL:** Let's Encrypt

### PM2 Ecosystem
```javascript
// /opt/sirius/ecosystem.config.json
// sirius-api — main API server
// sirius-router — OpenRouter proxy (port 5000)
// Always reload with: pm2 reload ecosystem.config.json --update-env
// For new env vars: pm2 stop/delete/start from file
```

### Frontend (Web App)
**CRITICAL:** Frontend MUST be built from `/opt/sirius-source/artifacts/ai-chat/` on the server.  
DO NOT rebuild from Replit workspace — workspace is months stale.  
Rebuilding from Replit wipes: Jenny voice, logo, bidirectional voice, all self-improvements.

### Mobile App (iOS)
- Built via EAS (Expo Application Services)
- Distributed via Apple TestFlight → App Store
- `eas build --platform ios --profile production`
- Build artefact: `.ipa` uploaded to Apple automatically
- Build number auto-increments via `"autoIncrement": true` in eas.json

### Object Storage
- AWS S3 (migrated from Replit object storage)
- Credentials in ecosystem.config.json on server
- `@aws-sdk` must be in `alwaysExternal` in build.ts

---

## 8. SUBSCRIPTIONS & PAYMENTS

### Tiers
| Tier | Daily Limit | Features |
|------|-------------|---------|
| Free | 30 messages | Chat, basic features |
| Plus | 75 messages | Dream Lab, memory, personalisation |
| Pro | 500 messages | Star Lab, voice, Telegram, image gen |

### iOS (RevenueCat IAP — Apple required)
- Product IDs: `live.siriusai.app.plus_monthly`, `sirius_pro_monthly`
- RevenueCat iOS key: `EXPO_PUBLIC_REVENUECAT_IOS_KEY` env var
- Purchase → `Purchases.purchasePackage()` → tier synced to server via `/api/stripe/activate-lab`
- Restore → `Purchases.restorePurchases()`

### Android/Web (Bank Transfer)
- Company: GCTH Supplies Ltd
- Bank: Mettle
- Account: 26359434
- Sort code: 04-03-33
- Reference format: `SIRIUS-{userId8chars}-{TIER}`
- Manual confirmation by owner → set tier via server

### Star Lab Payments (Pro only)
- Apple IAP (iOS) — same Pro package
- Stripe checkout (web) — external browser link
- Bank transfer fallback
- Auto-activation: if RevenueCat isPro, skip separate Star Lab payment

---

## 9. KNOWN ISSUES AT EXPORT

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | Voice transcription in Star Lab hardcodes `"x-user-id": "garry"` | High | starlab.tsx line ~738 |
| 2 | Star Lab `getOrCreateLabProject` hardcodes `"x-user-id": "garry"` in headers | High | starlab.tsx line ~335 |
| 3 | workspace files are STALE — server has the real live code | Critical (known) | All /opt/sirius/ files |
| 4 | App Builder "submit brief" flow connects to lab project system not tested end-to-end for non-owner users | Medium | starlab.tsx |
| 5 | Learn mode has no TTS | Low | learn.tsx |
| 6 | No deep link handling for password reset (reset emails link to web, not app) | Medium | app/_layout.tsx |

---

## 10. HOW TO REBUILD FROM SCRATCH

If you need to hand this to a new developer or start fresh:

### 1. Clone this codebase
The workspace at `artifacts/sirius-mobile/` contains the mobile app source.  
The workspace at `artifacts/ai-chat/` contains the web app source (stale for live version).

### 2. Environment variables needed
```
EXPO_PUBLIC_DOMAIN=sirius-ai.live     (mobile → points at live API)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=...    (from RevenueCat dashboard)
```

### 3. EAS setup
```bash
npm install -g eas-cli
eas login   # account: garryboy
eas build --platform ios --profile production
```

### 4. Server setup (if rebuilding from scratch)
- PostgreSQL with tables listed in section 6
- Node.js API server (build from api-server/src/)
- PM2 process manager
- Nginx reverse proxy on port 443 → 3000
- SSL via certbot

### 5. AI model
- OpenRouter: `anthropic/claude-opus-4.8`  
- Note: model IDs change. Always verify with `curl api.openrouter.ai/api/v1/models`

### 6. RevenueCat products (if recreating)
- Create two products in App Store Connect
- Create two products in RevenueCat matching the product IDs above
- Create one Offering with both packages

---

## CONTACT & HANDOVER

- **Owner:** Garry
- **Support:** support@sirius-ai.live
- **Safety/Reports:** safety@sirius-ai.live
- **Company:** GCTH Supplies Ltd
- **Live domain:** https://sirius-ai.live
- **App Store:** live.siriusai.app
- **EAS Owner:** garryboy

---

*Document generated: August 2026 | Sirius Star Lab v1.0 | Build #18*
