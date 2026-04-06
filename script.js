const currentDate = document.querySelector("#current-date");
const timeCet = document.querySelector("#time-cet");
const timeNy = document.querySelector("#time-ny");
const weatherStatus = document.querySelector("#weather-status");
const weatherTemp = document.querySelector("#weather-temp");
const weatherIcon = document.querySelector("#weather-icon");
const weatherCityLabel = document.querySelector("#weather-city-label");
const cityButtons = document.querySelectorAll(".city-button");
const slideshowImage = document.querySelector("#slideshow-image");

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

const slideshowFrames = [
  "./slideshow-01.svg",
  "./slideshow-02.svg",
  "./slideshow-03.svg",
  "./slideshow-04.svg"
];

let activeCity = "langen";
let previousSlide = slideshowFrames[0];

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

const weatherIconMap = {
  sunny: "./weather-sunny.svg",
  cloudy: "./weather-cloudy.svg",
  rain: "./weather-rain.svg",
  storm: "./weather-storm.svg",
  snow: "./weather-snow.svg",
  fog: "./weather-fog.svg"
};

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
    const temperature = Math.round(data.current.temperature_2m);
    const description = weatherCodes[data.current.weather_code] ?? "LIVE CONDITIONS";
    const iconName = getWeatherIconName(data.current.weather_code);

    weatherCityLabel.textContent = city.label;
    weatherStatus.textContent = description;
    weatherTemp.textContent = `${temperature}°C`;
    weatherIcon.src = weatherIconMap[iconName];
    weatherIcon.alt = `${description} pixel weather icon`;
  } catch (error) {
    weatherCityLabel.textContent = city.label;
    weatherStatus.textContent = "WEATHER OFFLINE";
    weatherTemp.textContent = "--°C";
    weatherIcon.src = weatherIconMap.cloudy;
    weatherIcon.alt = "Offline weather icon";
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

function showRandomSlide() {
  const options = slideshowFrames.filter((frame) => frame !== previousSlide);
  const nextSlide = options[Math.floor(Math.random() * options.length)];
  previousSlide = nextSlide;
  slideshowImage.src = nextSlide;
}

cityButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.city !== activeCity) {
      updateActiveCity(button.dataset.city);
    }
  });
});

updateDateAndTime();
updateWeather();
showRandomSlide();

setInterval(updateDateAndTime, 1000);
setInterval(updateWeather, 15 * 60 * 1000);
setInterval(showRandomSlide, 7000);
