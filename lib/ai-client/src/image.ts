import { Buffer } from "node:buffer";

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

export async function generateImageBuffer(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024"
): Promise<Buffer> {
  const [width, height] = size.split("x").map(Number);
  const encodedPrompt = encodeURIComponent(prompt);
  const attempts = [
    `${POLLINATIONS_BASE}/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}`,
    `${POLLINATIONS_BASE}/${encodedPrompt}?width=${width}&height=${height}&nologo=true&model=turbo&seed=${Date.now() + 1}`,
    `${POLLINATIONS_BASE}/${encodedPrompt}?width=768&height=768&nologo=true&seed=${Date.now() + 2}`,
  ];
  let lastError = "Image provider did not return an image";
  for (const url of attempts) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(75_000) });
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        lastError = `${res.status} ${res.statusText}`;
        continue;
      }
      if (!contentType.startsWith("image/")) {
        lastError = `unexpected content type ${contentType || "unknown"}`;
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 1024) return buffer;
      lastError = "provider returned an empty image";
    } catch (error: any) {
      lastError = error?.message || "network error";
    }
  }
  throw new Error(`Image generation failed after retries: ${lastError}`);
}

export async function generateImageDataUrl(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024"
): Promise<string> {
  const buffer = await generateImageBuffer(prompt, size);
  return `data:${imageMimeType(buffer)};base64,` + buffer.toString("base64");
}

export function generateImageUrl(prompt: string, width = 1024, height = 1024): string {
  return POLLINATIONS_BASE + "/" + encodeURIComponent(prompt) + "?width=" + width + "&height=" + height + "&nologo=true";
}

export function imageMimeType(buffer: Buffer): string {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString() === "GIF87a" || buffer.subarray(0, 6).toString() === "GIF89a")) return "image/gif";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return "application/octet-stream";
}

export const openai = null;
