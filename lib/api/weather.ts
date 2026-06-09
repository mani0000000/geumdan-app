// 날씨: Open-Meteo primary (무료·키없음·CORS OK)
// 미세먼지: Open-Meteo air quality API (무료·키없음·CORS OK)
// 기상청 단기예보는 CORS 제한으로 브라우저 직접 호출 불가 → Open-Meteo 사용
// 검단신도시 좌표: 37.5446, 126.6861

const WMO: Record<number, { label: string; emoji: string }> = {
  0:  { label: "맑음",       emoji: "☀️" },
  1:  { label: "대체로 맑음", emoji: "🌤️" },
  2:  { label: "구름 많음",  emoji: "⛅" },
  3:  { label: "흐림",       emoji: "☁️" },
  45: { label: "안개",       emoji: "🌫️" },
  48: { label: "안개",       emoji: "🌫️" },
  51: { label: "이슬비",     emoji: "🌦️" },
  53: { label: "이슬비",     emoji: "🌦️" },
  55: { label: "짙은 이슬비",emoji: "🌦️" },
  61: { label: "가벼운 비",  emoji: "🌧️" },
  63: { label: "비",         emoji: "🌧️" },
  65: { label: "강한 비",    emoji: "🌧️" },
  71: { label: "가벼운 눈",  emoji: "🌨️" },
  73: { label: "눈",         emoji: "❄️" },
  75: { label: "강한 눈",    emoji: "❄️" },
  80: { label: "소나기",     emoji: "🌦️" },
  81: { label: "비/소나기",  emoji: "🌧️" },
  82: { label: "강한 소나기",emoji: "⛈️" },
  85: { label: "눈보라",     emoji: "🌨️" },
  86: { label: "강한 눈보라",emoji: "❄️" },
  95: { label: "뇌우",       emoji: "⛈️" },
  96: { label: "뇌우·우박", emoji: "⛈️" },
  99: { label: "강한 뇌우",  emoji: "⛈️" },
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
  precipitation: number;
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
  yesterdayTemp: number | null;
  weekly: WeeklyDay[];
  pm10?: number | null;
  pm25?: number | null;
  pm10Label?: string;
  pm25Label?: string;
}

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function pmLabel(v: number | null | undefined, type: "pm10" | "pm25"): string {
  if (v == null) return "";
  if (type === "pm10") {
    if (v <= 30) return "좋음"; if (v <= 80) return "보통";
    if (v <= 150) return "나쁨"; return "매우나쁨";
  }
  if (v <= 15) return "좋음"; if (v <= 35) return "보통";
  if (v <= 75) return "나쁨"; return "매우나쁨";
}

async function fetchAirQuality(): Promise<{ pm10: number | null; pm25: number | null }> {
  try {
    const res = await fetch(
      "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=37.5446&longitude=126.6861&current=pm10,pm2_5",
      { cache: "no-store" }
    );
    if (!res.ok) return { pm10: null, pm25: null };
    const json = await res.json();
    const pm10 = json?.current?.pm10 != null ? Math.round(json.current.pm10 as number) : null;
    const pm25 = json?.current?.pm2_5 != null ? Math.round(json.current.pm2_5 as number) : null;
    return { pm10, pm25 };
  } catch { return { pm10: null, pm25: null }; }
}

const WEATHER_CACHE_KEY = "weather_cache_v2";
const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30분

/** localStorage에서 캐시된 날씨 데이터 읽기 (30분 이내) */
export function getCachedWeather(): WeatherData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: WeatherData; ts: number };
    if (Date.now() - ts > WEATHER_CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function saveWeatherCache(data: WeatherData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* ignore */ }
}

/**
 * 날씨 데이터 가져오기
 * 1. Vercel API Route(/api/weather) — 서버 30분 캐시 → 즉시 응답
 * 2. 실패 시 Open-Meteo 직접 호출 (폴백)
 * 결과는 localStorage에도 저장해 다음 로드 시 즉시 표시
 */
export async function fetchWeather(): Promise<WeatherData | null> {
  // 1. Vercel API Route (서버 30분 캐시) — 가장 빠름
  try {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const res = await fetch(`${basePath}/api/weather`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = (await res.json()) as WeatherData;
      if (data?.temp != null) {
        saveWeatherCache(data);
        return data;
      }
    }
  } catch { /* 폴백으로 진행 */ }

  // 2. Open-Meteo 직접 호출 (Vercel API Route 실패 시)
  try {
    const url = [
      "https://api.open-meteo.com/v1/forecast",
      "?latitude=37.5446&longitude=126.6861",
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
      "&hourly=temperature_2m,weather_code",
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
      "&timezone=Asia%2FSeoul&forecast_days=8&past_days=1",
    ].join("");

    const [res, air] = await Promise.all([
      fetch(url, { cache: "no-store" }),
      fetchAirQuality(),
    ]);

    if (!res.ok) return null;
    const d = await res.json();

    const code: number = d.current.weather_code;
    const now = new Date();
    const nowH = now.getHours();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // 어제 동시간 온도 (past_days=1 → hourly[nowH] = 어제 같은 시각)
    const yesterdayTemp: number | null =
      d.hourly?.temperature_2m?.[nowH] != null
        ? Math.round(d.hourly.temperature_2m[nowH] as number)
        : null;

    // 오늘 이후 시간별 예보 (최대 6개)
    const hourly = (d.hourly.time as string[])
      .map((t: string, i: number) => ({
        t,
        temp: Math.round(d.hourly.temperature_2m[i] as number),
        code: d.hourly.weather_code[i] as number,
      }))
      .filter(h => h.t.startsWith(todayStr) && parseInt(h.t.slice(11, 13)) >= nowH)
      .slice(0, 6)
      .map(h => ({
        hour: h.t.slice(11, 16),
        temp: h.temp,
        emoji: wmo(h.code).emoji,
      }));

    // 주간 예보 (past_days=1 → daily[0]=어제, daily[1]=오늘)
    const weekly: WeeklyDay[] = (d.daily.time as string[])
      .map((date: string, i: number) => {
        const d2 = new Date(date + "T00:00:00");
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
      .filter(day => !day.isToday
        ? (d.daily.time as string[]).indexOf(
            (d.daily.time as string[]).find(t => t === todayStr) ?? ""
          ) <= (d.daily.time as string[]).indexOf(todayStr)
        : true
      );

    // daily[1] = 오늘 (past_days=1이므로 0=어제)
    const todayIdx = (d.daily.time as string[]).findIndex((t: string) => t === todayStr);
    const high = todayIdx >= 0 ? Math.round(d.daily.temperature_2m_max[todayIdx] as number) : 0;
    const low  = todayIdx >= 0 ? Math.round(d.daily.temperature_2m_min[todayIdx] as number) : 0;

    // 오늘 이후 주간만
    const weeklyFiltered = (d.daily.time as string[])
      .map((date: string, i: number) => {
        const d2 = new Date(date + "T00:00:00");
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
      .filter(day => {
        const idx = (d.daily.time as string[]).findIndex(
          (t: string) => `${new Date(t + "T00:00:00").getMonth() + 1}/${new Date(t + "T00:00:00").getDate()}` === day.date
        );
        return idx >= todayIdx;
      })
      .slice(0, 7);

    const result: WeatherData = {
      temp: Math.round(d.current.temperature_2m as number),
      feelsLike: Math.round(d.current.apparent_temperature as number),
      weatherCode: code,
      label: wmo(code).label,
      emoji: wmo(code).emoji,
      humidity: Math.round(d.current.relative_humidity_2m as number),
      windSpeed: Math.round(d.current.wind_speed_10m as number),
      high,
      low,
      hourly,
      yesterdayTemp,
      weekly: weeklyFiltered,
      pm10: air.pm10,
      pm25: air.pm25,
      pm10Label: pmLabel(air.pm10, "pm10"),
      pm25Label: pmLabel(air.pm25, "pm25"),
    };
    saveWeatherCache(result);
    return result;
  } catch (e) {
    console.error("[weather] direct fetch failed:", e);
    return null;
  }
}
