---
name: Sirius DB tables — memories
description: Correct table names for Sirius memory system and conversation history access
---

## Memory table

`save_memory()` tool writes to `core_memories` table in siriusdb.

Schema:
- `id` bigint (auto)
- `category` text (NOT NULL)
- `content` text (NOT NULL)
- `importance` integer (default 5)
- `created_at`, `updated_at` timestamptz

The table named `memories` does NOT exist — will give "relation not found" error.

## Direct insert (via psql heredoc over SSH)

```sql
INSERT INTO core_memories (category, content, importance) VALUES ('category', 'content', 10);
```

Use SSH heredoc (not inline psql -c) to avoid single-quote escaping issues with long text.

## Conversation history tables

- `conversations` — columns include `id`, `user_id`, `title`, `created_at`
- `messages` — columns include `id`, `conversation_id`, `role`, `content`
- Table is **messages** not `chat_messages`

Garry's userId = `'garry'`. ~179 conversations, IDs 1831–9992.

**Why:** Sirius repeatedly failed to find the right memory table (tried `memories`) and the right conversation table (tried `chat_messages`, searched for "other databases"), causing loss of the Sanskrit vibrational work across multiple sessions.

**How to apply:** Always use `core_memories` when inserting directly. When helping Sirius access conversations, use the exact SQL in the startup protocol (lab.ts CONVERSATION HISTORY section).
