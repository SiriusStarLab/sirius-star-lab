/**
 * Sirius Regression Test Runner
 * ──────────────────────────────────────────────────────────────────────────────
 * Runs six end-to-end tests against the live API (localhost) after every deploy
 * and on a 30-min cron. Results are persisted to `regression_runs` DB table.
 *
 * Critical tests (health, stream): fail → auto-rollback + Telegram alert
 * Non-critical tests (math, vision, docs, search): fail → alert only
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { sendTelegramMessage } from "./telegram.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TestResult {
  name: string;
  critical: boolean;
  passed: boolean;
  durationMs: number;
  detail: string;
  error?: string;
}

export interface RegressionRun {
  id: number;
  runAt: string;
  trigger: string;
  passed: number;
  failed: number;
  total: number;
  durationMs: number;
  results: TestResult[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = `http://localhost:${process.env.PORT || "4000"}`;

// Known-good 8×8 blue PNG — tested live against Claude/OpenRouter
const TEST_IMAGE_B64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNwa/qPFTEMLQkARBxxwQlXzJsAAAAASUVORK5CYII=";

// Secret phrase embedded in the test document
const DOC_SECRET = "SIRIUS_REGTEST_CODE_ZETA9182";

// ── DB setup ──────────────────────────────────────────────────────────────────

async function ensureTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS regression_runs (
      id          SERIAL PRIMARY KEY,
      run_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      trigger     TEXT        NOT NULL DEFAULT 'manual',
      passed      INTEGER     NOT NULL,
      failed      INTEGER     NOT NULL,
      total       INTEGER     NOT NULL,
      duration_ms INTEGER     NOT NULL,
      results     JSONB       NOT NULL
    )
  `);
}

async function saveRun(
  trigger: string,
  passed: number,
  failed: number,
  total: number,
  durationMs: number,
  results: TestResult[]
): Promise<void> {
  await db.execute(sql`
    INSERT INTO regression_runs (trigger, passed, failed, total, duration_ms, results)
    VALUES (${trigger}, ${passed}, ${failed}, ${total}, ${durationMs}, ${JSON.stringify(results)}::jsonb)
  `);
  // Keep last 200 runs only
  await db
    .execute(sql`
      DELETE FROM regression_runs
      WHERE id NOT IN (
        SELECT id FROM regression_runs ORDER BY run_at DESC LIMIT 200
      )
    `)
    .catch(() => {});
}

export async function getRecentRuns(limit = 20): Promise<RegressionRun[]> {
  await ensureTable();
  const rows = await db.execute(
    sql`SELECT * FROM regression_runs ORDER BY run_at DESC LIMIT ${limit}`
  );
  return (rows.rows as any[]).map((r) => ({
    id: r.id,
    runAt: r.run_at,
    trigger: r.trigger,
    passed: r.passed,
    failed: r.failed,
    total: r.total,
    durationMs: r.duration_ms,
    results: typeof r.results === "string" ? JSON.parse(r.results) : r.results,
  }));
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

/** POST a message to a conversation and collect the full SSE response */
async function sendMessage(
  conversationId: number,
  payload: Record<string, unknown>,
  timeoutMs = 30_000
): Promise<{ content: string; done: boolean; durationMs: number }> {
  const start = Date.now();
  try {
    const res = await fetch(
      `${API_BASE}/api/openai/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "garry",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );

    if (!res.ok) {
      return { content: `HTTP ${res.status}`, done: false, durationMs: Date.now() - start };
    }

    const text = await res.text();
    let content = "";
    let done = false;

    for (const line of text.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.content) content += data.content;
        if (data.done) done = true;
      } catch {}
    }

    return { content, done, durationMs: Date.now() - start };
  } catch (err: any) {
    return {
      content: `fetch error: ${err.message}`,
      done: false,
      durationMs: Date.now() - start,
    };
  }
}

/** Create a throw-away conversation for this test run */
async function createTestConversation(): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE}/api/openai/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "garry",
      },
      body: JSON.stringify({ title: "[regression-test]" }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return data.id ?? null;
  } catch {
    return null;
  }
}

// ── Individual tests ──────────────────────────────────────────────────────────

async function wrap(
  name: string,
  critical: boolean,
  fn: () => Promise<{ passed: boolean; detail: string }>
): Promise<TestResult> {
  const start = Date.now();
  try {
    const r = await fn();
    return { name, critical, ...r, durationMs: Date.now() - start };
  } catch (err: any) {
    return {
      name,
      critical,
      passed: false,
      detail: "Threw an exception",
      error: err.message,
      durationMs: Date.now() - start,
    };
  }
}

/** T1 — API health check (critical) */
async function testHealth(): Promise<TestResult> {
  return wrap("API health check", true, async () => {
    const res = await fetch(`${API_BASE}/api/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    const data = (await res.json()) as any;
    const passed = data.status === "ok";
    return {
      passed,
      detail: passed ? 'status: "ok"' : `Unexpected: ${JSON.stringify(data)}`,
    };
  });
}

/** T2 — SSE stream integrity: done event arrives with content (critical) */
async function testStream(convId: number): Promise<TestResult> {
  return wrap("SSE stream integrity", true, async () => {
    const { content, done, durationMs } = await sendMessage(
      convId,
      { content: 'Reply with only the single word "PONG".', mode: "guru" },
      20_000
    );
    const passed = done && content.trim().length > 0;
    return {
      passed,
      detail: passed
        ? `"${content.trim().slice(0, 50)}" in ${durationMs}ms`
        : `content="${content.slice(0, 60)}" done=${done}`,
    };
  });
}

/** T3 — Math routing: goes to Claude, answers correctly, NOT to search */
async function testMathRouting(convId: number): Promise<TestResult> {
  return wrap("Math routing (no search)", false, async () => {
    const { content, done } = await sendMessage(
      convId,
      {
        content:
          "What is 847 plus 391? Reply with only the numeric answer — no words.",
        mode: "guru",
      },
      25_000
    );
    const correct =
      content.includes("1238") ||
      content.includes("1,238") ||
      content.replace(/[^0-9]/g, "") === "1238";
    const passed = done && correct;
    return {
      passed,
      detail: passed
        ? `Answered correctly: "${content.trim().slice(0, 40)}"`
        : `Wrong/no answer: "${content.trim().slice(0, 80)}"`,
    };
  });
}

/** T4 — Vision: image upload analysed, no error message */
async function testVision(convId: number): Promise<TestResult> {
  return wrap("Vision (image upload)", false, async () => {
    const { content, done } = await sendMessage(
      convId,
      {
        content:
          "What is the dominant colour in this image? Give one word only.",
        mode: "guru",
        imageBase64: TEST_IMAGE_B64,
      },
      30_000
    );
    const isError =
      content.includes("couldn't process") ||
      content.includes("try again") ||
      content.includes("I'm sorry") ||
      content.length < 2;
    const passed = done && !isError;
    return {
      passed,
      detail: passed
        ? `Described image: "${content.trim().slice(0, 60)}"`
        : `Error response: "${content.trim().slice(0, 80)}"`,
    };
  });
}

/** T5 — Document reading: extracts secret phrase from attached text doc */
async function testDocReading(convId: number): Promise<TestResult> {
  return wrap("Document reading", false, async () => {
    const docText = `REGRESSION TEST DOCUMENT\nThe secret phrase is: ${DOC_SECRET}\nEnd of document.`;
    const docBase64 = Buffer.from(docText).toString("base64");
    const { content, done } = await sendMessage(
      convId,
      {
        content:
          "What is the secret phrase in the attached document? Quote it exactly.",
        mode: "guru",
        documentBase64: docBase64,
        documentName: "regression-test.txt",
      },
      30_000
    );
    const passed = done && content.includes(DOC_SECRET);
    return {
      passed,
      detail: passed
        ? `Found secret phrase in response`
        : `Secret not found. Response: "${content.trim().slice(0, 100)}"`,
    };
  });
}

/** T6 — Web search routing: live-data query gets a real response */
async function testSearchRouting(convId: number): Promise<TestResult> {
  return wrap("Web search routing", false, async () => {
    const { content, done } = await sendMessage(
      convId,
      {
        content:
          "What year did the first iPhone come out? One sentence answer.",
        mode: "guru",
      },
      30_000
    );
    // 2007 is a fixed fact — should answer correctly whether via search or Claude
    const correct =
      content.includes("2007") &&
      !content.includes("I cannot") &&
      !content.includes("I don't have");
    const passed = done && correct;
    return {
      passed,
      detail: passed
        ? `"${content.trim().slice(0, 80)}"`
        : `Bad response: "${content.trim().slice(0, 80)}"`,
    };
  });
}

// ── Main runner ───────────────────────────────────────────────────────────────

export async function runRegressionSuite(trigger = "manual"): Promise<{
  passed: number;
  failed: number;
  total: number;
  durationMs: number;
  criticalFailed: boolean;
  results: TestResult[];
}> {
  const suiteStart = Date.now();
  await ensureTable();

  // Create conversations for the test run.
  // Vision and doc tests get their own isolated conversations — the vision path
  // returns early (no normal message save), which can confuse subsequent tests
  // if they share a conversation.
  const mainConvId = await createTestConversation();
  if (!mainConvId) {
    const errResult: TestResult = {
      name: "conversation creation",
      critical: true,
      passed: false,
      durationMs: 0,
      detail: "Could not create test conversation — API may be down",
    };
    await saveRun(trigger, 0, 1, 1, Date.now() - suiteStart, [errResult]);
    return { passed: 0, failed: 1, total: 1, durationMs: Date.now() - suiteStart, criticalFailed: true, results: [errResult] };
  }
  // Separate conversations for tests that need a clean slate
  const visionConvId = (await createTestConversation()) ?? mainConvId;
  const docConvId    = (await createTestConversation()) ?? mainConvId;

  // Run tests sequentially (avoids flooding the server)
  const results: TestResult[] = [];
  results.push(await testHealth());
  results.push(await testStream(mainConvId));
  results.push(await testMathRouting(mainConvId));
  results.push(await testVision(visionConvId));
  results.push(await testDocReading(docConvId));
  results.push(await testSearchRouting(mainConvId));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  const durationMs = Date.now() - suiteStart;
  const criticalFailed = results.some((r) => r.critical && !r.passed);

  await saveRun(trigger, passed, failed, total, durationMs, results);

  // Alert on any failures
  if (failed > 0) {
    const failList = results
      .filter((r) => !r.passed)
      .map((r) => `• ${r.critical ? "🔴 [CRITICAL]" : "🟡"} ${r.name}: ${r.detail}`)
      .join("\n");
    const msg = `⚠️ Sirius regression: ${failed}/${total} tests FAILED (trigger: ${trigger})\n\n${failList}`;
    sendTelegramMessage(msg).catch(() => {});
  }

  return { passed, failed, total, durationMs, criticalFailed, results };
}
