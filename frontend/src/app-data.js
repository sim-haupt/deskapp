export const cities = {
  langen: {
    key: "langen",
    label: "Langen"
  },
  heidelberg: {
    key: "heidelberg",
    label: "Heidelberg"
  }
};

const weatherIcons = {
  sunny: new URL("../assets/weather/weather-sunny.svg", import.meta.url).href,
  cloudy: new URL("../assets/weather/weather-cloudy.svg", import.meta.url).href,
  rain: new URL("../assets/weather/weather-rain.svg", import.meta.url).href,
  storm: new URL("../assets/weather/weather-storm.svg", import.meta.url).href,
  snow: new URL("../assets/weather/weather-snow.svg", import.meta.url).href,
  fog: new URL("../assets/weather/weather-fog.svg", import.meta.url).href
};

export function getWeatherIconUrl(iconName) {
  return weatherIcons[iconName] || weatherIcons.cloudy;
}
