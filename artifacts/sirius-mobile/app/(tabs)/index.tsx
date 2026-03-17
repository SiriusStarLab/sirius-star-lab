import { fetch } from "expo/fetch";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatInput } from "@/components/ChatInput";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import {
  Message,
  createConversation,
  generateId,
  getApiBase,
} from "@/lib/api";

interface DBMessage {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { userId, profile } = useApp();
  const params = useLocalSearchParams<{ prompt?: string; conversationId?: string }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);

  const promptHandledRef = useRef<string | undefined>(undefined);
  const convoHandledRef = useRef<string | undefined>(undefined);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSend = useCallback(async (text: string) => {
    if (isStreaming) return;

    const userMsg: Message = { id: generateId(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);

    try {
      let activeId = conversationId;
      if (!activeId) {
        const convo = await createConversation(text.slice(0, 60));
        activeId = convo.id;
        setConversationId(activeId);
      }

      const base = getApiBase();
      const response = await fetch(
        `${base}openai/conversations/${activeId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            content: text,
            userId: userId ?? undefined,
          }),
        }
      );

      if (!response.ok) throw new Error("Stream failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";
      let assistantAdded = false;
      const assistantId = generateId();
      let imageB64: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.done) continue;

            if (parsed.type === "image" && parsed.b64) {
              imageB64 = parsed.b64;
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.id === assistantId) {
                  updated[updated.length - 1] = { ...last, imageB64 };
                }
                return updated;
              });
              continue;
            }

            if (parsed.content) {
              fullContent += parsed.content;
              setShowTyping(false);

              if (!assistantAdded) {
                setMessages(prev => [
                  ...prev,
                  { id: assistantId, role: "assistant", content: fullContent },
                ]);
                assistantAdded = true;
              } else {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                  return updated;
                });
              }
            }
          } catch {}
        }
      }
    } catch {
      setShowTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }, [conversationId, isStreaming, userId]);

  useEffect(() => {
    if (
      params.prompt &&
      params.prompt !== promptHandledRef.current &&
      !isStreaming
    ) {
      promptHandledRef.current = params.prompt;
      setMessages([]);
      setConversationId(null);
      setTimeout(() => handleSend(params.prompt!), 200);
    }
  }, [params.prompt, handleSend, isStreaming]);

  useEffect(() => {
    const convoIdParam = params.conversationId;
    if (!convoIdParam || convoIdParam === convoHandledRef.current) return;
    convoHandledRef.current = convoIdParam;

    const id = parseInt(convoIdParam, 10);
    if (isNaN(id)) return;

    (async () => {
      try {
        const base = getApiBase();
        const res = await fetch(`${base}openai/conversations/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        const msgs: Message[] = (data.messages ?? []).map((m: DBMessage) => ({
          id: String(m.id),
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        setMessages(msgs);
        setConversationId(id);
      } catch {}
    })();
  }, [params.conversationId]);

  const reversed = [...messages].reverse();

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: Colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {messages.length === 0 && (
        <View style={[styles.emptyState, { paddingTop: topPad }]}>
          <Text style={styles.emptyTitle}>{profile.aiName}</Text>
          <Text style={styles.emptySlogan}>I think, so I am</Text>
          <Text style={styles.emptyHint}>Ask me anything</Text>
        </View>
      )}

      <FlatList
        data={reversed}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        inverted={messages.length > 0}
        ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!!reversed.length}
        contentContainerStyle={
          messages.length === 0
            ? { flex: 1 }
            : { paddingTop: topPad + 8, paddingBottom: 12 }
        }
        showsVerticalScrollIndicator={false}
      />

      <View style={{ paddingBottom: bottomPad }}>
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder={`Message ${profile.aiName}...`}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  emptyState: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    zIndex: 0,
  },
  emptyTitle: {
    fontSize: 42,
    fontWeight: "700",
    color: Colors.primary,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
    marginBottom: 6,
  },
  emptySlogan: {
    fontSize: 16,
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
    letterSpacing: 0.5,
    marginBottom: 24,
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
});
