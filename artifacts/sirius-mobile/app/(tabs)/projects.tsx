import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { getApiBase } from "@/lib/api";

const LAB_PIN_KEY = "sirius_lab_pin";
const { width: SCREEN_W } = Dimensions.get("window");

// ─── Types ──────────────────────────────────────────────────────────────────
type Render = { url: string; label: string; type: string; angle?: string; generatedAt?: string };

interface Project {
  id: number;
  name: string;
  industry: string | null;
  phase: string;
  status: string | null;
  launchStatus: string | null;
  renders: string;
  costToBuild: string | null;
  updatedAt: string;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseRenders(raw: string): Render[] {
  try { return JSON.parse(raw || "[]"); } catch { return []; }
}

function phaseColor(phase: string): string {
  switch (phase) {
    case "complete":  return Colors.success;
    case "build":     return "#3b82f6";
    case "research":  return Colors.warning;
    case "idea":      return Colors.primary;
    default:          return Colors.textMuted;
  }
}

function phaseLabel(phase: string): string {
  switch (phase) {
    case "complete":  return "Complete";
    case "build":     return "Building";
    case "research":  return "Research";
    case "idea":      return "Idea";
    default:          return phase ?? "Draft";
  }
}

function launchBadge(s: string | null): { label: string; color: string } | null {
  if (s === "launched")    return { label: "Launched", color: Colors.success };
  if (s === "launch-ready") return { label: "Ready",   color: "#a78bfa" };
  return null;
}

// ─── Render Gallery ──────────────────────────────────────────────────────────
function RenderGallery({ renders }: { renders: Render[] }) {
  const [active, setActive] = useState(0);
  if (renders.length === 0) return null;

  return (
    <View>
      <Image
        source={{ uri: renders[active].url }}
        style={s.galleryMain}
        contentFit="cover"
        transition={200}
      />
      {renders.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.galleryStrip}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingVertical: 8 }}
        >
          {renders.map((r, i) => (
            <Pressable key={i} onPress={() => setActive(i)}>
              <Image
                source={{ uri: r.url }}
                style={[s.galleryThumb, i === active && s.galleryThumbActive]}
                contentFit="cover"
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
      <View style={s.galleryFooter}>
        <Text style={s.galleryLabel}>{renders[active].label}</Text>
        <Text style={s.galleryCount}>{active + 1} / {renders.length}</Text>
      </View>
    </View>
  );
}

// ─── Project Detail Modal ────────────────────────────────────────────────────
function ProjectDetailModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const renders = parseRenders(project.renders);
  const launch  = launchBadge(project.launchStatus);

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.detailRoot, { paddingTop: insets.top || 16 }]}>
        {/* Header */}
        <View style={s.detailHeader}>
          <Pressable onPress={onClose} style={s.closeBtn} hitSlop={12}>
            <Feather name="x" size={22} color={Colors.text} />
          </Pressable>
          <Text style={s.detailTitle} numberOfLines={2}>{project.name}</Text>
          <View style={s.chipRow}>
            <Chip label={phaseLabel(project.phase)} color={phaseColor(project.phase)} />
            {launch && <Chip label={launch.label} color={launch.color} />}
            {project.industry ? (
              <Chip label={project.industry.replace(/_/g, " ")} color={Colors.textMuted} dim />
            ) : null}
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Renders section */}
          {renders.length > 0 ? (
            <View style={{ marginBottom: 24 }}>
              <Text style={s.sectionLabel}>Product Renders</Text>
              <RenderGallery renders={renders} />
            </View>
          ) : (
            <View style={s.emptyRenders}>
              <Feather name="image" size={28} color={Colors.textDim} />
              <Text style={s.emptyRendersTitle}>No renders yet</Text>
              <Text style={s.emptyRendersHint}>
                Ask Sirius in Star Lab to complete this project — renders generate automatically
              </Text>
            </View>
          )}

          {/* Quick stats */}
          <View style={s.statsRow}>
            <StatBox value={String(renders.length)} label="Renders" />
            <StatBox value={project.phase === "complete" ? "✓" : "…"} label="Docs" />
            <StatBox
              value={project.launchStatus === "launched" ? "Live" : project.launchStatus === "launch-ready" ? "Ready" : "—"}
              label="Launch"
            />
          </View>

          {project.costToBuild ? (
            <View style={s.costBox}>
              <Feather name="dollar-sign" size={14} color={Colors.primary} style={{ marginTop: 1 }} />
              <Text style={s.costText} numberOfLines={4}>{project.costToBuild.slice(0, 400)}</Text>
            </View>
          ) : null}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Small components ────────────────────────────────────────────────────────
function Chip({ label, color, dim }: { label: string; color: string; dim?: boolean }) {
  return (
    <View style={[s.chip, { backgroundColor: color + (dim ? "18" : "22"), borderColor: color + (dim ? "33" : "55") }]}>
      <Text style={[s.chipText, { color: dim ? Colors.textMuted : color }]}>{label}</Text>
    </View>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Project Card ────────────────────────────────────────────────────────────
function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const renders = parseRenders(project.renders);
  const launch  = launchBadge(project.launchStatus);

  return (
    <Pressable style={({ pressed }) => [s.card, pressed && { opacity: 0.82 }]} onPress={onPress}>
      {renders.length > 0 ? (
        <Image source={{ uri: renders[0].url }} style={s.cardImage} contentFit="cover" />
      ) : (
        <View style={s.cardPlaceholder}>
          <Feather name="cpu" size={28} color={Colors.primary + "55"} />
        </View>
      )}
      <View style={s.cardBody}>
        <Text style={s.cardName} numberOfLines={2}>{project.name}</Text>
        <View style={s.chipRow}>
          <Chip label={phaseLabel(project.phase)} color={phaseColor(project.phase)} />
          {launch && <Chip label={launch.label} color={launch.color} />}
          {renders.length > 0 && (
            <View style={[s.chip, { backgroundColor: Colors.primary + "18", borderColor: Colors.primary + "44", flexDirection: "row", alignItems: "center", gap: 3 }]}>
              <Feather name="image" size={9} color={Colors.primary} />
              <Text style={[s.chipText, { color: Colors.primary }]}>{renders.length}</Text>
            </View>
          )}
        </View>
        {project.industry ? (
          <Text style={s.cardIndustry}>{project.industry.replace(/_/g, " ")}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ProjectsScreen() {
  const insets = useSafeAreaInsets();
  const topPad    = Platform.OS === "web" ? 67 : insets.top;

  const [projects,  setProjects]  = useState<Project[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected,  setSelected]  = useState<Project | null>(null);
  const [authError, setAuthError] = useState(false);

  const fetchProjects = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setAuthError(false);
    try {
      const base  = getApiBase();
      // Read the PIN that StarLab stores — same key used in starlab.tsx
      const pin   = await AsyncStorage.getItem(LAB_PIN_KEY);
      const headers: Record<string, string> = pin
        ? { "x-lab-pin": pin }
        : { "x-user-id": "garry" }; // fallback: owner device bypass

      const res = await fetch(`${base}lab/projects?limit=60`, { headers });
      if (res.status === 401 || res.status === 403) { setAuthError(true); }
      else if (res.ok) { setProjects(await res.json()); }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProjects(true);
  }, [fetchProjects]);

  const complete    = projects.filter(p => p.phase === "complete");
  const inProgress  = projects.filter(p => p.phase !== "complete");
  const withRenders = projects.filter(p => parseRenders(p.renders).length > 0);

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Star Lab</Text>
        <Text style={s.headerSub}>
          {projects.length} project{projects.length !== 1 ? "s" : ""}
          {withRenders.length > 0 ? ` · ${withRenders.length} with renders` : ""}
        </Text>
      </View>

      {loading ? (
        <View style={s.centred}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.centredText}>Loading projects…</Text>
        </View>
      ) : authError ? (
        <View style={s.centred}>
          <Feather name="lock" size={36} color={Colors.primary + "77"} />
          <Text style={s.centredTitle}>Sign in to Star Lab first</Text>
          <Text style={s.centredText}>Open the Star Lab tab and enter your PIN — then come back here.</Text>
        </View>
      ) : projects.length === 0 ? (
        <View style={s.centred}>
          <Feather name="cpu" size={40} color={Colors.primary + "55"} />
          <Text style={s.centredTitle}>No projects yet</Text>
          <Text style={s.centredText}>Ask Sirius in Star Lab to create and complete a project — renders appear here automatically.</Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={p => String(p.id)}
          renderItem={({ item }) => (
            <ProjectCard project={item} onPress={() => setSelected(item)} />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 100,
            paddingTop: 4,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListHeaderComponent={
            <View style={s.statsBar}>
              <StatBox value={String(complete.length)}   label="Complete" />
              <StatBox value={String(inProgress.length)} label="In Progress" />
              <StatBox value={String(withRenders.length)} label="Rendered" />
            </View>
          }
        />
      )}

      {selected && (
        <ProjectDetailModal project={selected} onClose={() => setSelected(null)} />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: Colors.background },
  header:            { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 4 },
  headerTitle:       { color: Colors.text,      fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub:         { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },

  centred:           { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 },
  centredTitle:      { color: Colors.text,      fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  centredText:       { color: Colors.textMuted, fontSize: 14, fontFamily: "Inter_400Regular",  textAlign: "center", lineHeight: 20 },

  statsBar:          { flexDirection: "row", gap: 10, marginBottom: 16 },
  statBox:           { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  statValue:         { color: Colors.text,      fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel:         { color: Colors.textMuted, fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  card:              { backgroundColor: Colors.surface, borderRadius: 16, marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  cardImage:         { width: "100%", height: 180 },
  cardPlaceholder:   { width: "100%", height: 130, backgroundColor: Colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  cardBody:          { padding: 14 },
  cardName:          { color: Colors.text,     fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22, marginBottom: 8 },
  cardIndustry:      { color: Colors.textDim,  fontSize: 12, fontFamily: "Inter_400Regular",  marginTop: 4, textTransform: "capitalize" },

  chipRow:           { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip:              { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  chipText:          { fontSize: 11, fontFamily: "Inter_500Medium" },

  detailRoot:        { flex: 1, backgroundColor: Colors.background },
  detailHeader:      { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 6 },
  detailTitle:       { color: Colors.text, fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 28 },
  closeBtn:          { alignSelf: "flex-end", padding: 4, marginBottom: 4 },

  sectionLabel:      { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 10, marginTop: 20 },

  galleryMain:       { width: "100%", height: SCREEN_W * 0.75, backgroundColor: Colors.surfaceElevated },
  galleryStrip:      {},
  galleryThumb:      { width: 64, height: 64, borderRadius: 8, backgroundColor: Colors.surfaceElevated },
  galleryThumbActive:{ borderWidth: 2, borderColor: Colors.primary },
  galleryFooter:     { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 8 },
  galleryLabel:      { color: Colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular" },
  galleryCount:      { color: Colors.textDim,   fontSize: 12, fontFamily: "Inter_400Regular" },

  emptyRenders:      { alignItems: "center", justifyContent: "center", backgroundColor: Colors.surfaceElevated, marginHorizontal: 20, borderRadius: 16, padding: 32, marginTop: 20, marginBottom: 8, gap: 8, borderWidth: 1, borderColor: Colors.border },
  emptyRendersTitle: { color: Colors.text,      fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyRendersHint:  { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },

  statsRow:          { flexDirection: "row", marginHorizontal: 20, marginVertical: 16, gap: 10 },
  costBox:           { flexDirection: "row", gap: 8, backgroundColor: Colors.surfaceElevated, borderRadius: 12, padding: 14, marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  costText:          { color: Colors.textMuted, fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
});
