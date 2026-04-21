const { URL } = require("node:url");
const MemoryCache = require("./cache");
const { sectorSymbols, stockSymbols, watchlistSymbols } = require("./data");
const { env } = require("./env");
const HttpError = require("./http-error");
const { fetchJson } = require("./http-client");
const logger = require("./logger");

const bannerCache = new MemoryCache();
const watchlistCache = new MemoryCache();

function getAlpacaHeaders() {
  if (!env.hasAlpacaCredentials) {
    throw new HttpError(503, "Market data service is not configured. Set Alpaca credentials on the backend.");
  }

  return {
    "APCA-API-KEY-ID": env.alpacaKeyId,
    "APCA-API-SECRET-KEY": env.alpacaSecretKey
  };
}

function isRetryableAlpacaFeedError(error) {
  return (
    error &&
    error.name === "HttpError" &&
    typeof error.message === "string" &&
    /status (400|403|422)\b/.test(error.message)
  );
}

async function fetchStockWithFeedFallback({
  endpoint,
  label,
  applySpecificParams,
  feedAttempts = ["delayed_sip", "iex", ""]
}) {
  let lastError;

  for (const feed of feedAttempts) {
    const url = new URL(endpoint);
    applySpecificParams(url);

    if (feed) {
      url.searchParams.set("feed", feed);
    }

    try {
      return await fetchJson(url, {
        headers: getAlpacaHeaders(),
        label
      });
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

async function fetchStockSnapshots(symbols, options = {}) {
  return fetchStockWithFeedFallback({
    endpoint: "https://data.alpaca.markets/v2/stocks/snapshots",
    label: "Alpaca stock snapshots",
    feedAttempts: options.feedAttempts,
    applySpecificParams(url) {
      url.searchParams.set("symbols", symbols.join(","));
    }
  });
}

function getStockSnapshot(payload, symbol) {
  return payload?.snapshots?.[symbol] || payload?.[symbol] || null;
}

function getTimestampValue(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getQuoteMidpoint(snapshot) {
  const bid = Number(snapshot?.latestQuote?.bp);
  const ask = Number(snapshot?.latestQuote?.ap);

  if (Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask > 0) {
    return (bid + ask) / 2;
  }

  return 0;
}

function getSnapshotPrice(snapshot) {
  const candidates = [
    {
      price: Number(snapshot?.latestTrade?.p) || 0,
      timestamp: getTimestampValue(snapshot?.latestTrade?.t)
    },
    {
      price: getQuoteMidpoint(snapshot),
      timestamp: getTimestampValue(snapshot?.latestQuote?.t)
    },
    {
      price: Number(snapshot?.minuteBar?.c) || 0,
      timestamp: getTimestampValue(snapshot?.minuteBar?.t)
    }
  ].filter((candidate) => candidate.price > 0 && candidate.timestamp > 0);

  if (candidates.length > 0) {
    candidates.sort((left, right) => right.timestamp - left.timestamp);
    return candidates[0].price;
  }

  return Number(snapshot?.dailyBar?.c) || Number(snapshot?.prevDailyBar?.c) || 0;
}

function mapSnapshotQuote({ symbol, label }, snapshot) {
  const price = getSnapshotPrice(snapshot);
  const previousClose = Number(snapshot?.prevDailyBar?.c) || Number(snapshot?.dailyBar?.o) || price;

  return {
    symbol,
    label,
    price,
    pct: previousClose ? ((price - previousClose) / previousClose) * 100 : 0,
    asOf:
      snapshot?.latestTrade?.t ||
      snapshot?.latestQuote?.t ||
      snapshot?.minuteBar?.t ||
      snapshot?.dailyBar?.t ||
      snapshot?.prevDailyBar?.t ||
      null,
    available: Boolean(price)
  };
}

function mapBannerStocks(stockSnapshotPayload) {
  return stockSymbols.map((item) => {
    const snapshot = getStockSnapshot(stockSnapshotPayload, item.symbol);
    return mapSnapshotQuote(item, snapshot);
  });
}

function mapBannerSectors(stockSnapshotPayload) {
  return sectorSymbols
    .map((item) => {
      const snapshot = getStockSnapshot(stockSnapshotPayload, item.symbol);
      return mapSnapshotQuote(item, snapshot);
    })
    .sort((left, right) => right.pct - left.pct);
}

async function fetchWatchlistSnapshots() {
  const payload = { snapshots: {} };
  const listedSymbols = watchlistSymbols.filter((item) => item.feed !== "otc");
  const otcSymbols = watchlistSymbols.filter((item) => item.feed === "otc");

  async function fetchGroup(symbolConfigs, feedAttempts, groupLabel) {
    if (symbolConfigs.length === 0) {
      return;
    }

    try {
      const result = await fetchStockSnapshots(
        symbolConfigs.map((item) => item.symbol),
        { feedAttempts }
      );

      symbolConfigs.forEach(({ symbol }) => {
        const snapshot = getStockSnapshot(result, symbol);

        if (snapshot) {
          payload.snapshots[symbol] = snapshot;
        }
      });

      return;
    } catch (error) {
      logger.warn(`Batch ${groupLabel} watchlist request failed; retrying symbols individually`, {
        message: error.message
      });
    }

    const settled = await Promise.allSettled(
      symbolConfigs.map(async ({ symbol }) => ({
        symbol,
        result: await fetchStockSnapshots([symbol], { feedAttempts })
      }))
    );

    settled.forEach((result) => {
      if (result.status !== "fulfilled") {
        logger.warn("Watchlist snapshot request failed for symbol", {
          message: result.reason?.message || "Unknown symbol snapshot failure"
        });
        return;
      }

      const { symbol, result: snapshotPayload } = result.value;
      const snapshot = getStockSnapshot(snapshotPayload, symbol);

      if (snapshot) {
        payload.snapshots[symbol] = snapshot;
      }
    });
  }

  await fetchGroup(listedSymbols, ["delayed_sip", "iex", ""], "listed");
  await fetchGroup(otcSymbols, ["otc", "delayed_sip", ""], "otc");

  if (Object.keys(payload.snapshots).length === 0) {
    throw new HttpError(502, "Unable to retrieve watchlist quotes right now.");
  }

  return payload;
}

function mapWatchlistQuotes(stockSnapshotPayload) {
  return watchlistSymbols.map((item) => {
    const snapshot = getStockSnapshot(stockSnapshotPayload, item.symbol);
    return mapSnapshotQuote(item, snapshot);
  });
}

async function getBannerData() {
  const cached = bannerCache.get("market-banner");

  if (cached) {
    return cached;
  }

  try {
    const symbols = [...stockSymbols, ...sectorSymbols].map((item) => item.symbol);
    const stockSnapshots = await fetchStockSnapshots(symbols);

    return bannerCache.set(
      "market-banner",
      {
        asOf: new Date().toISOString(),
        feedLabel: "DELAYED SIP EQUITIES",
        quotes: mapBannerStocks(stockSnapshots),
        sectors: mapBannerSectors(stockSnapshots)
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

async function getWatchlistQuotes() {
  const cached = watchlistCache.get("watchlist-quotes");

  if (cached) {
    return cached;
  }

  try {
    const stockSnapshots = await fetchWatchlistSnapshots();

    return watchlistCache.set(
      "watchlist-quotes",
      {
        asOf: new Date().toISOString(),
        feedLabel: "DELAYED SIP EQUITIES",
        extendedHours: true,
        quotes: mapWatchlistQuotes(stockSnapshots)
      },
      30 * 1000
    );
  } catch (error) {
    logger.warn("Unable to refresh watchlist quotes", {
      message: error.message
    });

    if (error.statusCode) {
      throw error;
    }

    throw new HttpError(502, "Unable to retrieve watchlist quotes right now.");
  }
}

module.exports = {
  getBannerData,
  getWatchlistQuotes
};
