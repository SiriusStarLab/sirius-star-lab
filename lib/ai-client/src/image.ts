import { Buffer } from "node:buffer";

export async function generateImageBuffer(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024"
): Promise<Buffer> {
  const normalised = size === "512x512" || size === "256x256" ? "1024x1024" : size;

  if (process.env.OPENAI_API_KEY) {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt,
      size: normalised,
      response_format: "b64_json",
    });
    const base64 = response.data[0]?.b64_json ?? "";
    return Buffer.from(base64, "base64");
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Image generation requires OPENAI_API_KEY or OPENROUTER_API_KEY — neither is set.");
  }

  const res = await fetch("https://openrouter.ai/api/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/dall-e-3",
      prompt,
      n: 1,
      size: normalised,
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Image generation failed (OpenRouter): ${errText}`);
  }

  const data = await res.json() as { data?: { b64_json?: string }[] };
  const base64 = data.data?.[0]?.b64_json ?? "";
  if (!base64) throw new Error("No image returned from OpenRouter.");
  return Buffer.from(base64, "base64");
}
