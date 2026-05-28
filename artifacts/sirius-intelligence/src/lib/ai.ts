import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
  defaultHeaders: {
    "HTTP-Referer": "https://sirius-ai.live",
    "X-Title": "Sirius Intelligence",
  },
});

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  model = "anthropic/claude-3.5-haiku",
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 2000,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}
