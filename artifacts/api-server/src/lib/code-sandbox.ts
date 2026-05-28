import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

const SANDBOX_IMAGE = "node:22-alpine";
const PYTHON_IMAGE = "python:3.12-alpine";
const MEMORY_LIMIT = "128m";
const CPU_LIMIT = "0.5";
const TIMEOUT_SECONDS = 20;

export interface SandboxResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error: string | null;
  timedOut: boolean;
  executionMs: number;
}

export async function executeCode(
  code: string,
  language: "javascript" | "python",
): Promise<SandboxResult> {
  const sessionId = randomUUID();
  const workDir = `/tmp/sirius-sandbox-${sessionId}`;
  const start = Date.now();

  try {
    await mkdir(workDir, { recursive: true });

    const ext = language === "javascript" ? "js" : "py";
    const filename = `code.${ext}`;
    await writeFile(join(workDir, filename), code, "utf-8");

    const image = language === "javascript" ? SANDBOX_IMAGE : PYTHON_IMAGE;
    const runner = language === "javascript" ? "node" : "python3";

    const cmd = [
      "docker run --rm",
      "--network none",
      `--memory ${MEMORY_LIMIT}`,
      `--cpus ${CPU_LIMIT}`,
      "--read-only",
      "--tmpfs /tmp:rw,size=10m",
      `-v ${workDir}:/sandbox:ro`,
      image,
      `timeout ${TIMEOUT_SECONDS} ${runner} /sandbox/${filename}`,
    ].join(" ");

    const { stdout, stderr } = await execAsync(cmd, {
      timeout: (TIMEOUT_SECONDS + 5) * 1000,
    });

    return {
      success: true,
      stdout: stdout.slice(0, 8000),
      stderr: stderr.slice(0, 2000),
      error: null,
      timedOut: false,
      executionMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const e = err as { killed?: boolean; message?: string; stdout?: string; stderr?: string };
    const timedOut = e.killed === true || (e.message ?? "").includes("timeout");
    return {
      success: false,
      stdout: (e.stdout ?? "").slice(0, 8000),
      stderr: (e.stderr ?? "").slice(0, 2000),
      error: timedOut ? `Timed out after ${TIMEOUT_SECONDS}s` : (e.message ?? "Unknown error"),
      timedOut,
      executionMs: Date.now() - start,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
