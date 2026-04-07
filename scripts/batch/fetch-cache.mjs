#!/usr/bin/env node
/**
 * fetch-cache.mjs — GitHub Actions가 3시간마다 실행
 * Node.js 환경: CORS 없음 → API 직접 호출 가능
 *
 * 수집 전략:
 * 뉴스:  Naver API → Google News RSS (여러 쿼리 병렬) → 중복 제거 → 최신순
 * 유튜브: YouTube Data API v3 → Invidious API (여러 인스턴스) → HTML 파싱
 */
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR  = resolve(__dirname, '../../public/cache');
mkdirSync(CACHE_DIR, { recursive: true });

const NAVER_ID     = process.env.NAVER_CLIENT_ID      ?? '';
const NAVER_SECRET = process.env.NAVER_CLIENT_SECRET  ?? '';
const YT_API_KEY   = process.env.YOUTUBE_API_KEY      ?? '';

// ── Helpers ────────────────────────────────────────────────
function stripHtml(s = '') {
  return s.replace(/<[^>]+>/g, '')
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
    .replace(/&quot;/g,'"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .trim();
}
function extractSource(title) {
  const m = title.match(/ - ([^-]+)$/);
  return m ? m[1].trim() : '뉴스';
}
function safeDomain(url) {
  try { return new URL(url).hostname.replace('www.',''); } catch { return '뉴스'; }
}
function loadCache(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

async function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout: ${label}`)), ms)),
  ]);
}

// ── 뉴스: Naver ────────────────────────────────────────────
async function fetchNaverNews() {
  if (!NAVER_ID || !NAVER_SECRET) return [];
  const results = await Promise.allSettled(
    ['검단신도시', '검단 아파트', '인천 서구 검단'].map(async query => {
      const params = new URLSearchParams({ query, display: '20', sort: 'date' });
      const res = await withTimeout(
        fetch(`https://openapi.naver.com/v1/search/news.json?${params}`, {
          headers: { 'X-Naver-Client-Id': NAVER_ID, 'X-Naver-Client-Secret': NAVER_SECRET },
        }),
        8000, `naver-${query}`
      );
      if (!res.ok) return [];
      const { items = [] } = await res.json();
      return items.map((item, i) => ({
        id: `nv-${query}-${i}`,
        title: stripHtml(item.title ?? ''),
        summary: stripHtml(item.description ?? '').slice(0, 120),
        source: safeDomain(item.originallink || item.link || ''),
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        url: item.originallink || item.link || '#',
        type: '뉴스',
      })).filter(n => n.title.length > 5);
    })
  );
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

// ── 뉴스: Google RSS ────────────────────────────────────────
function parseRss(xml, prefix) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m, i) => {
    const raw = m[1];
    const getTag = (tag) => {
      const mm = raw.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
      return mm ? stripHtml(mm[1].trim()) : '';
    };
    const title   = getTag('title');
    const link    = raw.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ?? '#';
    const pubDate = raw.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? '';
    const src     = getTag('source') || extractSource(title);
    return {
      id: `${prefix}-${i}`, title, summary: '', source: src,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      url: link, type: '뉴스',
    };
  }).filter(n => n.title.length > 5);
}

async function fetchGoogleRss() {
  const queries = ['검단신도시', '검단+아파트', '인천+서구+검단', '검단+교통'];
  const results = await Promise.allSettled(queries.map(async (q, idx) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`;
    const res = await withTimeout(
      fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' } }),
      10000, `rss-${q}`
    );
    const xml = await res.text();
    return parseRss(xml, `gr${idx}`);
  }));
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

// ── 뉴스: 합치기 & 정리 ─────────────────────────────────────
async function fetchAllNews() {
  console.log('📰 Fetching news...');
  const [naver, google] = await Promise.all([fetchNaverNews(), fetchGoogleRss()]);
  const all = [...naver, ...google];

  // 중복 제거 (URL 기준)
  const seen = new Set();
  const unique = [];
  for (const a of all) {
    const key = a.url !== '#' ? a.url : a.title;
    if (!seen.has(key)) { seen.add(key); unique.push(a); }
  }

  // 최신순 정렬
  unique.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  console.log(`  ✓ Naver: ${naver.length}건, Google RSS: ${google.length}건 → 중복 제거 후 ${unique.length}건`);
  return unique.slice(0, 40);
}

// ── 유튜브: YouTube Data API v3 ─────────────────────────────
async function fetchYouTubeAPI() {
  if (!YT_API_KEY) return [];
  console.log('▶️  YouTube Data API...');
  try {
    const params = new URLSearchParams({
      part: 'snippet', q: '검단신도시', type: 'video',
      maxResults: '20', key: YT_API_KEY,
      regionCode: 'KR', relevanceLanguage: 'ko', order: 'date',
    });
    const res = await withTimeout(
      fetch(`https://www.googleapis.com/youtube/v3/search?${params}`),
      10000, 'yt-api'
    );
    if (!res.ok) return [];
    const { items = [] } = await res.json();
    return items.map((item, i) => {
      const videoId = item.id?.videoId ?? '';
      return {
        id: `ytapi-${i}`, videoId,
        title: item.snippet?.title ?? `검단 영상 ${i+1}`,
        channelName: item.snippet?.channelTitle ?? 'YouTube',
        thumbnail: item.snippet?.thumbnails?.medium?.url ?? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };
    }).filter(v => v.videoId);
  } catch (e) { console.error('  YT API error:', e.message); return []; }
}

// ── 유튜브: Invidious API ───────────────────────────────────
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.privacydev.net',
  'https://yt.artemislena.eu',
  'https://invidious.nerdvpn.de',
];

async function fetchYouTubeInvidious() {
  console.log('▶️  Invidious API...');
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const url = `${base}/api/v1/search?q=${encodeURIComponent('검단신도시')}&type=video&fields=videoId,title,author,videoThumbnails`;
      const res = await withTimeout(fetch(url), 10000, `invidious-${base}`);
      if (!res.ok) continue;
      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) continue;
      const videos = items.slice(0, 15).map((v, i) => {
        const videoId = v.videoId ?? '';
        const thumbs  = v.videoThumbnails ?? [];
        const thumb   = thumbs.find(t => t.quality === 'medium')?.url
          ?? thumbs.find(t => t.quality === 'high')?.url
          ?? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        return {
          id: `iv-${i}`, videoId,
          title: v.title ?? `검단 영상 ${i+1}`,
          channelName: v.author ?? 'YouTube',
          thumbnail: thumb.startsWith('http') ? thumb : `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        };
      }).filter(v => v.videoId?.length === 11);
      console.log(`  ✓ Invidious (${base}): ${videos.length}개`);
      return videos;
    } catch (e) { console.log(`  ✗ ${base}: ${e.message}`); }
  }
  return [];
}

// ── 유튜브: HTML 파싱 fallback ──────────────────────────────
async function fetchYouTubeHTML() {
  console.log('▶️  YouTube HTML parsing...');
  try {
    const res = await withTimeout(
      fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent('검단신도시')}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
      }),
      15000, 'yt-html'
    );
    const html = await res.text();
    const match = html.match(/var ytInitialData\s*=\s*(\{[\s\S]+?\});\s*(?:var |<\/script>)/);
    if (match) {
      try {
        const ytData = JSON.parse(match[1]);
        const sections = ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents ?? [];
        const videos = [];
        for (const section of sections) {
          for (const item of (section?.itemSectionRenderer?.contents ?? [])) {
            const vr = item?.videoRenderer;
            if (!vr?.videoId) continue;
            videos.push({
              id: `ythtml-${videos.length}`, videoId: vr.videoId,
              title: vr.title?.runs?.[0]?.text ?? '검단 영상',
              channelName: vr.ownerText?.runs?.[0]?.text ?? 'YouTube',
              thumbnail: `https://img.youtube.com/vi/${vr.videoId}/mqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${vr.videoId}`,
            });
            if (videos.length >= 15) break;
          }
          if (videos.length >= 15) break;
        }
        if (videos.length > 0) { console.log(`  ✓ HTML ytInitialData: ${videos.length}개`); return videos; }
      } catch {}
    }
    // regex fallback
    const seen = new Set(); const videos = [];
    for (const m of html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        videos.push({ id: `ythtml-${videos.length}`, videoId: m[1], title: `검단신도시 영상 ${videos.length+1}`, channelName: 'YouTube',
          thumbnail: `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`, url: `https://www.youtube.com/watch?v=${m[1]}` });
        if (videos.length >= 15) break;
      }
    }
    console.log(`  ✓ HTML regex: ${videos.length}개`);
    return videos;
  } catch (e) { console.error('  HTML error:', e.message); return []; }
}

async function fetchAllYouTube() {
  const apiVideos = await fetchYouTubeAPI();
  if (apiVideos.length > 0) return apiVideos;
  const invVideos = await fetchYouTubeInvidious();
  if (invVideos.length > 0) return invVideos;
  return fetchYouTubeHTML();
}

// ── 실행 ──────────────────────────────────────────────────
console.log('🚀 검단신도시 콘텐츠 캐시 갱신 시작...\n');
const t0 = Date.now();

const [news, youtube] = await Promise.all([fetchAllNews(), fetchAllYouTube()]);
const now = new Date().toISOString();

// 기존 캐시 유지 (새 데이터가 없으면 이전 데이터 보존)
const prevNews = loadCache(`${CACHE_DIR}/news.json`);
const prevYt   = loadCache(`${CACHE_DIR}/youtube.json`);

const finalNews    = news.length    > 0 ? news    : (prevNews?.articles  ?? []);
const finalVideos  = youtube.length > 0 ? youtube : (prevYt?.videos      ?? []);

writeFileSync(`${CACHE_DIR}/news.json`,    JSON.stringify({ fetchedAt: now, count: finalNews.length,   articles: finalNews   }, null, 2));
writeFileSync(`${CACHE_DIR}/youtube.json`, JSON.stringify({ fetchedAt: now, count: finalVideos.length, videos: finalVideos   }, null, 2));

console.log(`\n✅ 완료 (${((Date.now()-t0)/1000).toFixed(1)}s): 뉴스 ${finalNews.length}건, 유튜브 ${finalVideos.length}개`);
