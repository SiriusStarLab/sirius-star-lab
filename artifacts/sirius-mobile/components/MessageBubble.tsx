import React, { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { Message } from "@/lib/api";

interface Props {
  message: Message;
}

export const MessageBubble = memo(function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAI]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>S</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        {message.imageB64 ? (
          <Image
            source={{ uri: `data:image/png;base64,${message.imageB64}` }}
            style={styles.generatedImage}
            resizeMode="contain"
          />
        ) : null}
        {message.content ? (
          <Text style={[styles.text, isUser ? styles.textUser : styles.textAI]}>
            {message.content}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: "flex-end",
    gap: 8,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowAI: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.background,
    fontFamily: "Inter_700Bold",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: Colors.userBubble,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(0,212,255,0.2)",
  },
  bubbleAI: {
    backgroundColor: Colors.aiBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  textUser: {
    color: Colors.text,
    fontFamily: "Inter_400Regular",
  },
  textAI: {
    color: Colors.text,
    fontFamily: "Inter_400Regular",
  },
  generatedImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 6,
  },
});
