import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { fetch } from "expo/fetch";
import { useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
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

import { ChatInput } from "@/components/ChatInput";
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

const MOODS = [
  { label: "Alive & open",      emoji: "🌤️", color: "#00d4ff", prompt: "My heart feels light today — genuinely open. I want to share this energy and maybe explore something that gives it more meaning. Meet me here." },
  { label: "Need holding",      emoji: "💙", color: "#60a5fa", prompt: "Something in me is asking for gentleness right now. I don't need solutions — I need to feel less alone. Can you just be here with me for a while?" },
  { label: "In the deep",       emoji: "🌊", color: "#38bdf8", prompt: "I'm in a hard place today. The kind that's hard to explain. I don't need fixing — I just need you to sit with me in it and not rush me out." },
  { label: "Restless mind",     emoji: "🌀", color: "#a78bfa", prompt: "My mind won't settle — it's spinning and I can't find stillness. Can you help me come back to myself? Gently. I need grounding, not rushing." },
  { label: "Searching",         emoji: "🔍", color: "#94a3b8", prompt: "I'm alive with questions today — something in me is reaching for something I can't quite name. Let's go somewhere I've never been. I'm ready to explore." },
  { label: "Ready to rise",     emoji: "🔥", color: "#f97316", prompt: "Something is building in me — a real sense of possibility and purpose. I don't want to waste it. Help me channel this into something that actually matters." },
  { label: "Running on empty",  emoji: "🌑", color: "#64748b", prompt: "I'm depleted — down to the last reserves. But I'm here, and I reached out, which took something. Let's take it slow. No pressure. Just presence." },
  { label: "Heart full",        emoji: "✨", color: "#ec4899", prompt: "I'm sitting with something beautiful — a quiet, deep gratitude that I can't quite explain. Can we stay here a while? I want to understand what I'm feeling." },
];

const TOPICS = [
  { label: "Philosophy",    icon: "book" as const },
  { label: "Cosmos",        icon: "globe" as const },
  { label: "Consciousness", icon: "cpu" as const },
  { label: "Psychology",    icon: "user" as const },
  { label: "Quantum",       icon: "zap" as const },
  { label: "Spirituality",  icon: "feather" as const },
  { label: "Health",        icon: "heart" as const },
  { label: "Music",         icon: "music" as const },
];

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
  const { userId, profile } = useApp();
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

  const promptHandledRef = useRef<string | undefined>(undefined);
  const convoHandledRef = useRef<string | undefined>(undefined);
  const kateVoiceRef = useRef<string | undefined>(undefined);
  const speechCancelledRef = useRef<boolean>(false);

  const refreshKateVoice = useCallback(() => {
    Speech.getAvailableVoicesAsync()
      .then(voices => {
        const kate = voices.find(
          v => v.name.toLowerCase().includes("kate") && v.language.startsWith("en-GB")
        ) ?? voices.find(v => v.language.startsWith("en-GB"));
        if (kate) kateVoiceRef.current = kate.identifier;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshKateVoice();
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") refreshKateVoice();
    });
    return () => sub.remove();
  }, [refreshKateVoice]);

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

  const tabBarHeight = useBottomTabBarHeight();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : tabBarHeight;

  const handleSend = useCallback(async (text: string, imageBase64?: string) => {
    if (isStreaming) return;

    const userMsg: Message = { id: generateId(), role: "user", content: text, uploadedImageBase64: imageBase64 };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);
    setActionSteps([]);
    setStepsExpanded(false);

    try {
      let activeId = conversationId;
      if (!activeId) {
        const convo = await createConversation(text.slice(0, 60), userId ?? undefined);
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
            imageBase64: imageBase64 ?? undefined,
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
      let imageB64: string | undefined;

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
              imageB64 = parsed.b64;
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
    } catch {
      setShowTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }, [conversationId, isStreaming, userId, voiceMode]);

  useEffect(() => {
    if (
      params.prompt &&
      params.prompt !== promptHandledRef.current &&
      !isStreaming
    ) {
      promptHandledRef.current = params.prompt;
      setMessages([]);
      setConversationId(null);
      setTimeout(() => handleSend(params.prompt!), 200);
    }
  }, [params.prompt, handleSend, isStreaming]);

  // Auto-load the most recent conversation on startup
  useEffect(() => {
    if (params.conversationId || params.prompt) return; // handled by other effects
    (async () => {
      try {
        const uid = userId || (await getUserId());
        const convos = await fetchConversations(uid);
        if (!convos || convos.length === 0) return;
        const latest = convos.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        // Skip probe/health-check conversations
        if (!latest || latest.title === "health check" || latest.title === "probe") return;
        const base = getApiBase();
        const qs = uid ? `?userId=${encodeURIComponent(uid)}` : "";
        const res = await fetch(`${base}openai/conversations/${latest.id}${qs}`);
        if (!res.ok) return;
        const data = await res.json();
        const msgs: Message[] = (data.messages ?? []).map((m: DBMessage) => ({
          id: String(m.id),
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        if (msgs.length === 0) return;
        setMessages(msgs);
        setConversationId(latest.id);
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleMood = (mood: typeof MOODS[number]) => {
    handleSend(mood.prompt);
  };

  const handleTopic = (topic: string) => {
    handleSend(`Let's explore ${topic}. What's the most fascinating angle on this right now?`);
  };

  const handleSurprise = () => {
    const pick = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
    handleSend(pick);
  };

  const handleNewChat = useCallback(() => {
    stopSpeech();
    setMessages([]);
    setConversationId(null);
    setIsStreaming(false);
    setShowTyping(false);
    setActionSteps([]);
    setStepsExpanded(false);
  }, []);

  const UPGRADE_URL = "https://sirius-ai.live/pricing";

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: Colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* ── Upgrade modal ── */}
      <Modal
        visible={showUpgradeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <View style={upgradeStyles.overlay}>
          <View style={upgradeStyles.sheet}>
            {/* Glow blob */}
            <View style={upgradeStyles.glow} pointerEvents="none" />

            {/* Header */}
            <View style={upgradeStyles.header}>
              <View style={upgradeStyles.orbWrap}>
                <View style={upgradeStyles.orb}>
                  <Text style={{ fontSize: 22 }}>⚡</Text>
                </View>
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

            {/* Plans */}
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

            {/* CTA */}
            <TouchableOpacity
              style={upgradeStyles.ctaBtn}
              activeOpacity={0.82}
              onPress={() => {
                setShowUpgradeModal(false);
                Linking.openURL(UPGRADE_URL);
              }}
            >
              <Text style={upgradeStyles.ctaText}>See plans at sirius-ai.live →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={upgradeStyles.dismissBtn}
              onPress={() => setShowUpgradeModal(false)}
            >
              <Text style={upgradeStyles.dismissText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {messages.length > 0 && (
        <View style={[styles.chatHeader, { paddingTop: topPad }]}>
          <Pressable
            onPress={handleNewChat}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Feather name="chevron-left" size={22} color={Colors.primary} />
            <Text style={styles.backBtnText}>Home</Text>
          </Pressable>
          <Pressable
            onPress={handleNewChat}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={({ pressed }) => [styles.newChatBtn, pressed && { opacity: 0.6 }]}
          >
            <Feather name="edit" size={18} color={Colors.primary} />
            <Text style={styles.newChatText}>New chat</Text>
          </Pressable>
        </View>
      )}
      {messages.length === 0 ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.landing, { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo + branding */}
          <View style={styles.brandRow}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logoImage}
            />
            <Text style={styles.brandName}>{aiName}</Text>
            <Text style={styles.brandSlogan}>I think, so I am</Text>
          </View>

          {/* Mood tiles */}
          <View style={styles.sectionHeader}>
            <Feather name="activity" size={13} color={Colors.primary} />
            <Text style={styles.sectionLabel}>WHERE ARE YOU RIGHT NOW?</Text>
          </View>
          <View style={styles.moodGrid}>
            {MOODS.map(mood => (
              <Pressable
                key={mood.label}
                onPress={() => handleMood(mood)}
                style={({ pressed }) => [
                  styles.moodTile,
                  { borderColor: mood.color + "40", backgroundColor: mood.color + "18" },
                  pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] },
                ]}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Topics */}
          <View style={styles.sectionHeader}>
            <Feather name="compass" size={13} color={Colors.primary} />
            <Text style={styles.sectionLabel}>EXPLORE A DOMAIN</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topicsRow}
          >
            {TOPICS.map(topic => (
              <Pressable
                key={topic.label}
                onPress={() => handleTopic(topic.label)}
                style={({ pressed }) => [
                  styles.topicChip,
                  pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] },
                ]}
              >
                <Feather name={topic.icon} size={14} color={Colors.primary} />
                <Text style={styles.topicLabel}>{topic.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Surprise me */}
          <Pressable
            onPress={handleSurprise}
            style={({ pressed }) => [styles.surpriseBtn, pressed && { opacity: 0.8 }]}
          >
            <Feather name="shuffle" size={16} color={Colors.background} />
            <Text style={styles.surpriseBtnText}>Surprise me</Text>
          </Pressable>
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
                <Pressable
                  onPress={() => setStepsExpanded(e => !e)}
                  style={styles.actionLogCollapsed}
                >
                  <Text style={styles.actionLogCollapsedIcon}>⚡</Text>
                  <Text style={styles.actionLogCollapsedText}>
                    {actionSteps.length} action{actionSteps.length !== 1 ? "s" : ""} taken
                  </Text>
                  <Feather
                    name={stepsExpanded ? "chevron-down" : "chevron-up"}
                    size={13}
                    color={Colors.textMuted}
                    style={{ marginLeft: "auto" }}
                  />
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

      {messages.length > 0 && !isStreaming && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickChipsRow}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => handleSend("Can you visualise this for me?")}
            style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}
          >
            <Feather name="image" size={13} color={Colors.primary} />
            <Text style={styles.quickChipText}>Visualise this</Text>
          </Pressable>
          <Pressable
            onPress={() => handleSend("Can you summarise what we've discussed so far?")}
            style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}
          >
            <Feather name="list" size={13} color={Colors.primary} />
            <Text style={styles.quickChipText}>Summarise</Text>
          </Pressable>
          <Pressable
            onPress={() => handleSend("Go deeper on this.")}
            style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}
          >
            <Feather name="arrow-down-circle" size={13} color={Colors.primary} />
            <Text style={styles.quickChipText}>Go deeper</Text>
          </Pressable>
          <Pressable
            onPress={() => handleSend("What's a different way to look at this?")}
            style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}
          >
            <Feather name="refresh-cw" size={13} color={Colors.primary} />
            <Text style={styles.quickChipText}>New angle</Text>
          </Pressable>
        </ScrollView>
      )}
      <View style={{ paddingBottom: bottomPad }}>
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder={`Message ${aiName}...`}
          voiceMode={voiceMode}
          onToggleVoice={() => {
            if (voiceMode) stopSpeech();
            setVoiceMode(v => !v);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  /* ── Chat header (shown when in conversation) ── */
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(0,180,216,0.12)",
  },
  newChatText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },

  /* ── Landing screen ── */
  landing: {
    paddingHorizontal: 20,
    alignItems: "stretch",
  },
  brandRow: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 28,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.25)",
  },
  brandName: {
    fontSize: 38,
    fontWeight: "700",
    color: Colors.primary,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
    marginBottom: 6,
  },
  brandSlogan: {
    fontSize: 15,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textDim,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.9,
  },

  /* Mood tiles */
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 28,
  },
  moodTile: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
  },
  moodEmoji: {
    fontSize: 20,
  },
  moodLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    flexShrink: 1,
  },

  /* Topic row */
  topicsRow: {
    gap: 10,
    paddingRight: 4,
    marginBottom: 28,
  },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topicLabel: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: "Inter_500Medium",
  },

  /* Surprise */
  surpriseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
  },
  surpriseBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.background,
    fontFamily: "Inter_600SemiBold",
  },

  /* ── Action log (live tool narration) ── */
  actionLogLive: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "rgba(0,180,216,0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,180,216,0.15)",
    padding: 12,
    gap: 6,
  },
  actionStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 2,
  },
  actionStepIcon: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionStepText: {
    flex: 1,
  },
  actionStepLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    lineHeight: 18,
  },
  actionStepDetail: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    marginTop: 1,
  },
  actionLogPulse: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,180,216,0.1)",
  },
  actionLogDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.8,
  },
  actionLogWorking: {
    fontSize: 11,
    color: "rgba(0,212,255,0.7)",
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  actionLogCollapsed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(0,180,216,0.06)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,180,216,0.15)",
  },
  actionLogCollapsedIcon: {
    fontSize: 12,
  },
  actionLogCollapsedText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_400Regular",
  },
  actionLogExpanded: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "rgba(0,180,216,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,180,216,0.12)",
    padding: 12,
    gap: 6,
  },

  /* Quick action chips (active conversation) */
  quickChipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  quickChipText: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: "Inter_500Medium",
  },
});

const upgradeStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4,8,26,0.85)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    width: "100%",
    backgroundColor: "#0a0f1e",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,212,255,0.15)",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -60,
    left: "50%",
    marginLeft: -150,
    width: 300,
    height: 200,
    borderRadius: 150,
    backgroundColor: "transparent",
    // @ts-ignore
    boxShadow: "0 0 80px 40px rgba(0,212,255,0.08)",
  },
  header: {
    alignItems: "center",
    marginBottom: 22,
  },
  orbWrap: {
    marginBottom: 16,
  },
  orb: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0,212,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 8,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 21,
    fontFamily: "Inter_400Regular",
  },
  planCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    marginBottom: 10,
  },
  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Inter_700Bold",
    marginBottom: 3,
  },
  planDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    fontFamily: "Inter_400Regular",
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  planPer: {
    fontSize: 12,
    fontWeight: "400",
    color: "rgba(255,255,255,0.35)",
  },
  ctaBtn: {
    backgroundColor: "hsl(193,100%,42%)",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  ctaText: {
    color: "#04081a",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  dismissBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  dismissText: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
