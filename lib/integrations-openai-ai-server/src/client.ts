import OpenAI from "openai";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error(
    "OPENROUTER_API_KEY must be set. Please add your OpenRouter API key as a secret.",
  );
}

export const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://sirius-ai.live",
    "X-Title": "Sirius Star Lab",
  },
  // Automatically retry 429 (rate limit) and 5xx errors with exponential back-off.
  // Two retries means a transient OpenRouter hiccup is silently recovered rather than
  // surfacing as a failed request and crashing the handler.
  maxRetries: 2,
  // Hard client-level timeout — keeps individual fetch calls from hanging indefinitely
  // even if no per-request AbortSignal is provided.  Set slightly above the lab/chat
  // per-chunk reset (20 s) so the signal fires first on streaming calls, but this
  // catches any non-streaming or unguarded call.
  timeout: 25_000,
});
