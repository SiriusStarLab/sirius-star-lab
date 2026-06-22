import { Buffer } from "node:buffer";

export async function generateImageBuffer(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024"
): Promise<Buffer> {
  const normalised = size === "512x512" || size === "256x256" ? "1024x1024" : size;

  // Only use direct OpenAI key — Replit AI proxy and OpenRouter don't support image generation
  const directKey = process.env.OPENAI_API_KEY;
  const validDirectKey = directKey && !directKey.startsWith("sk-or-") ? directKey : null;

  if (validDirectKey) {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: validDirectKey });
      const response = await client.images.generate({
        model: "dall-e-3",
        prompt,
        size: normalised,
        response_format: "b64_json",
      });
      const base64 = response.data[0]?.b64_json ?? "";
      if (!base64) throw new Error("No image data returned from OpenAI.");
      console.log("[image] ✅ DALL-E 3 image generated successfully");
      return Buffer.from(base64, "base64");
    } catch (dalleErr: any) {
      console.warn("[image] DALL-E 3 failed, falling back to Pollinations:", dalleErr?.message);
      // Fall through to Pollinations below
    }
  }

  // Free fallback — Pollinations.AI (no API key required, works everywhere)
  console.log("[image] Using Pollinations.AI for image generation");
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux&enhance=false&seed=${Date.now()}`;
  const imgRes = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(45_000) });
  if (!imgRes.ok) {
    throw new Error(`Image generation failed: ${imgRes.status} ${imgRes.statusText}`);
  }
  const arrayBuffer = await imgRes.arrayBuffer();
  console.log("[image] ✅ Pollinations image generated successfully");
  return Buffer.from(arrayBuffer);
}
