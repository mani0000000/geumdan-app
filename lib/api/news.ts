// 네이버 뉴스 검색 API (primary) → Google News RSS fallback
// 환경변수: NEXT_PUBLIC_NAVER_CLIENT_ID, NEXT_PUBLIC_NAVER_CLIENT_SECRET

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

const NAVER_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID ?? "";
const NAVER_SECRET = process.env.NEXT_PUBLIC_NAVER_CLIENT_SECRET ?? "";

// 네이버 뉴스 검색 API
async function fetchNaverNews(): Promise<NewsArticle[]> {
  if (!NAVER_ID || !NAVER_SECRET) return [];
  try {
    const params = new URLSearchParams({
      query: "검단신도시 OR 검단 신도시",
      display: "20",
      sort: "date",
    });
    const res = await fetch(
      `https://openapi.naver.com/v1/search/news.json?${params}`,
      {
        headers: {
          "X-Naver-Client-Id": NAVER_ID,
          "X-Naver-Client-Secret": NAVER_SECRET,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const items: Record<string, string>[] = json.items ?? [];
    return items.map((item, i) => ({
      id: `nv-${i}`,
      title: item.title?.replace(/<[^>]+>/g, "").trim() ?? "",
      summary: item.description?.replace(/<[^>]+>/g, "").trim().slice(0, 120) ?? "",
      source: item.originallink ? new URL(item.originallink).hostname.replace("www.", "") : "네이버뉴스",
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      url: item.originallink || item.link || "#",
      thumbnail: undefined,
      type: "뉴스" as const,
    })).filter(n => n.title.length > 5);
  } catch {
    return [];
  }
}

// Google News RSS fallback (rss2json proxy)
async function fetchRssNews(): Promise<NewsArticle[]> {
  try {
    const rss = "https://news.google.com/rss/search?q=검단신도시&hl=ko&gl=KR&ceid=KR:ko";
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}&count=20`;
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
    })).filter(n => n.title.length > 5);
  } catch {
    return [];
  }
}

function extractSource(title: string): string {
  const m = title.match(/ - ([^-]+)$/);
  return m ? m[1].trim() : "뉴스";
}

export async function fetchGeumdanNews(): Promise<NewsArticle[]> {
  const naver = await fetchNaverNews();
  if (naver.length > 0) return naver;
  return fetchRssNews();
}
