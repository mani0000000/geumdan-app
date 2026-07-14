import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 60;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(params.get("limit") ?? 24)));
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const category = params.get("category")?.trim();
  const contentType = params.get("type")?.trim().toUpperCase();
  const sort = params.get("sort") === "popular" ? "popular" : "latest";
  const from = (page - 1) * limit;

  let query = supabaseAdmin
    .from("instagram_posts")
    .select("*")
    .eq("active", true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (category && category !== "전체") query = query.eq("category", category);
  if (contentType && contentType !== "ALL") query = query.eq("content_type", contentType);

  query = sort === "popular"
    ? query.order("relevance_score", { ascending: false }).order("posted_at", { ascending: false })
    : query.order("posted_at", { ascending: false }).order("relevance_score", { ascending: false });

  const [{ data, error }, statusResult] = await Promise.all([
    query.range(from, from + limit - 1),
    supabaseAdmin.from("site_settings").select("key,value")
      .in("key", ["instagram_last_collected_at", "instagram_last_status"]),
  ]);

  let items = data ?? [];
  let compatibilityMode = false;
  if (error && (error.code === "42P01" || error.code === "42703" || error.code === "PGRST204")) {
    const fallback = await supabaseAdmin.from("instagram_posts").select("*")
      .order("posted_at", { ascending: false }).range(from, from + limit - 1);
    if (fallback.error) {
      return NextResponse.json({ items: [], categories: [], error: fallback.error.message }, { status: 500 });
    }
    items = fallback.data ?? [];
    compatibilityMode = true;
  } else if (error) {
    return NextResponse.json({ items: [], categories: [], error: error.message }, { status: 500 });
  }

  const status = Object.fromEntries((statusResult.data ?? []).map(row => [row.key, row.value]));
  const categoryCounts = new Map<string, number>();
  for (const item of items) {
    const key = String(item.category ?? "지역소식");
    categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
  }

  return NextResponse.json(
    {
      items,
      categories: [...categoryCounts].map(([name, count]) => ({ name, count })),
      lastCollectedAt: status.instagram_last_collected_at ?? null,
      batchStatus: status.instagram_last_status ?? null,
      page,
      hasMore: items.length === limit,
      compatibilityMode,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    },
  );
}
