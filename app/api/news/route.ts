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

    // 2순위: 라이브 RSS (썸네일 없음, 비상시)
    if (items.length === 0) {
      items = await fetchGoogleNewsRss();
      source = "rss";
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
