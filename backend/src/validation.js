const { cities } = require("./data");
const HttpError = require("./http-error");

const spotifySearchTypes = new Set(["all", "track", "album", "artist", "playlist", "podcast", "show"]);

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
  const type = String(query.type || "all").trim().toLowerCase();

  if (!q) {
    throw new HttpError(400, "q is required.");
  }

  if (!spotifySearchTypes.has(type)) {
    throw new HttpError(400, "type must be one of: all, track, album, artist, playlist, podcast.");
  }

  const parsedLimit = Number(query.limit);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(50, Math.max(1, Math.floor(parsedLimit)))
    : 40;

  return {
    q,
    limit,
    type: type === "podcast" ? "show" : type
  };
}

module.exports = {
  parseDashboardQuery,
  parseSpotifySearchQuery
};
