const currentDate = document.querySelector("#current-date");
const timeCet = document.querySelector("#time-cet");
const timeNy = document.querySelector("#time-ny");
const weatherStatus = document.querySelector("#weather-status");
const weatherTemp = document.querySelector("#weather-temp");

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

const timeConfig = [
  {
    element: timeCet,
    timeZone: "Europe/Berlin"
  },
  {
    element: timeNy,
    timeZone: "America/New_York"
  }
];

function updateDateAndTime() {
  const now = new Date();

  currentDate.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(now);

  timeConfig.forEach(({ element, timeZone }) => {
    element.textContent = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(now);
  });
}

async function updateWeather() {
  const endpoint =
    "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,weather_code&timezone=Europe%2FBerlin";

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`Weather request failed with ${response.status}`);
    }

    const data = await response.json();
    const temperature = Math.round(data.current.temperature_2m);
    const description = weatherCodes[data.current.weather_code] ?? "LIVE CONDITIONS";

    weatherStatus.textContent = description;
    weatherTemp.textContent = `${temperature}°C`;
  } catch (error) {
    weatherStatus.textContent = "WEATHER OFFLINE";
    weatherTemp.textContent = "--°C";
    console.error(error);
  }
}

updateDateAndTime();
updateWeather();

setInterval(updateDateAndTime, 1000);
setInterval(updateWeather, 15 * 60 * 1000);
