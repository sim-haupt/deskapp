const { URL } = require("node:url");
const MemoryCache = require("./cache");
const { cities, weatherCodes } = require("./data");
const HttpError = require("./http-error");
const { fetchJson } = require("./http-client");

const weatherCache = new MemoryCache();

function getWeatherIcon(code) {
  if (code === 0 || code === 1) {
    return "sunny";
  }

  if (code === 45 || code === 48) {
    return "fog";
  }

  if ([95, 96, 99].includes(code)) {
    return "storm";
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "snow";
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "rain";
  }

  return "cloudy";
}

async function getWeatherForCity(cityKey) {
  const city = cities[cityKey];

  if (!city) {
    throw new HttpError(400, "Unknown city.");
  }

  const cached = weatherCache.get(cityKey);

  if (cached) {
    return cached;
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", city.latitude);
  url.searchParams.set("longitude", city.longitude);
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("timezone", "Europe/Berlin");

  const payload = await fetchJson(url, {
    label: "Open-Meteo weather"
  });

  return weatherCache.set(
    cityKey,
    {
      city: city.key,
      label: city.label,
      temperatureC: Math.round(payload.current.temperature_2m),
      description: weatherCodes[payload.current.weather_code] || "LIVE CONDITIONS",
      icon: getWeatherIcon(payload.current.weather_code),
      observedAt: payload.current.time
    },
    15 * 60 * 1000
  );
}

module.exports = {
  getWeatherForCity
};
