const MemoryCache = require("./cache");
const HttpError = require("./http-error");
const { env } = require("./env");
const { fetchText } = require("./http-client");

const DEFAULT_ECONOMIC_CALENDAR_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.xml";
const DEFAULT_EVENT_LIMIT = 12;
const CALENDAR_WINDOW_DAYS = 7;
const ECONOMIC_CALENDAR_CACHE_KEY = "economic-calendar";
const ECONOMIC_CALENDAR_CACHE_TTL_MS = 15 * 60 * 1000;
const INCLUDED_IMPACTS = new Set(["High", "Medium"]);
const calendarCache = new MemoryCache();

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function getTagValue(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXmlEntities(match[1]) : "";
}

function parseDateKey(value) {
  const match = String(value || "").match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (!match) {
    return "";
  }

  const [, month, day, year] = match;
  return `${year}-${month}-${day}`;
}

function parseSortTime(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw || raw === "all day" || raw === "tentative") {
    return 0;
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})(am|pm)$/);

  if (!match) {
    return 0;
  }

  const [, hourText, minuteText, meridiem] = match;
  let hour = Number(hourText);
  const minute = Number(minuteText);

  if (meridiem === "pm" && hour !== 12) {
    hour += 12;
  }

  if (meridiem === "am" && hour === 12) {
    hour = 0;
  }

  return hour * 60 + minute;
}

function getDateKeyOffset(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function isWithinWindow(dateKey) {
  if (!dateKey) {
    return false;
  }

  const start = getDateKeyOffset(0);
  const end = getDateKeyOffset(CALENDAR_WINDOW_DAYS);
  return dateKey >= start && dateKey <= end;
}

function parseEvents(xmlText) {
  const eventBlocks = xmlText.match(/<event>[\s\S]*?<\/event>/gi) || [];

  return eventBlocks
    .map((block) => {
      const date = getTagValue(block, "date");
      const dateKey = parseDateKey(date);
      const time = getTagValue(block, "time");
      const impact = getTagValue(block, "impact");
      const title = getTagValue(block, "title");
      const country = getTagValue(block, "country");
      const forecast = getTagValue(block, "forecast");
      const previous = getTagValue(block, "previous");
      const link = getTagValue(block, "url");

      if (!dateKey || !title || !INCLUDED_IMPACTS.has(impact)) {
        return null;
      }

      return {
        id: `${dateKey}-${time}-${country}-${title}`,
        dateKey,
        time,
        title,
        country,
        impact,
        forecast,
        previous,
        link,
        sortTime: parseSortTime(time)
      };
    })
    .filter(Boolean);
}

async function getEconomicCalendar({ limit = DEFAULT_EVENT_LIMIT } = {}) {
  const cached = calendarCache.get(ECONOMIC_CALENDAR_CACHE_KEY);

  if (cached) {
    return {
      events: cached.events.slice(0, limit)
    };
  }

  let calendarUrl;

  try {
    calendarUrl = new URL(env.economicCalendarUrl || DEFAULT_ECONOMIC_CALENDAR_URL);
  } catch {
    throw new HttpError(500, "Economic calendar URL is invalid.");
  }

  if (!["https:", "http:"].includes(calendarUrl.protocol)) {
    throw new HttpError(500, "Economic calendar URL must be an HTTP URL.");
  }

  const xmlText = await fetchText(calendarUrl, {
    label: "Economic calendar request"
  });
  const events = parseEvents(xmlText)
    .filter((event) => isWithinWindow(event.dateKey))
    .sort((a, b) => `${a.dateKey}-${String(a.sortTime).padStart(4, "0")}`.localeCompare(`${b.dateKey}-${String(b.sortTime).padStart(4, "0")}`))
    .slice(0, limit)
    .map(({ sortTime, ...event }) => event);

  const payload = {
    events
  };

  calendarCache.set(ECONOMIC_CALENDAR_CACHE_KEY, payload, ECONOMIC_CALENDAR_CACHE_TTL_MS);
  return payload;
}

module.exports = {
  getEconomicCalendar
};
