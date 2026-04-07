// 뉴스 수집 전략:
// 0순위: GitHub Actions가 3시간마다 pre-fetch한 static JSON 캐시 (가장 빠름, CORS 없음)
// 1순위: 네이버 뉴스 검색 API (키 있을 때)
// 2순위: allorigins.win → Google News RSS XML 직접 파싱 (키 불필요, 안정적)
// 3순위: rss2json 프록시 fallback

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4시간 (3시간 갱신 주기 + 여유)

function isFresh(fetchedAt: string): boolean {
  try { return Date.now() - new Date(fetchedAt).getTime() < CACHE_TTL_MS; }
  catch { return false; }
}

export async function fetchCachedNews(): Promise<NewsArticle[]> {
  try {
    const res = await fetch(`${BASE_PATH}/cache/news.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data.articles) && data.articles.length > 0 && isFresh(data.fetchedAt)) {
      return data.articles as NewsArticle[];
    }
  } catch { /* ignore */ }
  return [];
}

export async function fetchCachedYouTube(): Promise<YouTubeVideo[]> {
  try {
    const res = await fetch(`${BASE_PATH}/cache/youtube.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data.videos) && data.videos.length > 0 && isFresh(data.fetchedAt)) {
      return data.videos as YouTubeVideo[];
    }
  } catch { /* ignore */ }
  return [];
}

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

export interface YouTubeVideo {
  id: string;
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  url: string;
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
    const res = await fetch(`https://api.allorigins.win/get?url=${rssUrl}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    const xml: string = json.contents ?? "";
    if (!xml.includes("<item>")) return [];

    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .map((m, i) => {
        const raw = m[1];
        const title = stripXml(tagVal(raw, "title"));
        const link  = tagVal(raw, "link") || tagVal(raw, "guid");
        const desc  = stripXml(tagVal(raw, "description")).slice(0, 120);
        const pub   = tagVal(raw, "pubDate");
        const src   = tagVal(raw, "source") || extractSource(title);
        return {
          id: `gr-${i}`, title, summary: desc, source: src,
          publishedAt: pub ? new Date(pub).toISOString() : new Date().toISOString(),
          url: link || "#", thumbnail: undefined, type: "뉴스" as const,
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
    return (json.items as Record<string, string>[] ?? [])
      .map((item, i) => ({
        id: `rj-${i}`, title: strip(item.title ?? ""),
        summary: strip(item.description ?? "").slice(0, 120),
        source: item.author || extractSource(item.title ?? ""),
        publishedAt: item.pubDate ?? new Date().toISOString(),
        url: item.link || "#", thumbnail: undefined, type: "뉴스" as const,
      }))
      .filter(n => n.title.length > 5);
  } catch {
    return [];
  }
}

// ── 유튜브: allorigins → YouTube 검색 HTML 파싱 ──────────
export async function fetchYouTubeVideos(query = "검단신도시"): Promise<YouTubeVideo[]> {
  // 0. Static cache (pre-fetched by GitHub Actions — instant, no CORS)
  if (query === "검단신도시") {
    const cached = await fetchCachedYouTube();
    if (cached.length > 0) return cached;
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return extractVideoIdsOnly("", query);
    const { contents } = await res.json();
    if (!contents) return [];

    // ytInitialData JSON 파싱 시도
    const match = contents.match(/var ytInitialData\s*=\s*(\{[\s\S]+?\});\s*(?:var |<\/script>)/);
    if (match) {
      try {
        const ytData = JSON.parse(match[1]);
        const sections =
          ytData?.contents?.twoColumnSearchResultsRenderer
            ?.primaryContents?.sectionListRenderer?.contents ?? [];
        const videos: YouTubeVideo[] = [];
        for (const section of sections) {
          for (const item of (section?.itemSectionRenderer?.contents ?? [])) {
            const vr = item?.videoRenderer;
            if (!vr?.videoId) continue;
            const videoId: string = vr.videoId;
            videos.push({
              id: `yt-${videos.length}`,
              videoId,
              title: vr.title?.runs?.[0]?.text ?? `${query} 영상 ${videos.length + 1}`,
              channelName: vr.ownerText?.runs?.[0]?.text ?? "YouTube",
              thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${videoId}`,
            });
            if (videos.length >= 12) break;
          }
          if (videos.length >= 12) break;
        }
        if (videos.length > 0) return videos;
      } catch { /* fall through to regex */ }
    }

    // 파싱 실패 → regex로 video ID만 추출
    return extractVideoIdsOnly(contents, query);
  } catch {
    return [];
  }
}

function extractVideoIdsOnly(html: string, query = "검단신도시"): YouTubeVideo[] {
  const seen = new Set<string>();
  const videos: YouTubeVideo[] = [];
  const re = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const videoId = m[1];
    if (!seen.has(videoId)) {
      seen.add(videoId);
      videos.push({
        id: `yt-${videos.length}`, videoId,
        title: `${query} 영상 ${videos.length + 1}`,
        channelName: "YouTube",
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      });
      if (videos.length >= 12) break;
    }
  }
  return videos;
}

// ── helpers ───────────────────────────────────────────────
function tagVal(xml: string, tag: string): string {
  const m = xml.match(new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`
  ));
  return m ? (m[1] ?? m[2] ?? "").trim() : "";
}
function strip(s: string)    { return s.replace(/<[^>]+>/g, "").trim(); }
function stripXml(s: string) {
  return s.replace(/<[^>]+>/g, "")
    .replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&amp;/g,"&").replace(/&quot;/g,'"').trim();
}
function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return "뉴스"; }
}
function extractSource(title: string): string {
  const m = title.match(/ - ([^-]+)$/);
  return m ? m[1].trim() : "뉴스";
}

// ── 메인 export ───────────────────────────────────────────
export async function fetchGeumdanNews(): Promise<NewsArticle[]> {
  // 0. Static cache (pre-fetched by GitHub Actions — instant, no CORS)
  const cached = await fetchCachedNews();
  if (cached.length > 0) return cached;

  // 1–3. Live fallbacks
  const [naver, google] = await Promise.all([fetchNaverNews(), fetchGoogleRss()]);
  if (naver.length > 0) return naver;
  if (google.length > 0) return google;
  return fetchRss2json();
}
