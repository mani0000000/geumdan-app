/**
 * POST /api/admin/scan-gas
 *
 * 오피넷 aroundAll.do API를 여러 중심점에서 호출해
 * 인천 서구 + 김포시 권역 주유소를 전수 조회한다.
 * DB에 저장하지 않고 후보 목록만 반환.
 *
 * Body: {} (없어도 됨)
 * Response: { stations: [...], total, timestamp }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { wgs84ToKatec, katecToWgs84, SCAN_CENTERS } from "@/lib/api/opinet";
import { validateAdminCookie } from "@/app/api/admin/auth/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const OPINET_FALLBACK_KEY = "F260518486";
const RADIUS_M = 20000;
const PRODCD = { gasoline: "B027", diesel: "D047", lpg: "K015" } as const;

interface OpinetStation {
  UNI_ID: string;
  OS_NM: string;
  POLL_DIV_CD: string;
  PRICE: number;
  GIS_X_COOR?: number;
  GIS_Y_COOR?: number;
  NEW_ADR?: string;
  VAN_ADR?: string;
}

async function fetchOpinet(
  lat: number, lng: number, prodcd: string, apiKey: string
): Promise<OpinetStation[]> {
  const { x, y } = wgs84ToKatec(lat, lng);
  const url = `https://www.opinet.co.kr/api/aroundAll.do?code=${apiKey}` +
    `&x=${x}&y=${y}&radius=${RADIUS_M}&prodcd=${prodcd}&sort=1&out=json`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    return (json?.RESULT?.OIL ?? []) as OpinetStation[];
  } catch { return []; }
}

// 검단+인천 서구+김포 해당 여부 판단
function isTargetArea(address: string): boolean {
  if (!address) return false;
  // 검단 법정동 9개
  const GEUMDAN_DONGS = ["마전동","당하동","원당동","불로동","대곡동","금곡동","오류동","왕길동","백석동","검단동"];
  if (GEUMDAN_DONGS.some(d => address.includes(d))) return true;
  // 인천 서구 (전체)
  if (address.includes("인천") && address.includes("서구")) return true;
  // 경기 김포
  if (address.includes("김포")) return true;
  return false;
}

const BRAND_META: Record<string, { name: string }> = {
  SKE: { name: "SK에너지" }, GSC: { name: "GS칼텍스" },
  HDO: { name: "현대오일뱅크" }, SOL: { name: "S-OIL" },
  RTO: { name: "알뜰주유소" }, RTX: { name: "고속도로알뜰" },
  NHO: { name: "농협알뜰" }, ETC: { name: "자가상표" },
};

export async function POST(req: NextRequest) {
  if (!validateAdminCookie(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || "";
  const apiKey = (process.env.OPINET_API_KEY || OPINET_FALLBACK_KEY).trim();

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "환경변수 누락" }, { status: 500 });
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. 여러 중심점에서 3가지 유종 병렬 호출
  const seen = new Map<string, {
    name: string; brandCode: string; brandName: string;
    address: string; lat: number | null; lng: number | null;
    gasoline?: number; diesel?: number; lpg?: number;
    uniId: string; isSelf: boolean;
  }>();

  for (const center of SCAN_CENTERS) {
    const [g, d, l] = await Promise.all([
      fetchOpinet(center.lat, center.lng, PRODCD.gasoline, apiKey),
      fetchOpinet(center.lat, center.lng, PRODCD.diesel, apiKey),
      fetchOpinet(center.lat, center.lng, PRODCD.lpg, apiKey),
    ]);

    for (const [list, fuelKey] of [[g, "gasoline"], [d, "diesel"], [l, "lpg"]] as const) {
      for (const s of list as OpinetStation[]) {
        if (!s.UNI_ID) continue;
        if (!seen.has(s.UNI_ID)) {
          const wgs = s.GIS_X_COOR && s.GIS_Y_COOR
            ? katecToWgs84(s.GIS_X_COOR, s.GIS_Y_COOR)
            : null;
          seen.set(s.UNI_ID, {
            uniId: s.UNI_ID,
            name: s.OS_NM,
            brandCode: BRAND_META[s.POLL_DIV_CD] ? s.POLL_DIV_CD : "ETC",
            brandName: BRAND_META[s.POLL_DIV_CD]?.name ?? "자가상표",
            address: s.NEW_ADR || s.VAN_ADR || "",
            lat: wgs?.lat ?? null,
            lng: wgs?.lng ?? null,
            isSelf: /셀프/i.test(s.OS_NM),
          });
        }
        const entry = seen.get(s.UNI_ID)!;
        if (s.PRICE > 0) entry[fuelKey] = s.PRICE;
        // 좌표 없으면 이 레코드에서 보완
        if (!entry.lat && s.GIS_X_COOR && s.GIS_Y_COOR) {
          const wgs = katecToWgs84(s.GIS_X_COOR, s.GIS_Y_COOR);
          if (wgs) { entry.lat = wgs.lat; entry.lng = wgs.lng; }
        }
      }
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // 2. 기존 DB opinet_id 목록 (이미 등록 여부 표시용)
  const { data: existingRows } = await sb.from("gas_stations").select("opinet_id");
  const existingIds = new Set((existingRows ?? []).map(r => r.opinet_id as string).filter(Boolean));

  // 3. 결과 변환 — 주소 기반 타겟 지역 여부 표시
  const stations = Array.from(seen.values()).map(s => ({
    uniId: s.uniId,
    name: s.name,
    brandCode: s.brandCode,
    brandName: s.brandName,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    isSelf: s.isSelf,
    gasoline: s.gasoline ?? null,
    diesel: s.diesel ?? null,
    lpg: s.lpg ?? null,
    isTargetArea: isTargetArea(s.address),
    alreadyInDb: existingIds.has(s.uniId),
  }));

  // 주소 기반 타겟 지역 우선 정렬
  stations.sort((a, b) => {
    if (a.isTargetArea && !b.isTargetArea) return -1;
    if (!a.isTargetArea && b.isTargetArea) return 1;
    return a.name.localeCompare(b.name, "ko");
  });

  return NextResponse.json({
    success: true,
    total: stations.length,
    targetCount: stations.filter(s => s.isTargetArea).length,
    stations,
    timestamp: new Date().toISOString(),
  });
}
