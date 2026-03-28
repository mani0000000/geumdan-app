// Open-Meteo API — free, no key, CORS-enabled
// 검단신도시 좌표: 37.5446, 126.6861

const WMO: Record<number, { label: string; emoji: string }> = {
  0: { label: "맑음", emoji: "☀️" },
  1: { label: "대체로 맑음", emoji: "🌤️" },
  2: { label: "구름 많음", emoji: "⛅" },
  3: { label: "흐림", emoji: "☁️" },
  45: { label: "안개", emoji: "🌫️" },
  48: { label: "안개", emoji: "🌫️" },
  51: { label: "이슬비", emoji: "🌦️" },
  53: { label: "이슬비", emoji: "🌦️" },
  55: { label: "짙은 이슬비", emoji: "🌦️" },
  61: { label: "가벼운 비", emoji: "🌧️" },
  63: { label: "비", emoji: "🌧️" },
  65: { label: "강한 비", emoji: "🌧️" },
  71: { label: "가벼운 눈", emoji: "🌨️" },
  73: { label: "눈", emoji: "❄️" },
  75: { label: "강한 눈", emoji: "❄️" },
  80: { label: "소나기", emoji: "🌦️" },
  81: { label: "비/소나기", emoji: "🌧️" },
  82: { label: "강한 소나기", emoji: "⛈️" },
  85: { label: "눈보라", emoji: "🌨️" },
  86: { label: "강한 눈보라", emoji: "❄️" },
  95: { label: "뇌우", emoji: "⛈️" },
  96: { label: "뇌우·우박", emoji: "⛈️" },
  99: { label: "강한 뇌우", emoji: "⛈️" },
};

export interface WeatherData {
  temp: number;
  feelsLike: number;
  weatherCode: number;
  label: string;
  emoji: string;
  humidity: number;
  windSpeed: number;
  high: number;
  low: number;
  hourly: { hour: string; temp: number; emoji: string }[];
}

export async function fetchWeather(): Promise<WeatherData | null> {
  try {
    const url = [
      "https://api.open-meteo.com/v1/forecast",
      "?latitude=37.5446&longitude=126.6861",
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
      "&hourly=temperature_2m,weather_code",
      "&daily=temperature_2m_max,temperature_2m_min",
      "&timezone=Asia%2FSeoul&forecast_days=1",
    ].join("");

    const res = await fetch(url, { next: { revalidate: 1800 } } as RequestInit);
    if (!res.ok) return null;
    const d = await res.json();

    const code: number = d.current.weather_code;
    const wmo = WMO[code] ?? { label: "알 수 없음", emoji: "🌡️" };

    // Next 6 hours from now
    const nowH = new Date().getHours();
    const hourly = (d.hourly.time as string[])
      .map((t: string, i: number) => ({
        time: t,
        temp: Math.round(d.hourly.temperature_2m[i] as number),
        code: d.hourly.weather_code[i] as number,
      }))
      .filter((h) => {
        const hh = new Date(h.time).getHours();
        return hh >= nowH && hh < nowH + 7;
      })
      .slice(0, 6)
      .map((h) => ({
        hour: h.time.slice(11, 16),
        temp: h.temp,
        emoji: (WMO[h.code] ?? WMO[0]).emoji,
      }));

    return {
      temp: Math.round(d.current.temperature_2m as number),
      feelsLike: Math.round(d.current.apparent_temperature as number),
      weatherCode: code,
      label: wmo.label,
      emoji: wmo.emoji,
      humidity: Math.round(d.current.relative_humidity_2m as number),
      windSpeed: Math.round(d.current.wind_speed_10m as number),
      high: Math.round(d.daily.temperature_2m_max[0] as number),
      low: Math.round(d.daily.temperature_2m_min[0] as number),
      hourly,
    };
  } catch {
    return null;
  }
}
