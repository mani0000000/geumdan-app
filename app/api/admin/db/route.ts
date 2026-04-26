import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allowlist of tables admin can read/write
const ALLOWED_TABLES = new Set([
  "banners", "buildings", "floors", "stores", "store_coupons", "store_openings",
  "pharmacies", "emergency_rooms", "community_posts", "community_comments", "news_articles",
  "apartments", "apartment_sizes", "apartment_price_history", "apt_price_index",
  "home_widget_config", "places", "search_keywords", "marts",
  "site_settings", "youtube_videos", "instagram_posts",
]);

function getKey() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk";
  // Only use SUPABASE_SERVICE_KEY (server-only) if set; ignore NEXT_PUBLIC_ADMIN_DB_KEY which may be stale
  const key = process.env.SUPABASE_SERVICE_KEY || anonKey;
  return { url, key };
}

async function pgrest(
  supabaseUrl: string,
  serviceKey: string,
  method: string,
  path: string,
  body?: string,
  prefer?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    "apikey": serviceKey,
    "Content-Type": "application/json",
  };
  if (prefer) headers["Prefer"] = prefer;
  // Bearer only for old JWT keys; new sb_* keys work via apikey header only
  if (serviceKey.startsWith("eyJ")) headers["Authorization"] = `Bearer ${serviceKey}`;
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers,
    body: method !== "GET" ? body : undefined,
  });
}

// GET /api/admin/db?table=banners&select=*&order=sort_order&eq=active.eq.true
export async function GET(req: NextRequest) {
  const { url, key } = getKey();
  if (!key) return NextResponse.json({ error: "서비스 키 미설정" }, { status: 500 });

  const table = req.nextUrl.searchParams.get("table");
  if (!table || !ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: "허용되지 않은 테이블" }, { status: 400 });
  }

  const select = req.nextUrl.searchParams.get("select") || "*";
  const order = req.nextUrl.searchParams.get("order");
  const eq = req.nextUrl.searchParams.get("eq");
  const limit = req.nextUrl.searchParams.get("limit");

  let path = `${table}?select=${encodeURIComponent(select)}`;
  if (order) path += `&order=${encodeURIComponent(order)}`;
  if (eq) path += `&${eq}`;
  if (limit) path += `&limit=${limit}`;

  const res = await pgrest(url, key, "GET", path);
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err.slice(0, 300) }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json({ data });
}

// POST /api/admin/db  { table, method, rows, onConflict }
export async function POST(req: NextRequest) {
  const { url, key } = getKey();
  if (!key) return NextResponse.json({ error: "서비스 키 미설정" }, { status: 500 });

  const body = await req.json().catch(() => null);
  if (!body?.table || !ALLOWED_TABLES.has(body.table)) {
    return NextResponse.json({ error: "허용되지 않은 테이블" }, { status: 400 });
  }

  const { table, method = "POST", rows, onConflict, eq } = body as {
    table: string; method?: string; rows?: unknown; onConflict?: string; eq?: string;
  };

  let path = table;
  const prefer = onConflict
    ? `resolution=merge-duplicates,return=minimal`
    : "return=minimal";
  if (onConflict) path += `?on_conflict=${onConflict}`;
  if (eq) path += (path.includes("?") ? "&" : "?") + eq;

  const res = await pgrest(url, key, method, path, JSON.stringify(rows), prefer);
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err.slice(0, 300) }, { status: res.status });
  }
  return NextResponse.json({ success: true });
}
