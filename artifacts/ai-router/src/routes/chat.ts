import { Router } from "express";
import type { Request, Response } from "express";
import { requireApiKey } from "../middleware/auth.js";
import { resolveRoute, calcCost } from "../routing.js";
import { streamOpenRouter, chatOpenRouter } from "../providers/openrouter.js";
import { streamOpenAI, chatOpenAI } from "../providers/openai.js";
import { streamAnthropic } from "../providers/anthropic.js";
import { db, schema } from "../db/index.js";
import type { ChatRequest, StreamChunk } from "../types.js";

export const chatRouter = Router();

chatRouter.post("/chat/completions", requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const body = req.body as ChatRequest;

  if (!body.model || !body.messages) {
    res.status(400).json({ error: { message: "model and messages are required", type: "invalid_request" } });
    return;
  }

  const route  = resolveRoute(body.model);
  const start  = Date.now();
  const doStream = body.stream !== false;
  const reqId  = `rtr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // ── Non-streaming path ────────────────────────────────────────────────────
  if (!doStream) {
    try {
      let result: { content: string; usage: { prompt_tokens: number; completion_tokens: number } };
      if (route.provider === "openai") {
        result = await chatOpenAI(body);
      } else {
        result = await chatOpenRouter(body);
      }
      const cost = calcCost(route, result.usage.prompt_tokens, result.usage.completion_tokens);
      await db.insert(schema.routerRequests).values({
        apiKeyId: req.apiKeyId ?? null, apiKeyName: req.apiKeyName ?? null,
        model: body.model, provider: route.provider,
        promptTokens: result.usage.prompt_tokens, completionTokens: result.usage.completion_tokens,
        costUsd: cost.toFixed(6), durationMs: Date.now() - start, success: true,
      }).catch(console.error);
      res.json({
        id: reqId, object: "chat.completion", created: Math.floor(Date.now() / 1000),
        model: body.model,
        choices: [{ index: 0, message: { role: "assistant", content: result.content }, finish_reason: "stop" }],
        usage: { prompt_tokens: result.usage.prompt_tokens, completion_tokens: result.usage.completion_tokens, total_tokens: result.usage.prompt_tokens + result.usage.completion_tokens },
      });
    } catch (e: any) {
      const err = e?.message ?? "Unknown error";
      await db.insert(schema.routerRequests).values({
        apiKeyId: req.apiKeyId ?? null, apiKeyName: req.apiKeyName ?? null,
        model: body.model, provider: route.provider,
        durationMs: Date.now() - start, success: false, error: err,
      }).catch(console.error);
      res.status(502).json({ error: { message: err, type: "provider_error" } });
    }
    return;
  }

  // ── Streaming path ────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const onChunk = (chunk: StreamChunk) => {
    const payload = {
      id: reqId, object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000), model: body.model,
      choices: [{ index: 0, delta: chunk.delta, finish_reason: chunk.finish_reason }],
    };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const onDone = async (usage: { prompt_tokens: number; completion_tokens: number }) => {
    const cost = calcCost(route, usage.prompt_tokens, usage.completion_tokens);
    res.write(`data: [DONE]\n\n`);
    res.end();
    await db.insert(schema.routerRequests).values({
      apiKeyId: req.apiKeyId ?? null, apiKeyName: req.apiKeyName ?? null,
      model: body.model, provider: route.provider,
      promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens,
      costUsd: cost.toFixed(6), durationMs: Date.now() - start, success: true,
    }).catch(console.error);
  };

  const onError = async (err: string) => {
    console.error(`[router] ${route.provider} error:`, err);
    res.write(`data: {"error":{"message":"${err}","type":"provider_error"}}\n\n`);
    res.end();
    await db.insert(schema.routerRequests).values({
      apiKeyId: req.apiKeyId ?? null, apiKeyName: req.apiKeyName ?? null,
      model: body.model, provider: route.provider,
      durationMs: Date.now() - start, success: false, error: err,
    }).catch(console.error);
  };

  try {
    if (route.provider === "anthropic") {
      await streamAnthropic(body, onChunk, onDone, onError);
    } else if (route.provider === "openai") {
      await streamOpenAI(body, onChunk, onDone, onError);
    } else {
      await streamOpenRouter(body, onChunk, onDone, onError);
    }
  } catch (e: any) {
    await onError(e?.message ?? "Unknown error");
  }
});
