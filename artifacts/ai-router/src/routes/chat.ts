import { Router } from "express";
import type { Request, Response } from "express";
import { requireApiKey } from "../middleware/auth.js";
import { rateLimitByKey } from "../middleware/rateLimit.js";
import { resolveRoute, calcCost, calcCostFromActual, calcCharge } from "../routing.js";
import { streamOpenRouter, chatOpenRouter } from "../providers/openrouter.js";
import type { UsageResult } from "../providers/openrouter.js";
import { streamOpenAI, chatOpenAI } from "../providers/openai.js";
import { streamAnthropic } from "../providers/anthropic.js";
import { db, schema } from "../db/index.js";
import { eq, and } from "drizzle-orm";
import { buildCacheKey, getCached, setCached } from "../lib/cache.js";
import { checkSpendAlert } from "../lib/alerts.js";
import type { ChatRequest, StreamChunk } from "../types.js";

export const chatRouter = Router();

// ── Resolve model alias for a customer ────────────────────────────────────────
async function resolveAlias(model: string, customerId: number | undefined): Promise<string> {
  if (!customerId) return model;
  const [alias] = await db
    .select({ targetModel: schema.routerAliases.targetModel })
    .from(schema.routerAliases)
    .where(and(
      eq(schema.routerAliases.customerId, customerId),
      eq(schema.routerAliases.alias, model.toLowerCase()),
    ))
    .limit(1);
  return alias?.targetModel ?? model;
}

// ── Get fallback chain for a customer ─────────────────────────────────────────
async function getFallbacks(primaryModel: string, customerId: number | undefined): Promise<string[]> {
  if (!customerId) return [];
  const [row] = await db
    .select({ fallbackModels: schema.routerFallbacks.fallbackModels })
    .from(schema.routerFallbacks)
    .where(and(
      eq(schema.routerFallbacks.customerId, customerId),
      eq(schema.routerFallbacks.primaryModel, primaryModel),
    ))
    .limit(1);
  return (row?.fallbackModels as string[]) ?? [];
}

// ── Deduct credits from customer balance ──────────────────────────────────────
async function deductCredits(customerId: number, chargedUsd: number): Promise<void> {
  if (chargedUsd <= 0) return;
  const [customer] = await db
    .select({ balanceUsd: schema.customers.balanceUsd })
    .from(schema.customers)
    .where(eq(schema.customers.id, customerId))
    .limit(1);
  if (!customer) return;

  const newBalance = Math.max(0, Number(customer.balanceUsd) - chargedUsd);
  await db.update(schema.customers)
    .set({ balanceUsd: String(newBalance) })
    .where(eq(schema.customers.id, customerId));

  // Fire spend alert check (non-blocking)
  checkSpendAlert(customerId, newBalance).catch(() => null);
}

// ── Log request ───────────────────────────────────────────────────────────────
async function logRequest(params: {
  customerId?: number; apiKeyId?: number; apiKeyName?: string;
  model: string; resolvedModel: string; provider: string;
  promptTokens: number; completionTokens: number;
  costUsd: number; chargedUsd: number; durationMs: number;
  cached: boolean; fallbackUsed: boolean; success: boolean; error?: string;
}): Promise<void> {
  await db.insert(schema.routerRequests).values({
    customerId:       params.customerId ?? null,
    apiKeyId:         params.apiKeyId ?? null,
    apiKeyName:       params.apiKeyName ?? null,
    model:            params.model,
    resolvedModel:    params.resolvedModel,
    provider:         params.provider,
    promptTokens:     params.promptTokens,
    completionTokens: params.completionTokens,
    costUsd:          params.costUsd.toFixed(6),
    chargedUsd:       params.chargedUsd.toFixed(6),
    durationMs:       params.durationMs,
    cached:           params.cached,
    fallbackUsed:     params.fallbackUsed,
    success:          params.success,
    error:            params.error ?? null,
  }).catch(console.error);
}

// ── Chat completions ──────────────────────────────────────────────────────────
chatRouter.post("/chat/completions", requireApiKey, rateLimitByKey, async (req: Request, res: Response): Promise<void> => {
  const body = req.body as ChatRequest;
  if (!body.model || !Array.isArray(body.messages)) {
    res.status(400).json({ error: { message: "model and messages are required", type: "invalid_request" } });
    return;
  }

  // ── Resolve alias ────────────────────────────────────────────────────────
  const requestedModel  = body.model;
  const resolvedModel   = await resolveAlias(requestedModel, req.customerId);
  const effectiveBody   = { ...body, model: resolvedModel };

  // ── Cache check (non-streaming only) ─────────────────────────────────────
  const doStream  = body.stream !== false;
  const cacheKey  = doStream ? null : buildCacheKey(resolvedModel, body.messages);
  const start     = Date.now();
  const reqId     = `rtr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (cacheKey && !doStream) {
    const cached = await getCached(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.json({ ...cached, id: reqId });

      // Log as cached (0 cost)
      const route = resolveRoute(resolvedModel);
      await logRequest({
        customerId: req.customerId, apiKeyId: req.apiKeyId, apiKeyName: req.apiKeyName,
        model: requestedModel, resolvedModel, provider: route.provider,
        promptTokens: 0, completionTokens: 0, costUsd: 0, chargedUsd: 0,
        durationMs: Date.now() - start, cached: true, fallbackUsed: false, success: true,
      });
      return;
    }
  }

  // ── Get fallback chain ───────────────────────────────────────────────────
  const fallbacks      = await getFallbacks(resolvedModel, req.customerId);
  const modelsToTry    = [resolvedModel, ...fallbacks];
  let   fallbackUsed   = false;
  let   finalModel     = resolvedModel;

  // ── Try each model in chain ──────────────────────────────────────────────
  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    const tryModel = modelsToTry[attempt]!;
    if (attempt > 0) fallbackUsed = true;
    finalModel = tryModel;
    const tryBody  = { ...effectiveBody, model: tryModel };
    const route    = resolveRoute(tryModel);

    // ── Non-streaming ──────────────────────────────────────────────────────
    if (!doStream) {
      try {
        // chatOpenRouter now returns actual_cost_usd when available
        let result: { content: string; usage: UsageResult };
        if (route.provider === "openai") {
          const r = await chatOpenAI(tryBody);
          result = { content: r.content, usage: { ...r.usage, actual_cost_usd: null } };
        } else {
          result = await chatOpenRouter(tryBody);
        }

        const cost    = calcCostFromActual(route, result.usage.prompt_tokens, result.usage.completion_tokens, result.usage.actual_cost_usd);
        const charged = calcCharge(cost);
        if (req.customerId) await deductCredits(req.customerId, charged);

        const responseBody = {
          id: reqId, object: "chat.completion", created: Math.floor(Date.now() / 1000),
          model: tryModel,
          choices: [{ index: 0, message: { role: "assistant", content: result.content }, finish_reason: "stop" }],
          usage: { prompt_tokens: result.usage.prompt_tokens, completion_tokens: result.usage.completion_tokens, total_tokens: result.usage.prompt_tokens + result.usage.completion_tokens },
        };

        if (cacheKey) await setCached(cacheKey, tryModel, responseBody);
        res.setHeader("X-Cache", "MISS");
        if (fallbackUsed) res.setHeader("X-Fallback-Model", tryModel);
        res.json(responseBody);

        await logRequest({
          customerId: req.customerId, apiKeyId: req.apiKeyId, apiKeyName: req.apiKeyName,
          model: requestedModel, resolvedModel: tryModel, provider: route.provider,
          promptTokens: result.usage.prompt_tokens, completionTokens: result.usage.completion_tokens,
          costUsd: cost, chargedUsd: charged, durationMs: Date.now() - start,
          cached: false, fallbackUsed, success: true,
        });
        return;
      } catch (e: any) {
        if (attempt < modelsToTry.length - 1) {
          console.warn(`[router] ${tryModel} failed (${e?.message}), trying fallback: ${modelsToTry[attempt + 1]}`);
          continue;
        }
        await logRequest({
          customerId: req.customerId, apiKeyId: req.apiKeyId, apiKeyName: req.apiKeyName,
          model: requestedModel, resolvedModel: tryModel, provider: route.provider,
          promptTokens: 0, completionTokens: 0, costUsd: 0, chargedUsd: 0,
          durationMs: Date.now() - start, cached: false, fallbackUsed, success: false, error: e?.message,
        });
        res.status(502).json({ error: { message: e?.message ?? "Provider error", type: "provider_error" } });
        return;
      }
    }

    // ── Streaming ──────────────────────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (fallbackUsed) res.setHeader("X-Fallback-Model", tryModel);
    res.flushHeaders();

    let streamFailed = false;

    const onChunk = (chunk: StreamChunk) => {
      const payload = {
        id: reqId, object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000), model: tryModel,
        choices: [{ index: 0, delta: chunk.delta, finish_reason: chunk.finish_reason }],
      };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    // Handles both UsageResult (OpenRouter, with actual_cost_usd) and plain token counts (Anthropic/OpenAI)
    const onDone = async (usage: UsageResult | { prompt_tokens: number; completion_tokens: number }) => {
      const actualCost = "actual_cost_usd" in usage ? usage.actual_cost_usd : null;
      const cost    = calcCostFromActual(route, usage.prompt_tokens, usage.completion_tokens, actualCost);
      const charged = calcCharge(cost);
      if (req.customerId) await deductCredits(req.customerId, charged);
      res.write(`data: [DONE]\n\n`);
      res.end();
      await logRequest({
        customerId: req.customerId, apiKeyId: req.apiKeyId, apiKeyName: req.apiKeyName,
        model: requestedModel, resolvedModel: tryModel, provider: route.provider,
        promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens,
        costUsd: cost, chargedUsd: charged, durationMs: Date.now() - start,
        cached: false, fallbackUsed, success: true,
      });
    };

    const onError = async (err: string) => {
      streamFailed = true;
      console.error(`[router] ${route.provider} stream error:`, err);
      await logRequest({
        customerId: req.customerId, apiKeyId: req.apiKeyId, apiKeyName: req.apiKeyName,
        model: requestedModel, resolvedModel: tryModel, provider: route.provider,
        promptTokens: 0, completionTokens: 0, costUsd: 0, chargedUsd: 0,
        durationMs: Date.now() - start, cached: false, fallbackUsed, success: false, error: err,
      });
    };

    try {
      if (route.provider === "anthropic") await streamAnthropic(tryBody, onChunk, onDone, onError);
      else if (route.provider === "openai") await streamOpenAI(tryBody, onChunk, onDone, onError);
      else await streamOpenRouter(tryBody, onChunk, onDone, onError);
    } catch (e: any) {
      await onError(e?.message ?? "Unknown error");
    }

    if (!streamFailed) return;

    // Stream started but failed — can't fallback once headers sent
    res.write(`data: {"error":{"message":"Provider error — try again","type":"provider_error"}}\n\n`);
    res.end();
    return;
  }

  void finalModel; // suppress unused var warning
});
