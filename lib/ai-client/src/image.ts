import OpenAI from "openai";
import { Buffer } from "node:buffer";

function createImageClient(): OpenAI {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  console.warn("[ai-client] OPENAI_API_KEY not set — image generation unavailable. Set OPENAI_API_KEY on the server to enable it.");
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY ?? "missing-key",
    baseURL: "https://openrouter.ai/api/v1",
  });
}

export const openai = createImageClient();

export async function generateImageBuffer(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024"
): Promise<Buffer> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Image generation requires OPENAI_API_KEY. Set it on the server to enable this feature.");
  }
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    size: size === "512x512" || size === "256x256" ? "1024x1024" : size,
    response_format: "b64_json",
  });
  const base64 = response.data[0]?.b64_json ?? "";
  return Buffer.from(base64, "base64");
}
