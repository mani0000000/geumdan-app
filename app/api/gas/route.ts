import { NextRequest, NextResponse } from "next/server";
import type { GasStation, GasSource, GasApiResponse } from "@/lib/types";
import { GEUMDAN_KATEC } from "@/lib/api/opinet";
import { createClient } from "@supabase/supabase-js";

/**
 * 검단 신도시 주유소 가격 API
 *
 * 1. Supabase gas_stations 테이블에서 큐레이션 목록 로드 (21개)
 * 2. Opinet aroundAll.do (반경 5km) 로 실시간 가격 조회
 * 3. 이름 유사도 매칭으로 병합
 * 4. 매칭 실패 주유소도 가격 없음으로 포함
 * 5. sort 파라미터: "price"(기본) | "distance" — 프론트에서도 재정렬 가능
 */

const FALLBACK_OPINET_KEY = "F260518486";
const RADIUS_M = 7000; // 검단 외곽(불로·대곡동) 포함 위해 7km

const PRODCD = { gasoline: "B027", diesel: "D047", lpg: "K015" } as const;

// ── 브랜드 메타 ────────────────────────────────────────────────────────────
const BRAND_META: Record<string, { name: string; color: string; bg: string; short: string }> = {
  SKE: { name: "SK에너지",     color: "#EF4444", bg: "#FEF2F2", short: "SK"   },
  GSC: { name: "GS칼텍스",     color: "#0058B0", bg: "#EFF6FF", short: "GS"   },
  HDO: { name: "현대오일뱅크", color: "#16A34A", bg: "#F0FDF4", short: "현대" },
  SOL: { name: "S-OIL",        color: "#F59E0B", bg: "#FFFBEB", short: "S-OIL"},
  RTO: { name: "알뜰주유소",   color: "#6366F1", bg: "#EEF2FF", short: "알뜰" },
  RTX: { name: "고속도로알뜰", color: "#6366F1", bg: "#EEF2FF", short: "알뜰" },
  NHO: { name: "농협알뜰",     color: "#059669", bg: "#ECFDF5", short: "NH"   },
  ETC: { name: "자가상표",     color: "#6B7280", bg: "#F3F4F6", short: "일반" },
};

function metaFor(code: string) { return BRAND_META[code] ?? BRAND_META.ETC; }

// ── 인라인 폴백 주유소 목록 (DB 없을 때 사용) ─────────────────────────────
const FALLBACK_STATIONS = [
  { id: 1,  name: "검단농협주유소",    brand_code: "NHO", brand_name: "농협알뜰",     area: "당하동", address: "인천 서구 완정로 38",         lat: 37.5445, lng: 126.6715, is_self: false, is_alttul: true  },
  { id: 2,  name: "신도시주유소",      brand_code: "ETC", brand_name: "자가상표",     area: "당하동", address: "인천 서구 고산후로 102",       lat: 37.5505, lng: 126.6775, is_self: false, is_alttul: false },
  { id: 3,  name: "창신주유소",        brand_code: "ETC", brand_name: "자가상표",     area: "원당동", address: "인천 서구 원당대로 802",       lat: 37.5490, lng: 126.6840, is_self: false, is_alttul: false },
  { id: 4,  name: "검단원당주유소",    brand_code: "SOL", brand_name: "S-OIL",        area: "원당동", address: "인천 서구 원당대로 834",       lat: 37.5495, lng: 126.6850, is_self: false, is_alttul: false },
  { id: 5,  name: "검단주유소",        brand_code: "HDO", brand_name: "현대오일뱅크", area: "마전동", address: "인천 서구 완정로 183",         lat: 37.5565, lng: 126.6745, is_self: false, is_alttul: false },
  { id: 6,  name: "마전주유소",        brand_code: "RTO", brand_name: "알뜰주유소",   area: "마전동", address: "인천 서구 완정로 223",         lat: 37.5580, lng: 126.6745, is_self: false, is_alttul: true  },
  { id: 7,  name: "검단대로주유소",    brand_code: "GSC", brand_name: "GS칼텍스",     area: "마전동", address: "인천 서구 검단로 502",         lat: 37.5555, lng: 126.6810, is_self: false, is_alttul: false },
  { id: 8,  name: "차오름에너지주유소",brand_code: "SKE", brand_name: "SK에너지",     area: "왕길동", address: "인천 서구 단봉로 78",          lat: 37.5615, lng: 126.6675, is_self: false, is_alttul: false },
  { id: 9,  name: "미소주유소",        brand_code: "SKE", brand_name: "SK에너지",     area: "왕길동", address: "인천 서구 단봉로 118",         lat: 37.5630, lng: 126.6680, is_self: false, is_alttul: false },
  { id: 10, name: "오일드림주유소",    brand_code: "HDO", brand_name: "현대오일뱅크", area: "왕길동", address: "인천 서구 거남로 22",          lat: 37.5610, lng: 126.6650, is_self: false, is_alttul: false },
  { id: 11, name: "구도일주유소",      brand_code: "SOL", brand_name: "S-OIL",        area: "왕길동", address: "인천 서구 단봉로 30",          lat: 37.5608, lng: 126.6668, is_self: false, is_alttul: false },
  { id: 12, name: "단봉주유소",        brand_code: "ETC", brand_name: "자가상표",     area: "왕길동", address: "인천 서구 검단로 123",         lat: 37.5640, lng: 126.6700, is_self: false, is_alttul: false },
  { id: 13, name: "왕길셀프주유소",    brand_code: "ETC", brand_name: "자가상표",     area: "왕길동", address: "인천 서구 사곶로 25",          lat: 37.5650, lng: 126.6635, is_self: true,  is_alttul: false },
  { id: 14, name: "금곡주유소",        brand_code: "HDO", brand_name: "현대오일뱅크", area: "금곡동", address: "인천 서구 검단로 732",         lat: 37.5525, lng: 126.6565, is_self: false, is_alttul: false },
  { id: 15, name: "검단스타주유소",    brand_code: "GSC", brand_name: "GS칼텍스",     area: "금곡동", address: "인천 서구 검단로 669",         lat: 37.5515, lng: 126.6605, is_self: false, is_alttul: false },
  { id: 16, name: "인천랍스터주유소",  brand_code: "HDO", brand_name: "현대오일뱅크", area: "금곡동", address: "인천 서구 검단로 694",         lat: 37.5520, lng: 126.6595, is_self: false, is_alttul: false },
  { id: 17, name: "오류공단주유소",    brand_code: "ETC", brand_name: "자가상표",     area: "오류동", address: "인천 서구 검단로 45번길 12",   lat: 37.5460, lng: 126.6495, is_self: false, is_alttul: false },
  { id: 18, name: "오류셀프주유소",    brand_code: "HDO", brand_name: "현대오일뱅크", area: "오류동", address: "인천 서구 드림로 112",         lat: 37.5470, lng: 126.6510, is_self: true,  is_alttul: false },
  { id: 19, name: "불로주유소",        brand_code: "ETC", brand_name: "자가상표",     area: "불로동", address: "인천 서구 검단로 798",         lat: 37.5395, lng: 126.6650, is_self: false, is_alttul: false },
  { id: 20, name: "대곡주유소",        brand_code: "ETC", brand_name: "자가상표",     area: "대곡동", address: "인천 서구 대곡로 214",         lat: 37.5350, lng: 126.6800, is_self: false, is_alttul: false },
  { id: 21, name: "대곡대로주유소",    brand_code: "ETC", brand_name: "자가상표",     area: "대곡동", address: "인천 서구 대곡로 351",         lat: 37.5360, lng: 126.6820, is_self: false, is_alttul: false },
];

// ── DB 로드 ───────────────────────────────────────────────────────────────
async function loadDbStations() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return FALLBACK_STATIONS;

  try {
    const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await sb
      .from("gas_stations")
      .select("id,name,brand_code,brand_name,area,address,lat,lng,opinet_id,is_self,is_alttul")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error || !data?.length) return FALLBACK_STATIONS;
    return data as typeof FALLBACK_STATIONS;
  } catch {
    return FALLBACK_STATIONS;
  }
}

// ── KATEC → WGS84 근사 변환 ───────────────────────────────────────────────
// GEUMDAN_KATEC(wgs84ToKatec 으로 정확히 계산된 값)을 기준점으로 선형 근사
function katecToWgs84(x: number, y: number): { lat: number; lng: number } | null {
  if (!x || !y || x < 200000 || x > 500000 || y < 400000 || y > 700000) return null;
  const LAT_C = 37.5446, LNG_C = 126.6861;
  const COS_C = Math.cos(LAT_C * Math.PI / 180);
  // wgs84ToKatec(37.5446, 126.6861) 의 정확한 출력값을 기준으로 사용
  const KX_C = GEUMDAN_KATEC.x, KY_C = GEUMDAN_KATEC.y;
  const lat = LAT_C + (y - KY_C) / 111320;
  const lng = LNG_C + (x - KX_C) / (111320 * COS_C);
  if (lat < 37.3 || lat > 37.8 || lng < 126.4 || lng > 127.0) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

// ── Opinet API ────────────────────────────────────────────────────────────
interface OpinetStation {
  UNI_ID: string; OS_NM: string; POLL_DIV_CD: string;
  PRICE: number; DISTANCE: number;
  GIS_X_COOR?: number; GIS_Y_COOR?: number;
  NEW_ADR?: string; VAN_ADR?: string;
}

async function fetchOpinetByProduct(prodcd: string, apiKey: string) {
  const url =
    `https://www.opinet.co.kr/api/aroundAll.do?code=${apiKey}` +
    `&x=${GEUMDAN_KATEC.x}&y=${GEUMDAN_KATEC.y}&radius=${RADIUS_M}` +
    `&prodcd=${prodcd}&sort=1&out=json`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json,text/plain,*/*",
      },
    });
    if (!res.ok) return { stations: [] as OpinetStation[], ok: false };
    const json = await res.json().catch(() => null);
    return { stations: (json?.RESULT?.OIL ?? []) as OpinetStation[], ok: true };
  } catch {
    return { stations: [] as OpinetStation[], ok: false };
  }
}

// ── 이름 정규화 (주유소 접미어·공백·괄호 제거) ────────────────────────────
function normName(s: string) {
  return s
    .replace(/주유소$/, "")
    .replace(/\(주\)/g, "")
    .replace(/\s+/g, "")
    .replace(/[()（）]/g, "")
    .toLowerCase();
}

function nameSimilarity(a: string, b: string): number {
  const na = normName(a);
  const nb = normName(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  // 앞 2~4 글자 일치
  const minLen = Math.min(na.length, nb.length);
  let common = 0;
  for (let i = 0; i < minLen; i++) { if (na[i] === nb[i]) common++; else break; }
  return common / Math.max(na.length, nb.length);
}

// ── 메인 핸들러 ───────────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  const apiKey = process.env.OPINET_API_KEY?.trim() || FALLBACK_OPINET_KEY;
  const timestamp = new Date().toISOString();

  // 1. DB 큐레이션 목록 + Opinet 가격 병렬 로드
  const [dbStations, gasoline, diesel, lpg] = await Promise.all([
    loadDbStations(),
    fetchOpinetByProduct(PRODCD.gasoline, apiKey),
    fetchOpinetByProduct(PRODCD.diesel,   apiKey),
    fetchOpinetByProduct(PRODCD.lpg,      apiKey),
  ]);

  // 2. Opinet 결과를 UNI_ID 기준 가격맵으로 변환
  const priceMap = new Map<string, { gasoline?: number; diesel?: number; lpg?: number }>();
  // 이름→UNI_ID 역인덱스
  const nameIndex = new Map<string, string>();

  function ingest(list: OpinetStation[], fuel: keyof typeof priceMap extends never ? never : "gasoline" | "diesel" | "lpg") {
    for (const s of list) {
      if (!s.UNI_ID || s.PRICE <= 0) continue;
      if (!priceMap.has(s.UNI_ID)) priceMap.set(s.UNI_ID, {});
      priceMap.get(s.UNI_ID)![fuel] = s.PRICE;
      nameIndex.set(normName(s.OS_NM), s.UNI_ID);
    }
  }
  ingest(gasoline.stations, "gasoline");
  ingest(diesel.stations, "diesel");
  ingest(lpg.stations, "lpg");

  // Opinet 전체 역색인 (매칭용)
  const opinetAll = new Map<string, OpinetStation>();
  [...gasoline.stations, ...diesel.stations, ...lpg.stations].forEach(s => {
    if (s.UNI_ID) opinetAll.set(s.UNI_ID, s);
  });

  // Opinet GIS 좌표 맵 (UNI_ID → {lat, lng}) — 정확한 위치
  const gisMap = new Map<string, { lat: number; lng: number }>();
  [...gasoline.stations, ...diesel.stations, ...lpg.stations].forEach(s => {
    if (s.UNI_ID && s.GIS_X_COOR && s.GIS_Y_COOR && !gisMap.has(s.UNI_ID)) {
      const wgs = katecToWgs84(s.GIS_X_COOR, s.GIS_Y_COOR);
      if (wgs) gisMap.set(s.UNI_ID, wgs);
    }
  });

  // 3. DB 스테이션마다 Opinet 가격 + 위치 매칭
  const stations: GasStation[] = dbStations.map(dbS => {
    const meta = metaFor(dbS.brand_code);

    // opinet_id가 저장돼 있으면 직접 조회
    let matchedId: string | undefined = dbS.opinet_id ?? undefined;
    let prices = matchedId ? priceMap.get(matchedId) : undefined;

    // 없으면 이름 유사도로 매칭
    if (!prices) {
      let bestId: string | undefined;
      let bestScore = 0;
      for (const [uid, os] of opinetAll) {
        const score = nameSimilarity(dbS.name, os.OS_NM);
        if (score > bestScore) { bestScore = score; bestId = uid; }
      }
      if (bestScore >= 0.5 && bestId) {
        prices = priceMap.get(bestId);
        matchedId = bestId;
      }
    }

    // Opinet GIS 좌표 사용 (있을 때만 — 없으면 DB 좌표 유지)
    const gis = matchedId ? gisMap.get(matchedId) : undefined;
    const lat = gis?.lat ?? dbS.lat;
    const lng = gis?.lng ?? dbS.lng;

    // 거리: Opinet DISTANCE 필드 우선, 없으면 GIS/DB 좌표 기반
    const distKm = (() => {
      const matched = [...gasoline.stations, ...diesel.stations].find(
        s => s.UNI_ID === matchedId && s.DISTANCE > 0
      );
      if (matched?.DISTANCE) return Math.round(matched.DISTANCE / 100) / 10;
      const CENTER_LAT = 37.5446, CENTER_LNG = 126.6861;
      const dlat = lat - CENTER_LAT;
      const dlng = (lng - CENTER_LNG) * Math.cos(CENTER_LAT * Math.PI / 180);
      return Math.round(Math.sqrt(dlat * dlat + dlng * dlng) * 111 * 10) / 10;
    })();

    return {
      id: String(dbS.id),
      name: dbS.name,
      brandCode: dbS.brand_code,
      brandName: meta.name,
      brandColor: meta.color,
      brandBg: meta.bg,
      brandShort: meta.short,
      address: dbS.address,
      distanceKm: distKm,
      lat, lng,
      area: dbS.area,
      isSelf: dbS.is_self,
      isAlttul: dbS.is_alttul,
      prices: prices ?? {},
    } as GasStation;
  });

  const hasAnyPrice = stations.some(s => s.prices.gasoline != null || s.prices.diesel != null);
  const source: GasSource = hasAnyPrice ? "opinet" : (gasoline.ok || diesel.ok ? "empty" : "error");

  const body: GasApiResponse = {
    stations,
    source,
    timestamp,
    success: true,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
  });
}
