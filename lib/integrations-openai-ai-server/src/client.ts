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
});
