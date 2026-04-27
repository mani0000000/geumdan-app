import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TABLES = new Set([
  "banners", "buildings", "floors", "stores", "store_coupons", "store_openings",
  "pharmacies", "emergency_rooms", "community_posts", "community_comments", "news_articles",
  "apartments", "apartment_sizes", "apartment_price_history", "apt_price_index",
  "home_widget_config", "places", "search_keywords", "marts",
  "site_settings", "youtube_videos", "instagram_posts", "sports_matches",
]);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";
const DEFAULT_ANON  = "sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk";

// 서버 인스턴스 내 작동 확인된 키 캐시 (재시작 시 초기화)
let _cachedKey: string | null = null;

function candidateKeys(): string[] {
  return [
    process.env.SUPABASE_SERVICE_KEY,
    process.env.NEXT_PUBLIC_ADMIN_DB_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    DEFAULT_ANON,
  ].filter((k): k is string => typeof k === "string" && k.length > 10);
}

function makeHeaders(key: string, prefer?: string): Record<string, string> {
  const h: Record<string, string> = { "apikey": key, "Content-Type": "application/json" };
  if (prefer) h["Prefer"] = prefer;
  if (key.startsWith("eyJ")) h["Authorization"] = `Bearer ${key}`;
  return h;
}

async function callSupabase(
  method: string,
  path: string,
  body?: string,
  prefer?: string,
): Promise<Response> {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;

  // 캐시된 키 우선 시도
  if (_cachedKey) {
    const res = await fetch(url, {
      method,
      headers: makeHeaders(_cachedKey, prefer),
      body: method !== "GET" ? body : undefined,
    });
    if (res.status !== 401) return res;
    // 401이면 키 무효화, 재탐색
    console.warn("[admin/db] 캐시 키 401 — 재탐색:", _cachedKey.slice(0, 20));
    _cachedKey = null;
  }

  // 후보 키 순서대로 시도
  const keys = candidateKeys();
  for (const key of keys) {
    const res = await fetch(url, {
      method,
      headers: makeHeaders(key, prefer),
      body: method !== "GET" ? body : undefined,
    });
    if (res.status !== 401) {
      _cachedKey = key;
      console.log("[admin/db] 키 확정:", key.slice(0, 20) + "...");
      return res;
    }
    console.warn("[admin/db] 키 401:", key.slice(0, 20));
  }

  // 모든 키 실패 시 마지막 응답 반환 (401)
  return fetch(url, {
    method,
    headers: makeHeaders(keys.at(-1) ?? DEFAULT_ANON, prefer),
    body: method !== "GET" ? body : undefined,
  });
}

// GET /api/admin/db?table=banners&select=*&order=sort_order&eq=active.eq.true
export async function GET(req: NextRequest) {
  const table = req.nextUrl.searchParams.get("table");
  if (!table || !ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: "허용되지 않은 테이블" }, { status: 400 });
  }

  const select = req.nextUrl.searchParams.get("select") || "*";
  const order  = req.nextUrl.searchParams.get("order");
  const eq     = req.nextUrl.searchParams.get("eq");
  const limit  = req.nextUrl.searchParams.get("limit");

  let path = `${table}?select=${encodeURIComponent(select)}`;
  if (order) path += `&order=${encodeURIComponent(order)}`;
  if (eq)    path += `&${eq}`;
  if (limit) path += `&limit=${limit}`;

  const res = await callSupabase("GET", path);
  if (!res.ok) {
    const err = await res.text();
    console.error("[admin/db GET]", table, res.status, err.slice(0, 200));
    return NextResponse.json({ error: `${res.status} — ${err.slice(0, 200)}` }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json({ data });
}

// POST /api/admin/db  { table, method, rows, onConflict, eq }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.table || !ALLOWED_TABLES.has(body.table)) {
    return NextResponse.json({ error: "허용되지 않은 테이블" }, { status: 400 });
  }

  const { table, method = "POST", rows, onConflict, eq } = body as {
    table: string; method?: string; rows?: unknown; onConflict?: string; eq?: string;
  };

  let path   = table;
  const prefer = onConflict ? "resolution=merge-duplicates,return=minimal" : "return=minimal";
  if (onConflict) path += `?on_conflict=${onConflict}`;
  if (eq) path += (path.includes("?") ? "&" : "?") + eq;

  // PGRST204: 스키마 캐시에 없는 컬럼 — 해당 컬럼 제거 후 재시도 (최대 10회)
  let currentRows = rows;
  const skipped: string[] = [];

  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await callSupabase(method, path, JSON.stringify(currentRows), prefer);
    if (res.ok) {
      return NextResponse.json({ success: true, skippedColumns: skipped.length ? skipped : undefined });
    }

    const errText = await res.text();

    // PGRST204 + 컬럼명 파싱 — 해당 컬럼 제거 후 재시도
    if (errText.includes("PGRST204") && method === "POST" && Array.isArray(currentRows)) {
      const match = errText.match(/'([^']+)' column/);
      const col = match?.[1];
      if (col) {
        console.warn(`[admin/db] PGRST204: '${col}' 컬럼 없음 — 제외 후 재시도`);
        skipped.push(col);
        currentRows = (currentRows as Record<string, unknown>[]).map(r => {
          const copy = { ...r };
          delete copy[col];
          return copy;
        });
        continue;
      }
    }

    console.error("[admin/db POST]", table, method, res.status, errText.slice(0, 200));
    return NextResponse.json({ error: `${res.status} — ${errText.slice(0, 200)}` }, { status: res.status });
  }

  return NextResponse.json({ error: "너무 많은 컬럼 오류" }, { status: 500 });
}
