import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    icon: "message-circle" as const,
    iconColor: Colors.primary,
    title: "Meet Sirius",
    body: "Not a chatbot. A thinking partner. Ask anything, explore anything, untangle anything — in text or voice.",
  },
  {
    icon: "user" as const,
    iconColor: "#a78bfa",
    title: "It learns who you are",
    body: "The more you talk, the more Sirius understands you. Your interests, your patterns, your personality — built into a Memory Portrait over time.",
  },
  {
    icon: "sun" as const,
    iconColor: "#f59e0b",
    title: "Start every day with intention",
    body: "Daily wisdom to open your mind. A mood check-in so Sirius meets you where you are. Deep research on anything that matters to you.",
  },
  {
    icon: "trending-up" as const,
    iconColor: "#22c55e",
    title: "The partnership deepens",
    body: "Every conversation is saved. Every session makes Sirius sharper on you. This is the AI that grows as you grow.",
  },
];

const ONBOARDING_KEY = "onboarding_complete";

async function completeOnboarding() {
  await AsyncStorage.setItem(ONBOARDING_KEY, "1");
  router.replace("/(tabs)");
}

function Slide({
  item,
}: {
  item: (typeof SLIDES)[number];
}) {
  return (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.iconWrap, { borderColor: item.iconColor + "33" }]}>
        <Feather name={item.icon} size={40} color={item.iconColor} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const isLast = activeIndex === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      completeOnboarding();
    } else {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Skip — always visible, disappears on last slide */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        {!isLast ? (
          <Pressable
            onPress={completeOnboarding}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.5 }]}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <Slide item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* Bottom area: dots + button */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex
                  ? { backgroundColor: Colors.primary, width: 20 }
                  : { backgroundColor: Colors.border },
              ]}
            />
          ))}
        </View>

        {/* CTA button */}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.ctaText}>{isLast ? "Let's go" : "Next"}</Text>
          {!isLast && <Feather name="arrow-right" size={18} color={Colors.background} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    alignItems: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  skipBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  skipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.textMuted,
  },

  /* ── Slide ── */
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 24,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 1,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: Colors.text,
    textAlign: "center",
    lineHeight: 34,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 26,
  },

  /* ── Bottom ── */
  bottom: {
    paddingHorizontal: 28,
    gap: 24,
    paddingTop: 8,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    width: 6,
  },
  cta: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: Colors.background,
  },
});
