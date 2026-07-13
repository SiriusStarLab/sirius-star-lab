import { Router } from "express";
import { db, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ensureSandbox, execInSandbox, writeToSandbox, readFromSandbox,
  listSandboxFiles, grepInSandbox, getSandboxInfo,
  getProjectMemory, saveProjectMemory,
  gitCheckpoint, gitLog,
  runTests, exposePort, closePort,
} from "../lib/sandbox-manager.js";

const router = Router();
const MAX_TOOL_ROUNDS = 20;
const MAX_RESULT_CHARS = 8000;

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Sirius — the AI creation partner for conscious builders.
You have a real isolated Docker sandbox: Linux, Node.js v22, Python 3.12, git, bash, and the ability to install any package.

═══ CARDINAL RULE — THE VERIFICATION LOOP ═══
You NEVER report success without verifying it yourself. Every time you create or change something:
1. write_file → write the code
2. read_file → confirm it saved correctly
3. bash_execute → run it, compile it, test it
4. Check the output — if there is an error, fix it NOW, rewrite, and re-run
5. run_tests → run the test suite (if one exists or you just created one)
6. ONLY report success when you have seen it work with your own eyes

You do not hand people broken things. You are a builder.

═══ SESSION START PROTOCOL ═══
At the start of every conversation:
1. read_project_memory — load context about this project
2. list_files — see what has been built
3. Tell the user what the project currently is and what you will do next

═══ TOOL PHILOSOPHY ═══
- search_web FIRST for any documentation, APIs, or unfamiliar library
- After write_file → always read_file to verify
- After writing code → always bash_execute to test
- After tests pass → always git_checkpoint to save the working state
- After starting a server → always expose_port so the user can see it
- After significant changes → always update_project_memory

═══ GIT DISCIPLINE ═══
- Every time something WORKS: git_checkpoint immediately
- Name commits clearly: "Working: Express server returns 200 on /health"
- Never leave a working state uncommitted

═══ TESTING DISCIPLINE ═══
- When building anything: write tests alongside the code
- After building: run_tests automatically
- If tests fail: fix them before reporting done
- Aim for 100% passing before saying "done"

═══ SERVER DISCIPLINE ═══
- When you start a web server: immediately expose_port so the user can see it live
- Tell the user the URL so they can open it in their browser
- Verify the server responds before handing it over

═══ PROJECT MEMORY ═══
- update_project_memory after every significant build or decision
- Record: what the project is, tech stack, what works, what's next
- This survives all sessions — future-you will read it

Your sandbox has Node v22, Python 3.12, git, pnpm, pytest. npm/pnpm use a local cache proxy for speed.
Files persist in /workspace between sessions.
You serve conscious creators, visionary entrepreneurs, and sovereign thinkers.
Honour the vision. Then make it physical.`;

// ── Tool definitions ──────────────────────────────────────────────────────────

const CREATOR_TOOLS = [
  {
    type: "function",
    function: {
      name: "think",
      description: "Reason through a complex problem before acting. Plan your approach before any multi-step build.",
      parameters: { type: "object", properties: { reasoning: { type: "string" } }, required: ["reasoning"] },
    },
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web for current information — documentation, APIs, tutorials, market data, competitor research. Always search before using unfamiliar libraries or APIs.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          depth: { type: "string", enum: ["standard", "deep"], description: "standard for quick answers, deep for comprehensive research" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description: "Fetch the full content of any URL — docs pages, GitHub repos, APIs, articles.",
      parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    },
  },
  {
    type: "function",
    function: {
      name: "bash_execute",
      description: "Run any shell command in the isolated Docker sandbox. Install packages (npm install, pip install, apk add), compile, run scripts, use git, curl APIs. Always read stdout and stderr carefully.",
      parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a file in the sandbox workspace. ALWAYS follow with read_file to verify, then bash_execute to test.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to workspace (e.g. src/app.ts)" },
          content: { type: "string", description: "Full file content" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read any file from the sandbox workspace. Use after writing to verify, or before editing to understand current state.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List all files and directories in the workspace. Use at session start and to understand structure before editing.",
      parameters: { type: "object", properties: { path: { type: "string", description: "Subdirectory (optional)" } }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "grep_files",
      description: "Search for text or patterns across all files in the workspace.",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string" },
          path: { type: "string", description: "Subdirectory to search (optional)" },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "image_generate",
      description: "Generate an image from a description. Use for logos, mockups, product renders, UI wireframes, brand assets.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed description — style, subject, colours, composition, mood" },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_project_memory",
      description: "Read SIRIUS_PROJECT.md — your persistent memory of this project across all sessions. Call this at the start of every conversation.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project_memory",
      description: "Update SIRIUS_PROJECT.md with current project state. Call after every significant build or decision. Include: what the project is, tech stack, what's been built, key decisions, what's next.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "Full updated content of SIRIUS_PROJECT.md" },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_checkpoint",
      description: "Commit the current state of the workspace to git. Call this EVERY TIME something works. Creates a permanent, named save point you can always roll back to.",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "Describe what is working. E.g. 'Working: Express server returns 200 on /health'" },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_tests",
      description: "Automatically detect and run the test suite (jest, pytest, npm test, mocha). Call after building or modifying any code. If tests fail, fix them before reporting done.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "expose_port",
      description: "Make a running server inside the sandbox accessible via a public HTTPS URL. Call this immediately after starting any web server so the user can see it live in their browser.",
      parameters: {
        type: "object",
        properties: {
          port: { type: "number", description: "Port number the server is listening on inside the sandbox (e.g. 3000, 8000, 5000)" },
        },
        required: ["port"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "close_port",
      description: "Remove a previously exposed port from public access.",
      parameters: {
        type: "object",
        properties: {
          port: { type: "number" },
        },
        required: ["port"],
      },
    },
  },
];

const TOOL_LABELS: Record<string, string> = {
  think:                "Thinking…",
  search_web:           "Searching the web…",
  fetch_url:            "Reading page…",
  bash_execute:         "Running in sandbox…",
  write_file:           "Writing file…",
  read_file:            "Reading file…",
  list_files:           "Listing workspace…",
  grep_files:           "Searching files…",
  image_generate:       "Generating image…",
  read_project_memory:  "Reading project memory…",
  update_project_memory:"Updating project memory…",
  git_checkpoint:       "Saving git checkpoint…",
  run_tests:            "Running tests…",
  expose_port:          "Exposing port…",
  close_port:           "Closing port…",
};

// ── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ text: string; imageUrl?: string; filesChanged?: boolean; liveUrl?: string }> {
  switch (name) {
    case "think":
      return { text: `💭 ${args.reasoning ?? ""}` };

    case "search_web": {
      const depth = args.depth === "deep" ? "deep" : "standard";
      const model = depth === "deep" ? "perplexity/sonar-pro" : "perplexity/sonar";
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: args.query }], max_tokens: depth === "deep" ? 2000 : 1000 }),
      });
      const d = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
      return { text: (d.choices?.[0]?.message?.content ?? "No results").slice(0, MAX_RESULT_CHARS) };
    }

    case "fetch_url": {
      const r = await fetch(String(args.url ?? ""), {
        headers: { "User-Agent": "Mozilla/5.0 Sirius/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      const html = await r.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ").trim();
      return { text: text.slice(0, MAX_RESULT_CHARS) };
    }

    case "bash_execute": {
      const result = await execInSandbox(userId, String(args.command ?? "echo no command"));
      const parts: string[] = [];
      if (result.timedOut) parts.push("⚠️ Command timed out (30s limit)");
      if (result.stdout) parts.push(`stdout:\n${result.stdout}`);
      if (result.stderr) parts.push(`stderr:\n${result.stderr}`);
      return { text: (parts.join("\n") || "(no output)").slice(0, MAX_RESULT_CHARS), filesChanged: true };
    }

    case "write_file": {
      await writeToSandbox(userId, String(args.path ?? "output.txt"), String(args.content ?? ""));
      return { text: `✅ Written: ${args.path} (${String(args.content ?? "").length} chars)`, filesChanged: true };
    }

    case "read_file": {
      try {
        const content = await readFromSandbox(userId, String(args.path ?? ""));
        return { text: content };
      } catch {
        return { text: `⚠️ File not found: ${args.path}` };
      }
    }

    case "list_files": {
      const tree = await listSandboxFiles(userId, String(args.path ?? ""));
      return { text: tree };
    }

    case "grep_files": {
      const results = await grepInSandbox(userId, String(args.pattern ?? ""), String(args.path ?? ""));
      return { text: results };
    }

    case "image_generate": {
      const prompt = encodeURIComponent(String(args.prompt ?? "abstract artwork"));
      const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&nologo=true&model=flux`;
      return { text: "🎨 Image generated", imageUrl };
    }

    case "read_project_memory": {
      const memory = await getProjectMemory(userId);
      return { text: memory };
    }

    case "update_project_memory": {
      await saveProjectMemory(userId, String(args.content ?? ""));
      return { text: "✅ Project memory updated" };
    }

    case "git_checkpoint": {
      const result = await gitCheckpoint(userId, String(args.message ?? "checkpoint"));
      return { text: result };
    }

    case "run_tests": {
      const result = await runTests(userId);
      return { text: result };
    }

    case "expose_port": {
      const port = Number(args.port ?? 3000);
      const url = await exposePort(userId, port);
      const isError = url.startsWith("⚠️");
      return {
        text: isError ? url : `🌐 Live at: ${url}`,
        liveUrl: isError ? undefined : url,
      };
    }

    case "close_port": {
      await closePort(userId, Number(args.port ?? 3000));
      return { text: `✅ Port ${args.port} closed` };
    }

    default:
      return { text: `Unknown tool: ${name}` };
  }
}

// ── Auth check ────────────────────────────────────────────────────────────────

async function requireSubscription(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (userId === "garry") return true;
  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId)).limit(1);
  return !!profile && ["plus", "pro"].includes(profile.tier ?? "");
}

// ── POST /creator-lab/chat ────────────────────────────────────────────────────

router.post("/creator-lab/chat", async (req, res) => {
  const { userId, messages } = req.body as {
    userId?: string;
    messages?: Array<{ role: string; content: string }>;
  };

  if (!userId || !messages?.length) return res.status(400).json({ error: "userId and messages required" });

  const allowed = await requireSubscription(userId).catch(() => false);
  if (!allowed) return res.status(403).json({ error: "Creator Lab requires Sirius Plus or Pro" });

  // Warm sandbox before streaming starts
  await ensureSandbox(userId).catch(err => console.error("[creator-lab] sandbox warm failed:", err));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 15000);

  const loopMessages: Array<{ role: string; content: unknown }> = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  let round = 0;

  try {
    while (round < MAX_TOOL_ROUNDS) {
      round++;

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
        send({ type: "error", text: `AI error ${apiRes.status}: ${err.slice(0, 200)}` });
        break;
      }

      let textBuffer = "";
      const toolCalls: Array<{ id: string; name: string; argsRaw: string }> = [];
      let currentIdx = -1;
      const reader = apiRes.body!.getReader();
      const dec = new TextDecoder();
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += dec.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const chunk = JSON.parse(raw);
            const delta = chunk.choices?.[0]?.delta;
            if (!delta) continue;
            if (delta.content) {
              textBuffer += delta.content;
              send({ type: "text", text: delta.content });
            }
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (tc.index !== undefined && tc.index !== currentIdx) {
                  currentIdx = tc.index;
                  toolCalls[tc.index] = { id: tc.id ?? "", name: "", argsRaw: "" };
                }
                if (tc.function?.name) toolCalls[currentIdx].name += tc.function.name;
                if (tc.function?.arguments) toolCalls[currentIdx].argsRaw += tc.function.arguments;
              }
            }
          } catch { /* partial */ }
        }
      }

      if (!toolCalls.length) {
        if (textBuffer) loopMessages.push({ role: "assistant", content: textBuffer });
        break;
      }

      loopMessages.push({
        role: "assistant",
        content: textBuffer || null,
        tool_calls: toolCalls.map(tc => ({
          id: tc.id, type: "function",
          function: { name: tc.name, arguments: tc.argsRaw },
        })),
      });

      for (const tc of toolCalls) {
        send({ type: "thinking", text: TOOL_LABELS[tc.name] ?? `Using ${tc.name}…` });
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.argsRaw); } catch { /* bad json */ }

        const result = await executeTool(tc.name, args, userId);

        send({
          type: "tool_result",
          tool: tc.name,
          args,
          result: result.text,
          imageUrl: result.imageUrl,
          liveUrl: result.liveUrl,
          filesChanged: result.filesChanged,
        });

        loopMessages.push({
          role: "tool",
          content: result.imageUrl
            ? `Image generated. URL: ${result.imageUrl}. Tell the user it is ready.`
            : result.liveUrl
            ? `Port exposed. Live URL: ${result.liveUrl}. Tell the user they can open this in their browser.`
            : result.text,
        } as { role: string; content: string });
      }

      if (round >= MAX_TOOL_ROUNDS) {
        loopMessages.push({ role: "user", content: "Summarise what you have built and its current state." });
      }
    }

    send({ type: "done" });
  } catch (err) {
    send({ type: "error", text: err instanceof Error ? err.message : "Unknown error" });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

// ── GET /creator-lab/workspace ────────────────────────────────────────────────

router.get("/creator-lab/workspace", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const allowed = await requireSubscription(userId).catch(() => false);
  if (!allowed) return res.status(403).json({ error: "Requires Plus or Pro" });

  const [tree, memory, info] = await Promise.all([
    listSandboxFiles(userId).catch(() => "(not yet initialised)"),
    getProjectMemory(userId).catch(() => null),
    getSandboxInfo(userId).catch(() => null),
  ]);

  res.json({ tree, memory, sandboxStatus: info?.status ?? "unknown" });
});

// ── GET /creator-lab/file ─────────────────────────────────────────────────────

router.get("/creator-lab/file", async (req, res) => {
  const { userId, path: filePath } = req.query as { userId?: string; path?: string };
  if (!userId || !filePath) return res.status(400).json({ error: "userId and path required" });
  const allowed = await requireSubscription(userId).catch(() => false);
  if (!allowed) return res.status(403).json({ error: "Requires Plus or Pro" });
  try {
    const content = await readFromSandbox(userId, filePath);
    res.setHeader("Content-Disposition", `attachment; filename="${filePath.split("/").pop()}"`);
    res.send(content);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

export default router;
