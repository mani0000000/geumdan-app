/**
 * POST /api/admin/naver-sync
 *
 * 네이버 로컬 검색 API를 이용해 건물 내 매장을 검색하고
 * stores 테이블에 upsert한다.
 *
 * 네이버 Local Search API:
 *  - Endpoint: GET https://openapi.naver.com/v1/search/local.json
 *  - 인증: X-Naver-Client-Id / X-Naver-Client-Secret 헤더
 *  - 키워드 기반 검색 (좌표 반경 지원 없음) → 건물명으로 검색 후 주소 매칭 필터
 *  - 페이지당 최대 5개, pageable_count 최대 100건
 *
 * 필요 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAdminCookie } from "@/app/api/admin/auth/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── 카테고리 매핑 ────────────────────────────────────────────────────────────
function normalizeCategory(catString: string): string {
  const c = catString ?? "";
  if (c.includes("카페") || c.includes("커피")) return "카페";
  if (c.includes("미용") || c.includes("헤어") || c.includes("네일") || c.includes("뷰티")) return "미용";
  if (c.includes("학원") || c.includes("교습") || c.includes("교육")) return "학원";
  if (c.includes("약국")) return "병원/약국";
  if (c.includes("병원") || c.includes("의원") || c.includes("치과") || c.includes("한의") || c.includes("안과") || c.includes("피부과")) return "병원/약국";
  if (c.includes("마트") || c.includes("슈퍼마켓")) return "마트";
  if (c.includes("편의점")) return "편의점";
  if (c.includes("음식") || c.includes("식당") || c.includes("한식") || c.includes("일식") || c.includes("중식") || c.includes("분식") || c.includes("치킨") || c.includes("피자") || c.includes("패스트푸드")) return "음식점";
  if (c.includes("헬스") || c.includes("피트니스") || c.includes("필라테스") || c.includes("요가") || c.includes("크로스핏")) return "헬스/운동";
  if (c.includes("세탁")) return "세탁";
  if (c.includes("반려동물") || c.includes("애견") || c.includes("펫샵")) return "반려동물";
  if (c.includes("베이커리") || c.includes("빵") || c.includes("제과")) return "베이커리";
  if (c.includes("안경")) return "안경원";
  if (c.includes("꽃")) return "꽃집";
  if (c.includes("스터디")) return "스터디카페";
  if (c.includes("공인중개") || c.includes("부동산")) return "부동산";
  return "기타";
}

// HTML 태그 제거 (<b>매장명</b> → 매장명)
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim();
}

// ── 네이버 Local Search API 호출 ─────────────────────────────────────────────
interface NaverPlace {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
}

interface NaverSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverPlace[];
}

async function naverSearch(
  query: string,
  clientId: string,
  clientSecret: string,
  start = 1
): Promise<NaverSearchResponse> {
  const params = new URLSearchParams({
    query,
    display: "5",
    start: String(start),
    sort: "comment",
  });
  const res = await fetch(
    `https://openapi.naver.com/v1/search/local.json?${params}`,
    {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`네이버 API 오류 ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<NaverSearchResponse>;
}

async function naverSearchAll(
  query: string,
  clientId: string,
  clientSecret: string,
  maxResults = 50
): Promise<NaverPlace[]> {
  const all: NaverPlace[] = [];
  let start = 1;
  while (all.length < maxResults) {
    const res = await naverSearch(query, clientId, clientSecret, start);
    all.push(...(res.items ?? []));
    if (all.length >= res.total || res.items.length === 0) break;
    start += res.display;
    await new Promise(r => setTimeout(r, 200));
  }
  return all.slice(0, maxResults);
}

// ── 주소 유사도 매칭 ──────────────────────────────────────────────────────────
function addressMatch(naverAddr: string, buildingName: string, buildingAddr: string): boolean {
  const a = naverAddr.toLowerCase();
  const name = buildingName.toLowerCase();
  const addr = (buildingAddr ?? "").toLowerCase();

  // 건물명이 주소에 포함
  if (name.length > 3 && a.includes(name.slice(0, 4))) return true;

  // 도로명 주소의 번지 부분 매칭 (예: "이음대로 384")
  const roadMatch = addr.match(/[가-힣]+로\s*\d+|[가-힣]+길\s*\d+/);
  if (roadMatch && a.includes(roadMatch[0].replace(/\s/g, ""))) return true;
  if (roadMatch && a.includes(roadMatch[0])) return true;

  return false;
}

// ── 메인 핸들러 ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!validateAdminCookie(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const naverClientId     = process.env.NAVER_CLIENT_ID ?? "";
  const naverClientSecret = process.env.NAVER_CLIENT_SECRET ?? "";

  if (!naverClientId || !naverClientSecret) {
    return NextResponse.json({
      error: "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 없습니다.",
      hint: "Vercel → Settings → Environment Variables에서 추가하세요. (https://developers.naver.com → 애플리케이션 등록)",
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

  let body: { building_id?: string };
  try {
    body = await req.json() as { building_id?: string };
  } catch {
    return NextResponse.json({ error: "요청 본문 파싱 실패" }, { status: 400 });
  }

  const { building_id } = body;
  if (!building_id) {
    return NextResponse.json({ error: "building_id 필요" }, { status: 400 });
  }

  // 1. 건물 조회
  const { data: bld, error: bErr } = await sb
    .from("buildings")
    .select("id, name, address, lat, lng")
    .eq("id", building_id)
    .single();

  if (bErr || !bld) {
    return NextResponse.json({ error: "건물을 찾을 수 없습니다." }, { status: 404 });
  }

  // 2. 네이버 검색 — 건물명으로 검색
  const query = `${bld.name} 상가`;
  let rawPlaces: NaverPlace[] = [];
  try {
    rawPlaces = await naverSearchAll(query, naverClientId, naverClientSecret, 50);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "네이버 API 호출 실패", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }

  // 3. 주소 기반 필터링 (동일 건물 매장만)
  const filtered = rawPlaces.filter(p => {
    const addr = p.roadAddress || p.address;
    return addressMatch(addr, bld.name as string, bld.address as string);
  });

  // 필터링 결과가 너무 적으면 건물명만으로 재검색
  let places = filtered;
  if (filtered.length === 0) {
    // 건물명만 단순 검색
    try {
      const simple = await naverSearchAll(bld.name as string, naverClientId, naverClientSecret, 30);
      places = simple.filter(p => {
        const addr = p.roadAddress || p.address;
        return addr && (addr.includes(bld.name as string) || addr.includes("이음대로"));
      });
    } catch {
      places = [];
    }
  }

  if (places.length === 0) {
    return NextResponse.json({
      success: true,
      inserted: 0,
      raw_count: rawPlaces.length,
      message: `네이버 검색에서 이 건물의 매장을 찾지 못했습니다. (전체 ${rawPlaces.length}건 중 주소 매칭 0건)`,
    });
  }

  // 4. 기존 네이버 ID 중복 확인 (URL 기반)
  const naverIds = places.map(p => `naver_${building_id}_${encodeNaverId(p.link)}`);
  const { data: existingRows } = await sb
    .from("stores")
    .select("id")
    .in("id", naverIds);
  const existingIds = new Set((existingRows ?? []).map((r: { id: string }) => r.id));

  // 5. stores 행 생성
  const rows = places.map(p => ({
    id:          `naver_${building_id}_${encodeNaverId(p.link)}`,
    building_id,
    name:        stripHtml(p.title),
    category:    normalizeCategory(p.category),
    floor_label: "1F",
    phone:       p.telephone || null,
    hours:       null,
    is_open:     true,
    is_premium:  false,
    x: 0, y: 0, w: 10, h: 10,
    description: p.description ? stripHtml(p.description) : null,
    extra_info: {
      naver_url:       p.link || null,
      naver_category:  p.category || null,
      address:         p.roadAddress || p.address || null,
    },
  }));

  const { error: uErr } = await sb
    .from("stores")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: false });

  if (uErr) {
    return NextResponse.json({ error: `DB 저장 실패: ${uErr.message}` }, { status: 500 });
  }

  // 6. 건물 갱신
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
    raw_count: rawPlaces.length,
    message:  `${places.length}개 매장 동기화 완료 (신규 ${newCount}개, 전체 검색 ${rawPlaces.length}건)`,
  });
}

function encodeNaverId(link: string): string {
  // 네이버 지도 URL에서 고유 ID 추출 또는 URL 해시
  const m = link.match(/\/(\d+)(?:\?|$)/);
  if (m) return m[1];
  // 폴백: URL을 짧은 해시로
  let h = 0;
  for (let i = 0; i < link.length; i++) h = (Math.imul(31, h) + link.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
