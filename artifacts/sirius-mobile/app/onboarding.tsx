import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

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

function Slide({ item }: { item: (typeof SLIDES)[number] }) {
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
  const { updateLocalProfile } = useApp();
  const [activeIndex, setActiveIndex] = useState(0);
  const [showNameInput, setShowNameInput] = useState(false);
  const [showAiConsent, setShowAiConsent] = useState(false);
  const [name, setName] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const consentAnim = useRef(new Animated.Value(0)).current;
  const flatRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const isLast = activeIndex === SLIDES.length - 1;

  const finishOnboarding = async (userName?: string) => {
    if (userName?.trim()) {
      await updateLocalProfile({ userName: userName.trim() });
    }
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(tabs)");
  };

  const handleNext = () => {
    if (isLast) {
      setShowNameInput(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start(() => inputRef.current?.focus());
    } else {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    }
  };

  const handleSkipOnboarding = () => {
    setShowNameInput(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  const handleNameContinue = () => {
    setShowAiConsent(true);
    Animated.timing(consentAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  const handleAgreeAndStart = () => {
    finishOnboarding(name);
  };

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        {!showNameInput && !isLast ? (
          <Pressable
            onPress={handleSkipOnboarding}
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
      {!showNameInput && !showAiConsent && (
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
      )}

      {/* Name input — fades in after last slide */}
      {showNameInput && !showAiConsent && (
        <Animated.View style={[styles.nameContainer, { opacity: fadeAnim }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.nameInner}
          >
            <View style={[styles.iconWrap, { borderColor: Colors.primary + "33" }]}>
              <Feather name="smile" size={40} color={Colors.primary} />
            </View>

            <Text style={styles.title}>What should Sirius{"\n"}call you?</Text>
            <Text style={styles.body}>
              You can always change this later in your settings.
            </Text>

            <TextInput
              ref={inputRef}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              autoCorrect={false}
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={handleNameContinue}
            />
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* AI Data Consent — required before entering app (Apple §5.1.1 / §5.1.2) */}
      {showAiConsent && (
        <Animated.View style={[styles.nameContainer, { opacity: consentAnim }]}>
          <View style={styles.nameInner}>
            <View style={[styles.iconWrap, { borderColor: "#a78bfa33" }]}>
              <Feather name="shield" size={40} color="#a78bfa" />
            </View>

            <Text style={styles.title}>Your data & privacy</Text>
            <Text style={[styles.consentSubtitle]}>
              Please read before continuing
            </Text>

            <View style={styles.consentBox}>
              <Text style={[styles.consentText, { fontWeight: "600", marginBottom: 10 }]}>
                Sirius shares the following data with third-party AI providers to generate responses:
              </Text>

              {[
                "Your conversation messages (text you type or speak)",
                "Any images or documents you attach to messages",
                "Mood check-in selections you make in the Explore tab",
              ].map((item, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 6 }}>
                  <Text style={[styles.consentText, { color: "#a78bfa", marginRight: 8 }]}>•</Text>
                  <Text style={[styles.consentText, { flex: 1 }]}>{item}</Text>
                </View>
              ))}

              <Text style={[styles.consentText, { marginTop: 12 }]}>
                This data is sent to:{"  "}
                <Text style={styles.consentBold}>Anthropic</Text> (Claude AI) and{"  "}
                <Text style={styles.consentBold}>OpenAI</Text>.
                It may be processed on their servers in the United States.
              </Text>

              <Text style={[styles.consentText, { marginTop: 12 }]}>
                This data is used solely to generate your AI responses. It is not used for advertising. Please do not share sensitive financial or medical information.
              </Text>

              <Text style={[styles.consentText, { marginTop: 12 }]}>
                By tapping <Text style={styles.consentBold}>I consent & continue</Text>, you give permission for this data to be shared as described in our{" "}
                <Text
                  style={styles.consentLink}
                  onPress={() => Linking.openURL("https://sirius-ai.live/privacy")}
                >
                  Privacy Policy
                </Text>
                {" "}and{" "}
                <Text
                  style={styles.consentLink}
                  onPress={() => Linking.openURL("https://sirius-ai.live/terms")}
                >
                  Terms of Use
                </Text>
                .
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Bottom controls — slides */}
      {!showNameInput && !showAiConsent ? (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          {!isLast && (
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
          )}

          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.ctaText}>
              {isLast ? "Let's go" : "Next"}
            </Text>
            {!isLast && (
              <Feather name="arrow-right" size={18} color={Colors.background} />
            )}
          </Pressable>
        </View>
      ) : showNameInput && !showAiConsent ? (
        <Animated.View
          style={[
            styles.bottom,
            { paddingBottom: insets.bottom + 24, opacity: fadeAnim },
          ]}
        >
          <Pressable
            onPress={handleNameContinue}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.ctaText}>
              {name.trim() ? "Continue" : "Skip for now"}
            </Text>
            <Feather name="arrow-right" size={18} color={Colors.background} />
          </Pressable>
          <Text style={styles.termsNote}>
            {"By continuing you agree to our "}
            <Text
              style={styles.termsLink}
              onPress={() => Linking.openURL("https://sirius-ai.live/terms")}
            >
              Terms of Service
            </Text>
            {" and "}
            <Text
              style={styles.termsLink}
              onPress={() => Linking.openURL("https://sirius-ai.live/privacy")}
            >
              Privacy Policy
            </Text>
            {"."}
          </Text>
        </Animated.View>
      ) : (
        <Animated.View
          style={[
            styles.bottom,
            { paddingBottom: insets.bottom + 24, opacity: consentAnim },
          ]}
        >
          <Pressable
            onPress={handleAgreeAndStart}
            style={({ pressed }) => [styles.ctaConsent, pressed && { opacity: 0.8 }]}
          >
            <Feather name="check" size={18} color={Colors.background} />
            <Text style={styles.ctaText}>I consent &amp; continue</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL("https://sirius-ai.live/privacy")}
            style={({ pressed }) => [styles.privacyBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.privacyBtnText}>Read full Privacy Policy</Text>
          </Pressable>
        </Animated.View>
      )}
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

  /* ── Name input ── */
  nameContainer: {
    flex: 1,
  },
  nameInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 24,
  },
  input: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 17,
    color: Colors.text,
    marginTop: 8,
  },

  /* ── AI Consent ── */
  consentSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 16,
    textAlign: "center",
  },
  consentBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.2)",
    padding: 20,
    width: "100%",
  },
  consentText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 24,
  },
  consentBold: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  consentLink: {
    color: Colors.primary,
    textDecorationLine: "underline",
  },

  /* ── Bottom ── */
  bottom: {
    paddingHorizontal: 28,
    gap: 16,
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
  ctaConsent: {
    backgroundColor: "#7c3aed",
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
  termsNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  termsLink: {
    color: Colors.primary,
    textDecorationLine: "underline",
  },
  privacyBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  privacyBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    textDecorationLine: "underline",
  },
});
