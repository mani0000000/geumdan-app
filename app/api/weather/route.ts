/**
 * /api/weather — 날씨 데이터 서버 캐시 엔드포인트
 *
 * Vercel이 30분(1800초)마다 Open-Meteo를 다시 호출하고 Edge에 캐시.
 * 클라이언트는 이 엔드포인트를 호출해 항상 캐시된 응답을 즉시 받는다.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 1800; // 30분 ISR 캐시

const WMO: Record<number, { label: string; emoji: string }> = {
  0:  { label: "맑음",        emoji: "☀️" },
  1:  { label: "대체로 맑음", emoji: "🌤️" },
  2:  { label: "구름 많음",   emoji: "⛅" },
  3:  { label: "흐림",        emoji: "☁️" },
  45: { label: "안개",        emoji: "🌫️" },
  48: { label: "안개",        emoji: "🌫️" },
  51: { label: "이슬비",      emoji: "🌦️" },
  53: { label: "이슬비",      emoji: "🌦️" },
  55: { label: "짙은 이슬비", emoji: "🌦️" },
  61: { label: "가벼운 비",   emoji: "🌧️" },
  63: { label: "비",          emoji: "🌧️" },
  65: { label: "강한 비",     emoji: "🌧️" },
  71: { label: "가벼운 눈",   emoji: "🌨️" },
  73: { label: "눈",          emoji: "❄️" },
  75: { label: "강한 눈",     emoji: "❄️" },
  80: { label: "소나기",      emoji: "🌦️" },
  81: { label: "비/소나기",   emoji: "🌧️" },
  82: { label: "강한 소나기", emoji: "⛈️" },
  85: { label: "눈보라",      emoji: "🌨️" },
  86: { label: "강한 눈보라", emoji: "❄️" },
  95: { label: "뇌우",        emoji: "⛈️" },
  96: { label: "뇌우·우박",   emoji: "⛈️" },
  99: { label: "강한 뇌우",   emoji: "⛈️" },
};
const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
function wmo(code: number) { return WMO[code] ?? { label: "알 수 없음", emoji: "🌡️" }; }
function pmLabel(v: number | null, type: "pm10" | "pm25"): string {
  if (v == null) return "";
  if (type === "pm10") {
    if (v <= 30) return "좋음"; if (v <= 80) return "보통";
    if (v <= 150) return "나쁨"; return "매우나쁨";
  }
  if (v <= 15) return "좋음"; if (v <= 35) return "보통";
  if (v <= 75) return "나쁨"; return "매우나쁨";
}

export async function GET() {
  try {
    const url = [
      "https://api.open-meteo.com/v1/forecast",
      "?latitude=37.5446&longitude=126.6861",
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
      "&hourly=temperature_2m,weather_code",
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
      "&timezone=Asia%2FSeoul&forecast_days=7&past_days=1",
    ].join("");

    const [res, airRes] = await Promise.all([
      fetch(url, { next: { revalidate: 1800 } }),
      fetch(
        "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=37.5446&longitude=126.6861&current=pm10,pm2_5",
        { next: { revalidate: 1800 } }
      ),
    ]);

    if (!res.ok) return NextResponse.json({ error: "날씨 API 오류" }, { status: 502 });

    const d = await res.json();
    const air = airRes.ok ? await airRes.json() : null;
    const pm10: number | null = air?.current?.pm10 != null ? Math.round(air.current.pm10) : null;
    const pm25: number | null = air?.current?.pm2_5 != null ? Math.round(air.current.pm2_5) : null;

    const code: number = d.current.weather_code;
    const nowH = new Date().getHours();
    const todayStr = new Date().toISOString().slice(0, 10);

    const yesterdayTemp: number | null =
      d.hourly?.temperature_2m?.[nowH] != null
        ? Math.round(d.hourly.temperature_2m[nowH]) : null;

    const hourly = (d.hourly.time as string[])
      .map((t: string, i: number) => ({
        t, temp: Math.round(d.hourly.temperature_2m[i]), code: d.hourly.weather_code[i],
      }))
      .filter(h => h.t.startsWith(todayStr) && new Date(h.t).getHours() >= nowH)
      .slice(0, 6)
      .map(h => ({ hour: h.t.slice(11, 16), temp: h.temp, emoji: wmo(h.code).emoji }));

    const todayIdx = (d.daily.time as string[]).findIndex((t: string) => t === todayStr);
    const high = todayIdx >= 0 ? Math.round(d.daily.temperature_2m_max[todayIdx]) : 0;
    const low  = todayIdx >= 0 ? Math.round(d.daily.temperature_2m_min[todayIdx]) : 0;

    const weeklyFiltered = (d.daily.time as string[])
      .map((date: string, i: number) => {
        const d2 = new Date(date + "T00:00:00");
        return {
          date: `${d2.getMonth() + 1}/${d2.getDate()}`,
          dayLabel: DAY_KO[d2.getDay()],
          emoji: wmo(d.daily.weather_code[i]).emoji,
          high: Math.round(d.daily.temperature_2m_max[i]),
          low: Math.round(d.daily.temperature_2m_min[i]),
          precipitation: Math.round(d.daily.precipitation_sum[i]),
          isToday: date === todayStr,
        };
      })
      .filter((_: unknown, i: number) => i >= todayIdx)
      .slice(0, 7);

    const data = {
      temp: Math.round(d.current.temperature_2m),
      feelsLike: Math.round(d.current.apparent_temperature),
      weatherCode: code,
      label: wmo(code).label,
      emoji: wmo(code).emoji,
      humidity: Math.round(d.current.relative_humidity_2m),
      windSpeed: Math.round(d.current.wind_speed_10m),
      high, low, hourly, yesterdayTemp, weekly: weeklyFiltered,
      pm10, pm25,
      pm10Label: pmLabel(pm10, "pm10"),
      pm25Label: pmLabel(pm25, "pm25"),
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (e) {
    console.error("[/api/weather]", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
