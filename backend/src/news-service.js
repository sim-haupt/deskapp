const HttpError = require("./http-error");
const { env } = require("./env");
const { fetchText } = require("./http-client");

const DEFAULT_NEWS_RSS_URL =
  "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en";
const DEFAULT_NEWS_LIMIT = 8;

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .trim();
}

function getTagValue(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeXmlEntities(match[1]) : "";
}

function parseNewsItems(xmlText) {
  const itemBlocks = xmlText.match(/<item>[\s\S]*?<\/item>/gi) || [];

  return itemBlocks
    .map((block) => {
      const title = getTagValue(block, "title");
      const link = getTagValue(block, "link");
      const source = getTagValue(block, "source");
      const publishedAt = getTagValue(block, "pubDate");
      const parsedPublishedAt = publishedAt ? new Date(publishedAt) : null;

      if (!title || !link) {
        return null;
      }

      return {
        title,
        link,
        source: source || "News",
        publishedAt:
          parsedPublishedAt && !Number.isNaN(parsedPublishedAt.getTime())
            ? parsedPublishedAt.toISOString()
            : ""
      };
    })
    .filter(Boolean);
}

async function getWorldNews({ limit = DEFAULT_NEWS_LIMIT } = {}) {
  let newsUrl;

  try {
    newsUrl = new URL(env.newsRssUrl || DEFAULT_NEWS_RSS_URL);
  } catch {
    throw new HttpError(500, "News RSS URL is invalid.");
  }

  if (!["https:", "http:"].includes(newsUrl.protocol)) {
    throw new HttpError(500, "News RSS URL must be an HTTP URL.");
  }

  const xmlText = await fetchText(newsUrl, {
    label: "News feed request"
  });

  return {
    items: parseNewsItems(xmlText).slice(0, limit)
  };
}

module.exports = {
  getWorldNews
};
