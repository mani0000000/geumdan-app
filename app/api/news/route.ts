import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  thumbnail: string | null;
}

/**
 * Google News RSS 파싱 헬퍼
 */
function stripXml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}

function tagVal(xml: string, tag: string): string {
  const m = xml.match(
    new RegExp(
      `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`
    )
  );
  return m ? (m[1] ?? m[2] ?? "").trim() : "";
}

function extractSource(title: string): string {
  const m = title.match(/ - ([^-]+)$/);
  return m ? m[1].trim() : "뉴스";
}

/**
 * 기사 URL에서 og:image / twitter:image 추출 (서버 사이드 전용)
 */
async function fetchOgImage(url: string): Promise<string | null> {
  if (!url || url === "#") return null;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(tid);
    if (!res.ok || !res.headers.get("content-type")?.includes("text")) return null;

    // 첫 60KB만 읽어 og:image 탐색
    const reader = res.body?.getReader();
    if (!reader) return null;
    let html = "";
    while (html.length < 60_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      if (html.includes("og:image") || html.includes("twitter:image")) break;
    }
    reader.cancel().catch(() => {});

    const og =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1] ??
      html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i)?.[1] ??
      null;

    if (!og) return null;
    // 상대 URL 처리
    if (og.startsWith("http")) return og;
    try {
      return new URL(og, url).href;
    } catch { return null; }
  } catch {
    return null;
  }
}

/**
 * 썸네일이 없는 기사들을 og:image로 보강 (상위 N건, 병렬)
 */
async function enrichWithOgImages(items: NewsItem[], limit = 10): Promise<NewsItem[]> {
  const enriched = [...items];
  const targets = enriched
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => !item.thumbnail)
    .slice(0, limit);

  await Promise.allSettled(
    targets.map(async ({ item, idx }) => {
      const img = await fetchOgImage(item.link);
      if (img) enriched[idx] = { ...item, thumbnail: img };
    })
  );

  return enriched;
}

/**
 * RSS XML 파싱
 */
function parseRssXml(xml: string): NewsItem[] {
  if (!xml.includes("<item>")) return [];

  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const raw = match[1];
    const title = stripXml(tagVal(raw, "title"));
    const link = tagVal(raw, "link") || tagVal(raw, "guid");
    const desc = stripXml(tagVal(raw, "description")).slice(0, 200);
    const pub = tagVal(raw, "pubDate");
    const src = tagVal(raw, "source") || extractSource(title);

    if (title.length > 5) {
      items.push({
        title,
        link: link || "#",
        pubDate: pub ? new Date(pub).toISOString() : new Date().toISOString(),
        source: src,
        description: desc,
        thumbnail: null,
      });
    }

    if (items.length >= 30) break;
  }

  return items;
}

/**
 * CORS 프록시를 통한 RSS 페칭
 */
async function fetchRssWithCors(rssUrl: string): Promise<string> {
  const timeoutMs = 7000;

  // allorigins.win 시도
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`,
      { signal: ctrl.signal, cache: "no-store" }
    );
    clearTimeout(tid);
    if (res.ok) {
      const j = await res.json();
      return (j.contents as string) ?? "";
    }
  } catch {
    /* continue to next proxy */
  }

  // corsproxy.io 시도
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(
      `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`,
      { signal: ctrl.signal, cache: "no-store" }
    );
    clearTimeout(tid);
    if (res.ok) {
      return await res.text();
    }
  } catch {
    /* fallback */
  }

  return "";
}

/**
 * Google News RSS 페칭 (썸네일 없음)
 */
async function fetchGoogleNewsRss(): Promise<NewsItem[]> {
  const rssUrl =
    "https://news.google.com/rss/search?q=검단신도시&hl=ko&gl=KR&ceid=KR:ko";

  try {
    const xml = await fetchRssWithCors(rssUrl);
    if (!xml) return [];
    return parseRssXml(xml);
  } catch {
    return [];
  }
}

/**
 * Supabase news_articles 우선 조회 (썸네일 포함, 배치 스크립트가 og:image 추출 후 저장)
 */
async function fetchFromSupabase(): Promise<NewsItem[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from("news_articles")
      .select("title, url, source, summary, thumbnail, published_at")
      .order("published_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data
      .filter((r) => r.title && r.url)
      .map((r) => ({
        title: r.title as string,
        link: r.url as string,
        pubDate: (r.published_at as string) ?? new Date().toISOString(),
        source: (r.source as string) ?? "뉴스",
        description: (r.summary as string) ?? "",
        thumbnail: (r.thumbnail as string) ?? null,
      }));
  } catch (err) {
    console.error("[/api/news] Supabase fetch failed:", err);
    return [];
  }
}

export async function GET() {
  try {
    // 1순위: 배치로 채워둔 Supabase 데이터 (썸네일 포함)
    let items = await fetchFromSupabase();
    let source: "supabase" | "rss" = "supabase";

    // 2순위: 라이브 RSS + og:image 보강
    if (items.length === 0) {
      const rssItems = await fetchGoogleNewsRss();
      // 썸네일 없는 기사에 og:image 추출 (상위 10건 병렬)
      items = await enrichWithOgImages(rssItems, 10);
      source = "rss";
    } else {
      // Supabase 기사 중 썸네일 없는 것도 보강
      const missing = items.filter(i => !i.thumbnail).length;
      if (missing > 0) {
        items = await enrichWithOgImages(items, Math.min(missing, 10));
      }
    }

    return NextResponse.json(
      { items, success: true, source, timestamp: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[/api/news] Error:", error);
    return NextResponse.json(
      {
        items: [],
        success: false,
        error: "Failed to fetch news",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
