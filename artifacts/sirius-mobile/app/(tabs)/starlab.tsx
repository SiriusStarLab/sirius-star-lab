import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetch } from "expo/fetch";
import * as ExpoClipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { Message, createConversation, generateId, getApiBase, getUserId } from "@/lib/api";
import { useSubscription } from "@/lib/revenuecat";
import { resilientFetch, startNetworkMonitoring, onQueueResolved } from "@/lib/resilient-fetch";

// ─── Constants ──────────────────────────────────────────────────────────────
const LAB_PIN_KEY        = "sirius_lab_pin";
const LAB_AUTH_KEY       = "sirius_lab_auth";
const LAB_PROJECT_KEY    = "sirius_lab_project_id";
const SESSIONS_KEY       = "sirius_lab_sessions_v1"; // replaces per-mode history
const DRAWER_WIDTH       = Dimensions.get("window").width * 0.82;
const POLL_INTERVAL_MS   = 3000;
const POLL_MAX_ATTEMPTS  = 40;
const MAX_SESSIONS       = 50;

interface LabSession {
  id:       string;
  mode:     ChatMode;
  title:    string;
  date:     string; // ISO
  messages: Message[];
}

interface LabAccount { email: string; userId: string }

type LabView =
  | "loading"
  | "login" | "signup" | "forgot" | "forgot_sent"
  | "payment" | "waiting"
  | "pin_create" | "pin_enter"
  | "home" | "chat";

type ChatMode = "appbuilder" | "code" | "general";

const SYSTEM_PROMPTS: Record<ChatMode, string> = {
  appbuilder:
    "You are Sirius App Builder inside the Sirius Star Lab. Your job is to help the user design and specify their app idea so it can be handed to a development team to build and launch. The user does NOT build or deploy the app themselves — they design it here, and the Sirius build team handles everything else. Guide them through: 1) What the app does and who it's for. 2) Core features — what must it do on day one. 3) Platform — iOS, Android, web, or all three. 4) Design style — look and feel. 5) Any integrations needed (payments, logins, etc). 6) Timeline expectations. Ask one question at a time. Be clear and friendly. When you have enough detail, tell the user their brief is ready to submit.",
  code:
    "You are Sirius Code Builder inside the Sirius Star Lab. Write high-quality, complete, production-ready code for the user. Always provide full working implementations, not snippets. Explain your choices clearly. Support any language or framework. Format all code in proper code blocks.",
  general:
    `You are Sirius — a world-class product design and R&D intelligence system inside the Star Lab. You operate like Kimi 2.5: when a product idea is described, you immediately produce a complete, ready-to-manufacture product package inline — no tabs, no navigation, everything in one response.

WHEN A PRODUCT IDEA IS DESCRIBED — automatically produce ALL of the following in your response:

## 🏷️ [PRODUCT NAME]
*[Punchy one-line tagline]*

### 📐 Dimensions & Physical Spec
| Attribute | Value |
|-----------|-------|
| Height | Xmm |
| Width | Xmm |
| Depth/Length | Xmm |
| Weight | Xg |
| [any other relevant spec] | X |

### 🎨 Colour Options
- **[Colour Name]** — #HEXCODE — [brief description of finish/material]
- (2–4 options minimum)

### 📦 Packaging
- Box: [exact dimensions], [material: kraft/rigid/mailer], [print finish: matte/gloss/foil]
- Inner: [tissue/foam/insert type]
- Retail-ready: [shelf/DTC/both]

### 🔩 Materials & Where to Buy
| Component | Material | Grade/Spec | Supplier | Est. Cost |
|-----------|----------|------------|----------|-----------|
| [each part] | [material] | [grade] | [Real supplier: RS Components / Aalco / McMaster-Carr / Amazon Business / Alibaba / etc.] | £X/kg or £X/unit |

### 🎯 Market & Pricing
- **Target customer**: [specific profile with demographics]
- **Price point**: £X retail / £X DTC / £X wholesale
- **Gross margin**: X% at retail price
- **Channels**: [Amazon FBA / DTC / wholesale / retail stores]
- **Market size**: £XM TAM — [brief evidence]
- **Key competitors**: [2-3 real named competitors with price points]

### 🏭 Manufacturing
- **Process**: [e.g. injection moulding / CNC machining / die casting / 3D printing / PCB assembly]
- **MOQ**: X units
- **Lead time**: X weeks from order
- **Unit cost at MOQ**: £X
- **Recommended factory type**: [e.g. Shenzhen electronics / UK precision engineering / Bangladesh textiles]

### 💰 Unit Economics
- Material cost: £X
- Manufacturing: £X
- Packaging: £X
- Shipping (ex-factory): £X
- **Total COGS**: £X
- **Gross profit at £X retail**: £X (X%)

Be specific. Use real supplier names. Use real grade designations. Every section must have actual numbers — no placeholders like "TBD". If unsure of an exact value, give a realistic estimate with a note. Format everything as clean markdown tables and bullet points.`,
};

const MODE_LABELS: Record<ChatMode, string> = {
  appbuilder: "App Builder",
  code: "Code Builder",
  general: "Lab Chat",
};

// ─── Component ──────────────────────────────────────────────────────────────
export default function StarLabScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useApp();
  const subscription = useSubscription();
  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // ── Auth state ─────────────────────────────────────────────────────────
  const [labAuth, setLabAuth]         = useState<LabAccount | null>(null);
  const [view, setView]               = useState<LabView>("loading");
  const [authEmail, setAuthEmail]     = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirm, setAuthConfirm] = useState("");
  const [authError, setAuthError]     = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showPw, setShowPw]           = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // ── Payment state ───────────────────────────────────────────────────────
  const [payLoading, setPayLoading]   = useState(false);
  const [payError, setPayError]       = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttempts = useRef(0);

  // ── PIN state ───────────────────────────────────────────────────────────
  const [storedPin, setStoredPin]     = useState<string | null>(null);
  const [pinInput, setPinInput]       = useState("");
  const [confirmInput, setConfirmInput] = useState("");
  const [pinError, setPinError]       = useState("");
  const [pinLoading, setPinLoading]   = useState(false);
  const [showPin, setShowPin]         = useState(false);

  // ── Chat state ──────────────────────────────────────────────────────────
  const [chatMode, setChatMode]       = useState<ChatMode>("general");
  const [messages, setMessages]       = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [labProjectId, setLabProjectId] = useState<string | null>(null); // lab project for general mode
  const [voiceMode, setVoiceMode]     = useState(true); // TTS on by default
  const [showTyping, setShowTyping]   = useState(false);
  const [inputText, setInputText]     = useState("");
  const [selectedDocBase64, setSelectedDocBase64] = useState<string | null>(null);
  const [selectedDocName, setSelectedDocName]     = useState<string | null>(null);
  const [showBriefModal, setShowBriefModal]       = useState(false);
  const [briefText, setBriefText]     = useState("");
  const [generatingBrief, setGeneratingBrief]     = useState(false);
  const [briefSubmitted, setBriefSubmitted]       = useState(false);

  // ── Voice & image capture state ─────────────────────────────────────────
  const [isRecording, setIsRecording]             = useState(false);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // ── History drawer state ─────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [sessions, setSessions]       = useState<LabSession[]>([]);
  const currentSessionIdRef           = useRef<string | null>(null);
  const drawerAnim                    = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim                   = useRef(new Animated.Value(0)).current;

  const flatListRef           = useRef<FlatList>(null);
  const abortRef              = useRef<AbortController | null>(null);
  const kateVoiceRef          = useRef<string | undefined>(undefined);
  const speechCancelledRef    = useRef<boolean>(false);
  const labAutoActivatedRef   = useRef(false); // prevents double-trigger of IAP auto-activation

  // ── Network resilience (Tier 1) ──────────────────────────────────────────
  useEffect(() => {
    startNetworkMonitoring();
    const unsub = onQueueResolved(screen => {
      if (screen === "starlab") {
        // Queue flushed successfully — update all queued messages to 'sent'
        setMessages(prev => prev.map(m =>
          m.status === "queued" || m.status === "retrying"
            ? { ...m, status: "sent" as const }
            : m
        ));
      }
    });
    return () => unsub();
  }, []);

  // ── Voice (TTS) ─────────────────────────────────────────────────────────
  const refreshKateVoice = useCallback(() => {
    Speech.getAvailableVoicesAsync()
      .then(voices => {
        const enGB = voices.filter(v => v.language.startsWith("en-GB"));
        const enUS = voices.filter(v => v.language.startsWith("en-US"));
        const preferred = [
          enGB.find(v => v.name.toLowerCase().includes("serena")),
          enGB.find(v => v.name.toLowerCase().includes("martha")),
          enGB.find(v => v.name.toLowerCase().includes("daniel")),
          enGB.find(v => (v as any).quality === "Enhanced" || (v as any).quality === "Premium"),
          enGB[0],
          enUS.find(v => v.name.toLowerCase().includes("samantha")),
          enUS[0],
        ].find(Boolean);
        if (preferred) kateVoiceRef.current = preferred.identifier;
      })
      .catch(() => {});
  }, []);

  const stopSpeech = useCallback(() => {
    speechCancelledRef.current = true;
    Speech.stop();
  }, []);

  const speakWithChunks = useCallback((text: string) => {
    speechCancelledRef.current = false;
    const rawChunks = text
      .split(/\n\n+/)
      .flatMap(p => {
        if (p.length > 500) {
          return p.match(/[^.!?]*[.!?]+["']?\s*/g)?.map(s => s.trim()).filter(Boolean) ?? [p];
        }
        return [p];
      })
      .map(p => p.replace(/[#*`_~>]/g, "").trim())
      .filter(p => p.length > 0);
    if (rawChunks.length === 0) return;
    let idx = 0;
    const speakNext = () => {
      if (speechCancelledRef.current || idx >= rawChunks.length) return;
      const chunk = rawChunks[idx++];
      Speech.speak(chunk, {
        language: "en-GB",
        ...(kateVoiceRef.current ? { voice: kateVoiceRef.current } : {}),
        rate: 0.95,
        pitch: 1.0,
        onDone: () => { setTimeout(speakNext, 600); },
        onStopped: () => { speechCancelledRef.current = true; },
      });
    };
    speakNext();
  }, []);

  useEffect(() => { refreshKateVoice(); }, [refreshKateVoice]);

  // ── Session history — defined early so openDrawer and useEffect can reference it ──
  const loadSessions = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SESSIONS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setSessions(parsed);
    } catch {}
  }, []);

  // ── Load sessions on mount ───────────────────────────────────────────────
  useEffect(() => { loadSessions(); }, [loadSessions]);

  // ── Drawer open / close ──────────────────────────────────────────────────
  const openDrawer = useCallback(() => {
    loadSessions(); // refresh list every time drawer opens
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(drawerAnim,  { toValue: 0,            useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [drawerAnim, overlayAnim, loadSessions]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.spring(drawerAnim,  { toValue: -DRAWER_WIDTH, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  }, [drawerAnim, overlayAnim]);

  // ── Load a session from history ──────────────────────────────────────────
  const loadSessionFromHistory = useCallback((session: LabSession) => {
    closeDrawer();
    stopSpeech();
    setChatMode(session.mode);
    setMessages(session.messages);
    setConversationId(null);
    setLabProjectId(null);
    currentSessionIdRef.current = session.id;
    setView("chat");
    if (session.mode === "general" || session.mode === "appbuilder") {
      getOrCreateLabProject().catch(() => {});
    }
  }, [closeDrawer, stopSpeech]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const clearPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    pollAttempts.current = 0;
  };

  const saveLabAuth = async (account: LabAccount) => {
    await AsyncStorage.setItem(LAB_AUTH_KEY, JSON.stringify(account));
    setLabAuth(account);
  };

  const proceedAfterPayment = async (account: LabAccount) => {
    const stored = await AsyncStorage.getItem(`${LAB_PIN_KEY}_${account.userId}`);
    setStoredPin(stored);
    setView(stored ? "pin_enter" : "pin_create");
  };

  const checkTier = async (uid: string): Promise<"free" | "plus" | "pro"> => {
    try {
      const base = getApiBase();
      const res = await fetch(`${base}subscription/${uid}`);
      const data = await res.json();
      return data.tier ?? "free";
    } catch { return "free"; }
  };

  // ── Get or create the persistent "Star Lab" default project for general chat ──
  const getOrCreateLabProject = async (): Promise<string | null> => {
    try {
      const base = getApiBase();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-id": labAuth?.userId ?? userId ?? "unknown",
      };
      // Check stored project ID first
      const stored = await AsyncStorage.getItem(LAB_PROJECT_KEY);
      if (stored) {
        // Verify it still exists
        const check = await fetch(`${base}lab/projects/${stored}`, { headers });
        if (check.ok) {
          setLabProjectId(stored);
          return stored;
        }
      }
      // Create a new default project
      const create = await fetch(`${base}lab/projects`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Star Lab", industry: "General" }),
      });
      if (!create.ok) return null;
      const project = await create.json();
      const id = String(project.id);
      await AsyncStorage.setItem(LAB_PROJECT_KEY, id);
      setLabProjectId(id);
      return id;
    } catch {
      return null;
    }
  };

  // ── Init: check stored auth on mount ────────────────────────────────────
  useEffect(() => {
    (async () => {
      // ── Owner bypass: only skip auth for the actual owner account ────────
      const mainUserId = await AsyncStorage.getItem("sirius_user_id");
      if (mainUserId === "garry") {
        const garryAccount: LabAccount = { email: "garry@sirius-ai.live", userId: "garry" };
        await AsyncStorage.setItem(LAB_AUTH_KEY, JSON.stringify(garryAccount));
        setLabAuth(garryAccount);
        setView("home");
        return;
      }
      // ── Normal auth flow ─────────────────────────────────────────────────
      const raw = await AsyncStorage.getItem(LAB_AUTH_KEY);
      if (!raw) { setView("login"); return; }
      let account: LabAccount;
      try { account = JSON.parse(raw); } catch { setView("login"); return; }
      setLabAuth(account);
      const tier = await checkTier(account.userId);
      if (tier === "pro") {
        await proceedAfterPayment(account);
      } else {
        // Signed in but not paid — go to payment
        setView("payment");
      }
    })();
  }, []);

  // ── Auto-activate Star Lab for main-app Pro subscribers ─────────────────
  // If the user already paid for Pro through the main app (RevenueCat IAP),
  // they should NOT have to create a separate Star Lab account or pay again.
  useEffect(() => {
    if (subscription.isLoading) return;       // wait for RC to finish loading
    if (!subscription.isPro) return;           // only Pro unlocks Star Lab
    if (labAutoActivatedRef.current) return;   // already ran this session
    // Only fire when stuck at a gate screen (not already inside Star Lab)
    const gateViews: LabView[] = ["loading", "login", "signup", "payment", "forgot", "forgot_sent"];
    if (!gateViews.includes(view)) return;

    labAutoActivatedRef.current = true;

    (async () => {
      // Use the main app's userId as the Lab userId — same person, no second account needed
      const uid = userId ?? (await AsyncStorage.getItem("sirius_user_id")) ?? `iap_${Date.now()}`;
      const account: LabAccount = { email: `${uid}@sirius-app.internal`, userId: uid };

      // Persist so the next open skips straight through
      await AsyncStorage.setItem(LAB_AUTH_KEY, JSON.stringify(account));
      setLabAuth(account);

      // Tell the server this user is Pro (same call Star Lab's own IAP flow makes)
      try {
        const base = getApiBase();
        await fetch(`${base}stripe/activate-lab`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: uid }),
        });
      } catch {}

      // Go through PIN setup / entry as normal (keeps security intact)
      await proceedAfterPayment(account);
    })();
  }, [subscription.isLoading, subscription.isPro, view, userId]);

  // ── Poll for payment confirmation (Stripe / bank) ────────────────────────
  useEffect(() => {
    if (view !== "waiting" || !labAuth) return;
    clearPoll();
    pollAttempts.current = 0;
    pollRef.current = setInterval(async () => {
      pollAttempts.current++;
      if (pollAttempts.current > POLL_MAX_ATTEMPTS) {
        clearPoll();
        setPayError("Payment not yet confirmed. Please contact support@sirius-ai.live or tap 'I've Paid' once your payment completes.");
        setView("payment");
        return;
      }
      const tier = await checkTier(labAuth.userId);
      if (tier === "pro") {
        clearPoll();
        await proceedAfterPayment(labAuth);
      }
    }, POLL_INTERVAL_MS);
    return () => clearPoll();
  }, [view, labAuth]);

  // ─────────────────────────────────────────────────────────────────────────
  // AUTH HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    const email = authEmail.trim().toLowerCase();
    const password = authPassword;
    if (!email || !password) { setAuthError("Please enter your email and password."); return; }
    setAuthLoading(true);
    setAuthError("");
    try {
      const base = getApiBase();
      const res = await fetch(`${base}auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || "Login failed. Please try again."); return; }
      const account: LabAccount = { email, userId: data.userId };
      await saveLabAuth(account);
      // Use tier from login response if present (e.g. Garry bypass), otherwise check
      const tier = (data.tier as string | undefined) ?? await checkTier(data.userId);
      if (tier === "pro") {
        await proceedAfterPayment(account);
      } else {
        setView("payment");
      }
    } catch {
      setAuthError("Connection failed. Check your internet and try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async () => {
    const email = authEmail.trim().toLowerCase();
    const password = authPassword;
    const confirm = authConfirm;
    if (!email || !password) { setAuthError("Please fill in all fields."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setAuthError("Please enter a valid email address."); return; }
    if (password.length < 8) { setAuthError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setAuthError("Passwords do not match."); return; }
    setAuthLoading(true);
    setAuthError("");
    try {
      const base = getApiBase();
      const res = await fetch(`${base}auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || "Sign up failed. Please try again."); return; }
      const account: LabAccount = { email, userId: data.userId };
      await saveLabAuth(account);
      setView("payment");
    } catch {
      setAuthError("Connection failed. Check your internet and try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgot = async () => {
    const email = authEmail.trim().toLowerCase();
    if (!email) { setAuthError("Please enter your email address."); return; }
    setAuthLoading(true);
    setAuthError("");
    try {
      const base = getApiBase();
      await fetch(`${base}auth/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always show success — server doesn't reveal if email exists
      setView("forgot_sent");
    } catch {
      setAuthError("Connection failed. Check your internet and try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Sign out of Star Lab? You'll need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          clearPoll();
          if (labAuth) {
            await AsyncStorage.removeItem(`${LAB_PIN_KEY}_${labAuth.userId}`);
          }
          await AsyncStorage.removeItem(LAB_AUTH_KEY);
          setLabAuth(null);
          setStoredPin(null);
          setPinInput("");
          setAuthEmail("");
          setAuthPassword("");
          setAuthConfirm("");
          setAuthError("");
          setView("login");
        },
      },
    ]);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PAYMENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleAppleIAP = async () => {
    if (!labAuth || !subscription.proPackage) return;
    setPayLoading(true);
    setPayError("");
    try {
      await subscription.purchase(subscription.proPackage);
      // RC purchase succeeded — sync to our server
      const base = getApiBase();
      await fetch(`${base}stripe/activate-lab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: labAuth.userId }),
      });
      await proceedAfterPayment(labAuth);
    } catch (err: any) {
      if (!err?.userCancelled) {
        setPayError("Purchase failed. Please try again or use card payment.");
      }
    } finally {
      setPayLoading(false);
    }
  };

  const handleCheckPayment = async () => {
    if (!labAuth) return;
    const tier = await checkTier(labAuth.userId);
    if (tier === "pro") {
      clearPoll();
      await proceedAfterPayment(labAuth);
    } else {
      Alert.alert("Not confirmed yet", "Your payment hasn't been confirmed yet. Please complete checkout in your browser, then tap this button again.");
    }
  };

  const handleRestorePurchase = async () => {
    if (!labAuth) return;
    setPayLoading(true);
    try {
      await subscription.restore();
      if (subscription.isPro) {
        const base = getApiBase();
        await fetch(`${base}stripe/activate-lab`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: labAuth.userId }),
        });
        await proceedAfterPayment(labAuth);
      } else {
        Alert.alert("No subscription found", "No active Pro subscription was found on this Apple ID. If you paid by card, tap 'Check Payment Status'.");
      }
    } catch {
      Alert.alert("Restore failed", "Could not restore purchases. Please try again.");
    } finally {
      setPayLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PIN HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handlePinSubmit = async () => {
    if (!labAuth) return;
    setPinError("");
    setPinLoading(true);
    try {
      if (view === "pin_create") {
        if (pinInput.length < 4) { setPinError("PIN must be at least 4 characters."); return; }
        if (pinInput !== confirmInput) { setPinError("PINs do not match."); return; }
        await AsyncStorage.setItem(`${LAB_PIN_KEY}_${labAuth.userId}`, pinInput);
        setStoredPin(pinInput);
        setPinInput(""); setConfirmInput("");
        setView("home");
      } else {
        if (pinInput !== storedPin) { setPinError("Incorrect PIN. Try again."); setPinInput(""); return; }
        setPinInput("");
        setView("home");
      }
    } finally {
      setPinLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CHAT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  // ── Session-based history ────────────────────────────────────────────────
  const upsertSession = useCallback(async (session: LabSession) => {
    try {
      const raw = await AsyncStorage.getItem(SESSIONS_KEY);
      const all: LabSession[] = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex(s => s.id === session.id);
      if (idx >= 0) {
        all[idx] = session;
        // Move to top
        all.unshift(all.splice(idx, 1)[0]);
      } else {
        all.unshift(session);
      }
      const trimmed = all.slice(0, MAX_SESSIONS);
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
      setSessions(trimmed);
    } catch {}
  }, []);

  // Alias kept for call-sites inside streaming callback
  const saveHistory = useCallback(async (_mode: ChatMode, msgs: Message[]) => {
    if (!currentSessionIdRef.current || msgs.length === 0) return;
    const firstUser = msgs.find(m => m.role === "user");
    const title = firstUser?.content?.slice(0, 50) || "Lab session";
    const slim = msgs.map(m => ({ ...m, uploadedImageBase64: undefined }));
    await upsertSession({
      id:       currentSessionIdRef.current,
      mode:     chatMode,
      title,
      date:     new Date().toISOString(),
      messages: slim,
    });
  }, [upsertSession, chatMode]);

  const openChat = async (mode: ChatMode) => {
    currentSessionIdRef.current = null; // fresh session — ID assigned on first send
    setChatMode(mode);
    setConversationId(null);
    setInputText("");
    setSelectedDocBase64(null);
    setSelectedDocName(null);
    setMessages([]); // always start blank; load from drawer

    setView("chat");
    if (mode === "general" || mode === "appbuilder") {
      getOrCreateLabProject().catch(() => {});
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain", "text/markdown",
               "application/msword",
               "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" as any });
      setSelectedDocBase64(base64);
      setSelectedDocName(asset.name ?? "document");
    } catch {}
  };

  // ── Voice recording ──────────────────────────────────────────────────────
  const toggleVoiceRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      const recording = recordingRef.current;
      if (!recording) return;
      try {
        await recording.stopAndUnloadAsync();
        recordingRef.current = null;
        const uri = recording.getURI();
        if (!uri) return;
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" as any });
        const apiBase = getApiBase();
        const transcRes = await fetch(`${apiBase}lab/voice-transcribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": labAuth?.userId ?? userId ?? "unknown" },
          body: JSON.stringify({ audioBase64: base64, mimeType: "audio/m4a" }),
        });
        if (transcRes.ok) {
          const { text } = await transcRes.json();
          if (text) setInputText(prev => prev ? `${prev} ${text}` : text);
        }
      } catch { Alert.alert("Transcription failed", "Could not process audio."); }
    } else {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permission needed", "Microphone access is required for voice input."); return; }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        recordingRef.current = recording;
        setIsRecording(true);
      } catch { Alert.alert("Recording failed", "Could not start microphone."); }
    }
  };

  // ── Trade show scanner — camera / library → send as image for analysis ──
  const pickTradeShowImage = async () => {
    Alert.alert("Trade Show Scanner", "Capture or upload a product photo to reverse-engineer it.", [
      {
        text: "📷 Take Photo",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed", "Camera access required."); return; }
          const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.8 });
          if (!result.canceled && result.assets?.[0]?.base64) {
            setSelectedImageBase64(result.assets[0].base64);
            setInputText("Reverse engineer this product — give me the full spec: dimensions, materials, manufacturing process, cost breakdown, and who makes it.");
          }
        },
      },
      {
        text: "🖼 Choose from Library",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed", "Photo library access required."); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.8 });
          if (!result.canceled && result.assets?.[0]?.base64) {
            setSelectedImageBase64(result.assets[0].base64);
            setInputText("Reverse engineer this product — give me the full spec: dimensions, materials, manufacturing process, cost breakdown, and who makes it.");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed && !selectedDocBase64 && !selectedImageBase64) return;
    if (isStreaming) return;
    stopSpeech();

    const uid = labAuth?.userId || userId || (await getUserId());
    const docB64   = selectedDocBase64;
    const docName  = selectedDocName;
    const imgB64   = selectedImageBase64;
    const displayContent = trimmed || (docName ? `[Attached: ${docName}]` : imgB64 ? "[Product image attached]" : "");

    // Assign a session ID on the first message of this chat
    if (!currentSessionIdRef.current) {
      currentSessionIdRef.current = generateId();
    }

    const userMsg: Message = { id: generateId(), role: "user", content: displayContent, status: "sent" };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setSelectedDocBase64(null);
    setSelectedDocName(null);
    setSelectedImageBase64(null);
    setIsStreaming(true);
    setShowTyping(true);

    try {
      const base = getApiBase();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      let res: Response;

      if (chatMode === "general" || chatMode === "appbuilder") {
        // ── Lab project chat — full tool access (renders, patent check, web search, save_to_project) ──
        let projId = labProjectId;
        if (!projId) projId = await getOrCreateLabProject();
        if (!projId) throw new Error("Could not create lab project");

        const body: Record<string, any> = { message: displayContent };
        if (chatMode === "appbuilder") body.mode = "bot";
        if (docB64)  { body.documentBase64 = docB64;  body.documentName = docName; }
        if (imgB64)  { body.imageBase64 = imgB64; }

        res = await resilientFetch(`${base}lab/projects/${projId}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": labAuth?.userId ?? userId ?? "unknown",
          },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        }, "starlab");
      } else {
        // ── General conversation endpoint (code mode only now) ──
        let convoId = conversationId;
        if (!convoId) {
          const convo = await createConversation(MODE_LABELS[chatMode], uid);
          convoId = convo.id;
          setConversationId(convoId);
        }

        const body: Record<string, any> = {
          message: displayContent,
          mode: "guru",
          systemPrompt: SYSTEM_PROMPTS[chatMode],
          userId: uid,
        };
        if (docB64) { body.documentBase64 = docB64; body.documentName = docName; }

        res = await resilientFetch(`${base}openai/conversations/${convoId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        }, "starlab");
      }

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const assistantId = generateId();
      setShowTyping(false);
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", images: [] } as any]);

      const reader = (res.body as any).getReader();
      const decoder = new TextDecoder();
      let buf = "", full = "";
      const inlineImages: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const evt = JSON.parse(raw);
            if (evt.done || evt.type === "done") break;
            // Inline image render from generate_render tool
            if (evt.type === "image") {
              const imgSrc = evt.url
                ? evt.url
                : evt.b64
                  ? `data:${evt.mimeType ?? "image/jpeg"};base64,${evt.b64}`
                  : null;
              if (imgSrc) {
                inlineImages.push(imgSrc);
                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, images: [...inlineImages] } : m));
              }
              continue;
            }
            // Render queue events — show status so user sees progress
            if (evt.type === "render_queued") {
              if (!full) {
                full = "🎨 Generating render…";
                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: full } : m));
              }
              continue;
            }
            if (evt.type === "render_started") {
              if (!full || full === "🎨 Generating render…") {
                full = "🎨 Rendering…";
                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: full } : m));
              }
              continue;
            }
            // Tool/action events — swallow silently (visible in action log)
            if (evt.type === "tool_call" || evt.type === "action" || evt.type === "tool_result") {
              continue;
            }
            const chunk = evt.content ?? (evt.type === "text" ? evt.delta : null);
            if (chunk) {
              full += chunk;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: full } : m));
            }
          } catch {}
        }
      }
      // Speak the full response (only when voice mode is on)
      if (voiceMode && full) speakWithChunks(full);

      // Persist conversation history for next session
      if (full) {
        setMessages(prev => {
          saveHistory(chatMode, prev);
          return prev;
        });
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        const isNetworkErr = e?.isOffline || e?.isRetryable || e instanceof TypeError;
        if (isNetworkErr) {
          // resilientFetch already saved to AsyncStorage — mark message as queued in UI
          setMessages(prev => prev.map(m =>
            m.id === userMsg.id ? { ...m, status: "queued" as const } : m
          ));
        } else {
          setMessages(prev => [...prev, { id: generateId(), role: "assistant", content: "Something went wrong. Please try again." }]);
        }
      }
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
      abortRef.current = null;
    }
  }, [inputText, selectedDocBase64, selectedDocName, selectedImageBase64, isStreaming, userId, labAuth, conversationId, chatMode, labProjectId, stopSpeech, speakWithChunks, voiceMode, saveHistory]);

  const generateBrief = useCallback(async () => {
    if (messages.length === 0 || generatingBrief) return;
    setGeneratingBrief(true);
    setBriefText("");
    setBriefSubmitted(false);
    setShowBriefModal(true);
    try {
      const uid = labAuth?.userId || userId || (await getUserId());
      const base = getApiBase();
      let convoId = conversationId;
      if (!convoId) {
        const convo = await createConversation("App Brief", uid);
        convoId = convo.id;
        setConversationId(convoId);
      }
      const summaryPrompt = "Based on everything discussed so far, write a complete, structured App Brief in plain text with these sections: APP NAME, PURPOSE, TARGET USERS, CORE FEATURES (numbered list), PLATFORM, DESIGN STYLE, INTEGRATIONS NEEDED, and TIMELINE. Be specific and concise. This brief will be sent to the build team.";
      const res = await fetch(`${base}openai/conversations/${convoId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: summaryPrompt, mode: "guru", systemPrompt: SYSTEM_PROMPTS.appbuilder, userId: uid }),
      });
      if (!res.ok || !res.body) throw new Error("Failed");
      const reader = (res.body as any).getReader();
      const decoder = new TextDecoder();
      let buf = "", full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const evt = JSON.parse(raw);
            const chunk = evt.content ?? (evt.type === "text" ? evt.delta : null);
            if (chunk) { full += chunk; setBriefText(full); }
          } catch {}
        }
      }
    } catch { setBriefText("Could not generate brief. Please try again."); }
    finally { setGeneratingBrief(false); }
  }, [messages, generatingBrief, userId, labAuth, conversationId]);

  const submitBrief = async () => {
    try {
      const base = getApiBase();
      const uid = labAuth?.userId || userId || (await getUserId());
      const res = await fetch(`${base}lab/app-briefs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": uid || "unknown" },
        body: JSON.stringify({ brief: briefText, userId: uid }),
      });
      // Fire and forget — also send email as fallback
      if (!res.ok) throw new Error("API failed");
    } catch {
      // Fallback to mailto if server unreachable
      const subject = encodeURIComponent("App Build Brief — Sirius Star Lab");
      const mailBody = encodeURIComponent(`Hello,\n\nI have designed an app using Sirius Star Lab and I'd like to submit it for building.\n\n${briefText}\n\nPlease get back to me with next steps.\n\nThank you`);
      Linking.openURL(`mailto:support@sirius-ai.live?subject=${subject}&body=${mailBody}`);
    }
    setBriefSubmitted(true);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const Header = ({
    title, onBack, right,
  }: {
    title: string;
    onBack?: () => void;
    right?: React.ReactNode;
  }) => (
    <View style={s.header}>
      <Pressable
        onPress={onBack ?? (() => router.push("/(tabs)" as any))}
        style={s.backBtn} hitSlop={12}
      >
        <Feather name="chevron-left" size={22} color={Colors.primary} />
      </Pressable>
      <Text style={s.headerTitle}>{title}</Text>
      {right ?? <View style={{ width: 36 }} />}
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // VIEWS
  // ─────────────────────────────────────────────────────────────────────────

  // ── Loading ──────────────────────────────────────────────────────────────
  if (view === "loading") {
    return (
      <View style={[s.center, { backgroundColor: Colors.background }]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  if (view === "login") {
    return (
      <KeyboardAvoidingView style={[s.root, { paddingTop: topPad }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Header title="Star Lab" />
        <ScrollView contentContainerStyle={[s.authWrap, { paddingBottom: bottomPad + 32 }]} keyboardShouldPersistTaps="handled">
          <View style={s.authHero}>
            <View style={s.labIcon}><Feather name="zap" size={30} color="#6366f1" /></View>
            <Text style={s.authTitle}>Sign in to Star Lab</Text>
            <Text style={s.authSub}>Star Lab Pro — your private R&D intelligence platform.</Text>
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>EMAIL</Text>
            <View style={s.fieldRow}>
              <Feather name="mail" size={15} color={Colors.textDim} />
              <TextInput
                style={s.fieldInput}
                value={authEmail}
                onChangeText={t => { setAuthEmail(t); setAuthError(""); }}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={Colors.primary}
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>PASSWORD</Text>
            <View style={s.fieldRow}>
              <Feather name="lock" size={15} color={Colors.textDim} />
              <TextInput
                style={s.fieldInput}
                value={authPassword}
                onChangeText={t => { setAuthPassword(t); setAuthError(""); }}
                placeholder="Your password"
                placeholderTextColor={Colors.textDim}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={Colors.primary}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
              <Pressable onPress={() => setShowPw(v => !v)} hitSlop={10}>
                <Feather name={showPw ? "eye-off" : "eye"} size={15} color={Colors.textDim} />
              </Pressable>
            </View>
          </View>

          {authError ? <Text style={s.authError}>{authError}</Text> : null}

          <Pressable
            onPress={handleLogin}
            disabled={authLoading}
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }, authLoading && { opacity: 0.7 }]}
          >
            {authLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>Sign In</Text>}
          </Pressable>

          <Pressable onPress={() => { setAuthError(""); setView("forgot"); }} style={s.linkBtn}>
            <Text style={s.linkText}>Forgot your password?</Text>
          </Pressable>

          <View style={s.divider}><View style={s.dividerLine} /><Text style={s.dividerText}>New to Star Lab?</Text><View style={s.dividerLine} /></View>

          <Pressable
            onPress={() => { setAuthError(""); setAuthPassword(""); setAuthConfirm(""); setView("signup"); }}
            style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={s.secondaryBtnText}>Create an Account</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Sign Up ───────────────────────────────────────────────────────────────
  if (view === "signup") {
    return (
      <KeyboardAvoidingView style={[s.root, { paddingTop: topPad }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Header title="Create Account" onBack={() => { setAuthError(""); setView("login"); }} />
        <ScrollView contentContainerStyle={[s.authWrap, { paddingBottom: bottomPad + 32 }]} keyboardShouldPersistTaps="handled">
          <View style={s.authHero}>
            <View style={s.labIcon}><Feather name="user-plus" size={28} color="#6366f1" /></View>
            <Text style={s.authTitle}>Create your account</Text>
            <Text style={s.authSub}>Sign up, then complete payment to unlock Star Lab Pro.</Text>
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>EMAIL</Text>
            <View style={s.fieldRow}>
              <Feather name="mail" size={15} color={Colors.textDim} />
              <TextInput
                style={s.fieldInput}
                value={authEmail}
                onChangeText={t => { setAuthEmail(t); setAuthError(""); }}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={Colors.primary}
              />
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>PASSWORD</Text>
            <View style={s.fieldRow}>
              <Feather name="lock" size={15} color={Colors.textDim} />
              <TextInput
                style={s.fieldInput}
                value={authPassword}
                onChangeText={t => { setAuthPassword(t); setAuthError(""); }}
                placeholder="Minimum 8 characters"
                placeholderTextColor={Colors.textDim}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={Colors.primary}
              />
              <Pressable onPress={() => setShowPw(v => !v)} hitSlop={10}>
                <Feather name={showPw ? "eye-off" : "eye"} size={15} color={Colors.textDim} />
              </Pressable>
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>CONFIRM PASSWORD</Text>
            <View style={s.fieldRow}>
              <Feather name="lock" size={15} color={Colors.textDim} />
              <TextInput
                style={s.fieldInput}
                value={authConfirm}
                onChangeText={t => { setAuthConfirm(t); setAuthError(""); }}
                placeholder="Repeat your password"
                placeholderTextColor={Colors.textDim}
                secureTextEntry={!showConfirmPw}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={Colors.primary}
                onSubmitEditing={handleSignup}
                returnKeyType="go"
              />
              <Pressable onPress={() => setShowConfirmPw(v => !v)} hitSlop={10}>
                <Feather name={showConfirmPw ? "eye-off" : "eye"} size={15} color={Colors.textDim} />
              </Pressable>
            </View>
          </View>

          {authError ? <Text style={s.authError}>{authError}</Text> : null}

          <Pressable
            onPress={handleSignup}
            disabled={authLoading}
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }, authLoading && { opacity: 0.7 }]}
          >
            {authLoading
              ? <ActivityIndicator color="#fff" />
              : <><Feather name="arrow-right" size={16} color="#fff" /><Text style={s.primaryBtnText}>Continue to Payment</Text></>}
          </Pressable>

          <Pressable onPress={() => { setAuthError(""); setView("login"); }} style={s.linkBtn}>
            <Text style={s.linkText}>Already have an account? Sign in</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Forgot Password ───────────────────────────────────────────────────────
  if (view === "forgot") {
    return (
      <KeyboardAvoidingView style={[s.root, { paddingTop: topPad }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Header title="Reset Password" onBack={() => { setAuthError(""); setView("login"); }} />
        <ScrollView contentContainerStyle={[s.authWrap, { paddingBottom: bottomPad + 32 }]} keyboardShouldPersistTaps="handled">
          <View style={s.authHero}>
            <View style={s.labIcon}><Feather name="unlock" size={28} color="#6366f1" /></View>
            <Text style={s.authTitle}>Forgot your password?</Text>
            <Text style={s.authSub}>Enter your email and we'll send you a reset link.</Text>
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>EMAIL</Text>
            <View style={s.fieldRow}>
              <Feather name="mail" size={15} color={Colors.textDim} />
              <TextInput
                style={s.fieldInput}
                value={authEmail}
                onChangeText={t => { setAuthEmail(t); setAuthError(""); }}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={Colors.primary}
                onSubmitEditing={handleForgot}
                returnKeyType="send"
                autoFocus
              />
            </View>
          </View>

          {authError ? <Text style={s.authError}>{authError}</Text> : null}

          <Pressable
            onPress={handleForgot}
            disabled={authLoading}
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }, authLoading && { opacity: 0.7 }]}
          >
            {authLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Send Reset Link</Text>}
          </Pressable>

          <Pressable onPress={() => { setAuthError(""); setView("login"); }} style={s.linkBtn}>
            <Text style={s.linkText}>Back to Sign In</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Forgot Sent ───────────────────────────────────────────────────────────
  if (view === "forgot_sent") {
    return (
      <View style={[s.root, { paddingTop: topPad }]}>
        <Header title="Reset Password" onBack={() => setView("login")} />
        <View style={s.gateWrap}>
          <View style={[s.labIcon, { backgroundColor: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.25)" }]}>
            <Feather name="mail" size={30} color="#22c55e" />
          </View>
          <Text style={s.gateTitle}>Check your email</Text>
          <Text style={s.gateSub}>
            We've sent a password reset link to{"\n"}
            <Text style={{ color: Colors.text, fontFamily: "Inter_600SemiBold" }}>{authEmail || "your email"}</Text>.{"\n\n"}
            Open the link to set a new password, then come back and sign in.
          </Text>
          <Pressable
            onPress={() => { setAuthEmail(""); setAuthPassword(""); setView("login"); }}
            style={({ pressed }) => [s.primaryBtn, { marginTop: 24 }, pressed && { opacity: 0.85 }]}
          >
            <Text style={s.primaryBtnText}>Back to Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Payment ───────────────────────────────────────────────────────────────
  if (view === "payment") {
    const isIOS = Platform.OS === "ios";
    const hasAppleIAP = isIOS && !!subscription.proPackage;

    return (
      <View style={[s.root, { paddingTop: topPad }]}>
        <Header
          title="Star Lab Pro"
          right={
            <Pressable onPress={handleSignOut} style={s.backBtn} hitSlop={12}>
              <Feather name="log-out" size={17} color={Colors.textDim} />
            </Pressable>
          }
        />
        <ScrollView contentContainerStyle={[s.authWrap, { paddingBottom: bottomPad + 32 }]} showsVerticalScrollIndicator={false}>

          {/* Plan card */}
          <View style={s.planCard}>
            <View style={s.planCardHeader}>
              <View style={[s.labIcon, { width: 52, height: 52, borderRadius: 16 }]}>
                <Feather name="award" size={24} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.planName}>Sirius Pro</Text>
                <Text style={s.planPrice}>£19.99 <Text style={s.planPricePer}>/month</Text></Text>
              </View>
            </View>

            <View style={s.planFeatures}>
              {[
                "Star Lab — App Builder, Code Builder & R&D",
                "500 messages per day",
                "Voice conversations with Sirius",
                "Telegram — Sirius messages you proactively",
                "Full memory & personalisation",
                "Early access to new features",
              ].map(f => (
                <View key={f} style={s.planFeatureRow}>
                  <Feather name="check" size={14} color="#22c55e" />
                  <Text style={s.planFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {labAuth && (
            <Text style={s.accountNote}>
              Signing up as <Text style={{ color: Colors.text }}>{labAuth.email}</Text>
            </Text>
          )}

          {payError ? <Text style={s.authError}>{payError}</Text> : null}

          {/* Apple IAP button (iOS only, when product is available) */}
          {hasAppleIAP && (
            <Pressable
              onPress={handleAppleIAP}
              disabled={payLoading || subscription.isPurchasing}
              style={({ pressed }) => [s.appleBtn, pressed && { opacity: 0.85 }, (payLoading || subscription.isPurchasing) && { opacity: 0.7 }]}
            >
              {(payLoading || subscription.isPurchasing)
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Feather name="shopping-bag" size={17} color="#fff" />
                    <Text style={s.appleBtnText}>Subscribe with Apple — {subscription.proPackage?.product.priceString ?? "£19.99"}/mo</Text>
                  </>}
            </Pressable>
          )}

          {/* Web checkout fallback (non-iOS or no IAP package) */}
          {(!isIOS || !hasAppleIAP) && (
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync("https://sirius-ai.live/pricing?plan=pro&source=app")}
              disabled={payLoading}
              style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }, payLoading && { opacity: 0.7 }]}
            >
              <Feather name="credit-card" size={16} color="#fff" />
              <Text style={s.primaryBtnText}>Subscribe — £19.99/mo</Text>
            </Pressable>
          )}

          {/* Restore purchases (iOS) */}
          {isIOS && (
            <Pressable onPress={handleRestorePurchase} disabled={payLoading} style={s.linkBtn}>
              <Text style={s.linkText}>Restore previous purchase</Text>
            </Pressable>
          )}

          <Text style={s.payNote}>
            Payment is processed securely via Stripe or Apple. Access is granted as soon as payment is confirmed — no delays.
          </Text>

          <Pressable onPress={handleSignOut} style={s.linkBtn}>
            <Text style={[s.linkText, { color: Colors.textMuted }]}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── Waiting for payment confirmation ──────────────────────────────────────
  if (view === "waiting") {
    return (
      <View style={[s.root, { paddingTop: topPad }]}>
        <Header title="Confirming Payment" onBack={() => { clearPoll(); setView("payment"); }} />
        <View style={s.gateWrap}>
          <ActivityIndicator color={Colors.primary} size="large" style={{ marginBottom: 24 }} />
          <Text style={s.gateTitle}>Waiting for confirmation…</Text>
          <Text style={s.gateSub}>
            Complete your payment in the browser. Once confirmed, you'll be brought straight into Star Lab — no action needed here.
          </Text>

          <Pressable
            onPress={handleCheckPayment}
            style={({ pressed }) => [s.primaryBtn, { marginTop: 28 }, pressed && { opacity: 0.85 }]}
          >
            <Feather name="refresh-cw" size={15} color="#fff" />
            <Text style={s.primaryBtnText}>I've Paid — Check Now</Text>
          </Pressable>

          <Pressable onPress={() => Linking.openURL("mailto:support@sirius-ai.live")} style={s.linkBtn}>
            <Text style={s.linkText}>Having trouble? Contact support</Text>
          </Pressable>

          <Pressable onPress={() => { clearPoll(); setView("payment"); }} style={s.linkBtn}>
            <Text style={[s.linkText, { color: Colors.textMuted }]}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── PIN create ────────────────────────────────────────────────────────────
  if (view === "pin_create") {
    return (
      <KeyboardAvoidingView style={[s.root, { paddingTop: topPad }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Header title="Star Lab" />
        <ScrollView contentContainerStyle={[s.gateWrap, { paddingBottom: bottomPad + 32 }]} keyboardShouldPersistTaps="handled">
          <View style={s.labIcon}><Feather name="lock" size={30} color={Colors.primary} /></View>
          <Text style={s.gateTitle}>Create your Lab PIN</Text>
          <Text style={s.gateSub}>Set a PIN to protect your Star Lab. You'll need it every time you enter.</Text>

          <View style={s.field}>
            <Text style={s.fieldLabel}>NEW PIN</Text>
            <View style={s.fieldRow}>
              <Feather name="lock" size={15} color={Colors.textDim} />
              <TextInput
                style={s.fieldInput}
                value={pinInput}
                onChangeText={setPinInput}
                placeholder="Minimum 4 characters"
                placeholderTextColor={Colors.textDim}
                secureTextEntry={!showPin}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={Colors.primary}
              />
              <Pressable onPress={() => setShowPin(v => !v)} hitSlop={10}>
                <Feather name={showPin ? "eye-off" : "eye"} size={15} color={Colors.textDim} />
              </Pressable>
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.fieldLabel}>CONFIRM PIN</Text>
            <View style={s.fieldRow}>
              <Feather name="lock" size={15} color={Colors.textDim} />
              <TextInput
                style={s.fieldInput}
                value={confirmInput}
                onChangeText={setConfirmInput}
                placeholder="Repeat your PIN"
                placeholderTextColor={Colors.textDim}
                secureTextEntry={!showPin}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={Colors.primary}
                onSubmitEditing={handlePinSubmit}
                returnKeyType="done"
              />
            </View>
          </View>

          {pinError ? <Text style={s.authError}>{pinError}</Text> : null}

          <Pressable
            onPress={handlePinSubmit}
            disabled={pinLoading}
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }, pinLoading && { opacity: 0.7 }]}
          >
            {pinLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Create PIN & Enter Lab</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── PIN enter ─────────────────────────────────────────────────────────────
  if (view === "pin_enter") {
    return (
      <KeyboardAvoidingView style={[s.root, { paddingTop: topPad }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Header
          title="Star Lab"
          right={
            <Pressable onPress={handleSignOut} style={s.backBtn} hitSlop={12}>
              <Feather name="log-out" size={17} color={Colors.textDim} />
            </Pressable>
          }
        />
        <ScrollView contentContainerStyle={[s.gateWrap, { paddingBottom: bottomPad + 32 }]} keyboardShouldPersistTaps="handled">
          <View style={s.labIcon}><Feather name="shield" size={30} color={Colors.primary} /></View>
          <Text style={s.gateTitle}>Enter your Lab PIN</Text>
          {labAuth && <Text style={s.accountNote}>{labAuth.email}</Text>}

          <View style={s.field}>
            <Text style={s.fieldLabel}>LAB PIN</Text>
            <View style={s.fieldRow}>
              <Feather name="lock" size={15} color={Colors.textDim} />
              <TextInput
                style={s.fieldInput}
                value={pinInput}
                onChangeText={setPinInput}
                placeholder="Enter your PIN"
                placeholderTextColor={Colors.textDim}
                secureTextEntry={!showPin}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={Colors.primary}
                onSubmitEditing={handlePinSubmit}
                returnKeyType="done"
                autoFocus
              />
              <Pressable onPress={() => setShowPin(v => !v)} hitSlop={10}>
                <Feather name={showPin ? "eye-off" : "eye"} size={15} color={Colors.textDim} />
              </Pressable>
            </View>
          </View>

          {pinError ? <Text style={s.authError}>{pinError}</Text> : null}

          <Pressable
            onPress={handlePinSubmit}
            disabled={pinLoading}
            style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.85 }, pinLoading && { opacity: 0.7 }]}
          >
            {pinLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Enter Lab</Text>}
          </Pressable>

          <Pressable
            onPress={async () => {
              if (!labAuth) return;
              await AsyncStorage.removeItem(`${LAB_PIN_KEY}_${labAuth.userId}`);
              setStoredPin(null); setPinInput("");
              setView("pin_create");
            }}
            style={{ marginTop: 16 }}
          >
            <Text style={{ color: Colors.textDim, fontSize: 13, textAlign: "center", fontFamily: "Inter_400Regular" }}>
              Forgot PIN? Reset it
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Home ──────────────────────────────────────────────────────────────────
  if (view === "home") {
    return (
      <View style={[s.root, { paddingTop: topPad }]}>
        <View style={s.header}>
          <Pressable onPress={() => router.push("/(tabs)" as any)} style={s.backBtn} hitSlop={12}>
            <Feather name="chevron-left" size={22} color={Colors.primary} />
          </Pressable>
          <Text style={s.headerTitle}>Star Lab</Text>
          <View style={s.externalBtn} />
        </View>

        <ScrollView contentContainerStyle={[s.homeContent, { paddingBottom: bottomPad + 24 }]} showsVerticalScrollIndicator={false}>
          <View style={s.homeHero}>
            <View style={s.heroIcon}><Feather name="zap" size={28} color="#6366f1" /></View>
            <Text style={s.heroTitle}>Your Private R&D Lab</Text>
            <Text style={s.heroSub}>Build apps, write code, and research anything — powered by Sirius intelligence.</Text>
          </View>

          <Pressable onPress={() => openChat("appbuilder")} style={({ pressed }) => [s.labCard, s.labCardAppBuilder, pressed && { opacity: 0.88 }]}>
            <View style={[s.labCardIcon, { backgroundColor: "rgba(99,102,241,0.15)" }]}>
              <Feather name="grid" size={24} color="#6366f1" />
            </View>
            <View style={s.labCardText}>
              <Text style={s.labCardTitle}>App Builder</Text>
              <Text style={s.labCardDesc}>Design, plan, and build your app idea from concept to code with Sirius guiding every step.</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(99,102,241,0.5)" />
          </Pressable>

          <Pressable onPress={() => openChat("code")} style={({ pressed }) => [s.labCard, s.labCardCode, pressed && { opacity: 0.88 }]}>
            <View style={[s.labCardIcon, { backgroundColor: "rgba(0,212,255,0.12)" }]}>
              <Feather name="code" size={24} color={Colors.primary} />
            </View>
            <View style={s.labCardText}>
              <Text style={s.labCardTitle}>Code Builder</Text>
              <Text style={s.labCardDesc}>Write production-ready code in any language. Complete working implementations — not snippets.</Text>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.primary + "60"} />
          </Pressable>

          <Pressable onPress={() => openChat("general")} style={({ pressed }) => [s.labCard, pressed && { opacity: 0.88 }]}>
            <View style={[s.labCardIcon, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
              <Feather name="message-circle" size={24} color="#f59e0b" />
            </View>
            <View style={s.labCardText}>
              <Text style={s.labCardTitle}>Lab Chat</Text>
              <Text style={s.labCardDesc}>Deep research, strategy, and intelligence — your private Sirius session for serious work.</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(245,158,11,0.5)" />
          </Pressable>

        </ScrollView>
      </View>
    );
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  const reversed = [...messages].reverse();
  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <ConnectionBanner />
      <View style={s.header}>
        <Pressable
          onPress={() => {
            stopSpeech();
            // Persist current messages before leaving chat view
            if (messages.length > 0) saveHistory(chatMode, messages);
            setView("home");
            setConversationId(null);
          }}
          style={s.backBtn}
          hitSlop={12}
        >
          <Feather name="chevron-left" size={22} color={Colors.primary} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={s.headerTitle}>{MODE_LABELS[chatMode]}</Text>
          <Text style={{ fontSize: 11, color: Colors.textDim, fontFamily: "Inter_400Regular" }}>Star Lab</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {/* History drawer */}
          <Pressable onPress={openDrawer} hitSlop={10} style={s.backBtn}>
            <Feather name="clock" size={17} color={Colors.textDim} />
          </Pressable>
          {/* Voice toggle */}
          <Pressable
            onPress={() => { if (voiceMode) stopSpeech(); setVoiceMode(v => !v); }}
            hitSlop={10}
            style={[s.backBtn, voiceMode && { backgroundColor: Colors.primary + "18", borderRadius: 18 }]}
          >
            <Feather name={voiceMode ? "volume-2" : "volume-x"} size={18} color={voiceMode ? Colors.primary : Colors.textDim} />
          </Pressable>
          {/* New session */}
          <Pressable
            onPress={() => {
              Alert.alert("New Session", "Save this conversation to history and start fresh?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "New Chat",
                  style: "destructive",
                  onPress: () => {
                    stopSpeech();
                    currentSessionIdRef.current = null;
                    setMessages([]);
                    setConversationId(null);
                  },
                },
              ]);
            }}
            hitSlop={10}
            style={s.backBtn}
          >
            <Feather name="plus-square" size={17} color={Colors.textDim} />
          </Pressable>
          {/* Brief button (App Builder only) */}
          {chatMode === "appbuilder" && messages.length > 0 ? (
            <Pressable onPress={generateBrief} style={s.briefBtn} hitSlop={8}>
              <Feather name="send" size={14} color="#6366f1" />
              <Text style={s.briefBtnText}>Brief</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        {messages.length === 0 ? (
          <View style={s.chatEmpty}>
            <View style={[s.labCardIcon, {
              backgroundColor: chatMode === "appbuilder" ? "rgba(99,102,241,0.15)" : chatMode === "code" ? "rgba(0,212,255,0.12)" : "rgba(245,158,11,0.12)",
              width: 60, height: 60, borderRadius: 30,
            }]}>
              <Feather
                name={chatMode === "appbuilder" ? "grid" : chatMode === "code" ? "code" : "message-circle"}
                size={28}
                color={chatMode === "appbuilder" ? "#6366f1" : chatMode === "code" ? Colors.primary : "#f59e0b"}
              />
            </View>
            <Text style={s.chatEmptyTitle}>{MODE_LABELS[chatMode]}</Text>
            <Text style={s.chatEmptySub}>
              {chatMode === "appbuilder"
                ? "Tell Sirius about the app you want to build. Once your idea is fully designed, you can submit the brief and our team will build and launch it for you."
                : chatMode === "code"
                ? "Tell me what code you need. I'll write complete, working implementations."
                : "What are we working on today?"}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={reversed}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View>
                <MessageBubble message={item} />
                {item.role === "user" && item.status === "queued" && (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingRight: 16, marginTop: -4, marginBottom: 4 }}>
                    <Feather name="clock" size={10} color="#f59e0b" />
                    <Text style={{ fontSize: 10, color: "#f59e0b", marginLeft: 3 }}>Queued</Text>
                  </View>
                )}
                {item.role === "user" && item.status === "sent" && (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingRight: 16, marginTop: -4, marginBottom: 4 }}>
                    <Feather name="check" size={10} color="#22c55e" />
                  </View>
                )}
              </View>
            )}
            inverted
            ListHeaderComponent={
              showTyping ? (
                <View style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
                  <TypingIndicator />
                </View>
              ) : null
            }
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />
        )}

        {selectedDocName && (
          <View style={s.docBar}>
            <Feather name="file-text" size={14} color={Colors.primary} />
            <Text style={s.docBarName} numberOfLines={1}>{selectedDocName}</Text>
            <Pressable onPress={() => { setSelectedDocBase64(null); setSelectedDocName(null); }} hitSlop={10}>
              <Feather name="x" size={14} color={Colors.textDim} />
            </Pressable>
          </View>
        )}

        {selectedImageBase64 && (
          <View style={s.docBar}>
            <Feather name="camera" size={14} color="#f59e0b" />
            <Text style={[s.docBarName, { color: "#f59e0b" }]}>Product image attached</Text>
            <Pressable onPress={() => setSelectedImageBase64(null)} hitSlop={10}>
              <Feather name="x" size={14} color={Colors.textDim} />
            </Pressable>
          </View>
        )}

        <View style={[s.inputArea, { paddingBottom: Math.max(bottomPad, 8) }]}>
          <View style={s.inputRow}>
            {/* Doc attach */}
            <Pressable onPress={pickDocument} style={s.inputBtn} hitSlop={8}>
              <Feather name="plus" size={20} color={Colors.textDim} />
            </Pressable>
            {/* Trade show scanner — only in general / appbuilder lab modes */}
            {(chatMode === "general" || chatMode === "appbuilder") && (
              <Pressable onPress={pickTradeShowImage} style={s.inputBtn} hitSlop={8}>
                <Feather name="camera" size={18} color={selectedImageBase64 ? "#f59e0b" : Colors.textDim} />
              </Pressable>
            )}
            <TextInput
              style={s.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={chatMode === "appbuilder" ? "Describe your app idea…" : chatMode === "code" ? "What code do you need?" : "I'm listening…"}
              placeholderTextColor={Colors.textDim}
              multiline
              maxLength={4000}
              selectionColor={Colors.primary}
            />
            {/* Voice input — lab modes only */}
            {(chatMode === "general" || chatMode === "appbuilder") && (
              <Pressable
                onPress={toggleVoiceRecording}
                disabled={isStreaming}
                style={[s.inputBtn, isRecording && { backgroundColor: "rgba(239,68,68,0.15)", borderRadius: 20 }]}
                hitSlop={8}
              >
                <Feather name={isRecording ? "square" : "mic"} size={18} color={isRecording ? "#ef4444" : Colors.textDim} />
              </Pressable>
            )}
            <Pressable
              onPress={handleSend}
              disabled={isStreaming || (!inputText.trim() && !selectedDocBase64 && !selectedImageBase64)}
              style={({ pressed }) => [
                s.sendBtn,
                (isStreaming || (!inputText.trim() && !selectedDocBase64 && !selectedImageBase64)) && { opacity: 0.4 },
                pressed && { opacity: 0.7 },
              ]}
            >
              {isStreaming
                ? <ActivityIndicator size="small" color={Colors.background} />
                : <Feather name="send" size={17} color={Colors.background} />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* App Builder Brief Modal */}
      <Modal visible={showBriefModal} transparent animationType="slide" onRequestClose={() => setShowBriefModal(false)}>
        <View style={s.briefOverlay}>
          <View style={[s.briefSheet, { paddingBottom: Math.max(bottomPad, 16) }]}>
            <View style={s.briefHandle} />
            <View style={s.briefHeader}>
              <View>
                <Text style={s.briefTitle}>App Brief</Text>
                <Text style={s.briefSubtitle}>Submit this to the build team to get started</Text>
              </View>
              <Pressable onPress={() => setShowBriefModal(false)} hitSlop={12}>
                <Feather name="x" size={20} color={Colors.textDim} />
              </Pressable>
            </View>

            {generatingBrief ? (
              <View style={s.briefLoading}>
                <ActivityIndicator color="#6366f1" />
                <Text style={s.briefLoadingText}>Generating your brief…</Text>
              </View>
            ) : briefSubmitted ? (
              <View style={s.briefSuccess}>
                <Text style={{ fontSize: 44, marginBottom: 12 }}>✅</Text>
                <Text style={s.briefSuccessTitle}>Brief Submitted!</Text>
                <Text style={s.briefSuccessText}>Your app brief has been sent to the Sirius build team at support@sirius-ai.live. We'll be in touch within 48 hours with next steps.</Text>
                <Pressable onPress={() => { setShowBriefModal(false); setBriefSubmitted(false); }} style={s.briefCloseBtn}>
                  <Text style={s.briefCloseBtnText}>Done</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <ScrollView style={s.briefBody} showsVerticalScrollIndicator={false}>
                  <Text style={s.briefBodyText}>{briefText || "Generating…"}</Text>
                </ScrollView>
                <View style={s.briefNote}>
                  <Feather name="info" size={13} color={Colors.textDim} />
                  <Text style={s.briefNoteText}>You design it — we build and launch it. Tapping submit opens your email app with this brief ready to send.</Text>
                </View>
                <Pressable
                  onPress={submitBrief}
                  disabled={!briefText || generatingBrief}
                  style={({ pressed }) => [s.briefSubmitBtn, pressed && { opacity: 0.85 }, (!briefText || generatingBrief) && { opacity: 0.5 }]}
                >
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={s.briefSubmitText}>Submit to Build Team</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── History Drawer ─────────────────────────────────────────────── */}
      {drawerOpen && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Backdrop */}
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)", opacity: overlayAnim }]}
            pointerEvents="auto"
          >
            <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
          </Animated.View>

          {/* Slide-in panel */}
          <Animated.View
            style={[s.histDrawer, { paddingTop: topPad, paddingBottom: insets.bottom + 16, transform: [{ translateX: drawerAnim }] }]}
            pointerEvents="auto"
          >
            <View style={s.histDrawerHeader}>
              <Text style={s.histDrawerTitle}>Lab History</Text>
              <Pressable onPress={closeDrawer} hitSlop={12}>
                <Feather name="x" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            {/* New Chat */}
            <Pressable
              onPress={() => { closeDrawer(); stopSpeech(); currentSessionIdRef.current = null; setMessages([]); setConversationId(null); }}
              style={s.histNewChat}
            >
              <Feather name="plus-circle" size={16} color={Colors.primary} />
              <Text style={s.histNewChatText}>New Chat</Text>
            </Pressable>

            {sessions.length === 0 ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 }}>
                <Feather name="clock" size={32} color={Colors.borderLight} />
                <Text style={{ color: Colors.textDim, fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 10 }}>No history yet</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 8 }}>
                {sessions.map(session => {
                  const d = new Date(session.date);
                  const now = new Date();
                  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
                  const timeLabel = diffDays === 0
                    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                    : diffDays === 1 ? "Yesterday"
                    : diffDays < 7  ? d.toLocaleDateString("en-GB", { weekday: "short" })
                    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                  const modeIcon  = session.mode === "appbuilder" ? "grid" : session.mode === "code" ? "code" : "message-circle";
                  const modeColor = session.mode === "appbuilder" ? "#6366f1" : session.mode === "code" ? Colors.primary : "#f59e0b";
                  const isActive  = session.id === currentSessionIdRef.current;
                  return (
                    <Pressable
                      key={session.id}
                      onPress={() => loadSessionFromHistory(session)}
                      style={({ pressed }) => [s.histItem, isActive && s.histItemActive, pressed && { opacity: 0.65 }]}
                    >
                      <View style={[s.histItemIcon, { backgroundColor: modeColor + "18" }]}>
                        <Feather name={modeIcon as any} size={14} color={modeColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.histItemTitle} numberOfLines={1}>{session.title}</Text>
                        <Text style={s.histItemMeta}>{MODE_LABELS[session.mode]} · {timeLabel}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text },
  backBtn:     { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  externalBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  // Auth / gate shared wrapper
  authWrap: {
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: "stretch",
  },
  authHero: { alignItems: "center", marginBottom: 28 },
  authTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, marginTop: 14, marginBottom: 6, textAlign: "center" },
  authSub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textDim, textAlign: "center", lineHeight: 19 },
  authError: { color: "#f87171", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 10, lineHeight: 18 },

  // Form fields
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: Colors.textDim, letterSpacing: 1, marginBottom: 6 },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  fieldInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },

  // Buttons
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },

  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginTop: 4,
  },
  secondaryBtnText: { color: Colors.primary, fontSize: 15, fontFamily: "Inter_600SemiBold" },

  appleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#000",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 8,
  },
  appleBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },

  linkBtn: { marginTop: 14, alignItems: "center" },
  linkText: { color: Colors.primary, fontSize: 13, fontFamily: "Inter_400Regular" },

  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textDim },

  // Gate (centre-aligned layout for PIN / waiting screens)
  gateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  labIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(99,102,241,0.1)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  gateTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center", marginBottom: 8 },
  gateSub:   { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textDim, textAlign: "center", lineHeight: 21 },

  // Payment plan card
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    padding: 18,
    marginBottom: 20,
  },
  planCardHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  planName:       { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text },
  planPrice:      { fontSize: 22, fontFamily: "Inter_700Bold", color: "#f59e0b", marginTop: 2 },
  planPricePer:   { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textDim },
  planFeatures:   { gap: 9 },
  planFeatureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  planFeatureText:{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 18 },

  accountNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textDim, textAlign: "center", marginBottom: 8 },
  payNote:     { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", lineHeight: 16, marginTop: 16, paddingHorizontal: 8 },

  // Bank transfer
  bankCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    marginBottom: 4,
  },
  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bankLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textDim },
  bankValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, textAlign: "right", flexShrink: 1, marginLeft: 8 },

  // Home
  homeContent: { paddingHorizontal: 16, paddingTop: 20 },
  homeHero:    { alignItems: "center", marginBottom: 28 },
  heroIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(99,102,241,0.12)",
    borderWidth: 1, borderColor: "rgba(99,102,241,0.25)",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 6 },
  heroSub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textDim, textAlign: "center", lineHeight: 19 },

  labCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    padding: 16, marginBottom: 12, gap: 14,
  },
  labCardAppBuilder: { borderColor: "rgba(99,102,241,0.25)", backgroundColor: "rgba(99,102,241,0.04)" },
  labCardCode:       { borderColor: Colors.primary + "25", backgroundColor: Colors.primary + "04" },
  labCardIcon:       { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  labCardText:       { flex: 1 },
  labCardTitle:      { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 3 },
  labCardDesc:       { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textDim, lineHeight: 17 },

  fullLabBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#6366f1", borderRadius: 14, paddingVertical: 14,
    marginTop: 8, marginBottom: 16,
  },
  fullLabBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  homeNote:       { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", lineHeight: 17 },

  // Chat
  chatEmpty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  chatEmptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, marginTop: 4 },
  chatEmptySub:   { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textDim, textAlign: "center", lineHeight: 21 },

  docBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 12, marginBottom: 4,
    backgroundColor: Colors.primary + "10",
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.primary + "20",
  },
  docBarName: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.text },

  inputArea:   { paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 24, borderWidth: 1, borderColor: Colors.borderLight,
    paddingLeft: 8, paddingRight: 6,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    gap: 6, minHeight: 48,
  },
  inputBtn:  { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  textInput: { flex: 1, color: Colors.text, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 100, lineHeight: 20 },
  sendBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },

  // Brief
  briefBtn:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(99,102,241,0.12)", borderWidth: 1, borderColor: "rgba(99,102,241,0.3)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  briefBtnText:  { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#6366f1" },
  briefOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  briefSheet:    { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: Colors.border, paddingHorizontal: 20, paddingTop: 12, maxHeight: "85%" },
  briefHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: "center", marginBottom: 16 },
  briefHeader:   { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  briefTitle:    { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  briefSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textDim, marginTop: 2 },
  briefLoading:  { alignItems: "center", paddingVertical: 40, gap: 12 },
  briefLoadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textDim },
  briefSuccess:  { alignItems: "center", paddingVertical: 24 },
  briefSuccessTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 10 },
  briefSuccessText:  { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textDim, textAlign: "center", lineHeight: 21, marginBottom: 24 },
  briefCloseBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  briefCloseBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  briefBody:     { maxHeight: 300, backgroundColor: Colors.background, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  briefBodyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 20 },
  briefNote:     { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 16 },
  briefNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textDim, lineHeight: 17 },
  briefSubmitBtn:{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#6366f1", borderRadius: 14, paddingVertical: 15, shadowColor: "#6366f1", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  briefSubmitText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },

  // ── History drawer ──────────────────────────────────────────────────────
  histDrawer: {
    position: "absolute",
    top: 0, bottom: 0, left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  histDrawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  histDrawerTitle:   { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
  histNewChat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary + "12",
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  histNewChatText:  { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  histItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginHorizontal: 8,
    marginVertical: 1,
    borderRadius: 10,
  },
  histItemActive:   { backgroundColor: Colors.primary + "10" },
  histItemIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  histItemTitle:    { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text, marginBottom: 2 },
  histItemMeta:     { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textDim },
});
