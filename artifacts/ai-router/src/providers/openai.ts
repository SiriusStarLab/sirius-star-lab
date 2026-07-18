import type { ChatRequest, StreamChunk } from "../types.js";
import { readSSEStream } from "./openrouter.js";

const BASE = "https://api.openai.com/v1";

export async function streamOpenAI(
  req: ChatRequest,
  onChunk: (chunk: StreamChunk) => void,
  onDone: (usage: { prompt_tokens: number; completion_tokens: number }) => void,
  onError: (err: string) => void,
) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) { onError("OPENAI_API_KEY not set"); return; }

  // Normalise model name — strip openai/ prefix if present
  const model = req.model.replace(/^openai\//, "");

  const resp = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...req, model, stream: true }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    onError(`OpenAI ${resp.status}: ${text}`);
    return;
  }

  await readSSEStream(resp, onChunk, onDone);
}

export async function chatOpenAI(req: ChatRequest): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const model = req.model.replace(/^openai\//, "");

  const resp = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...req, model, stream: false }),
  });

  if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);
  const data = await resp.json() as any;
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    usage: data.usage ?? { prompt_tokens: 0, completion_tokens: 0 },
  };
}
