import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 60;

type LegacySocialItem = Record<string, unknown>;
type NormalizedLegacySocialItem = LegacySocialItem & {
  category: string;
  content_type: string;
  media_type: string;
  is_reel: boolean;
  is_story: boolean;
  active: boolean;
  relevance_score: number;
};

function inferLegacyCategory(item: LegacySocialItem) {
  const hashtags = Array.isArray(item.hashtags) ? item.hashtags.join(" ") : String(item.hashtags ?? "");
  const text = `${String(item.caption ?? "")} ${hashtags}`.replaceAll("#", "").toLowerCase();
  if (/맛집|카페|디저트|베이커리|빵집|브런치|먹방|곱창|고기|쌀국수|식당|요리/.test(text)) return "맛집";
  if (/가볼만|핫플|데이트|나들이|공원|축제|전시|여행|산책|야경|아이와/.test(text)) return "가볼만한 곳";
  if (/육아|교육|학원|어린이집|유치원|학교|수학|영어/.test(text)) return "육아·교육";
  if (/교통|버스|지하철|병원|약국|생활|아파트|분양|부동산/.test(text)) return "생활정보";
  return "지역소식";
}

function normalizeLegacyItem(item: LegacySocialItem): NormalizedLegacySocialItem {
  const media = String(item.content_type ?? item.media_type ?? "").toUpperCase();
  const isStory = Boolean(item.is_story) || media.includes("STORY");
  const isReel = !isStory && (Boolean(item.is_reel) || /REEL|VIDEO|CLIP/.test(media));
  const contentType = isStory ? "STORY"
    : isReel ? "REEL"
      : /CAROUSEL|SIDECAR/.test(media) ? "CAROUSEL" : "POST";
  const engagement = Number(item.like_count ?? 0) + Number(item.comment_count ?? 0) * 3;
  return {
    ...item,
    category: String(item.category || inferLegacyCategory(item)),
    content_type: String(item.content_type || contentType),
    media_type: String(item.media_type || contentType),
    is_reel: isReel,
    is_story: isStory,
    active: item.active == null ? true : Boolean(item.active),
    relevance_score: Number(item.relevance_score ?? Math.min(100, Math.floor(Math.log10(engagement + 1) * 18))),
  };
}

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
      .order("posted_at", { ascending: false }).limit(600);
    if (fallback.error) {
      return NextResponse.json({ items: [], categories: [], error: fallback.error.message }, { status: 500 });
    }
    const unique = new Map<string, ReturnType<typeof normalizeLegacyItem>>();
    for (const raw of fallback.data ?? []) {
      const item = normalizeLegacyItem(raw as LegacySocialItem);
      const key = String(item.post_url ?? item.id ?? `${item.account_name}-${item.posted_at}`);
      if (!unique.has(key)) unique.set(key, item);
    }
    let compatibleItems = [...unique.values()];
    if (category && category !== "전체") compatibleItems = compatibleItems.filter(item => item.category === category);
    if (contentType && contentType !== "ALL") {
      compatibleItems = compatibleItems.filter(item => String(item.content_type).toUpperCase() === contentType);
    }
    if (sort === "popular") {
      compatibleItems.sort((a, b) => Number(b.relevance_score ?? 0) - Number(a.relevance_score ?? 0));
    }
    items = compatibleItems.slice(from, from + limit);
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
