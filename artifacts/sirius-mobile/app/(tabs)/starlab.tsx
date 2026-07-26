import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import Colors from "@/constants/colors";
import { getApiBase, getUserId } from "@/lib/api";
import { useApp } from "@/context/AppContext";

const ACCENT = "#6366f1";

interface LabProject {
  id: number;
  title: string;
  status: string;
  stage?: string;
}

export default function StarLabScreen() {
  const insets = useSafeAreaInsets();
  const { userId: ctxUserId } = useApp();
  const [projects, setProjects] = useState<LabProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const uid = ctxUserId || (await getUserId());
        const base = getApiBase();
        const res = await fetch(`${base}lab/projects`, {
          headers: { "x-lab-pin": "" },
        });
        if (res.ok) {
          const data = await res.json();
          setProjects((data.projects ?? data ?? []).slice(0, 8));
        }
      } catch {}
      setLoading(false);
    })();
  }, [ctxUserId]);

  const STATUS_COLOR: Record<string, string> = {
    "launch-ready": "#22c55e",
    "in-progress": Colors.primary,
    approved: "#f59e0b",
    pending: Colors.textMuted,
    completed: "#22c55e",
  };

  return (
    <View style={[s.root, { backgroundColor: Colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back to home */}
        <View style={{ paddingTop: insets.top + 8 }}>
          <Pressable
            onPress={() => router.push("/(tabs)" as any)}
            style={s.backBtn}
          >
            <Feather name="chevron-left" size={20} color={Colors.primary} />
            <Text style={s.backBtnText}>Home</Text>
          </Pressable>
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Feather name="zap" size={28} color="#fff" />
          </View>
          <Text style={s.heroTitle}>Star Lab</Text>
          <Text style={s.heroSub}>
            Your private R&D intelligence platform
          </Text>
        </View>

        {/* Launch full lab button */}
        <Pressable
          onPress={() => Linking.openURL("https://sirius-ai.live")}
          style={({ pressed }) => [s.launchBtn, pressed && { opacity: 0.85 }]}
        >
          <Feather name="external-link" size={16} color="#fff" />
          <Text style={s.launchBtnText}>Open Full Star Lab</Text>
        </Pressable>

        {/* Info cards */}
        <View style={s.infoRow}>
          {[
            { icon: "cpu" as const, label: "AI R&D", desc: "Autonomous opportunity scouting" },
            { icon: "file-text" as const, label: "Documents", desc: "Technical doc analysis" },
            { icon: "trending-up" as const, label: "Pipeline", desc: "Project build tracker" },
          ].map(item => (
            <View key={item.label} style={s.infoCard}>
              <Feather name={item.icon} size={20} color={ACCENT} />
              <Text style={s.infoCardLabel}>{item.label}</Text>
              <Text style={s.infoCardDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>

        {/* Recent projects */}
        <Text style={s.sectionLabel}>RECENT PROJECTS</Text>
        {loading ? (
          <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />
        ) : projects.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>No projects yet.</Text>
            <Text style={s.emptySubText}>
              Open the full Star Lab on desktop to create and manage your R&D projects.
            </Text>
          </View>
        ) : (
          <View style={s.projectList}>
            {projects.map(p => (
              <View key={p.id} style={s.projectRow}>
                <View
                  style={[
                    s.statusDot,
                    {
                      backgroundColor:
                        STATUS_COLOR[p.status] ?? Colors.textMuted,
                    },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.projectTitle} numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text style={s.projectStatus}>{p.status}</Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={Colors.textDim}
                />
              </View>
            ))}
          </View>
        )}

        <Pressable
          onPress={() => Linking.openURL("https://sirius-ai.live")}
          style={s.webLink}
        >
          <Text style={s.webLinkText}>
            Full project management, CAD tools, funding analysis and more — available at sirius-ai.live
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtnText: { fontSize: 15, fontWeight: "600", color: Colors.primary },
  hero: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 24 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
    fontFamily: "Inter_700Bold",
  },
  heroSub: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  launchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 15,
    justifyContent: "center",
  },
  launchBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  infoRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 28,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 6,
    alignItems: "center",
  },
  infoCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  infoCardDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 14,
    fontFamily: "Inter_400Regular",
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    color: Colors.textDim,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  empty: {
    alignItems: "center",
    paddingTop: 24,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  projectList: { paddingHorizontal: 16, gap: 2 },
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  projectTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  projectStatus: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    textTransform: "capitalize",
  },
  webLink: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  webLinkText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
});
