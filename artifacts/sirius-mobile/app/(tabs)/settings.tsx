import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { getApiBase } from "@/lib/api";

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

  const handleUpgrade = async (tier: "plus" | "pro") => {
    try {
      const base = getApiBase();
      const res = await fetch(`${base}stripe/links`);
      const { plusLink, proLink } = await res.json();
      const link = tier === "plus" ? plusLink : proLink;
      if (link) {
        await Linking.openURL(link);
      } else {
        Alert.alert("Not Available", "Payment links are not configured yet.");
      }
    } catch {
      Alert.alert("Error", "Could not load payment links.");
    }
  };

  const isPlus = profile.subscriptionTier === "plus";
  const isPro = profile.subscriptionTier === "pro";
  const isFree = profile.subscriptionTier === "free";

  const dailyUsageText =
    profile.dailyLimit === null
      ? `${profile.dailyMessageCount} messages today (unlimited)`
      : `${profile.dailyMessageCount} / ${profile.dailyLimit} messages today`;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: Colors.background }]}
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

      {isFree && (
        <View style={styles.card}>
          <SectionHeader title="UPGRADE" />
          <Pressable
            onPress={() => handleUpgrade("plus")}
            style={({ pressed }) => [styles.upgradeBtn, styles.plusBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View>
              <Text style={styles.upgradeBtnTitle}>Sirius Plus</Text>
              <Text style={styles.upgradeBtnDesc}>200 messages/day · £5/month</Text>
            </View>
            <Feather name="arrow-right" size={18} color="#f59e0b" />
          </Pressable>
          <Pressable
            onPress={() => handleUpgrade("pro")}
            style={({ pressed }) => [styles.upgradeBtn, styles.proBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View>
              <Text style={styles.upgradeBtnTitle}>Sirius Pro</Text>
              <Text style={styles.upgradeBtnDesc}>Unlimited · £12/month</Text>
            </View>
            <Feather name="arrow-right" size={18} color={Colors.primary} />
          </Pressable>
        </View>
      )}

      {(isPlus || isPro) && (
        <View style={styles.card}>
          <SectionHeader title="SUBSCRIPTION" />
          <SettingRow
            icon="check-circle"
            label={`Active: Sirius ${TIER_LABELS[profile.subscriptionTier]}`}
            value={isPro ? "Unlimited" : "200/day"}
          />
          {isFree || (
            <SettingRow
              icon="arrow-up-circle"
              label="Upgrade to Pro"
              onPress={() => handleUpgrade("pro")}
            />
          )}
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
          onPress={() => Alert.alert("Privacy Policy", "Available on the web app.")}
        />
        <SettingRow
          icon="file-text"
          label="Terms of Service"
          onPress={() => Alert.alert("Terms", "Available on the web app.")}
        />
      </View>

      <Text style={styles.userId}>ID: {userId?.slice(0, 20)}...</Text>
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
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  plusBtn: {},
  proBtn: {},
  upgradeBtnTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  upgradeBtnDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  userId: {
    fontSize: 11,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
  },
});
