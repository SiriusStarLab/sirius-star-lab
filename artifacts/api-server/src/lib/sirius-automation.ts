import { db, siriusAutomations, siriusCustomTools, siriusConfig, siriusErrors } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";


// ── DB migration — add columns that may be missing from older deployments ─────
export async function migrateAutomationsTable(): Promise<void> {
  try {
    await db.execute(sql`ALTER TABLE sirius_automations ADD COLUMN IF NOT EXISTS last_run_at timestamptz`);
    await db.execute(sql`ALTER TABLE sirius_automations ADD COLUMN IF NOT EXISTS last_run_result text DEFAULT ''`);
    await db.execute(sql`ALTER TABLE sirius_automations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`);
    console.log('[Sirius Automations] DB columns verified/migrated');
  } catch (err: any) {
    console.warn('[Sirius Automations] Migration warning:', err?.message);
  }
}

// ── Cron helper — returns true if it's time to run based on trigger config ──
function shouldRunNow(triggerConfig: string, lastRunAt: Date | null): boolean {
  try {
    const config = JSON.parse(triggerConfig || "{}");
    // Default to 24-hour interval if not configured — never silently skip
    const intervalMinutes = config.interval_minutes ?? config.intervalMinutes ?? 1440;
    if (!lastRunAt) return true; // Never run before — run now
    const minutesSince = (Date.now() - new Date(lastRunAt).getTime()) / 60000;
    return minutesSince >= intervalMinutes;
  } catch {
    return true; // If config is unparseable, run it — better to over-run than never run
  }
}

// ── Execute a single automation step ─────────────────────────────────────────
async function executeStep(step: any): Promise<string> {
  try {
    if (step.type === "http") {
      const { url, method = "GET", headers = {}, body } = step;
      // Automatically inject the Lab PIN for internal localhost calls so automations
      // don't trip the security rate-limiter (was causing Automation #9 to accumulate
      // PIN failures and trigger a 10-minute IP ban every cycle)
      const isLocalhost = url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1");
      const labPin = process.env.STAR_LAB_PIN || "";
      const autoHeaders = isLocalhost && labPin
        ? { "x-lab-pin": labPin }
        : {};
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...autoHeaders, ...headers },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      return `HTTP ${res.status}: ${text.slice(0, 200)}`;
    }
    if (step.type === "log") {
      return `[LOG] ${step.message}`;
    }
    return `Unknown step type: ${step.type}`;
  } catch (err: any) {
    return `Step error: ${err?.message}`;
  }
}

// ── Run a single automation ───────────────────────────────────────────────────
export async function runAutomation(automation: any): Promise<string> {
  let steps: any[] = [];
  try {
    const raw = automation.steps || "[]";
    // Guard against [object Object] — happens when steps were stored without JSON.stringify
    if (typeof raw !== "string" || raw.includes("[object Object]")) {
      console.warn(`[Sirius Automations] "${automation.name}" has corrupted steps — skipping steps, marking as run`);
      await db.update(siriusAutomations)
        .set({ lastRunAt: new Date(), lastRunResult: "Steps data corrupted — please redefine this automation" })
        .where(eq(siriusAutomations.id, automation.id));
      return "Corrupted steps — automation marked as run";
    }
    const parsed = JSON.parse(raw);
    steps = Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn(`[Sirius Automations] "${automation.name}" steps parse failed — marking as run`);
    await db.update(siriusAutomations)
      .set({ lastRunAt: new Date(), lastRunResult: "Steps JSON invalid — please redefine this automation" })
      .where(eq(siriusAutomations.id, automation.id));
    return "Invalid steps JSON — automation marked as run";
  }
  const results: string[] = [];
  for (const step of steps) {
    const result = await executeStep(step);
    results.push(result);
  }
  const summary = results.length > 0 ? results.join(" | ") : "No steps defined";
  await db.update(siriusAutomations)
    .set({ lastRunAt: new Date(), lastRunResult: summary.slice(0, 500) })
    .where(eq(siriusAutomations.id, automation.id));
  return summary;
}

// ── Execute a custom tool defined by Sirius ───────────────────────────────────
export async function executeCustomTool(toolName: string, args: Record<string, any>): Promise<string> {
  const tools = await db.select().from(siriusCustomTools)
    .where(eq(siriusCustomTools.name, toolName));
  const tool = tools[0];
  if (!tool) return `Custom tool "${toolName}" not found.`;

  const config = JSON.parse(tool.handlerConfig || "{}");

  if (tool.handlerType === "http") {
    try {
      let url: string = config.url || "";
      // Template substitution — replace {arg_name} with actual arg values
      for (const [k, v] of Object.entries(args)) {
        url = url.replace(`{${k}}`, encodeURIComponent(String(v)));
      }
      const method: string = config.method || "GET";
      let body: any = config.body;
      if (body && typeof body === "object") {
        body = JSON.parse(JSON.stringify(body).replace(
          /"\{(\w+)\}"/g,
          (_: string, k: string) => JSON.stringify(args[k] ?? `{${k}}`)
        ));
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...(config.headers || {}) },
        body: method !== "GET" && body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      await db.update(siriusCustomTools)
        .set({ lastUsedAt: new Date() })
        .where(eq(siriusCustomTools.name, toolName));
      return `${res.status === 200 ? "OK" : `HTTP ${res.status}`}: ${text.slice(0, 400)}`;
    } catch (err: any) {
      return `Custom tool error: ${err?.message}`;
    }
  }

  if (tool.handlerType === "chain") {
    const steps = config.steps || [];
    const results: string[] = [];
    for (const step of steps) {
      results.push(await executeStep({ ...step, args }));
    }
    await db.update(siriusCustomTools)
      .set({ lastUsedAt: new Date() })
      .where(eq(siriusCustomTools.name, toolName));
    return results.join(" → ");
  }

  return `Unsupported handler type: ${tool.handlerType}`;
}

// ── Get the self-configurable system prompt addendum ─────────────────────────
export async function getSiriusConfigValue(key: string): Promise<string> {
  const rows = await db.select().from(siriusConfig).where(eq(siriusConfig.key, key));
  return rows[0]?.value ?? "";
}

export async function setSiriusConfigValue(key: string, value: string): Promise<void> {
  await db.insert(siriusConfig)
    .values({ key, value })
    .onConflictDoUpdate({ target: siriusConfig.key, set: { value } });
}

// ── Log an error Sirius encountered ──────────────────────────────────────────
export async function logSiriusError(toolName: string, errorMessage: string, context = ""): Promise<void> {
  try {
    await db.insert(siriusErrors).values({ toolName, errorMessage, context: context.slice(0, 500) });
  } catch {}
}

// ── Resolve an error — Sirius marks it as fixed ───────────────────────────────
export async function resolveSiriusError(id: number, note: string): Promise<boolean> {
  const updated = await db.update(siriusErrors)
    .set({ resolved: true, resolvedNote: note, resolvedAt: new Date() })
    .where(eq(siriusErrors.id, id))
    .returning({ id: siriusErrors.id });
  return updated.length > 0;
}

// ── DB migration — ensures sirius_automations table has all required columns ──
export async function migrateAutomationsTable(): Promise<void> {
  try {
    // Add any new columns if they don't exist (safe to call repeatedly)
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name='sirius_automations' AND column_name='last_run_result') THEN
          ALTER TABLE sirius_automations ADD COLUMN last_run_result text;
        END IF;
      END $$;
    `);
    console.log("[Sirius Automations] Table migration complete");
  } catch (err: any) {
    console.error("[Sirius Automations] Migration warning:", err?.message);
  }
}

// ── Background automation tick — call every 60 seconds ───────────────────────
export async function tickAutomations(): Promise<void> {
  try {
    const automations = await db.select().from(siriusAutomations)
      .where(eq(siriusAutomations.enabled, true));
    for (const automation of automations) {
      // Treat missing triggerType as "schedule" — don't silently skip
      const isSchedule = !automation.triggerType || automation.triggerType === "schedule";
      if (isSchedule && shouldRunNow(automation.triggerConfig || "", automation.lastRunAt)) {
        console.log(`[Sirius Automations] Running: "${automation.name}"`);
        runAutomation(automation).catch((err: any) =>
          console.error(`[Sirius Automations] Error in "${automation.name}":`, err?.message)
        );
      }
    }
  } catch (err: any) {
    console.error("[Sirius Automations] Tick error:", err?.message);
  }
}
