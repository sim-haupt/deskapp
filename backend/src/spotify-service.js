const MemoryCache = require("./cache");
const HttpError = require("./http-error");
const { env } = require("./env");

const tokenCache = new MemoryCache();
const TOKEN_CACHE_KEY = "spotify-access-token";
const SEARCH_TYPES = ["track", "album", "playlist", "artist"];

function buildEmbedUrl(type, id) {
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
}

function createItem(type, item) {
  if (!item?.id || !item?.name) {
    return null;
  }

  const image =
    item.images?.[0]?.url ||
    item.album?.images?.[0]?.url ||
    null;

  if (type === "track") {
    return {
      id: item.id,
      type,
      uri: item.uri,
      title: item.name,
      subtitle: (item.artists || []).map((artist) => artist.name).filter(Boolean).join(" • "),
      imageUrl: image,
      embedUrl: buildEmbedUrl(type, item.id)
    };
  }

  if (type === "album") {
    return {
      id: item.id,
      type,
      uri: item.uri,
      title: item.name,
      subtitle: (item.artists || []).map((artist) => artist.name).filter(Boolean).join(" • "),
      imageUrl: image,
      embedUrl: buildEmbedUrl(type, item.id)
    };
  }

  if (type === "playlist") {
    return {
      id: item.id,
      type,
      uri: item.uri,
      title: item.name,
      subtitle: item.owner?.display_name || "Spotify playlist",
      imageUrl: image,
      embedUrl: buildEmbedUrl(type, item.id)
    };
  }

  if (type === "artist") {
    return {
      id: item.id,
      type,
      uri: item.uri,
      title: item.name,
      subtitle: "Artist",
      imageUrl: image,
      embedUrl: buildEmbedUrl(type, item.id)
    };
  }

  return null;
}

function rankResults(payload, requestedLimit) {
  const buckets = {
    track: (payload.tracks?.items || []).slice(0, 3),
    album: (payload.albums?.items || []).slice(0, 2),
    playlist: (payload.playlists?.items || []).slice(0, 2),
    artist: (payload.artists?.items || []).slice(0, 1)
  };

  return SEARCH_TYPES.flatMap((type) => buckets[type].map((item) => createItem(type, item)))
    .filter(Boolean)
    .slice(0, requestedLimit);
}

async function getSpotifyAccessToken() {
  if (!env.hasSpotifyCredentials) {
    throw new HttpError(503, "Spotify search is not configured on the backend.");
  }

  const cachedToken = tokenCache.get(TOKEN_CACHE_KEY);

  if (cachedToken) {
    return cachedToken;
  }

  let response;

  try {
    response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${env.spotifyClientId}:${env.spotifyClientSecret}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(env.externalTimeoutMs)
    });
  } catch {
    throw new HttpError(502, "Spotify token request timed out or could not be reached.");
  }

  if (!response.ok) {
    throw new HttpError(502, `Spotify token request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const accessToken = String(payload.access_token || "").trim();
  const expiresInSeconds = Number(payload.expires_in) || 3600;

  if (!accessToken) {
    throw new HttpError(502, "Spotify token response is invalid.");
  }

  tokenCache.set(TOKEN_CACHE_KEY, accessToken, Math.max(60000, (expiresInSeconds - 60) * 1000));
  return accessToken;
}

async function searchSpotify(query, { limit = 8 } = {}) {
  const token = await getSpotifyAccessToken();
  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("type", SEARCH_TYPES.join(","));
  url.searchParams.set("limit", "3");
  url.searchParams.set("market", "DE");

  let response;

  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(env.externalTimeoutMs)
    });
  } catch {
    throw new HttpError(502, "Spotify search request timed out or could not be reached.");
  }

  if (!response.ok) {
    throw new HttpError(502, `Spotify search request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const results = rankResults(payload, limit);

  return {
    query,
    results
  };
}

module.exports = {
  searchSpotify
};
