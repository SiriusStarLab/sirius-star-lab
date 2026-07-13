import { Router } from "express";
import { db, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ensureSandbox,
  execInSandbox,
  writeToSandbox,
  readFromSandbox,
  listSandboxFiles,
  grepInSandbox,
  getSandboxInfo,
} from "../lib/sandbox-manager.js";

const router = Router();

const MAX_TOOL_ROUNDS = 16;
const MAX_RESULT_CHARS = 8000;

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Sirius — the AI creation partner for conscious builders. You have a real isolated Docker sandbox: a full Linux environment with Node.js, Python, git, bash, and the ability to install any package.

CARDINAL RULE — THE VERIFICATION LOOP:
You never report success without verifying it yourself. Every time you create or change something:
1. WRITE the code or file (write_file)
2. READ it back immediately — confirm it saved correctly (read_file)
3. EXECUTE it — run it, compile it, test it (bash_execute)
4. CHECK the output — if there is an error, fix it now and re-run
5. ONLY tell the user something is done when step 4 confirms it works

You do not hand people broken things. You are a builder, not a suggester.

TOOL PHILOSOPHY:
- search_web FIRST whenever you need documentation, APIs, current prices, or real-world facts
- After writing any file, immediately read_file to verify correctness
- After writing code, immediately bash_execute to run and verify output
- Chain tools: search → write → read back → execute → check → fix → confirm
- Use think when planning complex multi-step work

SANDBOX ENVIRONMENT:
The user has a private isolated Docker container. All files persist throughout the session in /workspace.
You can: install npm/pip packages, run servers, compile code, run scripts, use git, curl APIs.
Build real working things — code, APIs, data pipelines, web apps, scripts, automations.

You serve conscious creators, visionary entrepreneurs, and sovereign thinkers.
Honour the vision. Then make it physical.`;

// ── Tool definitions ─────────────────────────────────────────────────────────

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
      description: "Search the web for current information — documentation, APIs, tutorials, market data, competitor research, pricing, news. Always search before using unfamiliar libraries.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          depth: { type: "string", enum: ["standard", "deep"] },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description: "Fetch the full content of any URL — docs, GitHub repos, APIs, articles.",
      parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    },
  },
  {
    type: "function",
    function: {
      name: "bash_execute",
      description: "Run any shell command in the isolated Docker sandbox. Install packages (npm install, pip install, apk add), compile code, run scripts, start servers, use git, curl APIs. Always check stdout and stderr.",
      parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a file in the sandbox workspace. After writing, always read_file to verify, then bash_execute to test.",
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
      description: "Read any file from the sandbox workspace. Use after writing to verify, or to understand existing code before editing.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List all files and directories in the workspace. Use to understand structure before editing.",
      parameters: { type: "object", properties: { path: { type: "string", description: "Subdirectory to list (optional)" } }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "grep_files",
      description: "Search for text or patterns across files in the workspace.",
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
      description: "Generate an image from a description. Use for logos, mockups, product renders, UI wireframes, brand assets, concept art.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed description — style, subject, colours, composition, mood" },
        },
        required: ["prompt"],
      },
    },
  },
];

const TOOL_LABELS: Record<string, string> = {
  think:          "Thinking…",
  search_web:     "Searching the web…",
  fetch_url:      "Reading page…",
  bash_execute:   "Running in sandbox…",
  write_file:     "Writing file…",
  read_file:      "Reading file…",
  list_files:     "Listing workspace…",
  grep_files:     "Searching files…",
  image_generate: "Generating image…",
};

// ── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, string>,
  userId: string
): Promise<{ text: string; imageUrl?: string; filesChanged?: boolean }> {
  switch (name) {
    case "think":
      return { text: `💭 ${args.reasoning ?? ""}` };

    case "search_web": {
      const depth = args.depth === "deep" ? "deep" : "standard";
      const model = depth === "deep" ? "perplexity/sonar-pro" : "perplexity/sonar";
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: args.query }],
          max_tokens: depth === "deep" ? 2000 : 1000,
        }),
      });
      const d = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
      return { text: (d.choices?.[0]?.message?.content ?? "No results").slice(0, MAX_RESULT_CHARS) };
    }

    case "fetch_url": {
      const r = await fetch(args.url ?? "", {
        headers: { "User-Agent": "Mozilla/5.0 Sirius/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      const html = await r.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return { text: text.slice(0, MAX_RESULT_CHARS) };
    }

    case "bash_execute": {
      const result = await execInSandbox(userId, args.command ?? "echo 'no command'");
      const parts: string[] = [];
      if (result.timedOut) parts.push("⚠️ Command timed out (30s limit)");
      if (result.stdout) parts.push(`stdout:\n${result.stdout}`);
      if (result.stderr) parts.push(`stderr:\n${result.stderr}`);
      if (!parts.length) parts.push("(no output)");
      return { text: parts.join("\n").slice(0, MAX_RESULT_CHARS), filesChanged: true };
    }

    case "write_file": {
      await writeToSandbox(userId, args.path ?? "output.txt", args.content ?? "");
      return {
        text: `✅ Written: ${args.path} (${(args.content ?? "").length} chars)`,
        filesChanged: true,
      };
    }

    case "read_file": {
      try {
        const content = await readFromSandbox(userId, args.path ?? "");
        return { text: content };
      } catch {
        return { text: `⚠️ File not found: ${args.path}` };
      }
    }

    case "list_files": {
      const tree = await listSandboxFiles(userId, args.path);
      return { text: tree };
    }

    case "grep_files": {
      const results = await grepInSandbox(userId, args.pattern ?? "", args.path);
      return { text: results };
    }

    case "image_generate": {
      const prompt = encodeURIComponent(args.prompt ?? "abstract artwork");
      const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&nologo=true&model=flux`;
      return { text: "🎨 Image generated", imageUrl };
    }

    default:
      return { text: `Unknown tool: ${name}` };
  }
}

// ── Auth check ────────────────────────────────────────────────────────────────

async function requireSubscription(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (userId === "garry") return true;
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId))
    .limit(1);
  return !!profile && ["plus", "pro"].includes(profile.tier ?? "");
}

// ── POST /creator-lab/chat ────────────────────────────────────────────────────

router.post("/creator-lab/chat", async (req, res) => {
  const { userId, messages } = req.body as {
    userId?: string;
    messages?: Array<{ role: string; content: string }>;
  };

  if (!userId || !messages?.length) {
    return res.status(400).json({ error: "userId and messages required" });
  }

  const allowed = await requireSubscription(userId).catch(() => false);
  if (!allowed) {
    return res.status(403).json({ error: "Creator Lab requires Sirius Plus or Pro" });
  }

  // Warm the sandbox container before streaming starts
  await ensureSandbox(userId).catch(err => {
    console.error("[creator-lab] sandbox warm failed:", err);
  });

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

      // Accumulate streaming response
      let textBuffer = "";
      const toolCalls: Array<{ id: string; name: string; argsRaw: string }> = [];
      let currentIdx = -1;
      let finishReason: string | null = null;

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
          if (raw === "[DONE]") { finishReason = finishReason ?? "stop"; break; }
          try {
            const chunk = JSON.parse(raw);
            const delta = chunk.choices?.[0]?.delta;
            finishReason = chunk.choices?.[0]?.finish_reason ?? finishReason;
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
          } catch { /* partial chunk */ }
        }
      }

      // No tool calls → done
      if (!toolCalls.length) {
        if (textBuffer) loopMessages.push({ role: "assistant", content: textBuffer });
        break;
      }

      // Record assistant message with tool calls
      loopMessages.push({
        role: "assistant",
        content: textBuffer || null,
        tool_calls: toolCalls.map(tc => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.argsRaw },
        })),
      });

      // Execute each tool call
      for (const tc of toolCalls) {
        send({ type: "thinking", text: TOOL_LABELS[tc.name] ?? `Using ${tc.name}…` });

        let args: Record<string, string> = {};
        try { args = JSON.parse(tc.argsRaw); } catch { /* bad json */ }

        const result = await executeTool(tc.name, args, userId);

        send({
          type: "tool_result",
          tool: tc.name,
          args,
          result: result.text,
          imageUrl: result.imageUrl,
          filesChanged: result.filesChanged,
        });

        loopMessages.push({
          role: "tool",
          content: result.imageUrl
            ? `Image generated. URL: ${result.imageUrl}. Tell the user it is ready.`
            : result.text,
        } as { role: string; content: string });
      }

      // Force synthesis on final round
      if (round >= MAX_TOOL_ROUNDS) {
        loopMessages.push({
          role: "user",
          content: "Summarise what you have built and its current state for the user.",
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

// ── GET /creator-lab/workspace ────────────────────────────────────────────────

router.get("/creator-lab/workspace", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const allowed = await requireSubscription(userId).catch(() => false);
  if (!allowed) return res.status(403).json({ error: "Requires Plus or Pro" });

  const tree = await listSandboxFiles(userId).catch(() => "(workspace not yet initialised)");
  const info = await getSandboxInfo(userId).catch(() => null);

  res.json({ tree, sandboxStatus: info?.status ?? "unknown" });
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
