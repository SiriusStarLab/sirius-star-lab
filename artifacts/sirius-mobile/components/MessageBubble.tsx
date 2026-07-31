import * as Clipboard from "expo-clipboard";
import React, { memo, useCallback, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";

import Colors from "@/constants/colors";
import { Message } from "@/lib/api";

interface Props {
  message: Message & { images?: string[] };
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const IMAGE_WIDTH = SCREEN_WIDTH - 24 * 2 - 28 - 8; // screen minus padding, avatar, gap

// ── Expandable image ─────────────────────────────────────────────────────────
function ExpandableImage({ uri, style }: { uri: string; style?: object }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <TouchableOpacity activeOpacity={0.88} onPress={() => setExpanded(true)}>
        <Image source={{ uri }} style={[styles.fullWidthImage, style]} resizeMode="cover" />
      </TouchableOpacity>
      <Modal visible={expanded} transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
        <Pressable style={styles.expandOverlay} onPress={() => setExpanded(false)}>
          <Image source={{ uri }} style={styles.expandedImage} resizeMode="contain" />
          <Text style={styles.expandDismiss}>Tap to close</Text>
        </Pressable>
      </Modal>
    </>
  );
}

// ── Custom code block with copy button ───────────────────────────────────────
function CodeBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLabel}>code</Text>
        <TouchableOpacity onPress={handleCopy} style={styles.copyBtn} hitSlop={10}>
          <Text style={[styles.copyBtnText, copied && { color: "#22c55e" }]}>
            {copied ? "✓ Copied" : "Copy"}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.codeText}>{content}</Text>
    </View>
  );
}

// ── Markdown rules ────────────────────────────────────────────────────────────
const buildRules = () => ({
  fence: (node: any) => <CodeBlock key={node.key} content={node.content.trimEnd()} />,
  code_block: (node: any) => <CodeBlock key={node.key} content={node.content.trimEnd()} />,
});

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
  strong: { color: Colors.text, fontFamily: "Inter_700Bold" },
  em: { color: Colors.text, fontFamily: "Inter_400Regular", fontStyle: "italic" as const },
  heading1: { color: Colors.text, fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 8, marginBottom: 6 },
  heading2: { color: Colors.text, fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 8, marginBottom: 4 },
  heading3: { color: Colors.text, fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 6, marginBottom: 4 },
  bullet_list: { marginTop: 4, marginBottom: 4 },
  ordered_list: { marginTop: 4, marginBottom: 4 },
  list_item: {
    color: Colors.text, fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular",
    flexDirection: "row" as const, marginBottom: 2,
  },
  bullet_list_icon: { color: Colors.primary, fontSize: 15, lineHeight: 22, marginRight: 6 },
  ordered_list_icon: { color: Colors.primary, fontSize: 15, lineHeight: 22, fontFamily: "Inter_600SemiBold", marginRight: 6 },
  code_inline: {
    color: Colors.primary, backgroundColor: "rgba(0,212,255,0.1)",
    fontFamily: "Inter_400Regular", fontSize: 13,
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
  },
  // fence/code_block handled by custom rules above
  fence: { backgroundColor: "transparent", padding: 0, margin: 0 },
  code_block: { backgroundColor: "transparent", padding: 0, margin: 0 },
  blockquote: {
    backgroundColor: "rgba(0,212,255,0.06)", borderLeftWidth: 3,
    borderLeftColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 4, marginVertical: 4,
  },
  hr: { backgroundColor: Colors.border, height: 1, marginVertical: 10 },
  link: { color: Colors.primary, textDecorationLine: "underline" as const },
  table: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, marginVertical: 6 },
  th: { backgroundColor: Colors.surface, padding: 8, fontFamily: "Inter_600SemiBold", color: Colors.text, fontSize: 13 },
  td: { padding: 8, color: Colors.text, fontSize: 13, fontFamily: "Inter_400Regular", borderTopWidth: 1, borderTopColor: Colors.border },
};

// ── Main component ────────────────────────────────────────────────────────────
export const MessageBubble = memo(function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const rules = buildRules();

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAI]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>S</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        {/* Uploaded image (user sent) */}
        {message.uploadedImageBase64 ? (
          <ExpandableImage uri={message.uploadedImageBase64} style={styles.uploadedImage} />
        ) : null}

        {/* Generated image — single base64 */}
        {message.imageB64 ? (
          <ExpandableImage
            uri={`data:${message.imageMimeType ?? "image/jpeg"};base64,${message.imageB64}`}
            style={styles.fullWidthImage}
          />
        ) : null}

        {/* Generated images — URL array (lab renders) */}
        {message.images && message.images.length > 0 ? (
          <View style={styles.inlineImagesContainer}>
            {message.images.map((url, i) => (
              <ExpandableImage key={i} uri={url} />
            ))}
          </View>
        ) : null}

        {/* Message text */}
        {isUser ? (
          message.content ? <Text style={styles.userText}>{message.content}</Text> : null
        ) : (
          <Markdown style={markdownStyles} rules={rules}>{message.content}</Markdown>
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
  rowUser: { justifyContent: "flex-end" },
  rowAI:   { justifyContent: "flex-start" },

  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    marginBottom: 2, flexShrink: 0,
  },
  avatarText: { fontSize: 12, fontWeight: "700", color: Colors.background, fontFamily: "Inter_700Bold" },

  bubble: { maxWidth: "85%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: {
    backgroundColor: Colors.userBubble, borderBottomRightRadius: 4,
    borderWidth: 1, borderColor: "rgba(0,212,255,0.2)",
  },
  bubbleAI: {
    backgroundColor: Colors.aiBubble, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.border,
  },

  userText: { fontSize: 15, lineHeight: 22, color: Colors.text, fontFamily: "Inter_400Regular" },

  // Full-width images
  fullWidthImage: {
    width: IMAGE_WIDTH,
    height: IMAGE_WIDTH * 0.75, // 4:3 default — scales naturally
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#0f1425",
  },
  uploadedImage: {
    width: IMAGE_WIDTH,
    height: IMAGE_WIDTH * 0.75,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#0f1425",
  },
  inlineImagesContainer: { gap: 8, marginBottom: 8 },

  // Expand modal
  expandOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center", justifyContent: "center",
    padding: 16,
  },
  expandedImage: { width: "100%", height: "85%", borderRadius: 12 },
  expandDismiss: { color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 16, fontFamily: "Inter_400Regular" },

  // Code block
  codeBlock: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 6,
    overflow: "hidden",
  },
  codeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  codeLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  copyBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: "rgba(0,212,255,0.1)" },
  copyBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  codeText: {
    color: Colors.primary, fontFamily: "Inter_400Regular",
    fontSize: 13, lineHeight: 20,
    paddingHorizontal: 14, paddingVertical: 12,
  },
});
