const HttpError = require("./http-error");
const { fetchText } = require("./http-client");

const DEFAULT_CHANNEL_USER = "DaytradeWarrior";

function extractTagValue(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? match[1].trim() : "";
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractAlternateLink(block) {
  const match = block.match(/<link\s+rel="alternate"\s+href="([^"]+)"/i);
  return match ? match[1].trim() : "";
}

function parseFeedEntries(xml) {
  const entryBlocks = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map((match) => match[1]);

  return entryBlocks.map((entry) => {
    const link = extractAlternateLink(entry);

    return {
      videoId: extractTagValue(entry, "yt:videoId"),
      title: decodeXmlEntities(extractTagValue(entry, "title")),
      publishedAt: extractTagValue(entry, "published"),
      link,
      isShort: link.includes("/shorts/")
    };
  });
}

async function getLatestYoutubeVideo({ user = DEFAULT_CHANNEL_USER, excludeShorts = true } = {}) {
  const channelUser = String(user || DEFAULT_CHANNEL_USER).trim() || DEFAULT_CHANNEL_USER;
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?user=${encodeURIComponent(channelUser)}`;
  const xml = await fetchText(feedUrl, {
    label: "YouTube feed request"
  });

  const entries = parseFeedEntries(xml);
  const selectedEntry = entries.find((entry) => {
    if (!entry.videoId) {
      return false;
    }

    if (excludeShorts && entry.isShort) {
      return false;
    }

    return true;
  });

  if (!selectedEntry) {
    throw new HttpError(502, "No compatible YouTube videos were found in the channel feed.");
  }

  return {
    channelUser,
    videoId: selectedEntry.videoId,
    title: selectedEntry.title || "Latest video",
    publishedAt: selectedEntry.publishedAt || "",
    url: `https://www.youtube.com/watch?v=${selectedEntry.videoId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${selectedEntry.videoId}?rel=0&modestbranding=1`
  };
}

module.exports = {
  getLatestYoutubeVideo
};
