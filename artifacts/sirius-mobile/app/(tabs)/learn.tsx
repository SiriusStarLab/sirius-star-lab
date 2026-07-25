import { fetch } from "expo/fetch";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import Colors from "@/constants/colors";
import { createConversation, generateId, getApiBase, getUserId } from "@/lib/api";
import { useApp } from "@/context/AppContext";

type Panel = "home" | "study-plan" | "quiz" | "document";

interface Msg { id: string; role: "user" | "assistant"; content: string; }

const TEAL = "#00b4d8";

const PANELS = [
  {
    id: "study-plan" as Panel,
    icon: "target" as const,
    title: "Build a Study Plan",
    desc: "Tell Sirius what you want to master. Get a structured learning path with milestones and resources.",
    color: TEAL,
    tag: "Structured learning",
    placeholder: "What topic do you want to master? (e.g. 'Spanish in 3 months', 'Machine learning basics')",
    system: "You are a world-class learning coach. Build detailed, structured, week-by-week study plans with milestones, resources, and benchmarks. Be practical and specific.",
  },
  {
    id: "quiz" as Panel,
    icon: "zap" as const,
    title: "Test Yourself",
    desc: "Practice with AI-generated quizzes on any topic. Instant feedback and explanations.",
    color: "#8b5cf6",
    tag: "Active recall",
    placeholder: "What topic would you like to be quizzed on?",
    system: "You are an expert quiz generator. Create engaging multiple-choice and short-answer questions. After each answer, give clear feedback and explain why it's correct or incorrect. Keep it challenging but encouraging.",
  },
  {
    id: "document" as Panel,
    icon: "file-text" as const,
    title: "Learn from a Document",
    desc: "Paste any text — notes, articles, textbook chapters. Sirius breaks it down and challenges your thinking.",
    color: "#f59e0b",
    tag: "Document analysis",
    placeholder: "Paste your document, notes, or article here, then ask me anything about it...",
    system: "You are an expert educator. When given text content, analyse it deeply, identify key concepts, explain complex ideas clearly, and help the user truly understand the material through Socratic dialogue and targeted questions.",
  },
];

function ChatView({ panel, onBack }: { panel: typeof PANELS[0]; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { userId: ctxUserId } = useApp();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setInput("");

    const uid = ctxUserId || (await getUserId());
    const userMsg: Msg = { id: generateId(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    try {
      let activeId = convId;
      if (!activeId) {
        const c = await createConversation(text.slice(0, 60), uid);
        activeId = c.id;
        setConvId(activeId);
      }

      const base = getApiBase();
      const response = await fetch(`${base}openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ content: text, userId: uid, mode: "guru" }),
      } as any);

      if (!response.ok) throw new Error("Failed");

      const reader = (response.body as any).getReader();
      const decoder = new TextDecoder();
      let full = "";
      let buffer = "";
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
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
            }
          } catch {}
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: generateId(), role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, convId, ctxUserId]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: Colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.chatHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </Pressable>
        <View style={[styles.modeTag, { backgroundColor: panel.color + "22" }]}>
          <Feather name={panel.icon} size={13} color={panel.color} />
          <Text style={[styles.modeTagText, { color: panel.color }]}>{panel.title}</Text>
        </View>
        <Pressable
          onPress={() => { setMessages([]); setConvId(null); }}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Feather name="refresh-cw" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 && (
          <View style={styles.emptyChat}>
            <Text style={[styles.emptyTitle, { color: panel.color }]}>{panel.title}</Text>
            <Text style={styles.emptyDesc}>{panel.desc}</Text>
          </View>
        )}
        {messages.map(m => (
          <View key={m.id} style={m.role === "user" ? styles.userBubble : styles.aiBubble}>
            <Text style={m.role === "user" ? styles.userText : styles.aiText}>{m.content}</Text>
          </View>
        ))}
        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <View style={styles.aiBubble}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={panel.placeholder}
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={4000}
        />
        <Pressable
          onPress={() => send(input)}
          disabled={!input.trim() || isStreaming}
          style={[styles.sendBtn, { backgroundColor: TEAL, opacity: (!input.trim() || isStreaming) ? 0.4 : 1 }]}
        >
          <Feather name="arrow-up" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const [activePanel, setActivePanel] = useState<typeof PANELS[0] | null>(null);

  if (activePanel) {
    return <ChatView panel={activePanel} onBack={() => setActivePanel(null)} />;
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: Colors.background }]}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Hero */}
      <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.push("/(tabs)" as any)} style={styles.backBtn}>
          <Feather name="chevron-left" size={20} color={Colors.primary} />
          <Text style={styles.backBtnText}>Home</Text>
        </Pressable>
        <View style={[styles.heroIcon, { backgroundColor: TEAL }]}>
          <Feather name="book-open" size={28} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Learn</Text>
        <Text style={styles.heroSub}>Your personal AI learning partner</Text>
      </View>

      {/* Cards */}
      <View style={styles.cardList}>
        {PANELS.map(p => (
          <Pressable
            key={p.id}
            onPress={() => setActivePanel(p)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
          >
            <View style={[styles.cardIconWrap, { backgroundColor: p.color + "22" }]}>
              <Feather name={p.icon} size={24} color={p.color} />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle}>{p.title}</Text>
                <View style={[styles.tag, { backgroundColor: p.color + "22" }]}>
                  <Text style={[styles.tagText, { color: p.color }]}>{p.tag}</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>{p.desc}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 8, marginBottom: 12 },
  backBtnText: { fontSize: 15, fontWeight: "600", color: Colors.primary },
  hero: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 28 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16, shadowColor: TEAL, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  heroTitle: { fontSize: 28, fontWeight: "700", color: Colors.text, letterSpacing: -0.5, marginBottom: 6 },
  heroSub: { fontSize: 15, color: Colors.textMuted, textAlign: "center" },
  cardList: { paddingHorizontal: 16, gap: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  cardIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, gap: 6 },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  tagText: { fontSize: 11, fontWeight: "600" },
  cardDesc: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  chatHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, justifyContent: "space-between" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  modeTag: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  modeTagText: { fontSize: 13, fontWeight: "600" },
  emptyChat: { alignItems: "center", paddingTop: 60, paddingHorizontal: 24, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "700" },
  emptyDesc: { fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
  userBubble: { alignSelf: "flex-end", backgroundColor: Colors.userBubble, borderRadius: 18, borderBottomRightRadius: 4, padding: 12, marginVertical: 4, maxWidth: "80%" },
  aiBubble: { alignSelf: "flex-start", backgroundColor: Colors.surface, borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, marginVertical: 4, maxWidth: "85%", borderWidth: 1, borderColor: Colors.border },
  userText: { color: Colors.text, fontSize: 15, lineHeight: 21 },
  aiText: { color: Colors.text, fontSize: 15, lineHeight: 21 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 8, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, backgroundColor: Colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: Colors.text, fontSize: 15, maxHeight: 120, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 2 },
});
