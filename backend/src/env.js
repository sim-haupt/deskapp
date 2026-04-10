const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "../.env")
});

function parseNumber(value, fallback, { min, max } = {}) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (typeof min === "number" && parsed < min) {
    return min;
  }

  if (typeof max === "number" && parsed > max) {
    return max;
  }

  return parsed;
}

function parseOrigins(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return ["http://localhost:4173", "http://127.0.0.1:4173"];
  }

  if (raw === "*") {
    return ["*"];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  host: process.env.HOST || "0.0.0.0",
  port: parseNumber(process.env.PORT, 3000, { min: 1, max: 65535 }),
  externalTimeoutMs: parseNumber(process.env.EXTERNAL_TIMEOUT_MS, 12000, { min: 1000, max: 30000 }),
  frontendOrigins: parseOrigins(process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN),
  alpacaKeyId: String(process.env.ALPACA_KEY_ID || "").trim(),
  alpacaSecretKey: String(process.env.ALPACA_SECRET_KEY || "").trim(),
  spotifyClientId: String(process.env.SPOTIFY_CLIENT_ID || "").trim(),
  spotifyClientSecret: String(process.env.SPOTIFY_CLIENT_SECRET || "").trim(),
  googleCalendarIcalUrl: String(process.env.GOOGLE_CALENDAR_ICAL_URL || "").trim(),
  newsRssUrl: String(process.env.NEWS_RSS_URL || "").trim()
};

env.hasAlpacaCredentials = Boolean(env.alpacaKeyId && env.alpacaSecretKey);
env.hasSpotifyCredentials = Boolean(env.spotifyClientId && env.spotifyClientSecret);
env.hasGoogleCalendar = Boolean(env.googleCalendarIcalUrl);

module.exports = {
  env
};
