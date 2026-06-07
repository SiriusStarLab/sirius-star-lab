import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  useCreateOpenaiConversation, 
  getGetOpenaiConversationQueryKey,
  getListOpenaiConversationsQueryKey,
  type OpenaiMessage 
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { getUserId } from "@/lib/user-id";

// Preserves in-flight messages across the "/" → "/c/:id" route remount so
// mobile users don't see a flash of the welcome screen mid-conversation.
const PENDING_BRIDGE: { messages: ChatMessage[]; convId: number | null } = {
  messages: [],
  convId: null,
};

export type ChatSource = {
  url: string;
  title: string;
};

export type ActionStep = {
  tool: string;
  label: string;
  detail?: string;
  color?: string;
  icon?: string;
};

export type ChatMessage = {
  id: string | number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
  isSearching?: boolean;
  wasSearched?: boolean;
  isGeneratingImage?: boolean;
  imageB64?: string;
  imagePrompt?: string;
  uploadedImageBase64?: string;
  sources?: ChatSource[];
  actions?: ActionStep[];
  followups?: string[];
  thinkingContent?: string;
};

export function useChat(conversationId?: number) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Restore in-progress messages if we just navigated to this conversation
    if (
      conversationId !== undefined &&
      PENDING_BRIDGE.convId === conversationId &&
      PENDING_BRIDGE.messages.length > 0
    ) {
      const saved = [...PENDING_BRIDGE.messages];
      PENDING_BRIDGE.messages = [];
      PENDING_BRIDGE.convId = null;
      return saved;
    }
    return [];
  });
  const [isTyping, setIsTyping] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { mutateAsync: createConversation } = useCreateOpenaiConversation();
  const abortControllerRef = useRef<AbortController | null>(null);

  const setInitialMessages = useCallback((dbMessages: OpenaiMessage[]) => {
    setMessages(prev => {
      // Don't replace messages if streaming is in progress (avoids flash)
      if (prev.some(m => m.isStreaming)) return prev;
      return dbMessages.map(m => ({
        ...m,
        id: m.id,
        role: m.role as "user" | "assistant" | "system"
      }));
    });
  }, []);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsTyping(false);
    }
  }, []);

  const sendMessage = async (content: string, imageBase64?: string, mode?: string, documentBase64?: string, documentName?: string, onResponseComplete?: (text: string) => void) => {
    if (!content.trim() && !imageBase64 && !documentBase64) return;
    
    stopStream();
    
    let activeId = conversationId;
    
    const userMsgId = Date.now();
    const userMsg: ChatMessage = { id: userMsgId, role: "user", content, uploadedImageBase64: imageBase64 };
    setMessages(prev => [...prev, userMsg]);
    
    try {
      const assistantMsgId = Date.now() + 1;
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
        isSearching: false,
        sources: [],
      };

      if (!activeId) {
        const title = content.length > 40 ? content.slice(0, 40) + "..." : content;
        const newConvo = await createConversation({ data: { title } });
        activeId = newConvo.id;

        // Populate the bridge BEFORE navigation so the new ChatPage instance
        // picks up these messages immediately and skips the loading flash.
        PENDING_BRIDGE.messages = [userMsg, assistantMsg];
        PENDING_BRIDGE.convId = activeId;
        
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setLocation(`/c/${activeId}`, { replace: true });
      }

      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(true);

      abortControllerRef.current = new AbortController();
      
      const response = await fetch(`/api/openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, userId: getUserId(), imageBase64, mode, documentBase64, documentName }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error("No readable stream");

      let buffer = "";
      let fullResponseText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              
              if (data.done) {
                setMessages(prev => prev.map(m => 
                  m.id === assistantMsgId
                    ? { ...m, isStreaming: false, isSearching: false, isGeneratingImage: false }
                    : m
                ));
                queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(activeId) });
                setIsTyping(false);
                if (onResponseComplete && fullResponseText) {
                  onResponseComplete(fullResponseText);
                }
              } else if (data.type === "image_generating") {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, isGeneratingImage: true }
                    : m
                ));
              } else if (data.type === "image") {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, isGeneratingImage: false, imageB64: data.b64, imagePrompt: data.prompt }
                    : m
                ));
              } else if (data.type === "action") {
                const step: ActionStep = {
                  tool: data.tool || "",
                  label: data.label || data.tool || "",
                  detail: data.detail,
                  color: data.color,
                  icon: data.icon,
                };
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, actions: [...(m.actions || []), step] }
                    : m
                ));
              } else if (data.type === "searching") {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, isSearching: true, wasSearched: true }
                    : m
                ));
              } else if (data.type === "thinking_chunk" && data.content) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, thinkingContent: (m.thinkingContent || "") + data.content }
                    : m
                ));
              } else if (data.type === "thinking_done") {
                // thinking complete — no state change needed, content streaming begins
              } else if (data.type === "followups" && Array.isArray(data.questions)) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, followups: data.questions }
                    : m
                ));
              } else if (data.sources) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, sources: data.sources }
                    : m
                ));
              } else if (data.content) {
                fullResponseText += data.content;
                setMessages(prev => prev.map(m => 
                  m.id === assistantMsgId
                    ? { ...m, isSearching: false, content: m.content + data.content }
                    : m
                ));
              }
            } catch (err) {
              console.error("Failed to parse SSE data chunk", dataStr, err);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Chat error:", error);
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to communicate with the AI assistant. Please try again.",
        });
        setMessages(prev => prev.filter(m => !(m.isStreaming && m.content === "")));
      }
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  const clearMessages = useCallback(() => {
    stopStream();
    PENDING_BRIDGE.messages = [];
    PENDING_BRIDGE.convId = null;
    setMessages([]);
  }, [stopStream]);

  return {
    messages,
    setInitialMessages,
    sendMessage,
    isTyping,
    stopStream,
    clearMessages,
  };
}
