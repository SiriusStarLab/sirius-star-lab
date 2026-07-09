import OpenAI from "openai";

// Switched from OpenRouter to direct Anthropic API — Saturday 13 June 2026
// Eliminates OpenRouter 5.5% platform fee. Same OpenAI-compatible SDK, different endpoint.
// Requires ANTHROPIC_API_KEY in environment. Falls back to OpenRouter if not set.

const usingDirect = !!process.env.ANTHROPIC_API_KEY;

if (!usingDirect && !process.env.OPENROUTER_API_KEY) {
  console.warn("[ai-client] WARNING: Neither ANTHROPIC_API_KEY nor OPENROUTER_API_KEY is set. AI calls will fail.");
}

if (usingDirect) {
  console.log("[ai-client] ✅ Using direct Anthropic API — OpenRouter bypassed.");
} else {
  console.warn("[ai-client] ⚠️ ANTHROPIC_API_KEY not set — falling back to OpenRouter.");
}

const _baseClient = new OpenAI({
  apiKey: usingDirect
    ? process.env.ANTHROPIC_API_KEY!
    : (process.env.OPENROUTER_API_KEY ?? "missing-key"),
  baseURL: usingDirect
    ? "https://api.anthropic.com/v1"
    : "https://openrouter.ai/api/v1",
  defaultHeaders: usingDirect
    ? { "anthropic-version": "2023-06-01" }
    : {
        "HTTP-Referer": "https://sirius-ai.live",
        "X-Title": "Sirius Star Lab",
      },
});

// When using Anthropic direct API, model IDs must NOT have the "anthropic/" prefix.
// OpenRouter uses "anthropic/claude-sonnet-4-5" but Anthropic's API uses "claude-sonnet-4-5".
// This proxy normalises the model field transparently so all callers work with either backend.
function normaliseModel(model: string): string {
  if (usingDirect && model.startsWith("anthropic/")) {
    return model.slice("anthropic/".length);
  }
  return model;
}

type ChatCompletionParams = Parameters<typeof _baseClient.chat.completions.create>[0];

export const openai = new Proxy(_baseClient, {
  get(target, prop) {
    if (prop === "chat") {
      return new Proxy(target.chat, {
        get(chatTarget, chatProp) {
          if (chatProp === "completions") {
            return new Proxy(chatTarget.completions, {
              get(compTarget, compProp) {
                if (compProp === "create") {
                  return (params: ChatCompletionParams) => {
                    const normalised = {
                      ...params,
                      model: normaliseModel(params.model),
                    };
                    return (compTarget.create as Function)(normalised);
                  };
                }
                return (compTarget as any)[compProp];
              },
            });
          }
          return (chatTarget as any)[chatProp];
        },
      });
    }
    return (target as any)[prop];
  },
}) as typeof _baseClient;

export default openai;
