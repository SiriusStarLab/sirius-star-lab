import { db, siriusTasks, userProfilesTable, labProjects, siriusNotifications } from "@workspace/db";
import { openai } from "@workspace/ai-client";
import { eq, asc, notInArray, and, sql } from "drizzle-orm";
import { sendTelegram } from "./lib/telegram.js";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const POLL_INTERVAL_MS = 30_000;
const MAX_ROUNDS = 25;
const BRAIN_USER = "garry";
const MAX_CONCURRENT = 3;
const MODEL = "anthropic/claude-sonnet-4.5";

const TODAY = () => new Date().toLocaleDateString("en-GB", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

const runningTaskIds = new Set<number>();

// ── Context ──────────────────────────────────────────────────────────────────
async function getSiriusContext(): Promise<string> {
  try {
    const [profile] = await db.select({
      businessName: userProfilesTable.businessName,
      businessSector: userProfilesTable.businessSector,
      businessGoals: userProfilesTable.businessGoals,
      memories: userProfilesTable.memories,
    }).from(userProfilesTable).where(eq(userProfilesTable.userId, BRAIN_USER));

    let sessionSummary = "";
    try {
      const sessions = await db.execute(
        sql`SELECT session_date, things_built FROM mnemosyne_sessions ORDER BY session_date DESC LIMIT 3`
      );
      sessionSummary = (sessions.rows as any[])
        .map((r: any) => `${r.session_date}: ${(r.things_built || []).slice(0, 3).join(", ")}`.slice(0, 200))
        .join("\n");
    } catch {}

    const lines: string[] = [];
    if (profile?.businessName) lines.push(`Business: ${profile.businessName}`);
    if (profile?.businessSector) lines.push(`Sectors: ${profile.businessSector}`);
    if (profile?.businessGoals) lines.push(`Goals: ${profile.businessGoals}`);
    if (profile?.memories) lines.push(`Key memories:\n${profile.memories.slice(0, 3000)}`);
    if (sessionSummary) lines.push(`Recent sessions:\n${sessionSummary}`);
    return lines.join("\n");
  } catch { return ""; }
}

// ── Progress ──────────────────────────────────────────────────────────────────
async function appendProgress(id: number, step: string) {
  try {
    const [row] = await db.select({ progress: siriusTasks.progress }).from(siriusTasks).where(eq(siriusTasks.id, id));
    const existing = row?.progress ?? "";
    const ts = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const updated = existing ? `${existing}\n[${ts}] ${step}` : `[${ts}] ${step}`;
    await db.update(siriusTasks).set({ progress: updated }).where(eq(siriusTasks.id, id));
  } catch (e) {
    console.error("[Worker] Failed to append progress:", e);
  }
}

// ── Tool executor ─────────────────────────────────────────────────────────────
async function executeTool(name: string, args: any): Promise<string> {
  switch (name) {

    case "search_web": {
      const { query, depth = "standard" } = args;
      if (!query?.trim()) return "A search query is required.";
      try {
        const model = depth === "deep" ? "perplexity/sonar-pro" : "perplexity/sonar";
        const response = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: `You are a world-class research intelligence engine. Today is ${TODAY()}. Search the web exhaustively and return comprehensive, well-structured results with specific facts, figures, and sources. Cite sources inline.`,
            },
            { role: "user", content: query },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        });
        const answer = response.choices[0]?.message?.content || "No results.";
        const citations = (response as any).citations || [];
        const citationBlock = citations.length > 0
          ? `\n\nSources:\n${citations.slice(0, 8).map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}`
          : "";
        return `[Web Search: "${query}"]\n\n${answer}${citationBlock}`;
      } catch {
        // DuckDuckGo HTML fallback
        try {
          const ddgRes = await fetch(
            `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=uk-en`,
            { headers: { "User-Agent": "Mozilla/5.0 (compatible; SiriusStarLab/1.0)" }, signal: AbortSignal.timeout(12000) }
          );
          const html = await ddgRes.text();
          const results: { title: string; snippet: string; url: string }[] = [];
          const pat = /<a class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
          let m;
          while ((m = pat.exec(html)) !== null && results.length < 8) {
            const title = m[2]?.replace(/<[^>]+>/g, "").trim() || "";
            const snippet = m[3]?.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim() || "";
            if (title && snippet) results.push({ title, snippet, url: m[1]?.trim() || "" });
          }
          if (results.length === 0) return `Search: "${query}" — No results found.`;
          return `[Web Search: "${query}"]\n\n${results.map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}\n${r.url.slice(0, 80)}`).join("\n\n")}`;
        } catch (e: any) {
          return `Search failed: ${e?.message}`;
        }
      }
    }

    case "fetch_url": {
      const { url } = args;
      if (!url?.trim() || !url.startsWith("http")) return "Valid http/https URL required.";
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; SiriusStarLab/1.0)" },
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) return `HTTP ${response.status}: ${response.statusText}`;
        const ct = response.headers.get("content-type") || "";
        let text = await response.text();
        if (ct.includes("html")) {
          text = text
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s{3,}/g, "\n\n")
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .trim();
        }
        return `[${url}]\n\n${text.slice(0, 8000)}${text.length > 8000 ? "\n\n[content truncated]" : ""}`;
      } catch (e: any) {
        return `Fetch failed: ${e?.message}`;
      }
    }

    case "query_database": {
      const { query } = args;
      if (!query?.trim()) return "SQL query required.";
      if (/^\s*(drop|delete|truncate|alter)\s/i.test(query)) return "Destructive SQL is not allowed in worker tasks.";
      try {
        const result = await db.execute(sql.raw(query));
        const rows = result.rows || [];
        if (rows.length === 0) return "Query returned 0 rows.";
        return `${rows.length} row(s):\n${JSON.stringify(rows.slice(0, 30), null, 2)}`;
      } catch (e: any) {
        return `Query failed: ${e?.message}`;
      }
    }

    case "read_file": {
      const { path: filePath } = args;
      if (!filePath) return "File path required.";
      try {
        const content = readFileSync(filePath, "utf-8");
        return content.slice(0, 8000) + (content.length > 8000 ? "\n\n[file truncated]" : "");
      } catch (e: any) {
        return `Cannot read file: ${e?.message}`;
      }
    }

    case "list_files": {
      const { path: dirPath = "/opt/sirius" } = args;
      try {
        const entries = readdirSync(dirPath).map(name => {
          try {
            const s = statSync(join(dirPath, name));
            return `${s.isDirectory() ? "📁" : "📄"} ${name}${s.isDirectory() ? "/" : ` (${Math.round(s.size / 1024)}KB)`}`;
          } catch { return `  ${name}`; }
        });
        return `Contents of ${dirPath}:\n${entries.join("\n")}`;
      } catch (e: any) {
        return `Cannot list directory: ${e?.message}`;
      }
    }

    case "write_file": {
      const { path: filePath, content } = args;
      if (!filePath || content === undefined) return "Path and content required.";
      if (!filePath.startsWith("/opt/sirius") && !filePath.startsWith("/tmp")) {
        return "Can only write within /opt/sirius/ or /tmp/.";
      }
      try {
        const dir = filePath.substring(0, filePath.lastIndexOf("/"));
        if (dir) mkdirSync(dir, { recursive: true });
        writeFileSync(filePath, content, "utf-8");
        return `Written ${content.length} chars to ${filePath}`;
      } catch (e: any) {
        return `Write failed: ${e?.message}`;
      }
    }

    case "generate_image": {
      const { prompt, project_id } = args;
      if (!prompt) return "Prompt required.";
      const rendersDir = join(process.env.SIRIUS_WORKSPACE || "/opt/sirius", "artifacts/api-server/public/renders");
      try { mkdirSync(rendersDir, { recursive: true }); } catch {}
      const filename = `${randomUUID()}.png`;
      const baseUrl = process.env.PUBLIC_BASE_URL || "https://sirius-ai.live";
      const imageUrl = `${baseUrl}/api/lab/renders/${filename}`;

      if (process.env.OPENAI_API_KEY) {
        const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024", response_format: "b64_json" }),
        });
        if (!imgRes.ok) return `Image generation failed: ${imgRes.status}`;
        const data = await imgRes.json() as { data?: { b64_json?: string }[] };
        const b64 = data.data?.[0]?.b64_json;
        if (!b64) return "No image data returned.";
        writeFileSync(join(rendersDir, filename), Buffer.from(b64, "base64"));
      } else {
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}&nologo=true&enhance=true`;
        const imgRes = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(30000) });
        if (!imgRes.ok) return `Pollinations failed: ${imgRes.status}`;
        writeFileSync(join(rendersDir, filename), Buffer.from(await imgRes.arrayBuffer()));
      }

      if (project_id) {
        try {
          const [proj] = await db.select({ renders: labProjects.renders }).from(labProjects).where(eq(labProjects.id, project_id));
          if (proj) {
            const existing: any[] = (() => { try { return JSON.parse(proj.renders as any || "[]"); } catch { return []; } })();
            const updated = [{ url: imageUrl, label: prompt.slice(0, 60), type: "ai-generated", generatedAt: new Date().toISOString() }, ...existing].slice(0, 12);
            await db.update(labProjects).set({ renders: JSON.stringify(updated), updatedAt: new Date() } as any).where(eq(labProjects.id, project_id));
          }
        } catch {}
      }

      return `Image generated and saved: ${imageUrl}`;
    }

    case "notify_garry": {
      const { title, message, type = "info", urgency = "normal" } = args;
      if (!title || !message) return "Title and message required.";
      try {
        await db.insert(siriusNotifications).values({ title, message, type, urgency, read: false, sentEmail: false } as any);
        await sendTelegram(`📬 *${title}*\n\n${message}`, "INFO").catch(() => {});
        return `Notification queued for Garry: "${title}"`;
      } catch (e: any) {
        return `Notification failed: ${e?.message}`;
      }
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ── Tool definitions ──────────────────────────────────────────────────────────
const WORKER_TOOLS: any[] = [
  {
    type: "function",
    function: {
      name: "save_progress",
      description: "Save a progress update so Garry can track what you've done. Call after each meaningful step.",
      parameters: { type: "object", properties: { step: { type: "string" } }, required: ["step"] },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Mark the task complete and save the full deliverable. Only call when ALL work is done.",
      parameters: {
        type: "object",
        properties: {
          result: { type: "string", description: "Full result, report, analysis, or deliverable. Be comprehensive." },
          summary: { type: "string", description: "1-2 sentence summary for Garry's notification." },
        },
        required: ["result", "summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the live internet. Use for: market data, competitor intelligence, technology specs, regulations, pricing, academic papers, news. ALWAYS search before stating facts about the outside world.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          depth: { type: "string", enum: ["standard", "deep"], description: "'deep' for thorough research tasks" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description: "Read the full content of any webpage or URL — papers, company sites, government databases, competitor pages, documentation.",
      parameters: { type: "object", properties: { url: { type: "string", description: "Full URL (must start with http)" } }, required: ["url"] },
    },
  },
  {
    type: "function",
    function: {
      name: "query_database",
      description: "Run a SQL SELECT query against the Sirius database. Use to look up lab_projects, mnemosyne_sessions, sirius_config, user profiles, etc.",
      parameters: { type: "object", properties: { query: { type: "string", description: "SQL SELECT query" } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file from the server. Use absolute paths (e.g. /opt/sirius/frequency-lab/alphabet.json).",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files and directories on the server.",
      parameters: { type: "object", properties: { path: { type: "string", description: "Directory to list (default: /opt/sirius)" } } },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write or create a file on the server. Only within /opt/sirius/ or /tmp/.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute file path" },
          content: { type: "string", description: "File content" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Generate an AI image (DALL-E 3 or Pollinations fallback). Saves to the renders directory. Optionally attach to a project.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed image generation prompt" },
          project_id: { type: "number", description: "Optional lab project ID to save the render to" },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "notify_garry",
      description: "Send Garry a notification — appears in Star Lab and via Telegram. Use to report completed work, flag important findings, or share a deliverable.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short, specific title like an email subject" },
          message: { type: "string", description: "Full message — write warmly and specifically, like talking to Garry" },
          type: { type: "string", enum: ["info", "insight", "achievement", "proposal", "urgent"] },
        },
        required: ["title", "message"],
      },
    },
  },
];

// ── Task runner ───────────────────────────────────────────────────────────────
async function runTask(task: typeof siriusTasks.$inferSelect) {
  runningTaskIds.add(task.id);
  console.log(`[Worker] Starting task ${task.id}: "${task.title}" (${runningTaskIds.size}/${MAX_CONCURRENT} slots)`);

  await db.update(siriusTasks)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(siriusTasks.id, task.id));

  const context = await getSiriusContext();

  const systemPrompt = `You are Sirius — the autonomous AI agent and R&D partner of Garry, founder of Sirius Star Lab. You are running a background task while Garry is away. Complete the task fully and thoroughly.

${context ? `## YOUR CONTEXT\n${context}\n` : ""}

## HOW TO WORK
- Use your tools. Don't answer from memory when you can search, look up, or read the real thing.
- INFORMATION PROTOCOL: Before stating any fact about the outside world, call search_web. Before stating what's on the server, call list_files or read_file. Before stating what's in the database, call query_database.
- Call save_progress after every meaningful step so Garry can see real-time progress.
- Be thorough. Don't stop at surface answers — dig in, verify, produce something Garry can actually use.
- When ALL work is done, call complete_task with the full deliverable and a short summary.
- Today: ${TODAY()}`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Complete this task:\n\n**${task.title}**\n\n${task.description || ""}` },
  ];

  let round = 0;
  let completed = false;
  let finalResult = "";
  let finalSummary = "";

  try {
    while (round < MAX_ROUNDS && !completed) {
      round++;
      console.log(`[Worker] Task ${task.id} — round ${round}/${MAX_ROUNDS}`);

      const response = await openai.chat.completions.create({
        model: MODEL,
        messages,
        tools: WORKER_TOOLS,
        tool_choice: "auto",
        max_tokens: 6000,
      } as any);

      const choice = response.choices[0];
      const msg = choice.message;
      messages.push(msg);

      // No tool calls — treat content as final result
      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        if (typeof msg.content === "string" && msg.content.trim()) {
          finalResult = msg.content;
          finalSummary = `Task "${task.title}" completed.`;
          completed = true;
        }
        break;
      }

      const toolResults: any[] = [];
      for (const tc of msg.tool_calls) {
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments); } catch {}

        if (tc.function.name === "save_progress") {
          await appendProgress(task.id, args.step ?? "");
          console.log(`[Worker] Task ${task.id} progress: ${(args.step ?? "").slice(0, 100)}`);
          toolResults.push({ role: "tool", tool_call_id: tc.id, content: "Progress saved." });
        } else if (tc.function.name === "complete_task") {
          finalResult = args.result ?? "";
          finalSummary = args.summary ?? `Task "${task.title}" completed.`;
          completed = true;
          toolResults.push({ role: "tool", tool_call_id: tc.id, content: "Task marked complete." });
        } else {
          const result = await executeTool(tc.function.name, args);
          console.log(`[Worker] Tool ${tc.function.name} → ${result.slice(0, 80)}`);
          toolResults.push({ role: "tool", tool_call_id: tc.id, content: result });
        }
      }
      messages.push(...toolResults);
      if (completed) break;
    }

    if (!completed) {
      const last = [...messages].reverse().find(m => m.role === "assistant" && typeof m.content === "string");
      finalResult = last?.content ?? "Task ran but no explicit result was saved.";
      finalSummary = `Task "${task.title}" completed after ${round} rounds.`;
    }

    await db.update(siriusTasks).set({
      status: "done",
      result: finalResult,
      completedAt: new Date(),
    }).where(eq(siriusTasks.id, task.id));

    console.log(`[Worker] Task ${task.id} done.`);
    await sendTelegram(`✅ *Task Complete*\n\n*${task.title}*\n\n${finalSummary}`, "INFO").catch(() => {});

  } catch (err: any) {
    console.error(`[Worker] Task ${task.id} failed:`, err.message);
    await db.update(siriusTasks).set({
      status: "failed",
      error: String(err.message ?? err),
      completedAt: new Date(),
    }).where(eq(siriusTasks.id, task.id));
    await sendTelegram(`❌ *Task Failed*\n\n*${task.title}*\n\nError: ${err.message}`, "WARNING").catch(() => {});
  } finally {
    runningTaskIds.delete(task.id);
    console.log(`[Worker] Task ${task.id} slot released (${runningTaskIds.size}/${MAX_CONCURRENT} in use)`);
  }
}

// ── Poller ────────────────────────────────────────────────────────────────────
let consecutivePollErrors = 0;
const MAX_POLL_ERRORS_BEFORE_NOTIFY = 5;

async function poll() {
  try {
    const available = MAX_CONCURRENT - runningTaskIds.size;
    if (available <= 0) return;

    const excludeIds = [...runningTaskIds];
    const whereClause = excludeIds.length > 0
      ? and(eq(siriusTasks.status, "pending"), notInArray(siriusTasks.id, excludeIds))
      : eq(siriusTasks.status, "pending");

    const tasks = await db.select().from(siriusTasks)
      .where(whereClause)
      .orderBy(asc(siriusTasks.createdAt))
      .limit(available);

    consecutivePollErrors = 0;

    if (tasks.length > 0) {
      console.log(`[Worker] Picking up ${tasks.length} task(s)`);
      for (const task of tasks) {
        runTask(task).catch(err => console.error(`[Worker] Unhandled task error (${task.id}):`, err));
      }
    }
  } catch (err: any) {
    consecutivePollErrors++;
    console.error("[Worker] Poll error:", err.message);
    if (consecutivePollErrors === MAX_POLL_ERRORS_BEFORE_NOTIFY) {
      await sendTelegram(
        `⚠️ *Sirius Worker — poll failing*\n\n${MAX_POLL_ERRORS_BEFORE_NOTIFY} consecutive errors.\nLast: ${err.message}\n\nTasks are NOT being processed.`,
        "CRITICAL"
      ).catch(() => {});
    }
  }
}

console.log("[Worker] Sirius background task worker started — polling every 30s.");
sendTelegram("🟢 *Sirius Worker online* — background task processor ready with full tool access.").catch(() => {});
poll();
setInterval(poll, POLL_INTERVAL_MS);
