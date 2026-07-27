import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { getApiBase, USER_ID_KEY } from "@/lib/api";
import { useSubscription } from "@/lib/revenuecat";

const BANK = { name: "GCTH Supplies Ltd", account: "26359434", sortCode: "04-03-33", bank: "Mettle" };

const PLANS = [
  {
    id: "plus" as const,
    name: "Plus",
    price: "£9.99",
    color: "hsl(193,100%,45%)",
    icon: "zap" as const,
    tagline: "For daily users who want more",
    features: [
      "75 messages per day",
      "Dream Lab — build & track your dreams",
      "Sirius remembers you across sessions",
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
      "500 messages per day",
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
  const { userId, profile } = useApp();
  const subscription = useSubscription();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const isIOS = Platform.OS === "ios";

  const [showPayment, setShowPayment] = useState(false);
  const [payTier, setPayTier] = useState<"plus" | "pro">("plus");
  const [payStep, setPayStep] = useState<"details" | "done">("details");
  const [payLoading, setPayLoading] = useState(false);
  const [payRef, setPayRef] = useState("");
  const [payName, setPayName] = useState("");
  const [payEmail, setPayEmail] = useState("");

  const currentTier = profile.subscriptionTier;
  const isActive = (tier: string) => currentTier === tier;

  const openPayment = (tier: "plus" | "pro") => {
    setPayTier(tier);
    setPayStep("details");
    setPayRef("");
    setPayName("");
    setPayEmail("");
    setShowPayment(true);
  };

  const handleIAPPurchase = async (pkg: any) => {
    if (!pkg) return;
    try {
      await subscription.purchase(pkg);
    } catch (err: any) {
      if (!err?.userCancelled) {
        // Fall through to bank transfer
        openPayment(payTier);
      }
    }
  };

  const handleConfirm = async () => {
    setPayLoading(true);
    try {
      const base = getApiBase();
      const uid = userId || (await AsyncStorage.getItem(USER_ID_KEY)) || "";
      const res = await fetch(`${base}payment/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, tier: payTier, name: payName, email: payEmail }),
      });
      const data = await res.json();
      setPayRef(data.reference ?? "");
      setPayStep("done");
    } catch {
      setPayStep("done");
    } finally {
      setPayLoading(false);
    }
  };

  const prices = { plus: "£9.99", pro: "£19.99" };

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
          <Text style={p.freeFeature}>30 messages per day · Chat, Learn, Dream Lab · Always free</Text>
          {currentTier === "free" && (
            <View style={p.currentBadge}><Text style={p.currentBadgeText}>Current plan</Text></View>
          )}
        </View>

        {/* Plus & Pro */}
        {PLANS.map(plan => {
          const active = isActive(plan.id);
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
              ) : isIOS && (plan.id === "plus" ? subscription.plusPackage : subscription.proPackage) ? (
                <Pressable
                  onPress={() => handleIAPPurchase(plan.id === "plus" ? subscription.plusPackage : subscription.proPackage)}
                  disabled={subscription.isPurchasing}
                  style={({ pressed }) => [p.ctaBtn, { backgroundColor: plan.color }, pressed && { opacity: 0.85 }]}
                >
                  {subscription.isPurchasing
                    ? <ActivityIndicator color={Colors.background} size="small" />
                    : <Text style={p.ctaText}>
                        Get {plan.name} — {plan.id === "plus" ? subscription.plusPackage?.product.priceString : subscription.proPackage?.product.priceString}/mo
                      </Text>
                  }
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => openPayment(plan.id)}
                  style={({ pressed }) => [p.ctaBtn, { backgroundColor: plan.color }, pressed && { opacity: 0.85 }]}
                >
                  <Text style={p.ctaText}>Get {plan.name} — {plan.price}/mo</Text>
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

        <Text style={p.footerNote}>Pay securely by bank transfer · No card details stored · Cancel any time by stopping your transfer</Text>
      </ScrollView>

      {/* Bank transfer payment modal */}
      <Modal visible={showPayment} transparent animationType="slide" onRequestClose={() => setShowPayment(false)}>
        <View style={p.modalOverlay}>
          <View style={[p.modalSheet, { paddingBottom: bottomPad + 16 }]}>
            <View style={p.modalHandle} />
            <Pressable onPress={() => setShowPayment(false)} style={p.modalClose} hitSlop={12}>
              <Feather name="x" size={18} color={Colors.textDim} />
            </Pressable>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {payStep === "details" ? (
                <>
                  <Text style={p.modalTitle}>Pay by bank transfer</Text>
                  <Text style={p.modalSub}>{payTier === "plus" ? "Sirius Plus · £9.99/month" : "Sirius Pro · £19.99/month"}</Text>

                  <View style={p.bankBox}>
                    {[
                      ["Pay to", BANK.name],
                      ["Bank", BANK.bank],
                      ["Account number", BANK.account],
                      ["Sort code", BANK.sortCode],
                      ["Amount", prices[payTier]],
                      ["Reference", `SIRIUS-${(userId ?? "GUEST").substring(0, 8).toUpperCase()}-${payTier.toUpperCase()}`],
                    ].map(([label, value]) => (
                      <View key={label} style={p.bankRow}>
                        <Text style={p.bankLabel}>{label}</Text>
                        <Text style={p.bankValue}>{value}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={p.bankNote}>Make the transfer in your banking app using the details above, then tap the button below. We'll upgrade your account within a few hours.</Text>

                  <TextInput
                    placeholder="Your name (optional)"
                    placeholderTextColor={Colors.textDim}
                    value={payName}
                    onChangeText={setPayName}
                    style={p.modalInput}
                  />
                  <TextInput
                    placeholder="Email for confirmation (optional)"
                    placeholderTextColor={Colors.textDim}
                    value={payEmail}
                    onChangeText={setPayEmail}
                    keyboardType="email-address"
                    style={[p.modalInput, { marginBottom: 20 }]}
                  />

                  <Pressable
                    onPress={handleConfirm}
                    disabled={payLoading}
                    style={({ pressed }) => [p.confirmBtn, pressed && { opacity: 0.85 }, payLoading && { opacity: 0.6 }]}
                  >
                    {payLoading ? <ActivityIndicator color={Colors.background} /> : <Text style={p.confirmBtnText}>I've made the transfer</Text>}
                  </Pressable>
                </>
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <Text style={{ fontSize: 48, marginBottom: 16 }}>🎉</Text>
                  <Text style={p.modalTitle}>Transfer received!</Text>
                  <Text style={[p.modalSub, { textAlign: "center", lineHeight: 20 }]}>
                    Your account will be upgraded within a few hours once we confirm receipt.
                  </Text>
                  {payRef ? (
                    <View style={p.refBox}>
                      <Text style={p.refLabel}>Your reference</Text>
                      <Text style={p.refValue}>{payRef}</Text>
                    </View>
                  ) : null}
                  {payTier === "pro" && (
                    <Pressable
                      onPress={() => { setShowPayment(false); setTimeout(() => router.push("/(tabs)/starlab" as any), 300); }}
                      style={[p.confirmBtn, { marginTop: 20, backgroundColor: "#6366f1" }]}
                    >
                      <Text style={p.confirmBtnText}>Set up your Star Lab →</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => setShowPayment(false)} style={{ alignItems: "center", padding: 14 }}>
                    <Text style={{ color: Colors.textDim, fontSize: 14, fontFamily: "Inter_400Regular" }}>Done</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: "90%",
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight, alignSelf: "center", marginBottom: 16 },
  modalClose: { position: "absolute", top: 16, right: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 4 },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textDim, marginBottom: 20 },

  bankBox: {
    backgroundColor: Colors.primary + "08",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
    padding: 14,
    marginBottom: 14,
  },
  bankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bankLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textDim },
  bankValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  bankNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textDim, lineHeight: 18, marginBottom: 14 },

  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: Colors.text,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmBtnText: { color: Colors.background, fontSize: 15, fontFamily: "Inter_700Bold" },

  refBox: { backgroundColor: Colors.primary + "10", borderRadius: 10, borderWidth: 1, borderColor: Colors.primary + "25", padding: 14, marginTop: 12, alignItems: "center" },
  refLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textDim, marginBottom: 4 },
  refValue: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.primary },
});
