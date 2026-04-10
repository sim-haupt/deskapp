const { URL } = require("node:url");
const MemoryCache = require("./cache");
const { allowedExchanges, cryptoSymbols, sectorSymbols, stockSymbols } = require("./data");
const { env } = require("./env");
const HttpError = require("./http-error");
const { fetchJson } = require("./http-client");
const logger = require("./logger");

const bannerCache = new MemoryCache();
const universeCache = new MemoryCache();

function chunk(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

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
  const url = new URL("https://data.alpaca.markets/v2/stocks/bars/latest");
  url.searchParams.set("symbols", symbols.join(","));
  url.searchParams.set("feed", "delayed_sip");

  return fetchJson(url, {
    headers: getAlpacaHeaders(),
    label: "Alpaca latest stock bars"
  });
}

async function fetchStockDailyBars(symbols, start, end) {
  const url = new URL("https://data.alpaca.markets/v2/stocks/bars");
  url.searchParams.set("symbols", symbols.join(","));
  url.searchParams.set("timeframe", "1Day");
  url.searchParams.set("start", isoTimestamp(start));
  url.searchParams.set("end", isoTimestamp(end));
  url.searchParams.set("feed", "delayed_sip");
  url.searchParams.set("limit", "10000");

  return fetchJson(url, {
    headers: getAlpacaHeaders(),
    label: "Alpaca daily stock bars"
  });
}

async function fetchCryptoSnapshots(symbols) {
  const url = new URL("https://data.alpaca.markets/v1beta3/crypto/us/snapshots");
  url.searchParams.set("symbols", symbols.join(","));

  return fetchJson(url, {
    headers: getAlpacaHeaders(),
    label: "Alpaca crypto snapshots"
  });
}

async function fetchActiveAssets() {
  const url = new URL("https://paper-api.alpaca.markets/v2/assets");
  url.searchParams.set("status", "active");
  url.searchParams.set("asset_class", "us_equity");

  const assets = await fetchJson(url, {
    headers: getAlpacaHeaders(),
    label: "Alpaca active assets"
  });

  return assets.filter((asset) => {
    return asset.tradable && allowedExchanges.has(asset.exchange) && /^[A-Z.-]+$/.test(asset.symbol);
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

async function getScreenedUniverse(filters) {
  const cacheKey = JSON.stringify(filters);
  const cached = universeCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const assets = await fetchActiveAssets();
    const { delayedNow, dailyStart, dailyEnd } = getDelayedMarketWindow(7);
    const filteredByDaily = [];

    for (const symbols of chunk(
      assets.map((asset) => asset.symbol),
      200
    )) {
      const barsPayload = await fetchStockDailyBars(symbols, dailyStart, dailyEnd);

      symbols.forEach((symbol) => {
        const latestDailyBar = (barsPayload?.bars?.[symbol] || []).at(-1);

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

    const latestPriceBySymbol = {};

    for (const symbols of chunk(
      filteredByDaily.map((item) => item.symbol),
      200
    )) {
      const latestPayload = await fetchStockLatestBars(symbols);

      symbols.forEach((symbol) => {
        latestPriceBySymbol[symbol] = latestPayload?.bars?.[symbol]?.c || null;
      });
    }

    const symbols = filteredByDaily
      .map((item) => {
        return {
          symbol: item.symbol,
          price: latestPriceBySymbol[item.symbol] || item.close,
          previousClose: item.close,
          volume: item.volume
        };
      })
      .filter((item) => item.price >= filters.priceMin && item.price <= filters.priceMax)
      .sort((left, right) => left.volume - right.volume)
      .slice(0, filters.limit);

    return universeCache.set(
      cacheKey,
      {
        asOf: delayedNow.toISOString(),
        filters,
        count: symbols.length,
        symbols
      },
      15 * 60 * 1000
    );
  } catch (error) {
    logger.warn("Unable to refresh screened universe", {
      message: error.message
    });

    if (error.statusCode) {
      throw error;
    }

    throw new HttpError(502, "Unable to retrieve screened universe data right now.");
  }
}

module.exports = {
  getBannerData,
  getScreenedUniverse
};
