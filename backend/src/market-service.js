const { URL } = require("node:url");
const MemoryCache = require("./cache");
const { stockSymbols } = require("./data");
const { env } = require("./env");
const HttpError = require("./http-error");
const { fetchJson } = require("./http-client");
const logger = require("./logger");

const bannerCache = new MemoryCache();

function getAlpacaHeaders() {
  if (!env.hasAlpacaCredentials) {
    throw new HttpError(503, "Market data service is not configured. Set Alpaca credentials on the backend.");
  }

  return {
    "APCA-API-KEY-ID": env.alpacaKeyId,
    "APCA-API-SECRET-KEY": env.alpacaSecretKey
  };
}

async function fetchStockSnapshots(symbols) {
  return fetchStockWithFeedFallback({
    endpoint: "https://data.alpaca.markets/v2/stocks/snapshots",
    label: "Alpaca stock snapshots",
    applySpecificParams(url) {
      url.searchParams.set("symbols", symbols.join(","));
    }
  });
}

function isRetryableAlpacaFeedError(error) {
  return (
    error &&
    error.name === "HttpError" &&
    typeof error.message === "string" &&
    /status (400|403|422)\b/.test(error.message)
  );
}

async function fetchStockWithFeedFallback({ endpoint, label, applySpecificParams }) {
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

function getStockSnapshot(payload, symbol) {
  return payload?.snapshots?.[symbol] || payload?.[symbol] || null;
}

function mapBannerStocks(stockSnapshotPayload) {
  return stockSymbols.map(({ symbol, label }) => {
    const snapshot = getStockSnapshot(stockSnapshotPayload, symbol);
    const price =
      snapshot?.latestTrade?.p || snapshot?.minuteBar?.c || snapshot?.dailyBar?.c || snapshot?.prevDailyBar?.c || 0;
    const previousClose = snapshot?.prevDailyBar?.c || snapshot?.dailyBar?.o || price;

    return {
      symbol,
      label,
      price,
      pct: previousClose ? ((price - previousClose) / previousClose) * 100 : 0
    };
  });
}

async function getBannerData() {
  const cached = bannerCache.get("market-banner");

  if (cached) {
    return cached;
  }

  try {
    const symbols = stockSymbols.map((item) => item.symbol);

    const stockSnapshots = await fetchStockSnapshots(symbols);

    return bannerCache.set(
      "market-banner",
      {
        asOf: new Date().toISOString(),
        feedLabel: "DELAYED SIP EQUITIES",
        quotes: mapBannerStocks(stockSnapshots),
        sectors: []
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
