function getTimeParts(timeZone, referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(referenceDate);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    weekday: values.weekday,
    hour: Number(values.hour),
    minute: Number(values.minute)
  };
}

function getNyDayOffsetToNextPremarket(weekday) {
  if (weekday === "Fri") {
    return 3;
  }

  if (weekday === "Sat") {
    return 2;
  }

  if (weekday === "Sun") {
    return 1;
  }

  return 1;
}

export function getSessionState(referenceDate = new Date()) {
  const { weekday, hour, minute } = getTimeParts("America/New_York", referenceDate);
  const nyMinutes = hour * 60 + minute;
  const premarketOpen = 4 * 60;
  const regularOpen = 9 * 60 + 30;
  const openingRangeClose = 10 * 60;
  const powerHourOpen = 15 * 60;
  const regularClose = 16 * 60;
  const nextPremarketDayOffset = getNyDayOffsetToNextPremarket(weekday);
  const nextPremarketOpen = nextPremarketDayOffset * 24 * 60 + premarketOpen;

  if (nyMinutes < premarketOpen) {
    return {
      phase: "OVERNIGHT",
      nextLabel: "To premarket open",
      nextMinutes: premarketOpen - nyMinutes
    };
  }

  if (nyMinutes < regularOpen) {
    return {
      phase: "PREMARKET",
      nextLabel: "To market open",
      nextMinutes: regularOpen - nyMinutes
    };
  }

  if (nyMinutes < openingRangeClose) {
    return {
      phase: "OPEN",
      nextLabel: "To midday",
      nextMinutes: openingRangeClose - nyMinutes
    };
  }

  if (nyMinutes < powerHourOpen) {
    return {
      phase: "MIDDAY",
      nextLabel: "To power hour",
      nextMinutes: powerHourOpen - nyMinutes
    };
  }

  if (nyMinutes < regularClose) {
    return {
      phase: "POWER HOUR",
      nextLabel: "To close",
      nextMinutes: regularClose - nyMinutes
    };
  }

  return {
    phase: "AFTER HOURS",
    nextLabel: "To premarket open",
    nextMinutes: nextPremarketOpen - nyMinutes
  };
}
