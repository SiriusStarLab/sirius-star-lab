import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { Conversation, deleteConversation, fetchConversations, getUserId } from "@/lib/api";

function ConversationItem({
  item,
  onDelete,
}: {
  item: Conversation;
  onDelete: (id: number) => void;
}) {
  const date = new Date(item.createdAt);
  const formatted = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/(tabs)", params: { conversationId: String(item.id) } })
      }
      style={({ pressed }) => [
        styles.item,
        pressed && { opacity: 0.75 },
      ]}
    >
      <View style={styles.itemIcon}>
        <Feather name="message-circle" size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title || "Untitled conversation"}
        </Text>
        <Text style={styles.itemDate}>{formatted}</Text>
      </View>
      <Pressable
        onPress={() => onDelete(item.id)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
      >
        <Feather name="trash-2" size={16} color={Colors.textDim} />
      </Pressable>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: conversations = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const uid = await getUserId();
      return fetchConversations(uid);
    },
    staleTime: 30_000,
  });

  const handleDelete = useCallback(
    (id: number) => {
      Alert.alert("Delete Conversation", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteConversation(id);
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          },
        },
      ]);
    },
    [queryClient]
  );

  const sorted = [...conversations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.push("/(tabs)" as any)} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Feather name="chevron-left" size={20} color={Colors.primary} />
          <Text style={styles.backBtnText}>Home</Text>
        </Pressable>
        <Text style={styles.heading}>History</Text>
        <Pressable
          onPress={() => refetch()}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          {isRefetching ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Feather name="refresh-cw" size={18} color={Colors.textMuted} />
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="message-circle" size={48} color={Colors.textDim} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptyHint}>Start chatting to see your history</Text>
          <Pressable
            onPress={() => router.push("/(tabs)")}
            style={({ pressed }) => [styles.startBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.startBtnText}>Start a conversation</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ConversationItem item={item} onDelete={handleDelete} />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: bottomPad + 20,
            paddingTop: 8,
          }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onRefresh={refetch}
          refreshing={isRefetching}
          scrollEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backBtnText: { fontSize: 15, fontWeight: "600", color: Colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  heading: {
    fontSize: 30,
    fontWeight: "700",
    color: Colors.text,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textMuted,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyHint: {
    fontSize: 14,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 24,
  },
  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.background,
    fontFamily: "Inter_600SemiBold",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0,212,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 3,
  },
  itemDate: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
  },
  separator: { height: 8 },
});
