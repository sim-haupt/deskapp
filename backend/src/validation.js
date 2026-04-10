const { cities } = require("./data");
const HttpError = require("./http-error");

function parseDashboardQuery(query) {
  const city = String(query.city || "langen").trim().toLowerCase();

  if (!cities[city]) {
    throw new HttpError(400, `city must be one of: ${Object.keys(cities).join(", ")}.`);
  }

  return {
    city
  };
}

function parseSpotifySearchQuery(query) {
  const q = String(query.q || "").trim();

  if (!q) {
    throw new HttpError(400, "q is required.");
  }

  const parsedLimit = Number(query.limit);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(50, Math.max(1, Math.floor(parsedLimit)))
    : 40;

  return {
    q,
    limit
  };
}

module.exports = {
  parseDashboardQuery,
  parseSpotifySearchQuery
};
