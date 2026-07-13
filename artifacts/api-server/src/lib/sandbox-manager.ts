/**
 * Sirius Sandbox Manager
 * Manages isolated Docker containers as per-user development environments.
 * Each user gets: a named container, a persistent named volume, resource limits.
 * Garry gets a privileged container with elevated resources.
 */

import { exec } from "child_process";
import { promisify } from "util";
import { mkdir, writeFile, readFile, stat } from "fs/promises";
import { join, resolve, dirname } from "path";

const execAsync = promisify(exec);

const SANDBOX_NETWORK = "sirius-sandbox";
const SANDBOX_IMAGE   = "node:22-alpine";
const VOLUME_HOST_BASE = "/var/lib/docker/volumes";
const EXEC_TIMEOUT_MS  = 30000;
const MAX_OUTPUT_CHARS = 8000;

// ── Container config per user ────────────────────────────────────────────────

function cfg(userId: string) {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  const isGarry = userId === "garry";
  return {
    containerName: `sirius-sandbox-${safe}`,
    volumeName:    `sirius-sandbox-vol-${safe}`,
    memory:        isGarry ? "2g"  : "512m",
    cpus:          isGarry ? "1"   : "0.5",
    privileged:    isGarry,
    volumeHostPath: `${VOLUME_HOST_BASE}/sirius-sandbox-vol-${safe}/_data`,
  };
}

// ── Network ──────────────────────────────────────────────────────────────────

async function ensureNetwork(): Promise<void> {
  const { stdout } = await execAsync(`docker network ls --format "{{.Name}}"`);
  if (!stdout.split("\n").map(s => s.trim()).includes(SANDBOX_NETWORK)) {
    await execAsync(`docker network create ${SANDBOX_NETWORK}`);
    console.log(`[sandbox] created network ${SANDBOX_NETWORK}`);
  }
}

// ── Container lifecycle ───────────────────────────────────────────────────────

async function containerStatus(name: string): Promise<"running" | "stopped" | "missing"> {
  const { stdout } = await execAsync(
    `docker inspect ${name} --format "{{.State.Status}}" 2>/dev/null || echo "missing"`
  );
  const s = stdout.trim();
  if (s === "missing" || s === "") return "missing";
  if (s === "running") return "running";
  return "stopped";
}

async function setupContainer(name: string): Promise<void> {
  // Install Python, git, curl, bash, pnpm — once per container lifetime
  const setup = [
    "apk add --no-cache python3 py3-pip git curl bash 2>/dev/null || true",
    "npm install -g pnpm 2>/dev/null || true",
    "python3 -m pip install --quiet requests 2>/dev/null || true",
    "mkdir -p /workspace",
    "echo 'Sandbox ready.'",
  ].join(" && ");
  await execAsync(`docker exec ${name} sh -c ${JSON.stringify(setup)}`, { timeout: 120000 });
  console.log(`[sandbox] container ${name} set up`);
}

/**
 * Ensure a sandbox container is running for a user.
 * Creates the container + volume if needed, starts it if stopped.
 * Returns the container name.
 */
export async function ensureSandbox(userId: string): Promise<string> {
  const c = cfg(userId);
  const status = await containerStatus(c.containerName);

  if (status === "missing") {
    await ensureNetwork();

    const flags = [
      "docker run -d",
      `--name ${c.containerName}`,
      `--network ${SANDBOX_NETWORK}`,
      `--memory ${c.memory}`,
      `--cpus ${c.cpus}`,
      c.privileged ? "--privileged" : "",
      `--volume ${c.volumeName}:/workspace`,
      "--workdir /workspace",
      "--restart unless-stopped",
      SANDBOX_IMAGE,
      "tail -f /dev/null",
    ].filter(Boolean).join(" ");

    await execAsync(flags);
    console.log(`[sandbox] created container ${c.containerName}`);

    // Set up tools (takes ~20-30s, only once per container lifetime)
    await setupContainer(c.containerName);

  } else if (status === "stopped") {
    await execAsync(`docker start ${c.containerName}`);
    console.log(`[sandbox] started stopped container ${c.containerName}`);
  }

  return c.containerName;
}

// ── Safe path helper (workspace-relative) ────────────────────────────────────

function safeSandboxPath(base: string, requestedPath: string): string {
  const clean = (requestedPath ?? "").replace(/\.\./g, "").replace(/^[\/\\]+/, "");
  const full = resolve(join(base, clean || "."));
  if (!full.startsWith(resolve(base))) throw new Error("Path outside workspace");
  return full;
}

// ── Core operations ───────────────────────────────────────────────────────────

/**
 * Execute a shell command inside the user's sandbox container.
 */
export async function execInSandbox(
  userId: string,
  command: string
): Promise<{ stdout: string; stderr: string; timedOut: boolean; exitCode: number }> {
  const name = await ensureSandbox(userId);

  try {
    const { stdout, stderr } = await execAsync(
      `docker exec ${name} sh -c ${JSON.stringify(`cd /workspace && (${command})`)}`,
      { timeout: EXEC_TIMEOUT_MS }
    );
    return { stdout: stdout.slice(0, MAX_OUTPUT_CHARS), stderr: stderr.slice(0, 2000), timedOut: false, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string; killed?: boolean; code?: number };
    const timedOut = !!(e.killed || (e.message ?? "").includes("ETIMEDOUT"));
    return {
      stdout: (e.stdout ?? "").slice(0, MAX_OUTPUT_CHARS),
      stderr: (e.stderr ?? "").slice(0, 2000),
      timedOut,
      exitCode: e.code ?? 1,
    };
  }
}

/**
 * Write a file into the user's sandbox volume (via host volume path — no docker cp needed).
 */
export async function writeToSandbox(userId: string, filePath: string, content: string): Promise<void> {
  await ensureSandbox(userId); // ensures volume exists
  const c = cfg(userId);
  const dest = safeSandboxPath(c.volumeHostPath, filePath);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, content, "utf-8");
}

/**
 * Read a file from the user's sandbox volume.
 */
export async function readFromSandbox(userId: string, filePath: string): Promise<string> {
  const c = cfg(userId);
  const src = safeSandboxPath(c.volumeHostPath, filePath);
  try {
    const content = await readFile(src, "utf-8");
    return content.slice(0, MAX_OUTPUT_CHARS);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }
}

/**
 * List files in the sandbox workspace.
 */
export async function listSandboxFiles(userId: string, subPath = ""): Promise<string> {
  const name = await ensureSandbox(userId);
  const target = subPath
    ? `/workspace/${subPath.replace(/\.\./g, "").replace(/^[\/\\]+/, "")}`
    : "/workspace";

  const listCmd = `find ${target} -maxdepth 5 \\( -name "node_modules" -o -name ".git" -o -name "__pycache__" -o -name "dist" -o -name ".next" \\) -prune -o -print | head -120`;

  const { stdout } = await execAsync(
    `docker exec ${name} sh -c ${JSON.stringify(listCmd)}`,
    { timeout: 10000 }
  ).catch(() => ({ stdout: "" }));

  // Format as a readable tree
  const lines = stdout.trim().split("\n").filter(Boolean);
  const formatted = lines.map(l => {
    const relative = l.replace(/^\/workspace\/?/, "");
    const depth = (relative.match(/\//g) || []).length;
    const name_ = relative.split("/").pop() ?? relative;
    return "  ".repeat(depth) + (l.endsWith("/") ? "📁 " : "📄 ") + name_;
  });

  return formatted.join("\n") || "(workspace is empty)";
}

/**
 * Grep for a pattern across files in the sandbox.
 */
export async function grepInSandbox(userId: string, pattern: string, subPath = ""): Promise<string> {
  const name = await ensureSandbox(userId);
  const target = subPath ? `/workspace/${subPath.replace(/\.\./g, "")}` : "/workspace";
  const escaped = pattern.replace(/'/g, "\\'");

  const { stdout } = await execAsync(
    `docker exec ${name} grep -rn --include="*" -l '${escaped}' ${target} 2>/dev/null | head -20`,
    { timeout: 10000 }
  ).catch(() => ({ stdout: "" }));

  if (!stdout.trim()) return "No matches found";

  const files = stdout.trim().split("\n").filter(Boolean);
  const results: string[] = [];
  for (const f of files.slice(0, 10)) {
    const { stdout: lines } = await execAsync(
      `docker exec ${name} grep -n '${escaped}' "${f}" 2>/dev/null | head -10`,
      { timeout: 5000 }
    ).catch(() => ({ stdout: "" }));
    if (lines.trim()) results.push(`📄 ${f.replace("/workspace/", "")}:\n${lines.trim()}`);
  }

  return results.join("\n\n").slice(0, MAX_OUTPUT_CHARS);
}

/**
 * Get info about a user's sandbox (for status display).
 */
export async function getSandboxInfo(userId: string): Promise<{
  exists: boolean;
  status: string;
  containerName: string;
  volumeName: string;
}> {
  const c = cfg(userId);
  const status = await containerStatus(c.containerName);
  return {
    exists: status !== "missing",
    status,
    containerName: c.containerName,
    volumeName: c.volumeName,
  };
}

/**
 * Stop idle subscriber containers (run periodically — not called for Garry).
 * Garry's container always stays running.
 */
export async function cleanupIdleContainers(): Promise<void> {
  const { stdout } = await execAsync(
    `docker ps --filter "name=sirius-sandbox-" --format "{{.Names}}\t{{.Status}}"`,
  ).catch(() => ({ stdout: "" }));

  for (const line of stdout.trim().split("\n").filter(Boolean)) {
    const [name, status] = line.split("\t");
    if (name === "sirius-sandbox-garry") continue;
    // Stop if running for more than 4 hours without recent exec
    if (status?.includes("hours ago") && !status?.includes("Up Less")) {
      await execAsync(`docker stop ${name}`).catch(() => {});
      console.log(`[sandbox] stopped idle container: ${name}`);
    }
  }
}
