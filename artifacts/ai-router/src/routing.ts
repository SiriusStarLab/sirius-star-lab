import type { Provider, ModelRoute } from "./types.js";

// Cost per 1M tokens in USD
const PRICE_TABLE: Record<string, { input: number; output: number }> = {
  // Anthropic via OpenRouter
  "anthropic/claude-opus-4":          { input: 15.00, output: 75.00 },
  "anthropic/claude-opus-4-8":        { input: 15.00, output: 75.00 },
  "anthropic/claude-sonnet-4-5":      { input: 3.00,  output: 15.00 },
  "anthropic/claude-haiku-4-5":       { input: 0.80,  output: 4.00  },
  "anthropic/claude-3-5-sonnet":      { input: 3.00,  output: 15.00 },
  "anthropic/claude-3-haiku":         { input: 0.25,  output: 1.25  },
  // OpenAI direct
  "gpt-4o":                           { input: 2.50,  output: 10.00 },
  "gpt-4o-mini":                      { input: 0.15,  output: 0.60  },
  "gpt-4-turbo":                      { input: 10.00, output: 30.00 },
  "o1":                               { input: 15.00, output: 60.00 },
  "o3-mini":                          { input: 1.10,  output: 4.40  },
  // OpenAI via openai/ prefix
  "openai/gpt-4o":                    { input: 2.50,  output: 10.00 },
  "openai/gpt-4o-mini":               { input: 0.15,  output: 0.60  },
  // Mistral via OpenRouter
  "mistralai/mistral-large":          { input: 2.00,  output: 6.00  },
  "mistralai/mistral-small":          { input: 0.20,  output: 0.60  },
  // Meta via OpenRouter
  "meta-llama/llama-3.1-70b-instruct":{ input: 0.35,  output: 0.40  },
  "meta-llama/llama-3.1-8b-instruct": { input: 0.06,  output: 0.06  },
};

export function resolveRoute(model: string): ModelRoute {
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey    = !!process.env.OPENAI_API_KEY;

  let provider: Provider;

  if (model.startsWith("anthropic/") && hasAnthropicKey) {
    provider = "anthropic";
  } else if ((model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("openai/")) && hasOpenAIKey) {
    provider = "openai";
  } else {
    // Fallback: everything goes through OpenRouter
    provider = "openrouter";
  }

  const prices = PRICE_TABLE[model] ?? { input: 1.00, output: 3.00 };

  return {
    provider,
    model,
    inputPricePer1M: prices.input,
    outputPricePer1M: prices.output,
  };
}

export function calcCost(route: ModelRoute, promptTokens: number, completionTokens: number): number {
  return (
    (promptTokens    / 1_000_000) * route.inputPricePer1M +
    (completionTokens / 1_000_000) * route.outputPricePer1M
  );
}
