import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowlist = [
  "cors",
  "express",
  "express-rate-limit",
  "ioredis",
  "nodemailer",
  "openai",
  "pg",
  "uuid",
  "zod",
];

async function buildAll() {
  const distDir = path.resolve(__dirname, "dist");
  await rm(distDir, { recursive: true, force: true });

  console.log("building sirius-intelligence...");

  const { readFile } = await import("fs/promises");
  const pkgPath = path.resolve(__dirname, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.resolve(distDir, "index.cjs"),
    define: { "process.env.NODE_ENV": '"production"' },
    conditions: ["require", "node", "default"],
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("done.");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
