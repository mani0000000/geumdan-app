import { NextResponse } from "next/server";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripXml(s: string): string {
  // Google News RSS double-encodes description content (e.g. `&amp;nbsp;`),
  // so we decode entities twice before stripping the resulting tags.
  return decodeEntities(decodeEntities(s))
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
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

    if (items.length >= 50) break;
  }

  return items;
}

const RSS_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, */*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.5",
};

async function fetchRssDirect(rssUrl: string, timeoutMs = 8000): Promise<string> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(rssUrl, {
      headers: RSS_HEADERS,
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(tid);
  }
}

const NEWS_QUERIES = ["검단신도시", "검단 아파트", "인천 서구 검단"];

async function fetchOneQuery(query: string): Promise<NewsItem[]> {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
  const xml = await fetchRssDirect(rssUrl);
  if (!xml) return [];
  return parseRssXml(xml);
}

async function fetchGoogleNewsRss(): Promise<NewsItem[]> {
  const results = await Promise.all(NEWS_QUERIES.map(fetchOneQuery));

  const seen = new Set<string>();
  const merged: NewsItem[] = [];
  for (const arr of results) {
    for (const item of arr) {
      const key = item.link !== "#" ? item.link : item.title;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }

  merged.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
  return merged.slice(0, 30);
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const items = await fetchGoogleNewsRss();

    return NextResponse.json(
      { items, success: true, timestamp: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
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
