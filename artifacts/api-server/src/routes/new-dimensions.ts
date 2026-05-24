import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, count } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, ndAccounts, ndApiKeys, ndProjects, ndDrawings } from "@workspace/db";

const router: IRouter = Router();

const JWT_SECRET = process.env.ND_JWT_SECRET || "nd-jwt-secret-change-in-prod";
const KEY_PREFIX_LEN = 8;

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const key = `nd_live_${raw}`;
  const prefix = `nd_live_${raw.slice(0, KEY_PREFIX_LEN)}`;
  return { key, prefix, hash: hashKey(key) };
}

function signToken(accountId: number, email: string): string {
  return jwt.sign({ accountId, email }, JWT_SECRET, { expiresIn: "30d" });
}

// ── Auth middleware ────────────────────────────────────────────────────────────

async function requireJwt(req: Request, res: Response, next: () => void) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "JWT required" });
    return;
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { accountId: number; email: string };
    (req as any).ndAccount = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function requireApiKeyOrJwt(req: Request, res: Response, next: () => void) {
  const apiKey = req.headers["x-api-key"] as string | undefined;
  if (apiKey) {
    const hash = hashKey(apiKey);
    const [key] = await db.select().from(ndApiKeys).where(eq(ndApiKeys.keyHash, hash));
    if (!key) { res.status(401).json({ error: "Invalid API key" }); return; }
    await db.update(ndApiKeys).set({ lastUsedAt: new Date() }).where(eq(ndApiKeys.id, key.id));
    (req as any).ndAccount = { accountId: key.accountId };
    next();
    return;
  }
  await requireJwt(req, res, next);
}

// ── POST /api/nd/auth/register ─────────────────────────────────────────────────
router.post("/nd/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) { res.status(400).json({ error: "Email and password required" }); return; }
    const existing = await db.select({ id: ndAccounts.id }).from(ndAccounts).where(eq(ndAccounts.email, email.toLowerCase()));
    if (existing.length > 0) { res.status(400).json({ error: "Email already registered" }); return; }
    const passwordHash = await bcrypt.hash(password, 12);
    const [account] = await db.insert(ndAccounts).values({ email: email.toLowerCase(), passwordHash, name: name || null }).returning();
    const token = signToken(account.id, account.email);
    res.status(201).json({ token, accountId: account.id, email: account.email, name: account.name });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /api/nd/auth/login ────────────────────────────────────────────────────
router.post("/nd/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: "Email and password required" }); return; }
    const [account] = await db.select().from(ndAccounts).where(eq(ndAccounts.email, email.toLowerCase()));
    if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken(account.id, account.email);
    res.json({ token, accountId: account.id, email: account.email, name: account.name });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── GET /api/nd/keys ───────────────────────────────────────────────────────────
router.get("/nd/keys", requireJwt, async (req: Request, res: Response) => {
  try {
    const { accountId } = (req as any).ndAccount;
    const keys = await db.select({
      id: ndApiKeys.id, name: ndApiKeys.name, keyPrefix: ndApiKeys.keyPrefix,
      lastUsedAt: ndApiKeys.lastUsedAt, createdAt: ndApiKeys.createdAt,
    }).from(ndApiKeys).where(eq(ndApiKeys.accountId, accountId));
    res.json(keys);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /api/nd/keys ──────────────────────────────────────────────────────────
router.post("/nd/keys", requireJwt, async (req: Request, res: Response) => {
  try {
    const { accountId } = (req as any).ndAccount;
    const { name } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Key name required" }); return; }
    const { key, prefix, hash } = generateApiKey();
    const [saved] = await db.insert(ndApiKeys)
      .values({ accountId, name: name.trim(), keyHash: hash, keyPrefix: prefix })
      .returning();
    res.status(201).json({ id: saved.id, name: saved.name, keyPrefix: saved.keyPrefix, key, createdAt: saved.createdAt });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── DELETE /api/nd/keys/:id ────────────────────────────────────────────────────
router.delete("/nd/keys/:id", requireJwt, async (req: Request, res: Response) => {
  try {
    const { accountId } = (req as any).ndAccount;
    const id = Number(req.params.id);
    const deleted = await db.delete(ndApiKeys)
      .where(and(eq(ndApiKeys.id, id), eq(ndApiKeys.accountId, accountId)))
      .returning({ id: ndApiKeys.id });
    if (!deleted.length) { res.status(404).json({ error: "Key not found" }); return; }
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── GET /api/nd/projects ───────────────────────────────────────────────────────
router.get("/nd/projects", requireApiKeyOrJwt, async (req: Request, res: Response) => {
  try {
    const { accountId } = (req as any).ndAccount;
    const projects = await db.select().from(ndProjects).where(eq(ndProjects.accountId, accountId));
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /api/nd/projects ──────────────────────────────────────────────────────
router.post("/nd/projects", requireApiKeyOrJwt, async (req: Request, res: Response) => {
  try {
    const { accountId } = (req as any).ndAccount;
    const { name, industry, specs, drawingNotes, externalRef } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Project name required" }); return; }
    const [project] = await db.insert(ndProjects)
      .values({ accountId, name: name.trim(), industry: industry || null, specs: specs || null, drawingNotes: drawingNotes || null, externalRef: externalRef || null, status: "pending" })
      .returning();
    res.status(201).json(project);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── GET /api/nd/projects/:id ───────────────────────────────────────────────────
router.get("/nd/projects/:id", requireApiKeyOrJwt, async (req: Request, res: Response) => {
  try {
    const { accountId } = (req as any).ndAccount;
    const id = Number(req.params.id);
    const [project] = await db.select().from(ndProjects).where(and(eq(ndProjects.id, id), eq(ndProjects.accountId, accountId)));
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── PATCH /api/nd/projects/:id ─────────────────────────────────────────────────
router.patch("/nd/projects/:id", requireApiKeyOrJwt, async (req: Request, res: Response) => {
  try {
    const { accountId } = (req as any).ndAccount;
    const id = Number(req.params.id);
    const { status, drawingNotes, specs } = req.body;
    const [updated] = await db.update(ndProjects)
      .set({ ...(status && { status }), ...(drawingNotes !== undefined && { drawingNotes }), ...(specs !== undefined && { specs }), updatedAt: new Date() })
      .where(and(eq(ndProjects.id, id), eq(ndProjects.accountId, accountId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Project not found" }); return; }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── GET /api/nd/projects/:id/drawings ─────────────────────────────────────────
router.get("/nd/projects/:id/drawings", requireApiKeyOrJwt, async (req: Request, res: Response) => {
  try {
    const { accountId } = (req as any).ndAccount;
    const id = Number(req.params.id);
    const [project] = await db.select({ id: ndProjects.id }).from(ndProjects)
      .where(and(eq(ndProjects.id, id), eq(ndProjects.accountId, accountId)));
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    const drawings = await db.select().from(ndDrawings).where(eq(ndDrawings.projectId, id));
    res.json(drawings);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── POST /api/nd/projects/:id/drawings ────────────────────────────────────────
router.post("/nd/projects/:id/drawings", requireApiKeyOrJwt, async (req: Request, res: Response) => {
  try {
    const { accountId } = (req as any).ndAccount;
    const id = Number(req.params.id);
    const [project] = await db.select({ id: ndProjects.id }).from(ndProjects)
      .where(and(eq(ndProjects.id, id), eq(ndProjects.accountId, accountId)));
    if (!project) { res.status(404).json({ error: "Project not found" }); return; }
    const { fileName, fileUrl, notes, uploadedBy } = req.body;
    if (!fileName?.trim()) { res.status(400).json({ error: "fileName required" }); return; }
    const [drawing] = await db.insert(ndDrawings)
      .values({ projectId: id, fileName: fileName.trim(), fileUrl: fileUrl || null, notes: notes || null, uploadedBy: uploadedBy || "engineer" })
      .returning();
    await db.update(ndProjects).set({ status: "complete", updatedAt: new Date() }).where(eq(ndProjects.id, id));
    res.status(201).json(drawing);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ── GET /api/nd/dashboard ──────────────────────────────────────────────────────
router.get("/nd/dashboard", requireJwt, async (req: Request, res: Response) => {
  try {
    const { accountId } = (req as any).ndAccount;
    const projects = await db.select().from(ndProjects).where(eq(ndProjects.accountId, accountId));
    const drawings = await db.select({ id: ndDrawings.id, projectId: ndDrawings.projectId }).from(ndDrawings)
      .where(eq(ndProjects.accountId, accountId));
    const [{ value: keyCount }] = await db.select({ value: count() }).from(ndApiKeys).where(eq(ndApiKeys.accountId, accountId));
    res.json({
      totalProjects: projects.length,
      pendingProjects: projects.filter(p => p.status === "pending").length,
      completeProjects: projects.filter(p => p.status === "complete").length,
      totalDrawings: drawings.length,
      totalKeys: Number(keyCount),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
