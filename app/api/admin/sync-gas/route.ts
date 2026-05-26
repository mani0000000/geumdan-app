import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GEUMDAN_KATEC } from "@/lib/api/opinet";
import { GEUMDAN_CENTER } from "@/lib/geumdan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const OPINET_FALLBACK_KEY = "F260518486";
const RADIUS_M = 10000; // 10km — 검단 외곽 포함
const PRODCD = { gasoline: "B027", diesel: "D047", lpg: "K015" } as const;

// ── KATEC → WGS84 (GEUMDAN_KATEC 정확한 기준점 사용) ───────────────────────
function katecToWgs84(x: number, y: number): { lat: number; lng: number } | null {
  if (!x || !y || x < 150000 || x > 600000 || y < 300000 || y > 800000) return null;
  const COS_C = Math.cos(GEUMDAN_CENTER.lat * Math.PI / 180);
  const lat = GEUMDAN_CENTER.lat + (y - GEUMDAN_KATEC.y) / 111320;
  const lng = GEUMDAN_CENTER.lng + (x - GEUMDAN_KATEC.x) / (111320 * COS_C);
  if (lat < 37.2 || lat > 37.9 || lng < 126.3 || lng > 127.2) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

// ── 이름 정규화 (브랜드명·공통 접미어 제거) ──────────────────────────────────
function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/sk에너지|sk|gs칼텍스|gs|현대오일뱅크|현대|에스오일|s-oil|s\.oil/g, "")
    .replace(/농협|알뜰주유소|알뜰|셀프주유소|셀프|주유소/g, "")
    .replace(/\(주\)|\(유\)/g, "")
    .replace(/에너지|오일뱅크|오일드림/g, "")
    .replace(/\s+/g, "")
    .replace(/[()（）\[\]]/g, "")
    .trim();
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

// ── Opinet 호출 ──────────────────────────────────────────────────────────
interface OpinetStation {
  UNI_ID: string; OS_NM: string; POLL_DIV_CD: string;
  PRICE: number; DISTANCE: number;
  GIS_X_COOR?: number; GIS_Y_COOR?: number;
  NEW_ADR?: string; VAN_ADR?: string;
}

async function fetchOpinet(prodcd: string, apiKey: string): Promise<OpinetStation[]> {
  const url =
    `https://www.opinet.co.kr/api/aroundAll.do?code=${apiKey}` +
    `&x=${GEUMDAN_KATEC.x}&y=${GEUMDAN_KATEC.y}&radius=${RADIUS_M}` +
    `&prodcd=${prodcd}&sort=1&out=json`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36",
        Accept: "application/json,*/*",
      },
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    return (json?.RESULT?.OIL ?? []) as OpinetStation[];
  } catch {
    return [];
  }
}

// ── 메인 POST 핸들러 ─────────────────────────────────────────────────────
export async function POST(_req: NextRequest) {
  const supabaseUrl  = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey   = process.env.SUPABASE_SERVICE_KEY || "";
  const apiKey       = (process.env.OPINET_API_KEY || OPINET_FALLBACK_KEY).trim();

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "환경변수 누락: SUPABASE_URL, SUPABASE_SERVICE_KEY" }, { status: 500 });
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. DB 주유소 로드
  const { data: dbRows, error: dbErr } = await sb
    .from("gas_stations")
    .select("id,name,lat,lng,brand_code,opinet_id,area,address")
    .eq("active", true);

  if (dbErr || !dbRows?.length) {
    return NextResponse.json({ error: "DB 로드 실패", detail: dbErr?.message }, { status: 500 });
  }

  // 2. Opinet 전체 데이터 (3개 유종 병렬)
  const [gasoline, diesel, lpg] = await Promise.all([
    fetchOpinet(PRODCD.gasoline, apiKey),
    fetchOpinet(PRODCD.diesel,   apiKey),
    fetchOpinet(PRODCD.lpg,      apiKey),
  ]);

  const totalOpinet = gasoline.length + diesel.length + lpg.length;
  if (totalOpinet === 0) {
    return NextResponse.json({ error: "Opinet API에서 데이터를 가져오지 못했습니다." }, { status: 502 });
  }

  // 3. UNI_ID 기준 가격 맵 + 전체 스테이션 맵 구성
  const priceMap = new Map<string, { gasoline?: number; diesel?: number; lpg?: number }>();
  const opinetAll = new Map<string, OpinetStation>();

  function ingest(list: OpinetStation[], fuel: "gasoline" | "diesel" | "lpg") {
    for (const s of list) {
      if (!s.UNI_ID) continue;
      if (!opinetAll.has(s.UNI_ID)) opinetAll.set(s.UNI_ID, s);
      if (s.PRICE > 0) {
        if (!priceMap.has(s.UNI_ID)) priceMap.set(s.UNI_ID, {});
        priceMap.get(s.UNI_ID)![fuel] = s.PRICE;
      }
    }
  }
  ingest(gasoline, "gasoline");
  ingest(diesel,   "diesel");
  ingest(lpg,      "lpg");

  // GIS 좌표 맵 (UNI_ID → WGS84)
  const gisMap = new Map<string, { lat: number; lng: number }>();
  for (const [uid, s] of opinetAll) {
    if (s.GIS_X_COOR && s.GIS_Y_COOR) {
      const wgs = katecToWgs84(s.GIS_X_COOR, s.GIS_Y_COOR);
      if (wgs) gisMap.set(uid, wgs);
    }
  }

  // 4. DB 주유소마다 매칭 + Supabase 업데이트
  const now = new Date().toISOString();
  const results: Array<{
    id: number; name: string; status: string;
    opinet_name?: string; score?: number;
    lat_before?: number; lng_before?: number;
    lat_after?: number; lng_after?: number;
    prices?: { gasoline?: number; diesel?: number; lpg?: number };
  }> = [];

  for (const dbS of dbRows) {
    // opinet_id 저장돼 있으면 직접 조회
    let uid: string | undefined = dbS.opinet_id ?? undefined;
    let matchScore = uid ? 1.0 : 0;

    // 없으면 이름 유사도 매칭
    if (!uid) {
      let bestId: string | undefined, bestScore = 0;
      for (const [id, os] of opinetAll) {
        const score = nameSimilarity(dbS.name as string, os.OS_NM);
        if (score > bestScore) { bestScore = score; bestId = id; }
      }
      if (bestScore >= 0.35 && bestId) {
        uid = bestId;
        matchScore = bestScore;
      }
    }

    if (!uid) {
      results.push({ id: dbS.id as number, name: dbS.name as string, status: "unmatched" });
      continue;
    }

    const opiS = opinetAll.get(uid)!;
    const prices = priceMap.get(uid) ?? {};
    const gis = gisMap.get(uid);

    const update: Record<string, unknown> = {
      opinet_id:        uid,
      price_gasoline:   prices.gasoline ?? null,
      price_diesel:     prices.diesel   ?? null,
      price_lpg:        prices.lpg      ?? null,
      price_updated_at: now,
    };
    // 좌표는 GIS 값이 있을 때만 업데이트
    if (gis) {
      update.lat = gis.lat;
      update.lng = gis.lng;
    }

    const { error: upErr } = await sb.from("gas_stations").update(update).eq("id", dbS.id);

    if (upErr) {
      results.push({ id: dbS.id as number, name: dbS.name as string, status: "error", opinet_name: opiS.OS_NM });
    } else {
      results.push({
        id: dbS.id as number,
        name: dbS.name as string,
        status: matchScore === 1.0 ? "matched_exact" : "matched_fuzzy",
        opinet_name: opiS.OS_NM,
        score: Math.round(matchScore * 100) / 100,
        lat_before: dbS.lat as number,
        lng_before: dbS.lng as number,
        lat_after:  gis?.lat ?? dbS.lat as number,
        lng_after:  gis?.lng ?? dbS.lng as number,
        prices,
      });
    }
  }

  const matched   = results.filter(r => r.status.startsWith("matched")).length;
  const unmatched = results.filter(r => r.status === "unmatched").length;
  const errors    = results.filter(r => r.status === "error").length;
  const coordUpdated = results.filter(r => r.lat_before !== r.lat_after || r.lng_before !== r.lng_after).length;

  return NextResponse.json({
    success: true,
    summary: {
      total: dbRows.length,
      opinet_stations: opinetAll.size,
      matched,
      unmatched,
      coord_updated: coordUpdated,
      errors,
      timestamp: now,
    },
    results,
  });
}
