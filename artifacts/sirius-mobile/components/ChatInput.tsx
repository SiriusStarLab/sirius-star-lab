import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { getApiBase } from "@/lib/api";

// ── Attachment type — exported so callers can type their onSend handler ────────
export interface ChatAttachment {
  type: "image" | "document";
  base64: string;      // pure base64, no data: prefix
  name: string;
  mime: string;
  preview?: string;    // data: URI — set for images so they can be displayed
}

const MAX_ATTACHMENTS = 5;

// Document MIME types Sirius accepts — matches Gemini's document capabilities
const DOCUMENT_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/xml",
  "application/json",
  "application/rtf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Code files (picked via "any" type fallback on iOS)
  "text/javascript",
  "text/typescript",
  "text/x-python",
  "text/x-java-source",
];

// Friendly label for the file icon
function docIcon(mime: string): "file-text" | "table" | "code" | "file" {
  if (mime.includes("pdf") || mime.includes("word") || mime.includes("text")) return "file-text";
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return "table";
  if (mime.includes("json") || mime.includes("javascript") || mime.includes("python")) return "code";
  return "file";
}

interface Props {
  onSend: (text: string, attachments: ChatAttachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
  voiceMode?: boolean;
  onToggleVoice?: () => void;
}

type VoiceState = "idle" | "recording" | "transcribing";

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Message Sirius…",
  voiceMode = true,
  onToggleVoice,
}: Props) {
  const [text, setText] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const remaining = MAX_ATTACHMENTS - attachments.length;

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    if (disabled) return;
    const snapshot = [...attachments];
    setText("");
    setAttachments([]);
    onSend(trimmed, snapshot);
    inputRef.current?.focus();
  };

  // ── Pick multiple photos from library ─────────────────────────────────────
  const pickFromLibrary = async () => {
    setShowAttachMenu(false);
    if (disabled || remaining <= 0) return;
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission needed", "Please allow photo library access in Settings.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const newOnes: ChatAttachment[] = result.assets
          .filter(a => a.base64)
          .slice(0, remaining)
          .map(a => ({
            type: "image" as const,
            base64: a.base64!,
            name: a.fileName ?? "image.jpg",
            mime: a.mimeType ?? "image/jpeg",
            preview: `data:${a.mimeType ?? "image/jpeg"};base64,${a.base64}`,
          }));
        setAttachments(prev => [...prev, ...newOnes].slice(0, MAX_ATTACHMENTS));
      }
    } catch (err) {
      console.error("Image picker failed", err);
    }
  };

  // ── Take a photo ──────────────────────────────────────────────────────────
  const takePhoto = async () => {
    setShowAttachMenu(false);
    if (disabled || remaining <= 0) return;
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission needed", "Please allow camera access in Settings.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        const a = result.assets[0];
        const newPhoto: ChatAttachment = {
          type: "image",
          base64: a.base64!,
          name: a.fileName ?? "photo.jpg",
          mime: a.mimeType ?? "image/jpeg",
          preview: `data:${a.mimeType ?? "image/jpeg"};base64,${a.base64}`,
        };
        setAttachments(prev => [...prev, newPhoto].slice(0, MAX_ATTACHMENTS));
      }
    } catch (err) {
      console.error("Camera failed", err);
    }
  };

  // ── Pick multiple documents ───────────────────────────────────────────────
  const pickDocument = async () => {
    setShowAttachMenu(false);
    if (disabled || remaining <= 0) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: DOCUMENT_TYPES,
        copyToCacheDirectory: true,
        multiple: remaining > 1,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const newOnes: ChatAttachment[] = [];
      for (const asset of result.assets.slice(0, remaining)) {
        if (!asset.uri) continue;
        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          newOnes.push({
            type: "document",
            base64,
            name: asset.name ?? "document",
            mime: asset.mimeType ?? "application/octet-stream",
          });
        } catch (e) {
          console.error("Failed to read file:", asset.name, e);
          Alert.alert("Could not read file", `${asset.name ?? "File"} could not be read. Try a different format.`);
        }
      }
      if (newOnes.length > 0) {
        setAttachments(prev => [...prev, ...newOnes].slice(0, MAX_ATTACHMENTS));
      }
    } catch (err) {
      console.error("Document picker failed", err);
    }
  };

  // ── Voice recording ───────────────────────────────────────────────────────
  const startRecording = async () => {
    if (disabled) return;
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Microphone Access Needed",
          "Please enable microphone access for Sirius in your device Settings.",
          [{ text: "OK" }]
        );
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setVoiceState("recording");
    } catch (err) {
      console.error("Failed to start recording", err);
      setVoiceState("idle");
    }
  };

  const stopAndTranscribe = async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    setVoiceState("transcribing");
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      if (!uri) { setVoiceState("idle"); return; }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const base = getApiBase();
      const resp = await fetch(`${base}openai/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: base64, mimeType: "audio/m4a" }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const transcript: string = data.text || "";
        if (transcript.trim()) {
          const snapshot = [...attachments];
          setAttachments([]);
          onSend(transcript.trim(), snapshot);
        } else {
          Alert.alert("Nothing heard", "No speech was detected. Please try again.");
        }
      } else {
        Alert.alert("Transcription failed", "Could not process your voice. Please try again.");
      }
    } catch (err) {
      console.error("Transcription failed", err);
      Alert.alert("Mic error", "Something went wrong. Please try again.");
    } finally {
      setVoiceState("idle");
    }
  };

  const handleMicPress = () => {
    if (voiceState === "idle") startRecording();
    else if (voiceState === "recording") stopAndTranscribe();
  };

  const isVoiceBusy = voiceState !== "idle";
  const hasAttachment = attachments.length > 0;
  const showSend = (text.trim().length > 0 || hasAttachment) && !isVoiceBusy;
  const isFull = attachments.length >= MAX_ATTACHMENTS;

  return (
    <View style={styles.wrapper}>
      {/* Attach menu modal */}
      <Modal
        visible={showAttachMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAttachMenu(false)}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuBubble} onStartShouldSetResponder={() => true}>

                <Pressable
                  onPress={takePhoto}
                  disabled={isFull}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed, isFull && styles.menuItemDisabled]}
                >
                  <View style={styles.menuIcon}>
                    <Feather name="camera" size={20} color={isFull ? Colors.textDim : Colors.primary} />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={[styles.menuLabel, isFull && { color: Colors.textDim }]}>Take Photo</Text>
                    <Text style={styles.menuSub}>Open camera</Text>
                  </View>
                </Pressable>

                <View style={styles.menuDivider} />

                <Pressable
                  onPress={pickFromLibrary}
                  disabled={isFull}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed, isFull && styles.menuItemDisabled]}
                >
                  <View style={styles.menuIcon}>
                    <Feather name="image" size={20} color={isFull ? Colors.textDim : Colors.primary} />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={[styles.menuLabel, isFull && { color: Colors.textDim }]}>Choose Photos</Text>
                    <Text style={styles.menuSub}>
                      {isFull ? "Maximum 5 files attached" : `Pick up to ${remaining} photo${remaining !== 1 ? "s" : ""}`}
                    </Text>
                  </View>
                  {!isFull && remaining < MAX_ATTACHMENTS && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{attachments.length}/{MAX_ATTACHMENTS}</Text>
                    </View>
                  )}
                </Pressable>

                <View style={styles.menuDivider} />

                <Pressable
                  onPress={pickDocument}
                  disabled={isFull}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed, isFull && styles.menuItemDisabled]}
                >
                  <View style={styles.menuIcon}>
                    <Feather name="file-text" size={20} color={isFull ? Colors.textDim : Colors.primary} />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={[styles.menuLabel, isFull && { color: Colors.textDim }]}>Attach Files</Text>
                    <Text style={styles.menuSub}>
                      {isFull ? "Maximum 5 files attached" : `PDF, Word, Excel, CSV, code — up to ${remaining}`}
                    </Text>
                  </View>
                </Pressable>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <View style={styles.container}>
        {/* Attachment preview strip */}
        {hasAttachment && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.previewStrip}
            contentContainerStyle={styles.previewStripContent}
          >
            {attachments.map((att, idx) => (
              <View key={idx} style={att.type === "image" ? styles.imgChip : styles.docChip}>
                {att.type === "image" && att.preview ? (
                  <>
                    <Image source={{ uri: att.preview }} style={styles.imgThumb} />
                    <Pressable onPress={() => removeAttachment(idx)} style={styles.chipRemove} hitSlop={6}>
                      <Feather name="x" size={10} color="#fff" />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Feather name={docIcon(att.mime)} size={14} color={Colors.primary} />
                    <Text style={styles.docChipName} numberOfLines={1}>{att.name}</Text>
                    <Pressable onPress={() => removeAttachment(idx)} style={styles.docChipRemove} hitSlop={6}>
                      <Feather name="x" size={12} color={Colors.textDim} />
                    </Pressable>
                  </>
                )}
              </View>
            ))}
            {!isFull && (
              <Pressable onPress={() => setShowAttachMenu(true)} style={styles.addMoreChip}>
                <Feather name="plus" size={14} color={Colors.primary} />
                <Text style={styles.addMoreText}>{remaining} more</Text>
              </Pressable>
            )}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          {/* + Attach button */}
          {!isVoiceBusy && (
            <Pressable
              onPress={() => setShowAttachMenu(true)}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.plusBtn,
                (showAttachMenu || hasAttachment) && styles.plusBtnActive,
                pressed && { opacity: 0.7 },
              ]}
              testID="attach-button"
            >
              {hasAttachment && !isFull ? (
                <View style={styles.attachCountBadge}>
                  <Text style={styles.attachCountText}>{attachments.length}</Text>
                </View>
              ) : (
                <Feather
                  name={isFull ? "paperclip" : "plus"}
                  size={18}
                  color={(showAttachMenu || hasAttachment) ? Colors.primary : Colors.textDim}
                />
              )}
            </Pressable>
          )}

          {isVoiceBusy ? (
            <View style={styles.voiceStatus}>
              {voiceState === "recording" ? (
                <>
                  <View style={styles.recordingDot} />
                  <Text style={styles.voiceStatusText}>Listening…</Text>
                </>
              ) : (
                <>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.voiceStatusText}>Transcribing…</Text>
                </>
              )}
            </View>
          ) : (
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={Colors.textDim}
              multiline
              maxLength={4000}
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              selectionColor={Colors.primary}
            />
          )}

          {onToggleVoice && !isVoiceBusy && (
            <Pressable
              onPress={onToggleVoice}
              style={({ pressed }) => [
                styles.actionBtn,
                voiceMode ? styles.speakerBtnActive : styles.speakerBtnIdle,
                pressed && { opacity: 0.75 },
              ]}
              testID="speaker-button"
            >
              <Feather
                name={voiceMode ? "volume-2" : "volume-x"}
                size={18}
                color={voiceMode ? Colors.primary : Colors.textDim}
              />
            </Pressable>
          )}

          {showSend ? (
            <Pressable
              onPress={handleSend}
              disabled={disabled}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.sendBtnActive,
                pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
              ]}
              testID="send-button"
            >
              {disabled ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Feather name="send" size={18} color={Colors.background} />
              )}
            </Pressable>
          ) : (
            <Pressable
              onPress={handleMicPress}
              disabled={disabled && voiceState === "idle"}
              style={({ pressed }) => [
                styles.actionBtn,
                voiceState === "recording" ? styles.micBtnRecording : styles.micBtnIdle,
                pressed && voiceState === "idle" && { opacity: 0.8, transform: [{ scale: 0.95 }] },
              ]}
              testID="mic-button"
            >
              {voiceState === "transcribing" ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Feather
                  name={voiceState === "recording" ? "square" : "mic"}
                  size={18}
                  color={voiceState === "recording" ? "#fff" : Colors.primary}
                />
              )}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  /* ── Attach menu modal ── */
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  menuBubble: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 100 : 80,
    left: 16,
    right: 16,
    backgroundColor: "#1a1f36",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(100,120,200,0.25)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  menuItemPressed: {
    backgroundColor: Colors.surfaceElevated,
  },
  menuItemDisabled: {
    opacity: 0.45,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}18`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  menuSub: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  menuBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  menuBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(100,120,200,0.12)",
    marginHorizontal: 20,
  },

  /* ── Attachment preview strip ── */
  previewStrip: {
    marginBottom: 8,
  },
  previewStripContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },

  // Image thumbnail chip
  imgChip: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: "visible",
    position: "relative",
  },
  imgThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  chipRemove: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#444",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  // Document chip
  docChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.primary}0D`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 160,
  },
  docChipName: {
    flex: 1,
    color: Colors.text,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  docChipRemove: {
    flexShrink: 0,
  },

  // "Add more" chip
  addMoreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${Colors.primary}0A`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderStyle: "dashed",
  },
  addMoreText: {
    color: Colors.primary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },

  /* ── Input row ── */
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    gap: 6,
    minHeight: 48,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
    lineHeight: 20,
  },
  voiceStatus: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  voiceStatusText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },

  // Attach count badge inside + button
  attachCountBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  attachCountText: {
    color: Colors.background,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },

  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  plusBtn: {
    backgroundColor: "transparent",
  },
  plusBtnActive: {
    backgroundColor: `${Colors.primary}18`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  sendBtnActive: {
    backgroundColor: Colors.primary,
  },
  micBtnIdle: {
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  micBtnRecording: {
    backgroundColor: "#ef4444",
  },
  speakerBtnActive: {
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  speakerBtnIdle: {
    backgroundColor: "transparent",
  },
});
