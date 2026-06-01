/**
 * /api/weather — 날씨 데이터 서버 캐시 엔드포인트
 *
 * 1. 기상청 단기예보/초단기실황 API (DATA_GO_KR_API_KEY)
 * 2. 실패 시 Open-Meteo 폴백
 * Vercel s-maxage=1800 으로 30분 캐시
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 1800;

// ── 기상청 상수 ──────────────────────────────────────────────
// 검단신도시 (인천 서구 검단동) 격자 좌표
const NX = 54;
const NY = 124;

// 기상청 SKY/PTY → 날씨 코드 매핑
function kmaToWeather(sky: number, pty: number): { label: string; emoji: string } {
  if (pty === 1 || pty === 5) return { label: "비", emoji: "🌧️" };
  if (pty === 2 || pty === 6) return { label: "비/눈", emoji: "🌨️" };
  if (pty === 3 || pty === 7) return { label: "눈", emoji: "❄️" };
  if (pty === 4) return { label: "소나기", emoji: "🌦️" };
  if (sky === 1) return { label: "맑음", emoji: "☀️" };
  if (sky === 3) return { label: "구름 많음", emoji: "⛅" };
  if (sky === 4) return { label: "흐림", emoji: "☁️" };
  return { label: "맑음", emoji: "☀️" };
}

function pmLabel(v: number | null, type: "pm10" | "pm25"): string {
  if (v == null) return "";
  if (type === "pm10") {
    if (v <= 30) return "좋음"; if (v <= 80) return "보통";
    if (v <= 150) return "나쁨"; return "매우나쁨";
  }
  if (v <= 15) return "좋음"; if (v <= 35) return "보통";
  if (v <= 75) return "나쁨"; return "매우나쁨";
}

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

// 기상청 초단기실황 base_time: 매시 40분 발표 → 현재 시각 기준 가장 최근 발표
function getNcstBaseTime(now: Date): { baseDate: string; baseTime: string } {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  let h = kst.getUTCHours();
  const m = kst.getUTCMinutes();
  if (m < 40) h = (h - 1 + 24) % 24;
  const dateStr = kst.toISOString().slice(0, 10).replace(/-/g, "");
  const adjustedDate = m < 40 && h === 23
    ? new Date(kst.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, "")
    : dateStr;
  return { baseDate: adjustedDate, baseTime: String(h).padStart(2, "0") + "40" };
}

// 기상청 단기예보 base_time: 0200,0500,0800,1100,1400,1700,2000,2300
function getFcstBaseTime(now: Date): { baseDate: string; baseTime: string } {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const h = kst.getUTCHours();
  const BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];
  let baseH = BASE_HOURS.filter(bh => bh <= h).pop() ?? 23;
  let dateStr = kst.toISOString().slice(0, 10).replace(/-/g, "");
  if (baseH === 23 && h < 23) {
    // 전날 23시 발표
    const prev = new Date(kst.getTime() - 24 * 3600 * 1000);
    dateStr = prev.toISOString().slice(0, 10).replace(/-/g, "");
    baseH = 23;
  }
  return { baseDate: dateStr, baseTime: String(baseH).padStart(2, "0") + "00" };
}

// ── 기상청 API 호출 ──────────────────────────────────────────
async function fetchKMA(serviceKey: string) {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const todayKST = kst.toISOString().slice(0, 10).replace(/-/g, "");
  const nowH = kst.getUTCHours();

  const { baseDate: ncstDate, baseTime: ncstTime } = getNcstBaseTime(now);
  const { baseDate: fcstDate, baseTime: fcstTime } = getFcstBaseTime(now);

  const base = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";
  const params = (extra: Record<string, string>) =>
    new URLSearchParams({ serviceKey, dataType: "JSON", numOfRows: "300", pageNo: "1", nx: String(NX), ny: String(NY), ...extra }).toString();

  const [ncstRes, fcstRes, airRes] = await Promise.all([
    fetch(`${base}/getUltraSrtNcst?${params({ base_date: ncstDate, base_time: ncstTime })}`, { next: { revalidate: 1800 } }),
    fetch(`${base}/getVilageFcst?${params({ base_date: fcstDate, base_time: fcstTime, numOfRows: "500" })}`, { next: { revalidate: 1800 } }),
    fetch("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=37.5446&longitude=126.6861&current=pm10,pm2_5", { next: { revalidate: 1800 } }),
  ]);

  if (!ncstRes.ok || !fcstRes.ok) throw new Error("기상청 API 실패");

  const ncst = await ncstRes.json();
  const fcst = await fcstRes.json();
  const air = airRes.ok ? await airRes.json() : null;

  // 초단기실황 파싱
  const ncstItems: { category: string; obsrValue: string }[] =
    ncst?.response?.body?.items?.item ?? [];
  const get = (cat: string) => parseFloat(ncstItems.find(i => i.category === cat)?.obsrValue ?? "0");

  const temp = Math.round(get("T1H"));
  const humidity = Math.round(get("REH"));
  const windSpeed = Math.round(get("WSD"));
  const sky = Math.round(get("SKY"));
  const pty = Math.round(get("PTY"));
  const { label, emoji } = kmaToWeather(sky, pty);

  // 단기예보 파싱
  const fcstItems: { fcstDate: string; fcstTime: string; category: string; fcstValue: string }[] =
    fcst?.response?.body?.items?.item ?? [];

  // 오늘 시간별 예보 (최대 6개, 현재 시각 이후)
  const hourlyMap = new Map<string, { sky: number; pty: number; tmp: number }>();
  for (const item of fcstItems) {
    if (item.fcstDate !== todayKST) continue;
    const h = parseInt(item.fcstTime.slice(0, 2), 10);
    if (h < nowH) continue;
    const key = item.fcstTime;
    const cur = hourlyMap.get(key) ?? { sky: 1, pty: 0, tmp: 20 };
    if (item.category === "SKY") cur.sky = parseInt(item.fcstValue, 10);
    if (item.category === "PTY") cur.pty = parseInt(item.fcstValue, 10);
    if (item.category === "TMP") cur.tmp = Math.round(parseFloat(item.fcstValue));
    hourlyMap.set(key, cur);
  }
  const hourly = Array.from(hourlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 6)
    .map(([time, v]) => ({
      hour: time.slice(0, 2) + ":00",
      temp: v.tmp,
      emoji: kmaToWeather(v.sky, v.pty).emoji,
    }));

  // 일별 예보 (오늘~6일 후)
  const dailyMap = new Map<string, { sky: number[]; pty: number[]; tmx: number; tmn: number; pcp: number }>();
  for (const item of fcstItems) {
    const d = item.fcstDate;
    const cur = dailyMap.get(d) ?? { sky: [], pty: [], tmx: -99, tmn: 99, pcp: 0 };
    if (item.category === "SKY") cur.sky.push(parseInt(item.fcstValue, 10));
    if (item.category === "PTY") cur.pty.push(parseInt(item.fcstValue, 10));
    if (item.category === "TMX") cur.tmx = Math.round(parseFloat(item.fcstValue));
    if (item.category === "TMN") cur.tmn = Math.round(parseFloat(item.fcstValue));
    if (item.category === "PCP" && item.fcstValue !== "강수없음") {
      cur.pcp += parseFloat(item.fcstValue.replace("mm", "")) || 0;
    }
    dailyMap.set(d, cur);
  }
  const todayData = dailyMap.get(todayKST);
  const high = todayData?.tmx ?? temp;
  const low  = todayData?.tmn ?? temp;

  const weekly = Array.from(dailyMap.entries())
    .filter(([d]) => d >= todayKST)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 7)
    .map(([dateStr, v]) => {
      const d2 = new Date(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T00:00:00+09:00`);
      // 주요 sky/pty: 가장 많이 나온 값 사용
      const mainSky = v.sky.length > 0 ? Math.round(v.sky.reduce((a, b) => a + b, 0) / v.sky.length) : 1;
      const hasPty = v.pty.some(p => p > 0);
      const mainPty = hasPty ? v.pty.find(p => p > 0) ?? 0 : 0;
      return {
        date: `${d2.getMonth() + 1}/${d2.getDate()}`,
        dayLabel: DAY_KO[d2.getDay()],
        emoji: kmaToWeather(mainSky, mainPty).emoji,
        high: v.tmx !== -99 ? v.tmx : temp,
        low: v.tmn !== 99 ? v.tmn : temp,
        precipitation: Math.round(v.pcp),
        isToday: dateStr === todayKST,
      };
    });

  const pm10: number | null = air?.current?.pm10 != null ? Math.round(air.current.pm10) : null;
  const pm25: number | null = air?.current?.pm2_5 != null ? Math.round(air.current.pm2_5) : null;

  return {
    temp, feelsLike: temp, // 기상청 실황에 체감 없음
    weatherCode: sky * 10 + pty,
    label, emoji,
    humidity, windSpeed, high, low, hourly,
    yesterdayTemp: null, // 기상청 실황 과거 데이터 미지원
    weekly,
    pm10, pm25,
    pm10Label: pmLabel(pm10, "pm10"),
    pm25Label: pmLabel(pm25, "pm25"),
    source: "기상청",
    fetchedAt: new Date().toISOString(),
  };
}

// ── Open-Meteo 폴백 ──────────────────────────────────────────
const WMO: Record<number, { label: string; emoji: string }> = {
  0: { label: "맑음", emoji: "☀️" }, 1: { label: "대체로 맑음", emoji: "🌤️" },
  2: { label: "구름 많음", emoji: "⛅" }, 3: { label: "흐림", emoji: "☁️" },
  45: { label: "안개", emoji: "🌫️" }, 48: { label: "안개", emoji: "🌫️" },
  51: { label: "이슬비", emoji: "🌦️" }, 61: { label: "비", emoji: "🌧️" },
  63: { label: "비", emoji: "🌧️" }, 65: { label: "강한 비", emoji: "🌧️" },
  71: { label: "눈", emoji: "🌨️" }, 73: { label: "눈", emoji: "❄️" },
  80: { label: "소나기", emoji: "🌦️" }, 95: { label: "뇌우", emoji: "⛈️" },
};
function wmo(code: number) { return WMO[code] ?? { label: "알 수 없음", emoji: "🌡️" }; }

async function fetchOpenMeteo() {
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
    fetch("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=37.5446&longitude=126.6861&current=pm10,pm2_5", { next: { revalidate: 1800 } }),
  ]);
  if (!res.ok) throw new Error("Open-Meteo 실패");
  const d = await res.json();
  const air = airRes.ok ? await airRes.json() : null;
  const pm10: number | null = air?.current?.pm10 != null ? Math.round(air.current.pm10) : null;
  const pm25: number | null = air?.current?.pm2_5 != null ? Math.round(air.current.pm2_5) : null;
  const code: number = d.current.weather_code;
  const nowH = new Date().getHours();
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayTemp: number | null = d.hourly?.temperature_2m?.[nowH] != null ? Math.round(d.hourly.temperature_2m[nowH]) : null;
  const hourly = (d.hourly.time as string[])
    .map((t: string, i: number) => ({ t, temp: Math.round(d.hourly.temperature_2m[i]), code: d.hourly.weather_code[i] }))
    .filter(h => h.t.startsWith(todayStr) && new Date(h.t).getHours() >= nowH)
    .slice(0, 6).map(h => ({ hour: h.t.slice(11, 16), temp: h.temp, emoji: wmo(h.code).emoji }));
  const todayIdx = (d.daily.time as string[]).findIndex((t: string) => t === todayStr);
  const high = todayIdx >= 0 ? Math.round(d.daily.temperature_2m_max[todayIdx]) : 0;
  const low  = todayIdx >= 0 ? Math.round(d.daily.temperature_2m_min[todayIdx]) : 0;
  const weekly = (d.daily.time as string[])
    .map((date: string, i: number) => {
      const d2 = new Date(date + "T00:00:00");
      return { date: `${d2.getMonth()+1}/${d2.getDate()}`, dayLabel: DAY_KO[d2.getDay()], emoji: wmo(d.daily.weather_code[i]).emoji, high: Math.round(d.daily.temperature_2m_max[i]), low: Math.round(d.daily.temperature_2m_min[i]), precipitation: Math.round(d.daily.precipitation_sum[i]), isToday: date === todayStr };
    }).filter((_: unknown, i: number) => i >= todayIdx).slice(0, 7);
  return { temp: Math.round(d.current.temperature_2m), feelsLike: Math.round(d.current.apparent_temperature), weatherCode: code, label: wmo(code).label, emoji: wmo(code).emoji, humidity: Math.round(d.current.relative_humidity_2m), windSpeed: Math.round(d.current.wind_speed_10m), high, low, hourly, yesterdayTemp, weekly, pm10, pm25, pm10Label: pmLabel(pm10, "pm10"), pm25Label: pmLabel(pm25, "pm25"), source: "Open-Meteo", fetchedAt: new Date().toISOString() };
}

// ── Route Handler ────────────────────────────────────────────
// 우선순위: Supabase DB (30분 배치) → 기상청 직접 → Open-Meteo 폴백
export async function GET() {
  try {
    // 1. Supabase DB (배치가 저장한 최신 데이터 — 가장 빠름)
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
      );
      const { data: row } = await sb
        .from("weather_cache")
        .select("data, fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .single();

      if (row?.data) {
        const ageMs = Date.now() - new Date(row.fetched_at).getTime();
        if (ageMs < 35 * 60 * 1000) { // 35분 이내
          return NextResponse.json(row.data, {
            headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
          });
        }
      }
    } catch (dbErr) {
      console.warn("[weather] DB 조회 실패:", dbErr);
    }

    // 2. 기상청 직접 호출 (DB 데이터 없거나 오래됨)
    const serviceKey = process.env.DATA_GO_KR_API_KEY ?? "";
    let data;
    if (serviceKey) {
      try {
        data = await fetchKMA(serviceKey);
      } catch (e) {
        console.warn("[weather] 기상청 실패, Open-Meteo 폴백:", e);
        data = await fetchOpenMeteo();
      }
    } else {
      data = await fetchOpenMeteo();
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (e) {
    console.error("[/api/weather]", e);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
