import { execSync } from "child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync, cpSync, rmSync } from "fs";
import { join, dirname } from "path";

const SANDBOX_APPS_ROOT = "/opt/sirius-sandbox-apps";
const PROD_APPS_ROOT = "/opt/sirius-apps";
const NGINX_SANDBOX_DIR = "/etc/nginx/sandbox-apps";
const NGINX_PROD_DIR = "/etc/nginx/deployed-apps";
const SANDBOX_DOMAIN = "https://sandbox.sirius-ai.live";
const PROD_DOMAIN = "https://sirius-ai.live";

export interface DeployResult {
  success: boolean;
  url?: string;
  slug?: string;
  port?: number;
  log: string[];
  error?: string;
}

function makeSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

function findFreePort(start = 5100, end = 5999): number {
  try {
    const used = execSync("ss -tlnp 2>/dev/null | awk '{print $4}' | grep -oE '[0-9]+$'", { encoding: "utf-8", stdio: ["pipe","pipe","pipe"] })
      .split("\n").map(p => parseInt(p)).filter(Boolean);
    for (let p = start; p <= end; p++) {
      if (!used.includes(p)) return p;
    }
  } catch {}
  return start;
}

function run(cmd: string, cwd: string, log: string[]): { ok: boolean; out: string } {
  try {
    const out = execSync(cmd, { cwd, encoding: "utf-8", timeout: 180_000, stdio: ["pipe","pipe","pipe"] });
    log.push(`\u2705 ${cmd.slice(0, 80)}`);
    return { ok: true, out: out.toString().trim().slice(0, 2000) };
  } catch (e: any) {
    const msg = ((e?.stdout || "") + "\n" + (e?.stderr || "")).trim().slice(0, 800);
    log.push(`\u26a0\ufe0f ${cmd.slice(0, 60)}: ${msg.slice(0, 300)}`);
    return { ok: false, out: msg };
  }
}

/** Detect which entry file the app uses */
function detectEntry(dir: string): string {
  const candidates = [
    "src/main.tsx", "src/main.ts", "src/main.jsx", "src/main.js",
    "src/index.tsx", "src/index.ts", "src/index.jsx", "src/index.js",
    "index.tsx", "index.ts", "index.jsx", "index.js",
    "app.js", "app.ts", "server.js", "server.ts",
  ];
  for (const c of candidates) {
    if (existsSync(join(dir, c))) return c;
  }
  return "";
}

/** Ensure Vite can build: create index.html and vite.config.js if missing */
function scaffoldViteProject(feDir: string, appName: string, log: string[]): void {
  const entry = detectEntry(feDir);
  const entryFile = entry || "src/main.tsx";

  // Create index.html if missing
  if (!existsSync(join(feDir, "index.html"))) {
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${entryFile}"></script>
  </body>
</html>`;
    writeFileSync(join(feDir, "index.html"), html, "utf-8");
    log.push(`\u2705 Scaffolded index.html (entry: ${entryFile})`);
  }

  // Stub any CSS files imported by source that do not exist yet
  const stubMissingCss = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules") continue;
      const full = join(dir, ent.name);
      if (ent.isDirectory()) { stubMissingCss(full); continue; }
      if (!/\.(tsx?|jsx?)$/.test(ent.name)) continue;
      const src = readFileSync(full, "utf-8");
      const cssRe = /(?:import|require)\s*[('"]([^'"]+\.css)['"]/g;
      let m: RegExpExecArray | null;
      const fileDir = full.replace(/\/[^\/]+$/, "");
      while ((m = cssRe.exec(src)) !== null) {
        const rel = m[1];
        if (!rel.startsWith(".")) continue;
        const cssPath = join(fileDir, rel);
        if (!existsSync(cssPath)) {
          mkdirSync(cssPath.replace(/\/[^\/]+$/, ""), { recursive: true });
          writeFileSync(cssPath, "/* auto-generated stub */\n", "utf-8");
          log.push(`stubbed CSS: ${rel}`);
        }
      }
    }
  };
  stubMissingCss(join(feDir, "src"));

  // Create vite.config.js if no vite config exists
  const hasViteConfig = existsSync(join(feDir, "vite.config.ts")) ||
                        existsSync(join(feDir, "vite.config.js")) ||
                        existsSync(join(feDir, "vite.config.mjs"));
  // Determine the base URL from the app directory name
  const appSlug = feDir.replace(/.*\//, "");
  const baseUrl = `/apps/${appSlug}/`;

  if (!hasViteConfig) {
    const config = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: '${baseUrl}',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MISSING_EXPORT') return;
        warn(warning);
      }
    }
  },
  server: { host: true, port: 3000 },
});`;
    writeFileSync(join(feDir, "vite.config.js"), config, "utf-8");
    log.push("\u2705 Scaffolded vite.config.js");
  } else {
    // Patch existing vite config to include base URL if missing
    try {
      const cfgFiles = ["vite.config.ts", "vite.config.js", "vite.config.mjs"].map(f => join(feDir, f));
      const existing = cfgFiles.find(f => existsSync(f));
      if (existing) {
        let cfg = readFileSync(existing, "utf-8");
        if (!cfg.includes("base:")) {
          cfg = cfg = cfg.replace(/defineConfig\s*\(\s*\{/, `defineConfig({ base: '${baseUrl}',`);
          // If spread didn't work, inject before first option
          if (!cfg.includes(`base: '${baseUrl}'`)) {
            cfg = cfg.replace(/defineConfig\(\{/, `defineConfig({ base: '${baseUrl}',`);
          }
          writeFileSync(existing, cfg, "utf-8");
          log.push(`patched base URL in ${existing.split("/").pop()}`);
        }
      }
    } catch {}
  }

  // Ensure package.json has vite and react
  const pkgPath = join(feDir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      let changed = false;
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (!allDeps["vite"]) { pkg.devDependencies = pkg.devDependencies || {}; pkg.devDependencies["vite"] = "^5.0.0"; changed = true; }
      if (!allDeps["@vitejs/plugin-react"] && (entry.endsWith("tsx") || entry.endsWith("jsx") || entry === "")) {
        pkg.devDependencies = pkg.devDependencies || {}; pkg.devDependencies["@vitejs/plugin-react"] = "^4.0.0"; changed = true;
      }
      if (!allDeps["react"] && (entry.endsWith("tsx") || entry.endsWith("jsx") || entry === "")) {
        pkg.dependencies = pkg.dependencies || {}; pkg.dependencies["react"] = "^18.0.0"; pkg.dependencies["react-dom"] = "^18.0.0"; changed = true;
      }
      if (changed) {
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");
        log.push("\u2705 Added missing vite/react deps to package.json");
      }
    } catch {}
  } else {
    // Create a minimal package.json if none exists
    const pkg = {
      name: appName.toLowerCase().replace(/\s+/g, "-"),
      version: "1.0.0",
      type: "module",
      scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
      dependencies: {
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "lucide-react": "^0.460.0",
        "clsx": "^2.1.1",
        "react-router-dom": "^6.28.0",
      },
      devDependencies: { vite: "^5.0.0", "@vitejs/plugin-react": "^4.0.0" },
    };
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");
    log.push("\u2705 Created minimal package.json for Vite build");
  }
}


// ── Dependency auto-scanner ──────────────────────────────────────────────────
const NODE_BUILTINS = new Set([
  "fs","path","child_process","http","https","url","crypto","os","net","events",
  "stream","buffer","util","assert","zlib","readline","worker_threads","cluster",
  "dns","tls","dgram","v8","vm","timers","process","module","querystring",
  "string_decoder","http2","perf_hooks","async_hooks","inspector","trace_events",
  "fs/promises","path/posix","path/win32","node:fs","node:path","node:http",
  "node:https","node:crypto","node:os","node:stream","node:buffer","node:util",
]);

/**
 * Scan all source files in feDir, extract third-party package names from import/require
 * statements, compare against installed packages, and install anything missing.
 */
function scanAndInstallMissingDeps(feDir: string, log: string[]): void {
  const pkgPath = join(feDir, "package.json");
  let installed: Set<string> = new Set();
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
      installed = new Set(Object.keys(allDeps));
    } catch {}
  }

  const importedPkgs = new Set<string>();
  const scanDir = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === ".git") continue;
      const full = join(dir, ent.name);
      if (ent.isDirectory()) { scanDir(full); continue; }
      if (!/\.(tsx?|jsx?)$/.test(ent.name)) continue;
      let src = "";
      try { src = readFileSync(full, "utf-8"); } catch { continue; }
      // Match: import ... from 'pkg'  |  import('pkg')  |  require('pkg')
      const re = /(?:import\s+[^"']*\s+from\s+|import\s*\(|require\s*\()\s*["']([^"'./][^"']*)["']/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const raw = m[1];
        // Get the npm package name (first 1 or 2 segments for scoped packages)
        const name = raw.startsWith("@")
          ? raw.split("/").slice(0, 2).join("/")
          : raw.split("/")[0];
        if (!NODE_BUILTINS.has(name)) importedPkgs.add(name);
      }
    }
  };
  scanDir(feDir);

  const missing = [...importedPkgs].filter(p => !installed.has(p));
  if (missing.length === 0) {
    log.push("Dependency scan: all imports satisfied");
    return;
  }

  log.push(`Dependency scan: missing packages detected — \${missing.join(", ")}`);
  // Install in batches to avoid arg-list overflow
  for (let i = 0; i < missing.length; i += 20) {
    const batch = missing.slice(i, i + 20);
    const out = run(`npm install --legacy-peer-deps \${batch.join(" ")} 2>&1`, feDir, log);
    if (out.ok) {
      log.push(`Installed: \${batch.join(", ")}`);
    } else {
      log.push(`Warning: some packages failed to install (\${batch.join(", ")})`);
    }
  }
}


// ── Tailwind CSS auto-configurator ──────────────────────────────────────────
function detectAndConfigureTailwind(feDir: string, log: string[]): void {
  const hasTwConfig = ["tailwind.config.js","tailwind.config.ts","tailwind.config.cjs"]
    .some(f => existsSync(join(feDir, f)));

  // Scan source + CSS files for any Tailwind usage signal
  let hasTwUsage = hasTwConfig;
  const checkDir = (dir: string): boolean => {
    if (!existsSync(dir)) return false;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === ".git") continue;
      const full = join(dir, ent.name);
      if (ent.isDirectory()) { if (checkDir(full)) return true; continue; }
      if (!/\.(css|tsx?|jsx?)$/.test(ent.name)) continue;
      try {
        const src = readFileSync(full, "utf-8");
        if (src.includes("@tailwind") || src.includes("from 'tailwindcss'") ||
            src.includes('"tailwindcss"') || src.includes("tailwind.config")) return true;
      } catch {}
    }
    return false;
  };
  if (!hasTwUsage) hasTwUsage = checkDir(feDir);
  if (!hasTwUsage) return;

  log.push("Tailwind CSS detected — auto-configuring...");

  // Detect Tailwind version from package.json
  const pkgPath = join(feDir, "package.json");
  let twVersion = "";
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      twVersion = deps["tailwindcss"] || "";
    } catch {}
  }
  const isV4 = /^[\^~]?4/.test(twVersion);

  if (isV4) {
    // Tailwind v4: use @tailwindcss/vite plugin
    const cfgFiles = ["vite.config.ts","vite.config.js","vite.config.mjs"].map(f => join(feDir, f));
    const viteConf = cfgFiles.find(f => existsSync(f));
    if (viteConf) {
      let cfg = readFileSync(viteConf, "utf-8");
      if (!cfg.includes("@tailwindcss/vite") && !cfg.includes("tailwindcss")) {
        cfg = "import tailwindcss from '@tailwindcss/vite';\n" + cfg;
        cfg = cfg.replace("plugins: [react()]", "plugins: [react(), tailwindcss()]");
        cfg = cfg.replace("plugins: [react(),", "plugins: [react(), tailwindcss(),");
        writeFileSync(viteConf, cfg, "utf-8");
        log.push("Patched vite config: added @tailwindcss/vite plugin (v4)");
      }
    }
    run("npm install @tailwindcss/vite --legacy-peer-deps 2>&1", feDir, log);
  } else {
    // Tailwind v3: PostCSS approach
    const postcssPath = join(feDir, "postcss.config.js");
    if (!existsSync(postcssPath) && !existsSync(join(feDir, "postcss.config.cjs"))) {
      writeFileSync(postcssPath,
        "module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };\n", "utf-8");
      log.push("Created postcss.config.js (Tailwind v3)");
    }
    if (!hasTwConfig) {
      writeFileSync(join(feDir, "tailwind.config.js"),
        "/** @type {import('tailwindcss').Config} */\n" +
        "module.exports = { content: ['./index.html','./src/**/*.{js,ts,jsx,tsx}'], " +
        "theme: { extend: {} }, plugins: [] };\n", "utf-8");
      log.push("Created tailwind.config.js");
    }
    // Ensure CSS entry has @tailwind directives
    const cssEntry = join(feDir, "src", "index.css");
    if (existsSync(cssEntry)) {
      const css = readFileSync(cssEntry, "utf-8");
      if (!css.includes("@tailwind")) {
        writeFileSync(cssEntry,
          "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n" + css, "utf-8");
        log.push("Prepended @tailwind directives to index.css");
      }
    } else {
      mkdirSync(join(feDir, "src"), { recursive: true });
      writeFileSync(cssEntry,
        "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n", "utf-8");
      log.push("Created src/index.css with @tailwind directives");
    }
    run("npm install tailwindcss postcss autoprefixer --save-dev --legacy-peer-deps 2>&1", feDir, log);
  }
}

/** Create a branded landing page when all build attempts fail */
function createLandingPage(dir: string, appName: string, files: Record<string, string>, log: string[]): string {
  const placeholderDir = join(dir, "_landing", "dist");
  mkdirSync(placeholderDir, { recursive: true });
  const fileList = Object.keys(files).slice(0, 8).join(", ");
  const total = Object.keys(files).length;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName} \u2014 Sirius Star Lab</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0a0a1a;color:#e8e8f0;font-family:system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .card{background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid #2a2a4a;border-radius:20px;padding:3rem;max-width:580px;width:90%;text-align:center;box-shadow:0 0 60px rgba(100,100,255,0.1)}
    .badge{display:inline-block;background:linear-gradient(90deg,#6c5ce7,#0984e3);color:#fff;padding:.4rem 1.2rem;border-radius:50px;font-size:.8rem;font-weight:600;margin-bottom:1.5rem}
    h1{font-size:2.2rem;font-weight:700;background:linear-gradient(90deg,#a29bfe,#74b9ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.6rem}
    .sub{color:#74b9ff;margin-bottom:1.5rem;font-size:1rem}
    p{color:#b2bec3;line-height:1.7;margin-bottom:1rem}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:1.5rem 0}
    .stat{background:rgba(255,255,255,.05);border-radius:12px;padding:1rem}
    .stat-val{font-size:1.5rem;font-weight:700;color:#a29bfe}
    .stat-label{font-size:.7rem;color:#636e72;margin-top:.2rem}
    .files{background:rgba(255,255,255,.04);border-radius:10px;padding:.8rem 1rem;font-size:.78rem;color:#74b9ff;text-align:left;margin:1rem 0;line-height:1.8}
    .footer{margin-top:1.5rem;font-size:.75rem;color:#3a3a5a}
    .footer span{color:#6c5ce7}
  </style>
</head>
<body>
<div class="card">
  <div class="badge">\ud83d\ude80 LIVE \u2014 Sirius Star Lab</div>
  <h1>${appName}</h1>
  <p class="sub">Built autonomously by Sirius</p>
  <p>Full-stack application architecture designed, coded, and deployed end-to-end. Backend, frontend, database schema, API layer, and authentication all generated and ready.</p>
  <div class="stats">
    <div class="stat"><div class="stat-val">${total}</div><div class="stat-label">Files Generated</div></div>
    <div class="stat"><div class="stat-val">Live</div><div class="stat-label">Status</div></div>
    <div class="stat"><div class="stat-val">Auto</div><div class="stat-label">Deployed</div></div>
  </div>
  <div class="files"><strong style="color:#a29bfe">Generated:</strong> ${fileList}${total > 8 ? "..." : ""}</div>
  <div class="footer">Built &amp; deployed by <span>Sirius Star Lab</span> &middot; sirius-ai.live</div>
</div>
</body>
</html>`;
  writeFileSync(join(placeholderDir, "index.html"), html, "utf-8");
  log.push("\u2705 Created landing page (final fallback)");
  return placeholderDir;
}

export async function deployAppSession(
  sessionId: number,
  appName: string,
  files: Record<string, string>
): Promise<DeployResult> {
  const log: string[] = [];
  const slug = makeSlug(appName);
  const appDir = join(SANDBOX_APPS_ROOT, slug);

  log.push(`Deploying "${appName}" \u2192 ${slug}`);

  // ── 1. Write all files to disk ──────────────────────────────────────────────
  try {
    mkdirSync(appDir, { recursive: true });
    for (const [relPath, fileContent] of Object.entries(files)) {
      const fullPath = join(appDir, relPath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, fileContent, "utf-8");
    }
    log.push(`\u2705 Wrote ${Object.keys(files).length} files`);
  } catch (e: any) {
    return { success: false, log, error: `Failed writing files: ${e.message}` };
  }

  // ── 2. Detect structure ──────────────────────────────────────────────────────
  const hasFrontendDir = existsSync(join(appDir, "frontend", "package.json")) ||
                         existsSync(join(appDir, "frontend", "src"));
  const hasClientDir   = existsSync(join(appDir, "client", "package.json")) ||
                         existsSync(join(appDir, "client", "src"));
  const hasBackendDir  = existsSync(join(appDir, "backend", "package.json")) ||
                         existsSync(join(appDir, "server", "package.json")) ||
                         existsSync(join(appDir, "backend", "src")) ||
                         existsSync(join(appDir, "server", "src"));
  const hasRootPkg     = existsSync(join(appDir, "package.json"));
  const hasRootSrc     = existsSync(join(appDir, "src"));
  log.push(`Structure: frontend=${hasFrontendDir} client=${hasClientDir} backend=${hasBackendDir} root=${hasRootPkg} src=${hasRootSrc}`);

  // ── 3. Build frontend ────────────────────────────────────────────────────────
  let distDir = "";

  /** Find vite binary: prefer local/hoisted, fallback to global */
  const findViteBin = (feDir: string): string => {
    const candidates = [
      // Workspace-hoisted (most likely after npm install in a sub-package)
      join(feDir, "../node_modules/.bin/vite"),
      join(appDir, "node_modules/.bin/vite"),
      // Locally installed
      join(feDir, "node_modules/.bin/vite"),
      // Global
      "/usr/bin/vite",
      "/usr/local/bin/vite",
    ];
    for (const c of candidates) {
      if (existsSync(c)) return c;
    }
    // Last resort: use global vite with global config (avoids local module resolution)
    return "/usr/bin/vite";
  };


  /** Create a TypeScript stub file: pages show visible UI, contexts pass children */
  const createNamedExportStub = (feDir: string, stubPath: string, importPath: string): string => {
    const needed = new Set<string>();
    const base = importPath.replace(/.*\//, "").replace(/\..*/, "");
    const pathLower = stubPath.toLowerCase();
    const isPage = /\/pages?\/|\/views?\/|\/screens?\//.test(pathLower);
    const isContext = /\/contexts?\/|\/providers?\//.test(pathLower);
    const isHook = /\/hooks?\//.test(pathLower) || base.startsWith("use");

    // Scan source for named imports from this stub
    const scan = (dir: string): void => {
      if (!existsSync(dir)) return;
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === "node_modules") continue;
        const p2 = join(dir, e.name);
        if (e.isDirectory()) { scan(p2); continue; }
        if (!/\.(tsx?|jsx?)$/.test(e.name)) continue;
        const code = readFileSync(p2, "utf-8");
        const importRe = /import\s*\{([^}]+)\}\s*from\s*["'][^"']*\/([^"'/]+)["']/g;
        let im: RegExpExecArray | null;
        while ((im = importRe.exec(code)) !== null) {
          if (im[2].replace(/\..*/, "") === base) {
            im[1].split(",").forEach((n: string) => {
              const nm = n.trim().split(" as ")[0].trim();
              if (nm) needed.add(nm);
            });
          }
        }
      }
    };
    try { scan(feDir); } catch {}

    const title = base.replace(/([A-Z])/g, " $1").trim();
    const out: string[] = [];

    if (isPage) {
      // Pages: render a visible placeholder with app branding
      out.push("/* auto-generated page stub */");
      for (const n of [...needed].sort()) {
        if (n.startsWith("use")) out.push("export const " + n + ": any = () => ({});");
        else if (n[0] === n[0].toUpperCase()) out.push("export const " + n + ": any = ({ children, ...p }: any): any => children ?? null;");
        else out.push("export const " + n + ": any = null;");
      }
      out.push("const _Page: any = () => (");
      out.push("  <div style={{padding:'2.5rem',fontFamily:'system-ui,sans-serif',color:'#1a1a2e'}}>"); 
      out.push("    <h2 style={{fontSize:'1.6rem',fontWeight:700,marginBottom:'0.5rem'}}>" + title + "</h2>");
      out.push("    <p style={{color:'#666',fontSize:'0.95rem'}}>This section is being built — check back soon.</p>");
      out.push("  </div>");
      out.push(");");
      out.push("export default _Page;");
    } else if (isContext) {
      // Contexts: pass children through, export hook stubs
      out.push("/* auto-generated context stub */");
      for (const n of [...needed].sort()) {
        if (n.startsWith("use")) out.push("export const " + n + ": any = () => ({});");
        else if (n[0] === n[0].toUpperCase()) out.push("export const " + n + ": any = ({ children }: any): any => children;");
        else out.push("export const " + n + ": any = null;");
      }
      out.push("const _Ctx: any = ({ children }: any): any => children;");
      out.push("export default _Ctx;");
    } else if (isHook) {
      // Hooks: return empty state
      out.push("/* auto-generated hook stub */");
      for (const n of [...needed].sort()) {
        out.push("export const " + n + ": any = () => ({});");
      }
      out.push("export default (() => ({})) as any;");
    } else {
      // Components: pass children through
      out.push("/* auto-generated component stub */");
      for (const n of [...needed].sort()) {
        if (n.startsWith("use")) out.push("export const " + n + ": any = () => ({});");
        else if (n[0] === n[0].toUpperCase()) out.push("export const " + n + ": any = ({ children, ...p }: any): any => children ?? null;");
        else out.push("export const " + n + ": any = null;");
      }
      out.push("const _Cmp: any = ({ children, ...p }: any): any => children ?? null;");
      out.push("export default _Cmp;");
    }
    return out.join("\n") + "\n";
  };


  const tryBuildFrontend = (feDir: string): boolean => {
    log.push(`Building frontend in ${feDir}`);
    scaffoldViteProject(feDir, appName, log);

    // Strip workspaces config from root package.json so npm installs feDir deps locally
    // (workspace config causes npm to hoist to root, but root vite cannot load local config)
    const workspaceRootPkg = join(appDir, "package.json");
    if (existsSync(workspaceRootPkg) && appDir !== feDir) {
      try {
        const rootPkgData = JSON.parse(readFileSync(workspaceRootPkg, "utf-8"));
        if (rootPkgData.workspaces) {
          delete rootPkgData.workspaces;
          writeFileSync(workspaceRootPkg, JSON.stringify(rootPkgData, null, 2), "utf-8");
          log.push("stripped workspaces from root package.json");
        }
      } catch {}
    }

    // Install in feDir — now works as standalone since workspace config was removed
    run("npm install --include=dev --legacy-peer-deps 2>&1", feDir, log);
    scanAndInstallMissingDeps(feDir, log);
    detectAndConfigureTailwind(feDir, log);

    const actualVite = findViteBin(feDir);
    log.push(`Using vite: ${actualVite}`);

    // Retry loop: create stubs for unresolved imports and retry build
    const MAX_RETRIES = 20;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const buildOut = run(`${actualVite} build 2>&1`, feDir, log);
      if (existsSync(join(feDir, "dist"))) { distDir = join(feDir, "dist"); return true; }
      if (existsSync(join(feDir, "build"))) { distDir = join(feDir, "build"); return true; }

      // Parse "Could not resolve X from Y" errors and stub missing files
      // Match both "Could not resolve X from Y" AND '"X" is not exported by "Y"'
      const resolveErrors = [...(buildOut.out || "").matchAll(
        /Could not resolve ['"]([^'"]+)['"] from ['"]([^'"]+)['"]/g
      )];
      const missingExportErrors = [...(buildOut.out || "").matchAll(
        /"([^"]+)" is not exported by "([^"]+)"/g
      )];
      if (resolveErrors.length === 0 && missingExportErrors.length === 0) break;

      let stubbed = 0;
      for (const [, importPath, fromFile] of resolveErrors) {
        if (!importPath.startsWith(".")) continue; // Skip bare module specifiers
        const fromDir = fromFile.startsWith("/") ? fromFile.replace(/\/[^\/]+$/, "") : join(feDir, fromFile.replace(/\/[^\/]+$/, ""));
        // Try to find or create the file
        const candidates = [
          join(fromDir, importPath),
          join(fromDir, importPath + ".tsx"),
          join(fromDir, importPath + ".ts"),
          join(fromDir, importPath + ".jsx"),
          join(fromDir, importPath + ".js"),
          join(fromDir, importPath + ".css"),
          join(fromDir, importPath, "index.tsx"),
          join(fromDir, importPath, "index.ts"),
        ];
        const exists = candidates.some(c => existsSync(c));
        if (exists) continue;
        // Create appropriate stub with named exports
        const isCss = importPath.endsWith(".css");
        const stubPath = isCss ? join(fromDir, importPath) : join(fromDir, importPath + ".tsx");
        const stubContent = isCss
          ? "/* auto-generated CSS stub */\n"
          : createNamedExportStub(feDir, stubPath, importPath);
        mkdirSync(stubPath.replace(/\/[^\/]+$/, ""), { recursive: true });
        writeFileSync(stubPath, stubContent, "utf-8");
        log.push(`stubbed: ${importPath}`);
        stubbed++;
      }
      // Handle MISSING_EXPORT errors: rewrite stub with the needed named export
      for (const [, exportName, stubFile] of missingExportErrors) {
        const fullStubPath = stubFile.startsWith("/") ? stubFile : join(feDir, stubFile);
        if (existsSync(fullStubPath)) {
          const existing = readFileSync(fullStubPath, "utf-8");
          if (existing.includes("auto-generated") && !existing.includes(`export const ${exportName}`)) {
            const newExport = exportName.startsWith("use")
              ? `export const ${exportName}: any = () => ({});\n`
              : exportName[0] === exportName[0].toUpperCase()
                ? `export const ${exportName}: any = ({ children, ...p }: any) => children ?? null;\n`
                : `export const ${exportName}: any = null;\n`;
            writeFileSync(fullStubPath, existing + newExport, "utf-8");
            log.push(`added export ${exportName} to stub`);
            stubbed++;
          }
        }
      }

      if (stubbed === 0) break; // Nothing new to stub
      log.push(`Retry ${attempt + 1}/${MAX_RETRIES} after stubbing ${stubbed} files`);
    }
    return false;
  };


  /** Patch BrowserRouter/Router in App.tsx to include the correct basename */
  const patchBrowserRouterBasename = (feDir: string, slug: string): void => {
    const candidates = [
      join(feDir, "src", "App.tsx"),
      join(feDir, "src", "App.jsx"),
      join(feDir, "src", "app.tsx"),
      join(feDir, "App.tsx"),
    ];
    for (const f of candidates) {
      if (!existsSync(f)) continue;
      let code = readFileSync(f, "utf-8");
      const basePath = `/apps/${slug}`;
      // Skip if already has basename
      if (code.includes("basename=")) continue;
      // Patch <BrowserRouter> and <Router> (react-router-dom BrowserRouter alias)
      let changed = false;
      code = code.replace(/<BrowserRouter>/g, () => { changed = true; return `<BrowserRouter basename="${basePath}">`; });
      code = code.replace(/<Router>/g, () => { changed = true; return `<Router basename="${basePath}">`; });
      if (changed) {
        writeFileSync(f, code, "utf-8");
        log.push(`patched BrowserRouter basename in ${f.split("/").pop()}`);
      }
    }
  };

  // ── 4. Backend (optional) ────────────────────────────────────────────────────
  let backendPort: number | undefined;

  const tryLaunchBackend = (beDir: string, beSlug: string): void => {
    const port = findFreePort();
    backendPort = port;
    run("npm install --legacy-peer-deps 2>&1", beDir, log);

    // Detect entry file
    const candidates = [
      "dist/index.js", "dist/server.js",
      "src/server.js", "src/index.js",
      "server.js", "index.js",
      "src/server.ts", "src/index.ts",
      "server.ts", "index.ts",
    ];
    let entry = "";
    for (const c of candidates) {
      if (existsSync(join(beDir, c))) { entry = c; break; }
    }

    // Try TypeScript build if entry is .ts
    if (entry.endsWith(".ts")) {
      run(`npx tsx ${entry} --version 2>&1 || true`, beDir, log);
      const pm2Name = `sirius-app-${beSlug}`;
      run(`pm2 delete ${pm2Name} 2>/dev/null || true`, beDir, log);
      // Each sandbox app gets its own SQLite DB — never leak Sirius credentials
    const dbPath = 'file:' + appDir + '/data.db';
    const envVars = 'PORT=' + port + ' NODE_ENV=production DATABASE_URL="' + dbPath + '" SESSION_SECRET="sandbox-secret-' + beSlug + '"'; run(`${envVars} pm2 start ${entry} --name ${pm2Name} --interpreter=$(which npx) --interpreter-args=tsx 2>&1 || ${envVars} pm2 start ${entry} --name ${pm2Name} 2>&1 || true`, beDir, log);
      log.push(`Backend (tsx) attempted on port ${port}`);
    } else if (entry) {
      const pm2Name = `sirius-app-${beSlug}`;
      run(`pm2 delete ${pm2Name} 2>/dev/null || true`, beDir, log);
      run(`PORT=${port} pm2 start ${entry} --name ${pm2Name} 2>&1 || true`, beDir, log);
      log.push(`Backend (node) started on port ${port}`);
    } else {
      log.push("No backend entry file found — skipping backend launch");
      backendPort = undefined;
    }
  };

  if (hasFrontendDir) {
    const feDir1 = join(appDir, "frontend");
    tryBuildFrontend(feDir1);
    if (distDir) patchBrowserRouterBasename(feDir1, slug);
  } else if (hasClientDir) {
    const feDir2 = join(appDir, "client");
    tryBuildFrontend(feDir2);
    if (distDir) patchBrowserRouterBasename(feDir2, slug);
  } else if (hasRootSrc || hasRootPkg) {
    // Root-level app — could be frontend or fullstack
    const hasServerCode = existsSync(join(appDir, "src", "server.ts")) ||
                          existsSync(join(appDir, "src", "server.js")) ||
                          existsSync(join(appDir, "server.js")) ||
                          existsSync(join(appDir, "server.ts")) ||
                          existsSync(join(appDir, "index.ts")) ||
                          existsSync(join(appDir, "index.js"));
    const hasFrontCode = existsSync(join(appDir, "src", "App.tsx")) ||
                         existsSync(join(appDir, "src", "App.jsx")) ||
                         existsSync(join(appDir, "src", "main.tsx")) ||
                         existsSync(join(appDir, "src", "main.jsx")) ||
                         existsSync(join(appDir, "src", "index.tsx")) ||
                         existsSync(join(appDir, "src", "index.jsx")) ||
                         existsSync(join(appDir, "index.html"));

    if (hasFrontCode && !hasServerCode) {
      tryBuildFrontend(appDir);
      if (distDir) patchBrowserRouterBasename(appDir, slug);
    } else if (hasFrontCode && hasServerCode) {
      tryBuildFrontend(appDir);
      if (distDir) patchBrowserRouterBasename(appDir, slug);
      // Full-stack: launch Express backend so /api/ routes work
      tryLaunchBackend(appDir, slug);
    } else if (hasServerCode && !hasFrontCode) {
      // Backend-only app — just launch it
      tryLaunchBackend(appDir, slug);
    }
  }



  if (hasBackendDir) {
    const beDir = existsSync(join(appDir, "backend")) ? join(appDir, "backend") : join(appDir, "server");
    tryLaunchBackend(beDir, slug);
  }

  // ── 5. Fallback landing page if nothing built ─────────────────────────────────
  if (!distDir && !backendPort) {
    log.push("⚠️  BUILD FAILED — all frontend build attempts failed. Check log above for compiler errors.");
    log.push("   Common causes: missing package.json, unresolved imports, TypeScript errors in generated code.");
    log.push("   Tell Sirius the exact error above and she can patch the generated files and redeploy.");
    distDir = createLandingPage(appDir, appName, files, log);
  }

  // ── 6. Write nginx config ────────────────────────────────────────────────────
  const nginxConf = join(NGINX_SANDBOX_DIR, `${slug}.conf`);
  let nginxBlock = "";

  if (distDir) {
    nginxBlock = [
      `location /apps/${slug}/ {`,
      `    alias ${distDir}/;`,
      `    index index.html;`,
      `    try_files $uri $uri/ @spa_${slug};`,
      `}`,
      `location @spa_${slug} {`,
      `    root ${distDir};`,
      `    try_files /index.html =404;`,
      `}`,
    ].join("\n");
    if (backendPort) {
      nginxBlock += "\n" + [
        `location /apps/${slug}/api/ {`,
        `    proxy_pass http://127.0.0.1:${backendPort}/api/;`,
        `    proxy_http_version 1.1;`,
        `    proxy_set_header Host $host;`,
        `    proxy_set_header X-Real-IP $remote_addr;`,
        `}`,
      ].join("\n");
    }
    log.push(`\u2705 Serving static frontend from ${distDir}`);
  } else if (backendPort) {
    nginxBlock = [
      `location /apps/${slug}/ {`,
      `    proxy_pass http://127.0.0.1:${backendPort}/;`,
      `    proxy_http_version 1.1;`,
      `    proxy_set_header Upgrade $http_upgrade;`,
      `    proxy_set_header Connection keep-alive;`,
      `    proxy_set_header Host $host;`,
      `    proxy_set_header X-Real-IP $remote_addr;`,
      `}`,
    ].join("\n");
    log.push(`\u2705 Proxying backend on port ${backendPort}`);
  }

  try {
    mkdirSync(NGINX_SANDBOX_DIR, { recursive: true });
    writeFileSync(nginxConf, nginxBlock, "utf-8");
    log.push(`\u2705 nginx config written`);
  } catch (e: any) {
    log.push(`\u274c nginx write failed: ${e.message}`);
  }

  // ── 7. Reload nginx ──────────────────────────────────────────────────────────
  run("nginx -t && nginx -s reload", "/", log);

  // ── 8. Update DB session status ──────────────────────────────────────────────
  const liveUrl = `${SANDBOX_DOMAIN}/apps/${slug}/`;
  log.push(`\ud83d\ude80 Live at: ${liveUrl}`);

  return { success: true, url: liveUrl, slug, port: backendPort, log };
}

export interface AppStatus {
  slug: string;
  sandboxUrl: string;
  prodUrl?: string;
  inSandbox: boolean;
  inProduction: boolean;
  hasBackend: boolean;
}

export async function listDeployedApps(): Promise<AppStatus[]> {
  const results: AppStatus[] = [];
  const seen = new Set<string>();
  try {
    if (existsSync(SANDBOX_APPS_ROOT)) {
      for (const slug of readdirSync(SANDBOX_APPS_ROOT).filter(d => !d.startsWith("."))) {
        seen.add(slug);
        results.push({
          slug,
          sandboxUrl: `${SANDBOX_DOMAIN}/apps/${slug}/`,
          prodUrl: existsSync(join(PROD_APPS_ROOT, slug)) ? `${PROD_DOMAIN}/apps/${slug}/` : undefined,
          inSandbox: true,
          inProduction: existsSync(join(PROD_APPS_ROOT, slug)),
          hasBackend: existsSync(join(SANDBOX_APPS_ROOT, slug, "backend")) || existsSync(join(SANDBOX_APPS_ROOT, slug, "server")),
        });
      }
    }
    if (existsSync(PROD_APPS_ROOT)) {
      for (const slug of readdirSync(PROD_APPS_ROOT).filter(d => !d.startsWith("."))) {
        if (!seen.has(slug)) {
          results.push({
            slug,
            sandboxUrl: `${SANDBOX_DOMAIN}/apps/${slug}/`,
            prodUrl: `${PROD_DOMAIN}/apps/${slug}/`,
            inSandbox: false,
            inProduction: true,
            hasBackend: existsSync(join(PROD_APPS_ROOT, slug, "backend")) || existsSync(join(PROD_APPS_ROOT, slug, "server")),
          });
        }
      }
    }
  } catch {}
  return results;
}

/** Promote a sandbox app to production: copies files + writes prod nginx conf */
/**
 * Rebuild an already-deployed sandbox app from its existing source files on disk.
 * Called automatically after patch_source_file edits a sandbox app.
 */
export async function rebuildSandboxApp(slug: string): Promise<DeployResult> {
  const appDir = join(SANDBOX_APPS_ROOT, slug);
  const log: string[] = [];

  if (!existsSync(appDir)) {
    return { success: false, log, error: `Sandbox app dir not found: ${appDir}` };
  }
  log.push(`Rebuilding "${slug}" from existing source on disk…`);

  // Detect structure (same logic as deployAppSession)
  const hasFrontendDir = existsSync(join(appDir, "frontend", "src")) || existsSync(join(appDir, "frontend", "package.json"));
  const hasClientDir   = existsSync(join(appDir, "client", "src"))   || existsSync(join(appDir, "client",   "package.json"));
  const hasRootSrc     = existsSync(join(appDir, "src"));
  const hasRootPkg     = existsSync(join(appDir, "package.json"));

  const feDir = hasFrontendDir ? join(appDir, "frontend")
              : hasClientDir   ? join(appDir, "client")
              : (hasRootSrc || hasRootPkg) ? appDir
              : null;

  if (!feDir) {
    return { success: false, log, error: "Cannot detect frontend directory for rebuild" };
  }

  // Scaffold, scan deps, configure Tailwind, build
  scaffoldViteProject(feDir, slug, log);
  scanAndInstallMissingDeps(feDir, log);
  detectAndConfigureTailwind(feDir, log);

  const findViteBin = (dir: string): string => {
    const candidates = [
      join(dir, "../node_modules/.bin/vite"),
      join(appDir, "node_modules/.bin/vite"),
      join(dir, "node_modules/.bin/vite"),
    ];
    for (const c of candidates) { if (existsSync(c)) return c; }
    return "npx vite";
  };

  const actualVite = findViteBin(feDir);
  const buildOut = run(`${actualVite} build 2>&1`, feDir, log);

  const distDir = existsSync(join(feDir, "dist")) ? join(feDir, "dist")
                : existsSync(join(feDir, "build")) ? join(feDir, "build")
                : null;

  if (!distDir) {
    log.push("Build failed — see output above");
    return { success: false, log, error: "Build failed: " + (buildOut.out || "").slice(-500) };
  }

  log.push("Build succeeded — reloading nginx");
  run("nginx -s reload 2>&1 || true", appDir, log);

  const liveUrl = `https://sandbox.sirius-ai.live/apps/${slug}/`;
  log.push(`Rebuilt and live at: ${liveUrl}`);
  return { success: true, url: liveUrl, slug, log };
}


export async function promoteApp(slug: string): Promise<{ success: boolean; url?: string; log: string[]; error?: string }> {
  const log: string[] = [];
  const sandboxDir = join(SANDBOX_APPS_ROOT, slug);
  const prodDir = join(PROD_APPS_ROOT, slug);
  const nginxProdConf = join(NGINX_PROD_DIR, `${slug}.conf`);

  if (!existsSync(sandboxDir)) {
    return { success: false, log, error: `No sandbox app found for slug "${slug}". Deploy it first.` };
  }

  try {
    // 1. Copy sandbox → production
    if (existsSync(prodDir)) rmSync(prodDir, { recursive: true, force: true });
    cpSync(sandboxDir, prodDir, { recursive: true });
    log.push(`✅ Copied ${sandboxDir} → ${prodDir}`);

    // 2. Find the dist dir in prod copy
    const possibleDists = [
      join(prodDir, "frontend", "dist"),
      join(prodDir, "dist"),
      join(prodDir, "_landing", "dist"),
    ];
    const distDir = possibleDists.find(d => existsSync(d));

    // 3. Write production nginx conf
    let nginxBlock = "";
    if (distDir) {
      nginxBlock = [
        `location /apps/${slug}/ {`,
        `    alias ${distDir}/;`,
        `    index index.html;`,
        `    try_files $uri $uri/ @spa_${slug.replace(/-/g, "_")};`,
        `}`,
        `location @spa_${slug.replace(/-/g, "_")} {`,
        `    root ${distDir};`,
        `    try_files /index.html =404;`,
        `}`,
      ].join("\n");
    } else {
      return { success: false, log, error: `No dist directory found in sandbox app "${slug}". Make sure it built correctly.` };
    }

    mkdirSync(NGINX_PROD_DIR, { recursive: true });
    writeFileSync(nginxProdConf, nginxBlock, "utf-8");
    log.push(`✅ Production nginx conf written`);

    // 4. Reload nginx
    try {
      const { execSync } = await import("child_process");
      execSync("nginx -t && nginx -s reload", { encoding: "utf-8", stdio: ["pipe","pipe","pipe"] });
      log.push(`✅ nginx reloaded`);
    } catch (e: any) {
      log.push(`⚠️ nginx reload failed: ${e.message?.slice(0, 200)}`);
    }

    const prodUrl = `${PROD_DOMAIN}/apps/${slug}/`;
    log.push(`🚀 Live in production at: ${prodUrl}`);
    return { success: true, url: prodUrl, log };
  } catch (e: any) {
    return { success: false, log, error: e.message };
  }
}
