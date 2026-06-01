// Instagram feed API client — talks to external Fastify backend first,
// then falls back to Supabase instagram_posts table.
// Base URL configured via NEXT_PUBLIC_INSTAGRAM_API_URL (e.g. http://localhost:3001)
import { supabase } from "@/lib/supabase";

export interface InstagramPost {
  id: string;
  shortcode?: string;
  permalink: string;
  mediaType?: "IMAGE" | "VIDEO" | "REEL" | "CAROUSEL" | string;
  isReel: boolean;
  thumbnailUrl: string;
  caption?: string;
  username?: string;
  likeCount: number;
  commentCount: number;
  viewCount?: number;
  hashtags?: string[];
  postedAt: string;
}

export interface InstagramStats {
  totalPosts: number;
  totalReels: number;
  totalLikes?: number;
  totalComments?: number;
  lastSyncedAt?: string;
}

export interface FetchFeedsParams {
  limit?: number;
  page?: number;
  sort?: "latest" | "popular";
  reel?: boolean;
  tag?: string;
}

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_INSTAGRAM_API_URL;
  return url ? url.replace(/\/$/, "") : "";
}

// Defensive normalizer — backend may return any of these field name conventions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: any): InstagramPost | null {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id ?? raw.post_id ?? raw.shortcode ?? raw.permalink ?? "");
  if (!id) return null;
  const mediaType = raw.mediaType ?? raw.media_type ?? raw.type ?? "";
  const isReel = Boolean(
    raw.isReel ?? raw.is_reel ?? raw.reel ?? String(mediaType).toUpperCase().includes("REEL")
  );
  return {
    id,
    shortcode: raw.shortcode ?? raw.short_code ?? undefined,
    permalink: String(raw.permalink ?? raw.post_url ?? raw.url ?? ""),
    mediaType: mediaType || undefined,
    isReel,
    thumbnailUrl: String(
      raw.thumbnailUrl ?? raw.thumbnail_url ?? raw.image_url ?? raw.display_url ?? ""
    ),
    caption: raw.caption ?? raw.text ?? "",
    username: raw.username ?? raw.account_name ?? raw.owner ?? undefined,
    likeCount: Number(raw.likeCount ?? raw.like_count ?? raw.likes ?? 0),
    commentCount: Number(raw.commentCount ?? raw.comment_count ?? raw.comments ?? 0),
    viewCount: raw.viewCount ?? raw.view_count ?? raw.views,
    hashtags: Array.isArray(raw.hashtags) ? raw.hashtags : undefined,
    postedAt: String(raw.postedAt ?? raw.posted_at ?? raw.taken_at ?? new Date().toISOString()),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.posts)) return payload.posts;
  if (Array.isArray(payload?.feeds)) return payload.feeds;
  return [];
}

// Fallback: fetch from Supabase instagram_posts when Fastify backend is unavailable.
// Works with both the basic schema (id, account_name, post_url, image_url, caption, posted_at)
// and extended columns (media_type, like_count, comment_count, hashtags) if they exist.
async function fetchFromSupabase(params: FetchFeedsParams): Promise<InstagramPost[]> {
  try {
    const limit = params.limit ?? 12;
    const page  = params.page  ?? 1;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from("instagram_posts")
      .select("*")
      .order("posted_at", { ascending: false })
      .range(from, to);

    // hashtag filter — try hashtags array column first, fall back to caption
    if (params.tag) {
      q = q.or(`hashtags.cs.{${params.tag}},caption.ilike.%${params.tag}%`);
    }

    // reels filter — only if media_type column exists
    if (params.reel) {
      q = q.or("media_type.ilike.%reel%,is_reel.eq.true");
    }

    const { data, error } = await q;
    if (error || !data?.length) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((row: any) => ({
      id: String(row.id),
      permalink: String(row.post_url ?? row.permalink ?? ""),
      isReel: Boolean(row.is_reel ?? String(row.media_type ?? "").toUpperCase().includes("REEL")),
      mediaType: row.media_type ?? undefined,
      thumbnailUrl: String(row.image_url ?? row.thumbnail_url ?? ""),
      caption: row.caption ?? "",
      username: row.account_name ?? row.username ?? undefined,
      likeCount: Number(row.like_count ?? row.likes ?? 0),
      commentCount: Number(row.comment_count ?? row.comments ?? 0),
      hashtags: Array.isArray(row.hashtags) ? row.hashtags : undefined,
      postedAt: String(row.posted_at ?? row.taken_at ?? new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}

// Static JSON cache (built by GitHub Actions via Apify) — fastest path
async function fetchFromCache(params: FetchFeedsParams): Promise<InstagramPost[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    const res = await fetch(`${base}/cache/instagram.json`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    let posts: InstagramPost[] = (json?.posts ?? [])
      .map(normalize)
      .filter((p: InstagramPost | null): p is InstagramPost => p !== null);

    if (params.tag) {
      const t = params.tag.toLowerCase();
      posts = posts.filter(p =>
        p.hashtags?.some(h => h.toLowerCase().includes(t)) ||
        (p.caption ?? '').toLowerCase().includes(t)
      );
    }
    if (params.reel) posts = posts.filter(p => p.isReel);

    const limit = params.limit ?? 12;
    const page  = params.page  ?? 1;
    return posts.slice((page - 1) * limit, page * limit);
  } catch {
    return [];
  }
}

export async function fetchInstagramFeeds(params: FetchFeedsParams = {}): Promise<InstagramPost[]> {
  const base = getBaseUrl();

  // Try Fastify backend first
  if (base) {
    const qs = new URLSearchParams();
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.page  != null) qs.set("page",  String(params.page));
    if (params.sort) qs.set("sort", params.sort);
    if (params.reel) qs.set("reel", "true");
    if (params.tag)  qs.set("tag",  params.tag);
    try {
      const res = await fetch(`${base}/api/instagram-feeds?${qs.toString()}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const json = await res.json();
        const list = extractList(json).map(normalize).filter((p): p is InstagramPost => p !== null);
        if (list.length > 0) return list;
      }
    } catch { /* fall through to Supabase */ }
  }

  // Static cache fallback (Apify via GitHub Actions)
  const cached = await fetchFromCache(params);
  if (cached.length > 0) return cached;

  // Supabase fallback
  return fetchFromSupabase(params);
}

export async function fetchInstagramReels(limit = 10): Promise<InstagramPost[]> {
  return fetchInstagramFeeds({ reel: true, limit });
}

export async function fetchInstagramStats(): Promise<InstagramStats | null> {
  const base = getBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/instagram-stats`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const src = json?.data ?? json ?? {};
    return {
      totalPosts: Number(src.totalPosts ?? src.total_posts ?? 0),
      totalReels: Number(src.totalReels ?? src.total_reels ?? 0),
      totalLikes: src.totalLikes ?? src.total_likes,
      totalComments: src.totalComments ?? src.total_comments,
      lastSyncedAt: src.lastSyncedAt ?? src.last_synced_at,
    };
  } catch {
    return null;
  }
}
