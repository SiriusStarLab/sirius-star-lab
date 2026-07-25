import { fetch } from "expo/fetch";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "@/constants/colors";
import { createConversation, generateId, getApiBase, getUserId } from "@/lib/api";
import { useApp } from "@/context/AppContext";

interface Msg { id: string; role: "user" | "assistant"; content: string; }
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

function DreamChat({ dream, onBack }: { dream: Dream; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { userId: ctxUserId } = useApp();
  const opening = `I want to talk about my dream: "${dream.title}". ${dream.note ? `Here's some context: ${dream.note}` : "Help me explore it, break it down into actionable steps, and give me a clear next step I can take today."}`;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!started) {
      setStarted(true);
      sendMsg(opening);
    }
  }, []);

  const sendMsg = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const uid = ctxUserId || (await getUserId());
    const userMsg: Msg = { id: generateId(), role: "user", content: text };
    if (text !== opening) setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    try {
      let activeId = convId;
      if (!activeId) {
        const c = await createConversation(`Dream: ${dream.title}`, uid);
        activeId = c.id;
        setConvId(activeId);
      }

      const base = getApiBase();
      const response = await fetch(`${base}openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ content: text, userId: uid, mode: "coach" }),
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
  }, [isStreaming, convId, ctxUserId, dream]);

  return (
    <KeyboardAvoidingView style={[d.flex, { backgroundColor: Colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[d.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} style={d.iconBtn} hitSlop={12}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </Pressable>
        <View style={d.headerCenter}>
          <Text style={d.dreamEmoji}>{dream.emoji}</Text>
          <Text style={[d.headerTitle, { color: dream.color }]} numberOfLines={1}>{dream.title}</Text>
        </View>
        <View style={d.iconBtn} />
      </View>

      <ScrollView ref={scrollRef} style={d.flex} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
        {messages.length === 0 && isStreaming && (
          <View style={d.aiBubble}><ActivityIndicator size="small" color={Colors.primary} /></View>
        )}
        {messages.map(m => (
          <View key={m.id} style={m.role === "user" ? d.userBubble : d.aiBubble}>
            <Text style={m.role === "user" ? d.userText : d.aiText}>{m.content}</Text>
          </View>
        ))}
        {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
          <View style={d.aiBubble}><ActivityIndicator size="small" color={Colors.primary} /></View>
        )}
      </ScrollView>

      <View style={[d.inputRow, { paddingBottom: tabBarHeight + 8 }]}>
        <TextInput style={d.input} value={input} onChangeText={setInput}
          placeholder="Ask Sirius about this dream..." placeholderTextColor={Colors.textMuted} multiline maxLength={2000} />
        <Pressable onPress={() => { sendMsg(input); setInput(""); }} disabled={!input.trim() || isStreaming}
          style={[d.sendBtn, { backgroundColor: dream.color, opacity: (!input.trim() || isStreaming) ? 0.4 : 1 }]}>
          <Feather name="arrow-up" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function DreamLabScreen() {
  const insets = useSafeAreaInsets();
  const { userId: ctxUserId } = useApp();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [activeDream, setActiveDream] = useState<Dream | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) setDreams(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const saveDreams = (updated: Dream[]) => {
    setDreams(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addDream = (data: Omit<Dream, "id" | "createdAt">) => {
    const dream: Dream = { ...data, id: `dream-${Date.now()}`, createdAt: new Date().toISOString() };
    saveDreams([dream, ...dreams]);
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
        {/* Hero */}
        <View style={[d.hero, { paddingTop: insets.top + 20 }]}>
          <View style={d.heroIcon}>
            <Feather name="star" size={28} color="#fff" />
          </View>
          <Text style={d.heroTitle}>Dream Lab</Text>
          <Text style={d.heroSub}>Build the life you're meant to live</Text>
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

const d = StyleSheet.create({
  flex: { flex: 1 },
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
  userBubble: { alignSelf: "flex-end", backgroundColor: Colors.primary, borderRadius: 18, borderBottomRightRadius: 4, padding: 12, marginVertical: 4, maxWidth: "80%" },
  aiBubble: { alignSelf: "flex-start", backgroundColor: Colors.surface, borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, marginVertical: 4, maxWidth: "85%", borderWidth: 1, borderColor: Colors.border },
  userText: { color: "#fff", fontSize: 15, lineHeight: 21 },
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
