const express = require("express");
const helmet = require("helmet");
const { env } = require("./env");
const HttpError = require("./http-error");
const logger = require("./logger");
const { parseDashboardQuery, parseSpotifySearchQuery } = require("./validation");
const { getCalendarEvents } = require("./calendar-service");
const { getDashboardPayload } = require("./dashboard-service");
const { getWorldNews } = require("./news-service");
const { searchSpotify } = require("./spotify-service");
const { getLatestYoutubeVideo } = require("./youtube-service");

const app = express();

function getAllowedOrigin(origin) {
  if (!origin) {
    return "";
  }

  if (env.frontendOrigins.includes("*")) {
    return "*";
  }

  return env.frontendOrigins.includes(origin) ? origin : "";
}

function requestLogger(request, response, next) {
  const startedAt = process.hrtime.bigint();

  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1000000;

    logger.info("HTTP request", {
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      durationMs: Number(durationMs.toFixed(1))
    });
  });

  next();
}

function corsMiddleware(request, response, next) {
  const requestOrigin = request.get("origin") || "";
  const allowedOrigin = getAllowedOrigin(requestOrigin);

  if (requestOrigin && !allowedOrigin) {
    next(new HttpError(403, "Origin not allowed."));
    return;
  }

  response.header("Vary", "Origin");
  response.header("Access-Control-Allow-Methods", "GET,OPTIONS");
  response.header("Access-Control-Allow-Headers", "Content-Type");

  if (allowedOrigin) {
    response.header("Access-Control-Allow-Origin", allowedOrigin);
  }

  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }

  next();
}

function notFound(request, _response, next) {
  next(new HttpError(404, `Route ${request.method} ${request.originalUrl} was not found.`));
}

function errorHandler(error, request, response, _next) {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const safeMessage =
    error.name === "HttpError" ? error.message : "Something went wrong while processing the request.";

  logger.error("Request failed", {
    method: request.method,
    path: request.originalUrl,
    statusCode,
    message: error.message
  });

  response.status(statusCode).json({
    error: safeMessage
  });
}

app.disable("x-powered-by");
app.use(helmet());
app.use(requestLogger);
app.use(corsMiddleware);

app.get("/health", (_request, response) => {
  response.status(200).json({
    ok: true,
    service: "pixel-desk-backend",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get("/api/dashboard", async (request, response, next) => {
  try {
    const query = parseDashboardQuery(request.query);
    const payload = await getDashboardPayload(query);
    response.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

app.get("/api/calendar/events", async (_request, response, next) => {
  try {
    const payload = await getCalendarEvents();
    response.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

app.get("/api/news/world", async (_request, response, next) => {
  try {
    const payload = await getWorldNews();
    response.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

app.get("/api/spotify/search", async (request, response, next) => {
  try {
    const query = parseSpotifySearchQuery(request.query);
    const payload = await searchSpotify(query.q, {
      limit: query.limit,
      type: query.type
    });
    response.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

app.get("/api/youtube/latest", async (_request, response, next) => {
  try {
    const payload = await getLatestYoutubeVideo({
      user: "DaytradeWarrior",
      excludeShorts: true
    });

    response.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
