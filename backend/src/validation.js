const { cities } = require("./data");
const HttpError = require("./http-error");

function parseDashboardQuery(query) {
  const city = String(query.city || "langen").trim().toLowerCase();

  if (!cities[city]) {
    throw new HttpError(400, `city must be one of: ${Object.keys(cities).join(", ")}.`);
  }

  return {
    city
  };
}

module.exports = {
  parseDashboardQuery
};
