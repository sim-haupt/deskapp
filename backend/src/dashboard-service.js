const { getBannerData } = require("./market-service");
const { getSessionState } = require("./session");
const { getWeatherForCity } = require("./weather-service");
const logger = require("./logger");

function fallbackWeather(city) {
  return {
    city,
    label: city,
    temperatureC: null,
    description: "WEATHER UNAVAILABLE",
    icon: "cloudy",
    observedAt: null
  };
}

function fallbackMarket() {
  return {
    asOf: new Date().toISOString(),
    feedLabel: "MARKET DATA TEMPORARILY UNAVAILABLE",
    quotes: [],
    sectors: []
  };
}

async function getDashboardPayload({ city }) {
  const [weatherResult, marketResult] = await Promise.allSettled([
    getWeatherForCity(city),
    getBannerData()
  ]);

  const weather = weatherResult.status === "fulfilled" ? weatherResult.value : fallbackWeather(city);
  const market = marketResult.status === "fulfilled" ? marketResult.value : fallbackMarket();

  if (weatherResult.status === "rejected") {
    logger.warn("Weather service failed for dashboard payload", {
      city,
      message: weatherResult.reason?.message || "Unknown weather failure"
    });
  }

  if (marketResult.status === "rejected") {
    logger.warn("Market service failed for dashboard payload", {
      city,
      message: marketResult.reason?.message || "Unknown market failure"
    });
  }

  return {
    meta: {
      asOf: new Date().toISOString(),
      city,
      session: getSessionState(new Date())
    },
    weather,
    market
  };
}

module.exports = {
  getDashboardPayload
};
