import { NextResponse } from "next/server";

/**
 * 검단 신도시 주변 주유소 가격 (Opinet 공공 API 프록시)
 *
 * - API key: env `OPINET_API_KEY`. 없으면 샘플 데이터 fallback.
 * - 검단 중심 KATEC 좌표 + 반경 5km 이내 (aroundAll.do)
 * - 휘발유·경유 가격 병합 후 가격 오름차순 정렬, 최대 8개
 * - HTTP 캐싱: 1시간 (s-maxage=3600)
 *
 * 참고: https://www.opinet.co.kr/api/
 */

// 검단신도시 중심부 KATEC(TM) 좌표 (인천 서구 원당동 검단사거리 인근)
const GEUMDAN_KATEC = { x: 181842, y: 466791 } as const;
const RADIUS_M = 5000;

// 유종 코드
const PRODCD = {
  gasoline: "B027", // 휘발유
  diesel:   "D047", // 경유
  lpg:      "K015", // LPG (자동차 부탄)
} as const;

// Opinet 브랜드 코드 → 표시명/로고색
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

export interface GasStation {
  id: string;
  name: string;
  brandCode: string;
  brandName: string;
  brandColor: string;
  brandBg: string;
  brandShort: string;
  address: string;
  distanceKm: number; // 검단 중심 기준 km
  prices: {
    gasoline?: number;
    diesel?: number;
    lpg?: number;
  };
}

// ── Opinet 응답 타입 (필요 필드만) ──────────────────────────
interface OpinetStation {
  UNI_ID: string;       // 고유 ID
  OS_NM: string;        // 상호
  POLL_DIV_CD: string;  // 브랜드 코드
  PRICE: number;        // 단가
  DISTANCE: number;     // 거리(m)
  NEW_ADR?: string;     // 도로명 주소
  VAN_ADR?: string;     // 지번 주소
}

interface OpinetResponse {
  RESULT?: { OIL?: OpinetStation[] };
}

async function fetchOpinetByProduct(prodcd: string, apiKey: string): Promise<OpinetStation[]> {
  const url =
    `https://www.opinet.co.kr/api/aroundAll.do?code=${apiKey}` +
    `&x=${GEUMDAN_KATEC.x}&y=${GEUMDAN_KATEC.y}&radius=${RADIUS_M}` +
    `&prodcd=${prodcd}&sort=1&out=json`;

  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as OpinetResponse;
    return json.RESULT?.OIL ?? [];
  } catch {
    return [];
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
      distanceKm: Math.round((s.DISTANCE || 0) / 100) / 10, // 0.1km
      prices: { [fuel]: s.PRICE },
    });
  }

  gasolineList.forEach(s => upsert(s, "gasoline"));
  dieselList.forEach(s => upsert(s, "diesel"));
  lpgList.forEach(s => upsert(s, "lpg"));

  // 휘발유 가격 보유 우선 → 가격 오름차순
  return Array.from(map.values())
    .filter(s => s.prices.gasoline != null || s.prices.diesel != null)
    .sort((a, b) => {
      const ap = a.prices.gasoline ?? a.prices.diesel ?? Infinity;
      const bp = b.prices.gasoline ?? b.prices.diesel ?? Infinity;
      return ap - bp;
    })
    .slice(0, 8);
}

// ── 샘플 fallback ────────────────────────────────────────────
const SAMPLE_STATIONS: GasStation[] = [
  {
    id: "sample-1", name: "SK 검단주유소", brandCode: "SKE",
    brandName: "SK에너지", brandColor: "#EF4444", brandBg: "#FEF2F2", brandShort: "SK",
    address: "인천 서구 검단로 612", distanceKm: 0.6,
    prices: { gasoline: 1685, diesel: 1545, lpg: 1090 },
  },
  {
    id: "sample-2", name: "GS칼텍스 원당셀프", brandCode: "GSC",
    brandName: "GS칼텍스", brandColor: "#0058B0", brandBg: "#EFF6FF", brandShort: "GS",
    address: "인천 서구 원당대로 758", distanceKm: 1.1,
    prices: { gasoline: 1668, diesel: 1528 },
  },
  {
    id: "sample-3", name: "현대오일뱅크 마전셀프", brandCode: "HDO",
    brandName: "현대오일뱅크", brandColor: "#16A34A", brandBg: "#F0FDF4", brandShort: "현대",
    address: "인천 서구 마전로 142", distanceKm: 1.8,
    prices: { gasoline: 1659, diesel: 1519, lpg: 1075 },
  },
  {
    id: "sample-4", name: "S-OIL 검단신도시점", brandCode: "SOL",
    brandName: "S-OIL", brandColor: "#F59E0B", brandBg: "#FFFBEB", brandShort: "S",
    address: "인천 서구 완정로 88", distanceKm: 2.4,
    prices: { gasoline: 1672, diesel: 1532 },
  },
  {
    id: "sample-5", name: "알뜰주유소 당하점", brandCode: "RTO",
    brandName: "알뜰주유소", brandColor: "#6366F1", brandBg: "#EEF2FF", brandShort: "알뜰",
    address: "인천 서구 당하로 33", distanceKm: 3.0,
    prices: { gasoline: 1645, diesel: 1505, lpg: 1062 },
  },
];

export async function GET() {
  const apiKey = process.env.OPINET_API_KEY?.trim();
  const timestamp = new Date().toISOString();

  // API 키 없음 → 샘플 데이터
  if (!apiKey) {
    return NextResponse.json(
      { stations: SAMPLE_STATIONS, source: "sample", timestamp, success: true },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
    );
  }

  try {
    const [gasoline, diesel, lpg] = await Promise.all([
      fetchOpinetByProduct(PRODCD.gasoline, apiKey),
      fetchOpinetByProduct(PRODCD.diesel,   apiKey),
      fetchOpinetByProduct(PRODCD.lpg,      apiKey),
    ]);

    const stations = buildStations(gasoline, diesel, lpg);

    if (stations.length === 0) {
      return NextResponse.json(
        { stations: SAMPLE_STATIONS, source: "sample", timestamp, success: true },
        { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } },
      );
    }

    return NextResponse.json(
      { stations, source: "opinet", timestamp, success: true },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
    );
  } catch (err) {
    console.error("[/api/gas] Error:", err);
    return NextResponse.json(
      { stations: SAMPLE_STATIONS, source: "sample", timestamp, success: false, error: "fetch_failed" },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
    );
  }
}
