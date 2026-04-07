// 뉴스 수집 전략:
// 1순위: 네이버 뉴스 검색 API (키 있을 때)
// 2순위: allorigins.win → Google News RSS XML 직접 파싱 (키 불필요, 안정적)
// 3순위: rss2json 프록시 fallback

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

// ── 1. 네이버 뉴스 검색 API ────────────────────────────────
async function fetchNaverNews(): Promise<NewsArticle[]> {
  if (!NAVER_ID || !NAVER_SECRET) return [];
  try {
    const params = new URLSearchParams({ query: "검단신도시", display: "20", sort: "date" });
    const res = await fetch(`https://openapi.naver.com/v1/search/news.json?${params}`, {
      headers: {
        "X-Naver-Client-Id": NAVER_ID,
        "X-Naver-Client-Secret": NAVER_SECRET,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items: Record<string, string>[] = json.items ?? [];
    if (items.length === 0) return [];
    return items
      .map((item, i) => ({
        id: `nv-${i}`,
        title: strip(item.title ?? ""),
        summary: strip(item.description ?? "").slice(0, 120),
        source: extractDomain(item.originallink ?? item.link ?? ""),
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        url: item.originallink || item.link || "#",
        thumbnail: undefined,
        type: "뉴스" as const,
      }))
      .filter(n => n.title.length > 5);
  } catch {
    return [];
  }
}

// ── 2. allorigins → Google News RSS (XML 직접 파싱) ───────
async function fetchGoogleRss(): Promise<NewsArticle[]> {
  try {
    const rssUrl = encodeURIComponent(
      "https://news.google.com/rss/search?q=검단신도시&hl=ko&gl=KR&ceid=KR:ko"
    );
    const res = await fetch(`https://api.allorigins.win/get?url=${rssUrl}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    const xml: string = json.contents ?? "";
    if (!xml.includes("<item>")) return [];

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    return items
      .map((m, i) => {
        const raw = m[1];
        const title = stripXml(tagVal(raw, "title"));
        const link  = tagVal(raw, "link") || tagVal(raw, "guid");
        const desc  = stripXml(tagVal(raw, "description")).slice(0, 120);
        const pub   = tagVal(raw, "pubDate");
        const src   = tagVal(raw, "source") || extractSource(title);
        return {
          id: `gr-${i}`,
          title,
          summary: desc,
          source: src,
          publishedAt: pub ? new Date(pub).toISOString() : new Date().toISOString(),
          url: link || "#",
          thumbnail: undefined,
          type: "뉴스" as const,
        };
      })
      .filter(n => n.title.length > 5)
      .slice(0, 20);
  } catch {
    return [];
  }
}

// ── 3. rss2json fallback ───────────────────────────────────
async function fetchRss2json(): Promise<NewsArticle[]> {
  try {
    const rss = encodeURIComponent(
      "https://news.google.com/rss/search?q=검단신도시&hl=ko&gl=KR&ceid=KR:ko"
    );
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rss}&count=20`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items: Record<string, string>[] = json.items ?? [];
    return items
      .map((item, i) => ({
        id: `rj-${i}`,
        title: strip(item.title ?? ""),
        summary: strip(item.description ?? "").slice(0, 120),
        source: item.author || extractSource(item.title ?? ""),
        publishedAt: item.pubDate ?? new Date().toISOString(),
        url: item.link || "#",
        thumbnail: undefined,
        type: "뉴스" as const,
      }))
      .filter(n => n.title.length > 5);
  } catch {
    return [];
  }
}

// ── helpers ───────────────────────────────────────────────
function tagVal(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
  return m ? (m[1] ?? m[2] ?? "").trim() : "";
}
function strip(s: string)    { return s.replace(/<[^>]+>/g, "").trim(); }
function stripXml(s: string) { return s.replace(/<[^>]+>/g, "").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").replace(/&quot;/g,'"').trim(); }
function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return "뉴스"; }
}
function extractSource(title: string): string {
  const m = title.match(/ - ([^-]+)$/);
  return m ? m[1].trim() : "뉴스";
}

// ── 메인 export ───────────────────────────────────────────
export async function fetchGeumdanNews(): Promise<NewsArticle[]> {
  // 네이버 + allorigins 병렬 시도
  const [naver, google] = await Promise.all([
    fetchNaverNews(),
    fetchGoogleRss(),
  ]);

  // 네이버 결과 우선, 없으면 Google RSS, 그것도 없으면 rss2json
  if (naver.length > 0) return naver;
  if (google.length > 0) return google;
  return fetchRss2json();
}
