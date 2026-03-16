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

export type ChatSource = {
  url: string;
  title: string;
};

export type ChatMessage = {
  id: string | number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
  isSearching?: boolean;
  sources?: ChatSource[];
};

export function useChat(conversationId?: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { mutateAsync: createConversation } = useCreateOpenaiConversation();
  const abortControllerRef = useRef<AbortController | null>(null);

  const setInitialMessages = useCallback((dbMessages: OpenaiMessage[]) => {
    setMessages(dbMessages.map(m => ({
      ...m,
      id: m.id,
      role: m.role as "user" | "assistant" | "system"
    })));
  }, []);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsTyping(false);
    }
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    stopStream();
    
    let activeId = conversationId;
    
    const userMsgId = Date.now();
    setMessages(prev => [...prev, { id: userMsgId, role: "user", content }]);
    
    try {
      if (!activeId) {
        const title = content.length > 40 ? content.slice(0, 40) + "..." : content;
        const newConvo = await createConversation({ data: { title } });
        activeId = newConvo.id;
        
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        setLocation(`/c/${activeId}`, { replace: true });
      }

      const assistantMsgId = Date.now() + 1;
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
        isSearching: false,
        sources: [],
      }]);
      setIsTyping(true);

      abortControllerRef.current = new AbortController();
      
      const response = await fetch(`/api/openai/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error("No readable stream");

      let buffer = "";

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
                    ? { ...m, isStreaming: false, isSearching: false }
                    : m
                ));
                queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(activeId) });
                setIsTyping(false);
              } else if (data.type === "searching") {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, isSearching: true }
                    : m
                ));
              } else if (data.sources) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, sources: data.sources }
                    : m
                ));
              } else if (data.content) {
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

  return {
    messages,
    setInitialMessages,
    sendMessage,
    isTyping,
    stopStream
  };
}
