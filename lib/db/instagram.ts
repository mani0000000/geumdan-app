import { supabase } from "@/lib/supabase";
import type { NewsItem } from "@/lib/types";

// 정적 캐시 (Apify via GitHub Actions) → Supabase 순으로 폴백
async function fetchFromCache(limit: number): Promise<NewsItem[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    const res = await fetch(`${base}/cache/instagram.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const posts: Array<Record<string, unknown>> = json?.posts ?? [];
    if (!posts.length) return [];
    return posts.slice(0, limit).map((p, i) => {
      const shortcode = (p.shortcode ?? p.id ?? '') as string;
      const permalink = (p.permalink as string)
        || (shortcode ? `https://www.instagram.com/p/${shortcode}/` : '');
      const caption = ((p.caption ?? '') as string).slice(0, 200);
      return {
        id: String(p.id ?? shortcode ?? i),
        type: "인스타" as const,
        title: caption || `@${p.username ?? '검단신도시'} 포스트`,
        summary: caption,
        thumbnail: (p.thumbnailUrl ?? p.displayUrl ?? '') as string,
        source: (p.username ?? '') as string,
        publishedAt: (p.postedAt ?? new Date().toISOString()) as string,
        url: permalink,
      };
    }).filter(p => p.thumbnail || p.url);
  } catch {
    return [];
  }
}

export async function fetchInstagramPosts(limit = 30): Promise<NewsItem[]> {
  // 1. 정적 캐시 우선
  const cached = await fetchFromCache(limit);
  if (cached.length > 0) return cached;

  // 2. Supabase 폴백
  try {
    const { data, error } = await supabase
      .from("instagram_posts")
      .select("id, account_name, post_url, image_url, caption, posted_at")
      .order("posted_at", { ascending: false })
      .limit(limit);
    if (error || !data?.length) return [];
    return data.map(row => ({
      id: row.id as string,
      type: "인스타" as const,
      title: (row.caption as string) || `${row.account_name} 포스트`,
      summary: (row.caption as string) ?? "",
      thumbnail: (row.image_url as string) ?? "",
      source: (row.account_name as string) ?? "",
      publishedAt: (row.posted_at as string) ?? new Date().toISOString(),
      url: (row.post_url as string) ?? "",
    }));
  } catch {
    return [];
  }
}
