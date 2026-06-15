/**
 * POST /api/admin/add-gas-stations
 * scan-gas 결과에서 선택한 주유소를 gas_stations 테이블에 추가
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAdminCookie } from "@/app/api/admin/auth/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BRAND_META: Record<string, { name: string }> = {
  SKE: { name: "SK에너지" }, GSC: { name: "GS칼텍스" },
  HDO: { name: "현대오일뱅크" }, SOL: { name: "S-OIL" },
  RTO: { name: "알뜰주유소" }, RTX: { name: "고속도로알뜰" },
  NHO: { name: "농협알뜰" }, ETC: { name: "자가상표" },
};

const AREA_PATTERNS: [RegExp, string][] = [
  [/마전동/, "마전동"], [/당하동/, "당하동"], [/원당동/, "원당동"],
  [/금곡동/, "금곡동"], [/왕길동/, "왕길동"], [/오류동/, "오류동"],
  [/불로동/, "불로동"], [/대곡동/, "대곡동"], [/백석동/, "백석동"],
  [/검단동/, "검단동"], [/김포/, "김포"], [/서구/, "서구"],
];

function extractArea(address: string): string {
  for (const [p, area] of AREA_PATTERNS) {
    if (p.test(address)) return area;
  }
  return "인근";
}

interface ScanStation {
  uniId: string; name: string; brandCode: string;
  address: string; lat: number | null; lng: number | null;
  isSelf: boolean; gasoline: number | null; diesel: number | null; lpg: number | null;
}

export async function POST(req: NextRequest) {
  if (!validateAdminCookie(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || "";
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "환경변수 누락" }, { status: 500 });
  }
  const sb = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let body: { stations?: ScanStation[] };
  try { body = await req.json() as { stations?: ScanStation[] }; }
  catch { return NextResponse.json({ error: "요청 파싱 실패" }, { status: 400 }); }

  const stations = body.stations ?? [];
  if (stations.length === 0) return NextResponse.json({ error: "stations 없음" }, { status: 400 });

  // 기존 sort_order 최대값 조회
  const { data: maxRow } = await sb.from("gas_stations").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  let sortOrder = (maxRow?.[0]?.sort_order as number ?? 0);

  const now = new Date().toISOString();
  let inserted = 0;
  const errors: string[] = [];

  for (const s of stations) {
    sortOrder += 1;
    const hasPrices = (s.gasoline ?? 0) > 0 || (s.diesel ?? 0) > 0 || (s.lpg ?? 0) > 0;
    const { error } = await sb.from("gas_stations").upsert({
      name: s.name,
      opinet_id: s.uniId,
      brand_code: s.brandCode,
      brand_name: BRAND_META[s.brandCode]?.name ?? "자가상표",
      area: extractArea(s.address),
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      is_self: s.isSelf,
      is_alttul: ["RTO","RTX","NHO"].includes(s.brandCode),
      active: true,
      sort_order: sortOrder,
      price_gasoline: s.gasoline ?? null,
      price_diesel: s.diesel ?? null,
      price_lpg: s.lpg ?? null,
      price_updated_at: hasPrices ? now : null,
      created_at: now,
      updated_at: now,
    }, { onConflict: "opinet_id", ignoreDuplicates: false });

    if (error) errors.push(`${s.name}: ${error.message}`);
    else inserted++;
  }

  return NextResponse.json({ success: true, inserted, errors: errors.length > 0 ? errors : undefined });
}
