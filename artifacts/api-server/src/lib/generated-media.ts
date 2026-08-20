import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { s3, ObjectStorageService } from "./objectStorage.js";

export type GeneratedAsset = {
  kind: "image" | "pdf";
  name: string;
  mimeType: string;
  url: string;
};

const storage = new ObjectStorageService();
const bucket = process.env.STORAGE_BUCKET ?? "sirius-storage";

function safeSegment(value: string, fallback: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return cleaned || fallback;
}

export function pdfCreationRequested(text: string) {
  return /\b(?:create|make|generate|produce|export|turn|save|send|write)\b[\s\S]{0,80}\b(?:a |an |the )?(?:pdf|\.pdf|printable document|document as pdf)\b/i.test(text)
    || /\b(?:pdf|\.pdf)\b[\s\S]{0,60}\b(?:please|now|for me)\b/i.test(text);
}

export function documentTitleFromRequest(text: string) {
  const withoutRequest = text
    .replace(/\b(?:can you|please|could you|i need you to)\b/gi, "")
    .replace(/\b(?:create|make|generate|produce|export|turn|save|send|write)\b/gi, "")
    .replace(/\b(?:a |an |the )?(?:pdf|\.pdf|printable document|document as pdf)\b/gi, "")
    .replace(/\b(?:about|for|of|with)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return (withoutRequest || "Sirius document").slice(0, 96);
}

function pdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapPdfText(value: string, width = 86) {
  const lines: string[] = [];
  for (const paragraph of value.replace(/\r/g, "").split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      if (line && line.length + word.length + 1 > width) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : ["Your Sirius document is ready."];
}

/** Creates a standards-compliant, selectable-text PDF without native binaries. */
export function renderPdf(title: string, content: string) {
  const bodyLines = wrapPdfText(content);
  const linesPerPage = 44;
  const pages = Array.from({ length: Math.max(1, Math.ceil(bodyLines.length / linesPerPage)) }, (_, index) =>
    bodyLines.slice(index * linesPerPage, (index + 1) * linesPerPage)
  );
  const fontId = 3 + pages.length * 2;
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`);

  for (let index = 0; index < pages.length; index++) {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const pageTitle = pages.length > 1 && index > 0 ? `${title} (continued)` : title;
    const textCommands = [
      "BT",
      "/F1 18 Tf",
      "50 744 Td",
      `(${pdfText(pageTitle)}) Tj`,
      "0 -30 Td",
      "/F1 11 Tf",
      "14 TL",
      ...pages[index].map((line) => `(${pdfText(line)}) Tj T*`),
      "ET",
    ].join("\n");
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(textCommands, "ascii")} >>\nstream\n${textCommands}\nendstream`);
  }
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "binary"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "binary");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "binary");
}

export async function storeGeneratedAsset(
  buffer: Buffer,
  input: { kind: "image" | "pdf"; title: string; mimeType: string; userId?: string }
): Promise<GeneratedAsset> {
  const extension = input.kind === "pdf" ? "pdf" : "png";
  const baseName = safeSegment(input.title, input.kind === "pdf" ? "sirius-document" : "sirius-image");
  const name = `${baseName}.${extension}`;
  const user = safeSegment(input.userId || "guest", "guest");
  const key = `private/generated/${user}/${Date.now()}-${randomUUID()}.${extension}`;

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: input.mimeType,
    ContentDisposition: `attachment; filename="${name}"`,
    Metadata: { generator: "sirius", assettype: input.kind },
  }));

  const objectPath = `/objects/${key.slice("private/".length)}`;
  const url = await storage.getObjectEntityDownloadURL(objectPath, 60 * 60 * 24);
  return { kind: input.kind, name, mimeType: input.mimeType, url };
}