import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
  ActivityIndicator,
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
import { useSubscription } from "@/lib/revenuecat";

const PREMIUM_COLOR = "hsl(45,100%,52%)";

const PREMIUM_FEATURES = [
  "75 messages per day (free: 30)",
  "Star Lab — App Builder, Code Builder & R&D intelligence",
  "Dream Lab — build & track your dreams",
  "Learn — study plans, quizzes, deep learning",
  "Voice conversations",
  "Sirius remembers you between sessions",
  "Telegram — Sirius messages you proactively",
  "Priority response speed",
  "Early access to new features",
];

export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const subscription = useSubscription();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const isIOS = Platform.OS === "ios";

  const currentTier = profile.subscriptionTier;
  const isActive = currentTier !== "free";

  const handleUpgrade = async () => {
    if (isIOS) {
      const pkg = subscription.proPackage ?? subscription.plusPackage;
      if (pkg) {
        try {
          await subscription.purchase(pkg);
        } catch {
          // User cancelled — do nothing
        }
      } else {
        WebBrowser.openBrowserAsync("https://sirius-ai.live/pricing?source=app");
      }
    } else {
      WebBrowser.openBrowserAsync("https://sirius-ai.live/pricing?source=app");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        contentContainerStyle={[p.content, { paddingTop: topPad + 4, paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.push("/(tabs)" as any)} style={({ pressed }) => [p.backBtn, pressed && { opacity: 0.6 }]}>
          <Feather name="chevron-left" size={20} color={Colors.primary} />
          <Text style={p.backBtnText}>Back</Text>
        </Pressable>

        <Text style={p.heading}>Go Premium</Text>
        <Text style={p.subheading}>Everything Sirius has to offer. Cancel any time.</Text>

        {/* Free tier */}
        <View style={[p.planCard, p.freeCard]}>
          <View style={p.planHeader}>
            <View style={[p.planIconWrap, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
              <Feather name="message-square" size={20} color={Colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={p.planName}>Free</Text>
              <Text style={p.planTagline}>Always free · no card needed</Text>
            </View>
            <View>
              <Text style={p.planPrice}>£0</Text>
              <Text style={p.planPer}>/month</Text>
            </View>
          </View>
          <Text style={p.freeFeature}>30 messages per day · Chat, wellbeing & universe · Always free</Text>
          {currentTier === "free" && (
            <View style={p.currentBadge}><Text style={p.currentBadgeText}>Current plan</Text></View>
          )}
        </View>

        {/* Premium */}
        <View style={[p.planCard, p.featuredCard, { borderColor: PREMIUM_COLOR + "30" }]}>
          <View style={[p.popularBadge, { backgroundColor: PREMIUM_COLOR }]}>
            <Text style={p.popularBadgeText}>BEST VALUE</Text>
          </View>
          <View style={p.planHeader}>
            <View style={[p.planIconWrap, { backgroundColor: PREMIUM_COLOR + "18" }]}>
              <Feather name="award" size={20} color={PREMIUM_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[p.planName, { color: PREMIUM_COLOR }]}>Premium</Text>
              <Text style={p.planTagline}>Full access — everything Sirius can do</Text>
            </View>
            <View>
              <Text style={[p.planPrice, { color: PREMIUM_COLOR }]}>£19.99</Text>
              <Text style={p.planPer}>/month</Text>
            </View>
          </View>

          <View style={p.featureList}>
            {PREMIUM_FEATURES.map(f => (
              <View key={f} style={p.featureRow}>
                <Feather name="check" size={13} color={PREMIUM_COLOR} style={{ marginTop: 1 }} />
                <Text style={p.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {isActive ? (
            <View style={[p.ctaBtn, { backgroundColor: PREMIUM_COLOR + "20", borderWidth: 1, borderColor: PREMIUM_COLOR + "40" }]}>
              <Feather name="check-circle" size={15} color={PREMIUM_COLOR} />
              <Text style={[p.ctaText, { color: PREMIUM_COLOR }]}>Active plan</Text>
            </View>
          ) : isIOS && subscription.isLoading ? (
            <View style={[p.ctaBtn, { backgroundColor: PREMIUM_COLOR }]}>
              <ActivityIndicator color={Colors.background} size="small" />
            </View>
          ) : (
            <Pressable
              onPress={handleUpgrade}
              disabled={isIOS && subscription.isPurchasing}
              style={({ pressed }) => [p.ctaBtn, { backgroundColor: PREMIUM_COLOR }, pressed && { opacity: 0.85 }]}
            >
              {isIOS && subscription.isPurchasing
                ? <ActivityIndicator color={Colors.background} size="small" />
                : <Text style={p.ctaText}>
                    {isIOS && (subscription.proPackage ?? subscription.plusPackage)
                      ? `Go Premium — ${(subscription.proPackage ?? subscription.plusPackage)!.product.priceString}/mo`
                      : "Go Premium — £19.99/mo"}
                  </Text>
              }
            </Pressable>
          )}
        </View>

        {isIOS && isActive && (
          <Pressable onPress={() => subscription.restore()} style={p.restoreBtn}>
            <Text style={p.restoreBtnText}>Restore purchases</Text>
          </Pressable>
        )}

        {!isIOS && (
          <Text style={p.footerNote}>
            Tap to subscribe securely via sirius-ai.live
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const p = StyleSheet.create({
  content: { paddingHorizontal: 16 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 20 },
  backBtnText: { fontSize: 14, color: Colors.primary, fontFamily: "Inter_500Medium" },
  heading: { fontSize: 28, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 6 },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textDim, marginBottom: 24, lineHeight: 20 },

  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    marginBottom: 14,
  },
  freeCard: { borderColor: Colors.borderLight },
  featuredCard: { backgroundColor: "rgba(255,255,255,0.04)" },
  popularBadge: {
    position: "absolute",
    top: -11,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
  },
  popularBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.background, letterSpacing: 0.8 },

  planHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  planIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  planName: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
  planTagline: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textDim, marginTop: 2 },
  planPrice: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "right" },
  planPer: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textDim, textAlign: "right" },

  freeFeature: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textDim, lineHeight: 19, marginBottom: 12 },
  currentBadge: { alignSelf: "flex-start", backgroundColor: Colors.borderLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  currentBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textMuted },

  featureList: { marginBottom: 16, gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  featureText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text, lineHeight: 18 },

  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  ctaText: { color: Colors.background, fontSize: 14, fontFamily: "Inter_700Bold" },

  restoreBtn: { alignItems: "center", marginBottom: 16 },
  restoreBtnText: { fontSize: 13, color: Colors.textDim, fontFamily: "Inter_400Regular" },
  footerNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", lineHeight: 17 },
});
