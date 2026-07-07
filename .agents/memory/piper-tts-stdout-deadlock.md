---
name: Piper TTS stdout deadlock
description: Root cause and fix for the "[TTS] piper timeout" bug that silenced Sirius's voice
---

## The bug
`spawn("/opt/piper/piper", [..., "--output_file", tmpFile, "--quiet"])` without consuming stdout.

Piper writes progress/stats to stdout even with `--output_file` and `--quiet`. Default Node `spawn()` gives it a 64KB stdout pipe. Long AI responses (1200 chars → 500KB+ WAV) caused piper to fill that buffer and block waiting to write, while the server waited for piper to close — a classic deadlock. The 30-second timer then killed piper → `[TTS] piper timeout`.

Short texts (< ~30 words) worked fine because the stdout output was small enough not to fill the buffer.

## The fix
Add `m.stdout.resume()` immediately after the spawn call to drain the pipe without storing the data. Applied to both `dist/index.cjs` and `src/routes/lab.ts` on the server.

**Why:** `resume()` switches the stream to flowing mode and discards data, preventing buffer back-pressure. Do NOT use `'ignore'` in stdio options if changing via source rebuild — `resume()` is the minimal runtime patch.

## How to apply
Any future `spawn()` call where you write to stdin but don't read stdout must call `childProcess.stdout.resume()` (or use `stdio: ['pipe', 'ignore', 'pipe']` in the spawn options at source level).
