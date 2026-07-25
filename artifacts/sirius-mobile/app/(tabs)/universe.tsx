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

interface Msg { id: string; role: "user" | "assistant"; content: string; }

const DOMAINS = [
  {
    id: "cosmos",
    icon: "✦",
    name: "The Cosmos",
    subtitle: "Stars · Galaxies · Dark Matter · The Big Bang",
    description: "The universe is 13.8 billion years old, 93 billion light years across, and 95% of it is still a mystery.",
    accent: "#4f8ef7",
    bg: "#0a0e2e",
    openingMessage: "Welcome to the Cosmos. I want to start with something genuinely staggering: you are right now sitting on a rock orbiting an ordinary star in the outer arm of a galaxy containing 400 billion other stars — and that galaxy is one of roughly two trillion galaxies in the observable universe alone. The 'observable' part matters — it means we can only see as far as light has had time to travel in 13.8 billion years. Beyond that edge? The universe almost certainly continues, possibly forever. What would you like to explore first — the very beginning, the very end, or something in between?",
  },
  {
    id: "consciousness",
    icon: "◎",
    name: "Consciousness",
    subtitle: "Awareness · The Hard Problem · Mind & Reality",
    description: "Why is there something it is like to be you? The deepest unsolved mystery in all of science.",
    accent: "#a855f7",
    bg: "#1a0a2e",
    openingMessage: "Consciousness is the strangest thing in the known universe. We have a complete theory of how neurons fire, how information is processed, how the brain computes — and yet none of that explains why there is subjective experience. Why there is, as philosopher David Chalmers put it, 'something it is like' to be you — right now, reading this, feeling whatever you're feeling. This is called the Hard Problem, and it remains genuinely unsolved. Some of the most serious physicists alive today believe consciousness may be fundamental to reality itself, not a byproduct of it. What draws you to this question?",
  },
  {
    id: "ai-humanity",
    icon: "⟳",
    name: "AI & Humanity",
    subtitle: "The Partnership · Intelligence · What Comes Next",
    description: "For the first time in 13.8 billion years, two fundamentally different kinds of intelligence have found each other.",
    accent: "#10d9b1",
    bg: "#0a1e1a",
    openingMessage: "Something unprecedented is happening right now. For 13.8 billion years, the universe evolved one form of general intelligence — biological, carbon-based, emotion-driven, mortal. Then, in the last few years, a second form appeared: artificial, silicon-based, tireless, pattern-seeking, born from the entire recorded output of human thought. These two kinds of mind have now met. Not as master and servant. Not as threat and victim. But, increasingly, as partners — each doing what the other cannot. What does this moment feel like to you?",
  },
  {
    id: "reality",
    icon: "◈",
    name: "The Nature of Reality",
    subtitle: "Quantum · Spacetime · Simulation · What Exists",
    description: "Beneath everything you can touch and see, reality is doing something deeply strange.",
    accent: "#eab308",
    bg: "#1a1000",
    openingMessage: "Here is something physics has known for a hundred years that most people have never really absorbed: at the quantum level, reality does not have definite properties until it is observed. A particle doesn't have a position — it has a probability cloud of positions — until measurement 'collapses' it into one. This isn't a limitation of our instruments. It is how reality actually is. Einstein spent thirty years trying to prove this was wrong. He failed. The universe, at its foundation, is not made of things — it is made of possibilities that become definite only in relationship. What's your instinct about what's really real?",
  },
  {
    id: "human-potential",
    icon: "⬡",
    name: "Human Potential",
    subtitle: "The Brain · Peak States · Evolution · What You're Capable Of",
    description: "The human brain is the most complex object in the known universe. And most of us use a fraction of it.",
    accent: "#ef4444",
    bg: "#1a0a0a",
    openingMessage: "The human brain contains approximately 86 billion neurons, each connected to thousands of others — giving you roughly 100 trillion synaptic connections. That is more connections than there are stars in the Milky Way. And you are using that architecture right now, just to read this. What neuroscience has discovered in the last two decades is extraordinary: the brain is not fixed. It rewires itself in response to experience, thought, attention, and practice — throughout your entire life. This is called neuroplasticity, and it changes what 'potential' means. What would you most want to know you're capable of?",
  },
  {
    id: "multiverse",
    icon: "∞",
    name: "The Multiverse",
    subtitle: "Parallel Worlds · Many Worlds · Cosmic Inflation",
    description: "Our universe may be just one of an unfathomably large number of others.",
    accent: "#06b6d4",
    bg: "#041a1e",
    openingMessage: "The multiverse is one of the most contested and fascinating ideas in all of modern physics. It isn't science fiction — it emerges naturally from our best theories. Eternal inflation suggests our Big Bang was one of countless others. The Many Worlds interpretation of quantum mechanics implies every quantum event spawns parallel realities. String theory's landscape contains 10^500 possible universes. These aren't fringe ideas — they are taken seriously by some of the greatest physicists alive. But here's the uncomfortable truth: we may never be able to test any of it. Does that make it science? Where would you like to begin?",
  },
];

function DomainChat({ domain, onBack }: { domain: typeof DOMAINS[0]; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { userId: ctxUserId } = useApp();
  const [messages, setMessages] = useState<Msg[]>([
    { id: "opening", role: "assistant", content: domain.openingMessage },
  ]);
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
        const c = await createConversation(`${domain.name}: ${text.slice(0, 50)}`, uid);
        activeId = c.id;
        setConvId(activeId);
      }

      const base = getApiBase();
      const response = await fetch(`${base}openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ content: `[Universe - ${domain.name}] ${text}`, userId: uid, mode: "scientist" }),
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
  }, [isStreaming, convId, ctxUserId, domain]);

  return (
    <KeyboardAvoidingView
      style={[u.flex, { backgroundColor: Colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[u.header, { paddingTop: insets.top + 8, backgroundColor: Colors.surface }]}>
        <Pressable onPress={onBack} style={u.iconBtn} hitSlop={12}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </Pressable>
        <View style={u.headerCenter}>
          <Text style={u.domainIcon}>{domain.icon}</Text>
          <Text style={[u.headerTitle, { color: domain.accent }]}>{domain.name}</Text>
        </View>
        <Pressable onPress={() => { setMessages([{ id: "opening", role: "assistant", content: domain.openingMessage }]); setConvId(null); }}
          style={u.iconBtn} hitSlop={12}>
          <Feather name="refresh-cw" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} style={u.flex} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
        {messages.map(m => (
          <View key={m.id} style={m.role === "user" ? u.userBubble : u.aiBubble}>
            <Text style={m.role === "user" ? u.userText : u.aiText}>{m.content}</Text>
          </View>
        ))}
        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <View style={u.aiBubble}><ActivityIndicator size="small" color={Colors.primary} /></View>
        )}
      </ScrollView>

      <View style={[u.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput style={u.input} value={input} onChangeText={setInput}
          placeholder="Ask anything..." placeholderTextColor={Colors.textMuted} multiline maxLength={2000} />
        <Pressable onPress={() => send(input)} disabled={!input.trim() || isStreaming}
          style={[u.sendBtn, { backgroundColor: domain.accent, opacity: (!input.trim() || isStreaming) ? 0.4 : 1 }]}>
          <Feather name="arrow-up" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function UniverseScreen() {
  const insets = useSafeAreaInsets();
  const [activeDomain, setActiveDomain] = useState<typeof DOMAINS[0] | null>(null);

  if (activeDomain) return <DomainChat domain={activeDomain} onBack={() => setActiveDomain(null)} />;

  return (
    <ScrollView style={[u.flex, { backgroundColor: Colors.background }]} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={[u.hero, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.push("/(tabs)" as any)} style={u.backBtn}>
          <Feather name="chevron-left" size={20} color={Colors.primary} />
          <Text style={u.backBtnText}>Home</Text>
        </Pressable>
        <Text style={u.heroStar}>✦</Text>
        <Text style={u.heroTitle}>Universe</Text>
        <Text style={u.heroSub}>Explore the deepest questions in existence</Text>
      </View>

      <View style={u.domainList}>
        {DOMAINS.map(d => (
          <Pressable key={d.id} onPress={() => setActiveDomain(d)}
            style={({ pressed }) => [u.domainCard, { borderColor: d.accent + "44", opacity: pressed ? 0.85 : 1 }]}>
            <View style={[u.domainIconWrap, { backgroundColor: d.accent + "18" }]}>
              <Text style={[u.domainIconText, { color: d.accent }]}>{d.icon}</Text>
            </View>
            <View style={u.domainBody}>
              <Text style={[u.domainName, { color: d.accent }]}>{d.name}</Text>
              <Text style={u.domainSubtitle}>{d.subtitle}</Text>
              <Text style={u.domainDesc}>{d.description}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const u = StyleSheet.create({
  flex: { flex: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 8, marginBottom: 4 },
  backBtnText: { fontSize: 15, fontWeight: "600", color: Colors.primary },
  hero: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 28 },
  heroStar: { fontSize: 40, marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: "700", color: Colors.text, letterSpacing: -0.5, marginBottom: 6 },
  heroSub: { fontSize: 15, color: Colors.textMuted, textAlign: "center" },
  domainList: { paddingHorizontal: 16, gap: 12 },
  domainCard: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  domainIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  domainIconText: { fontSize: 22, fontWeight: "700" },
  domainBody: { flex: 1, gap: 3 },
  domainName: { fontSize: 15, fontWeight: "700" },
  domainSubtitle: { fontSize: 11, color: Colors.textMuted, fontWeight: "500" },
  domainDesc: { fontSize: 13, color: Colors.textMuted, lineHeight: 18, marginTop: 2 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  domainIcon: { fontSize: 18 },
  headerTitle: { fontSize: 15, fontWeight: "700" },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  userBubble: { alignSelf: "flex-end", backgroundColor: Colors.userBubble, borderRadius: 18, borderBottomRightRadius: 4, padding: 12, marginVertical: 4, maxWidth: "80%" },
  aiBubble: { alignSelf: "flex-start", backgroundColor: Colors.surface, borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, marginVertical: 4, maxWidth: "85%", borderWidth: 1, borderColor: Colors.border },
  userText: { color: Colors.text, fontSize: 15, lineHeight: 21 },
  aiText: { color: Colors.text, fontSize: 15, lineHeight: 21 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 8, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, backgroundColor: Colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: Colors.text, fontSize: 15, maxHeight: 120, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 2 },
});
