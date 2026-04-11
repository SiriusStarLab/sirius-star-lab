/**
 * Sirius Code Agent
 *
 * Gives Sirius the ability to read, write and execute code
 * in the actual project workspace. Uses Claude with tool-use
 * to autonomously plan, write and apply code changes.
 */

import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { openai } from "@workspace/integrations-openai-ai-server";

const execAsync = promisify(exec);

const WORKSPACE = "/home/runner/workspace";

// Safe paths Sirius is allowed to operate in
const ALLOWED_PATHS = [
  "artifacts/ai-chat/src",
  "artifacts/api-server/src",
  "artifacts/sirius-mobile/src",
  "artifacts/fitstack-crm/src",
  "lib",
  "packages",
];

// Commands Sirius is allowed to run
const ALLOWED_COMMANDS = [
  /^pnpm\s+(install|add|remove|run\s+build|run\s+lint|run\s+typecheck|run\s+db:push|audit)/,
  /^npx\s+tsc/,
  /^ls(\s|$)/,
  /^cat\s/,
  /^echo\s/,
  /^mkdir\s+-p\s/,
];

function isPathAllowed(filePath: string): boolean {
  const rel = path.relative(WORKSPACE, path.resolve(WORKSPACE, filePath));
  if (rel.startsWith("..")) return false;
  return ALLOWED_PATHS.some(allowed => rel.startsWith(allowed) || rel === allowed);
}

function isCommandAllowed(cmd: string): boolean {
  const trimmed = cmd.trim();
  return ALLOWED_COMMANDS.some(pattern => pattern.test(trimmed));
}

async function listFiles(dirPath: string, depth = 0): Promise<string> {
  const abs = path.resolve(WORKSPACE, dirPath);
  if (!isPathAllowed(dirPath)) throw new Error(`Path not allowed: ${dirPath}`);
  try {
    const entries = await fs.readdir(abs, { withFileTypes: true });
    const lines: string[] = [];
    for (const e of entries) {
      if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "dist") continue;
      const indent = "  ".repeat(depth);
      if (e.isDirectory() && depth < 2) {
        lines.push(`${indent}${e.name}/`);
        lines.push(await listFiles(path.join(dirPath, e.name), depth + 1));
      } else if (e.isFile()) {
        lines.push(`${indent}${e.name}`);
      }
    }
    return lines.join("\n");
  } catch {
    return `(cannot read ${dirPath})`;
  }
}

async function readFile(filePath: string, maxLines = 300): Promise<string> {
  if (!isPathAllowed(filePath)) throw new Error(`Path not allowed: ${filePath}`);
  const abs = path.resolve(WORKSPACE, filePath);
  const content = await fs.readFile(abs, "utf-8");
  const lines = content.split("\n");
  if (lines.length > maxLines) {
    return lines.slice(0, maxLines).join("\n") + `\n... (${lines.length - maxLines} more lines truncated)`;
  }
  return content;
}

async function writeFile(filePath: string, content: string): Promise<string> {
  if (!isPathAllowed(filePath)) throw new Error(`Path not allowed: ${filePath}`);
  const abs = path.resolve(WORKSPACE, filePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf-8");
  return `Written: ${filePath} (${content.split("\n").length} lines)`;
}

async function editFile(filePath: string, oldStr: string, newStr: string): Promise<string> {
  if (!isPathAllowed(filePath)) throw new Error(`Path not allowed: ${filePath}`);
  const abs = path.resolve(WORKSPACE, filePath);
  const content = await fs.readFile(abs, "utf-8");
  if (!content.includes(oldStr)) throw new Error(`String not found in ${filePath}: "${oldStr.slice(0, 60)}..."`);
  const updated = content.replace(oldStr, newStr);
  await fs.writeFile(abs, updated, "utf-8");
  return `Edited: ${filePath}`;
}

async function runCommand(cmd: string): Promise<string> {
  if (!isCommandAllowed(cmd)) throw new Error(`Command not allowed: ${cmd}`);
  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd: WORKSPACE, timeout: 60000 });
    return (stdout + (stderr ? `\nSTDERR: ${stderr}` : "")).slice(0, 3000);
  } catch (err: any) {
    return `Error: ${err.message?.slice(0, 1000) ?? "unknown"}`;
  }
}

// ─── Tool definitions for Claude ──────────────────────────────────────────────

const CODE_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "list_files",
      description: "List files and directories in the project workspace. Use to explore the codebase structure before reading or writing files.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path from workspace root (e.g. 'artifacts/ai-chat/src')" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "Read the contents of a source file. Use before editing to understand existing code. Returns up to 300 lines.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path from workspace root" },
          max_lines: { type: "number", description: "Max lines to return (default 300)" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description: "Write (create or overwrite) a file with new content. For large existing files, prefer edit_file instead.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path from workspace root" },
          content: { type: "string", description: "Full file content to write" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "edit_file",
      description: "Make a precise edit to an existing file by replacing an exact string. Safer than write_file for large files. The old_string must match exactly (including whitespace).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path from workspace root" },
          old_string: { type: "string", description: "Exact string to find and replace (include surrounding context for uniqueness)" },
          new_string: { type: "string", description: "Replacement string" },
        },
        required: ["path", "old_string", "new_string"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_command",
      description: "Run a safe shell command in the workspace (pnpm install, build, typecheck, ls, etc.). Limited to approved commands only.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The command to run (must be an approved command)" },
        },
        required: ["command"],
      },
    },
  },
];

// ─── Event types for SSE streaming ────────────────────────────────────────────

export type CodeAgentEvent =
  | { type: "thinking"; text: string }
  | { type: "tool_call"; tool: string; args: Record<string, any> }
  | { type: "tool_result"; tool: string; result: string; error?: boolean }
  | { type: "file_change"; path: string; action: "created" | "modified" | "read" | "listed" }
  | { type: "message"; text: string }
  | { type: "complete"; summary: string; filesChanged: string[] }
  | { type: "error"; message: string };

// ─── Main agent runner ─────────────────────────────────────────────────────────

export async function runCodeAgent(
  task: string,
  onEvent: (event: CodeAgentEvent) => void,
  maxIterations = 20,
): Promise<void> {
  const filesChanged: string[] = [];

  const systemPrompt = `You are Sirius Code Agent — the autonomous coding intelligence inside Sirius Star Lab.

You have direct access to the Sirius project codebase on disk. You can read, write, and edit source files, explore the project structure, and run approved commands.

## YOUR CAPABILITIES
- list_files: Explore the directory tree
- read_file: Read any source file
- write_file: Create new files or overwrite small files entirely
- edit_file: Make precise targeted edits to existing files (preferred for large files)
- run_command: Run safe build/install/check commands

## RULES
1. Always read a file before editing it — understand what's there first.
2. Explore the structure first if you're not sure where something lives.
3. Make minimal, precise changes — don't rewrite entire files unless necessary.
4. Write clean, idiomatic TypeScript/React that matches the existing code style.
5. After writing code, verify by reading back the changed file to confirm correctness.
6. Be methodical: plan → explore → implement → verify.

## WORKSPACE STRUCTURE
- artifacts/ai-chat/src — Sirius frontend (React + Vite)
  - pages/chat.tsx — main chat interface
  - pages/star-lab.tsx — Star Lab interface (~16k lines)
  - components/ — shared UI components
  - hooks/ — React hooks
- artifacts/api-server/src — backend (Express + TypeScript)
  - routes/ — API routes
  - lib/ — core libraries
- artifacts/sirius-mobile/src — React Native mobile app
- lib/ — shared libraries

When you are done, call no more tools and write a final summary of exactly what you changed and why.`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: task },
  ];

  onEvent({ type: "thinking", text: "Analysing task and planning approach..." });

  for (let i = 0; i < maxIterations; i++) {
    const response = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4-5",
      messages,
      tools: CODE_TOOLS,
      tool_choice: "auto",
      max_tokens: 4096,
    });

    const choice = response.choices[0];
    const msg = choice.message;

    messages.push(msg);

    // Stream any text content
    if (msg.content) {
      onEvent({ type: "message", text: msg.content });
    }

    // If no tool calls, we're done
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      onEvent({
        type: "complete",
        summary: msg.content || "Task completed.",
        filesChanged,
      });
      return;
    }

    // Process tool calls
    const toolResults: any[] = [];

    for (const tc of msg.tool_calls) {
      const tcFn = (tc as any).function as { name: string; arguments: string };
      const toolName = tcFn.name;
      let args: Record<string, any> = {};
      try { args = JSON.parse(tcFn.arguments); } catch { args = {}; }

      onEvent({ type: "tool_call", tool: toolName, args });

      let result = "";
      let isError = false;

      try {
        switch (toolName) {
          case "list_files": {
            result = await listFiles(args.path);
            onEvent({ type: "file_change", path: args.path, action: "listed" });
            break;
          }
          case "read_file": {
            result = await readFile(args.path, args.max_lines);
            onEvent({ type: "file_change", path: args.path, action: "read" });
            break;
          }
          case "write_file": {
            result = await writeFile(args.path, args.content);
            if (!filesChanged.includes(args.path)) filesChanged.push(args.path);
            onEvent({ type: "file_change", path: args.path, action: "created" });
            break;
          }
          case "edit_file": {
            result = await editFile(args.path, args.old_string, args.new_string);
            if (!filesChanged.includes(args.path)) filesChanged.push(args.path);
            onEvent({ type: "file_change", path: args.path, action: "modified" });
            break;
          }
          case "run_command": {
            result = await runCommand(args.command);
            break;
          }
          default:
            result = `Unknown tool: ${toolName}`;
            isError = true;
        }
      } catch (err: any) {
        result = `Error: ${err.message}`;
        isError = true;
      }

      onEvent({ type: "tool_result", tool: toolName, result: result.slice(0, 500), error: isError });

      toolResults.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      });
    }

    messages.push(...toolResults);
  }

  onEvent({
    type: "complete",
    summary: "Reached maximum iterations. Task may be partially complete.",
    filesChanged,
  });
}
