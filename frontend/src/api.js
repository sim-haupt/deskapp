const REQUEST_TIMEOUT_MS = 12000;
const DEFAULT_API_BASE_URL = "http://localhost:3000";
const TRADE_SUMMARY_URL =
  "https://trader-sand.vercel.app/api/public/trades/widget-summary/cmnofsul30000lc0plliibaiz";

function getApiBaseUrl() {
  const runtimeConfig = window.__PIXEL_DESK_CONFIG__ ?? {};
  return String(runtimeConfig.apiBaseUrl || DEFAULT_API_BASE_URL).trim().replace(/\/$/, "");
}

function buildApiUrl(pathname, params = {}) {
  const url = new URL(pathname, `${getApiBaseUrl()}/`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url;
}

export async function fetchDashboard(params) {
  const response = await fetch(buildApiUrl("/api/dashboard", params), {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    let message = "Unable to load dashboard data.";

    try {
      const payload = await response.json();
      message = payload.error || message;
    } catch {
      message = `Dashboard request failed with status ${response.status}.`;
    }

    throw new Error(message);
  }

  return response.json();
}

export async function fetchTradeSummary() {
  const response = await fetch(TRADE_SUMMARY_URL, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`Trade summary request failed with status ${response.status}.`);
  }

  const payload = await response.json();

  if (!payload?.success || !payload?.data) {
    throw new Error("Trade summary response is invalid.");
  }

  return payload.data;
}

export async function fetchLatestVideo() {
  const response = await fetch(buildApiUrl("/api/youtube/latest"), {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`Latest video request failed with status ${response.status}.`);
  }

  return response.json();
}

export async function fetchCalendarEvents() {
  const response = await fetch(buildApiUrl("/api/calendar/events"), {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`Calendar request failed with status ${response.status}.`);
  }

  return response.json();
}

export async function fetchWorldNews() {
  const response = await fetch(buildApiUrl("/api/news/world"), {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`News request failed with status ${response.status}.`);
  }

  return response.json();
}

export async function fetchSpotifySearch(query, limit = 40, type = "all") {
  const response = await fetch(
    buildApiUrl("/api/spotify/search", {
      q: query,
      limit,
      type
    }),
    {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    }
  );

  if (!response.ok) {
    let message = "Spotify search failed.";

    try {
      const payload = await response.json();
      message = payload.error || message;
    } catch {
      message = `Spotify search request failed with status ${response.status}.`;
    }

    throw new Error(message);
  }

  return response.json();
}
