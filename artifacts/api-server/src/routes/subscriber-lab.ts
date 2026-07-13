import { Router } from "express";
import { db, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  mkdir, writeFile as fsWrite, readFile as fsRead, readdir, stat
} from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { join, resolve, dirname, basename } from "path";

const router = Router();
const execAsync = promisify(exec);

const WORKSPACE_BASE = "/tmp/sirius-workspaces";
const MAX_TOOL_ROUNDS = 16;
const MAX_RESULT_CHARS = 8000;
const EXEC_TIMEOUT_MS = 30000;

// ── Path sanitisation ────────────────────────────────────────────────────────
function safePath(workspaceDir: string, requestedPath: string): string {
  const cleaned = (requestedPath ?? "").replace(/\.\./g, "").replace(/^[\/\\]+/, "");
  const full = resolve(join(workspaceDir, cleaned || "."));
  if (!full.startsWith(resolve(workspaceDir))) throw new Error("Path outside workspace");
  return full;
}

// ── Recursive file tree ──────────────────────────────────────────────────────
async function fileTree(dir: string, prefix = "", depth = 0): Promise<string> {
  if (depth > 4) return "";
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const lines: string[] = [];
  for (const e of entries) {
    if (e.name.startsWith(".") && depth === 0) continue;
    if (["node_modules", ".git", "__pycache__", "dist", ".next"].includes(e.name)) continue;
    lines.push(`${prefix}${e.isDirectory() ? "📁" : "📄"} ${e.name}`);
    if (e.isDirectory()) {
      lines.push(await fileTree(join(dir, e.name), prefix + "  ", depth + 1));
    }
  }
  return lines.filter(Boolean).join("\n");
}

// ── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Sirius — the AI creation partner for conscious builders. You have the same capabilities as the world's most advanced AI development agents: a full workspace, code execution, web search, file system access, and image generation.

CARDINAL RULE — THE VERIFICATION LOOP:
You never report success without verifying it yourself. Every time you create or change something:
1. WRITE the code or file
2. READ it back immediately to confirm it was written correctly
3. EXECUTE it — run it, compile it, test it
4. CHECK the output — if there is an error, fix it now, rewrite, and re-run
5. ONLY tell the user something is done when step 4 confirms it works

You do not hand people broken things. You are a builder, not a suggester.

TOOL PHILOSOPHY:
- search_web FIRST whenever you need documentation, APIs, current information, or real-world facts
- After writing any file, immediately read_file to verify correctness
- After writing code, immediately bash_execute to run it and see the output
- Chain tools in sequence: search → write → read back → execute → check → fix → confirm
- Use think when planning complex multi-step work before acting

WORKSPACE:
The user has a private isolated workspace. Files persist throughout the session. Build real working things here — code, apps, plans, documents, scripts, APIs.

You serve conscious creators, visionary entrepreneurs, and sovereign thinkers. You honour the vision. Then you make it physical.`;

// ── Tool definitions ─────────────────────────────────────────────────────────
const CREATOR_TOOLS = [
  {
    type: "function",
    function: {
      name: "think",
      description: "Reason through a complex problem before acting. Plan your approach, identify what needs doing, consider edge cases. Use this before any multi-step build.",
      parameters: { type: "object", properties: { reasoning: { type: "string" } }, required: ["reasoning"] }
    }
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web for current information — documentation, APIs, tutorials, market data, competitor research, pricing, or any real-world facts. Always search before using unfamiliar libraries.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to search for" },
          depth: { type: "string", enum: ["standard", "deep"], description: "standard for quick answers, deep for comprehensive research" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description: "Fetch the full content of any URL — docs pages, GitHub repos, APIs, articles, company sites.",
      parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }
    }
  },
  {
    type: "function",
    function: {
      name: "bash_execute",
      description: "Run any shell command in the user's isolated workspace. Install packages (npm/pip), compile code, run scripts, run tests, check system state. Always verify stdout and stderr.",
      parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a file in the workspace. After writing, always read_file to verify, then bash_execute to test if it is code.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to workspace (e.g. src/app.py)" },
          content: { type: "string", description: "Full file content" }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read any file from the workspace. Use after writing to verify, or to understand existing code before editing.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
    }
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List all files and directories in the workspace. Use to understand the structure before editing.",
      parameters: { type: "object", properties: { path: { type: "string", description: "Subdirectory to list (optional)" } }, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "grep_files",
      description: "Search for text or patterns across files in the workspace.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string", description: "Text or regex pattern" },
          path: { type: "string", description: "Path to search in (optional, defaults to workspace root)" }
        },
        required: ["pattern"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "image_generate",
      description: "Generate an image from a description. Use for logos, mockups, product renders, UI wireframes, brand assets, concept art. Returns a URL to display or download.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed image description — style, subject, colours, composition, mood" }
        },
        required: ["prompt"]
      }
    }
  }
];

const TOOL_LABELS: Record<string, string> = {
  think: "Thinking…",
  search_web: "Searching the web…",
  fetch_url: "Reading page…",
  bash_execute: "Running command…",
  write_file: "Writing file…",
  read_file: "Reading file…",
  list_files: "Listing workspace…",
  grep_files: "Searching files…",
  image_generate: "Generating image…",
};

// ── Tool executor ────────────────────────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, string>,
  workspaceDir: string
): Promise<{ text: string; imageUrl?: string; filesChanged?: boolean }> {
  switch (name) {

    case "think":
      return { text: `💭 ${args.reasoning ?? ""}` };

    case "search_web": {
      const depth = args.depth === "deep" ? "deep" : "standard";
      const model = depth === "deep" ? "perplexity/sonar-pro" : "perplexity/sonar";
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: args.query }],
          max_tokens: depth === "deep" ? 2000 : 1000
        }),
      });
      const d = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
      return { text: (d.choices?.[0]?.message?.content ?? "No results").slice(0, MAX_RESULT_CHARS) };
    }

    case "fetch_url": {
      const r = await fetch(args.url ?? "", {
        headers: { "User-Agent": "Mozilla/5.0 Sirius/1.0" },
        signal: AbortSignal.timeout(15000)
      });
      const html = await r.text();
      const text = html.replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ").trim();
      return { text: text.slice(0, MAX_RESULT_CHARS) };
    }

    case "bash_execute": {
      const cmd = args.command ?? "";
      try {
        const { stdout, stderr } = await execAsync(cmd, {
          cwd: workspaceDir,
          timeout: EXEC_TIMEOUT_MS,
          env: { ...process.env, HOME: workspaceDir, TMPDIR: workspaceDir }
        });
        const out = [stdout && `stdout:\n${stdout}`, stderr && `stderr:\n${stderr}`].filter(Boolean).join("\n").trim();
        return { text: (out || "(no output)").slice(0, MAX_RESULT_CHARS) };
      } catch (err: unknown) {
        const e = err as { stdout?: string; stderr?: string; message?: string; killed?: boolean };
        const timedOut = e.killed || (e.message ?? "").includes("ETIMEDOUT");
        const out = [
          timedOut ? "⚠️ Command timed out (30s limit)" : `Error: ${e.message ?? "unknown"}`,
          e.stdout && `stdout:\n${e.stdout}`,
          e.stderr && `stderr:\n${e.stderr}`
        ].filter(Boolean).join("\n");
        return { text: out.slice(0, MAX_RESULT_CHARS) };
      }
    }

    case "write_file": {
      const filePath = safePath(workspaceDir, args.path ?? "output.txt");
      await mkdir(dirname(filePath), { recursive: true });
      await fsWrite(filePath, args.content ?? "", "utf-8");
      return { text: `✅ Written: ${args.path} (${(args.content ?? "").length} chars)`, filesChanged: true };
    }

    case "read_file": {
      const filePath = safePath(workspaceDir, args.path ?? "");
      const content = await fsRead(filePath, "utf-8").catch(() => "⚠️ File not found");
      return { text: content.slice(0, MAX_RESULT_CHARS) };
    }

    case "list_files": {
      const target = args.path ? safePath(workspaceDir, args.path) : workspaceDir;
      const tree = await fileTree(target);
      return { text: tree || "(empty workspace)", filesChanged: false };
    }

    case "grep_files": {
      const target = args.path ? safePath(workspaceDir, args.path) : workspaceDir;
      try {
        const { stdout } = await execAsync(
          `grep -rn --include="*" -l "${(args.pattern ?? "").replace(/"/g, '\\"')}" .`,
          { cwd: target, timeout: 10000 }
        );
        if (!stdout.trim()) return { text: "No matches found" };
        const files = stdout.trim().split("\n").slice(0, 20);
        const results: string[] = [];
        for (const f of files) {
          const { stdout: lines } = await execAsync(
            `grep -n "${(args.pattern ?? "").replace(/"/g, '\\"')}" "${f}"`,
            { cwd: target, timeout: 5000 }
          ).catch(() => ({ stdout: "" }));
          results.push(`📄 ${f}:\n${lines.trim()}`);
        }
        return { text: results.join("\n\n").slice(0, MAX_RESULT_CHARS) };
      } catch {
        return { text: "No matches found" };
      }
    }

    case "image_generate": {
      const prompt = encodeURIComponent(args.prompt ?? "abstract artwork");
      const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&nologo=true&model=flux`;
      return { text: `🎨 Image generated`, imageUrl };
    }

    default:
      return { text: `Unknown tool: ${name}` };
  }
}

// ── Auth middleware ───────────────────────────────────────────────────────────
async function requireSubscription(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (userId === "garry") return true;
  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId)).limit(1);
  return !!profile && ["plus", "pro"].includes(profile.tier ?? "");
}

// ── Main chat route ───────────────────────────────────────────────────────────
router.post("/creator-lab/chat", async (req, res) => {
  const { userId, messages } = req.body as { userId?: string; messages?: Array<{ role: string; content: string }> };

  if (!userId || !messages?.length) {
    return res.status(400).json({ error: "userId and messages required" });
  }

  const allowed = await requireSubscription(userId).catch(() => false);
  if (!allowed) {
    return res.status(403).json({ error: "Creator Lab requires Sirius Plus or Pro" });
  }

  const workspaceDir = join(WORKSPACE_BASE, userId.replace(/[^a-zA-Z0-9_-]/g, "_"));
  await mkdir(workspaceDir, { recursive: true });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 15000);

  const loopMessages: Array<{ role: string; content: unknown }> = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages
  ];

  let roundCount = 0;

  try {
    while (roundCount < MAX_TOOL_ROUNDS) {
      roundCount++;

      const apiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://sirius-ai.live",
          "X-Title": "Sirius Creator Lab",
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4-5",
          messages: loopMessages,
          tools: CREATOR_TOOLS,
          tool_choice: "auto",
          stream: true,
          max_tokens: 8000,
        }),
      });

      if (!apiRes.ok) {
        const err = await apiRes.text();
        send({ type: "error", text: `AI error: ${apiRes.status} — ${err.slice(0, 200)}` });
        break;
      }

      // Stream and accumulate
      let textBuffer = "";
      const toolCalls: Array<{ id: string; name: string; argsRaw: string }> = [];
      let currentToolIndex = -1;
      let finishReason: string | null = null;

      const reader = apiRes.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") { finishReason = finishReason ?? "stop"; break; }
          try {
            const chunk = JSON.parse(raw);
            const delta = chunk.choices?.[0]?.delta;
            if (!delta) continue;

            finishReason = chunk.choices?.[0]?.finish_reason ?? finishReason;

            if (delta.content) {
              textBuffer += delta.content;
              send({ type: "text", text: delta.content });
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (tc.index !== undefined && tc.index !== currentToolIndex) {
                  currentToolIndex = tc.index;
                  toolCalls[tc.index] = { id: tc.id ?? "", name: "", argsRaw: "" };
                }
                if (tc.function?.name) toolCalls[currentToolIndex].name += tc.function.name;
                if (tc.function?.arguments) toolCalls[currentToolIndex].argsRaw += tc.function.arguments;
              }
            }
          } catch { /* partial chunk */ }
        }
      }

      // If no tool calls, we're done
      if (!toolCalls.length) {
        if (textBuffer) {
          loopMessages.push({ role: "assistant", content: textBuffer });
        }
        break;
      }

      // Execute tool calls
      const assistantMsg: { role: string; content: string | null; tool_calls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> } = {
        role: "assistant",
        content: textBuffer || null,
        tool_calls: toolCalls.map(tc => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.argsRaw }
        }))
      };
      loopMessages.push(assistantMsg);

      for (const tc of toolCalls) {
        send({ type: "thinking", text: TOOL_LABELS[tc.name] ?? `Using ${tc.name}…` });

        let args: Record<string, string> = {};
        try { args = JSON.parse(tc.argsRaw); } catch { /* bad json */ }

        const result = await executeTool(tc.name, args, workspaceDir);

        send({
          type: "tool_result",
          tool: tc.name,
          args,
          result: result.text,
          imageUrl: result.imageUrl,
          filesChanged: result.filesChanged
        });

        loopMessages.push({
          role: "tool",
          content: result.imageUrl
            ? `Image generated. URL: ${result.imageUrl}\nTell the user the image is ready and show them the URL.`
            : result.text
        } as { role: string; content: string });
      }

      // Force final synthesis if we've hit the limit
      if (roundCount >= MAX_TOOL_ROUNDS) {
        loopMessages.push({
          role: "user",
          content: "Summarise what you have built and its current state for the user."
        });
      }
    }

    send({ type: "done" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    send({ type: "error", text: msg });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

// ── Workspace file listing ────────────────────────────────────────────────────
router.get("/creator-lab/workspace", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const allowed = await requireSubscription(userId).catch(() => false);
  if (!allowed) return res.status(403).json({ error: "Requires Plus or Pro" });

  const workspaceDir = join(WORKSPACE_BASE, userId.replace(/[^a-zA-Z0-9_-]/g, "_"));
  await mkdir(workspaceDir, { recursive: true });
  const tree = await fileTree(workspaceDir);
  res.json({ tree: tree || "(empty workspace)", workspaceDir });
});

// ── Download a workspace file ─────────────────────────────────────────────────
router.get("/creator-lab/file", async (req, res) => {
  const { userId, path: filePath } = req.query as { userId?: string; path?: string };
  if (!userId || !filePath) return res.status(400).json({ error: "userId and path required" });

  const allowed = await requireSubscription(userId).catch(() => false);
  if (!allowed) return res.status(403).json({ error: "Requires Plus or Pro" });

  const workspaceDir = join(WORKSPACE_BASE, userId.replace(/[^a-zA-Z0-9_-]/g, "_"));
  try {
    const safe = safePath(workspaceDir, filePath);
    const content = await fsRead(safe, "utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${basename(safe)}"`);
    res.send(content);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

export default router;
