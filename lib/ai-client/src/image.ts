import { Buffer } from "node:buffer";

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

export async function generateImageBuffer(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024"
): Promise<Buffer> {
  const [width, height] = size.split("x").map(Number);
  const url = POLLINATIONS_BASE + "/" + encodeURIComponent(prompt) + "?width=" + width + "&height=" + height + "&nologo=true&model=flux&seed=" + Date.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error("Image generation failed: " + res.status + " " + res.statusText);
  return Buffer.from(await res.arrayBuffer());
}

export async function generateImageDataUrl(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024"
): Promise<string> {
  const buffer = await generateImageBuffer(prompt, size);
  return "data:image/png;base64," + buffer.toString("base64");
}

export function generateImageUrl(prompt: string, width = 1024, height = 1024): string {
  return POLLINATIONS_BASE + "/" + encodeURIComponent(prompt) + "?width=" + width + "&height=" + height + "&nologo=true&model=flux";
}

export const openai = null;
