import { cities } from "./app-data.js";
import { fetchDashboard, fetchTradeSummary } from "./api.js";
import {
  renderClock,
  renderControls,
  renderFooter,
  renderLoadingState,
  renderRecentDays,
  renderRefreshError,
  renderSectors,
  renderSession,
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

    try {
      const tradeSummary = await fetchTradeSummary();
      state.lastTradeSummary = tradeSummary;
      renderTradeSummary(elements, tradeSummary);
      renderRecentDays(elements, tradeSummary.lastSevenDays);
    } catch {
      if (state.lastTradeSummary) {
        renderTradeSummary(elements, state.lastTradeSummary);
        renderRecentDays(elements, state.lastTradeSummary.lastSevenDays);
      } else {
        renderTradeSummaryUnavailable(elements);
      }
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
}

function init() {
  applyTheme(state.activeTheme);
  renderControls(elements, state);
  renderLoadingState(elements, state.activeCity);
  updateClock();
  bindEvents();
  refreshDashboard({ showLoading: true });

  window.setInterval(updateClock, CLOCK_REFRESH_MS);
  window.setInterval(() => {
    refreshDashboard();
  }, DASHBOARD_REFRESH_MS);
}

init();
