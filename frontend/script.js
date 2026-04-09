const currentDate = document.querySelector("#current-date");
const timeCet = document.querySelector("#time-cet");
const timeNy = document.querySelector("#time-ny");

const weatherIcon = document.querySelector("#weather-icon");
const weatherCityLabel = document.querySelector("#weather-city-label");
const weatherStatusInline = document.querySelector("#weather-status-inline");
const weatherTempInline = document.querySelector("#weather-temp-inline");

const headerSessionPhase = document.querySelector("#header-session-phase");
const headerSessionCountdown = document.querySelector("#header-session-countdown");
const tickerPhaseNote = document.querySelector("#ticker-phase-note");

const cityButtons = document.querySelectorAll(".city-button");
const themeButtons = document.querySelectorAll(".theme-button");

const tickerTrackA = document.querySelector("#ticker-track-a");
const tickerTrackB = document.querySelector("#ticker-track-b");
const dataStatus = document.querySelector("#data-status");
const sectorList = document.querySelector("#sector-list");
const universeSummary = document.querySelector("#universe-summary");
const universeList = document.querySelector("#universe-list");
const APP_CONFIG = window.__APP_CONFIG__ ?? {};
const API_BASE = String(APP_CONFIG.apiBaseUrl ?? "http://localhost:3000").replace(/\/$/, "");

const DEMO_QUOTES = [
  { label: "SPY", price: 519.42, pct: -0.6 },
  { label: "NASDAQ", price: 447.13, pct: 0.4 },
  { label: "RUSSELL", price: 203.18, pct: -1.1 },
  { label: "DOW", price: 391.07, pct: -0.2 },
  { label: "GOLD", price: 218.88, pct: 0.8 },
  { label: "BTC", price: 68421, pct: 1.9 }
];

const cities = {
  langen: {
    label: "LANGEN",
    latitude: 49.9939,
    longitude: 8.6628
  },
  heidelberg: {
    label: "HEIDELBERG",
    latitude: 49.3988,
    longitude: 8.6724
  }
};

const weatherCodes = {
  0: "CLEAR SKY",
  1: "MOSTLY CLEAR",
  2: "PARTLY CLOUDY",
  3: "OVERCAST",
  45: "FOGGY",
  48: "FROST FOG",
  51: "LIGHT DRIZZLE",
  53: "DRIZZLE",
  55: "HEAVY DRIZZLE",
  56: "FREEZING DRIZZLE",
  57: "DENSE ICE DRIZZLE",
  61: "LIGHT RAIN",
  63: "RAIN",
  65: "HEAVY RAIN",
  66: "FREEZING RAIN",
  67: "HARD FREEZING RAIN",
  71: "LIGHT SNOW",
  73: "SNOW",
  75: "HEAVY SNOW",
  77: "SNOW GRAINS",
  80: "RAIN SHOWERS",
  81: "SHOWER BURSTS",
  82: "HEAVY SHOWERS",
  85: "SNOW SHOWERS",
  86: "HEAVY SNOW SHOWERS",
  95: "THUNDERSTORM",
  96: "THUNDER AND HAIL",
  99: "HARD STORM"
};

const weatherIconMap = {
  sunny: "./weather-sunny.svg",
  cloudy: "./weather-cloudy.svg",
  rain: "./weather-rain.svg",
  storm: "./weather-storm.svg",
  snow: "./weather-snow.svg",
  fog: "./weather-fog.svg"
};

let activeCity = "langen";
let activeTheme = localStorage.getItem("pixel-desk-theme") ?? "arcade";

function setStatus(message) {
  dataStatus.textContent = message;
}

function getTimeParts(timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    hour: Number(map.hour),
    minute: Number(map.minute)
  };
}

function getMinutesOfDay(timeZone) {
  const parts = getTimeParts(timeZone);
  return parts.hour * 60 + parts.minute;
}

function formatCountdown(totalMinutes) {
  const minutes = Math.max(0, totalMinutes);
  const hoursPart = Math.floor(minutes / 60);
  const minutesPart = minutes % 60;
  return `${String(hoursPart).padStart(2, "0")}:${String(minutesPart).padStart(2, "0")}`;
}

function getSessionState() {
  const nyMinutes = getMinutesOfDay("America/New_York");
  const premarketOpen = 4 * 60;
  const regularOpen = 9 * 60 + 30;
  const powerHourOpen = 15 * 60;
  const regularClose = 16 * 60;
  const nextPremarketOpen = 24 * 60 + premarketOpen;

  if (nyMinutes < premarketOpen) {
    return {
      phase: "OVERNIGHT",
      nextLabel: "TO PREMARKET OPEN",
      nextMinutes: premarketOpen - nyMinutes
    };
  }

  if (nyMinutes < regularOpen) {
    return {
      phase: "PREMARKET",
      nextLabel: "TO MARKET OPEN",
      nextMinutes: regularOpen - nyMinutes
    };
  }

  if (nyMinutes < powerHourOpen) {
    return {
      phase: "REGULAR HOURS",
      nextLabel: "TO POWER HOUR",
      nextMinutes: powerHourOpen - nyMinutes
    };
  }

  if (nyMinutes < regularClose) {
    return {
      phase: "POWER HOUR",
      nextLabel: "TO CLOSE",
      nextMinutes: regularClose - nyMinutes
    };
  }

  return {
    phase: "AFTER HOURS",
    nextLabel: "TO PREMARKET OPEN",
    nextMinutes: nextPremarketOpen - nyMinutes
  };
}

function updateHeaderSessionInfo() {
  const state = getSessionState();
  headerSessionPhase.textContent = state.phase;
  headerSessionCountdown.textContent = `${state.nextLabel} ${formatCountdown(state.nextMinutes)}`;
}

function updateDateAndTime() {
  const now = new Date();

  currentDate.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(now);

  timeCet.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(now);

  timeNy.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(now);
}

function getWeatherIconName(code) {
  if (code === 0 || code === 1) {
    return "sunny";
  }

  if (code === 45 || code === 48) {
    return "fog";
  }

  if ([95, 96, 99].includes(code)) {
    return "storm";
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "snow";
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return "rain";
  }

  return "cloudy";
}

function setWeatherDisplay({ label, description, temperature, iconName }) {
  weatherCityLabel.textContent = label;
  weatherStatusInline.textContent = description;
  weatherTempInline.textContent = `${temperature}°C`;
  weatherIcon.src = weatherIconMap[iconName];
  weatherIcon.alt = `${description} pixel weather icon`;
}

async function updateWeather() {
  const city = cities[activeCity];
  const endpoint =
    `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,weather_code&timezone=Europe%2FBerlin`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Weather request failed with ${response.status}`);
    }

    const data = await response.json();
    setWeatherDisplay({
      label: city.label,
      description: weatherCodes[data.current.weather_code] ?? "LIVE CONDITIONS",
      temperature: Math.round(data.current.temperature_2m),
      iconName: getWeatherIconName(data.current.weather_code)
    });
  } catch (error) {
    setWeatherDisplay({
      label: city.label,
      description: "WEATHER OFFLINE",
      temperature: "--",
      iconName: "cloudy"
    });
    console.error(error);
  }
}

function formatPrice(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  if (value >= 1000) {
    return Math.round(value).toString();
  }

  return value.toFixed(2);
}

function formatPct(value) {
  const rounded = Number(value ?? 0).toFixed(2);
  return `${value >= 0 ? "+" : ""}${rounded}%`;
}

function getQuoteTone(value) {
  if (value > 0) {
    return "is-up";
  }

  if (value < 0) {
    return "is-down";
  }

  return "is-flat";
}

function renderTicker(quotes) {
  const markup = quotes
    .map((quote) => {
      return `
        <span class="ticker-item ${getQuoteTone(quote.pct)}">
          <span class="ticker-symbol">${quote.label}</span>
          <span class="ticker-price">${formatPrice(quote.price)}</span>
          <span class="ticker-change">${formatPct(quote.pct)}</span>
        </span>
      `;
    })
    .join("");

  tickerTrackA.innerHTML = markup;
  tickerTrackB.innerHTML = markup;
}

function renderSectors(sectors) {
  sectorList.innerHTML = sectors
    .map((sector) => {
      const tone = getQuoteTone(sector.pct);
      const className = tone === "is-up" ? "positive" : tone === "is-down" ? "warm" : "neutral";
      return `
        <div class="metric-row">
          <span>${sector.label}</span>
          <strong class="${className}">${formatPct(sector.pct)}</strong>
        </div>
      `;
    })
    .join("");
}

function renderDemoState() {
  renderTicker(DEMO_QUOTES);
  renderSectors([
    { label: "Technology", pct: 0.72 },
    { label: "Financials", pct: 0.21 },
    { label: "Energy", pct: -0.34 }
  ]);
  universeSummary.textContent = "PRICE $2-$20 / VOLUME UNDER 50M";
  universeList.innerHTML = `
    <div class="metric-row"><span>ABCD</span><strong class="neutral">$3.42 / 8.2M</strong></div>
    <div class="metric-row"><span>WXYZ</span><strong class="positive">$6.11 / 14.5M</strong></div>
    <div class="metric-row"><span>MNOP</span><strong class="warm">$12.08 / 21.7M</strong></div>
  `;
}

function renderUniverse(payload) {
  universeSummary.textContent = `${payload.count} MATCHES / PRICE $${payload.filters.priceMin}-$${payload.filters.priceMax} / VOL < ${(payload.filters.maxVolume / 1000000).toFixed(0)}M`;
  universeList.innerHTML = payload.symbols
    .map((item) => {
      return `
        <div class="metric-row">
          <span>${item.symbol}</span>
          <strong class="neutral">$${formatPrice(item.price)} / ${(item.volume / 1000000).toFixed(1)}M</strong>
        </div>
      `;
    })
    .join("");
}

async function updateMarketData() {
  try {
    const [bannerResponse, universeResponse] = await Promise.all([
      fetch(`${API_BASE}/api/market/banner`),
      fetch(`${API_BASE}/api/universe?priceMin=2&priceMax=20&maxVolume=50000000&limit=8`)
    ]);

    if (!bannerResponse.ok) {
      throw new Error(`Backend banner failed with ${bannerResponse.status}`);
    }

    if (!universeResponse.ok) {
      throw new Error(`Backend universe failed with ${universeResponse.status}`);
    }

    const [bannerPayload, universePayload] = await Promise.all([
      bannerResponse.json(),
      universeResponse.json()
    ]);

    renderTicker(bannerPayload.quotes);
    renderSectors(bannerPayload.sectors);
    renderUniverse(universePayload);
    tickerPhaseNote.textContent = `${getSessionState().phase} / ${bannerPayload.feedLabel}`;
    setStatus(`${bannerPayload.status} / UNIVERSE ${universePayload.count}`);
  } catch (error) {
    renderDemoState();
    setStatus("BACKEND OFFLINE - SHOWING DEMO DATA");
    tickerPhaseNote.textContent = "CHECK RAILWAY API / USING FALLBACK";
    console.error(error);
  }
}

function updateActiveCity(nextCity) {
  activeCity = nextCity;
  cityButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.city === nextCity);
  });
  updateWeather();
}

function applyTheme(nextTheme) {
  activeTheme = nextTheme;
  document.body.dataset.theme = nextTheme;
  localStorage.setItem("pixel-desk-theme", nextTheme);
  themeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.theme === nextTheme);
  });
}

cityButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.city !== activeCity) {
      updateActiveCity(button.dataset.city);
    }
  });
});

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.theme !== activeTheme) {
      applyTheme(button.dataset.theme);
    }
  });
});

applyTheme(activeTheme);
renderDemoState();
setStatus("BOOTING MARKET API");
updateDateAndTime();
updateHeaderSessionInfo();
updateWeather();
updateMarketData();

setInterval(updateDateAndTime, 1000);
setInterval(updateHeaderSessionInfo, 1000);
setInterval(updateWeather, 15 * 60 * 1000);
setInterval(updateMarketData, 60 * 1000);
