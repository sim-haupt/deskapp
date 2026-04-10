const { getBannerData, getScreenedUniverse } = require("./market-service");
const { getSessionState } = require("./session");
const { getWeatherForCity } = require("./weather-service");

async function getDashboardPayload({ city, filters }) {
  const [weather, market, universe] = await Promise.all([
    getWeatherForCity(city),
    getBannerData(),
    getScreenedUniverse(filters)
  ]);

  return {
    meta: {
      asOf: new Date().toISOString(),
      city,
      session: getSessionState(new Date())
    },
    weather,
    market,
    universe
  };
}

module.exports = {
  getDashboardPayload
};
