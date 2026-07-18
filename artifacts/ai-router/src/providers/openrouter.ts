import type { ChatRequest, StreamChunk } from "../types.js";

const BASE = "https://openrouter.ai/api/v1";

export async function streamOpenRouter(
  req: ChatRequest,
  onChunk: (chunk: StreamChunk) => void,
  onDone: (usage: { prompt_tokens: number; completion_tokens: number }) => void,
  onError: (err: string) => void,
) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) { onError("OPENROUTER_API_KEY not set"); return; }

  const resp = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://sirius-ai.live",
      "X-Title": "Sirius AI Router",
    },
    body: JSON.stringify({ ...req, stream: true }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    onError(`OpenRouter ${resp.status}: ${text}`);
    return;
  }

  await readSSEStream(resp, onChunk, onDone);
}

export async function chatOpenRouter(req: ChatRequest): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");

  const resp = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://sirius-ai.live",
      "X-Title": "Sirius AI Router",
    },
    body: JSON.stringify({ ...req, stream: false }),
  });

  if (!resp.ok) throw new Error(`OpenRouter ${resp.status}: ${await resp.text()}`);
  const data = await resp.json() as any;
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    usage: data.usage ?? { prompt_tokens: 0, completion_tokens: 0 },
  };
}

async function readSSEStream(
  resp: Response,
  onChunk: (c: StreamChunk) => void,
  onDone: (u: { prompt_tokens: number; completion_tokens: number }) => void,
) {
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let usage = { prompt_tokens: 0, completion_tokens: 0 };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") { onDone(usage); return; }
      try {
        const obj = JSON.parse(raw) as any;
        if (obj.usage) usage = { prompt_tokens: obj.usage.prompt_tokens ?? 0, completion_tokens: obj.usage.completion_tokens ?? 0 };
        const delta = obj.choices?.[0]?.delta;
        if (delta) onChunk({ delta, finish_reason: obj.choices?.[0]?.finish_reason ?? null, id: obj.id ?? "" });
      } catch { /* skip malformed */ }
    }
  }
  onDone(usage);
}

export { readSSEStream };
