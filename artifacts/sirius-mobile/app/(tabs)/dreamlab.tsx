import { fetch } from "expo/fetch";
import { Feather } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ChatInput } from "@/components/ChatInput";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import Colors from "@/constants/colors";
import { USER_ID_KEY, createConversation, generateId, getApiBase, getUserId } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { resilientFetch, startNetworkMonitoring, onQueueResolved } from "@/lib/resilient-fetch";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { useSubscription } from "@/lib/revenuecat";

interface Msg { id: string; role: "user" | "assistant"; content: string; status?: "queued" | "retrying" | "sent"; }
interface Dream { id: string; title: string; category: string; emoji: string; color: string; note: string; createdAt: string; }

const CATEGORIES = [
  { id: "career",     label: "Career",     emoji: "🚀", color: "#00b4d8" },
  { id: "wealth",     label: "Wealth",     emoji: "💎", color: "#f59e0b" },
  { id: "health",     label: "Health",     emoji: "💪", color: "#22c55e" },
  { id: "love",       label: "Love",       emoji: "❤️", color: "#ec4899" },
  { id: "travel",     label: "Travel",     emoji: "✈️", color: "#8b5cf6" },
  { id: "creativity", label: "Creativity", emoji: "✨", color: "#f97316" },
  { id: "growth",     label: "Growth",     emoji: "🌱", color: "#10b981" },
  { id: "freedom",    label: "Freedom",    emoji: "🦋", color: "#a78bfa" },
];

const STORAGE_KEY = "sirius_dreamlab_dreams";

function AddDreamModal({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (d: Omit<Dream, "id" | "createdAt">) => void }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [cat, setCat] = useState(CATEGORIES[0]);

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), note: note.trim(), category: cat.id, emoji: cat.emoji, color: cat.color });
    setTitle(""); setNote(""); setCat(CATEGORIES[0]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[m.modalContainer, { backgroundColor: Colors.background }]}>
        <View style={m.modalHeader}>
          <Text style={m.modalTitle}>Add a Dream</Text>
          <Pressable onPress={onClose} hitSlop={12}><Feather name="x" size={22} color={Colors.text} /></Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
          <View style={m.field}>
            <Text style={m.label}>What's your dream?</Text>
            <TextInput style={m.textInput} value={title} onChangeText={setTitle}
              placeholder="e.g. Build a passive income stream" placeholderTextColor={Colors.textMuted}
              autoFocus multiline />
          </View>

          <View style={m.field}>
            <Text style={m.label}>Category</Text>
            <View style={m.catGrid}>
              {CATEGORIES.map(c => (
                <Pressable key={c.id} onPress={() => setCat(c)}
                  style={[m.catChip, { borderColor: cat.id === c.id ? c.color : Colors.border, backgroundColor: cat.id === c.id ? c.color + "22" : Colors.surface }]}>
                  <Text style={m.catEmoji}>{c.emoji}</Text>
                  <Text style={[m.catLabel, { color: cat.id === c.id ? c.color : Colors.textMuted }]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={m.field}>
            <Text style={m.label}>Notes (optional)</Text>
            <TextInput style={[m.textInput, { height: 80 }]} value={note} onChangeText={setNote}
              placeholder="Why does this matter to you?" placeholderTextColor={Colors.textMuted} multiline />
          </View>

          <Pressable onPress={handleAdd}
            style={[m.addBtn, { backgroundColor: Colors.primary, opacity: !title.trim() ? 0.4 : 1 }]}
            disabled={!title.trim()}>
            <Text style={m.addBtnText}>Add Dream</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const dreamMarkdownStyles = {
  body:      { color: Colors.text, fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
  paragraph: { color: Colors.text, fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular", marginTop: 0, marginBottom: 6 },
  strong:    { color: Colors.text, fontFamily: "Inter_700Bold" },
  em:        { color: Colors.text, fontFamily: "Inter_400Regular", fontStyle: "italic" as const },
  heading1:  { color: Colors.text, fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
  heading2:  { color: Colors.text, fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  bullet_list: { marginTop: 4, marginBottom: 4 },
  ordered_list: { marginTop: 4, marginBottom: 4 },
  list_item: { color: Colors.text, fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular", flexDirection: "row" as const, marginBottom: 2 },
  bullet_list_icon: { color: Colors.primary, fontSize: 15, lineHeight: 22, marginRight: 6 },
  ordered_list_icon: { color: Colors.primary, fontSize: 15, fontFamily: "Inter_600SemiBold", marginRight: 6 },
  code_inline: { color: Colors.primary, backgroundColor: "rgba(0,212,255,0.1)", fontFamily: "Inter_400Regular", fontSize: 13, paddingHorizontal: 4, borderRadius: 4 },
  fence: { backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginVertical: 4 },
  code_block: { color: Colors.primary, fontFamily: "Inter_400Regular", fontSize: 13 },
  link: { color: Colors.primary },
};

function DreamChat({ dream, onBack }: { dream: Dream; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { userId: ctxUserId } = useApp();
  const opening = `My dream is: "${dream.title}".${dream.note ? ` Context: ${dream.note}.` : ""} In your first response, ask me 2 focused questions to quickly understand: (1) is this a personal goal or a product/business idea? (2) what does success look like in 30 days? Keep your response under 100 words and be direct.`;

  const FAST_COACH_PROMPT = `You are Sirius, a fast and direct dream accelerator. Rules:
- Keep every response under 150 words
- Ask maximum 2 questions per message
- By message 3, classify the dream clearly: personal goal, career move, or product/business idea
- If it is a product or business idea, name it explicitly — say "this sounds like a product idea"
- Always end with ONE specific action the user can take today
- Never use filler phrases like "let's dream bigger" or "what if you could..."
- Be direct, concise, and fast-moving`;

  const [messages, setMessages]   = useState<Msg[]>([]);
  const [isProductDream, setIsProductDream] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping]  = useState(false);
  const [convId, setConvId]       = useState<number | null>(null);
  const [started, setStarted]     = useState(false);
  const [voiceMode, setVoiceMode] = useState(true);

  const flatRef            = useRef<FlatList>(null);
  const kateVoiceRef       = useRef<string | undefined>(undefined);
  const speechCancelledRef = useRef(false);

  // ── Voice ──────────────────────────────────────────────────────────────────
  const refreshKateVoice = useCallback(() => {
    Speech.getAvailableVoicesAsync().then(voices => {
      const enGB = voices.filter(v => v.language.startsWith("en-GB"));
      const enUS = voices.filter(v => v.language.startsWith("en-US"));
      const preferred = [
        enGB.find(v => v.name.toLowerCase().includes("serena")),
        enGB.find(v => v.name.toLowerCase().includes("martha")),
        enGB.find(v => (v as any).quality === "Enhanced" || (v as any).quality === "Premium"),
        enGB[0],
        enUS.find(v => v.name.toLowerCase().includes("samantha")),
        enUS[0],
      ].find(Boolean);
      if (preferred) kateVoiceRef.current = preferred.identifier;
    }).catch(() => {});
  }, []);

  const stopSpeech = useCallback(() => {
    speechCancelledRef.current = true;
    Speech.stop();
  }, []);

  const speakWithChunks = useCallback((text: string) => {
    speechCancelledRef.current = false;
    const chunks = text
      .split(/\n\n+/)
      .flatMap(p => p.length > 500 ? (p.match(/[^.!?]*[.!?]+["']?\s*/g)?.map(s => s.trim()).filter(Boolean) ?? [p]) : [p])
      .map(p => p.replace(/[#*`_~>]/g, "").trim())
      .filter(p => p.length > 0);
    if (!chunks.length) return;
    let idx = 0;
    const next = () => {
      if (speechCancelledRef.current || idx >= chunks.length) return;
      Speech.speak(chunks[idx++], {
        language: "en-GB",
        ...(kateVoiceRef.current ? { voice: kateVoiceRef.current } : {}),
        rate: 0.95, pitch: 1.0,
        onDone: () => { setTimeout(next, 600); },
        onStopped: () => { speechCancelledRef.current = true; },
      });
    };
    next();
  }, []);

  useEffect(() => { refreshKateVoice(); }, [refreshKateVoice]);

  // ── Network resilience (Tier 1) ──────────────────────────────────────────
  useEffect(() => {
    startNetworkMonitoring();
    const unsub = onQueueResolved(screen => {
      if (screen === "dreamlab") {
        setMessages(prev => prev.map(m =>
          m.status === "queued" || m.status === "retrying"
            ? { ...m, status: "sent" as const }
            : m
        ));
      }
    });
    return () => unsub();
  }, []);

  const sendMsg = useCallback(async (text: string, _imgB64?: string, _docB64?: string, _docName?: string) => {
    if (!text.trim() || isStreaming) return;
    stopSpeech();

    const uid = ctxUserId || (await getUserId());
    const userMsg: Msg = { id: generateId(), role: "user", content: text };
    if (text !== opening) setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);

    try {
      let activeId = convId;
      if (!activeId) {
        const c = await createConversation(`Dream: ${dream.title}`, uid);
        activeId = c.id;
        setConvId(activeId);
      }

      const base = getApiBase();
      const response = await resilientFetch(`${base}openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ content: text, userId: uid, mode: "guru", systemPrompt: FAST_COACH_PROMPT }),
      } as any, "dreamlab");

      if (!response.ok) throw new Error("Failed");

      const reader = (response.body as any).getReader();
      const decoder = new TextDecoder();
      let full = "", buffer = "";
      const aId = generateId();
      let added = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.content) {
              full += parsed.content;
              setShowTyping(false);
              if (!added) {
                setMessages(prev => [...prev, { id: aId, role: "assistant", content: full }]);
                added = true;
              } else {
                setMessages(prev => {
                  const u = [...prev];
                  u[u.length - 1] = { ...u[u.length - 1], content: full };
                  return u;
                });
              }
            }
          } catch {}
        }
      }
      if (voiceMode && full) speakWithChunks(full);
      // Detect product/business ideas to show Star Lab springboard
      const productKeywords = ["product", "app", "business", "startup", "revenue", "customers", "build", "launch", "platform", "service", "sell", "monetise", "monetize", "market"];
      if (!isProductDream && productKeywords.some(kw => full.toLowerCase().includes(kw))) {
        setIsProductDream(true);
      }
    } catch (e: any) {
      setShowTyping(false);
      const isNetworkErr = e?.isOffline || e?.isRetryable || e instanceof TypeError;
      if (isNetworkErr) {
        // resilientFetch already queued it — mark the user message as queued in UI
        setMessages(prev => prev.map(m =>
          m.id === userMsg.id ? { ...m, status: "queued" as const } : m
        ));
      } else {
        setMessages(prev => [...prev, { id: generateId(), role: "assistant", content: "Something went wrong. Please try again." }]);
      }
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }, [isStreaming, convId, ctxUserId, dream, voiceMode, stopSpeech, speakWithChunks, opening]);

  useEffect(() => {
    if (!started) { setStarted(true); sendMsg(opening); }
  }, []);

  const reversed = [...messages].reverse();

  return (
    <KeyboardAvoidingView style={[d.flex, { backgroundColor: Colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ConnectionBanner />
      <View style={[d.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => { stopSpeech(); onBack(); }} style={d.iconBtn} hitSlop={12}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </Pressable>
        <View style={d.headerCenter}>
          <Text style={d.dreamEmoji}>{dream.emoji}</Text>
          <Text style={[d.headerTitle, { color: dream.color }]} numberOfLines={1}>{dream.title}</Text>
        </View>
        {/* Voice toggle */}
        <Pressable
          onPress={() => { if (voiceMode) stopSpeech(); setVoiceMode(v => !v); }}
          style={[d.iconBtn, voiceMode && { backgroundColor: Colors.primary + "18", borderRadius: 18 }]}
          hitSlop={10}
        >
          <Feather name={voiceMode ? "volume-2" : "volume-x"} size={18} color={voiceMode ? Colors.primary : Colors.textMuted} />
        </Pressable>
      </View>

      <FlatList
        ref={flatRef}
        data={reversed}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View>
            <MessageBubble message={item} />
            {item.role === "user" && item.status === "queued" && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingRight: 14, marginTop: -4, marginBottom: 4 }}>
                <Feather name="clock" size={10} color="#f59e0b" />
                <Text style={{ fontSize: 10, color: "#f59e0b", marginLeft: 3 }}>Queued</Text>
              </View>
            )}
            {item.role === "user" && item.status === "sent" && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingRight: 14, marginTop: -4, marginBottom: 4 }}>
                <Feather name="check" size={10} color="#22c55e" />
              </View>
            )}
          </View>
        )}
        inverted
        ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
        contentContainerStyle={{ padding: 12, paddingBottom: 4 }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {/* Star Lab springboard — shown when a product idea is detected */}
      {isProductDream && !isStreaming && messages.length >= 2 && (
        <Pressable
          onPress={() => router.push("/(tabs)/starlab" as any)}
          style={({ pressed }) => ({
            flexDirection: "row", alignItems: "center", gap: 10,
            marginHorizontal: 12, marginBottom: 8,
            backgroundColor: "rgba(99,102,241,0.12)",
            borderRadius: 14, padding: 14,
            borderWidth: 1, borderColor: "rgba(99,102,241,0.3)",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Feather name="zap" size={18} color="#6366f1" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: "#6366f1" }}>This sounds like a product idea</Text>
            <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>Build it in Star Lab →</Text>
          </View>
          <Feather name="chevron-right" size={16} color="#6366f1" />
        </Pressable>
      )}

      <ChatInput
        onSend={sendMsg}
        disabled={isStreaming}
        placeholder="Ask Sirius about this dream…"
        voiceMode={voiceMode}
        onToggleVoice={() => { if (voiceMode) stopSpeech(); setVoiceMode(v => !v); }}
      />
    </KeyboardAvoidingView>
  );
}

export default function DreamLabScreen() {
  const insets = useSafeAreaInsets();
  const { userId: ctxUserId, profile, loading: profileLoading, refreshProfile } = useApp();
  const subscription = useSubscription();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [activeDream, setActiveDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Gate auth state ───────────────────────────────────────────────────────
  const [gateView, setGateView] = useState<"signin" | "signup" | "forgot" | "forgot_sent">("signin");
  const [gateEmail, setGateEmail] = useState("");
  const [gatePassword, setGatePassword] = useState("");
  const [gateConfirm, setGateConfirm] = useState("");
  const [gateForgotEmail, setGateForgotEmail] = useState("");
  const [gateError, setGateError] = useState("");
  const [gateLoading, setGateLoading] = useState(false);
  const [gateShowPw, setGateShowPw] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const handleGateAuth = async () => {
    const email = gateEmail.trim().toLowerCase();
    const pw = gatePassword.trim();
    if (!email || !pw) { setGateError("Please enter your email and password."); return; }
    if (gateView === "signup" && pw.length < 8) { setGateError("Password must be at least 8 characters."); return; }
    if (gateView === "signup" && pw !== gateConfirm.trim()) { setGateError("Passwords do not match."); return; }
    setGateLoading(true);
    setGateError("");
    try {
      const base = getApiBase();
      const res = await fetch(`${base}${gateView === "signin" ? "auth/login" : "auth/signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) { setGateError(data.error ?? "Something went wrong. Please try again."); return; }
      await AsyncStorage.setItem(USER_ID_KEY, data.userId);
      await refreshProfile();
    } catch {
      setGateError("Connection error. Please check your internet and try again.");
    } finally {
      setGateLoading(false);
    }
  };

  const handleGateForgot = async () => {
    const email = gateForgotEmail.trim().toLowerCase();
    if (!email) { setGateError("Please enter your email address."); return; }
    setGateLoading(true);
    setGateError("");
    try {
      const base = getApiBase();
      const res = await fetch(`${base}auth/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) { setGateView("forgot_sent"); }
      else { setGateError("Something went wrong. Please try again."); }
    } catch {
      setGateError("Connection error. Please check your internet and try again.");
    } finally {
      setGateLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      if (Platform.OS === "ios") {
        // iOS — MUST use Apple IAP (App Store guideline 3.1.1)
        const pkg = subscription.plusPackage;
        if (!pkg) {
          // Packages not yet loaded — try refreshing once
          await subscription.refetchCustomerInfo();
          // Still not available after refresh — show error, never open browser on iOS
          if (!subscription.plusPackage) {
            Alert.alert("Unavailable", "Subscription is not available right now. Please try again in a moment.");
            return;
          }
          await subscription.purchase(subscription.plusPackage);
        } else {
          await subscription.purchase(pkg);
        }
        await refreshProfile();
      } else {
        // Android — web checkout fallback
        await WebBrowser.openBrowserAsync("https://sirius-ai.live/pricing?plan=plus");
        await refreshProfile();
      }
    } catch {
      // User cancelled purchase — do nothing
    } finally {
      setSubscribing(false);
    }
  };

  // ── Profile loading ───────────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  // ── Not signed in → inline sign in / sign up / forgot ────────────────────
  if (!ctxUserId) {
    // Forgot password sent confirmation
    if (gateView === "forgot_sent") {
      return (
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
            <Pressable onPress={() => router.push("/(tabs)" as any)} style={d.backBtn}>
              <Feather name="chevron-left" size={20} color={Colors.primary} />
              <Text style={d.backBtnText}>Home</Text>
            </Pressable>
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
            <Feather name="check-circle" size={48} color={Colors.primary} style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 8 }}>Check your email</Text>
            <Text style={{ fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 28 }}>
              If {gateForgotEmail} is registered, a reset link has been sent. It expires in 1 hour.
            </Text>
            <Pressable onPress={() => { setGateView("signin"); setGateForgotEmail(""); }}
              style={[g.btn, { paddingHorizontal: 32 }]}>
              <Text style={g.btnText}>Back to Sign In</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // Forgot password form
    if (gateView === "forgot") {
      return (
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
            <Pressable onPress={() => { setGateView("signin"); setGateError(""); }} style={d.backBtn}>
              <Feather name="chevron-left" size={20} color={Colors.primary} />
              <Text style={d.backBtnText}>Back to Sign In</Text>
            </Pressable>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: "center", marginBottom: 28 }}>
                <View style={[d.heroIcon, { backgroundColor: "#6366f1", marginBottom: 14 }]}>
                  <Feather name="star" size={28} color="#fff" />
                </View>
                <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 6 }}>Reset Password</Text>
                <Text style={{ fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 20 }}>
                  Enter your email and we'll send a reset link.
                </Text>
              </View>
              <View style={{ marginBottom: 24 }}>
                <Text style={g.fieldLabel}>Email</Text>
                <TextInput style={g.input} value={gateForgotEmail} onChangeText={setGateForgotEmail}
                  placeholder="you@example.com" placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
                  selectionColor={Colors.primary} autoFocus />
              </View>
              {gateError ? <Text style={{ color: "#ef4444", fontSize: 13, marginBottom: 14, textAlign: "center" }}>{gateError}</Text> : null}
              <Pressable onPress={handleGateForgot} disabled={gateLoading}
                style={({ pressed }) => [g.btn, { opacity: pressed || gateLoading ? 0.8 : 1 }]}>
                {gateLoading ? <ActivityIndicator color="#fff" /> : <Text style={g.btnText}>Send Reset Link</Text>}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      );
    }

    // ── Sign in / Sign up — matches Star Lab design exactly ──────────────────
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable onPress={() => router.push("/(tabs)" as any)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }} hitSlop={12}>
            <Feather name="chevron-left" size={22} color={Colors.primary} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text }}>Dream Lab</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(99,102,241,0.15)", borderWidth: 1, borderColor: "rgba(99,102,241,0.3)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Feather name="star" size={30} color="#6366f1" />
            </View>
            <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 6 }}>
              {gateView === "signin" ? "Sign in to Dream Lab" : "Create your account"}
            </Text>
            <Text style={{ fontSize: 14, color: Colors.textDim, textAlign: "center", lineHeight: 20 }}>
              {gateView === "signin" ? "Dream Lab Plus — your personal dream accelerator." : "Sign up, then subscribe to unlock Dream Lab."}
            </Text>
          </View>

          {/* Email */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 8 }}>EMAIL</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 14, gap: 10 }}>
              <Feather name="mail" size={15} color={Colors.textDim} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: Colors.text, fontFamily: "Inter_400Regular" }}
                value={gateEmail} onChangeText={t => { setGateEmail(t); setGateError(""); }}
                placeholder="you@example.com" placeholderTextColor={Colors.textDim}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} selectionColor={Colors.primary}
              />
            </View>
          </View>

          {/* Password */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 8 }}>PASSWORD</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 14, gap: 10 }}>
              <Feather name="lock" size={15} color={Colors.textDim} />
              <TextInput
                style={{ flex: 1, fontSize: 15, color: Colors.text, fontFamily: "Inter_400Regular" }}
                value={gatePassword} onChangeText={t => { setGatePassword(t); setGateError(""); }}
                placeholder={gateView === "signup" ? "Minimum 8 characters" : "Your password"}
                placeholderTextColor={Colors.textDim}
                secureTextEntry={!gateShowPw} autoCapitalize="none" autoCorrect={false}
                selectionColor={Colors.primary} returnKeyType={gateView === "signin" ? "go" : "next"}
                onSubmitEditing={gateView === "signin" ? handleGateAuth : undefined}
              />
              <Pressable onPress={() => setGateShowPw(v => !v)} hitSlop={10}>
                <Feather name={gateShowPw ? "eye-off" : "eye"} size={15} color={Colors.textDim} />
              </Pressable>
            </View>
          </View>

          {/* Confirm Password (sign up only) */}
          {gateView === "signup" && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 8 }}>CONFIRM PASSWORD</Text>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 14, gap: 10 }}>
                <Feather name="lock" size={15} color={Colors.textDim} />
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: Colors.text, fontFamily: "Inter_400Regular" }}
                  value={gateConfirm} onChangeText={t => { setGateConfirm(t); setGateError(""); }}
                  placeholder="Repeat your password" placeholderTextColor={Colors.textDim}
                  secureTextEntry autoCapitalize="none" autoCorrect={false}
                  selectionColor={Colors.primary} returnKeyType="go" onSubmitEditing={handleGateAuth}
                />
              </View>
            </View>
          )}

          {gateError ? <Text style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{gateError}</Text> : null}

          {/* Primary button */}
          <Pressable onPress={handleGateAuth} disabled={gateLoading}
            style={({ pressed }) => ({ backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4, marginBottom: 12, opacity: pressed || gateLoading ? 0.8 : 1 })}>
            {gateLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" }}>{gateView === "signin" ? "Sign In" : "Create Account"}</Text>}
          </Pressable>

          {/* Forgot password (sign in only) */}
          {gateView === "signin" && (
            <Pressable onPress={() => { setGateForgotEmail(gateEmail.trim().toLowerCase()); setGateError(""); setGateView("forgot"); }} style={{ alignItems: "center", paddingVertical: 8 }}>
              <Text style={{ fontSize: 14, color: Colors.primary, fontFamily: "Inter_500Medium" }}>Forgot your password?</Text>
            </Pressable>
          )}

          {/* Divider + toggle */}
          <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 20, gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
            <Text style={{ fontSize: 13, color: Colors.textDim, fontFamily: "Inter_400Regular" }}>
              {gateView === "signin" ? "New to Dream Lab?" : "Already have an account?"}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
          </View>

          <Pressable onPress={() => { setGateError(""); setGatePassword(""); setGateConfirm(""); setGateView(gateView === "signin" ? "signup" : "signin"); }}
            style={({ pressed }) => ({ borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", opacity: pressed ? 0.8 : 1 })}>
            <Text style={{ color: Colors.primary, fontSize: 16, fontFamily: "Inter_700Bold" }}>
              {gateView === "signin" ? "Create an Account" : "Back to Sign In"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Signed in but free → subscribe gate ──────────────────────────────────
  if (profile.subscriptionTier === "free") {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
          <Pressable onPress={() => router.push("/(tabs)" as any)} style={d.backBtn}>
            <Feather name="chevron-left" size={20} color={Colors.primary} />
            <Text style={d.backBtnText}>Home</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <View style={[d.heroIcon, { backgroundColor: "#6366f1", marginBottom: 20 }]}>
            <Feather name="star" size={28} color="#fff" />
          </View>
          <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 8, textAlign: "center" }}>
            Dream Lab is a Plus feature
          </Text>
          <Text style={{ fontSize: 15, color: Colors.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 32 }}>
            Build and track your dreams with Sirius.{"\n"}Subscribe to Plus to unlock Dream Lab.
          </Text>
          <Pressable onPress={handleSubscribe} disabled={subscribing}
            style={({ pressed }) => [{
              backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15,
              width: "100%" as any, alignItems: "center" as any,
              opacity: pressed || subscribing ? 0.85 : 1,
            }]}>
            {subscribing
              ? <ActivityIndicator color={Colors.background} />
              : <Text style={{ color: Colors.background, fontSize: 15, fontFamily: "Inter_700Bold" }}>
                  Subscribe to Plus — £9.99/mo
                </Text>}
          </Pressable>
          <Pressable onPress={async () => { setSubscribing(true); await refreshProfile(); setSubscribing(false); }}
            style={{ marginTop: 16 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center" }}>
              Already subscribed? Tap to check access
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) setDreams(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  // ── Learn shortcut (rendered at top of Dream Lab for subscribers) ─────────
  const LearnCard = () => (
    <Pressable
      onPress={() => router.push("/(tabs)/learn" as any)}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: "rgba(99,102,241,0.10)", borderRadius: 14,
        padding: 16, marginBottom: 16, opacity: pressed ? 0.8 : 1,
        borderWidth: 1, borderColor: "rgba(99,102,241,0.25)",
      })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" }}>
        <Feather name="book-open" size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text }}>Learn</Text>
        <Text style={{ fontSize: 13, color: Colors.textMuted, marginTop: 2 }}>Study plans, quizzes & deep learning</Text>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.textMuted} />
    </Pressable>
  );

  const saveDreams = (updated: Dream[]) => {
    setDreams(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addDream = (data: Omit<Dream, "id" | "createdAt">) => {
    const dream: Dream = { ...data, id: `dream-${Date.now()}`, createdAt: new Date().toISOString() };
    saveDreams([dream, ...dreams]);
    // Auto-open chat so Sirius responds immediately to the dream seed
    setActiveDream(dream);
  };

  const deleteDream = (id: string) => {
    Alert.alert("Delete Dream", "Remove this dream from your board?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => saveDreams(dreams.filter(d => d.id !== id)) },
    ]);
  };

  if (activeDream) return <DreamChat dream={activeDream} onBack={() => setActiveDream(null)} />;

  return (
    <View style={[d.flex, { backgroundColor: Colors.background }]}>
      <AddDreamModal visible={showAdd} onClose={() => setShowAdd(false)} onAdd={addDream} />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ paddingTop: insets.top + 8 }}>
          <Pressable onPress={() => router.push("/(tabs)" as any)} style={d.backBtn}>
            <Feather name="chevron-left" size={20} color={Colors.primary} />
            <Text style={d.backBtnText}>Home</Text>
          </Pressable>
        </View>
        {/* Hero */}
        <View style={d.hero}>
          <View style={d.heroIcon}>
            <Feather name="star" size={28} color="#fff" />
          </View>
          <Text style={d.heroTitle}>Dream Lab</Text>
          <Text style={d.heroSub}>Build the life you're meant to live</Text>
        </View>

        {/* Learn shortcut */}
        <View style={{ paddingHorizontal: 16 }}>
          <LearnCard />
        </View>

        {/* Add button */}
        <Pressable onPress={() => setShowAdd(true)}
          style={({ pressed }) => [d.addCard, { opacity: pressed ? 0.8 : 1 }]}>
          <Feather name="plus-circle" size={20} color={Colors.primary} />
          <Text style={d.addCardText}>Add a dream to your board</Text>
        </Pressable>

        {/* Dreams */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : dreams.length === 0 ? (
          <View style={d.empty}>
            <Text style={d.emptyText}>Your dream board is empty.</Text>
            <Text style={d.emptySubText}>Tap above to add your first dream and let Sirius help you work towards it.</Text>
          </View>
        ) : (
          <View style={d.dreamGrid}>
            {dreams.map(dr => (
              <Pressable key={dr.id} onPress={() => setActiveDream(dr)}
                style={({ pressed }) => [d.dreamCard, { borderColor: dr.color + "44", opacity: pressed ? 0.85 : 1 }]}>
                <View style={d.dreamCardHeader}>
                  <Text style={d.dreamEmoji}>{dr.emoji}</Text>
                  <Pressable onPress={() => deleteDream(dr.id)} hitSlop={10} style={d.deleteBtn}>
                    <Feather name="trash-2" size={14} color={Colors.textMuted} />
                  </Pressable>
                </View>
                <View style={[d.catBadge, { backgroundColor: dr.color + "22" }]}>
                  <Text style={[d.catBadgeText, { color: dr.color }]}>{CATEGORIES.find(c => c.id === dr.category)?.label ?? dr.category}</Text>
                </View>
                <Text style={d.dreamTitle} numberOfLines={2}>{dr.title}</Text>
                {dr.note ? <Text style={d.dreamNote} numberOfLines={2}>{dr.note}</Text> : null}
                <View style={[d.chatBtn, { backgroundColor: dr.color + "22" }]}>
                  <Feather name="message-circle" size={13} color={dr.color} />
                  <Text style={[d.chatBtnText, { color: dr.color }]}>Explore with Sirius</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const g = StyleSheet.create({
  fieldLabel: { fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 14, color: Colors.text, fontSize: 15, fontFamily: "Inter_400Regular" },
  btn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});

const d = StyleSheet.create({
  flex: { flex: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 8 },
  backBtnText: { fontSize: 15, fontWeight: "600", color: Colors.primary },
  hero: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 20 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16, backgroundColor: "#6366f1", shadowColor: "#6366f1", shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  heroTitle: { fontSize: 28, fontWeight: "700", color: Colors.text, letterSpacing: -0.5, marginBottom: 6 },
  heroSub: { fontSize: 15, color: Colors.textMuted, textAlign: "center" },
  addCard: { marginHorizontal: 16, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary + "44", borderStyle: "dashed", padding: 16 },
  addCardText: { color: Colors.primary, fontSize: 15, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 40, paddingHorizontal: 32, gap: 8 },
  emptyText: { fontSize: 17, fontWeight: "600", color: Colors.text },
  emptySubText: { fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
  dreamGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 12 },
  dreamCard: { width: "47%", backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  dreamCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dreamEmoji: { fontSize: 24 },
  deleteBtn: { padding: 4 },
  catBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  catBadgeText: { fontSize: 11, fontWeight: "600" },
  dreamTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, lineHeight: 18 },
  dreamNote: { fontSize: 12, color: Colors.textMuted, lineHeight: 16 },
  chatBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start", marginTop: 2 },
  chatBtnText: { fontSize: 12, fontWeight: "600" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  headerTitle: { fontSize: 14, fontWeight: "700", flex: 1, textAlign: "center" },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  userBubble: { alignSelf: "flex-end", backgroundColor: Colors.userBubble, borderRadius: 18, borderBottomRightRadius: 4, padding: 12, marginVertical: 4, maxWidth: "80%" },
  aiBubble: { alignSelf: "flex-start", backgroundColor: Colors.surface, borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, marginVertical: 4, maxWidth: "85%", borderWidth: 1, borderColor: Colors.border },
  userText: { color: Colors.text, fontSize: 15, lineHeight: 21 },
  aiText: { color: Colors.text, fontSize: 15, lineHeight: 21 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 8, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, backgroundColor: Colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: Colors.text, fontSize: 15, maxHeight: 120, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 2 },
});

const m = StyleSheet.create({
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: "700", color: Colors.text },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  textInput: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 14, color: Colors.text, fontSize: 15, minHeight: 52 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: 13, fontWeight: "600" },
  addBtn: { borderRadius: 14, padding: 16, alignItems: "center" },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
