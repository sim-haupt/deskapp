import { cities, getWeatherIconUrl } from "./app-data.js";
import {
  formatClock,
  formatCountdown,
  formatCalendarDayHeading,
  formatCalendarEventRange,
  formatCalendarEventTime,
  formatDateLabel,
  formatPercent,
  formatPrice,
  formatUpdateTime
} from "./formatters.js";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

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

function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "--";
  }

  return `${amount >= 0 ? "+" : "-"}${moneyFormatter.format(Math.abs(amount))}`;
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

function createRecentDayRow(day) {
  const item = document.createElement("li");
  item.className = "recent-day-row";

  const label = document.createElement("span");
  label.className = "recent-day-label";
  label.textContent = day?.label || "--";

  const weekday = document.createElement("span");
  weekday.className = "recent-day-weekday";
  weekday.textContent = day?.weekday || "--";

  const pnl = Number(day?.pnl);
  const pnlNode = document.createElement("strong");
  pnlNode.className = `recent-day-pnl ${getMetricTone(pnl)}`;
  pnlNode.textContent = formatMoney(pnl);

  const trades = document.createElement("span");
  trades.className = "recent-day-trades";
  trades.textContent = `${Number.isFinite(Number(day?.trades)) ? Number(day.trades) : "--"} TRD`;

  item.append(label, weekday, pnlNode, trades);
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

function createSpotifyResultItem(item, onSelect) {
  const listItem = document.createElement("li");
  listItem.className = `spotify-result-item type-${item.type || "unknown"}`;

  const button = document.createElement("button");
  button.className = "spotify-result-button";
  button.type = "button";
  button.addEventListener("click", () => onSelect(item));

  const title = document.createElement("strong");
  title.className = "spotify-result-title";
  title.textContent = item.title || "Untitled";

  const meta = document.createElement("span");
  meta.className = "spotify-result-meta";

  const type = document.createElement("span");
  type.className = `spotify-result-type type-${item.type || "unknown"}`;
  type.textContent = item.type || "item";

  const subtitle = document.createElement("span");
  subtitle.textContent = item.subtitle || "Spotify";

  meta.append(type, subtitle);
  button.append(title, meta);
  listItem.append(button);
  return listItem;
}

function createCalendarEventItem(event) {
  const item = document.createElement("li");
  item.className = "calendar-event-row";

  const title = document.createElement("strong");
  title.className = "calendar-event-title";
  title.textContent = event.title || "Untitled event";

  const meta = document.createElement("span");
  meta.className = "calendar-event-meta";
  const dateLabel = event.isMultiDay
    ? formatCalendarEventRange(event.startsAt, event.endsAt, event.allDay)
    : formatCalendarEventTime(event.startsAt, event.allDay);
  const dayType = event.allDay ? "ALL DAY" : "EVENT";
  meta.textContent = event.isMultiDay
    ? `${dateLabel} | MULTI DAY`
    : `${dateLabel} | ${dayType}`;

  item.append(title, meta);

  if (event.location) {
    const location = document.createElement("span");
    location.className = "calendar-event-location";
    location.textContent = event.location;
    item.append(location);
  }

  return item;
}

function createCalendarDayGroup(dayKey, events) {
  const item = document.createElement("li");
  item.className = "calendar-day-group";

  const heading = document.createElement("h3");
  heading.className = "calendar-day-heading";
  heading.textContent = formatCalendarDayHeading(dayKey);

  const list = document.createElement("ul");
  list.className = "calendar-day-events";
  list.replaceChildren(...events.map(createCalendarEventItem));

  item.append(heading, list);
  return item;
}

function groupCalendarEventsByDay(events) {
  return events.reduce((groups, event) => {
    const dayKey = event.startsAt ? event.startsAt.slice(0, 10) : "unknown";
    const existingGroup = groups.find((group) => group.dayKey === dayKey);

    if (existingGroup) {
      existingGroup.events.push(event);
      return groups;
    }

    groups.push({
      dayKey,
      events: [event]
    });
    return groups;
  }, []);
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

export function renderTradeSummary(elements, summary) {
  elements.headerTotal.textContent = formatMoney(summary?.cumulative?.total);
  elements.headerMonth.textContent = formatMoney(summary?.cumulative?.month);
  elements.headerWeek.textContent = formatMoney(summary?.cumulative?.week);
  elements.headerToday.textContent = formatMoney(summary?.cumulative?.today);
}

export function renderLatestVideo(elements, video) {
  if (!elements.latestVideoFrame) {
    return;
  }

  if (!video?.embedUrl) {
    elements.latestVideoFrame.removeAttribute("src");
    elements.latestVideoFrame.title = "Latest video unavailable";
    return;
  }

  if (elements.latestVideoFrame.src !== video.embedUrl) {
    elements.latestVideoFrame.src = video.embedUrl;
  }

  elements.latestVideoFrame.title = video.title || "Latest video from DaytradeWarrior";
}

export function renderSpotifyMode(elements, mode) {
  const body = elements.spotifyWidgetBody;

  if (!body) {
    return;
  }

  body.classList.toggle("is-searching", mode === "searching");
  body.classList.toggle("is-playing", mode === "playing");
}

export function renderSpotifySearchState(elements, hasSearch) {
  const body = elements.spotifyWidgetBody;

  if (!body) {
    return;
  }

  body.classList.toggle("has-search", Boolean(hasSearch));
}

export function renderSpotifyResults(elements, results, onSelect, emptyMessage = "") {
  if (!elements.spotifyResults) {
    return;
  }

  if (!Array.isArray(results) || results.length === 0) {
    if (!emptyMessage) {
      replaceChildren(elements.spotifyResults, []);
      return;
    }

    const empty = document.createElement("li");
    empty.className = "spotify-result-empty";
    empty.textContent = emptyMessage;
    replaceChildren(elements.spotifyResults, [empty]);
    return;
  }

  replaceChildren(
    elements.spotifyResults,
    results.map((item) => createSpotifyResultItem(item, onSelect))
  );
}

export function renderSpotifyEmbed(elements, item) {
  if (!elements.spotifyPlayerFrame) {
    return;
  }

  if (!item?.embedUrl) {
    elements.spotifyPlayerFrame.removeAttribute("src");
    elements.spotifyPlayerFrame.title = "Spotify player";
    return;
  }

  if (elements.spotifyPlayerFrame.src !== item.embedUrl) {
    elements.spotifyPlayerFrame.src = item.embedUrl;
  }

  elements.spotifyPlayerFrame.title = item.title
    ? `Spotify player for ${item.title}`
    : "Spotify player";
}

export function renderCalendarEvents(elements, payload) {
  if (!elements.calendarList) {
    return;
  }

  if (!payload?.configured) {
    replaceChildren(elements.calendarList, []);
    return;
  }

  const events = Array.isArray(payload.events) ? payload.events : [];

  if (events.length === 0) {
    replaceChildren(elements.calendarList, []);
    return;
  }

  const groups = groupCalendarEventsByDay(events);
  replaceChildren(
    elements.calendarList,
    groups.map((group) => createCalendarDayGroup(group.dayKey, group.events))
  );
}

export function renderRecentDays(elements, lastSevenDays) {
  if (!Array.isArray(lastSevenDays) || lastSevenDays.length === 0) {
    replaceChildren(elements.recentDaysList, [createRecentDayRow(null)]);
    return;
  }

  const recentDays = lastSevenDays.slice(-3).reverse();
  replaceChildren(elements.recentDaysList, recentDays.map(createRecentDayRow));
}

export function renderTradeSummaryUnavailable(elements) {
  elements.headerTotal.textContent = "--";
  elements.headerMonth.textContent = "--";
  elements.headerWeek.textContent = "--";
  elements.headerToday.textContent = "--";
  replaceChildren(elements.recentDaysList, [createRecentDayRow(null)]);
}

export function renderLoadingState(elements, activeCity) {
  elements.dataStatus.textContent = "Loading dashboard data…";
  elements.feedLabel.textContent = "Waiting for backend response";
  elements.lastUpdated.textContent = "Awaiting first sync";
  elements.weatherCityLabel.textContent = cities[activeCity]?.label || "Selected city";
  elements.weatherTempInline.textContent = "--°C";
  elements.weatherStatusInline.textContent = "Syncing weather…";
  renderTradeSummaryUnavailable(elements);
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
    renderTradeSummaryUnavailable(elements);
  }
}
