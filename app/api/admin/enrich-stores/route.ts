/**
 * POST /api/admin/enrich-stores
 *
 * 이미 카카오 sync된 매장의 kakao_url을 이용해
 * 카카오 플레이스 상세 API에서 영업시간·메뉴·키워드 등을 가져와
 * stores 테이블의 hours / extra_info 를 보완한다.
 *
 * Body: { building_id: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAdminCookie } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── 카카오 플레이스 상세 응답 타입 (주요 필드만) ─────────────────────────────
interface KakaoTimeItem {
  beginTime?: string;
  endTime?: string;
  dayOfWeek?: string;
}
interface KakaoPeriod {
  periodName?: string;
  timeList?: KakaoTimeItem[];
}
interface KakaoMenuItem {
  menu?: string;
  price?: string;
}
interface KakaoPlaceDetail {
  basicInfo?: {
    placenamefull?: string;
    phoneNum?: string;
    openHour?: {
      periodList?: KakaoPeriod[];
      isClosedToday?: boolean;
    };
    menuInfo?: {
      menuList?: KakaoMenuItem[];
    };
    tags?: string[];
    homepageList?: Array<{ homepage?: string }>;
    blogrvwcnt?: number;
    visitorReviewCnt?: number;
    catname?: string;
  };
}

function formatTime(t: string | undefined): string {
  if (!t || t.length < 4) return t ?? "";
  return `${t.slice(0, 2)}:${t.slice(2, 4)}`;
}

function parseHours(openHour: NonNullable<KakaoPlaceDetail["basicInfo"]>["openHour"]): string | null {
  if (!openHour?.periodList?.length) return null;
  const lines: string[] = [];
  for (const period of openHour.periodList) {
    if (!period.timeList?.length) continue;
    const times = period.timeList
      .map(t => `${formatTime(t.beginTime)}~${formatTime(t.endTime)}`)
      .filter(Boolean)
      .join(", ");
    const label = period.periodName ? `${period.periodName} ` : "";
    if (times) lines.push(`${label}${times}`);
  }
  return lines.join("\n") || null;
}

function extractPlaceId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:place\.map\.kakao\.com\/|kakao\.com\/place\/)(\d+)/);
  return m ? m[1] : null;
}

async function fetchKakaoDetail(placeId: string): Promise<KakaoPlaceDetail | null> {
  try {
    const res = await fetch(`https://place.map.kakao.com/main/v/${placeId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        "Referer": "https://map.kakao.com/",
        "Accept": "application/json, text/plain, */*",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    // 응답이 HTML이면 JSON 파싱 스킵
    if (text.trimStart().startsWith("<")) return null;
    return JSON.parse(text) as KakaoPlaceDetail;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!validateAdminCookie(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || "";
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "환경변수 누락: SUPABASE_URL, SUPABASE_SERVICE_KEY" }, { status: 500 });
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: { building_id?: string };
  try { body = await req.json() as { building_id?: string }; }
  catch { return NextResponse.json({ error: "요청 본문 파싱 실패" }, { status: 400 }); }

  const { building_id } = body;
  if (!building_id) {
    return NextResponse.json({ error: "building_id 필요" }, { status: 400 });
  }

  // 1. 카카오 URL이 있는 매장 목록 조회
  const { data: stores, error: sErr } = await sb
    .from("stores")
    .select("id, name, hours, extra_info")
    .eq("building_id", building_id)
    .not("extra_info->kakao_url", "is", null);

  if (sErr || !stores?.length) {
    return NextResponse.json({
      success: true,
      enriched: 0,
      total: 0,
      message: "카카오 URL이 있는 매장이 없습니다. 먼저 카카오 자동 조회를 실행하세요.",
    });
  }

  let enriched = 0;
  let failed = 0;
  const details: string[] = [];

  for (const store of stores) {
    const extra = (store.extra_info ?? {}) as Record<string, unknown>;
    const placeId = extractPlaceId(extra.kakao_url as string | null);
    if (!placeId) { failed++; continue; }

    const detail = await fetchKakaoDetail(placeId);
    if (!detail?.basicInfo) { failed++; continue; }

    const info = detail.basicInfo;
    const hours = parseHours(info.openHour) ?? (store.hours as string | null);
    const tags = (info.tags ?? []).slice(0, 8);
    const menus = (info.menuInfo?.menuList ?? [])
      .slice(0, 5)
      .map(m => m.price ? `${m.menu} ${m.price}` : m.menu)
      .filter(Boolean)
      .join(", ");
    const homepage = info.homepageList?.[0]?.homepage ?? null;

    const updatedExtra: Record<string, unknown> = {
      ...extra,
      ...(tags.length > 0 ? { keywords: tags } : {}),
      ...(menus ? { menu_highlights: menus } : {}),
      ...(homepage ? { sns_website: homepage } : {}),
    };

    const { error: uErr } = await sb
      .from("stores")
      .update({
        ...(hours ? { hours } : {}),
        extra_info: updatedExtra,
      })
      .eq("id", store.id);

    if (uErr) { failed++; continue; }

    enriched++;
    const note: string[] = [];
    if (hours) note.push("영업시간");
    if (tags.length > 0) note.push("키워드");
    if (menus) note.push("메뉴");
    if (homepage) note.push("웹사이트");
    details.push(`${store.name}: ${note.join("·") || "변경없음"}`);

    await new Promise(r => setTimeout(r, 250));
  }

  return NextResponse.json({
    success: true,
    total: stores.length,
    enriched,
    failed,
    message: `${stores.length}개 매장 중 ${enriched}개 상세정보 보완 완료`,
    details: details.slice(0, 20),
  });
}
