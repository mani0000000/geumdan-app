import { NextResponse } from "next/server";

export const runtime = "nodejs";

// 검단신도시(인천 서구) 기상청 격자 좌표
const NX = 54;
const NY = 124;

const KMA_ENDPOINT =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";

// 단기예보 발표 시각 (KST). 자료는 발표 후 약 10분 뒤 제공.
const BASE_TIMES = [200, 500, 800, 1100, 1400, 1700, 2000, 2300] as const;

interface KmaItem {
  category: string;
  fcstDate: string; // YYYYMMDD
  fcstTime: string; // HHMM
  fcstValue: string;
}

export interface WeatherSlot {
  date: string; // YYYYMMDD
  time: string; // HHMM
  hour: string; // "14시"
  temp: number | null; // TMP °C
  sky: number | null; // 1 맑음 / 3 구름많음 / 4 흐림
  pty: number | null; // 0 없음 / 1 비 / 2 비눈 / 3 눈 / 4 소나기
  pop: number | null; // 강수확률 %
  humidity: number | null; // REH %
  label: string;
  emoji: string;
  weatherCode: number; // Open-Meteo WMO 호환 (위젯 그라데이션용)
}

export interface WeatherApiResponse {
  success: boolean;
  source: "kma";
  baseDate: string;
  baseTime: string;
  current: WeatherSlot | null;
  todayHigh: number | null;
  todayLow: number | null;
  today: WeatherSlot[];
  tomorrow: WeatherSlot[];
  timestamp: string;
}

// 현재 KST 벽시계 시각
function kstNow(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function ymd(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

// 현재 시각 기준 가장 최근 발표(base_date/base_time) 계산
function resolveBase(): { baseDate: string; baseTime: string } {
  const now = kstNow();
  const hm = now.getUTCHours() * 100 + now.getUTCMinutes();

  // 제공 지연 10분 버퍼를 두고 가장 최근 발표 시각 선택
  let chosen = -1;
  for (const t of BASE_TIMES) {
    if (hm >= t + 10) chosen = t;
  }

  if (chosen === -1) {
    // 02:10 이전 → 전일 23시 발표
    const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return { baseDate: ymd(y), baseTime: "2300" };
  }
  return { baseDate: ymd(now), baseTime: String(chosen).padStart(4, "0") };
}

function describe(
  sky: number | null,
  pty: number | null
): { label: string; emoji: string; weatherCode: number } {
  if (pty != null && pty > 0) {
    switch (pty) {
      case 1:
      case 5:
        return { label: "비", emoji: "🌧️", weatherCode: 63 };
      case 2:
      case 6:
        return { label: "비/눈", emoji: "🌨️", weatherCode: 71 };
      case 3:
      case 7:
        return { label: "눈", emoji: "❄️", weatherCode: 73 };
      case 4:
        return { label: "소나기", emoji: "🌦️", weatherCode: 80 };
      default:
        return { label: "비", emoji: "🌧️", weatherCode: 63 };
    }
  }
  switch (sky) {
    case 1:
      return { label: "맑음", emoji: "☀️", weatherCode: 0 };
    case 3:
      return { label: "구름 많음", emoji: "⛅", weatherCode: 2 };
    case 4:
      return { label: "흐림", emoji: "☁️", weatherCode: 3 };
    default:
      return { label: "구름 많음", emoji: "🌤️", weatherCode: 1 };
  }
}

function num(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET() {
  const key =
    process.env.WEATHER_API_KEY ?? process.env.DATA_GO_KR_API_KEY;
  if (!key) {
    return NextResponse.json(
      { success: false, error: "weather_api_key_not_configured" },
      { status: 500 }
    );
  }

  const { baseDate, baseTime } = resolveBase();

  const params = new URLSearchParams({
    serviceKey: key,
    pageNo: "1",
    numOfRows: "1000", // 오늘+내일 시간대별 전 항목 확보
    dataType: "JSON",
    base_date: baseDate,
    base_time: baseTime,
    nx: String(NX),
    ny: String(NY),
  });

  let raw: KmaItem[];
  try {
    const res = await fetch(`${KMA_ENDPOINT}?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    });
    const text = await res.text();

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      // 인증 오류 등은 XML로 반환됨
      return NextResponse.json(
        { success: false, error: "kma_non_json_response", detail: text.slice(0, 300) },
        { status: 502 }
      );
    }

    const body = (json as Record<string, unknown>)?.["response"] as
      | Record<string, unknown>
      | undefined;
    const header = body?.["header"] as Record<string, unknown> | undefined;
    const resultCode = header?.["resultCode"];
    if (resultCode !== "00") {
      return NextResponse.json(
        {
          success: false,
          error: "kma_error",
          resultCode,
          resultMsg: header?.["resultMsg"],
        },
        { status: 502 }
      );
    }

    const itemsWrap = (body?.["body"] as Record<string, unknown> | undefined)?.[
      "items"
    ] as Record<string, unknown> | undefined;
    raw = (itemsWrap?.["item"] as KmaItem[]) ?? [];
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "kma_fetch_failed", message: String(err) },
      { status: 502 }
    );
  }

  // fcstDate+fcstTime 별로 카테고리 묶기
  const slots = new Map<string, Record<string, string>>();
  for (const it of raw) {
    const k = `${it.fcstDate}-${it.fcstTime}`;
    let s = slots.get(k);
    if (!s) {
      s = {};
      slots.set(k, s);
    }
    s[it.category] = it.fcstValue;
  }

  const now = kstNow();
  const todayStr = ymd(now);
  const tomorrowStr = ymd(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const nowHm = now.getUTCHours() * 100 + now.getUTCMinutes();

  function toSlot(date: string, time: string, c: Record<string, string>): WeatherSlot {
    const sky = num(c.SKY);
    const pty = num(c.PTY);
    const d = describe(sky, pty);
    return {
      date,
      time,
      hour: `${Number(time.slice(0, 2))}시`,
      temp: num(c.TMP),
      sky,
      pty,
      pop: num(c.POP),
      humidity: num(c.REH),
      label: d.label,
      emoji: d.emoji,
      weatherCode: d.weatherCode,
    };
  }

  const allSlots: WeatherSlot[] = [...slots.entries()]
    .map(([k, c]) => {
      const [date, time] = k.split("-");
      return toSlot(date, time, c);
    })
    .sort((a, b) =>
      a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)
    );

  const today = allSlots.filter((s) => s.date === todayStr);
  const tomorrow = allSlots.filter((s) => s.date === tomorrowStr);

  // 현재: 오늘 슬롯 중 현재 시각 이상에서 가장 가까운 것, 없으면 첫 예보
  const current =
    today.find((s) => Number(s.time) >= nowHm - 100) ??
    today[0] ??
    allSlots[0] ??
    null;

  // 일 최고/최저 (TMX/TMN 우선, 없으면 오늘 TMP 범위)
  let todayHigh: number | null = null;
  let todayLow: number | null = null;
  for (const [k, c] of slots) {
    if (!k.startsWith(todayStr)) continue;
    if (c.TMX != null) todayHigh = num(c.TMX);
    if (c.TMN != null) todayLow = num(c.TMN);
  }
  if (todayHigh == null || todayLow == null) {
    const temps = today.map((s) => s.temp).filter((t): t is number => t != null);
    if (temps.length) {
      if (todayHigh == null) todayHigh = Math.max(...temps);
      if (todayLow == null) todayLow = Math.min(...temps);
    }
  }

  const payload: WeatherApiResponse = {
    success: true,
    source: "kma",
    baseDate,
    baseTime,
    current,
    todayHigh,
    todayLow,
    today,
    tomorrow,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
