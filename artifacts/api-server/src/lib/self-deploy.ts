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

export async function patchSourceFile(params: {
  filePath: string;
  oldString: string;
  newString: string;
  description: string;
  apiKey: string;
}): Promise<DeployResult> {
  const { filePath, oldString, newString, description, apiKey } = params;

  const safePath = filePath.replace(/\.\./g, "").replace(/^\//, "");

  let currentContent: string;
  try {
    currentContent = await readSourceFile(safePath);
  } catch (err: unknown) {
    return { success: false, stage: "validation", message: `Cannot read ${safePath}: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!currentContent.includes(oldString)) {
    return { success: false, stage: "validation", message: "old_string not found in file — must match exactly including whitespace." };
  }

  const occurrences = currentContent.split(oldString).length - 1;
  if (occurrences > 1) {
    return { success: false, stage: "validation", message: `old_string appears ${occurrences} times — it must be unique. Add more surrounding context to make it unique.` };
  }

  const newContent = currentContent.replace(oldString, newString);
  return deployChange({ filePath: safePath, newContent, description, apiKey });
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

type DiagnosticCommand =
  | "bundle_contains"
  | "pm2_status"
  | "pm2_logs"
  | "health_check"
  | "list_backups"
  | "list_source_files";

export async function runServerDiagnostic(
  command: DiagnosticCommand,
  arg?: string,
): Promise<string> {
  try {
    switch (command) {
      case "bundle_contains": {
        if (!arg) return "Error: pattern required for bundle_contains";
        const safePattern = arg.replace(/'/g, "").slice(0, 100);
        const { stdout } = await execAsync(
          `grep -c '${safePattern}' ${PROD_DIST} 2>/dev/null || echo 0`,
          { timeout: 10000 },
        );
        const count = parseInt(stdout.trim(), 10);
        return count > 0
          ? `Found ${count} occurrence(s) of '${safePattern}' in the compiled bundle.`
          : `Pattern '${safePattern}' NOT found in compiled bundle. (Note: function names are minified — use error message strings or unique string literals to search, not function names.)`;
      }
      case "pm2_status": {
        const { stdout } = await execAsync("pm2 show sirius-api 2>&1", { timeout: 10000 });
        return stdout.slice(0, 3000);
      }
      case "pm2_logs": {
        const lines = arg ? parseInt(arg, 10) || 30 : 30;
        const { stdout } = await execAsync(
          `pm2 logs sirius-api --lines ${Math.min(lines, 100)} --nostream 2>&1`,
          { timeout: 15000 },
        );
        return stdout.slice(0, 4000);
      }
      case "health_check": {
        const { stdout } = await execAsync(
          `curl -s --max-time 5 http://127.0.0.1:4000/api/health 2>&1 || echo 'health check failed'`,
          { timeout: 10000 },
        );
        return stdout.slice(0, 1000);
      }
      case "list_backups": {
        const { stdout } = await execAsync(
          `ls -lht ${BACKUP_DIR}/ 2>/dev/null || echo 'No backups found'`,
          { timeout: 5000 },
        );
        return stdout.slice(0, 2000);
      }
      case "list_source_files": {
        const subdir = arg ? arg.replace(/\.\./g, "").replace(/^\//, "") : "src";
        const fullPath = join(SOURCE_DIR, "artifacts/api-server", subdir);
        const { stdout } = await execAsync(
          `find ${fullPath} -type f -name "*.ts" | sort 2>/dev/null || echo 'not found'`,
          { timeout: 10000 },
        );
        return stdout
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((p) => p.replace(join(SOURCE_DIR, "artifacts/api-server") + "/", ""))
          .join("\n") || "No files found";
      }
      default:
        return `Unknown diagnostic command: ${command}`;
    }
  } catch (err: unknown) {
    return `Diagnostic error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
