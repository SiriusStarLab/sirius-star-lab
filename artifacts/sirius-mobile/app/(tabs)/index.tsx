import { fetch } from "expo/fetch";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ChatInput, ChatAttachment } from "@/components/ChatInput";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import {
  Message,
  createConversation,
  fetchConversations,
  generateId,
  getApiBase,
  getUserId,
} from "@/lib/api";
import { useSubscription } from "@/lib/revenuecat";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 340);

interface DBMessage {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

interface ActionStep {
  tool: string;
  label: string;
  detail?: string;
  color: string;
  icon: string;
}


const SURPRISE_PROMPTS = [
  "What is the most mind-bending fact in physics right now?",
  "Tell me something beautiful that happened in science this week.",
  "What ancient wisdom is being confirmed by modern neuroscience?",
  "What's the most fascinating thing happening in space exploration?",
  "What would Stoic philosophers say about social media?",
  "How does sound actually affect the human nervous system?",
  "What's the strangest thing discovered in the deep ocean recently?",
  "What does quantum entanglement really mean for our understanding of reality?",
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { userId, profile, refreshProfile } = useApp();
  const subscription = useSubscription();
  const params = useLocalSearchParams<{ prompt?: string; conversationId?: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [voiceMode, setVoiceMode] = useState(true);
  const [actionSteps, setActionSteps] = useState<ActionStep[]>([]);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [hitLimitTier, setHitLimitTier] = useState<"free" | "plus">("free");
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<Array<{ id: number; title: string; createdAt: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    // Load conversation history inline every time the drawer opens
    setHistoryLoading(true);
    (async () => {
      try {
        const uid = userId || (await getUserId());
        let convos = await fetchConversations(uid);
        if ((!convos || convos.length === 0) && uid) {
          try { convos = await fetchConversations(undefined); } catch {}
        }
        const filtered = (convos || [])
          .filter((c: { title?: string }) => c.title !== "health check" && c.title !== "probe")
          .sort((a: { createdAt: string }, b: { createdAt: string }) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 50);
        setHistoryList(filtered);
      } catch {
        setHistoryList([]);
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [drawerAnim, overlayAnim, userId]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: -DRAWER_WIDTH, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  }, [drawerAnim, overlayAnim]);

  const promptHandledRef = useRef<string | undefined>(undefined);
  const convoHandledRef = useRef<string | undefined>(undefined);
  const kateVoiceRef = useRef<string | undefined>(undefined);
  const speechCancelledRef = useRef<boolean>(false);

  const refreshKateVoice = useCallback(() => {
    Speech.getAvailableVoicesAsync()
      .then(voices => {
        const enGB = voices.filter(v => v.language.startsWith("en-GB"));
        const enUS = voices.filter(v => v.language.startsWith("en-US"));
        // Prefer premium/neural en-GB voices, then any en-GB, then en-US neural
        const preferred = [
          enGB.find(v => v.name.toLowerCase().includes("serena")),
          enGB.find(v => v.name.toLowerCase().includes("martha")),
          enGB.find(v => v.name.toLowerCase().includes("daniel")),
          enGB.find(v => v.quality === "Enhanced" || (v as any).quality === "Premium"),
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

  const lastBackgroundRef = useRef<number>(0);

  useEffect(() => {
    refreshKateVoice();
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") {
        refreshKateVoice();
        // Reset to landing screen if app was backgrounded for more than 3 minutes
        const elapsed = Date.now() - lastBackgroundRef.current;
        if (lastBackgroundRef.current > 0 && elapsed > 3 * 60 * 1000) {
          setMessages([]);
          setConversationId(null);
          stopSpeech();
        }
      } else if (state === "background" || state === "inactive") {
        lastBackgroundRef.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [refreshKateVoice, stopSpeech]);

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
      .map(p => p.trim())
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

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSend = useCallback(async (text: string, attachments: ChatAttachment[] = []) => {
    if (isStreaming) return;

    // Split attachments by type
    const imageAttachments = attachments.filter(a => a.type === "image");
    const docAttachments   = attachments.filter(a => a.type === "document");
    const firstImage = imageAttachments[0]?.preview; // data: URI for display

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: text,
      uploadedImageBase64: firstImage,
      images: imageAttachments.length > 1
        ? imageAttachments.slice(1).map(a => a.preview!)
        : undefined,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);
    setActionSteps([]);
    setStepsExpanded(false);

    try {
      let activeId = conversationId;
      if (!activeId) {
        const firstDocName = docAttachments[0]?.name;
        const title = text.trim() ? text.slice(0, 60) : (firstDocName ?? imageAttachments.length > 0 ? "Image" : "Attachment");
        const convo = await createConversation(title, userId ?? undefined);
        activeId = convo.id;
        setConversationId(activeId);
      }

      const base = getApiBase();
      const response = await fetch(
        `${base}openai/conversations/${activeId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            content: text,
            userId: userId ?? undefined,
            mode: "guru",
            // Single image (backward compat) + full array for multi-image
            imageBase64: firstImage ?? undefined,
            images: imageAttachments.length > 0
              ? imageAttachments.map(a => a.preview!)
              : undefined,
            // First document (backward compat) + full array for multi-doc
            documentBase64: docAttachments[0]?.base64 ?? undefined,
            documentName:   docAttachments[0]?.name   ?? undefined,
            documents: docAttachments.length > 0
              ? docAttachments.map(d => ({ base64: d.base64, name: d.name }))
              : undefined,
          }),
        }
      );

      if (response.status === 429) {
        let tier: "free" | "plus" = "free";
        try {
          const errData = await response.json();
          if (errData?.tier === "plus") tier = "plus";
        } catch {}
        setHitLimitTier(tier);
        setShowUpgradeModal(true);
        setIsStreaming(false);
        setShowTyping(false);
        return;
      }
      if (!response.ok) throw new Error("Stream failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";
      let assistantAdded = false;
      const assistantId = generateId();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.done) continue;

            if (parsed.type === "image" && parsed.b64) {
              const imageB64: string = parsed.b64;
              const imageMimeType: string = parsed.mimeType ?? "image/jpeg";
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.id === assistantId) {
                  updated[updated.length - 1] = { ...last, imageB64, imageMimeType };
                }
                return updated;
              });
              continue;
            }

            if (parsed.type === "replace_content" && parsed.content !== undefined) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.id === assistantId) {
                  updated[updated.length - 1] = { ...last, content: parsed.content };
                }
                return updated;
              });
              continue;
            }

            if (parsed.type === "image_error") {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.id === assistantId) {
                  updated[updated.length - 1] = {
                    ...last,
                    content: (last.content || "") + "\n\n_(Image generation failed — please try again.)_",
                  };
                }
                return updated;
              });
              continue;
            }

            if (parsed.type === "action" && parsed.tool) {
              setActionSteps(prev => [...prev, {
                tool: parsed.tool,
                label: parsed.label || parsed.tool,
                detail: parsed.detail || undefined,
                color: parsed.color || "hsl(193,100%,40%)",
                icon: parsed.icon || "⚡",
              }]);
              setShowTyping(false);
              continue;
            }

            if (parsed.content) {
              fullContent += parsed.content;
              setShowTyping(false);

              if (!assistantAdded) {
                setMessages(prev => [
                  ...prev,
                  { id: assistantId, role: "assistant", content: fullContent },
                ]);
                assistantAdded = true;
              } else {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                  return updated;
                });
              }
            }
          } catch {}
        }
      }
      if (voiceMode && fullContent) {
        const clean = fullContent
          .replace(/\*\*/g, "")
          .replace(/#{1,6}\s/g, "")
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
        speakWithChunks(clean);
      }
    } catch (e: any) {
      setShowTyping(false);
      setMessages(prev => [
        ...prev,
        { id: generateId(), role: "assistant", content: `Error: ${e?.message ?? String(e)}` },
      ]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }, [conversationId, isStreaming, userId, voiceMode]);

  useEffect(() => {
    if (params.prompt && params.prompt !== promptHandledRef.current && !isStreaming) {
      promptHandledRef.current = params.prompt;
      setMessages([]);
      setConversationId(null);
      setTimeout(() => handleSend(params.prompt!), 200);
    }
  }, [params.prompt, handleSend, isStreaming]);

  // Clear chat when navigating away — so returning to this tab always shows the landing screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        setMessages([]);
        setConversationId(null);
        stopSpeech();
      };
    }, [stopSpeech])
  );

  useEffect(() => {
    const convoIdParam = params.conversationId;
    if (!convoIdParam || convoIdParam === convoHandledRef.current) return;
    convoHandledRef.current = convoIdParam;
    const id = parseInt(convoIdParam, 10);
    if (isNaN(id)) return;
    (async () => {
      try {
        const base = getApiBase();
        const uid = userId || (await import("@/lib/api").then(m => m.getUserId()));
        const qs = uid ? `?userId=${encodeURIComponent(uid)}` : "";
        const res = await fetch(`${base}openai/conversations/${id}${qs}`);
        if (!res.ok) return;
        const data = await res.json();
        const msgs: Message[] = (data.messages ?? []).map((m: DBMessage) => ({
          id: String(m.id),
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        setMessages(msgs);
        setConversationId(id);
      } catch {}
    })();
  }, [params.conversationId]);

  const reversed = [...messages].reverse();
  const aiName = profile.aiName || "Sirius";

  const handleNewChat = useCallback(() => {
    stopSpeech();
    setMessages([]);
    setConversationId(null);
    setIsStreaming(false);
    setShowTyping(false);
    setActionSteps([]);
    setStepsExpanded(false);
    closeDrawer();
  }, [stopSpeech, closeDrawer]);

  const openHistory = useCallback(async () => {
    closeDrawer();
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const uid = userId || (await getUserId());
      let convos = await fetchConversations(uid);
      // Fallback: if no conversations found with userId, try without (catches userId mismatch)
      if ((!convos || convos.length === 0) && uid) {
        try { convos = await fetchConversations(undefined); } catch {}
      }
      const filtered = (convos || [])
        .filter((c: { title?: string }) => c.title !== "health check" && c.title !== "probe")
        .sort((a: { createdAt: string }, b: { createdAt: string }) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 50);
      setHistoryList(filtered);
    } catch {
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId, closeDrawer]);

  const loadConversation = useCallback(async (id: number) => {
    setShowHistory(false);
    stopSpeech();
    setMessages([]);
    setIsStreaming(false);
    setShowTyping(false);
    setActionSteps([]);
    try {
      const base = getApiBase();
      const uid = userId || (await getUserId());

      // Try with userId first, then without as fallback (handles userId mismatch)
      let data: any = null;
      const withUser = await fetch(`${base}openai/conversations/${id}${uid ? `?userId=${encodeURIComponent(uid)}` : ""}`);
      if (withUser.ok) {
        data = await withUser.json();
      } else {
        const withoutUser = await fetch(`${base}openai/conversations/${id}`);
        if (withoutUser.ok) data = await withoutUser.json();
      }

      if (!data) {
        Alert.alert("Couldn't load conversation", "Please try again.");
        return;
      }

      const msgs: Message[] = (data.messages ?? []).map((m: DBMessage) => ({
        id: String(m.id),
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      if (msgs.length === 0) {
        Alert.alert("Empty conversation", "This conversation has no messages.");
        return;
      }
      setMessages(msgs);
      setConversationId(id);
    } catch {
      Alert.alert("Couldn't load conversation", "Please check your connection and try again.");
    }
  }, [userId, stopSpeech]);

  const handleModalIAPPurchase = async (pkg: any) => {
    if (!pkg) return;
    try {
      await subscription.purchase(pkg);
      await refreshProfile();
      setShowUpgradeModal(false);
    } catch (err: any) {
      if (err?.userCancelled) return;
      Alert.alert("Purchase failed", err?.message ?? "Something went wrong. Please try again.");
    }
  };

  const UPGRADE_URL = "https://sirius-ai.live/pricing";
  const isIOS = Platform.OS === "ios";

  const dailyUsed = profile.dailyMessageCount ?? 0;
  const dailyLimit = profile.dailyLimit ?? 30;
  const usagePct = Math.min(dailyUsed / dailyLimit, 1);

  const navigateTo = (screen: string) => {
    closeDrawer();
    setTimeout(() => router.push(screen as any), 180);
  };

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* ── Fixed top header ── */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: messages.length > 0 ? Colors.border : "transparent" }]}>
        <Pressable
          onPress={openDrawer}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
        >
          <Feather name="menu" size={22} color={Colors.text} />
        </Pressable>

        <Text style={styles.headerTitle}>SIRIUS</Text>

        {messages.length > 0 ? (
          <Pressable
            onPress={handleNewChat}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
          >
            <Feather name="home" size={20} color={Colors.textMuted} />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {/* ── Main content ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.landing, { paddingBottom: bottomPad + 8 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <View style={styles.logoWrap}>
              <View style={styles.logoGlow} />
              <Image
                source={require("@/assets/images/logo.png")}
                style={styles.logoImage}
              />
            </View>

            {/* Tagline */}
            <Text style={styles.tagline}>I'M SIRIUS  ·  I THINK, SO I AM</Text>

            {/* Subtitle */}
            <Text style={styles.welcomeSub}>What would you like to do?</Text>

            {/* Chat input — sits right under the welcome text on landing */}
            <View style={{ paddingTop: 20, alignSelf: "stretch" }}>
              <ChatInput
                onSend={handleSend}
                disabled={isStreaming}
                placeholder="I'm listening. Take your time."
                voiceMode={voiceMode}
                onToggleVoice={() => {
                  if (voiceMode) stopSpeech();
                  setVoiceMode(v => !v);
                }}
              />
            </View>
          </ScrollView>
        ) : (
          <FlatList
            data={reversed}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            inverted
            ListHeaderComponent={
              <>
                {showTyping && <TypingIndicator />}
                {isStreaming && actionSteps.length > 0 && (
                  <View style={styles.actionLogLive}>
                    {actionSteps.map((step, i) => (
                      <View key={i} style={styles.actionStep}>
                        <Text style={styles.actionStepIcon}>{step.icon}</Text>
                        <View style={styles.actionStepText}>
                          <Text style={[styles.actionStepLabel, { color: step.color }]}>{step.label}</Text>
                          {step.detail ? <Text style={styles.actionStepDetail}>{step.detail}</Text> : null}
                        </View>
                      </View>
                    ))}
                    <View style={styles.actionLogPulse}>
                      <View style={[styles.actionLogDot, { backgroundColor: Colors.primary }]} />
                      <Text style={styles.actionLogWorking}>Working…</Text>
                    </View>
                  </View>
                )}
                {!isStreaming && actionSteps.length > 0 && (
                  <Pressable onPress={() => setStepsExpanded(e => !e)} style={styles.actionLogCollapsed}>
                    <Text style={styles.actionLogCollapsedIcon}>⚡</Text>
                    <Text style={styles.actionLogCollapsedText}>
                      {actionSteps.length} action{actionSteps.length !== 1 ? "s" : ""} taken
                    </Text>
                    <Feather name={stepsExpanded ? "chevron-down" : "chevron-up"} size={13} color={Colors.textMuted} style={{ marginLeft: "auto" }} />
                  </Pressable>
                )}
                {!isStreaming && stepsExpanded && actionSteps.length > 0 && (
                  <View style={styles.actionLogExpanded}>
                    {actionSteps.map((step, i) => (
                      <View key={i} style={styles.actionStep}>
                        <Text style={styles.actionStepIcon}>{step.icon}</Text>
                        <View style={styles.actionStepText}>
                          <Text style={[styles.actionStepLabel, { color: step.color }]}>{step.label}</Text>
                          {step.detail ? <Text style={styles.actionStepDetail}>{step.detail}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            }
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Chat input — only shown here when in active chat */}
        {messages.length > 0 && (
          <View style={{ paddingBottom: Math.max(bottomPad, 8) }}>
            <ChatInput
              onSend={handleSend}
              disabled={isStreaming}
              placeholder="I'm listening. Take your time."
              voiceMode={voiceMode}
              onToggleVoice={() => {
                if (voiceMode) stopSpeech();
                setVoiceMode(v => !v);
              }}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Upgrade modal ── */}
      <Modal visible={showUpgradeModal} transparent animationType="fade" onRequestClose={() => setShowUpgradeModal(false)}>
        <View style={upgradeStyles.overlay}>
          <View style={upgradeStyles.sheet}>
            <View style={upgradeStyles.glow} pointerEvents="none" />
            <View style={upgradeStyles.header}>
              <View style={upgradeStyles.orbWrap}>
                <View style={upgradeStyles.orb}><Text style={{ fontSize: 22 }}>⚡</Text></View>
              </View>
              <Text style={upgradeStyles.title}>
                {hitLimitTier === "plus" ? "Daily limit reached" : "You've used your 30 free messages"}
              </Text>
              <Text style={upgradeStyles.subtitle}>
                {hitLimitTier === "plus"
                  ? "Upgrade to Pro for unlimited messages every day."
                  : "Upgrade for more messages — or come back tomorrow when it resets."}
              </Text>
            </View>

            {isIOS ? (
              subscription.isLoading ? (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={[upgradeStyles.subtitle, { marginTop: 10 }]}>Loading plans…</Text>
                </View>
              ) : (
                <>
                  {hitLimitTier === "free" && subscription.plusPackage && (
                    <TouchableOpacity style={upgradeStyles.ctaBtn} activeOpacity={0.82} disabled={subscription.isPurchasing} onPress={() => handleModalIAPPurchase(subscription.plusPackage)}>
                      {subscription.isPurchasing ? <ActivityIndicator color="#ffffff" /> : <Text style={upgradeStyles.ctaText}>Get Plus — {subscription.plusPackage.product.priceString}/mo →</Text>}
                    </TouchableOpacity>
                  )}
                  {subscription.proPackage && (
                    <TouchableOpacity style={[upgradeStyles.ctaBtn, { backgroundColor: "hsl(45,100%,42%)", marginTop: hitLimitTier === "free" ? 8 : 0 }]} activeOpacity={0.82} disabled={subscription.isPurchasing} onPress={() => handleModalIAPPurchase(subscription.proPackage)}>
                      {subscription.isPurchasing ? <ActivityIndicator color="#ffffff" /> : <Text style={upgradeStyles.ctaText}>Get Pro — {subscription.proPackage.product.priceString}/mo →</Text>}
                    </TouchableOpacity>
                  )}
                  {!subscription.plusPackage && !subscription.proPackage && (
                    <TouchableOpacity style={upgradeStyles.ctaBtn} activeOpacity={0.82} onPress={() => { setShowUpgradeModal(false); setTimeout(() => router.push("/(tabs)/pricing" as any), 300); }}>
                      <Text style={upgradeStyles.ctaText}>View subscription options →</Text>
                    </TouchableOpacity>
                  )}
                </>
              )
            ) : (
              <>
                {hitLimitTier === "free" && (
                  <View style={upgradeStyles.planCard}>
                    <View style={upgradeStyles.planRow}>
                      <View>
                        <Text style={upgradeStyles.planName}>Plus</Text>
                        <Text style={upgradeStyles.planDesc}>200 messages/day · image gen · memory</Text>
                      </View>
                      <Text style={[upgradeStyles.planPrice, { color: "hsl(193,100%,55%)" }]}>£9.99<Text style={upgradeStyles.planPer}>/mo</Text></Text>
                    </View>
                  </View>
                )}
                <View style={upgradeStyles.planCard}>
                  <View style={upgradeStyles.planRow}>
                    <View>
                      <Text style={upgradeStyles.planName}>Pro</Text>
                      <Text style={upgradeStyles.planDesc}>Unlimited messages · priority speed</Text>
                    </View>
                    <Text style={[upgradeStyles.planPrice, { color: "hsl(45,100%,55%)" }]}>£19.99<Text style={upgradeStyles.planPer}>/mo</Text></Text>
                  </View>
                </View>
                <TouchableOpacity style={upgradeStyles.ctaBtn} activeOpacity={0.82} onPress={() => { setShowUpgradeModal(false); setTimeout(() => router.push("/(tabs)/pricing" as any), 300); }}>
                  <Text style={upgradeStyles.ctaText}>See plans →</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={upgradeStyles.dismissBtn} onPress={() => setShowUpgradeModal(false)}>
              <Text style={upgradeStyles.dismissText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Drawer overlay + panel ── */}
      {drawerOpen && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Semi-transparent backdrop */}
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)", opacity: overlayAnim }]}
            pointerEvents="auto"
          >
            <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
          </Animated.View>

          {/* Drawer panel */}
          <Animated.View
            style={[styles.drawer, { paddingTop: insets.top, paddingBottom: insets.bottom + 12, transform: [{ translateX: drawerAnim }] }]}
            pointerEvents="auto"
          >
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Drawer header */}
              <View style={styles.drawerHeader}>
                <View style={styles.drawerLogoWrap}>
                  <Image source={require("@/assets/images/logo.png")} style={styles.drawerLogo} />
                  <View>
                    <Text style={styles.drawerLogoName}>Sirius</Text>
                    <Text style={styles.drawerLogoTagline}>I think, so I am</Text>
                  </View>
                </View>
                <Pressable onPress={closeDrawer} hitSlop={12} style={({ pressed }) => [styles.drawerCloseBtn, pressed && { opacity: 0.6 }]}>
                  <Feather name="x" size={20} color={Colors.textMuted} />
                </Pressable>
              </View>

              {/* Nav items */}
              <DrawerItem icon="plus-circle" label="New Session" onPress={handleNewChat} color={Colors.primary} tint={Colors.primary + "15"} />
              <DrawerItem icon="star" label="Dream Lab" badge="NEW" badgeColor="#a78bfa" dot onPress={() => navigateTo("/(tabs)/dreamlab")} />
              <DrawerItem icon="zap" label="Star Lab" badge="PRO" badgeColor="#6366f1" dot onPress={() => { closeDrawer(); router.push("/(tabs)/starlab" as any); }} />

              <View style={styles.drawerDivider} />
              <Text style={styles.drawerSectionLabel}>RECENT CONVERSATIONS</Text>
              {historyLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 18, marginVertical: 10 }} />
              ) : historyList.length === 0 ? (
                <Text style={styles.drawerHistoryEmpty}>No conversations yet</Text>
              ) : (
                historyList.slice(0, 20).map(c => {
                  const d = new Date(c.createdAt);
                  const dateLabel = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                  return (
                    <Pressable key={c.id} onPress={() => loadConversation(c.id)} style={({ pressed }) => [styles.drawerHistoryItem, pressed && { opacity: 0.6 }]}>
                      <Feather name="message-square" size={13} color={Colors.textMuted} />
                      <Text style={styles.drawerHistoryTitle} numberOfLines={1}>{c.title || "Untitled"}</Text>
                      <Text style={styles.drawerHistoryDate}>{dateLabel}</Text>
                    </Pressable>
                  );
                })
              )}

              <View style={styles.drawerDivider} />
              <DrawerItem icon="user" label="My Account" onPress={() => navigateTo("/(tabs)/settings")} />

              {/* Footer */}
              <View style={styles.drawerFooter}>
                <Pressable onPress={() => Linking.openURL("https://sirius-ai.live/terms")}>
                  <Text style={styles.drawerFooterLink}>Terms</Text>
                </Pressable>
                <Text style={styles.drawerFooterDot}>·</Text>
                <Pressable onPress={() => Linking.openURL("https://sirius-ai.live/privacy")}>
                  <Text style={styles.drawerFooterLink}>Privacy</Text>
                </Pressable>
                <Text style={styles.drawerFooterDot}>·</Text>
                <Text style={styles.drawerFooterText}>© 2026 Sirius Star Lab</Text>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

function DrawerItem({
  icon,
  label,
  badge,
  badgeColor,
  dot,
  onPress,
  color,
  tint,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  badge?: string;
  badgeColor?: string;
  dot?: boolean;
  onPress: () => void;
  color?: string;
  tint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerItem,
        tint && { backgroundColor: tint, borderRadius: 12, marginBottom: 6 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.drawerItemIcon, tint && { backgroundColor: "transparent" }]}>
        <Feather name={icon} size={18} color={color ?? Colors.textMuted} />
      </View>
      <Text style={[styles.drawerItemLabel, color && { color }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {badge && (
        <View style={[styles.drawerBadge, { borderColor: badgeColor ?? Colors.textDim }]}>
          <Text style={[styles.drawerBadgeText, { color: badgeColor ?? Colors.textDim }]}>{badge}</Text>
        </View>
      )}
      {dot && <View style={[styles.drawerDot, badge ? { marginLeft: 4 } : {}]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* ── Top header ── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    letterSpacing: 3,
    color: Colors.textMuted,
  },

  /* ── Landing screen ── */
  landing: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    position: "relative",
  },
  logoGlow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary + "18",
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.primary + "50",
  },
  tagline: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 2.5,
    color: Colors.primary,
    textAlign: "center",
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    lineHeight: 36,
    marginBottom: 14,
  },
  welcomeSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 32,
  },
  secureFooter: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 2,
    color: Colors.textDim,
    textAlign: "center",
    marginBottom: 6,
  },

  /* ── Action log ── */
  actionLogLive: {
    marginHorizontal: 12, marginBottom: 8, backgroundColor: "rgba(0,180,216,0.06)",
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,180,216,0.15)", padding: 12, gap: 6,
  },
  actionStep: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 2 },
  actionStepIcon: { fontSize: 14, lineHeight: 20 },
  actionStepText: { flex: 1 },
  actionStepLabel: { fontSize: 12, fontFamily: "Inter_500Medium", fontWeight: "500", lineHeight: 18 },
  actionStepDetail: { fontSize: 11, color: Colors.textDim, fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 1 },
  actionLogPulse: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: "rgba(0,180,216,0.1)" },
  actionLogDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.8 },
  actionLogWorking: { fontSize: 11, color: Colors.primary, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  actionLogCollapsed: { flexDirection: "row", alignItems: "center", gap: 7, marginHorizontal: 12, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "rgba(0,180,216,0.06)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(0,180,216,0.15)" },
  actionLogCollapsedIcon: { fontSize: 12 },
  actionLogCollapsedText: { fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  actionLogExpanded: { marginHorizontal: 12, marginBottom: 8, backgroundColor: "rgba(0,180,216,0.05)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,180,216,0.12)", padding: 12, gap: 6 },

  /* ── Quick chips ── */
  quickChipsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  quickChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: Colors.primary + "30" },
  quickChipText: { fontSize: 12, color: Colors.text, fontFamily: "Inter_500Medium" },

  /* ── Drawer ── */
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 8,
  },
  drawerLogoWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  drawerLogo: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.border },
  drawerLogoName: { fontSize: 15, fontFamily: "Inter_700Bold", fontWeight: "700", color: Colors.text },
  drawerLogoTagline: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 1 },
  drawerCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceElevated, alignItems: "center", justifyContent: "center" },

  drawerSectionLabel: {
    fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5,
    color: Colors.textDim, paddingHorizontal: 18, marginBottom: 8, marginTop: 4,
  },
  drawerModeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 18, marginBottom: 16 },
  drawerModeChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated,
  },
  drawerModeLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textMuted },

  drawerDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 8, marginHorizontal: 18 },

  drawerItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 18, paddingVertical: 13,
  },
  drawerItemIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  drawerItemLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.text },
  drawerBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
    borderWidth: 1, backgroundColor: "transparent",
  },
  drawerBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  drawerDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.primary },

  drawerPlusCard: {
    marginHorizontal: 18, marginVertical: 4, padding: 14,
    backgroundColor: Colors.surfaceElevated, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  drawerPlusRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  drawerPlusTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  drawerUsageBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden", marginBottom: 6 },
  drawerUsageFill: { height: 4, borderRadius: 2 },
  drawerUsageText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },

  drawerFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8, flexWrap: "wrap",
  },
  drawerFooterLink: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  drawerFooterDot: { fontSize: 11, color: Colors.textDim },
  drawerFooterText: { fontSize: 11, color: Colors.textDim, fontFamily: "Inter_400Regular" },

  /* ── Inline history in drawer ── */
  drawerHistoryItem: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 18, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  drawerHistoryTitle: {
    flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text,
  },
  drawerHistoryDate: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textDim, flexShrink: 0,
  },
  drawerHistoryEmpty: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textDim,
    paddingHorizontal: 18, paddingVertical: 10,
  },
});

const upgradeStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end", alignItems: "center" },
  sheet: { width: "100%", backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40, borderTopWidth: 1, borderTopColor: Colors.border, overflow: "hidden" },
  glow: { position: "absolute", top: -60, left: "50%", marginLeft: -150, width: 300, height: 200, borderRadius: 150, backgroundColor: "transparent" },
  header: { alignItems: "center", marginBottom: 22 },
  orbWrap: { marginBottom: 16 },
  orb: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(0,212,255,0.1)", borderWidth: 1, borderColor: "rgba(0,212,255,0.25)", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text, textAlign: "center", marginBottom: 8, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 21, fontFamily: "Inter_400Regular" },
  planCard: { backgroundColor: Colors.surfaceElevated, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 10 },
  planRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planName: { fontSize: 15, fontWeight: "700", color: Colors.text, fontFamily: "Inter_700Bold", marginBottom: 3 },
  planDesc: { fontSize: 12, color: Colors.textDim, fontFamily: "Inter_400Regular" },
  planPrice: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  planPer: { fontSize: 12, fontWeight: "400", color: Colors.textDim },
  ctaBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 6, marginBottom: 10 },
  ctaText: { color: "#ffffff", fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  dismissBtn: { alignItems: "center", paddingVertical: 8 },
  dismissText: { color: Colors.textDim, fontSize: 13, fontFamily: "Inter_400Regular" },
});

const histStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: Colors.border, padding: 24, maxHeight: "80%" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text, fontFamily: "Inter_700Bold" },
  empty: { color: Colors.textDim, textAlign: "center", paddingVertical: 40, fontFamily: "Inter_400Regular" },
  item: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemTitle: { fontSize: 15, color: Colors.text, fontFamily: "Inter_500Medium", marginBottom: 3 },
  itemDate: { fontSize: 12, color: Colors.textDim, fontFamily: "Inter_400Regular" },
});
