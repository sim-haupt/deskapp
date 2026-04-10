import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");
const srcDir = path.join(__dirname, "src");
const assetsDir = path.join(__dirname, "assets");

const apiBaseUrl = String(process.env.PIXEL_DESK_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(distDir, { recursive: true });

await Promise.all([
  fs.copyFile(path.join(__dirname, "index.html"), path.join(distDir, "index.html")),
  fs.cp(srcDir, path.join(distDir, "src"), { recursive: true }),
  fs.cp(assetsDir, path.join(distDir, "assets"), { recursive: true })
]);

await fs.writeFile(
  path.join(distDir, "app-config.js"),
  `window.__PIXEL_DESK_CONFIG__ = ${JSON.stringify({ apiBaseUrl }, null, 2)};\n`,
  "utf8"
);
