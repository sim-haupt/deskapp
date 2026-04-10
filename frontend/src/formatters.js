function numberFormatter(options = {}) {
  return new Intl.NumberFormat("en-US", options);
}

export function formatDateLabel(date, timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function formatClock(date, timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date);
}

export function formatCountdown(totalMinutes) {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const days = Math.floor(safeMinutes / (24 * 60));
  const remainingMinutes = safeMinutes % (24 * 60);
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingClockMinutes = remainingMinutes % 60;

  if (days > 0) {
    const dayLabel = days === 1 ? "day" : "days";
    const hourLabel = remainingHours === 1 ? "hour" : "hours";

    return `${days} ${dayLabel} ${remainingHours} ${hourLabel}`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatPrice(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  if (value >= 1000) {
    return numberFormatter({
      maximumFractionDigits: 0
    }).format(value);
  }

  return numberFormatter({
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatPercent(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "--";
  }

  return `${amount >= 0 ? "+" : ""}${amount.toFixed(2)}%`;
}

export function formatVolumeMillions(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return `${(value / 1000000).toFixed(1)}M`;
}

export function formatUpdateTime(value) {
  if (!value) {
    return "Awaiting first sync";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export function formatCalendarEventTime(value, allDay = false) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  const options = allDay
    ? {
        weekday: "short",
        day: "2-digit",
        month: "short"
      }
    : {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      };

  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

export function formatCalendarDayHeading(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(date);
}

export function formatCalendarEventRange(startValue, endValue, allDay = false) {
  const start = startValue ? new Date(startValue) : null;
  const end = endValue ? new Date(endValue) : null;

  if (!start || Number.isNaN(start.getTime())) {
    return "--";
  }

  if (!end || Number.isNaN(end.getTime())) {
    return formatCalendarEventTime(startValue, allDay);
  }

  const startDate = formatCalendarEventTime(startValue, allDay);
  const endDate = formatCalendarEventTime(endValue, allDay);

  if (startDate === endDate) {
    return startDate;
  }

  return `${startDate} - ${endDate}`;
}
