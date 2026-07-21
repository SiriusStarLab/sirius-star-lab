import { Router } from "express";
import { requireApiKeyOnly } from "../middleware/auth.js";

export const modelsRouter = Router();

const MODELS = [
  // Anthropic
  { id: "anthropic/claude-opus-4.8",      name: "Claude Opus 4.8",       provider: "anthropic" },
  { id: "anthropic/claude-opus-4",        name: "Claude Opus 4",         provider: "anthropic" },
  { id: "anthropic/claude-sonnet-4.5",    name: "Claude Sonnet 4.5",     provider: "anthropic" },
  { id: "anthropic/claude-haiku-4.5",     name: "Claude Haiku 4.5",      provider: "anthropic" },
  { id: "anthropic/claude-3.5-sonnet",    name: "Claude 3.5 Sonnet",     provider: "anthropic" },
  { id: "anthropic/claude-3.5-haiku",     name: "Claude 3.5 Haiku",      provider: "anthropic" },
  // OpenAI
  { id: "openai/gpt-4o",                  name: "GPT-4o",                provider: "openai"    },
  { id: "openai/gpt-4o-mini",             name: "GPT-4o Mini",           provider: "openai"    },
  { id: "openai/o1",                      name: "o1",                    provider: "openai"    },
  { id: "openai/o3-mini",                 name: "o3-mini",               provider: "openai"    },
  // Mistral via OpenRouter
  { id: "mistralai/mistral-large-2411",   name: "Mistral Large",         provider: "openrouter"},
  { id: "mistralai/mistral-small-3.2",    name: "Mistral Small",         provider: "openrouter"},
  // Meta via OpenRouter
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B",    provider: "openrouter"},
  { id: "meta-llama/llama-3.1-8b-instruct",  name: "Llama 3.1 8B",     provider: "openrouter"},
];

modelsRouter.get("/models", requireApiKeyOnly, (_req, res) => {
  res.json({
    object: "list",
    data: MODELS.map(m => ({
      id: m.id,
      object: "model",
      created: 1700000000,
      owned_by: m.provider,
    })),
  });
});
