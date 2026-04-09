import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");

const filesToCopy = [
  "index.html",
  "script.js",
  "styles.css",
  "weather-sunny.svg",
  "weather-cloudy.svg",
  "weather-rain.svg",
  "weather-storm.svg",
  "weather-snow.svg",
  "weather-fog.svg"
];

const apiBaseUrl = String(process.env.PIXEL_DESK_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(distDir, { recursive: true });

await Promise.all(
  filesToCopy.map(async (fileName) => {
    await fs.copyFile(path.join(__dirname, fileName), path.join(distDir, fileName));
  })
);

await fs.writeFile(
  path.join(distDir, "config.js"),
  `window.__APP_CONFIG__ = ${JSON.stringify({ apiBaseUrl }, null, 2)};\n`,
  "utf8"
);

console.log(`Built frontend with API base ${apiBaseUrl}`);
