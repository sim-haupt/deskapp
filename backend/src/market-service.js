const { URL } = require("node:url");
const MemoryCache = require("./cache");
const { cryptoSymbols, sectorSymbols, stockSymbols } = require("./data");
const { env } = require("./env");
const HttpError = require("./http-error");
const { fetchJson } = require("./http-client");
const logger = require("./logger");

const bannerCache = new MemoryCache();

function isoTimestamp(date) {
  return date.toISOString();
}

function getAlpacaHeaders() {
  if (!env.hasAlpacaCredentials) {
    throw new HttpError(503, "Market data service is not configured. Set Alpaca credentials on the backend.");
  }

  return {
    "APCA-API-KEY-ID": env.alpacaKeyId,
    "APCA-API-SECRET-KEY": env.alpacaSecretKey
  };
}

async function fetchStockLatestBars(symbols) {
  return fetchStockBarsWithFeedFallback({
    endpoint: "https://data.alpaca.markets/v2/stocks/bars/latest",
    label: "Alpaca latest stock bars",
    applySpecificParams(url) {
      url.searchParams.set("symbols", symbols.join(","));
    }
  });
}

async function fetchStockDailyBars(symbols, start, end) {
  return fetchStockBarsWithFeedFallback({
    endpoint: "https://data.alpaca.markets/v2/stocks/bars",
    label: "Alpaca daily stock bars",
    applySpecificParams(url) {
      url.searchParams.set("symbols", symbols.join(","));
      url.searchParams.set("timeframe", "1Day");
      url.searchParams.set("start", isoTimestamp(start));
      url.searchParams.set("end", isoTimestamp(end));
      url.searchParams.set("limit", "10000");
    }
  });
}

function isRetryableAlpacaFeedError(error) {
  return (
    error &&
    error.name === "HttpError" &&
    typeof error.message === "string" &&
    error.message.includes("failed with status 400")
  );
}

async function fetchStockBarsWithFeedFallback({ endpoint, label, applySpecificParams }) {
  const feedAttempts = ["delayed_sip", "iex", ""];
  let lastError;

  for (const feed of feedAttempts) {
    const url = new URL(endpoint);
    applySpecificParams(url);

    if (feed) {
      url.searchParams.set("feed", feed);
    }

    try {
      const payload = await fetchJson(url, {
        headers: getAlpacaHeaders(),
        label
      });

      return payload;
    } catch (error) {
      lastError = error;

      if (!isRetryableAlpacaFeedError(error) || !feed) {
        throw error;
      }

      logger.warn("Retrying Alpaca stock request with fallback feed", {
        label,
        failedFeed: feed
      });
    }
  }

  throw lastError;
}

async function fetchCryptoSnapshots(symbols) {
  const url = new URL("https://data.alpaca.markets/v1beta3/crypto/us/snapshots");
  url.searchParams.set("symbols", symbols.join(","));

  return fetchJson(url, {
    headers: getAlpacaHeaders(),
    label: "Alpaca crypto snapshots"
  });
}

function mapBannerStocks(latestPayload, dailyPayload) {
  return stockSymbols.map(({ symbol, label }) => {
    const latestBar = latestPayload?.bars?.[symbol] || null;
    const dailyBars = dailyPayload?.bars?.[symbol] || [];
    const previousDailyBar = dailyBars.at(-1) || null;
    const price = latestBar?.c || previousDailyBar?.c || 0;
    const previousClose = previousDailyBar?.c || price;

    return {
      symbol,
      label,
      price,
      pct: previousClose ? ((price - previousClose) / previousClose) * 100 : 0
    };
  });
}

function mapBannerSectors(latestPayload, dailyPayload) {
  return sectorSymbols
    .map(({ symbol, label }) => {
      const latestBar = latestPayload?.bars?.[symbol] || null;
      const dailyBars = dailyPayload?.bars?.[symbol] || [];
      const previousDailyBar = dailyBars.at(-1) || null;
      const price = latestBar?.c || previousDailyBar?.c || 0;
      const previousClose = previousDailyBar?.c || price;

      return {
        symbol,
        label,
        price,
        pct: previousClose ? ((price - previousClose) / previousClose) * 100 : 0
      };
    })
    .sort((left, right) => right.pct - left.pct)
    .slice(0, 3);
}

function mapBannerCrypto(payload) {
  return cryptoSymbols.map(({ symbol, label }) => {
    const snapshot = payload?.snapshots?.[symbol] || payload?.[symbol] || null;
    const price = snapshot?.latestTrade?.p || snapshot?.dailyBar?.c || 0;
    const previousClose = snapshot?.prevDailyBar?.c || snapshot?.dailyBar?.o || price;

    return {
      symbol,
      label,
      price,
      pct: previousClose ? ((price - previousClose) / previousClose) * 100 : 0
    };
  });
}

function getDelayedMarketWindow(daysBack) {
  const delayedNow = new Date(Date.now() - 20 * 60 * 1000);
  const dailyEnd = new Date(delayedNow.getTime() - 24 * 60 * 60 * 1000);
  const dailyStart = new Date(dailyEnd.getTime() - daysBack * 24 * 60 * 60 * 1000);

  return {
    delayedNow,
    dailyStart,
    dailyEnd
  };
}

async function getBannerData() {
  const cached = bannerCache.get("market-banner");

  if (cached) {
    return cached;
  }

  try {
    const { delayedNow, dailyStart, dailyEnd } = getDelayedMarketWindow(10);
    const symbols = [...stockSymbols, ...sectorSymbols].map((item) => item.symbol);

    const [latestStocks, dailyStocks, cryptoPayload] = await Promise.all([
      fetchStockLatestBars(symbols),
      fetchStockDailyBars(symbols, dailyStart, dailyEnd),
      fetchCryptoSnapshots(cryptoSymbols.map((item) => item.symbol))
    ]);

    return bannerCache.set(
      "market-banner",
      {
        asOf: delayedNow.toISOString(),
        feedLabel: "DELAYED SIP EQUITIES / ALPACA CRYPTO",
        quotes: [...mapBannerStocks(latestStocks, dailyStocks), ...mapBannerCrypto(cryptoPayload)],
        sectors: mapBannerSectors(latestStocks, dailyStocks)
      },
      60 * 1000
    );
  } catch (error) {
    logger.warn("Unable to refresh market banner", {
      message: error.message
    });

    if (error.statusCode) {
      throw error;
    }

    throw new HttpError(502, "Unable to retrieve market banner data right now.");
  }
}

module.exports = {
  getBannerData
};
