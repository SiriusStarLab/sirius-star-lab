import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import React, { memo, useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
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
const IMAGE_WIDTH = SCREEN_WIDTH - 24 * 2 - 28 - 8;

// ── Save / share image helper ─────────────────────────────────────────────────
async function saveImageToDevice(uri: string): Promise<"saved" | "shared" | "error"> {
  try {
    let localUri = uri;

    // If it's a data: URI, write it to disk first
    if (uri.startsWith("data:")) {
      const match = uri.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) return "error";
      const ext = match[1].replace("image/", "");
      localUri = FileSystem.cacheDirectory + `sirius_img_${Date.now()}.${ext}`;
      await FileSystem.writeAsStringAsync(localUri, match[2], {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else if (uri.startsWith("http")) {
      // Download remote URL
      const ext = uri.split("?")[0].split(".").pop() ?? "jpg";
      const dest = FileSystem.cacheDirectory + `sirius_img_${Date.now()}.${ext}`;
      const dl = await FileSystem.downloadAsync(uri, dest);
      localUri = dl.uri;
    }

    // Try saving to camera roll
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === "granted") {
      await MediaLibrary.saveToLibraryAsync(localUri);
      return "saved";
    }

    // Fall back to share sheet
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri, { mimeType: "image/jpeg" });
      return "shared";
    }

    return "error";
  } catch {
    return "error";
  }
}

// ── Expandable image with save button ────────────────────────────────────────
function ExpandableImage({ uri, style }: { uri: string; style?: object }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const handleSave = useCallback(async () => {
    setSaving(true);
    const result = await saveImageToDevice(uri);
    setSaving(false);
    setSavedMsg(result === "saved" ? "Saved!" : result === "shared" ? "Shared!" : "Failed");
    setTimeout(() => setSavedMsg(""), 2000);
  }, [uri]);

  return (
    <>
      <TouchableOpacity activeOpacity={0.88} onPress={() => setExpanded(true)}>
        <Image source={{ uri }} style={[styles.fullWidthImage, style]} resizeMode="cover" />
        {/* Save button overlay */}
        <Pressable
          onPress={handleSave}
          style={styles.imageSaveBtn}
          hitSlop={8}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.imageSaveBtnText}>{savedMsg || "⬇ Save"}</Text>}
        </Pressable>
      </TouchableOpacity>

      <Modal visible={expanded} transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
        <Pressable style={styles.expandOverlay} onPress={() => setExpanded(false)}>
          <Image source={{ uri }} style={styles.expandedImage} resizeMode="contain" />
          <View style={styles.expandActions}>
            <Pressable onPress={handleSave} style={styles.expandSaveBtn} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.expandSaveBtnText}>{savedMsg || "Save to Camera Roll"}</Text>}
            </Pressable>
            <Text style={styles.expandDismiss}>Tap image to close</Text>
          </View>
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
  body:      { color: Colors.text, fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
  paragraph: { color: Colors.text, fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular", marginTop: 0, marginBottom: 6 },
  strong:    { color: Colors.text, fontFamily: "Inter_700Bold" },
  em:        { color: Colors.text, fontFamily: "Inter_400Regular", fontStyle: "italic" as const },
  heading1:  { color: Colors.text, fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 8, marginBottom: 6 },
  heading2:  { color: Colors.text, fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 8, marginBottom: 4 },
  heading3:  { color: Colors.text, fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 6, marginBottom: 4 },
  bullet_list:        { marginTop: 4, marginBottom: 4 },
  ordered_list:       { marginTop: 4, marginBottom: 4 },
  list_item:          { color: Colors.text, fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular", flexDirection: "row" as const, marginBottom: 2 },
  bullet_list_icon:   { color: Colors.primary, fontSize: 15, lineHeight: 22, marginRight: 6 },
  ordered_list_icon:  { color: Colors.primary, fontSize: 15, lineHeight: 22, fontFamily: "Inter_600SemiBold", marginRight: 6 },
  code_inline: { color: Colors.primary, backgroundColor: "rgba(0,212,255,0.1)", fontFamily: "Inter_400Regular", fontSize: 13, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  fence:      { backgroundColor: "transparent", padding: 0, margin: 0 },
  code_block: { backgroundColor: "transparent", padding: 0, margin: 0 },
  blockquote: { backgroundColor: "rgba(0,212,255,0.06)", borderLeftWidth: 3, borderLeftColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, marginVertical: 4 },
  hr:    { backgroundColor: Colors.border, height: 1, marginVertical: 10 },
  link:  { color: Colors.primary, textDecorationLine: "underline" as const },
  table: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, marginVertical: 6 },
  th:    { backgroundColor: Colors.surface, padding: 8, fontFamily: "Inter_600SemiBold", color: Colors.text, fontSize: 13 },
  td:    { padding: 8, color: Colors.text, fontSize: 13, fontFamily: "Inter_400Regular", borderTopWidth: 1, borderTopColor: Colors.border },
};

// ── Copy action bar (shown after long-press) ──────────────────────────────────
function CopyBar({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => { setCopied(false); onDismiss(); }, 1500);
  }, [text, onDismiss]);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      if (Platform.OS === "ios" || Platform.OS === "android") {
        const path = FileSystem.cacheDirectory + `sirius_msg_${Date.now()}.txt`;
        await FileSystem.writeAsStringAsync(path, text);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path, { mimeType: "text/plain", dialogTitle: "Share message" });
        }
      }
    } finally {
      setSharing(false);
      onDismiss();
    }
  }, [text, onDismiss]);

  return (
    <View style={styles.copyBar}>
      <Pressable onPress={handleCopy} style={styles.copyBarBtn}>
        <Text style={styles.copyBarBtnText}>{copied ? "✓ Copied!" : "Copy"}</Text>
      </Pressable>
      <View style={styles.copyBarDivider} />
      <Pressable onPress={handleShare} style={styles.copyBarBtn} disabled={sharing}>
        {sharing
          ? <ActivityIndicator size="small" color={Colors.primary} />
          : <Text style={styles.copyBarBtnText}>Share</Text>}
      </Pressable>
      <View style={styles.copyBarDivider} />
      <Pressable onPress={onDismiss} style={styles.copyBarBtn}>
        <Text style={[styles.copyBarBtnText, { color: Colors.textMuted }]}>Done</Text>
      </Pressable>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export const MessageBubble = memo(function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const rules = buildRules();
  const [showCopyBar, setShowCopyBar] = useState(false);

  // Strip markdown for plain-text copy
  const plainText = message.content
    .replace(/```[\s\S]*?```/g, "[code block]")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~#>]/g, "")
    .trim();

  return (
    <View>
      <View style={[styles.row, isUser ? styles.rowUser : styles.rowAI]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>S</Text>
          </View>
        )}
        <Pressable
          onLongPress={() => { if (plainText) setShowCopyBar(true); }}
          delayLongPress={400}
          style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}
        >
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

          {/* Generated images — URL array */}
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
            message.content ? <Markdown style={markdownStyles} rules={rules}>{message.content}</Markdown> : null
          )}
        </Pressable>
      </View>

      {/* Copy / Share bar */}
      {showCopyBar && (
        <CopyBar text={plainText} onDismiss={() => setShowCopyBar(false)} />
      )}
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

  // Images
  fullWidthImage: {
    width: IMAGE_WIDTH, height: IMAGE_WIDTH * 0.75,
    borderRadius: 12, marginBottom: 6, backgroundColor: "#0f1425",
  },
  uploadedImage: {
    width: IMAGE_WIDTH, height: IMAGE_WIDTH * 0.75,
    borderRadius: 12, marginBottom: 6, backgroundColor: "#0f1425",
  },
  inlineImagesContainer: { gap: 8, marginBottom: 8 },

  // Save button on image
  imageSaveBtn: {
    position: "absolute", bottom: 12, right: 8,
    backgroundColor: "rgba(0,0,0,0.62)",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  imageSaveBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Expand modal
  expandOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center", justifyContent: "center", padding: 16,
  },
  expandedImage:  { width: "100%", height: "75%", borderRadius: 12 },
  expandActions:  { alignItems: "center", marginTop: 20, gap: 12 },
  expandSaveBtn:  {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  expandSaveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  expandDismiss:  { color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "Inter_400Regular" },

  // Copy / Share bar
  copyBar: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 24,
    marginTop: 2,
    marginBottom: 4,
    overflow: "hidden",
  },
  copyBarBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  copyBarBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  copyBarDivider: { width: 1, backgroundColor: Colors.border },

  // Code block
  codeBlock: {
    backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    marginVertical: 6, overflow: "hidden",
  },
  codeHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  codeLabel:    { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted },
  copyBtn:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: "rgba(0,212,255,0.1)" },
  copyBtnText:  { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.primary },
  codeText: {
    color: Colors.primary, fontFamily: "Inter_400Regular",
    fontSize: 13, lineHeight: 20,
    paddingHorizontal: 14, paddingVertical: 12,
  },
});
