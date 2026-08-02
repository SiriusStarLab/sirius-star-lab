import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking } from "react-native";
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

const PLANS = [
  {
    id: "plus" as const,
    name: "Plus",
    price: "£9.99",
    color: "hsl(193,100%,45%)",
    icon: "zap" as const,
    tagline: "For daily users who want more",
    features: [
      "200 messages per day",
      "Dream Lab — build & track your dreams",
      "Learn — study plans, quizzes, deep learning",
      "Sirius remembers you between sessions",
      "Full memory & personalisation",
      "Priority response speed",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "£19.99",
    color: "hsl(45,100%,52%)",
    icon: "award" as const,
    tagline: "For power users — no limits",
    featured: true,
    features: [
      "Unlimited messages per day",
      "Everything in Plus",
      "Voice conversations",
      "Star Lab — App Builder, Code Builder & R&D intelligence",
      "Telegram — Sirius messages you proactively",
      "Early access to new features",
    ],
  },
];

export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const subscription = useSubscription();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const isIOS = Platform.OS === "ios";

  const currentTier = profile.subscriptionTier;
  const isActive = (tier: string) => currentTier === tier;

  const handleUpgrade = async (planId: "plus" | "pro") => {
    if (isIOS) {
      // iOS: use RevenueCat IAP only
      const pkg = planId === "plus" ? subscription.plusPackage : subscription.proPackage;
      if (!pkg) return;
      try {
        await subscription.purchase(pkg);
      } catch (err: any) {
        // User cancelled — do nothing. No bank transfer fallback.
      }
    } else {
      // Android/web: direct to the web app pricing page
      Linking.openURL("https://sirius-ai.live/pricing");
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

        <Text style={p.heading}>Choose your plan</Text>
        <Text style={p.subheading}>Start free — upgrade any time. Cancel whenever you like.</Text>

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

        {/* Plus & Pro */}
        {PLANS.map(plan => {
          const active = isActive(plan.id);
          const pkg = plan.id === "plus" ? subscription.plusPackage : subscription.proPackage;

          return (
            <View key={plan.id} style={[p.planCard, plan.featured && p.featuredCard, { borderColor: plan.color + "30" }]}>
              {plan.featured && (
                <View style={[p.popularBadge, { backgroundColor: plan.color }]}>
                  <Text style={p.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}
              <View style={p.planHeader}>
                <View style={[p.planIconWrap, { backgroundColor: plan.color + "18" }]}>
                  <Feather name={plan.icon} size={20} color={plan.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[p.planName, { color: plan.color }]}>{plan.name}</Text>
                  <Text style={p.planTagline}>{plan.tagline}</Text>
                </View>
                <View>
                  <Text style={[p.planPrice, { color: plan.color }]}>{plan.price}</Text>
                  <Text style={p.planPer}>/month</Text>
                </View>
              </View>

              <View style={p.featureList}>
                {plan.features.map(f => (
                  <View key={f} style={p.featureRow}>
                    <Feather name="check" size={13} color={plan.color} style={{ marginTop: 1 }} />
                    <Text style={p.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              {active ? (
                <View style={[p.ctaBtn, { backgroundColor: plan.color + "20", borderWidth: 1, borderColor: plan.color + "40" }]}>
                  <Feather name="check-circle" size={15} color={plan.color} />
                  <Text style={[p.ctaText, { color: plan.color }]}>Active plan</Text>
                </View>
              ) : isIOS && subscription.isLoading ? (
                <View style={[p.ctaBtn, { backgroundColor: plan.color }]}>
                  <ActivityIndicator color={Colors.background} size="small" />
                </View>
              ) : isIOS && !pkg ? (
                // Packages not yet loaded or unavailable — disabled state
                <View style={[p.ctaBtn, { backgroundColor: plan.color + "40" }]}>
                  <Text style={p.ctaText}>Loading…</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => handleUpgrade(plan.id)}
                  disabled={isIOS && subscription.isPurchasing}
                  style={({ pressed }) => [p.ctaBtn, { backgroundColor: plan.color }, pressed && { opacity: 0.85 }]}
                >
                  {isIOS && subscription.isPurchasing
                    ? <ActivityIndicator color={Colors.background} size="small" />
                    : <Text style={p.ctaText}>
                        {isIOS && pkg
                          ? `Get ${plan.name} — ${pkg.product.priceString}/mo`
                          : `Get ${plan.name} — ${plan.price}/mo`}
                      </Text>
                  }
                </Pressable>
              )}
            </View>
          );
        })}

        {isIOS && (subscription.isPlus || subscription.isPro) && (
          <Pressable onPress={() => subscription.restore()} style={p.restoreBtn}>
            <Text style={p.restoreBtnText}>Restore purchases</Text>
          </Pressable>
        )}

        {!isIOS && (
          <Text style={p.footerNote}>
            Tap a plan to subscribe securely via sirius-ai.live
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
