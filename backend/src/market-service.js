const { URL } = require("node:url");
const MemoryCache = require("./cache");
const { sectorSymbols, stockSymbols, watchlistSymbols } = require("./data");
const { env } = require("./env");
const HttpError = require("./http-error");
const { fetchJson } = require("./http-client");
const logger = require("./logger");
const { getSessionState } = require("./session");

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

async function fetchLatestQuotes(symbols, options = {}) {
  return fetchStockWithFeedFallback({
    endpoint: "https://data.alpaca.markets/v2/stocks/quotes/latest",
    label: "Alpaca latest stock quotes",
    feedAttempts: options.feedAttempts,
    applySpecificParams(url) {
      url.searchParams.set("symbols", symbols.join(","));
    }
  });
}

async function fetchLatestBars(symbols, options = {}) {
  return fetchStockWithFeedFallback({
    endpoint: "https://data.alpaca.markets/v2/stocks/bars/latest",
    label: "Alpaca latest stock bars",
    feedAttempts: options.feedAttempts,
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

function getLatestQuote(payload, symbol) {
  return payload?.quotes?.[symbol] || payload?.[symbol] || null;
}

function getLatestBar(payload, symbol) {
  return payload?.bars?.[symbol] || payload?.[symbol] || null;
}

function getQuoteMidpoint(snapshot) {
  const bid = Number(snapshot?.latestQuote?.bp);
  const ask = Number(snapshot?.latestQuote?.ap);

  if (Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask > 0) {
    return (bid + ask) / 2;
  }

  return 0;
}

function getTimestampValue(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getSnapshotPrice(snapshot) {
  const candidates = [
    {
      source: "trade",
      price: Number(snapshot?.latestTrade?.p) || 0,
      timestamp: getTimestampValue(snapshot?.latestTrade?.t)
    },
    {
      source: "quote",
      price: getQuoteMidpoint(snapshot),
      timestamp: getTimestampValue(snapshot?.latestQuote?.t)
    },
    {
      source: "minuteBar",
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

function getWatchlistPrice({ snapshot, quote, bar }) {
  const quoteMid = getQuoteMidpoint({ latestQuote: quote });
  const candidates = [
    {
      source: "quote",
      price: quoteMid,
      timestamp: getTimestampValue(quote?.t)
    },
    {
      source: "bar",
      price: Number(bar?.c) || 0,
      timestamp: getTimestampValue(bar?.t)
    },
    {
      source: "trade",
      price: Number(snapshot?.latestTrade?.p) || 0,
      timestamp: getTimestampValue(snapshot?.latestTrade?.t)
    }
  ].filter((candidate) => candidate.price > 0 && candidate.timestamp > 0);

  if (candidates.length > 0) {
    candidates.sort((left, right) => right.timestamp - left.timestamp);
    return candidates[0];
  }

  const fallbackPrice = Number(snapshot?.dailyBar?.c) || Number(snapshot?.prevDailyBar?.c) || 0;

  return {
    source: fallbackPrice ? "snapshot" : "none",
    price: fallbackPrice,
    timestamp: getTimestampValue(snapshot?.dailyBar?.t || snapshot?.prevDailyBar?.t)
  };
}

function getSnapshotTimestamp(snapshot) {
  return (
    snapshot?.latestTrade?.t ||
    snapshot?.latestQuote?.t ||
    snapshot?.minuteBar?.t ||
    snapshot?.dailyBar?.t ||
    snapshot?.prevDailyBar?.t ||
    null
  );
}

function mapBannerStocks(stockSnapshotPayload) {
  return stockSymbols.map(({ symbol, label }) => {
    const snapshot = getStockSnapshot(stockSnapshotPayload, symbol);
    const price = getSnapshotPrice(snapshot);
    const previousClose = snapshot?.prevDailyBar?.c || snapshot?.dailyBar?.o || price;

    return {
      symbol,
      label,
      price,
      pct: previousClose ? ((price - previousClose) / previousClose) * 100 : 0
    };
  });
}

function mapBannerSectors(stockSnapshotPayload) {
  return sectorSymbols
    .map(({ symbol, label }) => {
      const snapshot = getStockSnapshot(stockSnapshotPayload, symbol);
      const price = getSnapshotPrice(snapshot);
      const previousClose = snapshot?.prevDailyBar?.c || snapshot?.dailyBar?.o || price;

      return {
        symbol,
        label,
        price,
        pct: previousClose ? ((price - previousClose) / previousClose) * 100 : 0
      };
    })
    .sort((left, right) => right.pct - left.pct);
}

function mapWatchlistLiveQuotes({ stockSnapshotPayload, latestQuotesPayload, latestBarsPayload }) {
  return watchlistSymbols.map(({ symbol, label }) => {
    const snapshot = getStockSnapshot(stockSnapshotPayload, symbol);
    const quote = getLatestQuote(latestQuotesPayload, symbol);
    const bar = getLatestBar(latestBarsPayload, symbol);
    const live = getWatchlistPrice({ snapshot, quote, bar });
    const previousClose = Number(snapshot?.prevDailyBar?.c) || Number(snapshot?.dailyBar?.o) || live.price || 0;
    const change = live.price && previousClose ? live.price - previousClose : 0;
    const pct = previousClose ? (change / previousClose) * 100 : 0;

    return {
      symbol,
      label,
      price: live.price,
      change,
      pct,
      asOf: live.timestamp ? new Date(live.timestamp).toISOString() : getSnapshotTimestamp(snapshot),
      available: Boolean(live.price),
      source: live.source
    };
  });
}

function getListedWatchlistFeedAttempts(referenceDate = new Date()) {
  const session = getSessionState(referenceDate);

  if (session.phase === "OVERNIGHT") {
    return ["boats", "overnight", "sip", "iex", "delayed_sip", ""];
  }

  return ["sip", "iex", "delayed_sip", ""];
}

async function fetchWatchlistSnapshots() {
  const payloads = {
    snapshots: { snapshots: {} },
    quotes: { quotes: {} },
    bars: { bars: {} }
  };
  const listedSymbols = watchlistSymbols.filter((item) => item.feed !== "otc");
  const otcSymbols = watchlistSymbols.filter((item) => item.feed === "otc");

  async function fetchSymbolGroup(symbolConfigs, feedAttempts, groupLabel) {
    if (symbolConfigs.length === 0) {
      return;
    }

    const symbols = symbolConfigs.map((item) => item.symbol);
    const [snapshotsResult, quotesResult, barsResult] = await Promise.allSettled([
      fetchStockSnapshots(symbols, { feedAttempts }),
      fetchLatestQuotes(symbols, { feedAttempts }),
      fetchLatestBars(symbols, { feedAttempts })
    ]);

    if (snapshotsResult.status === "fulfilled") {
      symbols.forEach((symbol) => {
        const snapshot = getStockSnapshot(snapshotsResult.value, symbol);

        if (snapshot) {
          payloads.snapshots.snapshots[symbol] = snapshot;
        }
      });
    }

    if (quotesResult.status === "fulfilled") {
      symbols.forEach((symbol) => {
        const quote = getLatestQuote(quotesResult.value, symbol);

        if (quote) {
          payloads.quotes.quotes[symbol] = quote;
        }
      });
    }

    if (barsResult.status === "fulfilled") {
      symbols.forEach((symbol) => {
        const bar = getLatestBar(barsResult.value, symbol);

        if (bar) {
          payloads.bars.bars[symbol] = bar;
        }
      });
    }

    if (
      snapshotsResult.status === "fulfilled" ||
      quotesResult.status === "fulfilled" ||
      barsResult.status === "fulfilled"
    ) {
      return;
    }

    logger.warn(`Batch ${groupLabel} watchlist market request failed; retrying symbols individually`, {
      snapshotsError: snapshotsResult.reason?.message || "Unknown snapshot failure",
      quotesError: quotesResult.reason?.message || "Unknown quote failure",
      barsError: barsResult.reason?.message || "Unknown bar failure"
    });

    const settledResults = await Promise.allSettled(
      symbolConfigs.map(async ({ symbol }) => ({
        symbol,
        snapshotPayload: await fetchStockSnapshots([symbol], { feedAttempts }).catch(() => null),
        quotePayload: await fetchLatestQuotes([symbol], { feedAttempts }).catch(() => null),
        barPayload: await fetchLatestBars([symbol], { feedAttempts }).catch(() => null)
      }))
    );

    settledResults.forEach((result) => {
      if (result.status !== "fulfilled") {
        logger.warn("Watchlist quote request failed for symbol", {
          message: result.reason?.message || "Unknown symbol quote failure"
        });
        return;
      }

      const { symbol, snapshotPayload, quotePayload, barPayload } = result.value;
      const snapshot = getStockSnapshot(snapshotPayload, symbol);
      const quote = getLatestQuote(quotePayload, symbol);
      const bar = getLatestBar(barPayload, symbol);

      if (snapshot) {
        payloads.snapshots.snapshots[symbol] = snapshot;
      }

      if (quote) {
        payloads.quotes.quotes[symbol] = quote;
      }

      if (bar) {
        payloads.bars.bars[symbol] = bar;
      }
    });
  }

  await fetchSymbolGroup(listedSymbols, getListedWatchlistFeedAttempts(), "listed");
  await fetchSymbolGroup(otcSymbols, ["otc", "delayed_sip", ""], "otc");

  const hasSnapshots = Object.keys(payloads.snapshots.snapshots).length > 0;
  const hasQuotes = Object.keys(payloads.quotes.quotes).length > 0;
  const hasBars = Object.keys(payloads.bars.bars).length > 0;

  if (!hasSnapshots && !hasQuotes && !hasBars) {
    throw new HttpError(502, "Unable to retrieve watchlist quotes right now.");
  }

  return payloads;
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
    const marketPayloads = await fetchWatchlistSnapshots();
    const session = getSessionState();
    const feedLabel =
      session.phase === "OVERNIGHT"
        ? "LIVE OVERNIGHT QUOTES"
        : session.phase === "PREMARKET"
          ? "LIVE PREMARKET QUOTES"
          : session.phase === "AFTER HOURS"
            ? "LIVE AFTER HOURS QUOTES"
            : "LIVE MARKET QUOTES";

    return watchlistCache.set(
      "watchlist-quotes",
      {
        asOf: new Date().toISOString(),
        feedLabel,
        extendedHours: true,
        quotes: mapWatchlistLiveQuotes({
          stockSnapshotPayload: marketPayloads.snapshots,
          latestQuotesPayload: marketPayloads.quotes,
          latestBarsPayload: marketPayloads.bars
        })
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
