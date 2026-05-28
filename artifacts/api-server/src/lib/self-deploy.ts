import { exec } from "child_process";
import { promisify } from "util";
import { readFile, writeFile, copyFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { existsSync } from "fs";
import { reviewCodeChange, checkProtectedPath } from "./code-reviewer.js";

const execAsync = promisify(exec);

const SOURCE_DIR = process.env.SIRIUS_SOURCE_DIR || "/opt/sirius-source";
const PROD_DIST = process.env.SIRIUS_PROD_DIST || "/opt/sirius/artifacts/api-server/dist/index.cjs";
const BUILD_DIST = join(SOURCE_DIR, "artifacts/api-server/dist/index.cjs");
const BACKUP_DIR = "/opt/sirius-backups";

let deployLock = false;

export interface DeployResult {
  success: boolean;
  stage: "validation" | "protected" | "typecheck" | "review" | "build" | "deploy" | "complete";
  message: string;
  reviewSummary?: string;
  reviewConcerns?: string[];
  typecheckErrors?: string;
  backupPath?: string;
}

export async function readSourceFile(relativePath: string): Promise<string> {
  const safePath = relativePath.replace(/\.\./g, "").replace(/^\//, "");
  const fullPath = join(SOURCE_DIR, "artifacts/api-server", safePath);

  if (!fullPath.startsWith(join(SOURCE_DIR, "artifacts/api-server"))) {
    throw new Error("Path traversal detected");
  }

  return readFile(fullPath, "utf-8");
}

export async function listSourceFiles(subPath = "src"): Promise<string[]> {
  const safePath = subPath.replace(/\.\./g, "").replace(/^\//, "");
  const fullPath = join(SOURCE_DIR, "artifacts/api-server", safePath);

  try {
    const { stdout } = await execAsync(`find ${fullPath} -type f -name "*.ts" | sort`);
    return stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((p) => p.replace(join(SOURCE_DIR, "artifacts/api-server") + "/", ""));
  } catch {
    return [];
  }
}

export async function deployChange(params: {
  filePath: string;
  newContent: string;
  description: string;
  apiKey: string;
}): Promise<DeployResult> {
  const { filePath, newContent, description, apiKey } = params;

  if (deployLock) {
    return {
      success: false,
      stage: "validation",
      message: "A deployment is already in progress. Try again in a moment.",
    };
  }

  const safePath = filePath.replace(/\.\./g, "").replace(/^\//, "");

  if (checkProtectedPath(safePath)) {
    return {
      success: false,
      stage: "protected",
      message: `${safePath} is a protected file. It cannot be modified autonomously.`,
    };
  }

  const fullPath = join(SOURCE_DIR, "artifacts/api-server", safePath);
  if (!fullPath.startsWith(join(SOURCE_DIR, "artifacts/api-server", "src"))) {
    return {
      success: false,
      stage: "validation",
      message: "Only files within the src/ directory can be modified.",
    };
  }

  deployLock = true;
  let originalContent = "";
  let didWriteFile = false;

  try {
    // Read original content
    try {
      originalContent = await readFile(fullPath, "utf-8");
    } catch {
      originalContent = "";
    }

    // AI Review (before touching files)
    const review = await reviewCodeChange({
      filePath: safePath,
      originalContent,
      newContent,
      description,
      apiKey,
    });

    if (!review.approved) {
      return {
        success: false,
        stage: "review",
        message: `AI reviewer rejected this change: ${review.summary}`,
        reviewSummary: review.summary,
        reviewConcerns: review.concerns,
      };
    }

    // Write file
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, newContent, "utf-8");
    didWriteFile = true;

    // TypeScript check
    try {
      await execAsync(
        `cd ${SOURCE_DIR} && pnpm --filter @workspace/api-server run typecheck`,
        { timeout: 60000 },
      );
    } catch (tcErr: unknown) {
      await writeFile(fullPath, originalContent, "utf-8");
      const msg = (tcErr as { stderr?: string; stdout?: string }).stderr || (tcErr as { message?: string }).message || "";
      return {
        success: false,
        stage: "typecheck",
        message: "TypeScript check failed — change reverted.",
        typecheckErrors: msg.slice(0, 2000),
      };
    }

    // Build
    try {
      await execAsync(
        `cd ${SOURCE_DIR} && pnpm --filter @workspace/api-server run build`,
        { timeout: 90000 },
      );
    } catch (buildErr: unknown) {
      await writeFile(fullPath, originalContent, "utf-8");
      return {
        success: false,
        stage: "build",
        message: "Build failed — change reverted.",
        typecheckErrors: ((buildErr as { stderr?: string }).stderr ?? "").slice(0, 2000),
      };
    }

    // Backup current production dist
    await mkdir(BACKUP_DIR, { recursive: true });
    const backupPath = join(BACKUP_DIR, `index-${Date.now()}.cjs`);
    await copyFile(PROD_DIST, backupPath).catch(() => {});

    // Deploy
    await copyFile(BUILD_DIST, PROD_DIST);

    return {
      success: true,
      stage: "complete",
      message: `Deployed successfully. Reloading Sirius in 3 seconds.`,
      reviewSummary: review.summary,
      backupPath,
    };
  } catch (err: unknown) {
    if (didWriteFile && originalContent !== undefined) {
      await writeFile(fullPath, originalContent, "utf-8").catch(() => {});
    }
    return {
      success: false,
      stage: "deploy",
      message: `Deployment error: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    deployLock = false;
  }
}

export async function rollbackLatest(): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout } = await execAsync(
      `ls -t ${BACKUP_DIR}/index-*.cjs 2>/dev/null | head -1`,
    );
    const latest = stdout.trim();
    if (!latest) return { success: false, message: "No backup found." };

    await copyFile(latest, PROD_DIST);
    return { success: true, message: `Rolled back to ${latest}` };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function triggerReload(): Promise<void> {
  await execAsync("pm2 reload sirius-api --update-env").catch(() => {});
}
