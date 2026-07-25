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
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import Colors from "@/constants/colors";
import { createConversation, generateId, getApiBase, getUserId } from "@/lib/api";
import { useApp } from "@/context/AppContext";

interface Msg { id: string; role: "user" | "assistant"; content: string; }

const TOPICS = [
  {
    id: "vibration",
    icon: "activity" as const,
    emoji: "〰️",
    title: "Vibration & Frequency",
    subtitle: "The physics of everything",
    color: "#0891b2",
    openingMessage: "Welcome. Vibration is the language of the universe — from quantum fields to the cells in your body, everything is in a state of oscillation. Whether you want the hard physics, the practical applications like sound healing and binaural beats, or the deeper spiritual traditions, I'm here. What draws you to vibration and frequency today?",
    suggestions: [
      "I want to raise my vibration — where do I start?",
      "Explain the real science behind sound healing",
      "What are solfeggio frequencies?",
      "What is the Schumann resonance?",
    ],
  },
  {
    id: "breathwork",
    icon: "wind" as const,
    emoji: "🌬️",
    title: "Breathwork",
    subtitle: "Conscious breathing practices",
    color: "#16a34a",
    openingMessage: "Your breath is the one system in your body that is both automatic and fully under your conscious control — and that makes it a doorway. Slow it down and you activate the parasympathetic system. Speed it up deliberately and you flood your body with oxygen. The science is fascinating and the practice is immediate. What would you like to explore — or how are you feeling right now?",
    suggestions: [
      "I'm anxious — help me calm down right now",
      "Walk me through the Wim Hof method",
      "Teach me box breathing step by step",
      "I want to use my breath to boost energy",
    ],
  },
  {
    id: "energy",
    icon: "zap" as const,
    emoji: "⚡",
    title: "Energy & Vitality",
    subtitle: "Raising your frequency",
    color: "#d97706",
    openingMessage: "Energy isn't just physical — it's the quality of aliveness you bring to everything. There's the mitochondrial story, the hormonal story, the sleep story, the circadian story — and then there's something deeper that traditions from Ayurveda to Traditional Chinese Medicine have been mapping for thousands of years. What's your energy like right now, and what would you most like to change?",
    suggestions: [
      "I'm exhausted all the time — help me understand why",
      "I need sustained energy without caffeine",
      "Tell me about chi, prana, and life force energy",
      "What is actually draining my energy?",
    ],
  },
  {
    id: "sleep",
    icon: "moon" as const,
    emoji: "🌙",
    title: "Sleep & Recovery",
    subtitle: "Deep restoration",
    color: "#7c3aed",
    openingMessage: "Sleep is not downtime — it's when your brain consolidates memory, your body repairs tissue, your immune system does its deepest work, and your emotional processing happens. Matthew Walker called it the 'greatest legal performance-enhancing drug' and the science backs that up completely. What's going on with your sleep, and what would a truly restful night feel like for you?",
    suggestions: [
      "I can't get to sleep — my mind races",
      "I wake up at 3am and can't get back to sleep",
      "Explain sleep cycles and what they actually do",
      "What is the best sleep routine according to science?",
    ],
  },
  {
    id: "mindfulness",
    icon: "sun" as const,
    emoji: "☀️",
    title: "Mindfulness & Presence",
    subtitle: "Living in the now",
    color: "#dc2626",
    openingMessage: "Mindfulness isn't about emptying your mind — that's a myth. It's about changing your relationship with your thoughts so that you notice them without being dragged around by them. The neuroscience is compelling: regular practice literally reshapes the brain, thickening the prefrontal cortex and shrinking the amygdala. Where are you with your practice, and what do you most want from this conversation?",
    suggestions: [
      "I've tried meditating but I can't stop thinking",
      "What's the difference between mindfulness and meditation?",
      "Guide me through a 5-minute grounding exercise",
      "How do I stay present during a stressful day?",
    ],
  },
  {
    id: "morning",
    icon: "sunrise" as const,
    emoji: "🌅",
    title: "Morning Ritual",
    subtitle: "How you begin shapes everything",
    color: "#ea580c",
    openingMessage: "The first 90 minutes of your day set the neurochemical tone for everything that follows. Cortisol peaks naturally within 30–45 minutes of waking — use it or lose it. Light hits your retinas and resets your circadian clock. Movement activates the brain. There's a science to the perfect morning and it's simpler than most routines suggest. What does your current morning look like?",
    suggestions: [
      "I wake up exhausted and can't get going",
      "Build me a 30-minute morning routine",
      "Should I check my phone first thing?",
      "What does the science say about cold showers?",
    ],
  },
  {
    id: "music",
    icon: "music" as const,
    emoji: "🎵",
    title: "Music & The Mind",
    subtitle: "Sound as medicine",
    color: "#9333ea",
    openingMessage: "Music activates more areas of the brain simultaneously than almost any other human activity. It can reduce cortisol, increase dopamine, synchronise neural oscillations, and even slow the perception of pain. Different frequencies, tempos, and harmonic structures affect the nervous system in measurably different ways. What aspect of music and mind fascinates you — or how can music help you right now?",
    suggestions: [
      "What music actually helps with focus and deep work?",
      "Explain binaural beats — do they really work?",
      "How does music affect emotions neurologically?",
      "What is the 432Hz vs 440Hz debate really about?",
    ],
  },
];

function TopicChat({ topic, onBack }: { topic: typeof TOPICS[0]; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { userId: ctxUserId } = useApp();
  const [messages, setMessages] = useState<Msg[]>([
    { id: "opening", role: "assistant", content: topic.openingMessage },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const isFirstMsg = useRef(true);

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
        const c = await createConversation(`${topic.title}: ${text.slice(0, 50)}`, uid);
        activeId = c.id;
        setConvId(activeId);
      }

      const sendContent = isFirstMsg.current
        ? `[Wellbeing - ${topic.title}] ${text}`
        : text;
      isFirstMsg.current = false;

      const base = getApiBase();
      const response = await fetch(`${base}openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ content: sendContent, userId: uid, mode: "guru" }),
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
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, convId, ctxUserId, topic]);

  return (
    <KeyboardAvoidingView
      style={[s.flex, { backgroundColor: Colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} style={s.iconBtn} hitSlop={12}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerEmoji}>{topic.emoji}</Text>
          <Text style={[s.headerTitle, { color: topic.color }]}>{topic.title}</Text>
        </View>
        <Pressable
          onPress={() => { setMessages([{ id: "opening", role: "assistant", content: topic.openingMessage }]); setConvId(null); isFirstMsg.current = true; }}
          style={s.iconBtn} hitSlop={12}
        >
          <Feather name="refresh-cw" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} style={s.flex} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
        {messages.map(m => (
          <View key={m.id} style={m.role === "user" ? s.userBubble : s.aiBubble}>
            <Text style={m.role === "user" ? s.userText : s.aiText}>{m.content}</Text>
          </View>
        ))}
        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <View style={s.aiBubble}><ActivityIndicator size="small" color={Colors.primary} /></View>
        )}
      </ScrollView>

      {/* Suggestions */}
      {messages.length === 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.suggestScroll}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
          {topic.suggestions.map(sg => (
            <Pressable key={sg} onPress={() => send(sg)}
              style={[s.suggest, { borderColor: topic.color + "55" }]}>
              <Text style={[s.suggestText, { color: topic.color }]}>{sg}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={[s.inputRow, { paddingBottom: tabBarHeight + 8 }]}>
        <TextInput style={s.input} value={input} onChangeText={setInput}
          placeholder="Ask anything..." placeholderTextColor={Colors.textMuted} multiline maxLength={2000} />
        <Pressable onPress={() => send(input)} disabled={!input.trim() || isStreaming}
          style={[s.sendBtn, { backgroundColor: topic.color, opacity: (!input.trim() || isStreaming) ? 0.4 : 1 }]}>
          <Feather name="arrow-up" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function WellbeingScreen() {
  const insets = useSafeAreaInsets();
  const [activeTopic, setActiveTopic] = useState<typeof TOPICS[0] | null>(null);

  if (activeTopic) return <TopicChat topic={activeTopic} onBack={() => setActiveTopic(null)} />;

  return (
    <ScrollView style={[s.flex, { backgroundColor: Colors.background }]} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={[s.hero, { paddingTop: insets.top + 20 }]}>
        <View style={[s.heroIcon, { backgroundColor: "#ec4899" }]}>
          <Feather name="heart" size={28} color="#fff" />
        </View>
        <Text style={s.heroTitle}>Wellbeing</Text>
        <Text style={s.heroSub}>Explore what keeps you balanced, vital, and alive</Text>
      </View>

      <View style={s.grid}>
        {TOPICS.map(t => (
          <Pressable key={t.id} onPress={() => setActiveTopic(t)}
            style={({ pressed }) => [s.topicCard, { borderColor: t.color + "33", opacity: pressed ? 0.8 : 1 }]}>
            <View style={[s.topicIcon, { backgroundColor: t.color + "22" }]}>
              <Feather name={t.icon} size={22} color={t.color} />
            </View>
            <Text style={s.topicEmoji}>{t.emoji}</Text>
            <Text style={[s.topicTitle, { color: t.color }]}>{t.title}</Text>
            <Text style={s.topicSub}>{t.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 24 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16, shadowColor: "#ec4899", shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  heroTitle: { fontSize: 28, fontWeight: "700", color: Colors.text, letterSpacing: -0.5, marginBottom: 6 },
  heroSub: { fontSize: 15, color: Colors.textMuted, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 12 },
  topicCard: { width: "47%", backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, padding: 16, gap: 6, alignItems: "flex-start" },
  topicIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  topicEmoji: { fontSize: 18, marginBottom: 2 },
  topicTitle: { fontSize: 14, fontWeight: "700", lineHeight: 18 },
  topicSub: { fontSize: 12, color: Colors.textMuted, lineHeight: 16 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  headerEmoji: { fontSize: 18 },
  headerTitle: { fontSize: 15, fontWeight: "700" },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  userBubble: { alignSelf: "flex-end", backgroundColor: Colors.userBubble, borderRadius: 18, borderBottomRightRadius: 4, padding: 12, marginVertical: 4, maxWidth: "80%" },
  aiBubble: { alignSelf: "flex-start", backgroundColor: Colors.surface, borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, marginVertical: 4, maxWidth: "85%", borderWidth: 1, borderColor: Colors.border },
  userText: { color: Colors.text, fontSize: 15, lineHeight: 21 },
  aiText: { color: Colors.text, fontSize: 15, lineHeight: 21 },
  suggestScroll: { maxHeight: 44, paddingVertical: 6 },
  suggest: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: Colors.surface },
  suggestText: { fontSize: 12, fontWeight: "600" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 8, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, backgroundColor: Colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: Colors.text, fontSize: 15, maxHeight: 120, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 2 },
});
