// Open-Meteo API — free, no key required, CORS-enabled
// Coordinates: 검단신도시 (당하동 기준)
const LAT = 37.5446;
const LON = 126.6861;

export interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  label: string;
  emoji: string;
  high: number;
  low: number;
  hourly: HourlyItem[];
}

export interface HourlyItem {
  hour: string;
  temp: number;
  emoji: string;
}

function wmoToKorean(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: "맑음", emoji: "☀️" };
  if (code <= 2) return { label: "구름 조금", emoji: "🌤️" };
  if (code === 3) return { label: "흐림", emoji: "☁️" };
  if (code <= 49) return { label: "안개", emoji: "🌫️" };
  if (code <= 59) return { label: "이슬비", emoji: "🌦️" };
  if (code <= 69) return { label: "비", emoji: "🌧️" };
  if (code <= 79) return { label: "눈", emoji: "❄️" };
  if (code <= 84) return { label: "소나기", emoji: "🌦️" };
  if (code <= 94) return { label: "뇌우", emoji: "⛈️" };
  return { label: "폭풍", emoji: "🌩️" };
}

export async function fetchWeather(): Promise<WeatherData | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min` +
      `&timezone=Asia%2FSeoul&forecast_days=1`;

    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();

    const cur = data.current;
    const daily = data.daily;
    const hourlyTimes: string[] = data.hourly.time;
    const hourlyTemps: number[] = data.hourly.temperature_2m;
    const hourlyCodes: number[] = data.hourly.weather_code;

    const nowHour = new Date().getHours();
    const hourly: HourlyItem[] = [];
    for (let i = nowHour; i < Math.min(nowHour + 6, hourlyTimes.length); i++) {
      hourly.push({
        hour: `${i}시`,
        temp: Math.round(hourlyTemps[i]),
        emoji: wmoToKorean(hourlyCodes[i]).emoji,
      });
    }

    const { label, emoji } = wmoToKorean(cur.weather_code);

    return {
      temp: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m,
      windSpeed: Math.round(cur.wind_speed_10m),
      weatherCode: cur.weather_code,
      label,
      emoji,
      high: Math.round(daily.temperature_2m_max[0]),
      low: Math.round(daily.temperature_2m_min[0]),
      hourly,
    };
  } catch {
    return null;
  }
}
