/**
 * GET /api/admin/member-detail?userId=<uuid>&type=<type>
 *
 * 보안:
 *  1. httpOnly 세션 쿠키 검증 (gd_admin_session)
 *  2. userId는 UUID 형식만 허용 (SQL injection 불가)
 *  3. 모든 쿼리에 user_id = eq.<userId> 강제 적용 — 타 회원 데이터 열람 불가
 *  4. 허용된 type만 처리 (화이트리스트)
 *  5. 최대 100건 제한
 */
import { NextRequest, NextResponse } from "next/server";
import { validateAdminCookie } from "@/app/api/admin/auth/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://plwpfnbhyzblgvliiole.supabase.co";
const DEFAULT_KEY   = "sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk";

type DataType =
  | "coupons" | "points" | "posts" | "comments"
  | "saved_posts" | "fav_buses" | "fav_stores" | "fav_apts";

interface DataConfig {
  table: string;
  select: string;
  order: string;
  filterCol: string;   // user_id 컬럼명
}

const DATA_CONFIG: Record<DataType, DataConfig> = {
  coupons:    { table: "user_coupons",         filterCol: "user_id", order: "downloaded_at.desc", select: "id,coupon_id,store_name,title,discount,expiry,status,downloaded_at" },
  points:     { table: "user_point_history",   filterCol: "user_id", order: "created_at.desc",    select: "id,points,desc_text,created_at" },
  posts:      { table: "community_posts",      filterCol: "user_id", order: "created_at.desc",    select: "id,title,category,created_at,like_count,comment_count" },
  comments:   { table: "community_comments",   filterCol: "user_id", order: "created_at.desc",    select: "id,content,created_at,post_id" },
  saved_posts:{ table: "user_favorite_posts",  filterCol: "user_id", order: "created_at.desc",    select: "id,post_id,title,category,created_at" },
  fav_buses:  { table: "user_favorite_buses",  filterCol: "user_id", order: "created_at.desc",    select: "id,route_id,route_name,stop_name,created_at" },
  fav_stores: { table: "user_favorite_stores", filterCol: "user_id", order: "created_at.desc",    select: "id,store_id,store_name,building_name,created_at" },
  fav_apts:   { table: "user_favorite_apts",   filterCol: "user_id", order: "created_at.desc",    select: "id,apt_id,apt_name,dong,created_at" },
};

function apiHeaders(key: string): Record<string, string> {
  const h: Record<string, string> = { apikey: key };
  if (key.startsWith("eyJ")) h["Authorization"] = `Bearer ${key}`;
  return h;
}

export async function GET(req: NextRequest) {
  // ── 1. 세션 검증 ────────────────────────────────────────────
  if (!validateAdminCookie(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // ── 2. 파라미터 검증 ────────────────────────────────────────
  const userId = req.nextUrl.searchParams.get("userId") ?? "";
  const type   = req.nextUrl.searchParams.get("type") as DataType | null;

  if (!UUID_RE.test(userId)) {
    return NextResponse.json({ error: "유효하지 않은 회원 ID입니다." }, { status: 400 });
  }
  if (!type || !(type in DATA_CONFIG)) {
    return NextResponse.json({ error: "유효하지 않은 데이터 타입입니다." }, { status: 400 });
  }

  // ── 3. 데이터 조회 (user_id 강제 필터) ───────────────────────
  const cfg = DATA_CONFIG[type];
  const apiKey = process.env.SUPABASE_SERVICE_KEY
    ?? process.env.NEXT_PUBLIC_ADMIN_DB_KEY
    ?? DEFAULT_KEY;

  const url = new URL(`${SUPABASE_URL}/rest/v1/${cfg.table}`);
  url.searchParams.set("select", cfg.select);
  url.searchParams.set(cfg.filterCol, `eq.${userId}`);  // 강제 필터
  url.searchParams.set("order", cfg.order);
  url.searchParams.set("limit", "100");

  try {
    const res = await fetch(url.toString(), { headers: apiHeaders(apiKey) });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[member-detail] ${type}`, res.status, err.slice(0, 200));
      // 테이블이 없는 경우 빈 배열 반환 (마이그레이션 미적용 환경)
      if (res.status === 400 || res.status === 404) return NextResponse.json({ data: [] });
      return NextResponse.json({ error: err.slice(0, 200) }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json({ data: Array.isArray(data) ? data : [] });
  } catch (e) {
    console.error("[member-detail] fetch error", e);
    return NextResponse.json({ data: [] });
  }
}
