import { db, siriusTasks, userProfilesTable } from "@workspace/db";
import { openai } from "@workspace/ai-client";
import { eq, asc } from "drizzle-orm";
import { sendTelegram } from "./lib/telegram.js";

const POLL_INTERVAL_MS = 30_000;
const MAX_ROUNDS = 12;
const BRAIN_USER = "garry";

async function getSiriusContext(): Promise<string> {
  try {
    const rows = await db.select({
      businessName: userProfilesTable.businessName,
      businessSector: userProfilesTable.businessSector,
      businessGoals: userProfilesTable.businessGoals,
      memories: userProfilesTable.memories,
    }).from(userProfilesTable).where(eq(userProfilesTable.userId, BRAIN_USER));
    const p = rows[0];
    if (!p) return "";
    return [
      p.businessName ? `Business: ${p.businessName}` : null,
      p.businessSector ? `Sectors: ${p.businessSector}` : null,
      p.businessGoals ? `Goals: ${p.businessGoals}` : null,
      p.memories ? `Memories:\n${p.memories.slice(0, 3000)}` : null,
    ].filter(Boolean).join("\n");
  } catch { return ""; }
}

async function appendProgress(id: number, step: string) {
  try {
    const rows = await db.select({ progress: siriusTasks.progress })
      .from(siriusTasks).where(eq(siriusTasks.id, id));
    const existing = rows[0]?.progress ?? "";
    const ts = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const updated = existing ? `${existing}\n[${ts}] ${step}` : `[${ts}] ${step}`;
    await db.update(siriusTasks).set({ progress: updated }).where(eq(siriusTasks.id, id));
  } catch (e) {
    console.error("[Worker] Failed to append progress:", e);
  }
}

async function runTask(task: typeof siriusTasks.$inferSelect) {
  console.log(`[Worker] Starting task ${task.id}: "${task.title}"`);

  await db.update(siriusTasks)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(siriusTasks.id, task.id));

  const context = await getSiriusContext();

  const systemPrompt = `You are Sirius, the autonomous AI agent of Garry — founder of Sirius Star Lab. You are running a background task while Garry is away. Complete the task in full using the tools available.

${context ? `## YOUR CONTEXT\n${context}\n` : ""}

## HOW TO WORK
- Call save_progress after every meaningful step so Garry can see what you did
- Be thorough. Don't stop halfway.
- When you have fully completed ALL work, call complete_task with a comprehensive result
- Today: ${new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

  const tools: any[] = [
    {
      type: "function",
      function: {
        name: "save_progress",
        description: "Save a progress update. Call this after completing each meaningful step.",
        parameters: {
          type: "object",
          properties: {
            step: { type: "string", description: "What you just completed, found, or decided" },
          },
          required: ["step"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "complete_task",
        description: "Mark the task as complete and save the final deliverable. Only call this when ALL work is done.",
        parameters: {
          type: "object",
          properties: {
            result: {
              type: "string",
              description: "The full result, report, analysis, or deliverable. Be comprehensive.",
            },
            summary: {
              type: "string",
              description: "1-2 sentence summary for the Telegram notification to Garry",
            },
          },
          required: ["result", "summary"],
        },
      },
    },
  ];

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Complete this task:\n\n**${task.title}**\n\n${task.description}` },
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
        model: process.env.ANTHROPIC_API_KEY ? "anthropic/claude-sonnet-4-5" : "anthropic/claude-sonnet-4-5",
        messages,
        tools,
        tool_choice: "auto",
        max_tokens: 6000,
      } as any);

      const choice = response.choices[0];
      const msg = choice.message;
      messages.push(msg);

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
        let result = "";

        if (tc.function.name === "save_progress") {
          await appendProgress(task.id, args.step ?? "");
          result = "Progress saved.";
          console.log(`[Worker] Task ${task.id} progress: ${args.step}`);
        } else if (tc.function.name === "complete_task") {
          finalResult = args.result ?? "";
          finalSummary = args.summary ?? `Task "${task.title}" completed.`;
          completed = true;
          result = "Task marked complete.";
        }

        toolResults.push({ role: "tool", tool_call_id: tc.id, content: result });
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

    await sendTelegram(`✅ *Task Complete*\n\n*${task.title}*\n\n${finalSummary}`, "INFO");
  } catch (err: any) {
    console.error(`[Worker] Task ${task.id} failed:`, err.message);
    await db.update(siriusTasks).set({
      status: "failed",
      error: String(err.message ?? err),
      completedAt: new Date(),
    }).where(eq(siriusTasks.id, task.id));

    await sendTelegram(`❌ *Task Failed*\n\n*${task.title}*\n\nError: ${err.message}`, "WARNING");
  }
}

async function poll() {
  try {
    const tasks = await db.select().from(siriusTasks)
      .where(eq(siriusTasks.status, "pending"))
      .orderBy(asc(siriusTasks.createdAt))
      .limit(1);

    if (tasks.length > 0) {
      await runTask(tasks[0]);
    }
  } catch (err: any) {
    console.error("[Worker] Poll error:", err.message);
  }
}

console.log("[Worker] Sirius background task worker started — polling every 30s.");
poll();
setInterval(poll, POLL_INTERVAL_MS);
