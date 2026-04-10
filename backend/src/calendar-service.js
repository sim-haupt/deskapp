const HttpError = require("./http-error");
const { env } = require("./env");
const { fetchText } = require("./http-client");

const DEFAULT_EVENT_LIMIT = 8;

function unfoldIcs(value) {
  return String(value || "").replace(/\r?\n[ \t]/g, "");
}

function decodeIcsText(value) {
  return String(value || "")
    .replace(/\\n/g, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function getField(block, fieldName) {
  const match = block.match(new RegExp(`^${fieldName}(?:;[^:]*)?:(.*)$`, "im"));
  return match ? match[1].trim() : "";
}

function isAllDayField(block, fieldName) {
  const match = block.match(new RegExp(`^${fieldName}([^:]*):(.*)$`, "im"));
  return Boolean(match?.[1]?.includes("VALUE=DATE"));
}

function parseDateValue(value, allDay = false) {
  const raw = String(value || "").trim();

  if (!raw) {
    return null;
  }

  const dateMatch = raw.match(/^(\d{4})(\d{2})(\d{2})$/);

  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const dateTimeMatch = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);

  if (!dateTimeMatch) {
    return null;
  }

  const [, year, month, day, hour, minute, second, zulu] = dateTimeMatch;

  if (zulu || allDay) {
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  }

  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}

function parseEvents(icsText) {
  const calendar = unfoldIcs(icsText);
  const eventBlocks = calendar.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

  return eventBlocks
    .map((block) => {
      const startsAllDay = isAllDayField(block, "DTSTART");
      const endsAllDay = isAllDayField(block, "DTEND");
      const start = parseDateValue(getField(block, "DTSTART"), startsAllDay);
      const end = parseDateValue(getField(block, "DTEND"), endsAllDay);

      if (!start || Number.isNaN(start.getTime())) {
        return null;
      }

      return {
        id: getField(block, "UID") || `${getField(block, "SUMMARY")}-${start.toISOString()}`,
        title: decodeIcsText(getField(block, "SUMMARY")) || "Untitled event",
        location: decodeIcsText(getField(block, "LOCATION")),
        startsAt: start.toISOString(),
        endsAt: end && !Number.isNaN(end.getTime()) ? end.toISOString() : "",
        allDay: startsAllDay
      };
    })
    .filter(Boolean);
}

async function getCalendarEvents({ limit = DEFAULT_EVENT_LIMIT } = {}) {
  if (!env.hasGoogleCalendar) {
    return {
      configured: false,
      events: []
    };
  }

  let calendarUrl;

  try {
    calendarUrl = new URL(env.googleCalendarIcalUrl);
  } catch {
    throw new HttpError(500, "Google Calendar iCal URL is invalid.");
  }

  if (!["https:", "http:"].includes(calendarUrl.protocol)) {
    throw new HttpError(500, "Google Calendar iCal URL must be an HTTP URL.");
  }

  const icsText = await fetchText(calendarUrl, {
    label: "Google Calendar request"
  });
  const now = Date.now();
  const events = parseEvents(icsText)
    .filter((event) => {
      const endsAt = event.endsAt ? Date.parse(event.endsAt) : Date.parse(event.startsAt);
      return endsAt >= now;
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, limit);

  return {
    configured: true,
    events
  };
}

module.exports = {
  getCalendarEvents
};
