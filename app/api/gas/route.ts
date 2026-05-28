import { NextRequest, NextResponse } from "next/server";
import type { GasStation, GasSource, GasApiResponse } from "@/lib/types";
import { GEUMDAN_KATEC } from "@/lib/api/opinet";
import { GEUMDAN_CENTER } from "@/lib/geumdan";
import { createClient } from "@supabase/supabase-js";

/**
 * 검단 신도시 주유소 가격 API
 *
 * 1. Supabase gas_stations (opinet_id 포함 정확한 목록) 로드
 * 2. Opinet aroundAll.do 로 실시간 가격 조회
 * 3. opinet_id 직접 매핑 → 이름 유사도 폴백 순으로 가격 병합
 * 4. 가격이 없는 주유소도 위치 정보와 함께 포함
 */

const FALLBACK_OPINET_KEY = "F260518486";
const RADIUS_M = 12000;
const PRODCD = { gasoline: "B027", diesel: "D047", lpg: "K015" } as const;

// ── 브랜드 메타 ─────────────────────────────────────────────────────────
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

// ── KATEC → WGS84 ────────────────────────────────────────────────────────
function katecToWgs84(x: number, y: number): { lat: number; lng: number } | null {
  if (!x || !y || x < 150000 || x > 600000 || y < 300000 || y > 800000) return null;
  const COS_C = Math.cos(GEUMDAN_CENTER.lat * Math.PI / 180);
  const lat = GEUMDAN_CENTER.lat + (y - GEUMDAN_KATEC.y) / 111320;
  const lng = GEUMDAN_CENTER.lng + (x - GEUMDAN_KATEC.x) / (111320 * COS_C);
  if (lat < 37.2 || lat > 37.9 || lng < 126.3 || lng > 127.2) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

// ── 거리 계산 (km) ────────────────────────────────────────────────────────
function distKm(lat: number, lng: number): number {
  const dlat = lat - GEUMDAN_CENTER.lat;
  const dlng = (lng - GEUMDAN_CENTER.lng) * Math.cos(GEUMDAN_CENTER.lat * Math.PI / 180);
  return Math.round(Math.sqrt(dlat * dlat + dlng * dlng) * 111 * 10) / 10;
}

// ── 이름 정규화 + Jaccard 유사도 (opinet_id 없는 레거시 레코드 폴백용) ───
function normName(s: string): string {
  return s.toLowerCase()
    .replace(/sk에너지|sk|gs칼텍스|gs|현대오일뱅크|현대|에스오일|s-oil|s\.oil/g, "")
    .replace(/농협|알뜰주유소|알뜰|셀프주유소|셀프|주유소/g, "")
    .replace(/\(주\)|\(유\)/g, "")
    .replace(/에너지|오일뱅크|오일드림/g, "")
    .replace(/\s+/g, "").replace(/[()（）[\]]/g, "").trim();
}
function bigrams(s: string): Set<string> {
  const r = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) r.add(s.slice(i, i + 2));
  return r;
}
function nameSimilarity(a: string, b: string): number {
  const na = normName(a), nb = normName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const bga = bigrams(na), bgb = bigrams(nb);
  if (!bga.size && !bgb.size) return 0;
  let inter = 0;
  for (const g of bga) if (bgb.has(g)) inter++;
  const union = bga.size + bgb.size - inter;
  return union ? inter / union : 0;
}

// ── Opinet API 호출 ──────────────────────────────────────────────────────
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
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "application/json,*/*",
      },
    });
    if (!res.ok) return { stations: [] as OpinetStation[], ok: false };
    const json = await res.json().catch(() => null);
    return { stations: (json?.RESULT?.OIL ?? []) as OpinetStation[], ok: true };
  } catch {
    return { stations: [] as OpinetStation[], ok: false };
  }
}

// ── DB 로드 ────────────────────────────────────────────────────────────
async function loadDbStations() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await sb
      .from("gas_stations")
      .select("id,name,brand_code,area,address,lat,lng,opinet_id,is_self,is_alttul,price_gasoline,price_diesel,price_lpg,price_updated_at")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error || !data?.length) return null;
    return data;
  } catch {
    return null;
  }
}

// ── 메인 핸들러 ──────────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  const apiKey    = (process.env.OPINET_API_KEY?.trim() || FALLBACK_OPINET_KEY);
  const timestamp = new Date().toISOString();

  // 1. DB + Opinet 병렬 로드
  const [dbStations, gasoline, diesel, lpg] = await Promise.all([
    loadDbStations(),
    fetchOpinetByProduct(PRODCD.gasoline, apiKey),
    fetchOpinetByProduct(PRODCD.diesel,   apiKey),
    fetchOpinetByProduct(PRODCD.lpg,      apiKey),
  ]);

  const opinetOk = gasoline.ok || diesel.ok || lpg.ok;

  // 2. Opinet 결과 → 가격맵(UNI_ID 키) + 전체 스테이션맵
  const priceMap  = new Map<string, { gasoline?: number; diesel?: number; lpg?: number }>();
  const opinetAll = new Map<string, OpinetStation>();
  const gisMap    = new Map<string, { lat: number; lng: number }>();

  function ingest(list: OpinetStation[], fuel: "gasoline" | "diesel" | "lpg") {
    for (const s of list) {
      if (!s.UNI_ID) continue;
      if (!opinetAll.has(s.UNI_ID)) opinetAll.set(s.UNI_ID, s);
      if (s.PRICE > 0) {
        if (!priceMap.has(s.UNI_ID)) priceMap.set(s.UNI_ID, {});
        priceMap.get(s.UNI_ID)![fuel] = s.PRICE;
      }
      if (s.GIS_X_COOR && s.GIS_Y_COOR && !gisMap.has(s.UNI_ID)) {
        const wgs = katecToWgs84(s.GIS_X_COOR, s.GIS_Y_COOR);
        if (wgs) gisMap.set(s.UNI_ID, wgs);
      }
    }
  }
  ingest(gasoline.stations, "gasoline");
  ingest(diesel.stations,   "diesel");
  ingest(lpg.stations,      "lpg");

  // 3-A. DB 주유소가 있는 경우 — opinet_id 직접 매핑 우선
  if (dbStations && dbStations.length > 0) {
    const stations: GasStation[] = dbStations.map(row => {
      const meta = metaFor(row.brand_code as string);
      let lat    = row.lat  as number;
      let lng    = row.lng  as number;

      // opinet_id 로 가격 직접 조회
      let uid    = (row.opinet_id as string | null) ?? undefined;
      let prices = uid ? priceMap.get(uid) : undefined;

      // opinet_id 없거나 가격 없을 때 → 이름 유사도 매칭 폴백
      if (!prices) {
        let bestId = uid, bestScore = uid ? 0.5 : 0;
        for (const [id, os] of opinetAll) {
          const score = nameSimilarity(row.name as string, os.OS_NM);
          if (score > bestScore) { bestScore = score; bestId = id; }
        }
        if (bestScore >= 0.35 && bestId) {
          const candidate = priceMap.get(bestId);
          if (candidate) { prices = candidate; uid = bestId; }
        }
      }

      // 매칭된 opinet_id 의 GIS 좌표가 있으면 정확한 위치 사용
      if (uid && gisMap.has(uid)) {
        const gis = gisMap.get(uid)!;
        lat = gis.lat;
        lng = gis.lng;
      }

      // DB 에 저장된 가격이 최근 1시간 이내면 Opinet 결과 없어도 표시
      const dbPriceTs = row.price_updated_at as string | null;
      const dbPriceFresh = dbPriceTs &&
        (Date.now() - new Date(dbPriceTs).getTime()) < 3_600_000;
      if (!prices && dbPriceFresh) {
        prices = {
          gasoline: (row.price_gasoline as number | null) ?? undefined,
          diesel:   (row.price_diesel   as number | null) ?? undefined,
          lpg:      (row.price_lpg      as number | null) ?? undefined,
        };
      }

      return {
        id:         String(row.id),
        name:       row.name       as string,
        brandCode:  row.brand_code as string,
        brandName:  meta.name,
        brandColor: meta.color,
        brandBg:    meta.bg,
        brandShort: meta.short,
        address:    row.address as string,
        distanceKm: distKm(lat, lng),
        lat, lng,
        area:       row.area    as string,
        isSelf:     row.is_self as boolean,
        isAlttul:   row.is_alttul as boolean,
        prices:     prices ?? {},
      } as GasStation;
    });

    const hasPrice = stations.some(s => s.prices.gasoline != null || s.prices.diesel != null);
    const source: GasSource = hasPrice ? "opinet" : (opinetOk ? "empty" : "error");

    return NextResponse.json(
      { stations, source, timestamp, success: true } as GasApiResponse,
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
    );
  }

  // 3-B. DB 없을 때 — Opinet 결과를 직접 stations 로 변환
  if (opinetAll.size === 0) {
    return NextResponse.json(
      { stations: [], source: "error" as GasSource, timestamp, success: false } as GasApiResponse,
      { headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }

  const stations: GasStation[] = [];
  const seen = new Set<string>();

  // 가솔린·디젤 각각 merge (LP 가스만 있는 주유소는 제외)
  for (const [uid, s] of opinetAll) {
    if (seen.has(uid)) continue;
    seen.add(uid);
    const wgs = gisMap.get(uid);
    if (!wgs) continue;
    const meta   = metaFor(s.POLL_DIV_CD);
    const prices = priceMap.get(uid) ?? {};
    if (!prices.gasoline && !prices.diesel) continue; // 유류 주유소만
    stations.push({
      id:         uid,
      name:       s.OS_NM,
      brandCode:  s.POLL_DIV_CD,
      brandName:  meta.name,
      brandColor: meta.color,
      brandBg:    meta.bg,
      brandShort: meta.short,
      address:    s.NEW_ADR || s.VAN_ADR || "",
      distanceKm: Math.round(s.DISTANCE / 100) / 10,
      lat:        wgs.lat,
      lng:        wgs.lng,
      area:       "",
      isSelf:     /셀프/i.test(s.OS_NM),
      isAlttul:   ["RTO", "RTX", "NHO"].includes(s.POLL_DIV_CD),
      prices,
    } as GasStation);
  }

  stations.sort((a, b) => a.distanceKm - b.distanceKm);

  return NextResponse.json(
    { stations, source: "opinet" as GasSource, timestamp, success: true } as GasApiResponse,
    { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
  );
}
