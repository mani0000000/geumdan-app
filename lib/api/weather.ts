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

function wmo(code: number) {
  return WMO[code] ?? { label: "알 수 없음", emoji: "🌡️" };
}

export interface WeeklyDay {
  date: string;       // "03/29"
  dayLabel: string;   // "토"
  emoji: string;
  high: number;
  low: number;
  precipitation: number; // mm
  isToday: boolean;
}

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
  yesterdayTemp: number | null;  // 어제 같은 시각 온도
  weekly: WeeklyDay[];
}

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

export async function fetchWeather(): Promise<WeatherData | null> {
  try {
    const url = [
      "https://api.open-meteo.com/v1/forecast",
      "?latitude=37.5446&longitude=126.6861",
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
      "&hourly=temperature_2m,weather_code",
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
      "&timezone=Asia%2FSeoul&forecast_days=7&past_days=1",
    ].join("");

    const res = await fetch(url);
    if (!res.ok) return null;
    const d = await res.json();

    const code: number = d.current.weather_code;
    const nowH = new Date().getHours();

    // ── 어제 동시간 온도 ──────────────────────────────────────
    // past_days=1이므로 hourly[0] = 어제 00시, hourly[nowH] = 어제 같은 시각
    const yesterdayTemp: number | null =
      d.hourly?.temperature_2m?.[nowH] != null
        ? Math.round(d.hourly.temperature_2m[nowH] as number)
        : null;

    // ── 오늘 시간별 예보 (향후 6시간) ────────────────────────
    // past_days=1 → hourly index 24 = 오늘 00시
    const hourly = (d.hourly.time as string[])
      .map((t: string, i: number) => ({
        t,
        temp: Math.round(d.hourly.temperature_2m[i] as number),
        code: d.hourly.weather_code[i] as number,
      }))
      .filter((h) => {
        const hh = new Date(h.t).getHours();
        const isToday = h.t.startsWith(new Date().toISOString().slice(0, 10));
        return isToday && hh >= nowH && hh < nowH + 7;
      })
      .slice(0, 6)
      .map((h) => ({
        hour: h.t.slice(11, 16),
        temp: h.temp,
        emoji: wmo(h.code).emoji,
      }));

    // ── 주간 예보 (daily) ─────────────────────────────────────
    // past_days=1 → daily[0]=어제, daily[1]=오늘, ..., daily[7]=6일 후
    const todayStr = new Date().toISOString().slice(0, 10);
    const weekly: WeeklyDay[] = (d.daily.time as string[])
      .map((date: string, i: number) => {
        const d2 = new Date(date);
        return {
          date: `${d2.getMonth() + 1}/${d2.getDate()}`,
          dayLabel: DAY_KO[d2.getDay()],
          emoji: wmo(d.daily.weather_code[i] as number).emoji,
          high: Math.round(d.daily.temperature_2m_max[i] as number),
          low: Math.round(d.daily.temperature_2m_min[i] as number),
          precipitation: Math.round(d.daily.precipitation_sum[i] as number),
          isToday: date === todayStr,
        };
      })
      .filter((day) => {
        const d2 = new Date(day.date.replace("/", "-").padStart(5, "0"));
        return new Date(`2026-${day.date.replace("/", "-")}`).getTime() >= new Date(todayStr).getTime();
      })
      .slice(0, 7);

    return {
      temp: Math.round(d.current.temperature_2m as number),
      feelsLike: Math.round(d.current.apparent_temperature as number),
      weatherCode: code,
      label: wmo(code).label,
      emoji: wmo(code).emoji,
      humidity: Math.round(d.current.relative_humidity_2m as number),
      windSpeed: Math.round(d.current.wind_speed_10m as number),
      high: Math.round(d.daily.temperature_2m_max[1] as number),
      low: Math.round(d.daily.temperature_2m_min[1] as number),
      hourly,
      yesterdayTemp,
      weekly,
    };
  } catch {
    return null;
  }
}
