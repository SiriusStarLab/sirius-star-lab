import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../lib/lab-auth.js";
import { executeCode } from "../lib/code-sandbox.js";
import { deployChange, readSourceFile, listSourceFiles, rollbackLatest, triggerReload } from "../lib/self-deploy.js";

const router = Router();

router.use(authMiddleware);

router.post("/self/read-file", async (req: Request, res: Response) => {
  const { path } = req.body as { path: string };
  if (!path) { res.status(400).json({ error: "path required" }); return; }

  try {
    const content = await readSourceFile(path);
    res.json({ path, content, lines: content.split("\n").length });
  } catch (err: unknown) {
    res.status(404).json({ error: err instanceof Error ? err.message : "File not found" });
  }
});

router.get("/self/list-files", async (req: Request, res: Response) => {
  const subPath = (req.query.path as string) || "src";
  const files = await listSourceFiles(subPath);
  res.json({ path: subPath, files, count: files.length });
});

router.post("/self/execute", async (req: Request, res: Response) => {
  const { code, language } = req.body as { code: string; language: "javascript" | "python" };

  if (!code) { res.status(400).json({ error: "code required" }); return; }
  if (!["javascript", "python"].includes(language)) {
    res.status(400).json({ error: "language must be javascript or python" });
    return;
  }

  console.log(`[self-modify] Executing ${language} sandbox (${code.length} chars)`);
  const result = await executeCode(code, language);
  res.json(result);
});

router.post("/self/propose", async (req: Request, res: Response) => {
  const { filePath, newContent, description, originalContent } = req.body as {
    filePath: string;
    newContent: string;
    description: string;
    originalContent?: string;
  };

  if (!filePath || !newContent || !description) {
    res.status(400).json({ error: "filePath, newContent, description required" });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) {
    res.status(500).json({ error: "OPENROUTER_API_KEY not configured" });
    return;
  }

  console.log(`[self-modify] Proposal: ${filePath} — ${description}`);

  const result = await deployChange({ filePath, newContent, description, apiKey });

  if (result.success) {
    res.json({
      ...result,
      message: result.message,
    });
    setTimeout(() => {
      console.log("[self-modify] Reloading sirius-api after deploy...");
      triggerReload().catch(() => {});
    }, 3000);
  } else {
    res.json(result);
  }
});

router.post("/self/rollback", async (_req: Request, res: Response) => {
  const result = await rollbackLatest();
  if (result.success) {
    res.json(result);
    setTimeout(() => triggerReload().catch(() => {}), 3000);
  } else {
    res.status(500).json(result);
  }
});

export default router;
