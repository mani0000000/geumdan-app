/**
 * POST /api/admin/kakao-sync
 *
 * 건물 좌표를 기준으로 카카오 로컬 검색 API를 호출하여
 * 반경 내 매장을 조회하고 stores 테이블에 upsert한다.
 *
 * Body: { building_id: string, radius?: number (기본 150m) }
 * Response: { success, inserted, total, message }
 *
 * 필요 환경변수: KAKAO_REST_API_KEY
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAdminCookie } from "@/app/api/admin/auth/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── 카테고리 매핑 ────────────────────────────────────────────────────────────
const GROUP_MAP: Record<string, string> = {
  CE7: "카페",
  FD6: "음식점",
  CS2: "편의점",
  MT1: "마트",
  HP8: "병원/약국",
  PM9: "병원/약국",
  AG2: "부동산",
  BK9: "기타",
  CT1: "기타",
  PK6: "기타",
  OL7: "기타",
  SW8: "기타",
  AT4: "기타",
  AD5: "기타",
  ETC: "기타",
};

function normalizeCategory(catName: string, groupCode: string): string {
  if (GROUP_MAP[groupCode]) return GROUP_MAP[groupCode];
  const c = catName ?? "";
  if (c.includes("카페") || c.includes("커피")) return "카페";
  if (c.includes("미용") || c.includes("헤어") || c.includes("네일") || c.includes("뷰티")) return "미용";
  if (c.includes("학원") || c.includes("교습") || c.includes("교육")) return "학원";
  if (c.includes("약국") || c.includes("병원") || c.includes("의원") || c.includes("치과") || c.includes("한의") || c.includes("안과") || c.includes("피부")) return "병원/약국";
  if (c.includes("마트") || c.includes("슈퍼") || c.includes("식료품")) return "마트";
  if (c.includes("편의점")) return "편의점";
  if (c.includes("음식") || c.includes("식당") || c.includes("한식") || c.includes("일식") || c.includes("중식") || c.includes("양식") || c.includes("분식") || c.includes("치킨") || c.includes("피자")) return "음식점";
  if (c.includes("헬스") || c.includes("피트니스") || c.includes("필라테스") || c.includes("요가") || c.includes("크로스핏")) return "헬스/운동";
  if (c.includes("세탁")) return "세탁";
  if (c.includes("반려동물") || c.includes("애견") || c.includes("펫")) return "반려동물";
  if (c.includes("베이커리") || c.includes("빵") || c.includes("제과")) return "베이커리";
  if (c.includes("안경")) return "안경원";
  if (c.includes("꽃")) return "꽃집";
  if (c.includes("스터디")) return "스터디카페";
  if (c.includes("중개") || c.includes("부동산")) return "부동산";
  return "기타";
}

// ── Kakao 로컬 검색 ──────────────────────────────────────────────────────────
interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  phone: string;
  road_address_name: string;
  address_name: string;
  x: string; // longitude
  y: string; // latitude
  place_url: string;
}

async function kakaoSearch(
  query: string,
  lng: number,
  lat: number,
  radius: number,
  apiKey: string
): Promise<KakaoPlace[]> {
  const results: KakaoPlace[] = [];
  for (let page = 1; page <= 3; page++) {
    const params = new URLSearchParams({
      query,
      x: String(lng),
      y: String(lat),
      radius: String(radius),
      page: String(page),
      size: "15",
      sort: "distance",
    });
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
      {
        headers: { Authorization: `KakaoAK ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`카카오 API 오류 ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json() as { documents: KakaoPlace[]; meta: { is_end: boolean } };
    results.push(...(data.documents ?? []));
    if (data.meta?.is_end) break;
    await new Promise(r => setTimeout(r, 200));
  }
  return results;
}

// ── 메인 핸들러 ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!validateAdminCookie(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const kakaoKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoKey) {
    return NextResponse.json({
      error: "KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.",
      hint: "Vercel → Project Settings → Environment Variables에서 KAKAO_REST_API_KEY를 추가하세요. (https://developers.kakao.com 에서 무료로 발급)",
    }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY || "";
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "환경변수 누락: SUPABASE_URL, SUPABASE_SERVICE_KEY" }, { status: 500 });
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: { building_id?: string; radius?: number };
  try {
    body = await req.json() as { building_id?: string; radius?: number };
  } catch {
    return NextResponse.json({ error: "요청 본문 파싱 실패" }, { status: 400 });
  }

  const { building_id, radius = 150 } = body;
  if (!building_id) {
    return NextResponse.json({ error: "building_id 필요" }, { status: 400 });
  }

  // 1. 건물 조회
  const { data: bld, error: bErr } = await sb
    .from("buildings")
    .select("id, name, lat, lng")
    .eq("id", building_id)
    .single();

  if (bErr || !bld) {
    return NextResponse.json({ error: "건물을 찾을 수 없습니다." }, { status: 404 });
  }
  if (!bld.lat || !bld.lng) {
    return NextResponse.json({
      error: "건물에 좌표(lat/lng)가 없습니다.",
      hint: "어드민 → 건물 기본정보 탭에서 위도·경도를 먼저 입력해 주세요.",
    }, { status: 400 });
  }

  // 2. Kakao 검색 — 건물명 + 필요 시 변형 키워드
  const queries = [bld.name as string];
  // "서영아너시티3차플러스" → "서영아너시티" 등 짧은 버전으로도 검색
  const stripped = (bld.name as string)
    .replace(/[0-9]+차/g, "")
    .replace(/플러스|A동|B동|상가|타운|센터|스퀘어/g, "")
    .trim();
  if (stripped && stripped !== bld.name) queries.push(stripped);

  const seen = new Map<string, KakaoPlace>();
  const errors: string[] = [];

  for (const q of queries) {
    try {
      const places = await kakaoSearch(q, bld.lng as number, bld.lat as number, radius, kakaoKey);
      for (const p of places) {
        if (!seen.has(p.id)) seen.set(p.id, p);
      }
    } catch (e: unknown) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
    await new Promise(r => setTimeout(r, 300));
  }

  if (errors.length > 0 && seen.size === 0) {
    return NextResponse.json({ error: "카카오 API 호출 실패", detail: errors }, { status: 502 });
  }

  const places = [...seen.values()];
  if (places.length === 0) {
    return NextResponse.json({
      success: true,
      inserted: 0,
      message: "검색 결과가 없습니다. 건물명을 바꿔 보거나 반경(radius)을 늘려보세요.",
    });
  }

  // 3. 기존 카카오 매장 ID 조회 (중복 확인)
  const kakaoIds = places.map(p => `kakao_${building_id}_${p.id}`);
  const { data: existing } = await sb
    .from("stores")
    .select("id")
    .in("id", kakaoIds);
  const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id));

  // 4. 신규 매장만 insert (upsert로 기존 수동 편집값 보존)
  const rows = places.map(p => ({
    id:          `kakao_${building_id}_${p.id}`,
    building_id,
    name:        p.place_name,
    category:    normalizeCategory(p.category_name, p.category_group_code),
    floor_label: "1F",
    phone:       p.phone || null,
    hours:       null,
    is_open:     true,
    is_premium:  false,
    x:           0,
    y:           0,
    w:           10,
    h:           10,
    description: null,
    extra_info: {
      kakao_url:       p.place_url || null,
      kakao_category:  p.category_name || null,
      address:         p.road_address_name || p.address_name || null,
    },
  }));

  const { error: uErr } = await sb
    .from("stores")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: false });

  if (uErr) {
    return NextResponse.json({ error: `DB 저장 실패: ${uErr.message}` }, { status: 500 });
  }

  // 5. 건물 has_data / total_stores 갱신
  const { count } = await sb
    .from("stores")
    .select("id", { count: "exact", head: true })
    .eq("building_id", building_id)
    .neq("name", "공실");

  await sb
    .from("buildings")
    .update({ has_data: true, total_stores: count ?? rows.length })
    .eq("id", building_id);

  const newCount = rows.filter(r => !existingIds.has(r.id)).length;

  return NextResponse.json({
    success: true,
    total:    places.length,
    inserted: newCount,
    updated:  rows.length - newCount,
    message:  `${places.length}개 매장 동기화 완료 (신규 ${newCount}개 추가)`,
    errors:   errors.length > 0 ? errors : undefined,
  });
}
