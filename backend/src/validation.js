const { cities } = require("./data");
const HttpError = require("./http-error");

function parseNumber(value, fallback, { min, max, field }) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new HttpError(400, `${field} must be a valid number.`);
  }

  if (typeof min === "number" && parsed < min) {
    throw new HttpError(400, `${field} must be at least ${min}.`);
  }

  if (typeof max === "number" && parsed > max) {
    throw new HttpError(400, `${field} must be at most ${max}.`);
  }

  return parsed;
}

function parseDashboardQuery(query) {
  const city = String(query.city || "langen").trim().toLowerCase();

  if (!cities[city]) {
    throw new HttpError(400, `city must be one of: ${Object.keys(cities).join(", ")}.`);
  }

  const filters = {
    priceMin: parseNumber(query.priceMin, 2, { min: 0.5, max: 1000, field: "priceMin" }),
    priceMax: parseNumber(query.priceMax, 20, { min: 1, max: 2000, field: "priceMax" }),
    maxVolume: parseNumber(query.maxVolume, 50000000, {
      min: 100000,
      max: 500000000,
      field: "maxVolume"
    }),
    limit: parseNumber(query.limit, 8, { min: 1, max: 25, field: "limit" })
  };

  if (filters.priceMin >= filters.priceMax) {
    throw new HttpError(400, "priceMin must be smaller than priceMax.");
  }

  return {
    city,
    filters
  };
}

module.exports = {
  parseDashboardQuery
};
