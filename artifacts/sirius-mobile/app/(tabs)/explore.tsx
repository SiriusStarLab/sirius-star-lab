import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import {
  fetchEmotionalArc,
  fetchMoodHistory,
  generateBriefing,
  logMood,
  streamResearch,
  type MoodCheckin,
} from "@/lib/api";

const MOODS = [
  { label: "Curious", icon: "zap" as const, color: "#f59e0b" },
  { label: "Anxious", icon: "wind" as const, color: "#8b5cf6" },
  { label: "Inspired", icon: "star" as const, color: "#00d4ff" },
  { label: "Tired", icon: "moon" as const, color: "#6366f1" },
  { label: "Grateful", icon: "heart" as const, color: "#ec4899" },
  { label: "Focused", icon: "target" as const, color: "#22c55e" },
  { label: "Restless", icon: "activity" as const, color: "#f97316" },
  { label: "Content", icon: "smile" as const, color: "#84cc16" },
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

const TOPICS = [
  { label: "Consciousness", icon: "cpu" as const },
  { label: "Cosmos", icon: "globe" as const },
  { label: "Philosophy", icon: "book" as const },
  { label: "Psychology", icon: "user" as const },
  { label: "Quantum", icon: "zap" as const },
  { label: "Spirituality", icon: "feather" as const },
  { label: "Health", icon: "heart" as const },
  { label: "Music", icon: "music" as const },
];

const WISDOM_QUOTES = [
  { text: "The universe is under no obligation to make sense to you.", author: "Neil deGrasse Tyson" },
  { text: "We are made of star-stuff.", author: "Carl Sagan" },
  { text: "The measure of intelligence is the ability to change.", author: "Albert Einstein" },
  { text: "What we observe is not nature itself, but nature exposed to our method of questioning.", author: "Werner Heisenberg" },
  { text: "Reality is merely an illusion, albeit a very persistent one.", author: "Albert Einstein" },
  { text: "The privilege of a lifetime is to become who you truly are.", author: "Carl Jung" },
  { text: "He who has a why to live can bear almost any how.", author: "Nietzsche" },
];

function getTodayWisdom() {
  const day = new Date().getDate();
  return WISDOM_QUOTES[day % WISDOM_QUOTES.length];
}

function SectionHeader({ title, icon }: { title: string; icon: React.ComponentProps<typeof Feather>["name"] }) {
  return (
    <View style={styles.sectionHeader}>
      <Feather name={icon} size={15} color={Colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const mdStyles = {
  body: { color: Colors.text, fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  paragraph: { color: Colors.text, fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", marginBottom: 6, marginTop: 0 },
  strong: { color: Colors.text, fontFamily: "Inter_700Bold" },
  heading1: { color: Colors.text, fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 6, marginTop: 8 },
  heading2: { color: Colors.text, fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4, marginTop: 6 },
  heading3: { color: Colors.primary, fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 4, marginTop: 6 },
  bullet_list: { marginVertical: 4 },
  list_item: { color: Colors.text, fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", marginBottom: 2, flexDirection: "row" as const },
  bullet_list_icon: { color: Colors.primary, fontSize: 14, marginRight: 6 },
  code_inline: { color: Colors.primary, backgroundColor: "rgba(0,212,255,0.1)", fontSize: 12, borderRadius: 4 },
  link: { color: Colors.primary },
};

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { profile, userId } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const wisdom = getTodayWisdom();

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodCheckin[]>([]);
  const [arcInsight, setArcInsight] = useState<string | null>(null);
  const [arcLoading, setArcLoading] = useState(false);
  const [arcVisible, setArcVisible] = useState(false);

  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [briefingDate, setBriefingDate] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingVisible, setBriefingVisible] = useState(false);

  const [researchTopic, setResearchTopic] = useState("");
  const [researchText, setResearchText] = useState<string | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchVisible, setResearchVisible] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchMoodHistory(userId).then(setMoodHistory).catch(() => {});
    }
  }, [userId]);

  const handleMoodSelect = useCallback(async (mood: string) => {
    setSelectedMood(mood);
    if (userId) {
      await logMood(userId, mood).catch(() => {});
      const updated = await fetchMoodHistory(userId).catch(() => null);
      if (updated) setMoodHistory(updated);
    }
    router.push({ pathname: "/(tabs)", params: { prompt: `I'm feeling ${mood.toLowerCase()} today. How can we explore that together?` } });
  }, [userId]);

  const handleArc = useCallback(async () => {
    if (!userId) return;
    setArcLoading(true);
    setArcVisible(true);
    try {
      const result = await fetchEmotionalArc(userId);
      setArcInsight(result.insight ?? result.message ?? null);
    } catch {
      setArcInsight("Unable to analyse your arc right now.");
    }
    setArcLoading(false);
  }, [userId]);

  const handleBriefing = useCallback(async () => {
    if (!userId) return;
    setBriefingLoading(true);
    setBriefingVisible(true);
    setBriefingText(null);
    try {
      const result = await generateBriefing(userId);
      setBriefingText(result.briefing ?? null);
      setBriefingDate(result.date ?? null);
    } catch {
      setBriefingText("Unable to generate your briefing right now.");
    }
    setBriefingLoading(false);
  }, [userId]);

  const handleResearch = useCallback(async () => {
    if (!userId || !researchTopic.trim() || researchLoading) return;
    setResearchLoading(true);
    setResearchVisible(true);
    setResearchText("");
    await streamResearch(
      researchTopic.trim(),
      userId,
      (chunk) => setResearchText(prev => (prev ?? "") + chunk),
      () => setResearchLoading(false),
      () => { setResearchLoading(false); }
    );
  }, [userId, researchTopic, researchLoading]);

  const handleSurprise = () => {
    const pick = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
    router.push({ pathname: "/(tabs)", params: { prompt: pick } });
  };

  const handleTopic = (topic: string) => {
    router.push({ pathname: "/(tabs)", params: { prompt: `Let's explore ${topic}. What's the most fascinating thing happening in this field right now?` } });
  };

  const recentMoods = moodHistory.slice(0, 7);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: Colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 8, paddingBottom: bottomPad + 20 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Explore</Text>
      <Text style={styles.subheading}>What calls to you today?</Text>

      {/* Daily Wisdom */}
      <View style={styles.wisdomCard}>
        <Feather name="sun" size={16} color={Colors.primary} style={{ marginBottom: 10 }} />
        <Text style={styles.wisdomText}>"{wisdom.text}"</Text>
        <Text style={styles.wisdomAuthor}>— {wisdom.author}</Text>
      </View>

      {/* --- DAILY BRIEFING (Proactive Intelligence) --- */}
      <View style={styles.section}>
        <SectionHeader title="Your Daily Briefing" icon="radio" />
        <Text style={styles.featureDesc}>
          Sirius searches the world for what matters to you right now — based on who you are.
        </Text>
        {!briefingVisible ? (
          <Pressable
            onPress={handleBriefing}
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="radio" size={18} color={Colors.background} />
            <Text style={styles.primaryBtnText}>Generate my briefing</Text>
          </Pressable>
        ) : (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultLabel}>Briefing{briefingDate ? ` · ${briefingDate}` : ""}</Text>
              <Pressable onPress={() => setBriefingVisible(false)}>
                <Feather name="x" size={16} color={Colors.textMuted} />
              </Pressable>
            </View>
            {briefingLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Searching the world for you…</Text>
              </View>
            ) : (
              <>
                <Markdown style={mdStyles}>{briefingText ?? ""}</Markdown>
                <Pressable onPress={handleBriefing} style={styles.refreshBtn}>
                  <Feather name="refresh-cw" size={13} color={Colors.primary} />
                  <Text style={styles.refreshBtnText}>Refresh</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>

      {/* --- MOOD CHECK-IN + EMOTIONAL ARC --- */}
      <View style={styles.section}>
        <SectionHeader title="How are you feeling?" icon="activity" />
        <View style={styles.moodGrid}>
          {MOODS.map(mood => (
            <Pressable
              key={mood.label}
              onPress={() => handleMoodSelect(mood.label)}
              style={({ pressed }) => [
                styles.moodChip,
                selectedMood === mood.label && { borderColor: mood.color, backgroundColor: `${mood.color}18` },
                pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
              ]}
            >
              <Feather name={mood.icon} size={16} color={mood.color} />
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </Pressable>
          ))}
        </View>

        {recentMoods.length > 0 && (
          <View style={styles.moodHistoryRow}>
            <Text style={styles.moodHistoryLabel}>Recent:</Text>
            {recentMoods.map((m, i) => (
              <View key={m.id} style={styles.moodDot}>
                <Text style={styles.moodDotText}>{m.mood.slice(0, 3)}</Text>
              </View>
            ))}
          </View>
        )}

        {moodHistory.length >= 3 && (
          <Pressable
            onPress={handleArc}
            style={({ pressed }) => [styles.arcBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="trending-up" size={16} color={Colors.primary} />
            <Text style={styles.arcBtnText}>See my emotional arc</Text>
            <Feather name="chevron-right" size={16} color={Colors.textMuted} />
          </Pressable>
        )}

        {arcVisible && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultLabel}>Your Emotional Arc</Text>
              <Pressable onPress={() => setArcVisible(false)}>
                <Feather name="x" size={16} color={Colors.textMuted} />
              </Pressable>
            </View>
            {arcLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Analysing your patterns…</Text>
              </View>
            ) : (
              <Text style={styles.arcInsightText}>{arcInsight}</Text>
            )}
          </View>
        )}
      </View>

      {/* --- RESEARCH AGENT --- */}
      <View style={styles.section}>
        <SectionHeader title="Deep Research" icon="search" />
        <Text style={styles.featureDesc}>
          Give me a topic and I'll run a full multi-source investigation — synthesised into a research brief.
        </Text>
        <View style={styles.researchInputRow}>
          <TextInput
            style={styles.researchInput}
            value={researchTopic}
            onChangeText={setResearchTopic}
            placeholder="e.g. Latest in consciousness research"
            placeholderTextColor={Colors.textDim}
            selectionColor={Colors.primary}
            returnKeyType="search"
            onSubmitEditing={handleResearch}
            editable={!researchLoading}
          />
          <Pressable
            onPress={handleResearch}
            disabled={!researchTopic.trim() || researchLoading}
            style={({ pressed }) => [
              styles.researchBtn,
              (!researchTopic.trim() || researchLoading) && { opacity: 0.5 },
              pressed && { opacity: 0.8 },
            ]}
          >
            {researchLoading ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <Feather name="arrow-right" size={18} color={Colors.background} />
            )}
          </Pressable>
        </View>

        {researchVisible && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultLabel}>Research Brief</Text>
              <Pressable onPress={() => { setResearchVisible(false); setResearchText(null); }}>
                <Feather name="x" size={16} color={Colors.textMuted} />
              </Pressable>
            </View>
            {researchLoading && !researchText ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Searching multiple sources…</Text>
              </View>
            ) : (
              <Markdown style={mdStyles}>{researchText ?? ""}</Markdown>
            )}
          </View>
        )}
      </View>

      {/* --- SURPRISE --- */}
      <View style={styles.section}>
        <SectionHeader title="Surprise me" icon="shuffle" />
        <Pressable
          onPress={handleSurprise}
          style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Feather name="zap" size={18} color={Colors.background} />
          <Text style={styles.primaryBtnText}>Take me somewhere unexpected</Text>
        </Pressable>
      </View>

      {/* --- TOPICS --- */}
      <View style={styles.section}>
        <SectionHeader title="Explore a topic" icon="compass" />
        <View style={styles.topicsGrid}>
          {TOPICS.map(topic => (
            <Pressable
              key={topic.label}
              onPress={() => handleTopic(topic.label)}
              style={({ pressed }) => [styles.topicChip, pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] }]}
            >
              <Feather name={topic.icon} size={14} color={Colors.primary} />
              <Text style={styles.topicLabel}>{topic.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* --- DEEP DIVES --- */}
      <View style={styles.section}>
        <SectionHeader title="Deep dives" icon="layers" />
        {[
          { title: "The neuroscience of awe", subtitle: "Why certain experiences change us forever" },
          { title: "Frequencies & the body", subtitle: "What sound healing research actually shows" },
          { title: "The hard problem of consciousness", subtitle: "Why science struggles with subjective experience" },
          { title: "Bioelectricity & morphogenetics", subtitle: "Michael Levin's revolution in biology" },
        ].map((item, i) => (
          <Pressable
            key={i}
            onPress={() => router.push({ pathname: "/(tabs)", params: { prompt: `Tell me about ${item.title}. ${item.subtitle}.` } })}
            style={({ pressed }) => [styles.diveCard, pressed && { opacity: 0.8 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.diveTitle}>{item.title}</Text>
              <Text style={styles.diveSubtitle}>{item.subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={Colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  heading: { fontSize: 30, fontWeight: "700", color: Colors.text, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginBottom: 4 },
  subheading: { fontSize: 15, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginBottom: 20 },
  wisdomCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.15)",
    marginBottom: 28,
    alignItems: "center",
  },
  wisdomText: { fontSize: 15, color: Colors.text, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24, fontStyle: "italic", marginBottom: 10 },
  wisdomAuthor: { fontSize: 12, color: Colors.primary, fontFamily: "Inter_500Medium", textAlign: "center" },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: Colors.textMuted, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8 },
  featureDesc: { fontSize: 13, color: Colors.textDim, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 12 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "600", color: Colors.background, fontFamily: "Inter_600SemiBold" },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 12,
  },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  resultLabel: { fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  loadingText: { fontSize: 13, color: Colors.textDim, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  refreshBtnText: { fontSize: 12, color: Colors.primary, fontFamily: "Inter_500Medium" },
  moodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  moodLabel: { fontSize: 14, color: Colors.text, fontFamily: "Inter_500Medium" },
  moodHistoryRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" },
  moodHistoryLabel: { fontSize: 11, color: Colors.textDim, fontFamily: "Inter_400Regular" },
  moodDot: { backgroundColor: Colors.surfaceElevated, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  moodDotText: { fontSize: 10, color: Colors.textMuted, fontFamily: "Inter_500Medium" },
  arcBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.2)",
  },
  arcBtnText: { flex: 1, fontSize: 14, color: Colors.text, fontFamily: "Inter_500Medium" },
  arcInsightText: { fontSize: 14, color: Colors.text, lineHeight: 22, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  researchInputRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  researchInput: {
    flex: 1,
    height: 46,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: Colors.text,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  researchBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  topicsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topicLabel: { fontSize: 13, color: Colors.text, fontFamily: "Inter_500Medium" },
  diveCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    gap: 12,
  },
  diveTitle: { fontSize: 14, fontWeight: "600", color: Colors.text, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  diveSubtitle: { fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
