import React, { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";

import Colors from "@/constants/colors";
import { Message } from "@/lib/api";

interface Props {
  message: Message;
}

const markdownStyles = {
  body: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  paragraph: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    marginTop: 0,
    marginBottom: 6,
  },
  strong: {
    color: Colors.text,
    fontFamily: "Inter_700Bold",
  },
  em: {
    color: Colors.text,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic" as const,
  },
  heading1: {
    color: Colors.text,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginTop: 8,
    marginBottom: 6,
  },
  heading2: {
    color: Colors.text,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginTop: 8,
    marginBottom: 4,
  },
  heading3: {
    color: Colors.text,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginTop: 6,
    marginBottom: 4,
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  ordered_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  list_item: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    flexDirection: "row" as const,
    marginBottom: 2,
  },
  bullet_list_icon: {
    color: Colors.primary,
    fontSize: 15,
    lineHeight: 22,
    marginRight: 6,
  },
  ordered_list_icon: {
    color: Colors.primary,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_600SemiBold",
    marginRight: 6,
  },
  code_inline: {
    color: Colors.primary,
    backgroundColor: "rgba(0,212,255,0.1)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  fence: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  code_block: {
    color: Colors.primary,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  blockquote: {
    backgroundColor: "rgba(0,212,255,0.06)",
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 4,
  },
  hr: {
    backgroundColor: Colors.border,
    height: 1,
    marginVertical: 10,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: "underline" as const,
  },
  table: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginVertical: 6,
  },
  th: {
    backgroundColor: Colors.surface,
    padding: 8,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    fontSize: 13,
  },
  td: {
    padding: 8,
    color: Colors.text,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
};

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
        {message.uploadedImageBase64 ? (
          <Image
            source={{ uri: message.uploadedImageBase64 }}
            style={styles.uploadedImage}
            resizeMode="cover"
          />
        ) : null}
        {message.imageB64 ? (
          <Image
            source={{ uri: `data:${message.imageMimeType ?? "image/jpeg"};base64,${message.imageB64}` }}
            style={styles.generatedImage}
            resizeMode="contain"
          />
        ) : null}
        {isUser ? (
          message.content ? <Text style={styles.userText}>{message.content}</Text> : null
        ) : (
          <Markdown style={markdownStyles}>{message.content}</Markdown>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 12,
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
    maxWidth: "80%",
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
  userText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
    fontFamily: "Inter_400Regular",
  },
  generatedImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 6,
  },
  uploadedImage: {
    width: 180,
    height: 180,
    borderRadius: 10,
    marginBottom: 6,
  },
});
