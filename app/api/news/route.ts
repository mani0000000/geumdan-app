import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const revalidate = 1800;

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

const QUERIES: Record<string, string[]> = {
  검단신도시: ["검단신도시", "검단+아파트"],
  인천:       ["인천+서구+검단", "인천+서구"],
  부동산:     ["검단+부동산", "검단+분양"],
  교통:       ["검단+지하철", "검단+버스", "검단+도로"],
};

const DEFAULT_CATEGORY = "검단신도시";

function stripXml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function tagVal(xml: string, tag: string): string {
  const m = xml.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`),
  );
  return m ? (m[1] ?? m[2] ?? "").trim() : "";
}

function extractSource(title: string): string {
  const m = title.match(/ - ([^-]+)$/);
  return m ? m[1].trim() : "뉴스";
}

function parseRssXml(xml: string, prefix: string): NewsArticle[] {
  if (!xml.includes("<item>")) return [];
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((m, i) => {
      const raw   = m[1];
      const title = stripXml(tagVal(raw, "title"));
      const link  = tagVal(raw, "link") || tagVal(raw, "guid");
      const desc  = stripXml(tagVal(raw, "description")).slice(0, 160);
      const pub   = tagVal(raw, "pubDate");
      const src   = stripXml(tagVal(raw, "source")) || extractSource(title);
      return {
        id: `${prefix}-${i}`,
        title,
        summary: desc,
        source: src,
        publishedAt: pub ? new Date(pub).toISOString() : new Date().toISOString(),
        url: link || "#",
        thumbnail: undefined,
        type: "뉴스" as const,
      };
    })
    .filter(n => n.title.length > 5 && n.url !== "#");
}

async function fetchRssQuery(query: string, prefix: string): Promise<NewsArticle[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GeumdanApp/1.0)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssXml(xml, prefix);
  } catch {
    return [];
  }
}

async function fetchSupabaseFallback(limit = 30): Promise<NewsArticle[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  try {
    const { data, error } = await supabase
      .from("news_articles")
      .select("id, title, summary, source, published_at, url, thumbnail")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data
      .map((row, i) => ({
        id: (row.id as string) ?? `db-${i}`,
        title: (row.title as string) ?? "",
        summary: (row.summary as string) ?? "",
        source: (row.source as string) ?? "DB",
        publishedAt: (row.published_at as string) ?? new Date().toISOString(),
        url: (row.url as string) ?? "",
        thumbnail: (row.thumbnail as string) ?? undefined,
        type: "뉴스" as const,
      }))
      .filter(a => a.title.length > 0 && a.url.length > 0);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const requested = sp.get("category") ?? DEFAULT_CATEGORY;
  const category = QUERIES[requested] ? requested : DEFAULT_CATEGORY;

  const queries = QUERIES[category];
  const t0 = Date.now();

  const results = await Promise.all(
    queries.map((q, i) => fetchRssQuery(q, `${category}-${i}`)),
  );

  const seen = new Set<string>();
  const merged: NewsArticle[] = [];
  for (const arr of results) {
    for (const a of arr) {
      const key = a.url !== "#" ? a.url : a.title;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(a);
      }
    }
  }
  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  let articles = merged.slice(0, 30);
  let source = "google-news-rss";

  if (articles.length === 0) {
    const fallback = await fetchSupabaseFallback();
    if (fallback.length > 0) {
      articles = fallback;
      source = "supabase";
    }
  }

  return Response.json(
    {
      category,
      source,
      ms: Date.now() - t0,
      fetchedAt: new Date().toISOString(),
      articles,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    },
  );
}
