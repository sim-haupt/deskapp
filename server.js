const http = require("node:http");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");

  if (!fsSync.existsSync(envPath)) {
    return {};
  }

  const content = fsSync.readFileSync(envPath, "utf8");
  const pairs = {};

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    pairs[key] = rawValue.replace(/^['"]|['"]$/g, "");
  });

  return pairs;
}

const localEnv = loadDotEnv();
const ALPACA_KEY_ID = process.env.ALPACA_KEY_ID || localEnv.ALPACA_KEY_ID || "";
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY || localEnv.ALPACA_SECRET_KEY || "";

const STOCK_SYMBOLS = [
  { symbol: "SPY", label: "SPY" },
  { symbol: "QQQ", label: "NASDAQ" },
  { symbol: "IWM", label: "RUSSELL" },
  { symbol: "DIA", label: "DOW" },
  { symbol: "GLD", label: "GOLD" },
  { symbol: "TLT", label: "BONDS" }
];

const CRYPTO_SYMBOLS = [{ symbol: "BTC/USD", label: "BTC" }];
const SECTOR_SYMBOLS = [
  { symbol: "XLK", label: "Technology" },
  { symbol: "XLF", label: "Financials" },
  { symbol: "XLE", label: "Energy" },
  { symbol: "XLV", label: "Health Care" },
  { symbol: "XLI", label: "Industrials" },
  { symbol: "XLY", label: "Consumer Discretionary" },
  { symbol: "XLP", label: "Consumer Staples" },
  { symbol: "XLU", label: "Utilities" }
];

const ALLOWED_EXCHANGES = new Set(["NYSE", "NASDAQ", "AMEX", "ARCA", "BATS", "NYSEARCA"]);
const STATIC_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const cache = {
  banner: {
    expiresAt: 0,
    data: null
  },
  universe: new Map()
};

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  response.end(JSON.stringify(payload));
}

function sendError(response, statusCode, message) {
  json(response, statusCode, { error: message });
}

function isoTimestamp(date) {
  return date.toISOString();
}

function chunk(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function fetchJson(url, baseHeaders = {}) {
  const response = await fetch(url, {
    headers: {
      ...baseHeaders
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status} ${errorText}`);
  }

  return response.json();
}

function alpacaDataHeaders() {
  if (!ALPACA_KEY_ID || !ALPACA_SECRET_KEY) {
    throw new Error("Missing Alpaca credentials. Set ALPACA_KEY_ID and ALPACA_SECRET_KEY in env or .env");
  }

  return {
    "APCA-API-KEY-ID": ALPACA_KEY_ID,
    "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY
  };
}

async function fetchStockLatestBars(symbols) {
  const url = new URL("https://data.alpaca.markets/v2/stocks/bars/latest");
  url.searchParams.set("symbols", symbols.join(","));
  url.searchParams.set("feed", "delayed_sip");
  return fetchJson(url, alpacaDataHeaders());
}

async function fetchStockDailyBars(symbols, start, end) {
  const url = new URL("https://data.alpaca.markets/v2/stocks/bars");
  url.searchParams.set("symbols", symbols.join(","));
  url.searchParams.set("timeframe", "1Day");
  url.searchParams.set("start", isoTimestamp(start));
  url.searchParams.set("end", isoTimestamp(end));
  url.searchParams.set("feed", "delayed_sip");
  url.searchParams.set("limit", "10000");
  return fetchJson(url, alpacaDataHeaders());
}

async function fetchCryptoSnapshots(symbols) {
  const url = new URL("https://data.alpaca.markets/v1beta3/crypto/us/snapshots");
  url.searchParams.set("symbols", symbols.join(","));
  return fetchJson(url, alpacaDataHeaders());
}

async function fetchActiveAssets() {
  const url = new URL("https://paper-api.alpaca.markets/v2/assets");
  url.searchParams.set("status", "active");
  url.searchParams.set("asset_class", "us_equity");
  const assets = await fetchJson(url, alpacaDataHeaders());

  return assets.filter((asset) => {
    return (
      asset.tradable &&
      ALLOWED_EXCHANGES.has(asset.exchange) &&
      /^[A-Z.-]+$/.test(asset.symbol)
    );
  });
}

function mapBannerStocks(latestPayload, dailyPayload) {
  return STOCK_SYMBOLS.map(({ symbol, label }) => {
    const latestBar = latestPayload?.bars?.[symbol] ?? null;
    const dailyBars = dailyPayload?.bars?.[symbol] ?? [];
    const previousDailyBar = dailyBars.at(-1) ?? null;
    const price = latestBar?.c ?? previousDailyBar?.c ?? 0;
    const prevClose = previousDailyBar?.c ?? price;
    const pct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

    return {
      symbol,
      label,
      price,
      pct
    };
  });
}

function mapBannerSectors(latestPayload, dailyPayload) {
  return SECTOR_SYMBOLS.map(({ symbol, label }) => {
    const latestBar = latestPayload?.bars?.[symbol] ?? null;
    const dailyBars = dailyPayload?.bars?.[symbol] ?? [];
    const previousDailyBar = dailyBars.at(-1) ?? null;
    const price = latestBar?.c ?? previousDailyBar?.c ?? 0;
    const prevClose = previousDailyBar?.c ?? price;
    const pct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

    return {
      symbol,
      label,
      price,
      pct
    };
  })
    .sort((left, right) => right.pct - left.pct)
    .slice(0, 3);
}

function mapBannerCrypto(payload) {
  return CRYPTO_SYMBOLS.map(({ symbol, label }) => {
    const snapshot = payload?.snapshots?.[symbol] ?? payload?.[symbol] ?? null;
    const price = snapshot?.latestTrade?.p ?? snapshot?.dailyBar?.c ?? 0;
    const prevClose = snapshot?.prevDailyBar?.c ?? snapshot?.dailyBar?.o ?? price;
    const pct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

    return {
      symbol,
      label,
      price,
      pct
    };
  });
}

async function getBannerData() {
  if (cache.banner.data && cache.banner.expiresAt > Date.now()) {
    return cache.banner.data;
  }

  const delayedNow = new Date(Date.now() - 20 * 60 * 1000);
  const dailyEnd = new Date(delayedNow.getTime() - 24 * 60 * 60 * 1000);
  const dailyStart = new Date(dailyEnd.getTime() - 10 * 24 * 60 * 60 * 1000);

  const stockAndSectorSymbols = [...STOCK_SYMBOLS, ...SECTOR_SYMBOLS].map((item) => item.symbol);

  const [latestStocks, dailyStocks, cryptoPayload] = await Promise.all([
    fetchStockLatestBars(stockAndSectorSymbols),
    fetchStockDailyBars(stockAndSectorSymbols, dailyStart, dailyEnd),
    fetchCryptoSnapshots(CRYPTO_SYMBOLS.map((item) => item.symbol))
  ]);

  const data = {
    quotes: [...mapBannerStocks(latestStocks, dailyStocks), ...mapBannerCrypto(cryptoPayload)],
    sectors: mapBannerSectors(latestStocks, dailyStocks),
    feedLabel: "DELAYED SIP EQUITIES / ALPACA CRYPTO",
    status: "BACKEND LIVE / ALPACA DELAYED SIP"
  };

  cache.banner = {
    data,
    expiresAt: Date.now() + 60 * 1000
  };

  return data;
}

async function getScreenedUniverse(filters) {
  const key = JSON.stringify(filters);
  const existing = cache.universe.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return existing.data;
  }

  const assets = await fetchActiveAssets();
  const delayedNow = new Date(Date.now() - 20 * 60 * 1000);
  const dailyEnd = new Date(delayedNow.getTime() - 24 * 60 * 60 * 1000);
  const dailyStart = new Date(dailyEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  const filteredByDaily = [];
  const assetChunks = chunk(assets.map((asset) => asset.symbol), 200);

  for (const symbolChunk of assetChunks) {
    const barsPayload = await fetchStockDailyBars(symbolChunk, dailyStart, dailyEnd);

    symbolChunk.forEach((symbol) => {
      const bars = barsPayload?.bars?.[symbol] ?? [];
      const latestDailyBar = bars.at(-1);
      if (!latestDailyBar) {
        return;
      }

      if (
        latestDailyBar.c >= filters.priceMin &&
        latestDailyBar.c <= filters.priceMax &&
        latestDailyBar.v <= filters.maxVolume
      ) {
        filteredByDaily.push({
          symbol,
          close: latestDailyBar.c,
          volume: latestDailyBar.v
        });
      }
    });
  }

  const latestPriceMap = {};
  for (const symbolChunk of chunk(filteredByDaily.map((item) => item.symbol), 200)) {
    const latestPayload = await fetchStockLatestBars(symbolChunk);
    symbolChunk.forEach((symbol) => {
      latestPriceMap[symbol] = latestPayload?.bars?.[symbol]?.c ?? null;
    });
  }

  const universe = filteredByDaily
    .map((item) => {
      return {
        symbol: item.symbol,
        price: latestPriceMap[item.symbol] ?? item.close,
        previousClose: item.close,
        volume: item.volume
      };
    })
    .filter((item) => item.price >= filters.priceMin && item.price <= filters.priceMax)
    .sort((left, right) => left.volume - right.volume)
    .slice(0, filters.limit);

  const data = {
    asOf: delayedNow.toISOString(),
    filters,
    count: universe.length,
    symbols: universe
  };

  cache.universe.set(key, {
    data,
    expiresAt: Date.now() + 15 * 60 * 1000
  });

  return data;
}

async function serveStatic(requestPath, response) {
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.join(ROOT, relativePath);

  if (!filePath.startsWith(ROOT)) {
    sendError(response, 403, "Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": STATIC_TYPES[extension] || "application/octet-stream",
      "Access-Control-Allow-Origin": "*"
    });
    response.end(content);
  } catch (error) {
    sendError(response, 404, "Not found");
  }
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
      response.end();
      return;
    }

    const requestUrl = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && requestUrl.pathname === "/api/market/banner") {
      const data = await getBannerData();
      json(response, 200, data);
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/universe") {
      const filters = {
        priceMin: Number(requestUrl.searchParams.get("priceMin") || 2),
        priceMax: Number(requestUrl.searchParams.get("priceMax") || 20),
        maxVolume: Number(requestUrl.searchParams.get("maxVolume") || 50000000),
        limit: Number(requestUrl.searchParams.get("limit") || 100)
      };

      const data = await getScreenedUniverse(filters);
      json(response, 200, data);
      return;
    }

    await serveStatic(requestUrl.pathname, response);
  } catch (error) {
    sendError(response, 500, error.message);
  }
});

server.listen(PORT, () => {
  console.log(`Deskapp server listening on http://localhost:${PORT}`);
});
