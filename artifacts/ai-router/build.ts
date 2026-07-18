import { build } from "esbuild";
import { rm } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await rm(path.resolve(__dirname, "dist"), { recursive: true, force: true });

await build({
  entryPoints: [path.resolve(__dirname, "src/index.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: path.resolve(__dirname, "dist/index.cjs"),
  packages: "external",
  external: ["pg-native"],
  minify: false,
  sourcemap: false,
  target: "node20",
});

console.log("✓ ai-router built");
