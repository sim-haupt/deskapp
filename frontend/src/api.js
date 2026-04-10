const REQUEST_TIMEOUT_MS = 12000;
const DEFAULT_API_BASE_URL = "http://localhost:3000";

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
