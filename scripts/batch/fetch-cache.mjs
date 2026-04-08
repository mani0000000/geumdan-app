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

// ── 유튜브: innertube API (키 불필요, 가장 안정적) ──────────
const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

async function fetchYouTubeInnertube(query = '검단신도시') {
  console.log(`▶️  YouTube innertube API (${query})...`);
  try {
    const res = await withTimeout(
      fetch(`https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({
          context: {
            client: { clientName: 'WEB', clientVersion: '2.20240101.00.00', hl: 'ko', gl: 'KR' },
          },
          query,
        }),
      }),
      15000, `innertube-${query}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents ?? [];
    const videos = [];
    for (const section of contents) {
      for (const item of (section?.itemSectionRenderer?.contents ?? [])) {
        const vr = item?.videoRenderer;
        if (!vr?.videoId) continue;
        videos.push({
          id: `yt-${videos.length}`, videoId: vr.videoId,
          title: vr.title?.runs?.[0]?.text ?? '검단 영상',
          channelName: vr.ownerText?.runs?.[0]?.text ?? 'YouTube',
          thumbnail: `https://img.youtube.com/vi/${vr.videoId}/mqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${vr.videoId}`,
        });
        if (videos.length >= 20) break;
      }
      if (videos.length >= 20) break;
    }
    console.log(`  ✓ innertube (${query}): ${videos.length}개`);
    return videos;
  } catch (e) { console.error(`  innertube error (${query}):`, e.message); return []; }
}

async function fetchAllYouTube() {
  // 1. YouTube Data API v3 (공식 키 있으면 우선 사용)
  const apiVideos = await fetchYouTubeAPI();
  if (apiVideos.length > 0) return apiVideos;

  // 2. innertube API — 카테고리별 병렬, 라운드로빈 교차 정렬
  const queries = [
    '검단신도시 맛집',
    '검단신도시 카페',
    '검단신도시 공원 볼거리',
    '검단신도시 브이로그 일상',
    '검단신도시 소식 뉴스',
  ];
  const results = await Promise.allSettled(queries.map(q => fetchYouTubeInnertube(q)));
  const buckets = results.map(r => (r.status === 'fulfilled' ? r.value : []));
  const seen = new Set();
  const merged = [];
  for (let round = 0; round < 5; round++) {
    for (const bucket of buckets) {
      const v = bucket[round];
      if (!v || seen.has(v.videoId)) continue;
      seen.add(v.videoId);
      merged.push(v);
    }
  }
  if (merged.length > 0) return merged.slice(0, 20);
  return [];
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
