import { cities, getWeatherIconUrl } from "./app-data.js";
import {
  formatClock,
  formatCountdown,
  formatDateLabel,
  formatPercent,
  formatPrice,
  formatUpdateTime
} from "./formatters.js";

function getTickerTone(value) {
  if (value > 0) {
    return "is-up";
  }

  if (value < 0) {
    return "is-down";
  }

  return "is-flat";
}

function getMetricTone(value) {
  if (value > 0) {
    return "positive";
  }

  if (value < 0) {
    return "warm";
  }

  return "neutral";
}

function createMetricRow(label, value, tone = "neutral") {
  const item = document.createElement("li");
  item.className = "metric-row";

  const labelNode = document.createElement("span");
  labelNode.textContent = label;

  const valueNode = document.createElement("strong");
  valueNode.className = tone;
  valueNode.textContent = value;

  item.append(labelNode, valueNode);
  return item;
}

function createTickerItem(quote) {
  const item = document.createElement("span");
  item.className = `ticker-item ${getTickerTone(quote.pct)}`;

  const symbol = document.createElement("span");
  symbol.className = "ticker-symbol";
  symbol.textContent = quote.label;

  const price = document.createElement("span");
  price.className = "ticker-price";
  price.textContent = formatPrice(quote.price);

  const change = document.createElement("span");
  change.className = "ticker-change";
  change.textContent = formatPercent(quote.pct);

  item.append(symbol, price, change);
  return item;
}

function replaceChildren(target, children) {
  target.replaceChildren(...children);
}

export function renderClock(elements, referenceDate = new Date()) {
  elements.currentDate.textContent = formatDateLabel(referenceDate, "Europe/Berlin");
  elements.timeCet.textContent = formatClock(referenceDate, "Europe/Berlin");
  elements.timeNy.textContent = formatClock(referenceDate, "America/New_York");
}

export function renderSession(elements, session) {
  elements.headerSessionPhase.textContent = session.phase;
  elements.headerSessionCountdown.textContent = `${session.nextLabel} ${formatCountdown(session.nextMinutes)}`;
}

export function renderControls(elements, state) {
  elements.cityButtons.forEach((button) => {
    const isActive = button.dataset.city === state.activeCity;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  elements.themeButtons.forEach((button) => {
    const isActive = button.dataset.theme === state.activeTheme;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

export function renderWeather(elements, weather) {
  elements.weatherCityLabel.textContent = weather.label || cities[weather.city]?.label || "Unknown";
  elements.weatherTempInline.textContent =
    typeof weather.temperatureC === "number" ? `${Math.round(weather.temperatureC)}°C` : "--°C";
  elements.weatherStatusInline.textContent = weather.description || "Weather unavailable";
  elements.weatherIcon.src = getWeatherIconUrl(weather.icon);
  elements.weatherIcon.alt = `${weather.description || "Current weather"} icon`;
}

export function renderTicker(elements, quotes) {
  if (!Array.isArray(quotes) || quotes.length === 0) {
    const placeholder = createTickerItem({ label: "OFFLINE", price: Number.NaN, pct: 0 });
    placeholder.querySelector(".ticker-change").textContent = "Data unavailable";
    replaceChildren(elements.tickerTrackA, [placeholder]);
    replaceChildren(elements.tickerTrackB, [placeholder.cloneNode(true)]);
    return;
  }

  replaceChildren(elements.tickerTrackA, quotes.map(createTickerItem));
  replaceChildren(elements.tickerTrackB, quotes.map(createTickerItem));
}

export function renderSectors(elements, sectors) {
  if (!Array.isArray(sectors) || sectors.length === 0) {
    replaceChildren(elements.sectorList, [createMetricRow("No sector data", "--")]);
    return;
  }

  replaceChildren(
    elements.sectorList,
    sectors.map((sector) => createMetricRow(sector.label, formatPercent(sector.pct), getMetricTone(sector.pct)))
  );
}

export function renderFooter(elements, payload) {
  elements.dataStatus.textContent = "Backend online";
  elements.feedLabel.textContent = payload.market.feedLabel;
  elements.lastUpdated.textContent = `Updated ${formatUpdateTime(payload.meta.asOf)}`;
}

export function renderLoadingState(elements, activeCity) {
  elements.dataStatus.textContent = "Loading dashboard data…";
  elements.feedLabel.textContent = "Waiting for backend response";
  elements.lastUpdated.textContent = "Awaiting first sync";
  elements.weatherCityLabel.textContent = cities[activeCity]?.label || "Selected city";
  elements.weatherTempInline.textContent = "--°C";
  elements.weatherStatusInline.textContent = "Syncing weather…";
}

export function renderRefreshError(elements, message, hasExistingData) {
  elements.dataStatus.textContent = hasExistingData
    ? "Refresh failed, showing last good snapshot"
    : "Unable to load dashboard";
  elements.lastUpdated.textContent = message;

  if (!hasExistingData) {
    elements.feedLabel.textContent = "Backend unavailable";
    replaceChildren(elements.sectorList, [createMetricRow("Backend unavailable", "--")]);
    renderTicker(elements, []);
  }
}
