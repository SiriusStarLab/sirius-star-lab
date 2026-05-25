/**
 * Sirius Star Lab — CAD Auto-Generation via New Dimensions AI Engine
 *
 * Flow:
 *  1. POST to New Dimensions /api/ai/generate with the full project spec
 *     → returns structured drawing data: { title, description, elements[], layers[] }
 *  2. POST the drawing WITH elements+layers to ND /api/projects/:ndId/drawings
 *     → drawing is now live and renderable inside the New Dimensions CAD canvas
 *  3. Convert the structured elements to a proper SVG programmatically
 *     (layer colours, solid/dashed/dashdot line types, dimension arrows, text)
 *  4. Upload SVG to object storage → store in cad_files → mark cad_jobs complete
 *  5. Advance project to "launch-ready"
 */

import { eq, desc } from "drizzle-orm";
import { db, cadFiles, cadJobs, labProjects } from "@workspace/db";
import { ObjectStorageService } from "./objectStorage.js";

const storage = new ObjectStorageService();

const ND_BASE_URL = () =>
  (process.env.NEWDIMENSIONS_BASE_URL || "https://new-dimension-cad.replit.app").replace(/\/$/, "");
const ND_API_KEY = () => process.env.NEWDIMENSIONS_API_KEY || "";

// ── Types mirroring the ND /api/ai/generate response ─────────────────────────

interface NdLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  lineType: "solid" | "dashed" | "dashdot";
}

interface NdElement {
  id: string;
  type: "line" | "rectangle" | "circle" | "arc" | "text" | "dimension" | "polyline";
  layerId: string;
  x: number;
  y: number;
  properties: Record<string, any>;
  style: {
    strokeColor: string;
    strokeWidth: number;
    fillColor: string | null;
    lineType: "solid" | "dashed" | "dashdot";
  };
}

interface NdDrawingData {
  title: string;
  description: string;
  elements: NdElement[];
  layers: NdLayer[];
}

// ── SVG renderer ──────────────────────────────────────────────────────────────

function dashArray(lineType: "solid" | "dashed" | "dashdot"): string {
  if (lineType === "dashed")  return ' stroke-dasharray="8,4"';
  if (lineType === "dashdot") return ' stroke-dasharray="12,4,2,4"';
  return "";
}

function arrowMarker(id: string, color: string): string {
  return `<marker id="${id}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L0,6 L8,3 z" fill="${color}" />
  </marker>`;
}

function elementsToSvg(data: NdDrawingData): string {
  const W = 1200, H = 900;
  const layerMap = new Map<string, NdLayer>(data.layers.map(l => [l.id, l]));
  const markers = new Set<string>();
  const shapes: string[] = [];
  const today = new Date().toLocaleDateString("en-GB");

  // Sort: put text/dimension on top
  const sorted = [...data.elements].sort((a, b) => {
    const order = ["rectangle","circle","arc","polyline","line","dimension","text"];
    return order.indexOf(a.type) - order.indexOf(b.type);
  });

  for (const el of sorted) {
    const layer = layerMap.get(el.layerId);
    const color  = el.style.strokeColor || (layer?.color ?? "#000");
    const width  = el.style.strokeWidth ?? 1;
    const lt     = el.style.lineType ?? layer?.lineType ?? "solid";
    const fill   = el.style.fillColor ?? "none";
    const dash   = dashArray(lt);
    const base   = `stroke="${color}" stroke-width="${width}" fill="${fill}"${dash}`;

    switch (el.type) {
      case "line": {
        const { x2 = el.x, y2 = el.y } = el.properties;
        shapes.push(`<line x1="${el.x}" y1="${el.y}" x2="${x2}" y2="${y2}" ${base}/>`);
        break;
      }
      case "rectangle": {
        const { width: w = 100, height: h = 60 } = el.properties;
        shapes.push(`<rect x="${el.x}" y="${el.y}" width="${w}" height="${h}" ${base}/>`);
        break;
      }
      case "circle": {
        const { radius = 40 } = el.properties;
        shapes.push(`<circle cx="${el.x}" cy="${el.y}" r="${radius}" ${base}/>`);
        break;
      }
      case "arc": {
        const { radius = 40, startAngle = 0, endAngle = 180 } = el.properties;
        const toRad = (d: number) => (d * Math.PI) / 180;
        const sx = el.x + radius * Math.cos(toRad(startAngle));
        const sy = el.y + radius * Math.sin(toRad(startAngle));
        const ex = el.x + radius * Math.cos(toRad(endAngle));
        const ey = el.y + radius * Math.sin(toRad(endAngle));
        const large = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
        shapes.push(`<path d="M${sx},${sy} A${radius},${radius} 0 ${large},1 ${ex},${ey}" ${base}/>`);
        break;
      }
      case "dimension": {
        const { x2 = el.x + 100, y2 = el.y, text: dimText } = el.properties;
        const markId = `arr_${el.id}`;
        markers.add(arrowMarker(markId, color));
        const label = dimText ?? "";
        const mx = (el.x + x2) / 2, my = (el.y + y2) / 2 - 8;
        shapes.push(
          `<line x1="${el.x}" y1="${el.y}" x2="${x2}" y2="${y2}" ${base} marker-start="url(#${markId})" marker-end="url(#${markId})"/>`,
          label ? `<text x="${mx}" y="${my}" font-family="Arial,sans-serif" font-size="11" fill="${color}" text-anchor="middle">${label}</text>` : "",
        );
        break;
      }
      case "text": {
        const { text: txt = "", fontSize = 12, angle = 0 } = el.properties;
        const textColor = el.style.strokeColor || "#000";
        const rotate = angle !== 0 ? ` transform="rotate(${(angle * 180) / Math.PI},${el.x},${el.y})"` : "";
        shapes.push(
          `<text x="${el.x}" y="${el.y}" font-family="Arial,sans-serif" font-size="${fontSize}" fill="${textColor}"${rotate}>${txt}</text>`,
        );
        break;
      }
      case "polyline": {
        const { points = [] } = el.properties;
        if (Array.isArray(points) && points.length > 0) {
          const pts = [[el.x, el.y], ...points].map(([px, py]: number[]) => `${px},${py}`).join(" ");
          shapes.push(`<polyline points="${pts}" ${base}/>`);
        }
        break;
      }
    }
  }

  // Title block border (bottom strip)
  const titleBlock = `
  <rect x="20" y="${H - 70}" width="${W - 40}" height="50" stroke="#555" stroke-width="0.8" fill="none"/>
  <line x1="${W - 340}" y1="${H - 70}" x2="${W - 340}" y2="${H - 20}" stroke="#555" stroke-width="0.8"/>
  <line x1="${W - 200}" y1="${H - 70}" x2="${W - 200}" y2="${H - 20}" stroke="#555" stroke-width="0.8"/>
  <text x="30" y="${H - 48}" font-family="Arial,sans-serif" font-size="11" fill="#333" font-weight="bold">${data.title}</text>
  <text x="30" y="${H - 30}" font-family="Arial,sans-serif" font-size="9" fill="#555">${data.description.slice(0, 100)}</text>
  <text x="${W - 335}" y="${H - 48}" font-family="Arial,sans-serif" font-size="9" fill="#555">Scale: 1:1</text>
  <text x="${W - 335}" y="${H - 30}" font-family="Arial,sans-serif" font-size="9" fill="#555">Date: ${today}</text>
  <text x="${W - 195}" y="${H - 48}" font-family="Arial,sans-serif" font-size="9" fill="#555">New Dimensions / Sirius AI</text>`;

  const defs = markers.size > 0 ? `<defs>${[...markers].join("\n")}</defs>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#1a1a2e"/>
  <rect x="10" y="10" width="${W - 20}" height="${H - 20}" stroke="#444" stroke-width="1" fill="none"/>
  ${defs}
  ${shapes.filter(Boolean).join("\n  ")}
  ${titleBlock}
</svg>`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateAndPostCadDrawing(
  projectId: number,
  ndProjectId: string,
  projectName: string,
  description: string,
): Promise<void> {
  console.log(`[CAD Auto-Gen] ⚙ Starting for "${projectName}" (ND #${ndProjectId})`);

  try {
    const ndBase = ND_BASE_URL();
    const apiKey = ND_API_KEY();
    const ndHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) { ndHeaders["Authorization"] = `Bearer ${apiKey}`; ndHeaders["X-API-Key"] = apiKey; }

    // 1. Call New Dimensions AI engine
    const genRes = await fetch(`${ndBase}/api/ai/generate`, {
      method: "POST",
      headers: ndHeaders,
      body: JSON.stringify({ description }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!genRes.ok) {
      const errText = await genRes.text();
      throw new Error(`ND /api/ai/generate failed: ${genRes.status} ${errText.slice(0, 200)}`);
    }

    const drawingData = await genRes.json() as NdDrawingData;
    console.log(`[CAD Auto-Gen] ✅ ND generated drawing: "${drawingData.title}" (${drawingData.elements.length} elements)`);

    // 2. Save structured drawing to New Dimensions so it renders in the ND canvas
    const ndDrawRes = await fetch(`${ndBase}/api/projects/${ndProjectId}/drawings`, {
      method: "POST",
      headers: ndHeaders,
      body: JSON.stringify({
        name: `${projectName} — Technical Drawing`,
        elements: drawingData.elements,
        layers: drawingData.layers,
        description: drawingData.description,
      }),
    });

    if (!ndDrawRes.ok) {
      const errText = await ndDrawRes.text();
      console.warn(`[CAD Auto-Gen] ⚠ ND drawing save failed: ${ndDrawRes.status} ${errText.slice(0, 200)}`);
    } else {
      const saved = await ndDrawRes.json() as any;
      console.log(`[CAD Auto-Gen] ✅ Drawing saved to New Dimensions (drawing #${saved.id})`);
    }

    // 3. Convert structured elements to SVG programmatically
    const svgContent = elementsToSvg(drawingData);
    const svgBuffer  = Buffer.from(svgContent, "utf-8");

    // 4. Upload SVG to object storage
    const uploadURL  = await storage.getObjectEntityUploadURL();
    const objectPath = storage.normalizeObjectEntityPath(uploadURL);
    await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": "image/svg+xml" },
      body: svgBuffer,
    });

    // 5. Store in Star Lab's cad_files
    const safeFileName = `${projectName.replace(/[^a-z0-9_\-]/gi, "_")}_drawing.svg`;
    await db.insert(cadFiles).values({
      projectId,
      fileName: safeFileName,
      fileSize: svgBuffer.length,
      fileType: "image/svg+xml",
      objectPath,
      description: `CAD drawing generated by New Dimensions AI — ${drawingData.elements.length} elements`,
    });

    // 6. Mark cad_job complete
    const [job] = await db
      .select({ id: cadJobs.id, status: cadJobs.status })
      .from(cadJobs)
      .where(eq(cadJobs.projectId, projectId))
      .orderBy(desc(cadJobs.createdAt))
      .limit(1);

    if (job && job.status === "pending") {
      await db
        .update(cadJobs)
        .set({ status: "complete", completedAt: new Date() })
        .where(eq(cadJobs.id, job.id));
    }

    // 7. Advance project to "launch-ready" if cad-pending
    const [proj] = await db
      .select({ id: labProjects.id, launchStatus: labProjects.launchStatus, name: labProjects.name })
      .from(labProjects)
      .where(eq(labProjects.id, projectId))
      .limit(1);

    if (proj?.launchStatus === "cad-pending") {
      await db
        .update(labProjects)
        .set({ launchStatus: "launch-ready", updatedAt: new Date() })
        .where(eq(labProjects.id, projectId));
      console.log(`[CAD Auto-Gen] ✅ "${proj.name}" → LAUNCH READY`);
    }

    console.log(`[CAD Auto-Gen] ✅ Complete — "${projectName}" drawing stored (${svgBuffer.length} bytes)`);

  } catch (err: any) {
    console.error(`[CAD Auto-Gen] ❌ Failed for "${projectName}":`, err.message);
    try {
      const [job] = await db
        .select({ id: cadJobs.id, status: cadJobs.status })
        .from(cadJobs)
        .where(eq(cadJobs.projectId, projectId))
        .orderBy(desc(cadJobs.createdAt))
        .limit(1);
      if (job && job.status === "pending") {
        await db
          .update(cadJobs)
          .set({ status: "error", errorMessage: `Auto-gen failed: ${err.message}`, completedAt: new Date() })
          .where(eq(cadJobs.id, job.id));
      }
    } catch { /* ignore */ }
  }
}
