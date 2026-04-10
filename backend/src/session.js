function getTimeParts(timeZone, referenceDate = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(referenceDate);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    hour: Number(values.hour),
    minute: Number(values.minute)
  };
}

function getMinutesOfDay(timeZone, referenceDate = new Date()) {
  const { hour, minute } = getTimeParts(timeZone, referenceDate);
  return hour * 60 + minute;
}

function getSessionState(referenceDate = new Date()) {
  const nyMinutes = getMinutesOfDay("America/New_York", referenceDate);
  const premarketOpen = 4 * 60;
  const regularOpen = 9 * 60 + 30;
  const powerHourOpen = 15 * 60;
  const regularClose = 16 * 60;
  const nextPremarketOpen = 24 * 60 + premarketOpen;

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

  if (nyMinutes < powerHourOpen) {
    return {
      phase: "REGULAR HOURS",
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

module.exports = {
  getSessionState
};
