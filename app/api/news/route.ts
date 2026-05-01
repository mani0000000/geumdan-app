import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const revalidate = 1800; // 30 minutes

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  thumbnail?: string;
  type: "뉴스";
}

const DEFAULT_QUERIES = ["검단신도시", "검단 아파트", "인천 서구 검단"];
const NAVER_ID     = process.env.NAVER_CLIENT_ID
  ?? process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
  ?? "";
const NAVER_SECRET = process.env.NAVER_CLIENT_SECRET
  ?? process.env.NEXT_PUBLIC_NAVER_CLIENT_SECRET
  ?? "";

function stripHtml(s = ""): string {
  return s.replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}
function safeDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return "뉴스"; }
}
function extractSource(title: string): string {
  const m = title.match(/ - ([^-]+)$/);
  return m ? m[1].trim() : "뉴스";
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), ms);
  try { return await p; } finally { clearTimeout(tid); }
}

async function fetchNaver(query: string): Promise<NewsArticle[]> {
  if (!NAVER_ID || !NAVER_SECRET) return [];
  try {
    const params = new URLSearchParams({ query, display: "20", sort: "date" });
    const res = await withTimeout(
      fetch(`https://openapi.naver.com/v1/search/news.json?${params}`, {
        headers: { "X-Naver-Client-Id": NAVER_ID, "X-Naver-Client-Secret": NAVER_SECRET },
        next: { revalidate: 1800 },
      }),
      8000,
    );
    if (!res.ok) return [];
    const json = await res.json() as { items?: Array<Record<string, string>> };
    return (json.items ?? []).map((item, i) => ({
      id: `nv-${query}-${i}`,
      title: stripHtml(item.title ?? ""),
      summary: stripHtml(item.description ?? "").slice(0, 120),
      source: safeDomain(item.originallink || item.link || ""),
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      url: item.originallink || item.link || "#",
      type: "뉴스" as const,
    })).filter(n => n.title.length > 5);
  } catch { return []; }
}

function parseRss(xml: string, prefix: string): NewsArticle[] {
  const matches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  return matches.map((m, i) => {
    const raw = m[1];
    const tag = (t: string): string => {
      const mm = raw.match(new RegExp(`<${t}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${t}>`));
      return mm ? stripHtml(mm[1].trim()) : "";
    };
    const title   = tag("title");
    const link    = raw.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ?? "#";
    const pubDate = raw.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? "";
    const src     = tag("source") || extractSource(title);
    return {
      id: `${prefix}-${i}`,
      title,
      summary: "",
      source: src,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      url: link,
      type: "뉴스" as const,
    };
  }).filter(n => n.title.length > 5);
}

async function fetchGoogleRss(query: string, idx: number): Promise<NewsArticle[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
    const res = await withTimeout(
      fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; GeumdanNewsBot/1.0)" },
        next: { revalidate: 1800 },
      }),
      10000,
    );
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, `gr${idx}`);
  } catch { return []; }
}

function dedupSort(all: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  const out: NewsArticle[] = [];
  for (const a of all) {
    const key = a.url !== "#" ? a.url : a.title;
    if (!seen.has(key)) { seen.add(key); out.push(a); }
  }
  out.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return out;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q");
  const limitRaw = Number(sp.get("limit") ?? "30");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 60) : 30;
  const queries = q ? [q] : DEFAULT_QUERIES;

  const t0 = Date.now();
  const naverResults = await Promise.all(queries.map(fetchNaver));
  const rssResults   = await Promise.all(queries.map((qq, i) => fetchGoogleRss(qq, i)));
  const naverFlat = naverResults.flat();
  const rssFlat   = rssResults.flat();

  const merged = dedupSort([...naverFlat, ...rssFlat]).slice(0, limit);

  const usedSources: string[] = [];
  if (naverFlat.length > 0) usedSources.push("naver");
  if (rssFlat.length > 0)   usedSources.push("google-rss");

  return Response.json(
    {
      fetchedAt: new Date().toISOString(),
      count: merged.length,
      sources: usedSources,
      ms: Date.now() - t0,
      articles: merged,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    },
  );
}
