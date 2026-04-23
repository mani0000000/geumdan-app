import { supabase } from "@/lib/supabase";
import type { NewsItem } from "@/lib/types";

export async function fetchInstagramPosts(limit = 30): Promise<NewsItem[]> {
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
