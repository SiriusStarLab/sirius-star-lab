import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { getApiBase } from "@/lib/api";

interface Props {
  onSend: (text: string, imageBase64?: string, documentBase64?: string, documentName?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  voiceMode?: boolean;
  onToggleVoice?: () => void;
}

type VoiceState = "idle" | "recording" | "transcribing";

export function ChatInput({ onSend, disabled = false, placeholder = "Message Sirius…", voiceMode = true, onToggleVoice }: Props) {
  const [text, setText] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedDocBase64, setSelectedDocBase64] = useState<string | null>(null);
  const [selectedDocName, setSelectedDocName] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const clearAttachments = () => {
    setSelectedImage(null);
    setSelectedDocBase64(null);
    setSelectedDocName(null);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedImage && !selectedDocBase64 || disabled) return;
    const imgToSend = selectedImage;
    const docB64 = selectedDocBase64;
    const docName = selectedDocName;
    setText("");
    clearAttachments();
    onSend(trimmed, imgToSend ?? undefined, docB64 ?? undefined, docName ?? undefined);
    inputRef.current?.focus();
  };

  const pickFromLibrary = async () => {
    setShowAttachMenu(false);
    if (disabled) return;
    try {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mime = asset.mimeType || "image/jpeg";
          setSelectedImage(`data:${mime};base64,${asset.base64}`);
          setSelectedDocBase64(null);
          setSelectedDocName(null);
        }
      }
    } catch (err) {
      console.error("Image picker failed", err);
    }
  };

  const takePhoto = async () => {
    setShowAttachMenu(false);
    if (disabled) return;
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) return;
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mime = asset.mimeType || "image/jpeg";
          setSelectedImage(`data:${mime};base64,${asset.base64}`);
          setSelectedDocBase64(null);
          setSelectedDocName(null);
        }
      }
    } catch (err) {
      console.error("Camera failed", err);
    }
  };

  const pickDocument = async () => {
    setShowAttachMenu(false);
    if (disabled) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain", "text/markdown",
               "application/msword",
               "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: "base64" as any,
      });
      setSelectedDocBase64(base64);
      setSelectedDocName(asset.name ?? "document");
      setSelectedImage(null);
    } catch (err) {
      console.error("Document picker failed", err);
    }
  };

  const startRecording = async () => {
    if (disabled) return;
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
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
        encoding: "base64" as any,
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
          onSend(transcript.trim(), selectedImage ?? undefined, selectedDocBase64 ?? undefined, selectedDocName ?? undefined);
          clearAttachments();
        }
      }
    } catch (err) {
      console.error("Transcription failed", err);
    } finally {
      setVoiceState("idle");
    }
  };

  const handleMicPress = () => {
    if (voiceState === "idle") startRecording();
    else if (voiceState === "recording") stopAndTranscribe();
  };

  const isVoiceBusy = voiceState !== "idle";
  const hasAttachment = !!selectedImage || !!selectedDocBase64;
  const showSend = (text.trim().length > 0 || hasAttachment) && !isVoiceBusy;

  return (
    <View style={styles.wrapper}>
      {/* Attach bubble menu — rendered as Modal so it floats above everything */}
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
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                >
                  <View style={styles.menuIcon}>
                    <Feather name="camera" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={styles.menuLabel}>Take Photo</Text>
                    <Text style={styles.menuSub}>Open camera</Text>
                  </View>
                </Pressable>

                <View style={styles.menuDivider} />

                <Pressable
                  onPress={pickFromLibrary}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                >
                  <View style={styles.menuIcon}>
                    <Feather name="image" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={styles.menuLabel}>Choose from Library</Text>
                    <Text style={styles.menuSub}>Pick an existing photo</Text>
                  </View>
                </Pressable>

                <View style={styles.menuDivider} />

                <Pressable
                  onPress={pickDocument}
                  style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                >
                  <View style={styles.menuIcon}>
                    <Feather name="file-text" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={styles.menuLabel}>Attach Document</Text>
                    <Text style={styles.menuSub}>PDF, Word, or text file</Text>
                  </View>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <View style={styles.container}>
        {/* Image preview strip */}
        {selectedImage && (
          <View style={styles.imagePreviewRow}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            <Pressable
              onPress={() => setSelectedImage(null)}
              style={styles.imageRemoveBtn}
            >
              <Feather name="x" size={12} color="#fff" />
            </Pressable>
            <Text style={styles.imagePreviewLabel}>Image ready — Sirius will analyse it</Text>
          </View>
        )}

        {/* Document preview strip */}
        {selectedDocName && (
          <View style={styles.docPreviewRow}>
            <View style={styles.docIcon}>
              <Feather name="file-text" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.docPreviewName} numberOfLines={1}>{selectedDocName}</Text>
            <Pressable
              onPress={() => { setSelectedDocBase64(null); setSelectedDocName(null); }}
              style={styles.docRemoveBtn}
              hitSlop={10}
            >
              <Feather name="x" size={14} color={Colors.textDim} />
            </Pressable>
          </View>
        )}

        <View style={styles.inputRow}>
          {/* + Attach button */}
          {!isVoiceBusy && (
            <Pressable
              onPress={() => setShowAttachMenu(true)}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.plusBtn,
                showAttachMenu && styles.plusBtnActive,
                pressed && { opacity: 0.7 },
              ]}
              testID="attach-button"
            >
              <Feather
                name="plus"
                size={18}
                color={showAttachMenu ? Colors.primary : Colors.textDim}
              />
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

  /* ── Attach bubble modal ── */
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
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(100,120,200,0.12)",
    marginHorizontal: 20,
  },

  /* ── Image preview ── */
  imagePreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  imagePreview: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  imageRemoveBtn: {
    position: "absolute",
    top: -4,
    left: 36,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#555",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreviewLabel: {
    flex: 1,
    fontSize: 11,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    marginLeft: 4,
  },

  /* ── Document preview ── */
  docPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
    backgroundColor: `${Colors.primary}0D`,
    borderRadius: 10,
    paddingVertical: 8,
    paddingRight: 10,
    borderWidth: 1,
    borderColor: `${Colors.primary}20`,
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${Colors.primary}18`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  docPreviewName: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  docRemoveBtn: {
    flexShrink: 0,
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
