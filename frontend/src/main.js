import { cities } from "./app-data.js";
import {
  fetchDashboard,
  fetchLatestVideo,
  fetchSpotifySearch,
  fetchTradeSummary
} from "./api.js";
import {
  renderClock,
  renderControls,
  renderFooter,
  renderLatestVideo,
  renderLoadingState,
  renderRecentDays,
  renderRefreshError,
  renderSectors,
  renderSession,
  renderSpotifyEmbed,
  renderSpotifyResults,
  renderSpotifyStatus,
  renderTradeSummary,
  renderTradeSummaryUnavailable,
  renderTicker,
  renderWeather
} from "./view.js";
import { getSessionState } from "./session.js";

const DASHBOARD_REFRESH_MS = 60 * 1000;
const CLOCK_REFRESH_MS = 1000;
const STORAGE_KEY = "pixel-desk-theme";
const DEFAULT_THEME = "arcade";
const DEFAULT_CITY = "langen";

const elements = {
  currentDate: document.querySelector("#current-date"),
  timeCet: document.querySelector("#time-cet"),
  timeNy: document.querySelector("#time-ny"),
  weatherIcon: document.querySelector("#weather-icon"),
  weatherCityLabel: document.querySelector("#weather-city-label"),
  weatherTempInline: document.querySelector("#weather-temp-inline"),
  weatherStatusInline: document.querySelector("#weather-status-inline"),
  headerSessionPhase: document.querySelector("#header-session-phase"),
  headerSessionCountdown: document.querySelector("#header-session-countdown"),
  headerTotal: document.querySelector("#header-total"),
  headerMonth: document.querySelector("#header-month"),
  headerWeek: document.querySelector("#header-week"),
  headerToday: document.querySelector("#header-today"),
  latestVideoFrame: document.querySelector("#latest-video-frame"),
  spotifySearchForm: document.querySelector("#spotify-search-form"),
  spotifyQuery: document.querySelector("#spotify-query"),
  spotifyStatus: document.querySelector("#spotify-status"),
  spotifyResults: document.querySelector("#spotify-results"),
  spotifyPlayerFrame: document.querySelector("#spotify-player-frame"),
  tickerTrackA: document.querySelector("#ticker-track-a"),
  tickerTrackB: document.querySelector("#ticker-track-b"),
  sectorList: document.querySelector("#sector-list"),
  recentDaysList: document.querySelector("#recent-days-list"),
  dataStatus: document.querySelector("#data-status"),
  feedLabel: document.querySelector("#feed-label"),
  lastUpdated: document.querySelector("#last-updated"),
  cityButtons: [...document.querySelectorAll(".city-button")],
  themeButtons: [...document.querySelectorAll(".theme-button")]
};

const state = {
  activeCity: DEFAULT_CITY,
  activeTheme: loadStoredTheme(),
  lastPayload: null,
  lastTradeSummary: null,
  lastVideo: null,
  lastSpotifyResults: [],
  selectedSpotifyItem: null,
  refreshInFlight: false
};

function loadStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures. The app still works without persistence.
  }
}

function applyTheme(theme) {
  state.activeTheme = theme;
  document.body.dataset.theme = theme;
  saveTheme(theme);
  renderControls(elements, state);
}

function updateClock() {
  const now = new Date();
  renderClock(elements, now);
  renderSession(elements, getSessionState(now));
}

function parseSpotifyInput(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return null;
  }

  const urlMatch = raw.match(/open\.spotify\.com\/(track|album|artist|playlist)\/([A-Za-z0-9]+)/i);

  if (urlMatch) {
    const [, type, id] = urlMatch;

    return {
      type: type.toLowerCase(),
      id,
      title: raw,
      subtitle: "Direct Spotify link",
      embedUrl: `https://open.spotify.com/embed/${type.toLowerCase()}/${id}?utm_source=generator&theme=0`
    };
  }

  const uriMatch = raw.match(/^spotify:(track|album|artist|playlist):([A-Za-z0-9]+)$/i);

  if (uriMatch) {
    const [, type, id] = uriMatch;

    return {
      type: type.toLowerCase(),
      id,
      title: raw,
      subtitle: "Direct Spotify URI",
      embedUrl: `https://open.spotify.com/embed/${type.toLowerCase()}/${id}?utm_source=generator&theme=0`
    };
  }

  return null;
}

function loadSpotifyItem(item, statusMessage) {
  state.selectedSpotifyItem = item;
  renderSpotifyEmbed(elements, item);

  if (statusMessage) {
    renderSpotifyStatus(elements, statusMessage, "positive");
  }
}

async function handleSpotifySearch(event) {
  event.preventDefault();

  const query = elements.spotifyQuery?.value?.trim() || "";

  if (!query) {
    renderSpotifyStatus(elements, "Type a search before pressing enter.", "warm");
    return;
  }

  const directItem = parseSpotifyInput(query);

  if (directItem) {
    state.lastSpotifyResults = [];
    renderSpotifyResults(elements, [], () => {}, "Direct Spotify link loaded.");
    loadSpotifyItem(directItem, "Loaded Spotify link.");
    return;
  }

  renderSpotifyStatus(elements, `Searching Spotify for "${query}"...`, "neutral");

  try {
    const payload = await fetchSpotifySearch(query, 40);
    const results = Array.isArray(payload?.results) ? payload.results : [];
    state.lastSpotifyResults = results;

    renderSpotifyResults(elements, results, (item) => {
      loadSpotifyItem(item, `Loaded ${item.type}: ${item.title}`);
    });

    if (results.length > 0) {
      loadSpotifyItem(results[0], `Loaded top result for "${query}".`);
    } else {
      renderSpotifyEmbed(elements, null);
      renderSpotifyStatus(elements, `No Spotify results for "${query}".`, "warm");
      renderSpotifyResults(elements, [], () => {}, `No results for "${query}".`);
    }
  } catch (error) {
    renderSpotifyStatus(elements, error.message, "warm");
  }
}

async function refreshDashboard({ showLoading = false } = {}) {
  if (state.refreshInFlight) {
    return;
  }

  state.refreshInFlight = true;

  if (showLoading && !state.lastPayload) {
    renderLoadingState(elements, state.activeCity);
  }

  try {
    const dashboardPayload = await fetchDashboard({
      city: state.activeCity
    });

    state.lastPayload = dashboardPayload;

    renderWeather(elements, dashboardPayload.weather);
    renderTicker(elements, dashboardPayload.market.quotes);
    renderSectors(elements, dashboardPayload.market.sectors);
    renderFooter(elements, dashboardPayload);

    const [tradeSummaryResult, latestVideoResult] = await Promise.allSettled([
      fetchTradeSummary(),
      fetchLatestVideo()
    ]);

    if (tradeSummaryResult.status === "fulfilled") {
      state.lastTradeSummary = tradeSummaryResult.value;
      renderTradeSummary(elements, tradeSummaryResult.value);
      renderRecentDays(elements, tradeSummaryResult.value.lastSevenDays);
    } else if (state.lastTradeSummary) {
      renderTradeSummary(elements, state.lastTradeSummary);
      renderRecentDays(elements, state.lastTradeSummary.lastSevenDays);
    } else {
      renderTradeSummaryUnavailable(elements);
    }

    if (latestVideoResult.status === "fulfilled") {
      state.lastVideo = latestVideoResult.value;
      renderLatestVideo(elements, latestVideoResult.value);
    } else if (state.lastVideo) {
      renderLatestVideo(elements, state.lastVideo);
    } else {
      renderLatestVideo(elements, null);
    }
  } catch (error) {
    renderRefreshError(elements, error.message, Boolean(state.lastPayload));
  } finally {
    state.refreshInFlight = false;
  }
}

function handleCityChange(event) {
  const nextCity = event.currentTarget.dataset.city;

  if (!cities[nextCity] || nextCity === state.activeCity) {
    return;
  }

  state.activeCity = nextCity;
  renderControls(elements, state);
  renderLoadingState(elements, state.activeCity);
  refreshDashboard();
}

function handleThemeChange(event) {
  const nextTheme = event.currentTarget.dataset.theme;

  if (!nextTheme || nextTheme === state.activeTheme) {
    return;
  }

  applyTheme(nextTheme);
}

function bindEvents() {
  elements.cityButtons.forEach((button) => button.addEventListener("click", handleCityChange));
  elements.themeButtons.forEach((button) => button.addEventListener("click", handleThemeChange));
  elements.spotifySearchForm?.addEventListener("submit", handleSpotifySearch);
}

function init() {
  applyTheme(state.activeTheme);
  renderControls(elements, state);
  renderLoadingState(elements, state.activeCity);
  renderSpotifyStatus(elements, "Search for something to play.", "neutral");
  renderSpotifyResults(elements, [], () => {}, "No search yet.");
  renderSpotifyEmbed(elements, null);
  updateClock();
  bindEvents();
  refreshDashboard({ showLoading: true });

  window.setInterval(updateClock, CLOCK_REFRESH_MS);
  window.setInterval(() => {
    refreshDashboard();
  }, DASHBOARD_REFRESH_MS);
}

init();
