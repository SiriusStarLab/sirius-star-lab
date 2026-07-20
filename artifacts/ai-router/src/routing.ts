import type { Provider, ModelRoute } from "./types.js";

const MARKUP = Number(process.env.ROUTER_MARKUP_PCT ?? 25) / 100; // 25% default

// Wholesale cost per 1M tokens in USD — sourced from OpenRouter pricing.
// UNKNOWN MODELS fall back to SAFE_FALLBACK (very high) to avoid undercharging.
// Update this table when adding new models.
const PRICE_TABLE: Record<string, { input: number; output: number }> = {
  // Anthropic — hyphen form (canonical OpenRouter IDs)
  "anthropic/claude-opus-4":              { input: 15.00,  output: 75.00  },
  "anthropic/claude-opus-4-8":            { input: 15.00,  output: 75.00  },
  "anthropic/claude-sonnet-4-5":          { input: 3.00,   output: 15.00  },
  "anthropic/claude-haiku-4-5":           { input: 0.80,   output: 4.00   },
  "anthropic/claude-3-5-sonnet":          { input: 3.00,   output: 15.00  },
  "anthropic/claude-3-5-haiku":           { input: 0.80,   output: 4.00   },
  "anthropic/claude-3-haiku":             { input: 0.25,   output: 1.25   },
  "anthropic/claude-3-opus":              { input: 15.00,  output: 75.00  },
  // Anthropic — dot form (used by some clients e.g. anthropic/claude-opus-4.8)
  "anthropic/claude-opus-4.8":            { input: 15.00,  output: 75.00  },
  "anthropic/claude-sonnet-4.5":          { input: 3.00,   output: 15.00  },
  "anthropic/claude-haiku-4.5":           { input: 0.80,   output: 4.00   },
  "anthropic/claude-3.5-sonnet":          { input: 3.00,   output: 15.00  },
  "anthropic/claude-3.5-haiku":           { input: 0.80,   output: 4.00   },

  // OpenAI
  "gpt-4o":                               { input: 2.50,   output: 10.00  },
  "gpt-4o-mini":                          { input: 0.15,   output: 0.60   },
  "gpt-4-turbo":                          { input: 10.00,  output: 30.00  },
  "o1":                                   { input: 15.00,  output: 60.00  },
  "o1-mini":                              { input: 3.00,   output: 12.00  },
  "o3":                                   { input: 10.00,  output: 40.00  },
  "o3-mini":                              { input: 1.10,   output: 4.40   },
  "o4-mini":                              { input: 1.10,   output: 4.40   },
  "openai/gpt-4o":                        { input: 2.50,   output: 10.00  },
  "openai/gpt-4o-mini":                   { input: 0.15,   output: 0.60   },
  "openai/o1":                            { input: 15.00,  output: 60.00  },
  "openai/o3-mini":                       { input: 1.10,   output: 4.40   },

  // Mistral
  "mistralai/mistral-large":              { input: 2.00,   output: 6.00   },
  "mistralai/mistral-large-2":            { input: 2.00,   output: 6.00   },
  "mistralai/mistral-medium":             { input: 0.40,   output: 2.00   },
  "mistralai/mistral-small":              { input: 0.20,   output: 0.60   },
  "mistralai/mistral-7b-instruct":        { input: 0.06,   output: 0.06   },
  "mistralai/mixtral-8x7b-instruct":      { input: 0.45,   output: 0.70   },
  "mistralai/mixtral-8x22b-instruct":     { input: 1.20,   output: 1.20   },

  // Meta Llama
  "meta-llama/llama-3.1-70b-instruct":   { input: 0.35,   output: 0.40   },
  "meta-llama/llama-3.1-8b-instruct":    { input: 0.06,   output: 0.06   },
  "meta-llama/llama-3.1-405b-instruct":  { input: 2.00,   output: 2.00   },
  "meta-llama/llama-3.3-70b-instruct":   { input: 0.35,   output: 0.40   },
  "meta-llama/llama-4-scout":            { input: 0.17,   output: 0.17   },
  "meta-llama/llama-4-maverick":         { input: 0.40,   output: 0.40   },

  // Google
  "google/gemini-pro-1.5":               { input: 1.25,   output: 5.00   },
  "google/gemini-flash-1.5":             { input: 0.075,  output: 0.30   },
  "google/gemini-2.0-flash":             { input: 0.10,   output: 0.40   },
  "google/gemini-2.5-pro":               { input: 1.25,   output: 10.00  },
  "google/gemini-2.5-flash":             { input: 0.075,  output: 0.30   },

  // Perplexity
  "perplexity/sonar-pro":                { input: 3.00,   output: 15.00  },
  "perplexity/sonar":                    { input: 1.00,   output: 1.00   },
  "perplexity/sonar-reasoning":          { input: 1.00,   output: 5.00   },

  // DeepSeek
  "deepseek/deepseek-chat":              { input: 0.27,   output: 1.10   },
  "deepseek/deepseek-r1":                { input: 0.55,   output: 2.19   },
};

// Safety fallback for any model NOT in the table above.
// Deliberately very high — protects against unknown expensive models.
// Customers pay more; you never lose money on unlisted models.
const SAFE_FALLBACK = { input: 30.00, output: 90.00 };

export function resolveRoute(model: string): ModelRoute {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey    = !!process.env.OPENAI_API_KEY;

  let provider: Provider;
  if (model.startsWith("anthropic/") && hasAnthropicKey) {
    provider = "anthropic";
  } else if ((model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4") || model.startsWith("openai/")) && hasOpenAIKey) {
    provider = "openai";
  } else {
    provider = "openrouter";
  }

  const prices = PRICE_TABLE[model] ?? SAFE_FALLBACK;
  if (!PRICE_TABLE[model]) {
    console.warn(`[routing] Unknown model "${model}" — using safe fallback pricing ($${SAFE_FALLBACK.input}/$${SAFE_FALLBACK.output} per 1M). Add to PRICE_TABLE to set accurate pricing.`);
  }

  return { provider, model, inputPricePer1M: prices.input, outputPricePer1M: prices.output };
}

export function calcCost(route: ModelRoute, promptTokens: number, completionTokens: number): number {
  return (
    (promptTokens     / 1_000_000) * route.inputPricePer1M +
    (completionTokens / 1_000_000) * route.outputPricePer1M
  );
}

// If the upstream provider returns actual cost, use it (most accurate).
// Fall back to price-table estimate only when actual cost is unavailable.
export function calcCostFromActual(
  route: ModelRoute,
  promptTokens: number,
  completionTokens: number,
  actualCostUsd: number | null,
): number {
  if (actualCostUsd !== null && actualCostUsd > 0) return actualCostUsd;
  return calcCost(route, promptTokens, completionTokens);
}

export function calcCharge(wholesaleCost: number): number {
  return wholesaleCost * (1 + MARKUP);
}
