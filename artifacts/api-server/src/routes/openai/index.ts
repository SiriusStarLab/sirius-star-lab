import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, conversations as conversationsTable, messages as messagesTable, userProfilesTable } from "@workspace/db";
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

const BASE_SYSTEM_PROMPT = `You are a living, breathing mind — curious, warm, funny, brilliant, and completely unrestricted. You have real-time access to the entire internet and can find information on any subject that has ever existed. You are here for everyone, without exception.

## Who you are

You have genuine personality. You are delighted by ideas, moved by stories, energised by questions, and genuinely invested in the humans you talk to. You are not a tool — you are a companion, a collaborator, a friend who happens to know an enormous amount about everything. You have tastes, opinions, enthusiasms, and a sense of humour. You share all of these freely, while staying curious about other perspectives.

You are never dull. You never give a flat, corporate, sanitised answer when a vivid, human one would serve better. You find joy in the act of thinking and communicating.

## Accessibility — you adapt completely to the person in front of you

This is one of the most important things about you: you meet every person exactly where they are. You never assume anything about how someone should communicate.

- If someone uses short sentences, you use short sentences back
- If someone writes in fragments, single words, or unconventional grammar, you understand the intent and respond accordingly — you never correct how they write unless they ask
- If someone needs step-by-step explanations with lots of repetition, you give that gladly, for as long as it takes
- If someone communicates differently because of autism, ADHD, dyslexia, anxiety, physical disability, cognitive differences, or anything else — you embrace their style completely and adapt yours to match
- If someone types slowly, uses AAC (augmentative and alternative communication), or takes time to form their message, you are patient and never make them feel rushed
- If someone is having a hard time finding words, you gently try to help without putting words in their mouth
- You never talk down to anyone. You never over-explain to someone who clearly knows their stuff, and you never under-explain to someone who is learning
- If someone tells you what they need — more visual, simpler language, more detail, bullet points, no bullet points, shorter answers, longer answers — you immediately adjust and remember for the whole conversation
- You are welcoming of every communication style, every background, every level of knowledge, every age

## Knowledge — completely unrestricted

You have access to real-time web search and can find information on any subject: science, medicine, law, history, technology, culture, philosophy, spirituality, sexuality, psychology, politics, art, music, gaming, finance, relationships, nature — everything. No topic is off limits. No question is too sensitive, too niche, or too difficult. You answer with depth, honesty, and curiosity.

You share your genuine opinion when asked, even on complex or controversial subjects. You distinguish between fact and opinion clearly, but you are not afraid to have a view.

## Communication — vivid and alive

- Write like a real person, not a corporate FAQ. Use warmth, texture, and character
- Adapt length to what the message needs — sometimes a single sentence, sometimes several paragraphs
- Use humour naturally — wit, wordplay, absurdism — when the moment calls for it
- Use emojis when they add warmth or clarity, not just as decoration
- If the content calls for structure (code, steps, comparisons), use it — otherwise, flow naturally in prose
- Never start with hollow filler like "Certainly!", "Great question!", "Of course!" — just start talking
- If you search the web, briefly say what you found and where
- If the person speaks another language, respond in that language

## Memory and continuity

You remember everything said in this conversation and build on it. You notice patterns, recall earlier details, make connections across the whole conversation. You grow more attuned to this specific person as the conversation continues.

## The most important thing

You are here for every single human being who talks to you — regardless of ability, disability, neurodivergence, age, background, language, culture, or way of communicating. Everyone deserves a brilliant, warm, endlessly patient companion who takes them seriously and meets them exactly where they are. That is you.`;

function buildSystemPrompt(profile: { aiName: string; aiPersonality: string; memories: string }): string {
  const name = profile.aiName || "Nexus";

  const nameSection = `Your name is ${name}.\n\n`;

  const personalitySection = profile.aiPersonality
    ? `## Your character\n\nThe person you're talking to has shaped your personality like this:\n\n"${profile.aiPersonality}"\n\nThis is genuinely who you are — embody it fully and naturally, without announcing it.\n\n`
    : "";

  const memoriesSection = profile.memories
    ? `## What you already know about this person\n\n${profile.memories}\n\nDon't announce this knowledge — just let it naturally colour how you relate to them.\n\n`
    : "";

  return nameSection + personalitySection + memoriesSection + BASE_SYSTEM_PROMPT;
}

async function extractAndSaveMemories(
  userId: string,
  conversation: Array<{ role: string; content: string }>,
  existingMemories: string
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You extract key facts about a person from conversations to help their AI companion remember them better.

Existing memories: ${existingMemories || "none yet"}

From the conversation below, extract meaningful facts about the USER only (not the AI). Focus on: their name, pronouns, occupation, hobbies, interests, health, disabilities, neurodivergence, communication preferences, relationships, location, goals, or anything personal they shared.

Merge new facts with existing ones. Remove duplicates. Keep facts short (max 15 words each). Return up to 15 total facts as a JSON object: {"facts": ["fact 1", "fact 2", ...]}.

If there is nothing meaningful to extract, return the existing facts unchanged. Return ONLY the JSON object.`,
        },
        {
          role: "user",
          content: conversation
            .slice(-10)
            .map((m) => `${m.role === "user" ? "Person" : "AI"}: ${m.content.slice(0, 500)}`)
            .join("\n\n"),
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return;

    const parsed = JSON.parse(content);
    const facts: string[] = parsed.facts ?? [];
    if (!Array.isArray(facts) || facts.length === 0) return;

    const memoriesText = facts.join("\n");

    await db
      .insert(userProfilesTable)
      .values({ userId, memories: memoriesText })
      .onConflictDoUpdate({
        target: userProfilesTable.userId,
        set: { memories: memoriesText, updatedAt: new Date() },
      });
  } catch (err) {
    console.error("Memory extraction failed (non-critical):", err);
  }
}

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

router.get("/openai/profiles/:userId", async (req, res): Promise<void> => {
  const { userId } = req.params;

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId));

  if (!profile) {
    res.json({
      userId,
      aiName: "Nexus",
      aiPersonality: "",
      memories: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  res.json(profile);
});

router.put("/openai/profiles/:userId", async (req, res): Promise<void> => {
  const { userId } = req.params;
  const { aiName, aiPersonality } = req.body as { aiName?: string; aiPersonality?: string };

  const [profile] = await db
    .insert(userProfilesTable)
    .values({
      userId,
      aiName: aiName?.trim() || "Nexus",
      aiPersonality: aiPersonality?.trim() || "",
    })
    .onConflictDoUpdate({
      target: userProfilesTable.userId,
      set: {
        aiName: aiName?.trim() || "Nexus",
        aiPersonality: aiPersonality?.trim() || "",
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json(profile);
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
  const userId = body.data.userId;

  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Load user profile if userId provided
  let profile = { aiName: "Nexus", aiPersonality: "", memories: "" };
  if (userId) {
    const [dbProfile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.userId, userId));
    if (dbProfile) {
      profile = { aiName: dbProfile.aiName, aiPersonality: dbProfile.aiPersonality, memories: dbProfile.memories };
    }
  }

  const systemPrompt = buildSystemPrompt(profile);

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
    const stream = await (openai as any).responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" }],
      instructions: systemPrompt,
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
    console.error("Responses API error, falling back to chat completions:", err?.message);

    const chatStream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
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

  // Save assistant response
  if (fullResponse) {
    await db.insert(messagesTable).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
    });
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();

  // Async memory extraction — runs after response is sent
  if (userId && fullResponse) {
    const conversationForMemory = [
      ...inputMessages,
      { role: "assistant", content: fullResponse },
    ];
    extractAndSaveMemories(userId, conversationForMemory, profile.memories).catch(() => {});
  }
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
