/**
 * 뉴스/유튜브 데이터 수집
 *
 * 속도 우선순위:
 *  0. GitHub Actions가 3시간마다 pre-fetch한 정적 JSON 캐시 (즉시, CORS 없음)
 *  1. YouTube Data API v3 (NEXT_PUBLIC_YOUTUBE_API_KEY 있을 때, 가장 안정적)
 *  2. Piped / Invidious 오픈 YouTube API (키 불필요, JSON 응답)
 *  3. 네이버 뉴스 검색 API (CORS 프록시 병렬)
 *  4. Google News RSS (CORS 프록시 병렬)
 *  5. rss2json fallback
 *
 * CORS 프록시는 allorigins.win + corsproxy.io 동시 시도 → 빠른 쪽 사용
 */

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

const BASE_PATH     = process.env.NEXT_PUBLIC_BASE_PATH     ?? "";
const YT_API_KEY    = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY  ?? "";
const NAVER_ID      = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID  ?? "";
const NAVER_SECRET  = process.env.NEXT_PUBLIC_NAVER_CLIENT_SECRET ?? "";

const CACHE_TTL_MS  = 4 * 60 * 60 * 1000; // 4시간

// ── 캐시 ──────────────────────────────────────────────────────
function isFresh(fetchedAt: string): boolean {
  try { return Date.now() - new Date(fetchedAt).getTime() < CACHE_TTL_MS; }
  catch { return false; }
}

export async function fetchCachedNews(): Promise<NewsArticle[]> {
  try {
    const res = await fetch(`${BASE_PATH}/cache/news.json`, { cache: "no-store" });
    if (!res.ok) return [];
    const d = await res.json();
    if (Array.isArray(d.articles) && d.articles.length > 0 && isFresh(d.fetchedAt)) {
      return d.articles as NewsArticle[];
    }
  } catch { /* ignore */ }
  return [];
}

export async function fetchCachedYouTube(): Promise<YouTubeVideo[]> {
  try {
    const res = await fetch(`${BASE_PATH}/cache/youtube.json`, { cache: "no-store" });
    if (!res.ok) return [];
    const d = await res.json();
    if (Array.isArray(d.videos) && d.videos.length > 0 && isFresh(d.fetchedAt)) {
      return d.videos as YouTubeVideo[];
    }
  } catch { /* ignore */ }
  return [];
}

// ── CORS 프록시 경쟁 ──────────────────────────────────────────
// allorigins.win 과 corsproxy.io 동시 시도, 먼저 성공한 쪽 사용
async function corsGet(url: string, timeoutMs = 7000): Promise<string> {
  const run = async (makeUrl: (u: string) => string, isJson: boolean): Promise<string> => {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(makeUrl(url), { cache: "no-store", signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (isJson) {
        const j = await res.json();
        return (j.contents as string) ?? "";
      }
      return await res.text();
    } finally {
      clearTimeout(tid);
    }
  };

  try {
    return await Promise.any([
      run(u => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`, true),
      run(u => `https://corsproxy.io/?${encodeURIComponent(u)}`, false),
    ]);
  } catch {
    return "";
  }
}

// ── 뉴스 helpers ──────────────────────────────────────────────
function strip(s: string) { return s.replace(/<[^>]+>/g, "").trim(); }
function stripXml(s: string) {
  return s.replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
}
function tagVal(xml: string, tag: string): string {
  const m = xml.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`)
  );
  return m ? (m[1] ?? m[2] ?? "").trim() : "";
}
function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return "뉴스"; }
}
function extractSource(title: string): string {
  const m = title.match(/ - ([^-]+)$/);
  return m ? m[1].trim() : "뉴스";
}

// ── 1. 네이버 뉴스 ────────────────────────────────────────────
async function fetchNaverNews(): Promise<NewsArticle[]> {
  if (!NAVER_ID || !NAVER_SECRET) return [];
  try {
    const params = new URLSearchParams({ query: "검단신도시", display: "20", sort: "date" });
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 7000);
    const res  = await fetch(`https://openapi.naver.com/v1/search/news.json?${params}`, {
      headers: { "X-Naver-Client-Id": NAVER_ID, "X-Naver-Client-Secret": NAVER_SECRET },
      cache: "no-store", signal: ctrl.signal,
    });
    clearTimeout(tid);
    if (!res.ok) return [];
    const json = await res.json();
    const items: Record<string, string>[] = json.items ?? [];
    if (items.length === 0) return [];
    return items.map((item, i) => ({
      id: `nv-${i}`,
      title: strip(item.title ?? ""),
      summary: strip(item.description ?? "").slice(0, 120),
      source: extractDomain(item.originallink ?? item.link ?? ""),
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      url: item.originallink || item.link || "#",
      thumbnail: undefined, type: "뉴스" as const,
    })).filter(n => n.title.length > 5);
  } catch { return []; }
}

// ── 2. Google News RSS ────────────────────────────────────────
function parseRssXml(xml: string, prefix: string): NewsArticle[] {
  if (!xml.includes("<item>")) return [];
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m, i) => {
    const raw  = m[1];
    const title = stripXml(tagVal(raw, "title"));
    const link  = tagVal(raw, "link") || tagVal(raw, "guid");
    const desc  = stripXml(tagVal(raw, "description")).slice(0, 120);
    const pub   = tagVal(raw, "pubDate");
    const src   = tagVal(raw, "source") || extractSource(title);
    return {
      id: `${prefix}-${i}`, title, summary: desc, source: src,
      publishedAt: pub ? new Date(pub).toISOString() : new Date().toISOString(),
      url: link || "#", thumbnail: undefined, type: "뉴스" as const,
    };
  }).filter(n => n.title.length > 5).slice(0, 20);
}

const NEWS_QUERIES = [
  "검단신도시",
  "검단+아파트",
  "인천+서구+검단",
];

async function fetchGoogleRssQuery(query: string, prefix: string): Promise<NewsArticle[]> {
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
    const xml = await corsGet(rssUrl);
    return parseRssXml(xml, prefix);
  } catch { return []; }
}

async function fetchGoogleRss(): Promise<NewsArticle[]> {
  // 3개 쿼리 동시 실행 → 합치기 → 최신순 → 중복 제거
  const results = await Promise.all(
    NEWS_QUERIES.map((q, i) => fetchGoogleRssQuery(q, `gr${i}`))
  );
  const seen = new Set<string>();
  const merged: NewsArticle[] = [];
  for (const arr of results) {
    for (const a of arr) {
      const key = a.url !== "#" ? a.url : a.title;
      if (!seen.has(key)) { seen.add(key); merged.push(a); }
    }
  }
  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return merged.slice(0, 30);
}

// ── 3. rss2json ───────────────────────────────────────────────
async function fetchRss2json(): Promise<NewsArticle[]> {
  try {
    const rss = encodeURIComponent("https://news.google.com/rss/search?q=검단신도시&hl=ko&gl=KR&ceid=KR:ko");
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 7000);
    const res  = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rss}&count=20`, {
      cache: "no-store", signal: ctrl.signal,
    });
    clearTimeout(tid);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.items as Record<string, string>[] ?? []).map((item, i) => ({
      id: `rj-${i}`, title: strip(item.title ?? ""),
      summary: strip(item.description ?? "").slice(0, 120),
      source: item.author || extractSource(item.title ?? ""),
      publishedAt: item.pubDate ?? new Date().toISOString(),
      url: item.link || "#", thumbnail: undefined, type: "뉴스" as const,
    })).filter(n => n.title.length > 5);
  } catch { return []; }
}

// ── YouTube: API v3 ───────────────────────────────────────────
async function fetchYouTubeDataAPI(query: string): Promise<YouTubeVideo[]> {
  if (!YT_API_KEY) return [];
  try {
    const params = new URLSearchParams({
      part: "snippet", q: query, type: "video",
      maxResults: "12", key: YT_API_KEY,
      regionCode: "KR", relevanceLanguage: "ko", order: "date",
    });
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 7000);
    const res  = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      cache: "no-store", signal: ctrl.signal,
    });
    clearTimeout(tid);
    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.items ?? []).map((item: any, i: number) => {
      const videoId: string = item.id?.videoId ?? "";
      return {
        id: `ytapi-${i}`, videoId,
        title: (item.snippet?.title as string) ?? `검단 영상 ${i + 1}`,
        channelName: (item.snippet?.channelTitle as string) ?? "YouTube",
        thumbnail: (item.snippet?.thumbnails?.medium?.url as string)
          ?? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    }).filter((v: YouTubeVideo) => v.videoId);
  } catch { return []; }
}

// ── YouTube: Piped API (오픈소스 YouTube 프론트엔드, 키 불필요) ──
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.yt",
];

async function fetchYouTubePiped(query: string): Promise<YouTubeVideo[]> {
  for (const base of PIPED_INSTANCES) {
    try {
      const apiUrl = `${base}/search?q=${encodeURIComponent(query)}&filter=videos`;
      const content = await corsGet(apiUrl, 8000);
      if (!content) continue;
      const json = JSON.parse(content);
      const items: Record<string, string>[] = json.items ?? [];
      if (items.length === 0) continue;
      return items.slice(0, 12).map((v, i) => {
        const videoId = (v.url ?? "").replace("/watch?v=", "");
        return {
          id: `piped-${i}`, videoId,
          title: v.title ?? `검단 영상 ${i + 1}`,
          channelName: v.uploaderName ?? "YouTube",
          thumbnail: v.thumbnail ?? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        };
      }).filter(v => v.videoId.length === 11);
    } catch { continue; }
  }
  return [];
}

// ── YouTube: Invidious API ────────────────────────────────────
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.privacydev.net",
  "https://yt.artemislena.eu",
];

async function fetchYouTubeInvidious(query: string): Promise<YouTubeVideo[]> {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const apiUrl = `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,videoThumbnails`;
      const content = await corsGet(apiUrl, 8000);
      if (!content) continue;
      const items = JSON.parse(content);
      if (!Array.isArray(items) || items.length === 0) continue;
      return items.slice(0, 12).map((v: Record<string, unknown>, i: number) => {
        const videoId = (v.videoId as string) ?? "";
        const thumbs  = (v.videoThumbnails as Array<Record<string, string>>) ?? [];
        const thumb   = thumbs.find(t => t.quality === "medium")?.url
          ?? thumbs.find(t => t.quality === "high")?.url
          ?? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        return {
          id: `iv-${i}`, videoId,
          title: (v.title as string) ?? `검단 영상 ${i + 1}`,
          channelName: (v.author as string) ?? "YouTube",
          thumbnail: thumb,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        };
      }).filter(v => v.videoId.length === 11);
    } catch { continue; }
  }
  return [];
}

// ── YouTube: allorigins → HTML 파싱 fallback ─────────────────
function extractVideoIdsOnly(html: string, query: string): YouTubeVideo[] {
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

async function fetchYouTubeHTML(query: string): Promise<YouTubeVideo[]> {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const html = await corsGet(searchUrl, 10000);
    if (!html) return [];

    const match = html.match(/var ytInitialData\s*=\s*(\{[\s\S]+?\});\s*(?:var |<\/script>)/);
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
              id: `ythtml-${videos.length}`, videoId,
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
      } catch { /* fall through */ }
    }
    return extractVideoIdsOnly(html, query);
  } catch { return []; }
}

// ── 메인 exports ──────────────────────────────────────────────

export async function fetchYouTubeVideos(query = "검단신도시"): Promise<{ videos: YouTubeVideo[]; source: string; ms: number }> {
  const t0 = performance.now();

  // 0. Static cache
  if (query === "검단신도시") {
    const cached = await fetchCachedYouTube();
    if (cached.length > 0) return { videos: cached, source: "캐시", ms: Math.round(performance.now() - t0) };
  }

  // 1–4. Live sources — YouTube Data API first (most reliable + fast)
  //      then Piped & Invidious in parallel, then HTML fallback
  const apiResult = await fetchYouTubeDataAPI(query);
  if (apiResult.length > 0) return { videos: apiResult, source: "YouTube API", ms: Math.round(performance.now() - t0) };

  const [piped, invidious] = await Promise.all([
    fetchYouTubePiped(query),
    fetchYouTubeInvidious(query),
  ]);
  if (piped.length > 0)    return { videos: piped,    source: "Piped API",     ms: Math.round(performance.now() - t0) };
  if (invidious.length > 0) return { videos: invidious, source: "Invidious API", ms: Math.round(performance.now() - t0) };

  const html = await fetchYouTubeHTML(query);
  return { videos: html, source: "HTML파싱", ms: Math.round(performance.now() - t0) };
}

export async function fetchGeumdanNews(): Promise<{ articles: NewsArticle[]; source: string; ms: number }> {
  const t0 = performance.now();

  // 0. Static cache
  const cached = await fetchCachedNews();
  if (cached.length > 0) return { articles: cached, source: "캐시", ms: Math.round(performance.now() - t0) };

  // 1–3. Live — all in parallel, first non-empty wins
  const promise = new Promise<{ articles: NewsArticle[]; source: string }>((resolve, reject) => {
    let done = false; let count = 0;
    const total = 3;
    const tryResolve = (articles: NewsArticle[], source: string) => {
      if (!done && articles.length > 0) { done = true; resolve({ articles, source }); }
      if (++count === total && !done) reject(new Error("all sources empty"));
    };
    fetchNaverNews().then(a => tryResolve(a, "네이버")).catch(() => { if (++count === total && !done) reject(new Error("all failed")); });
    fetchGoogleRss().then(a => tryResolve(a, "Google RSS")).catch(() => { if (++count === total && !done) reject(new Error("all failed")); });
    fetchRss2json().then(a => tryResolve(a, "rss2json")).catch(() => { if (++count === total && !done) reject(new Error("all failed")); });
  });

  try {
    const { articles, source } = await promise;
    return { articles, source, ms: Math.round(performance.now() - t0) };
  } catch {
    return { articles: [], source: "없음", ms: Math.round(performance.now() - t0) };
  }
}
