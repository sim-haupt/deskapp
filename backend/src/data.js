const cities = {
  langen: {
    key: "langen",
    label: "Langen",
    latitude: 49.9939,
    longitude: 8.6628
  },
  heidelberg: {
    key: "heidelberg",
    label: "Heidelberg",
    latitude: 49.3988,
    longitude: 8.6724
  }
};

const stockSymbols = [
  { symbol: "SPY", label: "SPY" },
  { symbol: "IWM", label: "RUSSELL 2000" },
  { symbol: "QQQ", label: "NASDAQ" },
  { symbol: "DIA", label: "DOW" },
  { symbol: "NVDA", label: "NVDA" },
  { symbol: "AMZN", label: "AMZN" },
  { symbol: "GOOGL", label: "GOOGL" }
];

const weatherCodes = {
  0: "CLEAR SKY",
  1: "MOSTLY CLEAR",
  2: "PARTLY CLOUDY",
  3: "OVERCAST",
  45: "FOGGY",
  48: "FROST FOG",
  51: "LIGHT DRIZZLE",
  53: "DRIZZLE",
  55: "HEAVY DRIZZLE",
  56: "FREEZING DRIZZLE",
  57: "DENSE ICE DRIZZLE",
  61: "LIGHT RAIN",
  63: "RAIN",
  65: "HEAVY RAIN",
  66: "FREEZING RAIN",
  67: "HARD FREEZING RAIN",
  71: "LIGHT SNOW",
  73: "SNOW",
  75: "HEAVY SNOW",
  77: "SNOW GRAINS",
  80: "RAIN SHOWERS",
  81: "SHOWER BURSTS",
  82: "HEAVY SHOWERS",
  85: "SNOW SHOWERS",
  86: "HEAVY SNOW SHOWERS",
  95: "THUNDERSTORM",
  96: "THUNDER AND HAIL",
  99: "HARD STORM"
};

module.exports = {
  cities,
  stockSymbols,
  weatherCodes
};
