// Google News RSS → rss2json.com (CORS-enabled proxy)
// 검단 신도시 관련 실제 뉴스 수집

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  thumbnail?: string;
  type: "뉴스";
}

// rss2json free tier: 10,000 req/day
const RSS2JSON = "https://api.rss2json.com/v1/api.json";
const GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q=검단신도시+OR+검단신도시&hl=ko&gl=KR&ceid=KR:ko";

export async function fetchGeumdanNews(): Promise<NewsArticle[]> {
  try {
    const url = `${RSS2JSON}?rss_url=${encodeURIComponent(GOOGLE_NEWS_RSS)}&count=20&api_key=`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.status !== "ok") return [];

    return (json.items as Record<string, string>[]).map((item, i) => ({
      id: `gn-${i}`,
      title: item.title?.replace(/<[^>]+>/g, "").trim() ?? "",
      summary: item.description?.replace(/<[^>]+>/g, "").trim().slice(0, 120) ?? "",
      source: item.author ?? extractSource(item.title ?? ""),
      publishedAt: item.pubDate ?? new Date().toISOString(),
      url: item.link ?? "#",
      thumbnail: undefined,
      type: "뉴스" as const,
    })).filter((n) => n.title.length > 5);
  } catch {
    return [];
  }
}

function extractSource(title: string): string {
  // Google News title often ends with "- 언론사명"
  const m = title.match(/ - ([^-]+)$/);
  return m ? m[1].trim() : "뉴스";
}
