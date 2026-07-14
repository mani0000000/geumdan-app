import { deduplicateNewsArticles } from "@/lib/news/deduplicate.mjs";

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

export function normalizeNewsText(value = ""): string {
  let decoded = value;

  // RSS/DB에 HTML이 한두 번 이스케이프된 상태로 들어오는 경우까지 정리한다.
  for (let i = 0; i < 2; i += 1) {
    decoded = decoded
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;|&#34;/gi, '"')
      .replace(/&apos;|&#39;/gi, "'")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&");
  }

  return decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface YouTubeVideo {
  id: string;
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  url: string;
  publishedAt?: string; // ISO 날짜 (캐시 수집 시 저장)
  topic?: string;
  query?: string;
  channelId?: string;
  subscriberCount?: number;
  viewCountText?: string;
  relevanceScore?: number;
  fetchedAt?: string;
}

const BASE_PATH     = process.env.NEXT_PUBLIC_BASE_PATH     ?? "";
const YT_API_KEY    = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY  ?? "";
const NAVER_ID      = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID  ?? "";
const NAVER_SECRET  = process.env.NEXT_PUBLIC_NAVER_CLIENT_SECRET ?? "";

const CACHE_TTL_MS  = 4 * 60 * 60 * 1000; // 4시간

const YOUTUBE_TOPIC_LABELS: Record<string, string> = {
  food: "맛집",
  cafe: "카페",
  news: "소식",
  places: "가볼만한 곳",
  transport: "교통",
  realestate: "부동산",
  family: "아이·가족",
  shopping: "상가·쇼핑",
  life: "동네생활",
  culture: "문화·행사",
  health: "운동·건강",
  education: "교육",
  pet: "반려생활",
};

const GEUMDAN_LOCAL_KEYWORDS = [
  "검단신도시", "검단", "검단구", "아라동", "원당동", "당하동", "마전동",
  "불로동", "왕길동", "오류동", "금곡동", "대곡동", "검단아라", "아라역",
  "검단호수공원", "검단중앙", "완정", "드림로", "인천서구", "인천 서구",
];

const YOUTUBE_TOPIC_KEYWORDS: Record<string, string[]> = {
  food: ["맛집", "먹방", "식당", "고기", "회식", "데이트", "브런치", "밥집", "술집", "샤브", "국밥", "파스타"],
  cafe: ["카페", "커피", "디저트", "베이커리", "브런치", "대형카페"],
  news: ["소식", "뉴스", "근황", "개발", "착공", "준공", "개통", "행사", "축제", "출범", "구청장", "행정", "재정"],
  places: ["공원", "산책", "나들이", "가볼만", "여행", "호수공원", "아라뱃길", "드림파크"],
  transport: ["교통", "버스", "지하철", "역", "5호선", "인천1호선", "노선", "출퇴근"],
  realestate: ["부동산", "아파트", "분양", "입주", "청약", "시세", "임장", "단지", "매매", "전세", "월세", "매물", "당첨", "계약", "잔여세대"],
  family: ["아이", "가족", "키즈", "학교", "학원", "어린이", "육아"],
  shopping: ["상가", "쇼핑", "마트", "병원", "약국", "오픈", "매장", "창업"],
  life: ["일상", "브이로그", "동네", "생활", "리뷰", "후기", "산책"],
  culture: ["문화", "공연", "축제", "행사", "플리마켓", "전시", "체험", "버스킹"],
  health: ["운동", "헬스", "수영", "러닝", "필라테스", "요가", "체육", "배드민턴", "댄스"],
  education: ["교육", "학교", "학원", "초등학교", "중학교", "고등학교", "진학", "청소년"],
  pet: ["반려", "애견", "강아지", "고양이", "동물병원", "펫"],
};

const TRUSTED_CHANNEL_HINTS = [
  "B tv 뉴스", "OBS뉴스", "YTN", "연합뉴스", "KBS", "MBC", "SBS", "JTBC",
  "인천시", "인천광역시", "인천 서구", "서구청", "국토교통부", "LH", "iH",
];

function normalizeKoText(value = ""): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

function inferYouTubeTopic(video: Pick<YouTubeVideo, "title" | "topic" | "query" | "channelName">): string {
  const haystack = normalizeKoText(video.title);
  if (TRUSTED_CHANNEL_HINTS.some(name => video.channelName.includes(name))) return "news";
  let best = video.topic && YOUTUBE_TOPIC_LABELS[video.topic] ? video.topic : "life";
  let bestScore = 0;
  for (const [topic, keywords] of Object.entries(YOUTUBE_TOPIC_KEYWORDS)) {
    const score = keywords.reduce((sum, keyword) => sum + (haystack.includes(normalizeKoText(keyword)) ? 1 : 0), 0);
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }
  return best;
}

function localRelevanceScore(video: Pick<YouTubeVideo, "title" | "channelName" | "query">): number {
  const haystack = normalizeKoText(`${video.title} ${video.channelName}`);
  if ((haystack.includes("검단산") || haystack.includes("검단산역")) && !haystack.includes("검단신도시") && !haystack.includes("인천")) {
    return -80;
  }
  let score = 0;
  for (const keyword of GEUMDAN_LOCAL_KEYWORDS) {
    if (haystack.includes(normalizeKoText(keyword))) score += keyword.includes("검단") ? 18 : 8;
  }
  if (haystack.includes("김포") && haystack.includes("검단")) score += 4;
  if (haystack.includes("계양") && haystack.includes("검단")) score += 4;
  return Math.min(score, 60);
}

function qualityPenalty(video: Pick<YouTubeVideo, "title">): number {
  const haystack = normalizeKoText(video.title);
  let penalty = 0;
  if (/010[-\s]?\d{3,4}[-\s]?\d{4}/.test(video.title) || haystack.includes("매물번호") || haystack.includes("분양문의")) penalty -= 90;
  if (haystack.includes("빌라매매") || haystack.includes("신축빌라") || haystack.includes("상가주택") || haystack.includes("토지f")) penalty -= 90;
  if (haystack.includes("분양권") || haystack.includes("매수타이밍") || haystack.includes("잔여세대") || haystack.includes("계약전꼭") || haystack.includes("당첨발표")) penalty -= 46;
  if (haystack.includes("충격") || haystack.includes("대박") || haystack.includes("폭등임박")) penalty -= 36;
  if (haystack.includes("개표") || haystack.includes("투표지") || haystack.includes("부정선거")) penalty -= 24;
  if (haystack.includes("검단산") || haystack.includes("하남검단")) penalty -= 50;
  return penalty;
}

function isHardRejectedYouTube(video: Pick<YouTubeVideo, "title">): boolean {
  const haystack = normalizeKoText(video.title);
  return /010[-\s]?\d{3,4}[-\s]?\d{4}/.test(video.title)
    || haystack.includes("매물번호")
    || haystack.includes("분양문의")
    || haystack.includes("빌라매매")
    || haystack.includes("신축빌라")
    || haystack.includes("상가주택")
    || haystack.includes("토지f")
    || haystack.includes("잔여세대")
    || haystack.includes("계약전꼭")
    || haystack.includes("당첨발표")
    || haystack.includes("청약당첨");
}

function freshnessScore(publishedAt?: string): number {
  const ts = publishedAt ? new Date(publishedAt).getTime() : 0;
  if (!Number.isFinite(ts) || ts <= 0) return 0;
  const days = (Date.now() - ts) / 86400000;
  if (days <= 30) return 28;
  if (days <= 90) return 23;
  if (days <= 180) return 17;
  if (days <= 365) return 10;
  if (days <= 730) return 3;
  return -18;
}

function channelAuthorityScore(video: Pick<YouTubeVideo, "channelName" | "subscriberCount">): number {
  const subs = video.subscriberCount ?? 0;
  if (subs >= 500000) return 26;
  if (subs >= 100000) return 22;
  if (subs >= 50000) return 18;
  if (subs >= 10000) return 13;
  if (subs >= 3000) return 8;
  if (TRUSTED_CHANNEL_HINTS.some(name => video.channelName.includes(name))) return 16;
  return 0;
}

export function getYouTubeTopicLabel(topic?: string): string {
  return topic && YOUTUBE_TOPIC_LABELS[topic] ? YOUTUBE_TOPIC_LABELS[topic] : "검단";
}

export function formatCompactCount(value?: number): string {
  if (!value || value <= 0) return "";
  if (value >= 10000) {
    const rounded = value >= 100000 ? Math.round(value / 10000) : Math.round(value / 1000) / 10;
    return `${rounded}만`;
  }
  if (value >= 1000) return `${Math.round(value / 100) / 10}천`;
  return String(value);
}

export function scoreYouTubeVideo(video: YouTubeVideo): number {
  const topic = inferYouTubeTopic(video);
  const topicScore = YOUTUBE_TOPIC_KEYWORDS[topic]?.some(keyword => normalizeKoText(video.title).includes(normalizeKoText(keyword))) ? 8 : 0;
  return localRelevanceScore(video) + freshnessScore(video.publishedAt) + channelAuthorityScore(video) + topicScore + qualityPenalty(video);
}

export function rankYouTubeVideos(videos: YouTubeVideo[], options: { minScore?: number; limit?: number } = {}): YouTubeVideo[] {
  const minScore = options.minScore ?? 34;
  const seen = new Set<string>();
  const ranked = videos
    .filter(video => video.videoId && !seen.has(video.videoId) && (seen.add(video.videoId), true))
    .map(video => {
      const topic = inferYouTubeTopic(video);
      const localScore = localRelevanceScore(video);
      const relevanceScore = scoreYouTubeVideo({ ...video, topic });
      return { ...video, topic, relevanceScore, localScore };
    })
    .filter(video => !isHardRejectedYouTube(video) && video.localScore >= 18 && (video.relevanceScore ?? 0) >= minScore)
    .sort((a, b) => {
      const aDate = new Date(a.publishedAt ?? 0).getTime();
      const bDate = new Date(b.publishedAt ?? 0).getTime();
      const dateDiff = bDate - aDate;
      if (Math.abs(dateDiff) > 1000 * 60 * 60 * 24 * 7) return dateDiff;
      const scoreDiff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return dateDiff;
    });
  return typeof options.limit === "number" ? ranked.slice(0, options.limit) : ranked;
}

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
    // DB 배치가 일시적으로 느리거나 비어 있을 때도 목업 대신
    // 마지막으로 수집한 실제 기사 스냅샷을 즉시 노출한다.
    if (Array.isArray(d.articles) && d.articles.length > 0) {
      const articles = (d.articles as NewsArticle[]).map(article => ({
        ...article,
        title: normalizeNewsText(article.title),
        summary: normalizeNewsText(article.summary),
        source: normalizeNewsText(article.source),
      }));
      return deduplicateNewsArticles(articles, { limit: 60, maxPerSource: 3, maxHours: 96 });
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
        channelId: (item.snippet?.channelId as string) ?? undefined,
        thumbnail: (item.snippet?.thumbnails?.medium?.url as string)
          ?? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        publishedAt: (item.snippet?.publishedAt as string) ?? new Date().toISOString(),
        query,
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
          query,
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
      const apiUrl = `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,authorId,publishedText,videoThumbnails`;
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
          channelId: (v.authorId as string) ?? undefined,
          thumbnail: thumb,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          publishedAt: typeof v.publishedText === "string" ? undefined : undefined,
          query,
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
        query,
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
              channelId: vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId,
              thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              query,
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
    if (cached.length > 0) return { videos: rankYouTubeVideos(cached, { minScore: 24, limit: 60 }), source: "캐시", ms: Math.round(performance.now() - t0) };
  }

  // 1–4. Live sources — YouTube Data API first (most reliable + fast)
  //      then Piped & Invidious in parallel, then HTML fallback
  const apiResult = await fetchYouTubeDataAPI(query);
  if (apiResult.length > 0) return { videos: rankYouTubeVideos(apiResult, { minScore: 24, limit: 40 }), source: "YouTube API", ms: Math.round(performance.now() - t0) };

  const [piped, invidious] = await Promise.all([
    fetchYouTubePiped(query),
    fetchYouTubeInvidious(query),
  ]);
  if (piped.length > 0)    return { videos: rankYouTubeVideos(piped, { minScore: 24, limit: 40 }),    source: "Piped API",     ms: Math.round(performance.now() - t0) };
  if (invidious.length > 0) return { videos: rankYouTubeVideos(invidious, { minScore: 24, limit: 40 }), source: "Invidious API", ms: Math.round(performance.now() - t0) };

  const html = await fetchYouTubeHTML(query);
  return { videos: rankYouTubeVideos(html, { minScore: 24, limit: 40 }), source: "HTML파싱", ms: Math.round(performance.now() - t0) };
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
