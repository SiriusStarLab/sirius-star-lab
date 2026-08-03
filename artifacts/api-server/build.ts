import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm, readFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times without risking some
// packages that are not bundle compatible
const allowlist = [
  "@google/generative-ai",
  "axios",
  "bcryptjs",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "passport",
  "passport-local",
  "pg",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  const distDir = path.resolve(__dirname, "dist");
  await rm(distDir, { recursive: true, force: true });

  console.log("building server...");
  const pkgPath = path.resolve(__dirname, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter(
    (dep) =>
      !allowlist.includes(dep) &&
      !(pkg.dependencies?.[dep]?.startsWith("workspace:")),
  );

  // Packages that may not be declared in package.json but must be external
  // (e.g. transitive deps used directly, or packages not installed in this env)
  const alwaysExternal = [
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
    "openai",
    "pg",  // native addon — bundle fails on server; always resolve at runtime
  ];
  for (const pkg of alwaysExternal) {
    if (!externals.includes(pkg)) externals.push(pkg);
  }

  // Resolve @workspace/* packages by path — needed when pnpm symlinks aren't
  // present (e.g. on the production VPS where only the source is rsynced).
  const aiClientSrc = path.resolve(__dirname, "../../lib/ai-client/src");
  const workspaceAliases: Record<string, string> = {};
  try {
    // Only add aliases when the source directory actually exists
    const { stat } = await import("fs/promises");
    await stat(aiClientSrc);
    workspaceAliases["@workspace/ai-client"] = path.join(aiClientSrc, "index.ts");
    workspaceAliases["@workspace/ai-client/image"] = path.join(aiClientSrc, "image.ts");
  } catch {
    // On Replit, pnpm symlinks handle resolution — aliases not needed
  }

  // Build to CJS with `conditions: ["require"]` so esbuild picks the CJS
  // entry point for dual-format packages (e.g. openai, stripe) instead of
  // bundling their ESM code — which caused the fileURLToPath crash in prod.
  const sharedConfig = {
    platform: "node" as const,
    bundle: true,
    format: "cjs" as const,
    define: { "process.env.NODE_ENV": '"production"' },
    conditions: ["require", "node", "default"],
    minify: true,
    external: externals,
    alias: workspaceAliases,
    logLevel: "info" as const,
  };

  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/index.ts")],
    outfile: path.resolve(distDir, "index.cjs"),
    ...sharedConfig,
  });

  // worker build skipped on Kamatera — index.cjs only
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
