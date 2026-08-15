/**
 * Mnemosyne - Conversation Memory Service
 * 
 * Provides conversation context loading and message persistence
 * for maintaining chat history across sessions.
 */

import { db, messages as messagesTable, conversations as conversationsTable } from "@workspace/db";
import { eq, desc, and, ne } from "drizzle-orm";

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Load the last N messages from a conversation to provide context
 * @param conversationId The conversation ID to load messages from
 * @param limit Maximum number of messages to load (default: 20)
 * @returns Array of messages in chronological order (oldest first)
 */
export async function loadConversationContext(
  conversationId: number,
  limit: number = 20
): Promise<ConversationMessage[]> {
  try {
    // Fetch the last N messages in reverse chronological order
    const recentMessages = await db
      .select({
        role: messagesTable.role,
        content: messagesTable.content,
      })
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(limit);

    // Reverse to get chronological order (oldest first)
    return recentMessages.reverse().map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));
  } catch (error) {
    console.error("Error loading conversation context:", error);
    return [];
  }
}

/**
 * Load messages from the LAST COMPLETE conversation for this user.
 * This gives Sirius proper continuity — she sees what actually happened
 * in the most recent session, not a random scatter of messages.
 */
export async function loadCrossSessionContext(
  userId: string,
  limit: number = 50,
  excludeConversationId?: number,
): Promise<ConversationMessage[]> {
  try {
    // Step 1: Find the most recent previous conversations (by DB id desc = most recent first)
    const recentConvs = await db
      .select({ id: conversationsTable.id, title: conversationsTable.title })
      .from(conversationsTable)
      .where(
        excludeConversationId !== undefined
          ? and(eq(conversationsTable.userId, userId), ne(conversationsTable.id, excludeConversationId))
          : eq(conversationsTable.userId, userId),
      )
      .orderBy(desc(conversationsTable.id))
      .limit(3);

    if (recentConvs.length === 0) return [];

    // Step 2: Load messages from the most recent conversation first
    // If it was too short (< 4 messages), also load from the next one
    const allMessages: Array<{ role: string; content: string; convId: number }> = [];

    for (const conv of recentConvs) {
      const msgs = await db
        .select({ role: messagesTable.role, content: messagesTable.content })
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(limit);

      const reversed = msgs.reverse().map(m => ({ ...m, convId: conv.id }));
      allMessages.unshift(...reversed);

      // If the most recent conversation had substantial content, that's enough
      if (reversed.length >= 6) break;
    }

    // Return up to `limit` messages, most recent last
    const slice = allMessages.slice(-limit);
    console.log(`[Mnemosyne] Loaded ${slice.length} messages from last ${recentConvs.length} conversation(s)`);

    return slice.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  } catch (error) {
    console.error("Error loading cross-session context:", error);
    return [];
  }
}

/**
 * Save a message to the conversation history
 * @param conversationId The conversation ID to save to
 * @param role The role of the message sender
 * @param content The message content
 */
export async function saveMessage(
  conversationId: number,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  try {
    await db.insert(messagesTable).values({
      conversationId,
      role,
      content,
    });
  } catch (error) {
    console.error("Error saving message:", error);
    throw error;
  }
}

/**
 * Save multiple messages to the conversation history
 * @param conversationId The conversation ID to save to
 * @param messages Array of messages to save
 */
export async function saveMessages(
  conversationId: number,
  messages: Array<{ role: "user" | "assistant"; content: string }>
): Promise<void> {
  try {
    const values = messages.map(msg => ({
      conversationId,
      role: msg.role,
      content: msg.content,
    }));
    
    await db.insert(messagesTable).values(values);
  } catch (error) {
    console.error("Error saving messages:", error);
    throw error;
  }
}
