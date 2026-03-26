import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { Feather } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { getApiBase } from "@/lib/api";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  voiceMode?: boolean;
  onToggleVoice?: () => void;
}

type VoiceState = "idle" | "recording" | "transcribing";

export function ChatInput({ onSend, disabled = false, placeholder = "Message Sirius…", voiceMode = true, onToggleVoice }: Props) {
  const [text, setText] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setText("");
    onSend(trimmed);
    inputRef.current?.focus();
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
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
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
          onSend(transcript.trim());
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
  const showSend = text.trim().length > 0 && !isVoiceBusy;

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
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

        {/* Keyboard / type button — focuses the input and brings up native keyboard */}
        {!isVoiceBusy && (
          <Pressable
            onPress={() => inputRef.current?.focus()}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.keyboardBtn,
              pressed && { opacity: 0.7 },
            ]}
            testID="keyboard-button"
          >
            <Feather name="edit-2" size={16} color={Colors.textDim} />
          </Pressable>
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
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    gap: 8,
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
  keyboardBtn: {
    backgroundColor: "transparent",
  },
});
