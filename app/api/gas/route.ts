import { NextResponse } from "next/server";
import type { GasStation, GasSource, GasApiResponse } from "@/lib/types";

/**
 * 검단 신도시 주변 주유소 가격 (Opinet 공공 API 프록시)
 *
 * - API key: env `OPINET_API_KEY` (서버사이드 전용). 미설정 시 source="no_key" 반환.
 * - 검단 중심 KATEC TM 좌표 + 반경 5km 이내 (aroundAll.do)
 *   ※ Opinet aroundAll.do 의 x/y 는 KATEC(TM128) 좌표계 — WGS84 직접 입력 불가.
 * - 휘발유·경유·LPG 병렬 조회 후 UNI_ID 기준 병합
 * - HTTP 캐싱: 성공 시 1시간, no_key/empty 는 짧게 또는 no-store
 *
 * 참고: https://www.opinet.co.kr/api/
 */

// 검단신도시 중심부 KATEC(TM128) 좌표 (인천 서구 원당동 검단사거리 인근)
// WGS84 약 (126.66°E, 37.60°N) → KATEC ≈ (181842, 466791)
const GEUMDAN_KATEC = { x: 181842, y: 466791 } as const;
const RADIUS_M = 5000;

// 유종 코드
const PRODCD = {
  gasoline: "B027",
  diesel: "D047",
  lpg: "K015",
} as const;

const BRAND_META: Record<string, { name: string; color: string; bg: string; short: string }> = {
  SKE: { name: "SK에너지",     color: "#EF4444", bg: "#FEF2F2", short: "SK"   },
  GSC: { name: "GS칼텍스",     color: "#0058B0", bg: "#EFF6FF", short: "GS"   },
  HDO: { name: "현대오일뱅크", color: "#16A34A", bg: "#F0FDF4", short: "현대" },
  SOL: { name: "S-OIL",        color: "#F59E0B", bg: "#FFFBEB", short: "S"    },
  RTO: { name: "알뜰주유소",   color: "#6366F1", bg: "#EEF2FF", short: "알뜰" },
  RTX: { name: "고속도로알뜰", color: "#6366F1", bg: "#EEF2FF", short: "알뜰" },
  NHO: { name: "농협알뜰",     color: "#16A34A", bg: "#F0FDF4", short: "NH"   },
  E1G: { name: "E1",           color: "#0EA5E9", bg: "#F0F9FF", short: "E1"   },
  SKG: { name: "SK가스",       color: "#EF4444", bg: "#FEF2F2", short: "SK"   },
  ETC: { name: "자가상표",     color: "#6B7280", bg: "#F3F4F6", short: "기타" },
};

interface OpinetStation {
  UNI_ID: string;
  OS_NM: string;
  POLL_DIV_CD: string;
  PRICE: number;
  DISTANCE: number;
  NEW_ADR?: string;
  VAN_ADR?: string;
}

interface OpinetResponse {
  RESULT?: { OIL?: OpinetStation[] };
}

interface OpinetFetchResult {
  stations: OpinetStation[];
  ok: boolean;
  error?: string;
}

async function fetchOpinetByProduct(prodcd: string, apiKey: string): Promise<OpinetFetchResult> {
  const url =
    `https://www.opinet.co.kr/api/aroundAll.do?code=${apiKey}` +
    `&x=${GEUMDAN_KATEC.x}&y=${GEUMDAN_KATEC.y}&radius=${RADIUS_M}` +
    `&prodcd=${prodcd}&sort=1&out=json`;

  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: {
        // Opinet 서버는 일부 server-side 호출을 거부함 — 일반 브라우저 UA 로 위장
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json,text/plain,*/*",
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[/api/gas] Opinet ${prodcd} HTTP ${res.status}: ${body.slice(0, 300)}`,
      );
      return { stations: [], ok: false, error: `http_${res.status}` };
    }
    const text = await res.text();
    let json: OpinetResponse;
    try {
      json = JSON.parse(text) as OpinetResponse;
    } catch {
      console.error(
        `[/api/gas] Opinet ${prodcd} JSON parse 실패. body=${text.slice(0, 300)}`,
      );
      return { stations: [], ok: false, error: "invalid_json" };
    }
    return { stations: json.RESULT?.OIL ?? [], ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[/api/gas] Opinet ${prodcd} fetch 실패: ${msg}`);
    return { stations: [], ok: false, error: msg };
  } finally {
    clearTimeout(tid);
  }
}

function metaFor(brandCode: string) {
  return BRAND_META[brandCode] ?? BRAND_META.ETC;
}

function buildStations(
  gasolineList: OpinetStation[],
  dieselList: OpinetStation[],
  lpgList: OpinetStation[],
): GasStation[] {
  const map = new Map<string, GasStation>();

  function upsert(s: OpinetStation, fuel: "gasoline" | "diesel" | "lpg") {
    if (!s.UNI_ID || s.PRICE <= 0) return;
    const existing = map.get(s.UNI_ID);
    if (existing) {
      existing.prices[fuel] = s.PRICE;
      return;
    }
    const meta = metaFor(s.POLL_DIV_CD);
    map.set(s.UNI_ID, {
      id: s.UNI_ID,
      name: s.OS_NM ?? "주유소",
      brandCode: s.POLL_DIV_CD,
      brandName: meta.name,
      brandColor: meta.color,
      brandBg: meta.bg,
      brandShort: meta.short,
      address: (s.NEW_ADR || s.VAN_ADR || "").replace(/^인천광역시\s+/, "인천 "),
      distanceKm: Math.round((s.DISTANCE || 0) / 100) / 10,
      prices: { [fuel]: s.PRICE },
    });
  }

  gasolineList.forEach(s => upsert(s, "gasoline"));
  dieselList.forEach(s => upsert(s, "diesel"));
  lpgList.forEach(s => upsert(s, "lpg"));

  return Array.from(map.values())
    .filter(s => s.prices.gasoline != null || s.prices.diesel != null)
    .sort((a, b) => {
      const ap = a.prices.gasoline ?? a.prices.diesel ?? Infinity;
      const bp = b.prices.gasoline ?? b.prices.diesel ?? Infinity;
      return ap - bp;
    })
    .slice(0, 8);
}

export async function GET() {
  const apiKey = process.env.OPINET_API_KEY?.trim();
  const timestamp = new Date().toISOString();

  if (!apiKey) {
    console.warn("[/api/gas] OPINET_API_KEY 미설정 — Vercel 환경변수에 키를 등록해 주세요.");
    const body: GasApiResponse = {
      stations: [],
      source: "no_key",
      timestamp,
      success: false,
      message: "OPINET_API_KEY 환경변수가 설정되지 않았습니다.",
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  }

  const [gasoline, diesel, lpg] = await Promise.all([
    fetchOpinetByProduct(PRODCD.gasoline, apiKey),
    fetchOpinetByProduct(PRODCD.diesel,   apiKey),
    fetchOpinetByProduct(PRODCD.lpg,      apiKey),
  ]);

  // 세 호출이 모두 실패했으면 명시적 error 응답 (샘플 데이터로 가짜 표시 X)
  if (!gasoline.ok && !diesel.ok && !lpg.ok) {
    const body: GasApiResponse = {
      stations: [],
      source: "error",
      timestamp,
      success: false,
      error: gasoline.error ?? diesel.error ?? lpg.error ?? "fetch_failed",
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" },
    });
  }

  const stations = buildStations(gasoline.stations, diesel.stations, lpg.stations);

  if (stations.length === 0) {
    const body: GasApiResponse = {
      stations: [],
      source: "empty",
      timestamp,
      success: true,
      message: "검단 반경 5km 내 가격 정보가 비어 있습니다.",
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" },
    });
  }

  const body: GasApiResponse = {
    stations,
    source: "opinet",
    timestamp,
    success: true,
  };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
  });
}
