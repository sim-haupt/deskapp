const { env } = require("./env");
const HttpError = require("./http-error");

async function fetchJson(url, { headers = {}, label = "External request" } = {}) {
  let response;

  try {
    response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(env.externalTimeoutMs)
    });
  } catch {
    throw new HttpError(502, `${label} timed out or could not be reached.`);
  }

  if (!response.ok) {
    throw new HttpError(502, `${label} failed with status ${response.status}.`);
  }

  return response.json();
}

async function fetchText(url, { headers = {}, label = "External request" } = {}) {
  let response;

  try {
    response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(env.externalTimeoutMs)
    });
  } catch {
    throw new HttpError(502, `${label} timed out or could not be reached.`);
  }

  if (!response.ok) {
    throw new HttpError(502, `${label} failed with status ${response.status}.`);
  }

  return response.text();
}

module.exports = {
  fetchJson,
  fetchText
};
