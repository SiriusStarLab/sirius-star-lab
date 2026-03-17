import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

const MOODS = [
  { label: "Curious", icon: "zap" as const, color: "#f59e0b" },
  { label: "Anxious", icon: "wind" as const, color: "#8b5cf6" },
  { label: "Inspired", icon: "star" as const, color: "#00d4ff" },
  { label: "Tired", icon: "moon" as const, color: "#6366f1" },
  { label: "Grateful", icon: "heart" as const, color: "#ec4899" },
  { label: "Focused", icon: "target" as const, color: "#22c55e" },
];

const SURPRISE_PROMPTS = [
  "What is the most mind-bending fact in physics right now?",
  "Tell me something beautiful that happened in science this week.",
  "What ancient wisdom is being confirmed by modern neuroscience?",
  "What's the most fascinating thing happening in space exploration?",
  "What would Stoic philosophers say about social media?",
  "How does sound actually affect the human nervous system?",
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
  { text: "The cosmos is within us. We are made of star-stuff.", author: "Carl Sagan" },
  { text: "Reality is merely an illusion, albeit a very persistent one.", author: "Albert Einstein" },
];

function getTodayWisdom() {
  const day = new Date().getDate();
  return WISDOM_QUOTES[day % WISDOM_QUOTES.length];
}

interface SectionHeaderProps {
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
}

function SectionHeader({ title, icon }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Feather name={icon} size={15} color={Colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const wisdom = getTodayWisdom();

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    router.push({ pathname: "/(tabs)/", params: { prompt: `I'm feeling ${mood.toLowerCase()} today. How can we explore that together?` } });
  };

  const handleSurprise = () => {
    const pick = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
    router.push({ pathname: "/(tabs)/", params: { prompt: pick } });
  };

  const handleTopic = (topic: string) => {
    router.push({ pathname: "/(tabs)/", params: { prompt: `Let's explore ${topic}. What's the most fascinating thing happening in this field right now?` } });
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: Colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 8, paddingBottom: bottomPad + 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Explore</Text>
      <Text style={styles.subheading}>What calls to you today?</Text>

      <View style={styles.wisdomCard}>
        <Feather name="sun" size={16} color={Colors.primary} style={{ marginBottom: 10 }} />
        <Text style={styles.wisdomText}>"{wisdom.text}"</Text>
        <Text style={styles.wisdomAuthor}>— {wisdom.author}</Text>
      </View>

      <View style={styles.section}>
        <SectionHeader title="How are you feeling?" icon="activity" />
        <View style={styles.moodGrid}>
          {MOODS.map(mood => (
            <Pressable
              key={mood.label}
              onPress={() => handleMoodSelect(mood.label)}
              style={({ pressed }) => [
                styles.moodChip,
                selectedMood === mood.label && { borderColor: mood.color },
                pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
              ]}
            >
              <Feather name={mood.icon} size={16} color={mood.color} />
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Surprise me" icon="shuffle" />
        <Pressable
          onPress={handleSurprise}
          style={({ pressed }) => [
            styles.surpriseBtn,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Feather name="zap" size={20} color={Colors.background} />
          <Text style={styles.surpriseBtnText}>Take me somewhere unexpected</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Explore a topic" icon="compass" />
        <View style={styles.topicsGrid}>
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
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Deep dives" icon="layers" />
        {[
          { title: "The neuroscience of awe", subtitle: "Why certain experiences change us forever" },
          { title: "Frequencies & the body", subtitle: "What sound healing research actually shows" },
          { title: "The hard problem of consciousness", subtitle: "Why science struggles with subjective experience" },
        ].map((item, i) => (
          <Pressable
            key={i}
            onPress={() => router.push({ pathname: "/(tabs)/", params: { prompt: `Tell me about ${item.title}. ${item.subtitle}.` } })}
            style={({ pressed }) => [
              styles.diveCard,
              pressed && { opacity: 0.8 },
            ]}
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
  heading: {
    fontSize: 30,
    fontWeight: "700",
    color: Colors.text,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 15,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  wisdomCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.15)",
    marginBottom: 28,
    alignItems: "center",
  },
  wisdomText: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
    fontStyle: "italic",
    marginBottom: 10,
  },
  wisdomAuthor: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  moodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  moodLabel: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: "Inter_500Medium",
  },
  surpriseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  surpriseBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.background,
    fontFamily: "Inter_600SemiBold",
  },
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
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
  topicLabel: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: "Inter_500Medium",
  },
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
  diveTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  diveSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
