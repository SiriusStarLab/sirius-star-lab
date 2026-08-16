import OpenAI from "openai";

if (!process.env.OPENROUTER_API_KEY) {
  console.warn("[ai-client] WARNING: OPENROUTER_API_KEY is not set. AI calls will fail.");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? "missing-key",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://sirius-ai.live",
    "X-Title": "Sirius Star Lab",
  },
});

export default openai;
