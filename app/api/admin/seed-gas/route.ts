/**
 * POST /api/admin/seed-gas
 *
 * 오피넷 aroundAll.do API 로 검단 권역 주유소를 전수 발굴해 Supabase 에 upsert.
 * - 기존 DB 레코드를 덮어쓰지 않고 새로운 주유소만 INSERT, 기존은 UPDATE
 * - opinet_id / 이름 / 좌표 / 가격 / 브랜드 / 셀프 여부 등 갱신
 * - is_self / is_alttul / area 는 자동 추론
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GEUMDAN_KATEC } from "@/lib/api/opinet";
import { GEUMDAN_CENTER } from "@/lib/geumdan";
import { validateAdminCookie } from "@/app/api/admin/auth/route";

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";
export const maxDuration = 120;

const OPINET_FALLBACK_KEY = "F260518486";
// 검단신도시 전체(마전~아라~불로·대곡) + 인근 김포·서구 포함
const RADIUS_M = 12000;
const PRODCD = { gasoline: "B027", diesel: "D047", lpg: "K015" } as const;

// ── 브랜드 코드 매핑 ────────────────────────────────────────────────────
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

// ── KATEC → WGS84 (GEUMDAN_KATEC 기준점 선형 근사) ─────────────────────
function katecToWgs84(x: number, y: number): { lat: number; lng: number } | null {
  if (!x || !y || x < 150000 || x > 600000 || y < 300000 || y > 800000) return null;
  const COS_C = Math.cos(GEUMDAN_CENTER.lat * Math.PI / 180);
  const lat = GEUMDAN_CENTER.lat + (y - GEUMDAN_KATEC.y) / 111320;
  const lng = GEUMDAN_CENTER.lng + (x - GEUMDAN_KATEC.x) / (111320 * COS_C);
  if (lat < 37.3 || lat > 37.8 || lng < 126.3 || lng > 127.1) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

// ── 주소에서 동 이름 추출 ─────────────────────────────────────────────────
const AREA_PATTERNS: [RegExp, string][] = [
  [/마전동/,    "마전동"],
  [/당하동/,    "당하동"],
  [/원당동/,    "원당동"],
  [/금곡동/,    "금곡동"],
  [/왕길동/,    "왕길동"],
  [/오류동/,    "오류동"],
  [/불로동/,    "불로동"],
  [/대곡동/,    "대곡동"],
  [/백석동/,    "백석동"],
  [/완정동/,    "당하동"],  // 완정로 → 당하동 권역
  [/검단동/,    "검단동"],
  [/가정동/,    "아라동"],
  [/연희동/,    "연희동"],
  [/심곡동/,    "심곡동"],
];

function extractArea(address: string): string {
  for (const [pattern, area] of AREA_PATTERNS) {
    if (pattern.test(address)) return area;
  }
  // 주소에 "서구" 가 있으면 검단 인근으로 분류
  if (/서구/.test(address)) return "서구";
  return "인근";
}

// ── Opinet API 호출 ─────────────────────────────────────────────────────
interface OpinetStation {
  UNI_ID: string;
  OS_NM: string;
  POLL_DIV_CD: string;
  PRICE: number;
  DISTANCE: number;
  GIS_X_COOR?: number;
  GIS_Y_COOR?: number;
  NEW_ADR?: string;
  VAN_ADR?: string;
}

async function fetchOpinet(prodcd: string, apiKey: string): Promise<OpinetStation[]> {
  const url =
    `https://www.opinet.co.kr/api/aroundAll.do?code=${apiKey}` +
    `&x=${GEUMDAN_KATEC.x}&y=${GEUMDAN_KATEC.y}&radius=${RADIUS_M}` +
    `&prodcd=${prodcd}&sort=1&out=json`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "application/json,*/*",
      },
    });
    if (!res.ok) {
      console.error(`[seed-gas] opinet ${prodcd} error: ${res.status}`);
      return [];
    }
    const json = await res.json().catch(() => null);
    return (json?.RESULT?.OIL ?? []) as OpinetStation[];
  } catch (e) {
    console.error(`[seed-gas] opinet ${prodcd} fetch failed:`, e);
    return [];
  }
}

// ── 메인 핸들러 ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!validateAdminCookie(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY || "";
  const apiKey      = (process.env.OPINET_API_KEY || OPINET_FALLBACK_KEY).trim();

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "환경변수 누락: SUPABASE_URL, SUPABASE_SERVICE_KEY" },
      { status: 500 },
    );
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. 오피넷 3개 유종 병렬 호출
  const [gasoline, diesel, lpg] = await Promise.all([
    fetchOpinet(PRODCD.gasoline, apiKey),
    fetchOpinet(PRODCD.diesel,   apiKey),
    fetchOpinet(PRODCD.lpg,      apiKey),
  ]);

  const total = gasoline.length + diesel.length + lpg.length;
  if (total === 0) {
    return NextResponse.json(
      { error: "Opinet API에서 데이터를 가져오지 못했습니다." },
      { status: 502 },
    );
  }

  // 2. UNI_ID 기준으로 스테이션 통합 (모든 유종 결과를 합침)
  const stationMap = new Map<string, {
    station: OpinetStation;
    gasoline?: number;
    diesel?: number;
    lpg?: number;
  }>();

  function ingest(list: OpinetStation[], fuel: "gasoline" | "diesel" | "lpg") {
    for (const s of list) {
      if (!s.UNI_ID) continue;
      if (!stationMap.has(s.UNI_ID)) {
        stationMap.set(s.UNI_ID, { station: s });
      }
      const entry = stationMap.get(s.UNI_ID)!;
      // 좌표가 없으면 이 레코드에서 가져오기
      if ((!entry.station.GIS_X_COOR || !entry.station.GIS_Y_COOR) &&
          s.GIS_X_COOR && s.GIS_Y_COOR) {
        entry.station = { ...s, ...entry.station, GIS_X_COOR: s.GIS_X_COOR, GIS_Y_COOR: s.GIS_Y_COOR };
      }
      if (s.PRICE > 0) entry[fuel] = s.PRICE;
    }
  }

  ingest(gasoline, "gasoline");
  ingest(diesel,   "diesel");
  ingest(lpg,      "lpg");

  // 3. 기존 DB 로드 (opinet_id 중복 체크용)
  const { data: existingRows } = await sb
    .from("gas_stations")
    .select("id,opinet_id,name,sort_order");
  const existingByOpinetId = new Map<string, number>();
  const existingByName = new Map<string, number>();
  let maxSortOrder = 0;
  for (const row of existingRows ?? []) {
    if (row.opinet_id) existingByOpinetId.set(row.opinet_id as string, row.id as number);
    existingByName.set((row.name as string).trim(), row.id as number);
    if ((row.sort_order as number) > maxSortOrder) maxSortOrder = row.sort_order as number;
  }

  // 4. 각 주유소 row 생성 및 upsert
  const now  = new Date().toISOString();
  const inserted: string[] = [];
  const updated: string[]  = [];
  const skipped: string[]  = [];
  let sortCounter = maxSortOrder;

  for (const [uniId, entry] of stationMap) {
    const s   = entry.station;
    const wgs = katecToWgs84(s.GIS_X_COOR ?? 0, s.GIS_Y_COOR ?? 0);
    if (!wgs) {
      skipped.push(`${s.OS_NM} (좌표 변환 실패)`);
      continue;
    }

    const address = s.NEW_ADR || s.VAN_ADR || "";
    const area    = extractArea(address);
    const brandCode = (BRAND_META[s.POLL_DIV_CD] ? s.POLL_DIV_CD : "ETC") as string;
    const isSelf   = /셀프/i.test(s.OS_NM);
    const isAlttul = ["RTO", "RTX", "NHO"].includes(brandCode);

    const hasPrices = (entry.gasoline ?? 0) > 0 || (entry.diesel ?? 0) > 0 || (entry.lpg ?? 0) > 0;

    const existingId = existingByOpinetId.get(uniId) ?? existingByName.get(s.OS_NM.trim());

    if (existingId) {
      // 기존 레코드 업데이트 (opinet_id, 좌표, 가격 갱신)
      const updatePayload: Record<string, unknown> = {
        opinet_id:        uniId,
        lat:              wgs.lat,
        lng:              wgs.lng,
        address:          address || undefined,
        brand_code:       brandCode,
        brand_name:       BRAND_META[brandCode]?.name ?? "자가상표",
        is_self:          isSelf,
        is_alttul:        isAlttul,
        active:           true,
        price_updated_at: hasPrices ? now : undefined,
        updated_at:       now,
      };
      if (hasPrices) {
        updatePayload.price_gasoline = entry.gasoline ?? null;
        updatePayload.price_diesel   = entry.diesel   ?? null;
        updatePayload.price_lpg      = entry.lpg      ?? null;
      }
      // undefined 키 제거
      Object.keys(updatePayload).forEach(k => updatePayload[k] === undefined && delete updatePayload[k]);

      const { error } = await sb.from("gas_stations").update(updatePayload).eq("id", existingId);
      if (error) skipped.push(`${s.OS_NM} (update 오류: ${error.message})`);
      else updated.push(s.OS_NM);
    } else {
      // 신규 INSERT
      sortCounter += 1;
      const insertPayload = {
        name:             s.OS_NM,
        opinet_id:        uniId,
        brand_code:       brandCode,
        brand_name:       BRAND_META[brandCode]?.name ?? "자가상표",
        area,
        address,
        lat:              wgs.lat,
        lng:              wgs.lng,
        is_self:          isSelf,
        is_alttul:        isAlttul,
        active:           true,
        sort_order:       sortCounter,
        price_gasoline:   entry.gasoline ?? null,
        price_diesel:     entry.diesel   ?? null,
        price_lpg:        entry.lpg      ?? null,
        price_updated_at: hasPrices ? now : null,
        created_at:       now,
        updated_at:       now,
      };
      const { error } = await sb.from("gas_stations").insert(insertPayload);
      if (error) skipped.push(`${s.OS_NM} (insert 오류: ${error.message})`);
      else inserted.push(s.OS_NM);
    }
  }

  // 5. Opinet에 없는 기존 레코드는 active=false 로 비활성화
  const activeOpinetIds = Array.from(stationMap.keys());
  const { error: deactivateErr } = await sb
    .from("gas_stations")
    .update({ active: false, updated_at: now })
    .not("opinet_id", "is", null)
    .not("opinet_id", "in", `(${activeOpinetIds.map(id => `"${id}"`).join(",")})`)
    .eq("active", true);

  return NextResponse.json({
    success: true,
    summary: {
      opinet_discovered: stationMap.size,
      inserted: inserted.length,
      updated:  updated.length,
      skipped:  skipped.length,
      radius_m: RADIUS_M,
      timestamp: now,
    },
    inserted,
    updated,
    skipped,
    deactivate_error: deactivateErr?.message ?? null,
  });
}
