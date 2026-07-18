import type { ChatRequest, StreamChunk } from "../types.js";

const BASE = "https://api.anthropic.com/v1";

// Map OpenAI-style messages to Anthropic format
function convertMessages(messages: ChatRequest["messages"]): { system?: string; messages: any[] } {
  const system = messages.find(m => m.role === "system")?.content as string | undefined;
  const converted = messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
  return { system, messages: converted };
}

export async function streamAnthropic(
  req: ChatRequest,
  onChunk: (chunk: StreamChunk) => void,
  onDone: (usage: { prompt_tokens: number; completion_tokens: number }) => void,
  onError: (err: string) => void,
) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { onError("ANTHROPIC_API_KEY not set"); return; }

  const model = req.model.replace(/^anthropic\//, "");
  const { system, messages } = convertMessages(req.messages);

  const resp = await fetch(`${BASE}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: req.max_tokens ?? 8096,
      system,
      messages,
      stream: true,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    onError(`Anthropic ${resp.status}: ${text}`);
    return;
  }

  // Parse Anthropic SSE format
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let msgId = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      try {
        const obj = JSON.parse(raw) as any;
        if (obj.type === "message_start") {
          msgId = obj.message?.id ?? "";
          inputTokens = obj.message?.usage?.input_tokens ?? 0;
        }
        if (obj.type === "content_block_delta" && obj.delta?.type === "text_delta") {
          onChunk({ delta: { content: obj.delta.text, role: "assistant" }, finish_reason: null, id: msgId });
        }
        if (obj.type === "message_delta") {
          outputTokens = obj.usage?.output_tokens ?? 0;
        }
        if (obj.type === "message_stop") {
          onDone({ prompt_tokens: inputTokens, completion_tokens: outputTokens });
          return;
        }
      } catch { /* skip */ }
    }
  }
  onDone({ prompt_tokens: inputTokens, completion_tokens: outputTokens });
}
