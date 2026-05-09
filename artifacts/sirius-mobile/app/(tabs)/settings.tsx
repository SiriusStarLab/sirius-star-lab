import { Feather } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { generatePortrait, getApiBase } from "@/lib/api";

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
};
const TIER_COLORS: Record<string, string> = {
  free: Colors.textMuted,
  plus: "#f59e0b",
  pro: Colors.primary,
};

const WEB_URL = "https://sirius-ai.live";

function SettingRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
  danger,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && onPress && { opacity: 0.7 },
      ]}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.rowIcon, danger && { backgroundColor: "rgba(239,68,68,0.1)" }]}>
        <Feather name={icon} size={16} color={danger ? Colors.error : Colors.primary} />
      </View>
      <Text style={[styles.rowLabel, danger && { color: Colors.error }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {rightElement ?? (
        <>
          {value ? <Text style={styles.rowValue}>{value}</Text> : null}
          {onPress ? <Feather name="chevron-right" size={16} color={Colors.textDim} style={{ marginLeft: 6 }} /> : null}
        </>
      )}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, updateLocalProfile, refreshProfile, userId } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [editingName, setEditingName] = useState(false);
  const [editingAiName, setEditingAiName] = useState(false);
  const [nameValue, setNameValue] = useState(profile.userName);
  const [aiNameValue, setAiNameValue] = useState(profile.aiName);

  const [appleConnected, setAppleConnected] = useState<string | null>(null);
  const [appleLoading, setAppleLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("sirius_apple_user_id").then(v => setAppleConnected(v));
  }, []);

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      await AsyncStorage.setItem("sirius_apple_user_id", credential.user);
      if (credential.fullName?.givenName) {
        const name = [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(" ");
        await updateLocalProfile({ userName: name });
      }
      setAppleConnected(credential.user);
      Alert.alert("Signed in with Apple", "Your Apple ID is now linked to your Sirius account.");
    } catch (e: any) {
      if (e.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Sign-in failed", "Apple Sign-In could not be completed. Please try again.");
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleAppleSignOut = () => {
    Alert.alert("Unlink Apple ID", "This will unlink your Apple ID from Sirius. You can sign in again at any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unlink",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("sirius_apple_user_id");
          setAppleConnected(null);
        },
      },
    ]);
  };

  const [portrait, setPortrait] = useState<string | null>(null);
  const [portraitLoading, setPortraitLoading] = useState(false);
  const [portraitVisible, setPortraitVisible] = useState(false);

  const handleGeneratePortrait = async () => {
    if (!userId) return;
    setPortraitLoading(true);
    setPortraitVisible(true);
    setPortrait(null);
    try {
      const result = await generatePortrait(userId);
      setPortrait(result.portrait ?? result.message ?? null);
    } catch {
      setPortrait("Unable to generate your portrait right now.");
    }
    setPortraitLoading(false);
  };

  useEffect(() => {
    setNameValue(profile.userName);
    setAiNameValue(profile.aiName);
  }, [profile.userName, profile.aiName]);

  const saveName = async () => {
    await updateLocalProfile({ userName: nameValue.trim() || undefined });
    setEditingName(false);
  };

  const saveAiName = async () => {
    await updateLocalProfile({ aiName: aiNameValue.trim() || "Sirius" });
    setEditingAiName(false);
  };

  const [showPayment, setShowPayment] = useState(false);
  const [payTier, setPayTier] = useState<"plus" | "pro">("plus");
  const [payStep, setPayStep] = useState<"details" | "done">("details");
  const [payLoading, setPayLoading] = useState(false);
  const [payRef, setPayRef] = useState("");
  const [payName, setPayName] = useState("");
  const [payEmail, setPayEmail] = useState("");

  const BANK = { name: "GCTH Supplies Ltd", account: "26359434", sortCode: "04-03-33", bank: "Mettle" };
  const PRICES = { plus: "£5.00", pro: "£12.00" };

  const handleUpgrade = (tier: "plus" | "pro") => {
    setPayTier(tier);
    setPayStep("details");
    setPayRef("");
    setPayName("");
    setPayEmail("");
    setShowPayment(true);
  };

  const handlePayConfirm = async () => {
    setPayLoading(true);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}payment/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier: payTier, name: payName, email: payEmail }),
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

  const isPlus = profile.subscriptionTier === "plus";
  const isPro = profile.subscriptionTier === "pro";
  const isFree = profile.subscriptionTier === "free";

  const isIOS = Platform.OS === "ios";

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 8, paddingBottom: bottomPad + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Profile</Text>

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>
            {(profile.userName || "U")[0].toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.avatarName}>{profile.userName || "You"}</Text>
          <View style={[styles.tierBadge, { borderColor: TIER_COLORS[profile.subscriptionTier] }]}>
            <Text style={[styles.tierBadgeText, { color: TIER_COLORS[profile.subscriptionTier] }]}>
              {TIER_LABELS[profile.subscriptionTier]}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.usageBar}>
        <View style={styles.usageRow}>
          <Text style={styles.usageLabel}>Daily messages</Text>
          <Text style={styles.usageCount}>
            {profile.dailyMessageCount}{profile.dailyLimit !== null ? ` / ${profile.dailyLimit}` : ""}
          </Text>
        </View>
        {profile.dailyLimit !== null && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, (profile.dailyMessageCount / (profile.dailyLimit || 1)) * 100)}%`,
                  backgroundColor:
                    profile.dailyMessageCount >= (profile.dailyLimit || 0) * 0.9
                      ? Colors.error
                      : Colors.primary,
                },
              ]}
            />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <SectionHeader title="PERSONALISATION" />

        {editingName ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.editInput}
              value={nameValue}
              onChangeText={setNameValue}
              autoFocus
              selectionColor={Colors.primary}
              placeholder="Your name"
              placeholderTextColor={Colors.textDim}
            />
            <Pressable onPress={saveName} style={styles.editSave}>
              <Text style={styles.editSaveText}>Save</Text>
            </Pressable>
          </View>
        ) : (
          <SettingRow
            icon="user"
            label="Your name"
            value={profile.userName || "Not set"}
            onPress={() => setEditingName(true)}
          />
        )}

        {editingAiName ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.editInput}
              value={aiNameValue}
              onChangeText={setAiNameValue}
              autoFocus
              selectionColor={Colors.primary}
              placeholder="AI name"
              placeholderTextColor={Colors.textDim}
            />
            <Pressable onPress={saveAiName} style={styles.editSave}>
              <Text style={styles.editSaveText}>Save</Text>
            </Pressable>
          </View>
        ) : (
          <SettingRow
            icon="cpu"
            label="AI name"
            value={profile.aiName}
            onPress={() => setEditingAiName(true)}
          />
        )}
      </View>

      {/* Memory Portrait */}
      <View style={styles.card}>
        <SectionHeader title="YOUR PORTRAIT" />
        <View style={styles.portraitDesc}>
          <Text style={styles.portraitDescText}>
            After enough conversations, {profile.aiName} synthesises everything it knows about you into a personal portrait — who you are, what drives you, what lights you up.
          </Text>
        </View>
        {!portraitVisible ? (
          <Pressable
            onPress={handleGeneratePortrait}
            style={({ pressed }) => [styles.portraitBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="eye" size={16} color={Colors.primary} />
            <Text style={styles.portraitBtnText}>Generate my portrait</Text>
          </Pressable>
        ) : (
          <View style={styles.portraitResult}>
            {portraitLoading ? (
              <View style={styles.portraitLoading}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.portraitLoadingText}>Seeing you clearly…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.portraitText}>{portrait}</Text>
                <Pressable onPress={handleGeneratePortrait} style={styles.refreshRow}>
                  <Feather name="refresh-cw" size={12} color={Colors.primary} />
                  <Text style={styles.refreshText}>Regenerate</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>

      {/* Upgrade section — free users */}
      {isFree && !isIOS && (
        <View style={styles.upgradeSection}>
          <Text style={styles.upgradeHeading}>Get more from Sirius</Text>
          <Text style={styles.upgradeSubheading}>
            Pay by bank transfer — no card or account needed.
          </Text>

          <Pressable
            onPress={() => handleUpgrade("plus")}
            style={({ pressed }) => [styles.plusCard, { opacity: pressed ? 0.9 : 1 }]}
          >
            <View style={styles.plusCardInner}>
              <View style={styles.plusIconWrap}>
                <Feather name="zap" size={22} color={Colors.background} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.plusCardTitle}>Start Plus — £5/month</Text>
                <Text style={styles.plusCardDesc}>200 messages/day · Image analysis · Sirius remembers you</Text>
              </View>
              <Feather name="arrow-right" size={18} color={Colors.background} />
            </View>
            <Text style={styles.plusCardNote}>Bank transfer · Cancel any time</Text>
          </Pressable>

          <Pressable
            onPress={() => handleUpgrade("pro")}
            style={({ pressed }) => [styles.proCard, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Feather name="award" size={18} color="#f59e0b" />
            <View style={{ flex: 1 }}>
              <Text style={styles.proCardTitle}>Go Pro — £12/month</Text>
              <Text style={styles.proCardDesc}>Unlimited everything · Deep memory · Priority speed</Text>
            </View>
            <Feather name="chevron-right" size={16} color="rgba(245,158,11,0.5)" />
          </Pressable>
        </View>
      )}

      {/* Subscription info for paid users */}
      {(isPlus || isPro) && (
        <View style={styles.card}>
          <SectionHeader title="SUBSCRIPTION" />
          <SettingRow
            icon="check-circle"
            label={`Active: Sirius ${TIER_LABELS[profile.subscriptionTier]}`}
            value={isPro ? "Unlimited" : "200/day"}
          />
          {!isPro && (
            <SettingRow
              icon="arrow-up-circle"
              label="Upgrade to Pro"
              onPress={isIOS ? () => Linking.openURL(`${WEB_URL}/pricing`) : () => handleUpgrade("pro")}
            />
          )}
          <SettingRow
            icon="info"
            label={isIOS ? "Manage subscription at sirius-ai.live" : "To cancel, stop your bank transfer"}
            onPress={isIOS ? () => Linking.openURL(`${WEB_URL}/pricing`) : undefined}
            value=""
          />
        </View>
      )}


      <View style={styles.card}>
        <SectionHeader title="ACCOUNT" />
        <SettingRow
          icon="refresh-cw"
          label="Refresh subscription"
          onPress={() => refreshProfile()}
        />
        <SettingRow
          icon="shield"
          label="Privacy Policy"
          onPress={() => Linking.openURL(`${WEB_URL}/privacy`)}
        />
        <SettingRow
          icon="file-text"
          label="Terms of Service"
          onPress={() => Linking.openURL(`${WEB_URL}/terms`)}
        />
      </View>

      {/* Apple Sign-In — iOS only */}
      {isIOS && (
        <View style={styles.card}>
          <SectionHeader title="APPLE ID" />
          {appleConnected ? (
            <>
              <View style={styles.appleConnectedRow}>
                <Feather name="check-circle" size={16} color={Colors.primary} />
                <Text style={styles.appleConnectedText}>Signed in with Apple</Text>
              </View>
              <SettingRow
                icon="log-out"
                label="Unlink Apple ID"
                onPress={handleAppleSignOut}
                danger
              />
            </>
          ) : (
            <>
              <Text style={styles.appleDesc}>
                Link your Apple ID to your Sirius account for quick, secure sign-in.
              </Text>
              {appleLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
              ) : (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
                  cornerRadius={12}
                  style={styles.appleBtn}
                  onPress={handleAppleSignIn}
                />
              )}
            </>
          )}
        </View>
      )}

      <Text style={styles.versionText}>Sirius Star Lab · v1.0</Text>
    </ScrollView>

    {/* Bank transfer payment modal — Android/Web only, uses RN Modal for correct OS-level z-stacking */}
    {!isIOS && (
      <Modal
        visible={showPayment}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPayment(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: "rgba(8,12,26,0.92)",
          justifyContent: "flex-end",
        }}>
          <View style={{
            backgroundColor: "#0c1020",
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            borderTopWidth: 1, borderTopColor: "rgba(0,212,255,0.15)",
            maxHeight: "90%",
          }}>
          <ScrollView
            contentContainerStyle={{ padding: 24, paddingBottom: bottomPad + 24 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {payStep === "details" ? (
            <>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 4 }}>
                Pay by bank transfer
              </Text>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
                {payTier === "plus" ? "Sirius Plus · £5/month" : "Sirius Pro · £12/month"}
              </Text>

              {[
                ["Pay to", BANK.name],
                ["Bank", BANK.bank],
                ["Account number", BANK.account],
                ["Sort code", BANK.sortCode],
                ["Amount", PRICES[payTier]],
                ["Reference", `SIRIUS-${(userId ?? "GUEST").substring(0, 8).toUpperCase()}-${payTier.toUpperCase()}`],
              ].map(([label, value]) => (
                <View key={label} style={{
                  flexDirection: "row", justifyContent: "space-between",
                  paddingVertical: 8,
                  borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
                }}>
                  <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>{value}</Text>
                </View>
              ))}

              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 16, marginBottom: 12, lineHeight: 18 }}>
                Make the transfer in your banking app using the details above, then tap the button below. We'll upgrade your account within a few hours.
              </Text>

              <TextInput
                placeholder="Your name (optional)"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={payName}
                onChangeText={setPayName}
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRadius: 10, padding: 12,
                  color: "#fff", fontSize: 14, marginBottom: 8,
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
                }}
              />
              <TextInput
                placeholder="Email for confirmation (optional)"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={payEmail}
                onChangeText={setPayEmail}
                keyboardType="email-address"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRadius: 10, padding: 12,
                  color: "#fff", fontSize: 14, marginBottom: 16,
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
                }}
              />

              <Pressable
                onPress={handlePayConfirm}
                disabled={payLoading}
                style={({ pressed }) => ({
                  backgroundColor: payLoading ? "rgba(0,212,255,0.2)" : "#00d4ff",
                  borderRadius: 12, padding: 16,
                  alignItems: "center", marginBottom: 12,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                {payLoading
                  ? <ActivityIndicator color="#00d4ff" />
                  : <Text style={{ fontSize: 15, fontWeight: "700", color: "#080c1a" }}>I've made the transfer</Text>}
              </Pressable>
              <Pressable onPress={() => setShowPayment(false)} style={{ alignItems: "center", padding: 8 }}>
                <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>Cancel</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>🎉</Text>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff", textAlign: "center", marginBottom: 8 }}>
                You're upgraded!
              </Text>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 20, marginBottom: 20 }}>
                Your account is now active. Just complete the bank transfer and you're all set — no waiting needed.
              </Text>
              {!!payRef && (
                <View style={{
                  backgroundColor: "rgba(0,212,255,0.08)",
                  borderRadius: 10, padding: 12, marginBottom: 20,
                  borderWidth: 1, borderColor: "rgba(0,212,255,0.2)",
                  alignItems: "center",
                }}>
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>Your reference</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#00d4ff" }}>{payRef}</Text>
                </View>
              )}
              <Pressable
                onPress={() => setShowPayment(false)}
                style={{ backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, padding: 14, alignItems: "center" }}
              >
                <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Close</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
        </View>
        </View>
      </Modal>
    )}
    </View>
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
    marginBottom: 20,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.background,
    fontFamily: "Inter_700Bold",
  },
  avatarName: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  tierBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  usageBar: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  usageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  usageLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  usageCount: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textDim,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(0,212,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: "Inter_500Medium",
  },
  rowValue: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  editInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editSave: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  editSaveText: {
    color: Colors.background,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  upgradeSection: {
    marginBottom: 16,
  },
  upgradeHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  upgradeSubheading: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
    lineHeight: 18,
  },
  plusCard: {
    borderRadius: 16,
    backgroundColor: Colors.primary,
    padding: 18,
    marginBottom: 10,
  },
  plusCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  plusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  plusCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.background,
    fontFamily: "Inter_700Bold",
    marginBottom: 3,
  },
  plusCardDesc: {
    fontSize: 12,
    color: "rgba(8,12,26,0.7)",
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  plusCardNote: {
    fontSize: 11,
    color: "rgba(8,12,26,0.5)",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  proCard: {
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  proCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f59e0b",
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  proCardDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  versionText: {
    fontSize: 12,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    letterSpacing: 0.3,
  },
  portraitDesc: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  portraitDescText: {
    fontSize: 13,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    paddingTop: 12,
  },
  portraitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  portraitBtnText: {
    fontSize: 14,
    color: Colors.primary,
    fontFamily: "Inter_500Medium",
  },
  portraitResult: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  portraitLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  portraitLoadingText: {
    fontSize: 13,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  portraitText: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    fontStyle: "italic",
    marginBottom: 12,
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  refreshText: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: "Inter_500Medium",
  },
  appleDesc: {
    fontSize: 13,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  appleBtn: {
    height: 48,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  appleConnectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  appleConnectedText: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: "Inter_500Medium",
  },
});
