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
import { TypingIndicator } from "@/components/TypingIndicator";
import Colors from "@/constants/colors";
import { USER_ID_KEY, createConversation, generateId, getApiBase, getUserId } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { resilientFetch, startNetworkMonitoring, onQueueResolved } from "@/lib/resilient-fetch";
import { ConnectionBanner } from "@/components/ConnectionBanner";

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
  const opening = `I want to talk about my dream: "${dream.title}". ${dream.note ? `Here's some context: ${dream.note}` : "Help me explore it, break it down into actionable steps, and give me a clear next step I can take today."}`;

  const [messages, setMessages]   = useState<Msg[]>([]);
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
        body: JSON.stringify({ content: text, userId: uid, mode: "coach" }),
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
            <View style={item.role === "user" ? d.userBubble : d.aiBubble}>
              {item.role === "user"
                ? <Text style={d.userText}>{item.content}</Text>
                : <Markdown style={dreamMarkdownStyles}>{item.content}</Markdown>}
            </View>
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
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [activeDream, setActiveDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Gate auth state ───────────────────────────────────────────────────────
  const [gateView, setGateView] = useState<"signin" | "signup">("signin");
  const [gateEmail, setGateEmail] = useState("");
  const [gatePassword, setGatePassword] = useState("");
  const [gateConfirm, setGateConfirm] = useState("");
  const [gateError, setGateError] = useState("");
  const [gateLoading, setGateLoading] = useState(false);
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

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      await WebBrowser.openBrowserAsync("https://sirius-ai.live/pricing?plan=plus");
      // Browser closed — re-fetch subscription tier from server
      await refreshProfile();
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

  // ── Not signed in → inline sign in / sign up ──────────────────────────────
  if (!ctxUserId) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
          <Pressable onPress={() => router.push("/(tabs)" as any)} style={d.backBtn}>
            <Feather name="chevron-left" size={20} color={Colors.primary} />
            <Text style={d.backBtnText}>Home</Text>
          </Pressable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <View style={{ alignItems: "center", marginBottom: 28 }}>
              <View style={[d.heroIcon, { backgroundColor: "#6366f1", marginBottom: 14 }]}>
                <Feather name="star" size={28} color="#fff" />
              </View>
              <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 6 }}>Dream Lab</Text>
              <Text style={{ fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 20 }}>
                {gateView === "signin" ? "Sign in to access your dreams" : "Create an account to get started"}
              </Text>
            </View>

            {/* Sign in / Sign up toggle */}
            <View style={{ flexDirection: "row", backgroundColor: Colors.surface, borderRadius: 12, padding: 4,
              marginBottom: 24, borderWidth: 1, borderColor: Colors.border }}>
              {(["signin", "signup"] as const).map(v => (
                <Pressable key={v} onPress={() => { setGateView(v); setGateError(""); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center",
                    backgroundColor: gateView === v ? Colors.primary : "transparent" }}>
                  <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold",
                    color: gateView === v ? "#fff" : Colors.textMuted }}>
                    {v === "signin" ? "Sign In" : "Sign Up"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Email */}
            <View style={{ marginBottom: 14 }}>
              <Text style={g.fieldLabel}>Email</Text>
              <TextInput style={g.input} value={gateEmail} onChangeText={setGateEmail}
                placeholder="you@example.com" placeholderTextColor={Colors.textMuted}
                autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
                selectionColor={Colors.primary} />
            </View>

            {/* Password */}
            <View style={{ marginBottom: gateView === "signup" ? 14 : 24 }}>
              <Text style={g.fieldLabel}>Password</Text>
              <TextInput style={g.input} value={gatePassword} onChangeText={setGatePassword}
                placeholder={gateView === "signup" ? "At least 8 characters" : "Your password"}
                placeholderTextColor={Colors.textMuted}
                secureTextEntry autoCapitalize="none" autoCorrect={false}
                selectionColor={Colors.primary} />
            </View>

            {/* Confirm password (sign up only) */}
            {gateView === "signup" && (
              <View style={{ marginBottom: 24 }}>
                <Text style={g.fieldLabel}>Confirm Password</Text>
                <TextInput style={g.input} value={gateConfirm} onChangeText={setGateConfirm}
                  placeholder="Repeat your password" placeholderTextColor={Colors.textMuted}
                  secureTextEntry autoCapitalize="none" autoCorrect={false}
                  selectionColor={Colors.primary} />
              </View>
            )}

            {gateError ? (
              <Text style={{ color: "#ef4444", fontSize: 13, marginBottom: 14, textAlign: "center" }}>{gateError}</Text>
            ) : null}

            <Pressable onPress={handleGateAuth} disabled={gateLoading}
              style={({ pressed }) => [g.btn, { opacity: pressed || gateLoading ? 0.8 : 1 }]}>
              {gateLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={g.btnText}>{gateView === "signin" ? "Sign In" : "Create Account"}</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
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
