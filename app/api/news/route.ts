import { NextResponse } from "next/server";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
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
 * Google News RSS 페칭
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

export async function GET() {
  try {
    const items = await fetchGoogleNewsRss();

    return NextResponse.json(
      { items, success: true, timestamp: new Date().toISOString() },
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
