import { Pool } from "pg";
import OpenAI from "openai";

/**
 * MemRL — Memory Reinforcement Learning engine.
 *
 * Frozen-model self-evolution: the LLM never retrains. All learning lives in the
 * memrl_experiences table as Intent-Experience-Utility triples. Retrieval is the
 * policy — phase 1 semantic filter (cosine over jsonb embeddings), phase 2 rank
 * by learned utility (Q-value).
 *
 * pgvector is NOT installed — embeddings are stored as jsonb float arrays and
 * cosine similarity is computed in JS. This is fine at our scale (thousands of
 * rows). Swap to pgvector later for performance if the table grows large.
 *
 * SAFETY: every public function is wrapped so a failure logs and returns a safe
 * default. Memory must NEVER block a conversation or crash the API.
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBED_MODEL = "text-embedding-3-small"; // 1536 dims, ~$0.00002/1k tokens

/** Generate an embedding for a piece of text. Returns null on failure. */
export async function embed(text: string): Promise<number[] | null> {
  try {
    if (!text || !text.trim()) return null;
    const res = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: text.slice(0, 8000),
    });
    return res.data[0]?.embedding ?? null;
  } catch (e: any) {
    console.error("[memrl] embed failed:", e?.message || e);
    return null;
  }
}

/** Cosine similarity between two equal-length vectors. */
function cosine(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Write a completed task as an experience. Non-blocking: any failure logs and
 * returns null. Call this after a task finishes.
 */
export async function writeExperience(params: {
  intent: string;
  experience: string;
  success: boolean;
  utility?: number; // initial Q-value; defaults from success
}): Promise<number | null> {
  try {
    const { intent, experience, success } = params;
    if (!intent?.trim() || !experience?.trim()) return null;

    const initialUtility =
      params.utility ?? (success ? 0.6 : 0.3); // start optimistic on success

    const emb = await embed(`${intent}\n${experience}`);

    const res = await pool.query(
      `INSERT INTO memrl_experiences
         (intent, experience, utility, embedding, success, created_at, retrieval_count)
       VALUES ($1, $2, $3, $4, $5, NOW(), 0)
       RETURNING id`,
      [intent, experience, initialUtility, emb ? JSON.stringify(emb) : null, success]
    );
    return res.rows[0]?.id ?? null;
  } catch (e: any) {
    console.error("[memrl] writeExperience failed:", e?.message || e);
    return null;
  }
}

/**
 * Two-phase retrieval. Phase 1: cosine filter over embeddings (threshold 0.75).
 * Phase 2: rank surviving rows by utility, return top N. Returns [] on failure.
 */
export async function retrieveExperiences(
  query: string,
  topN = 3,
  threshold = 0.75
): Promise<Array<{ id: number; intent: string; experience: string; utility: number; score: number }>> {
  try {
    const qEmb = await embed(query);
    if (!qEmb) return [];

    const { rows } = await pool.query(
      `SELECT id, intent, experience, utility, embedding
         FROM memrl_experiences
        WHERE embedding IS NOT NULL
        ORDER BY id DESC
        LIMIT 500`
    );

    const scored = rows
      .map((r: any) => {
        let emb: number[] | null = null;
        try { emb = typeof r.embedding === "string" ? JSON.parse(r.embedding) : r.embedding; } catch {}
        const sim = emb ? cosine(qEmb, emb) : 0;
        return { id: r.id, intent: r.intent, experience: r.experience, utility: r.utility, score: sim };
      })
      .filter(r => r.score >= threshold)
      // combined rank: semantic similarity weighted by learned utility
      .sort((a: any, b: any) => (b.score * (0.5 + b.utility)) - (a.score * (0.5 + a.utility)))
      .slice(0, topN);

    // mark retrieved (non-blocking)
    if (scored.length) {
      const ids = scored.map((s: any) => s.id);
      pool.query(
        `UPDATE memrl_experiences
            SET retrieval_count = retrieval_count + 1, last_retrieved_at = NOW()
          WHERE id = ANY($1)`,
        [ids]
      ).catch(() => {});
    }

    return scored;
  } catch (e: any) {
    console.error("[memrl] retrieveExperiences failed:", e?.message || e);
    return [];
  }
}

/**
 * Update the Q-value of an experience from feedback. reward in [-1, 1].
 * Simple TD update: U <- U + alpha * (reward - U). Clamped to [0, 1].
 */
export async function updateUtility(id: number, reward: number, alpha = 0.3): Promise<void> {
  try {
    const { rows } = await pool.query(`SELECT utility FROM memrl_experiences WHERE id = $1`, [id]);
    if (!rows.length) return;
    const current = rows[0].utility ?? 0.5;
    let next = current + alpha * (reward - current);
    next = Math.max(0, Math.min(1, next));
    await pool.query(
      `UPDATE memrl_experiences SET utility = $1, feedback_score = $2 WHERE id = $3`,
      [next, reward, id]
    );
  } catch (e: any) {
    console.error("[memrl] updateUtility failed:", e?.message || e);
  }
}
