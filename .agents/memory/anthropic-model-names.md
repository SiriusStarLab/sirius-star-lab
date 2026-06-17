---
name: Anthropic model names — direct vs OpenRouter
description: Model name format differs between direct Anthropic API and OpenRouter; using wrong format causes 404.
---

## Rule
- **Direct Anthropic API** (`ANTHROPIC_API_KEY` set, `baseURL: "https://api.anthropic.com/v1"`): use bare name — `claude-sonnet-4-5`
- **OpenRouter** (`baseURL: "https://openrouter.ai/api/v1"`): use prefixed name — `anthropic/claude-sonnet-4-5`

Never pass `anthropic/claude-sonnet-4-5` to the native Anthropic API — it returns `404 not_found_error: model: anthropic/claude-sonnet-4-5`.

**Why:** Anthropic's `/v1/messages` endpoint does not accept OpenRouter-style `provider/model` prefixes. Those prefixes are an OpenRouter routing convention. Discovered when sirius-worker failed all tasks with `404 model: anthropic/claude-sonnet-4-5`.

**How to apply:** In any new code that passes a model name, gate on `process.env.ANTHROPIC_API_KEY`:
```ts
model: process.env.ANTHROPIC_API_KEY ? "claude-sonnet-4-5" : "anthropic/claude-sonnet-4-5"
```

Note: the lab.ts routes use `openai.chat.completions.create()` which calls `/v1/chat/completions` on Anthropic — that endpoint appears to accept the `anthropic/` prefix as an alias. Only `/v1/messages` (native SDK) and direct chat completions from worker processes reliably require the bare name.
