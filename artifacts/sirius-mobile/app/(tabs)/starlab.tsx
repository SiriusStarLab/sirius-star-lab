import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetch } from "expo/fetch";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { Message, createConversation, generateId, getApiBase, getUserId } from "@/lib/api";

const LAB_PIN_KEY = "sirius_lab_pin";

type LabView = "loading" | "upgrade" | "pin_create" | "pin_enter" | "home" | "chat";
type ChatMode = "appbuilder" | "code" | "general";

const SYSTEM_PROMPTS: Record<ChatMode, string> = {
  appbuilder:
    "You are Sirius App Builder inside the Sirius Star Lab. Your job is to help the user design and specify their app idea so it can be handed to a development team to build and launch. The user does NOT build or deploy the app themselves — they design it here, and the Sirius build team handles everything else. Guide them through: 1) What the app does and who it's for. 2) Core features — what must it do on day one. 3) Platform — iOS, Android, web, or all three. 4) Design style — look and feel. 5) Any integrations needed (payments, logins, etc). 6) Timeline expectations. Ask one question at a time. Be clear and friendly. When you have enough detail, tell the user their brief is ready to submit.",
  code:
    "You are Sirius Code Builder inside the Sirius Star Lab. Write high-quality, complete, production-ready code for the user. Always provide full working implementations, not snippets. Explain your choices clearly. Support any language or framework. Format all code in proper code blocks.",
  general:
    "You are Sirius inside the Star Lab — the private R&D intelligence layer. You have deep knowledge of business, technology, research, and strategy. Help the user think, build, research, and execute at the highest level.",
};

const MODE_LABELS: Record<ChatMode, string> = {
  appbuilder: "App Builder",
  code: "Code Builder",
  general: "Lab Chat",
};

export default function StarLabScreen() {
  const insets = useSafeAreaInsets();
  const { userId, profile } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isPro = profile.subscriptionTier === "pro";

  const [view, setView] = useState<LabView>("loading");
  const [storedPin, setStoredPin] = useState<string | null>(null);

  // PIN state
  const [pinInput, setPinInput] = useState("");
  const [confirmInput, setConfirmInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Chat state
  const [chatMode, setChatMode] = useState<ChatMode>("general");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [selectedDocBase64, setSelectedDocBase64] = useState<string | null>(null);
  const [selectedDocName, setSelectedDocName] = useState<string | null>(null);

  // App Builder brief state
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [briefText, setBriefText] = useState("");
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [briefSubmitted, setBriefSubmitted] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Load stored PIN on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!isPro) { setView("upgrade"); return; }
    (async () => {
      const uid = userId || (await getUserId());
      const stored = await AsyncStorage.getItem(`${LAB_PIN_KEY}_${uid}`);
      setStoredPin(stored);
      setView(stored ? "pin_enter" : "pin_create");
    })();
  }, [isPro, userId]);

  // ── PIN submit ───────────────────────────────────────────────────────────
  const handlePinSubmit = async () => {
    setPinError("");
    setPinLoading(true);
    try {
      const uid = userId || (await getUserId());
      if (view === "pin_create") {
        if (pinInput.length < 4) { setPinError("PIN must be at least 4 characters."); return; }
        if (pinInput !== confirmInput) { setPinError("PINs do not match."); return; }
        await AsyncStorage.setItem(`${LAB_PIN_KEY}_${uid}`, pinInput);
        setStoredPin(pinInput);
        setPinInput("");
        setConfirmInput("");
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

  // ── Open a chat section ──────────────────────────────────────────────────
  const openChat = (mode: ChatMode) => {
    setChatMode(mode);
    setMessages([]);
    setConversationId(null);
    setInputText("");
    setSelectedDocBase64(null);
    setSelectedDocName(null);
    setView("chat");
  };

  // ── Pick document ────────────────────────────────────────────────────────
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

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed && !selectedDocBase64) return;
    if (isStreaming) return;

    const uid = userId || (await getUserId());
    const docB64 = selectedDocBase64;
    const docName = selectedDocName;
    const displayContent = trimmed || (docName ? `[Attached: ${docName}]` : "");

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: displayContent,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setSelectedDocBase64(null);
    setSelectedDocName(null);
    setIsStreaming(true);

    try {
      const base = getApiBase();
      let convoId = conversationId;
      if (!convoId) {
        const convo = await createConversation(MODE_LABELS[chatMode], uid);
        convoId = convo.id;
        setConversationId(convoId);
      }

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const body: Record<string, any> = {
        message: displayContent,
        mode: "guru",
        systemPrompt: SYSTEM_PROMPTS[chatMode],
        userId: uid,
      };
      if (docB64) { body.documentBase64 = docB64; body.documentName = docName; }

      const res = await fetch(`${base}openai/conversations/${convoId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const assistantId = generateId();
      const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };
      setMessages(prev => [...prev, assistantMsg]);

      const reader = (res.body as any).getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let full = "";

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
            const chunk = evt.content ?? (evt.type === "text" ? evt.delta : null);
            if (chunk) {
              full += chunk;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: full } : m)
              );
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setMessages(prev => [...prev, {
          id: generateId(), role: "assistant",
          content: "Something went wrong. Please try again.",
        }]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [inputText, selectedDocBase64, selectedDocName, isStreaming, userId, conversationId, chatMode]);

  // ── Generate app brief from conversation ─────────────────────────────────
  const generateBrief = useCallback(async () => {
    if (messages.length === 0 || generatingBrief) return;
    setGeneratingBrief(true);
    setBriefText("");
    setBriefSubmitted(false);
    setShowBriefModal(true);
    try {
      const uid = userId || (await getUserId());
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
      let buf = ""; let full = "";
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
    } catch {
      setBriefText("Could not generate brief. Please try again.");
    } finally {
      setGeneratingBrief(false);
    }
  }, [messages, generatingBrief, userId, conversationId]);

  // ── Submit brief to build team ────────────────────────────────────────────
  const submitBrief = () => {
    const subject = encodeURIComponent("App Build Brief — Sirius Star Lab");
    const body = encodeURIComponent(`Hello,\n\nI have designed an app using Sirius Star Lab and I'd like to submit it for building.\n\n${briefText}\n\nPlease get back to me with next steps.\n\nThank you`);
    Linking.openURL(`mailto:support@sirius-ai.live?subject=${subject}&body=${body}`);
    setBriefSubmitted(true);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const reversed = [...messages].reverse();

  // ── Loading ──────────────────────────────────────────────────────────────
  if (view === "loading") {
    return (
      <View style={[s.center, { backgroundColor: Colors.background }]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  // ── Upgrade gate ─────────────────────────────────────────────────────────
  if (view === "upgrade") {
    return (
      <View style={[s.root, { paddingTop: topPad }]}>
        <View style={s.header}>
          <Pressable onPress={() => router.push("/(tabs)" as any)} style={s.backBtn} hitSlop={12}>
            <Feather name="chevron-left" size={22} color={Colors.primary} />
          </Pressable>
          <Text style={s.headerTitle}>Star Lab</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.gateWrap}>
          <View style={s.labIcon}>
            <Feather name="zap" size={32} color="#6366f1" />
          </View>
          <Text style={s.gateTitle}>Star Lab</Text>
          <Text style={s.gateSub}>Star Lab is included with the Sirius Pro plan. Upgrade to unlock your private R&D intelligence platform.</Text>
          <Pressable
            onPress={() => router.push("/(tabs)/pricing" as any)}
            style={({ pressed }) => [s.upgradeBtn, pressed && { opacity: 0.85 }]}
          >
            <Feather name="award" size={16} color="#fff" />
            <Text style={s.upgradeBtnText}>Upgrade to Pro — £19.99/mo</Text>
          </Pressable>
          <Text style={s.gateNote}>Star Lab includes App Builder, Code Builder, Lab Chat, document upload and more.</Text>
        </View>
      </View>
    );
  }

  // ── PIN create ───────────────────────────────────────────────────────────
  if (view === "pin_create") {
    return (
      <KeyboardAvoidingView style={[s.root, { paddingTop: topPad }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={s.header}>
          <Pressable onPress={() => router.push("/(tabs)" as any)} style={s.backBtn} hitSlop={12}>
            <Feather name="chevron-left" size={22} color={Colors.primary} />
          </Pressable>
          <Text style={s.headerTitle}>Star Lab</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={[s.gateWrap, { paddingBottom: bottomPad + 32 }]} keyboardShouldPersistTaps="handled">
          <View style={s.labIcon}><Feather name="lock" size={30} color={Colors.primary} /></View>
          <Text style={s.gateTitle}>Create your Lab PIN</Text>
          <Text style={s.gateSub}>Set a PIN to protect your Star Lab. You'll need it every time you enter.</Text>

          <View style={s.pinField}>
            <Text style={s.pinLabel}>NEW PIN</Text>
            <View style={s.pinInputWrap}>
              <Feather name="lock" size={15} color={Colors.textDim} />
              <TextInput
                style={s.pinInput}
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

          <View style={s.pinField}>
            <Text style={s.pinLabel}>CONFIRM PIN</Text>
            <View style={s.pinInputWrap}>
              <Feather name="lock" size={15} color={Colors.textDim} />
              <TextInput
                style={s.pinInput}
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

          {pinError ? <Text style={s.pinError}>{pinError}</Text> : null}

          <Pressable
            onPress={handlePinSubmit}
            disabled={pinLoading}
            style={({ pressed }) => [s.pinSubmitBtn, pressed && { opacity: 0.85 }, pinLoading && { opacity: 0.7 }]}
          >
            {pinLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.pinSubmitText}>Create PIN & Enter Lab</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── PIN enter ────────────────────────────────────────────────────────────
  if (view === "pin_enter") {
    return (
      <KeyboardAvoidingView style={[s.root, { paddingTop: topPad }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={s.header}>
          <Pressable onPress={() => router.push("/(tabs)" as any)} style={s.backBtn} hitSlop={12}>
            <Feather name="chevron-left" size={22} color={Colors.primary} />
          </Pressable>
          <Text style={s.headerTitle}>Star Lab</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={[s.gateWrap, { paddingBottom: bottomPad + 32 }]} keyboardShouldPersistTaps="handled">
          <View style={s.labIcon}><Feather name="shield" size={30} color={Colors.primary} /></View>
          <Text style={s.gateTitle}>Enter your Lab PIN</Text>
          <Text style={s.gateSub}>This is your private Star Lab. Enter your PIN to continue.</Text>

          <View style={s.pinField}>
            <Text style={s.pinLabel}>LAB PIN</Text>
            <View style={s.pinInputWrap}>
              <Feather name="lock" size={15} color={Colors.textDim} />
              <TextInput
                style={s.pinInput}
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

          {pinError ? <Text style={s.pinError}>{pinError}</Text> : null}

          <Pressable
            onPress={handlePinSubmit}
            disabled={pinLoading}
            style={({ pressed }) => [s.pinSubmitBtn, pressed && { opacity: 0.85 }, pinLoading && { opacity: 0.7 }]}
          >
            {pinLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.pinSubmitText}>Enter Lab</Text>}
          </Pressable>

          <Pressable
            onPress={async () => {
              const uid = userId || (await getUserId());
              await AsyncStorage.removeItem(`${LAB_PIN_KEY}_${uid}`);
              setStoredPin(null);
              setPinInput("");
              setView("pin_create");
            }}
            style={{ marginTop: 16 }}
          >
            <Text style={{ color: Colors.textDim, fontSize: 13, textAlign: "center" }}>Forgot PIN? Reset it</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Home ─────────────────────────────────────────────────────────────────
  if (view === "home") {
    return (
      <View style={[s.root, { paddingTop: topPad }]}>
        <View style={s.header}>
          <Pressable onPress={() => router.push("/(tabs)" as any)} style={s.backBtn} hitSlop={12}>
            <Feather name="chevron-left" size={22} color={Colors.primary} />
          </Pressable>
          <Text style={s.headerTitle}>Star Lab</Text>
          <Pressable onPress={() => Linking.openURL("https://sirius-ai.live/star-lab")} style={s.externalBtn} hitSlop={10}>
            <Feather name="external-link" size={18} color={Colors.primary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[s.homeContent, { paddingBottom: bottomPad + 24 }]} showsVerticalScrollIndicator={false}>
          <View style={s.homeHero}>
            <View style={s.heroIcon}><Feather name="zap" size={28} color="#6366f1" /></View>
            <Text style={s.heroTitle}>Your Private R&D Lab</Text>
            <Text style={s.heroSub}>Build apps, write code, and research anything — powered by Sirius intelligence.</Text>
          </View>

          {/* App Builder */}
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

          {/* Code Builder */}
          <Pressable onPress={() => openChat("code")} style={({ pressed }) => [s.labCard, s.labCardCode, pressed && { opacity: 0.88 }]}>
            <View style={[s.labCardIcon, { backgroundColor: "rgba(0,212,255,0.12)" }]}>
              <Feather name="code" size={24} color={Colors.primary} />
            </View>
            <View style={s.labCardText}>
              <Text style={s.labCardTitle}>Code Builder</Text>
              <Text style={s.labCardDesc}>Write production-ready code in any language. Get complete, working implementations — not snippets.</Text>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.primary + "60"} />
          </Pressable>

          {/* Lab Chat */}
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

          <Pressable
            onPress={() => Linking.openURL("https://sirius-ai.live/star-lab")}
            style={({ pressed }) => [s.fullLabBtn, pressed && { opacity: 0.85 }]}
          >
            <Feather name="external-link" size={15} color="#fff" />
            <Text style={s.fullLabBtnText}>Open Full Star Lab on Web</Text>
          </Pressable>

          <Text style={s.homeNote}>Full project management, CAD tools, funding analysis and autonomous agents available on the full web platform.</Text>
        </ScrollView>
      </View>
    );
  }

  // ── Chat view ─────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => { setView("home"); setMessages([]); setConversationId(null); }} style={s.backBtn} hitSlop={12}>
          <Feather name="chevron-left" size={22} color={Colors.primary} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={s.headerTitle}>{MODE_LABELS[chatMode]}</Text>
          <Text style={{ fontSize: 11, color: Colors.textDim, fontFamily: "Inter_400Regular" }}>Star Lab</Text>
        </View>
        {/* Submit Brief button — only in App Builder once messages exist */}
        {chatMode === "appbuilder" && messages.length > 0 ? (
          <Pressable onPress={generateBrief} style={s.briefBtn} hitSlop={8}>
            <Feather name="send" size={14} color="#6366f1" />
            <Text style={s.briefBtnText}>Brief</Text>
          </Pressable>
        ) : (
          <View style={{ width: 52 }} />
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        {messages.length === 0 ? (
          <View style={s.chatEmpty}>
            <View style={[s.labCardIcon, { backgroundColor: chatMode === "appbuilder" ? "rgba(99,102,241,0.15)" : chatMode === "code" ? "rgba(0,212,255,0.12)" : "rgba(245,158,11,0.12)", width: 60, height: 60, borderRadius: 30 }]}>
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
            renderItem={({ item }) => <MessageBubble message={item} />}
            inverted
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Document preview */}
        {selectedDocName && (
          <View style={s.docBar}>
            <Feather name="file-text" size={14} color={Colors.primary} />
            <Text style={s.docBarName} numberOfLines={1}>{selectedDocName}</Text>
            <Pressable onPress={() => { setSelectedDocBase64(null); setSelectedDocName(null); }} hitSlop={10}>
              <Feather name="x" size={14} color={Colors.textDim} />
            </Pressable>
          </View>
        )}

        {/* Input row */}
        <View style={[s.inputArea, { paddingBottom: Math.max(bottomPad, 8) }]}>
          <View style={s.inputRow}>
            <Pressable onPress={pickDocument} style={s.inputBtn} hitSlop={8}>
              <Feather name="plus" size={20} color={Colors.textDim} />
            </Pressable>
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
            <Pressable
              onPress={handleSend}
              disabled={isStreaming || (!inputText.trim() && !selectedDocBase64)}
              style={({ pressed }) => [
                s.sendBtn,
                (isStreaming || (!inputText.trim() && !selectedDocBase64)) && { opacity: 0.4 },
                pressed && { opacity: 0.7 },
              ]}
            >
              {isStreaming
                ? <ActivityIndicator size="small" color={Colors.background} />
                : <Feather name="send" size={17} color={Colors.background} />
              }
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── App Builder Brief Modal ── */}
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
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
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
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  externalBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  // Gate screens
  gateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 40,
  },
  labIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(99,102,241,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(99,102,241,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  gateTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 10,
    textAlign: "center",
  },
  gateSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textDim,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  gateNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 16,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#6366f1",
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  upgradeBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },

  // PIN
  pinField: { width: "100%", marginBottom: 16 },
  pinLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  pinInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    gap: 10,
  },
  pinInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  pinError: {
    fontSize: 13,
    color: Colors.error,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
    textAlign: "center",
  },
  pinSubmitBtn: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  pinSubmitText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },

  // Home
  homeContent: { paddingHorizontal: 16, paddingTop: 20 },
  homeHero: { alignItems: "center", marginBottom: 28 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(99,102,241,0.12)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textDim,
    textAlign: "center",
    lineHeight: 19,
  },

  labCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  labCardAppBuilder: {
    borderColor: "rgba(99,102,241,0.25)",
    backgroundColor: "rgba(99,102,241,0.04)",
  },
  labCardCode: {
    borderColor: Colors.primary + "25",
    backgroundColor: Colors.primary + "04",
  },
  labCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  labCardText: { flex: 1 },
  labCardTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 3,
  },
  labCardDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textDim,
    lineHeight: 17,
  },

  fullLabBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366f1",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  fullLabBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  homeNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 17,
  },

  // Chat
  chatEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  chatEmptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginTop: 4,
  },
  chatEmptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textDim,
    textAlign: "center",
    lineHeight: 21,
  },

  docBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 4,
    backgroundColor: Colors.primary + "10",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  docBarName: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },

  inputArea: {
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    gap: 6,
    minHeight: 48,
  },
  inputBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Brief button in header
  briefBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(99,102,241,0.12)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.3)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  briefBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#6366f1",
  },

  // Brief modal
  briefOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  briefSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "85%",
  },
  briefHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: "center",
    marginBottom: 16,
  },
  briefHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  briefTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  briefSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textDim,
    marginTop: 2,
  },
  briefLoading: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  briefLoadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textDim,
  },
  briefSuccess: {
    alignItems: "center",
    paddingVertical: 24,
  },
  briefSuccessTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 10,
  },
  briefSuccessText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textDim,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  briefCloseBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  briefCloseBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  briefBody: {
    maxHeight: 300,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  briefBodyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 20,
  },
  briefNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 16,
  },
  briefNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textDim,
    lineHeight: 17,
  },
  briefSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366f1",
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  briefSubmitText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
