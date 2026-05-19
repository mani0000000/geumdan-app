// 날씨: 기상청 API 서버 프록시 (/api/weather) 우선 호출
// 프록시 실패 시 Open-Meteo 직접 호출 폴백
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

// Open-Meteo 직접 호출 (폴백용)
async function fetchFromOpenMeteo(): Promise<WeatherData | null> {
  try {
    const url = [
      "https://api.open-meteo.com/v1/forecast",
      "?latitude=37.5446&longitude=126.6861",
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
      "&hourly=temperature_2m,weather_code",
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
      "&timezone=Asia%2FSeoul&forecast_days=7&past_days=1",
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
    const todayStr = new Date().toISOString().slice(0, 10);

    const yesterdayTemp: number | null =
      d.hourly?.temperature_2m?.[nowH] != null
        ? Math.round(d.hourly.temperature_2m[nowH] as number)
        : null;

    const hourly = (d.hourly.time as string[])
      .map((t: string, i: number) => ({
        t,
        temp: Math.round(d.hourly.temperature_2m[i] as number),
        code: d.hourly.weather_code[i] as number,
      }))
      .filter(h => h.t.startsWith(todayStr) && new Date(h.t).getHours() >= nowH)
      .slice(0, 6)
      .map(h => ({
        hour: h.t.slice(11, 16),
        temp: h.temp,
        emoji: wmo(h.code).emoji,
      }));

    const todayIdx = (d.daily.time as string[]).findIndex((t: string) => t === todayStr);
    const high = todayIdx >= 0 ? Math.round(d.daily.temperature_2m_max[todayIdx] as number) : 0;
    const low  = todayIdx >= 0 ? Math.round(d.daily.temperature_2m_min[todayIdx] as number) : 0;

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
      .filter((_, i) => i >= Math.max(0, todayIdx))
      .slice(0, 7);

    return {
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
  } catch (e) {
    console.error("[weather] open-meteo fetch failed:", e);
    return null;
  }
}

export async function fetchWeather(): Promise<WeatherData | null> {
  // 기상청 API 서버 프록시 우선 시도 (DATA_GO_KR_API_KEY 필요)
  try {
    const res = await fetch("/api/weather", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json() as WeatherData & { error?: string; source?: string };
      if (!data.error) {
        // 기상청 데이터는 주간예보가 3일 → Open-Meteo 연장으로 보완
        if (data.weekly && data.weekly.length < 5) {
          try {
            const fallback = await fetchFromOpenMeteo();
            if (fallback) {
              // KMA 3일 + Open-Meteo 나머지 날 병합
              const kmaWeekly = data.weekly;
              const kmaDates = new Set(kmaWeekly.map(w => w.date));
              const extra = fallback.weekly.filter(w => !kmaDates.has(w.date));
              data.weekly = [...kmaWeekly, ...extra].slice(0, 7);
              // 어제 기온도 Open-Meteo에서 보완
              if (data.yesterdayTemp == null) data.yesterdayTemp = fallback.yesterdayTemp;
              // 공기질도 보완
              if (data.pm10 == null && fallback.pm10 != null) {
                data.pm10 = fallback.pm10;
                data.pm25 = fallback.pm25;
                data.pm10Label = fallback.pm10Label;
                data.pm25Label = fallback.pm25Label;
              }
            }
          } catch { /* ignore, just return KMA data */ }
        }
        return data;
      }
    }
  } catch { /* fall through to Open-Meteo */ }

  // 기상청 실패 시 Open-Meteo 직접 호출
  console.warn("[weather] KMA proxy failed, falling back to Open-Meteo");
  return fetchFromOpenMeteo();
}
