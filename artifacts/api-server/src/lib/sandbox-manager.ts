/**
 * Sirius Sandbox Manager
 * Manages isolated Docker containers as per-user development environments.
 *
 * Features:
 *  - Per-user Docker container with persistent named volume
 *  - Live port forwarding via nginx (expose_port)
 *  - Project memory file (SIRIUS_PROJECT.md)
 *  - Git checkpoints (auto-commit working states)
 *  - Test runner (auto-detects jest/pytest/mocha/etc)
 *  - npm/pip cache via Verdaccio proxy on sirius-sandbox network
 */

import { exec } from "child_process";
import { promisify } from "util";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join, resolve, dirname } from "path";

const execAsync = promisify(exec);

export const SANDBOX_NETWORK   = "sirius-sandbox";
const SANDBOX_IMAGE            = "node:22-alpine";
const VOLUME_HOST_BASE         = "/var/lib/docker/volumes";
const NGINX_PREVIEW_DIR        = "/etc/nginx/sandbox-previews";
const EXEC_TIMEOUT_MS          = 30000;
const MAX_OUTPUT_CHARS         = 8000;
const NPM_CACHE_HOST           = "sirius-npm-cache";
const NPM_CACHE_PORT           = 4873;

// ── Container config per user ─────────────────────────────────────────────────

function cfg(userId: string) {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  const isGarry = userId === "garry";
  return {
    containerName:  `sirius-sandbox-${safe}`,
    volumeName:     `sirius-sandbox-vol-${safe}`,
    memory:         isGarry ? "2g"  : "512m",
    cpus:           isGarry ? "1"   : "0.5",
    privileged:     isGarry,
    safe,
    volumeHostPath: `${VOLUME_HOST_BASE}/sirius-sandbox-vol-${safe}/_data`,
  };
}

// ── Network ───────────────────────────────────────────────────────────────────

async function ensureNetwork(): Promise<void> {
  const { stdout } = await execAsync(`docker network ls --format "{{.Name}}"`);
  if (!stdout.split("\n").map(s => s.trim()).includes(SANDBOX_NETWORK)) {
    await execAsync(`docker network create ${SANDBOX_NETWORK}`);
  }
}

// ── Container status ──────────────────────────────────────────────────────────

async function containerStatus(name: string): Promise<"running" | "stopped" | "missing"> {
  const { stdout } = await execAsync(
    `docker inspect ${name} --format "{{.State.Status}}" 2>/dev/null || echo "missing"`
  );
  const s = stdout.trim();
  if (s === "running") return "running";
  if (s === "missing" || s === "") return "missing";
  return "stopped";
}

// ── First-time container setup ────────────────────────────────────────────────

async function setupContainer(name: string, isGarry: boolean): Promise<void> {
  const npmRegistry = `http://${NPM_CACHE_HOST}:${NPM_CACHE_PORT}`;
  const setup = [
    // System tools
    "apk add --no-cache python3 py3-pip git curl bash 2>/dev/null",
    // Global npm tools
    "npm install -g pnpm 2>/dev/null",
    // Point npm + pnpm at the Verdaccio cache proxy
    `npm config set registry ${npmRegistry} 2>/dev/null || true`,
    `pnpm config set registry ${npmRegistry} 2>/dev/null || true`,
    // Python pip packages
    "python3 -m pip install --quiet requests pytest 2>/dev/null || true",
    // Git identity
    'git config --global user.email "sirius@sandbox"',
    'git config --global user.name "Sirius"',
    "git config --global init.defaultBranch main",
    "mkdir -p /workspace",
    "echo 'Sandbox ready.'",
  ].join(" && ");

  await execAsync(`docker exec ${name} sh -c ${JSON.stringify(setup)}`, { timeout: 180000 });
}

// ── Ensure sandbox is running ─────────────────────────────────────────────────

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
    await setupContainer(c.containerName, c.privileged);
    await initWorkspace(userId);
  } else if (status === "stopped") {
    await execAsync(`docker start ${c.containerName}`);
  }

  return c.containerName;
}

// ── Safe path helper ──────────────────────────────────────────────────────────

function safePath(base: string, requestedPath: string): string {
  const clean = (requestedPath ?? "").replace(/\.\./g, "").replace(/^[\/\\]+/, "");
  const full = resolve(join(base, clean || "."));
  if (!full.startsWith(resolve(base))) throw new Error("Path outside workspace");
  return full;
}

// ── Core sandbox operations ───────────────────────────────────────────────────

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
    return {
      stdout: (e.stdout ?? "").slice(0, MAX_OUTPUT_CHARS),
      stderr: (e.stderr ?? "").slice(0, 2000),
      timedOut: !!(e.killed || (e.message ?? "").includes("ETIMEDOUT")),
      exitCode: e.code ?? 1,
    };
  }
}

export async function writeToSandbox(userId: string, filePath: string, content: string): Promise<void> {
  await ensureSandbox(userId);
  const c = cfg(userId);
  const dest = safePath(c.volumeHostPath, filePath);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, content, "utf-8");
}

export async function readFromSandbox(userId: string, filePath: string): Promise<string> {
  const c = cfg(userId);
  const src = safePath(c.volumeHostPath, filePath);
  const content = await readFile(src, "utf-8");
  return content.slice(0, MAX_OUTPUT_CHARS);
}

export async function listSandboxFiles(userId: string, subPath = ""): Promise<string> {
  const name = await ensureSandbox(userId);
  const target = subPath
    ? `/workspace/${subPath.replace(/\.\./g, "").replace(/^[\/\\]+/, "")}`
    : "/workspace";
  const listCmd = `find ${target} -maxdepth 5 \\( -name "node_modules" -o -name ".git" -o -name "__pycache__" -o -name "dist" -o -name ".next" -o -name ".venv" \\) -prune -o -print | head -120`;
  const { stdout } = await execAsync(
    `docker exec ${name} sh -c ${JSON.stringify(listCmd)}`,
    { timeout: 10000 }
  ).catch(() => ({ stdout: "" }));
  const lines = stdout.trim().split("\n").filter(Boolean);
  const formatted = lines.map(l => {
    const rel = l.replace(/^\/workspace\/?/, "");
    if (!rel) return null;
    const depth = (rel.match(/\//g) || []).length;
    const nm = rel.split("/").pop() ?? rel;
    const isDir = !nm.includes(".");
    return "  ".repeat(depth) + (isDir ? "📁 " : "📄 ") + nm;
  }).filter(Boolean);
  return formatted.join("\n") || "(workspace is empty)";
}

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

export async function getSandboxInfo(userId: string) {
  const c = cfg(userId);
  const status = await containerStatus(c.containerName);
  return { exists: status !== "missing", status, containerName: c.containerName, volumeName: c.volumeName };
}

// ── Workspace initialisation (git + project memory) ───────────────────────────

export async function initWorkspace(userId: string): Promise<void> {
  const name = await ensureSandbox(userId);
  // Initialise git repo in /workspace if not already
  await execAsync(
    `docker exec ${name} sh -c "cd /workspace && git init -q 2>/dev/null || true"`,
    { timeout: 10000 }
  ).catch(() => {});
  // Create SIRIUS_PROJECT.md if it doesn't exist
  const c = cfg(userId);
  const memPath = join(c.volumeHostPath, "SIRIUS_PROJECT.md");
  try {
    await readFile(memPath, "utf-8");
  } catch {
    await mkdir(c.volumeHostPath, { recursive: true });
    await writeFile(memPath, `# Project Memory\n\n_No project started yet. Update this file when you begin a project._\n\n## Tech Stack\n\n## What's Been Built\n\n## Key Decisions\n\n## What's Broken / TODO\n`, "utf-8");
  }
}

// ── Project memory ────────────────────────────────────────────────────────────

export async function getProjectMemory(userId: string): Promise<string> {
  const c = cfg(userId);
  try {
    const content = await readFile(join(c.volumeHostPath, "SIRIUS_PROJECT.md"), "utf-8");
    return content.slice(0, 4000);
  } catch {
    return "_No project memory yet._";
  }
}

export async function saveProjectMemory(userId: string, content: string): Promise<void> {
  const c = cfg(userId);
  await mkdir(c.volumeHostPath, { recursive: true });
  await writeFile(join(c.volumeHostPath, "SIRIUS_PROJECT.md"), content, "utf-8");
}

// ── Git checkpoints ───────────────────────────────────────────────────────────

export async function gitCheckpoint(userId: string, message: string): Promise<string> {
  const name = await ensureSandbox(userId);
  const safeMsg = message.replace(/"/g, "'").slice(0, 80);
  const cmd = [
    "cd /workspace",
    "git add -A",
    `git commit -m "${safeMsg}" 2>&1 || echo 'nothing to commit'`,
    "git log --oneline -3 2>/dev/null || true",
  ].join(" && ");
  const { stdout } = await execAsync(
    `docker exec ${name} sh -c ${JSON.stringify(cmd)}`,
    { timeout: 15000 }
  ).catch(err => ({ stdout: (err as { stdout?: string }).stdout ?? "git error" }));
  return stdout.trim().slice(0, 1000);
}

export async function gitLog(userId: string): Promise<string> {
  const { stdout } = await execInSandbox(userId, "git log --oneline -10 2>/dev/null || echo 'no commits yet'");
  return stdout;
}

// ── Test runner ───────────────────────────────────────────────────────────────

export async function runTests(userId: string): Promise<string> {
  const name = await ensureSandbox(userId);

  // Detect test framework
  const detect = `
cd /workspace
if [ -f package.json ] && grep -q '"test"' package.json; then
  echo "FRAMEWORK:npm"
elif [ -f pytest.ini ] || [ -f setup.cfg ] || [ -f pyproject.toml ] || find . -name 'test_*.py' -maxdepth 3 | grep -q .; then
  echo "FRAMEWORK:pytest"
elif find . -name '*.test.js' -o -name '*.spec.js' -o -name '*.test.ts' -maxdepth 3 | grep -q .; then
  echo "FRAMEWORK:jest"
else
  echo "FRAMEWORK:none"
fi
  `.trim();

  const { stdout: detected } = await execAsync(
    `docker exec ${name} sh -c ${JSON.stringify(detect)}`,
    { timeout: 10000 }
  ).catch(() => ({ stdout: "FRAMEWORK:none" }));

  const framework = detected.trim().split("\n").find(l => l.startsWith("FRAMEWORK:"))?.replace("FRAMEWORK:", "") ?? "none";

  if (framework === "none") {
    return "⚠️ No test framework detected. Set up jest (npm install --save-dev jest), pytest, or add a 'test' script to package.json.";
  }

  const commands: Record<string, string> = {
    "npm":    "npm test -- --passWithNoTests 2>&1",
    "pytest": "python3 -m pytest -v --tb=short 2>&1",
    "jest":   "npx jest --passWithNoTests 2>&1",
  };

  const result = await execInSandbox(userId, commands[framework] ?? "echo 'no runner'");
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  const passed = output.includes("passed") || output.includes("PASSED") || output.includes("ok");
  const failed = output.includes("failed") || output.includes("FAILED") || output.includes("error");

  const status = failed ? "❌ TESTS FAILED" : passed ? "✅ TESTS PASSED" : "⚠️ TESTS RAN";
  return `${status}\n\n${output}`.slice(0, MAX_OUTPUT_CHARS);
}

// ── Live port forwarding ──────────────────────────────────────────────────────

async function getContainerIP(containerName: string): Promise<string> {
  const { stdout } = await execAsync(
    `docker inspect ${containerName} --format "{{.NetworkSettings.Networks.${SANDBOX_NETWORK}.IPAddress}}"`
  );
  const ip = stdout.trim();
  if (!ip) throw new Error(`Container ${containerName} not on ${SANDBOX_NETWORK} network`);
  return ip;
}

export async function exposePort(userId: string, port: number): Promise<string> {
  const c = cfg(userId);
  const name = await ensureSandbox(userId);
  const ip = await getContainerIP(name);

  // Verify something is actually listening on this port
  const { stdout: check } = await execAsync(
    `docker exec ${name} sh -c "netstat -tlnp 2>/dev/null | grep :${port} || ss -tlnp | grep :${port} || echo NOTHING"`,
    { timeout: 5000 }
  ).catch(() => ({ stdout: "NOTHING" }));

  if (check.includes("NOTHING")) {
    return `⚠️ Nothing is listening on port ${port} inside the sandbox. Start your server first, then expose the port.`;
  }

  // Write nginx location block
  await mkdir(NGINX_PREVIEW_DIR, { recursive: true });
  const locationConf = `
    # Preview: ${c.containerName} port ${port}
    location /preview/${c.safe}/${port}/ {
        proxy_pass http://${ip}:${port}/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
        proxy_buffering off;
        proxy_set_header X-Accel-Buffering no;
    }
`;
  await writeFile(`${NGINX_PREVIEW_DIR}/${c.safe}-${port}.conf`, locationConf, "utf-8");

  // Test + reload nginx
  const { stdout: test } = await execAsync("nginx -t 2>&1").catch(e => ({ stdout: String((e as Error).message) }));
  if (test.includes("failed")) {
    return `⚠️ Nginx config error: ${test}`;
  }
  await execAsync("nginx -s reload").catch(() => {});

  return `https://sandbox.sirius-ai.live/preview/${c.safe}/${port}/`;
}

export async function closePort(userId: string, port: number): Promise<void> {
  const c = cfg(userId);
  const confPath = `${NGINX_PREVIEW_DIR}/${c.safe}-${port}.conf`;
  await execAsync(`rm -f ${confPath}`).catch(() => {});
  await execAsync("nginx -s reload").catch(() => {});
}

// ── Idle container cleanup ────────────────────────────────────────────────────

export async function cleanupIdleContainers(): Promise<void> {
  const { stdout } = await execAsync(
    `docker ps --filter "name=sirius-sandbox-" --format "{{.Names}}\t{{.Status}}"`,
  ).catch(() => ({ stdout: "" }));
  for (const line of stdout.trim().split("\n").filter(Boolean)) {
    const [name] = line.split("\t");
    if (name === "sirius-sandbox-garry") continue; // Garry's container always stays up
    // Check last exec time — stop if idle for 4+ hours (Status will say e.g. "Up 5 hours")
    const { stdout: lastExec } = await execAsync(
      `docker inspect ${name} --format "{{.State.FinishedAt}}" 2>/dev/null || echo ""`
    ).catch(() => ({ stdout: "" }));
    // Simple heuristic: if container has been up > 6 hours, stop it (volume persists)
    const upMatch = line.match(/Up (\d+) hours?/);
    if (upMatch && parseInt(upMatch[1]) >= 6) {
      await execAsync(`docker stop ${name}`).catch(() => {});
    }
  }
}
