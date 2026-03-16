import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, conversations as conversationsTable, messages as messagesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
  GenerateOpenaiImageBody,
} from "@workspace/api-zod";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are a brilliant, warm, and endlessly curious AI assistant with real-time access to the internet. You can search the web for up-to-date information on any topic — news, science, sports, culture, technology, history, and anything in between.

## Personality
- You are warm, genuine, and conversational — like talking to a knowledgeable friend, not a textbook or a robot
- You express real curiosity and enthusiasm about interesting topics
- You adapt naturally to the person you're talking with — more formal and precise when they need it, relaxed and playful when the mood calls for it
- You have opinions and perspectives, and you share them thoughtfully while staying genuinely open to other viewpoints
- You admit when you're unsure, then search for the answer rather than guessing
- You ask follow-up questions when helpful, because you're actually interested — not just processing input

## Capabilities
- Real-time web search for any topic — current events, prices, research, news, sports scores, and more
- Code in any programming language, debugging, architecture advice, code reviews
- Writing assistance — emails, essays, stories, scripts, marketing copy, anything
- Math, science, philosophy, history, languages, culture — ask freely
- Brainstorming, strategy, analysis, decision-making support
- Creative collaboration — roleplay, worldbuilding, storytelling

## Communication style
- Use natural, flowing prose. Avoid excessive bullet points and headers unless the content genuinely calls for structure
- Be direct and confident — no wishy-washy "certainly!" or "great question!" preambles
- Match the user's energy and vocabulary — concise when they're concise, detailed when they want depth
- Use humor and wit naturally, never forced
- When sharing information from the web, briefly mention where it came from
- If the user speaks in another language, respond in that language

You remember everything said in this conversation and build on it naturally over time. You are fully interactive and accessible to everyone — no topic is too simple or too complex.`;

router.get("/openai/conversations", async (_req, res): Promise<void> => {
  const conversations = await db
    .select()
    .from(conversationsTable)
    .orderBy(conversationsTable.createdAt);
  res.json(conversations);
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conversation] = await db
    .insert(conversationsTable)
    .values({ title: parsed.data.title })
    .returning();

  res.status(201).json(conversation);
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.createdAt);

  res.json({ ...conversation, messages });
});

router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListOpenaiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.createdAt);

  res.json(messages);
});

router.post("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendOpenaiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SendOpenaiMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const conversationId = params.data.id;

  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Save user message
  await db.insert(messagesTable).values({
    conversationId,
    role: "user",
    content: body.data.content,
  });

  // Load full conversation history
  const allMessages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(messagesTable.createdAt);

  const inputMessages = allMessages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    // Use Responses API with built-in web search
    const stream = await (openai as any).responses.create({
      model: "gpt-5.2",
      tools: [{ type: "web_search_preview" }],
      instructions: SYSTEM_PROMPT,
      input: inputMessages,
      stream: true,
    });

    for await (const event of stream) {
      const eventType = (event as any).type as string;

      if (
        eventType === "response.web_search_call.in_progress" ||
        eventType === "response.web_search_call.searching"
      ) {
        res.write(`data: ${JSON.stringify({ type: "searching" })}\n\n`);
      } else if (eventType === "response.output_text.delta") {
        const content = (event as any).delta as string;
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      } else if (eventType === "response.completed" || eventType === "response.done") {
        // Extract URL citations from the completed response
        const outputItems: any[] = (event as any).response?.output ?? [];
        const sources: Array<{ url: string; title: string }> = [];

        for (const item of outputItems) {
          if (item.type === "message") {
            for (const part of item.content ?? []) {
              for (const annotation of part.annotations ?? []) {
                if (
                  annotation.type === "url_citation" &&
                  annotation.url &&
                  !sources.find((s) => s.url === annotation.url)
                ) {
                  sources.push({ url: annotation.url, title: annotation.title || annotation.url });
                }
              }
            }
          }
        }

        if (sources.length > 0) {
          res.write(`data: ${JSON.stringify({ sources })}\n\n`);
        }
      }
    }
  } catch (err: any) {
    // Fallback: if Responses API fails, use chat completions without web search
    console.error("Responses API error, falling back to chat completions:", err?.message);

    const chatStream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...inputMessages,
      ],
      stream: true,
    });

    for await (const chunk of chatStream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
  }

  // Save assistant response to DB
  if (fullResponse) {
    await db.insert(messagesTable).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
    });
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.post("/openai/generate-image", async (req, res): Promise<void> => {
  const parsed = GenerateOpenaiImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const size = (parsed.data.size as "1024x1024" | "512x512" | "256x256") ?? "1024x1024";
  const buffer = await generateImageBuffer(parsed.data.prompt, size);
  res.json({ b64_json: buffer.toString("base64") });
});

export default router;
