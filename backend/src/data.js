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
  { symbol: "DOW", label: "DOW" },
  { symbol: "IJR", label: "SMALL CAP" },
  { symbol: "GLD", label: "GOLD" },
  { symbol: "SLV", label: "SILVER" },
  { symbol: "TLT", label: "LONG BONDS" },
  { symbol: "HYG", label: "HIGH YIELD" },
  { symbol: "VXX", label: "VOLATILITY" },
  { symbol: "NVDA", label: "NVDA" },
  { symbol: "AMZN", label: "AMZN" },
  { symbol: "GOOGL", label: "GOOGL" }
];

const sectorSymbols = [
  { symbol: "XLK", label: "TECHNOLOGY" },
  { symbol: "XLF", label: "FINANCIALS" },
  { symbol: "XLE", label: "ENERGY" },
  { symbol: "XLV", label: "HEALTH CARE" },
  { symbol: "XLI", label: "INDUSTRIALS" },
  { symbol: "XLY", label: "CONSUMER DISC." },
  { symbol: "XLP", label: "CONSUMER STAPLES" },
  { symbol: "XLU", label: "UTILITIES" },
  { symbol: "XLB", label: "MATERIALS" },
  { symbol: "XLRE", label: "REAL ESTATE" }
];

const watchlistSymbols = [
  { symbol: "NVDA", label: "NVDA" },
  { symbol: "ASTS", label: "ASTS" },
  { symbol: "RKLB", label: "RKLB" },
  { symbol: "ONDS", label: "ONDS" },
  { symbol: "KRKNF", label: "KRKNF" },
  { symbol: "UUUU", label: "UUUU" },
  { symbol: "POET", label: "POET" },
  { symbol: "NBIS", label: "NBIS" },
  { symbol: "NVX", label: "NVX" },
  { symbol: "OPTT", label: "OPTT" },
  { symbol: "KEEL", label: "KEEL" }
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
  sectorSymbols,
  stockSymbols,
  watchlistSymbols,
  weatherCodes
};
