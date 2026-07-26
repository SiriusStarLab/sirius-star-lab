import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Step = { title: string; body: string };
type Section = {
  id: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  color: string;
  steps: Step[];
};

const SECTIONS: Section[] = [
  {
    id: "chat",
    icon: "message-square",
    title: "Getting Started with Chat",
    color: "#00a8c6",
    steps: [
      {
        title: "Start a conversation",
        body: "Type your question or thought into the input at the bottom of the screen and press the send button. Sirius responds in real time, streaming its reply as it thinks.",
      },
      {
        title: "Ask anything",
        body: "There are no rigid question formats. Chat naturally — ask follow-ups, challenge a response, request clarification, or switch topics completely. Sirius maintains context across the whole conversation.",
      },
      {
        title: "New conversation",
        body: "Tap the menu (☰) at the top left and select New Session to start a fresh thread. Your previous conversations are saved and accessible from Session History.",
      },
    ],
  },
  {
    id: "modes",
    icon: "cpu",
    title: "Intelligence Modes",
    color: "#8b5cf6",
    steps: [
      {
        title: "What are modes?",
        body: "Each mode changes how Sirius thinks and communicates. Guru is the default — authoritative, comprehensive, and best for deep expertise.",
      },
      {
        title: "Guru",
        body: "Authoritative and comprehensive. Best for deep expertise, thorough analysis, or when you need the most complete answer possible.",
      },
      {
        title: "Coach",
        body: "Actionable and motivating. Helps you clarify goals, break down plans, and stay accountable. Great for productivity, habits, and personal growth.",
      },
      {
        title: "Scientist",
        body: "Rigorous and evidence-based. Uses structured reasoning, cites known research, and examines problems with a critical, methodical mindset.",
      },
      {
        title: "Philosopher",
        body: "Reflective and exploratory. Questions assumptions, explores multiple perspectives, and digs into the 'why' behind things.",
      },
      {
        title: "Creative",
        body: "Imaginative and generative. Brainstorms ideas, writes in different styles, generates concepts, and approaches problems from unexpected angles.",
      },
      {
        title: "Friend",
        body: "Warm and conversational. Talks like a knowledgeable friend — honest, casual, supportive, and free of corporate formality.",
      },
    ],
  },
  {
    id: "voice",
    icon: "mic",
    title: "Voice Input",
    color: "#ec4899",
    steps: [
      {
        title: "How to use voice",
        body: "Tap the microphone icon in the chat input bar. Speak clearly — your words are transcribed in real time. When you stop speaking, the transcription is placed into the text field for you to review before sending.",
      },
      {
        title: "Microphone permission",
        body: "The first time you use voice, the app will ask for microphone permission. Allow it — Sirius only activates the microphone when you actively tap the button.",
      },
      {
        title: "Voice output",
        body: "Sirius can also read its responses aloud. Look for the speaker icon to hear a response read back to you. You can pause at any time.",
      },
    ],
  },
  {
    id: "images",
    icon: "image",
    title: "Image & Document Analysis",
    color: "#10b981",
    steps: [
      {
        title: "Upload an image",
        body: "Tap the + icon in the input bar to attach a file. Sirius will analyse the image and you can ask questions about it.",
      },
      {
        title: "What you can do",
        body: "Describe, summarise, or extract information from photos, screenshots, charts, diagrams, PDFs, and documents. Ask Sirius to explain a chart, read a label, or interpret a complex diagram.",
      },
      {
        title: "Supported formats",
        body: "JPEG, PNG, GIF, WEBP, and PDF files are all supported. Files are processed securely and not stored beyond the session.",
      },
    ],
  },
  {
    id: "memory",
    icon: "activity",
    title: "Memory Portrait",
    color: "#3b82f6",
    steps: [
      {
        title: "What is Memory Portrait?",
        body: "Memory Portrait is Sirius's evolving understanding of you. As you chat, Sirius picks up on your interests, goals, communication preferences, and context — and remembers them across sessions.",
      },
      {
        title: "How it works",
        body: "Sirius automatically builds a structured picture of what it has learned about you — topics you care about, your thinking style, and ongoing threads.",
      },
      {
        title: "Personalisation",
        body: "The more you chat, the more relevant Sirius becomes. Your memory shapes how Sirius tailors responses to you specifically.",
      },
    ],
  },
  {
    id: "daily",
    icon: "sun",
    title: "Daily Wisdom & Mood",
    color: "#f59e0b",
    steps: [
      {
        title: "Daily Wisdom",
        body: "Each day Sirius surfaces a fresh insight, quote, or reflection — chosen to provoke thinking or simply resonate with your current context.",
      },
      {
        title: "Mood Check-in",
        body: "A gentle daily prompt asks how you're feeling. Sirius uses your check-in to calibrate the tone and pace of conversations that day.",
      },
    ],
  },
  {
    id: "dreamlab",
    icon: "star",
    title: "Dream Lab",
    color: "#a78bfa",
    steps: [
      {
        title: "What is Dream Lab?",
        body: "Dream Lab is your space for manifestation, goal-setting, and vision work. Log your dreams and aspirations and let Sirius help you explore and build on them.",
      },
      {
        title: "How to use it",
        body: "Tap Dream Lab from the menu. Add a dream or goal, then tap 'Explore with Sirius' to open a dedicated conversation around it.",
      },
    ],
  },
  {
    id: "learn",
    icon: "book-open",
    title: "Learn",
    color: "#06b6d4",
    steps: [
      {
        title: "What is Learn?",
        body: "The Learn tab is your AI-assisted educational portal. Choose from Study Plan, Test Yourself, or Learn from Document modes.",
      },
      {
        title: "Learn from a document",
        body: "Tap the + icon in the Learn from Document panel to attach a PDF or text file. Sirius will read and analyse it — ask questions, request summaries, or get key insights.",
      },
    ],
  },
  {
    id: "plans",
    icon: "credit-card",
    title: "Plans & Subscriptions",
    color: "#00a8c6",
    steps: [
      {
        title: "Free plan",
        body: "The Free plan gives you 10 messages per day — a great way to explore what Sirius can do. No payment required to start.",
      },
      {
        title: "Sirius Plus — £9.99/month",
        body: "Unlimited messages, priority response times, and access to all features. Ideal for everyday use and regular creative or research work.",
      },
      {
        title: "Sirius Pro — £14.99/month",
        body: "Everything in Plus, plus enhanced memory, advanced file analysis, voice I/O, and early access to new features. Designed for power users and professionals.",
      },
      {
        title: "Changing or cancelling",
        body: "To cancel, simply stop your monthly bank transfer — no forms, no lock-in. Drop us an email at siriusailab@gmail.com and we'll confirm the cancellation.",
      },
    ],
  },
  {
    id: "starlab",
    icon: "zap",
    title: "Star Lab",
    color: "#6366f1",
    steps: [
      {
        title: "What is Star Lab?",
        body: "Star Lab is Sirius's private R&D environment — a PIN-protected workspace for advanced research, strategic analysis, and experimental tools.",
      },
      {
        title: "What's inside",
        body: "Star Lab includes: Bot Lab (custom AI bots), Scout (market opportunity research), AI Intelligence Feed, Funding Radar, Commerce Lab, project workspaces with AI-assisted briefs and specs, and the Outreach Hub for personalised email campaigns.",
      },
      {
        title: "Access",
        body: "Tap Star Lab in the menu and enter your PIN to access your private intelligence workspace.",
      },
    ],
  },
];

export default function GuideScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [expanded, setExpanded] = useState<string | null>("chat");
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(e => (e === id ? null : id));
    setExpandedStep(null);
  };

  const toggleStep = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedStep(s => (s === key ? null : key));
  };

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable
          onPress={() => router.push("/(tabs)" as any)}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Feather name="chevron-left" size={20} color={Colors.primary} />
          <Text style={styles.backBtnText}>Home</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.headerIcon, { backgroundColor: Colors.primary + "22" }]}>
            <Feather name="book-open" size={16} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Sirius Guide</Text>
            <Text style={styles.headerSub}>How everything works</Text>
          </View>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map(section => {
          const isOpen = expanded === section.id;
          return (
            <View
              key={section.id}
              style={[
                styles.card,
                {
                  borderColor: isOpen ? section.color + "40" : Colors.border,
                  backgroundColor: isOpen ? section.color + "08" : Colors.surface,
                },
              ]}
            >
              {/* Section header */}
              <Pressable
                onPress={() => toggle(section.id)}
                style={({ pressed }) => [styles.sectionRow, pressed && { opacity: 0.75 }]}
              >
                <View style={[styles.sectionIcon, { backgroundColor: section.color + "18" }]}>
                  <Feather name={section.icon} size={15} color={section.color} />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Feather
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={Colors.textMuted}
                />
              </Pressable>

              {/* Steps */}
              {isOpen &&
                section.steps.map((step, i) => {
                  const key = `${section.id}-${i}`;
                  const stepOpen = expandedStep === key;
                  return (
                    <View key={key} style={styles.stepCard}>
                      <Pressable
                        onPress={() => toggleStep(key)}
                        style={({ pressed }) => [styles.stepRow, pressed && { opacity: 0.75 }]}
                      >
                        <View style={[styles.stepNum, { backgroundColor: section.color + "18" }]}>
                          <Text style={[styles.stepNumText, { color: section.color }]}>{i + 1}</Text>
                        </View>
                        <Text style={styles.stepTitle}>{step.title}</Text>
                        <Feather
                          name="chevron-right"
                          size={14}
                          color={Colors.textDim}
                          style={{ transform: [{ rotate: stepOpen ? "90deg" : "0deg" }] }}
                        />
                      </Pressable>
                      {stepOpen && (
                        <Text style={styles.stepBody}>{step.body}</Text>
                      )}
                    </View>
                  );
                })}
            </View>
          );
        })}

        <Text style={styles.footer}>Sirius Star Lab · I think, so I am.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, width: 60 },
  backBtnText: { fontSize: 15, fontWeight: "600", color: Colors.primary, fontFamily: "Inter_600SemiBold" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 11, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  content: { padding: 16, gap: 10 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: "600", color: Colors.text, fontFamily: "Inter_600SemiBold" },
  stepCard: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stepNum: { width: 22, height: 22, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 11, fontWeight: "700" },
  stepTitle: { flex: 1, fontSize: 13, fontWeight: "500", color: Colors.text, fontFamily: "Inter_500Medium" },
  stepBody: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
    paddingHorizontal: 12,
    paddingBottom: 12,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: Colors.textDim,
    marginTop: 8,
    fontFamily: "Inter_400Regular",
  },
});
