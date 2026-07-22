import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REJECTED_ASSET = /blank[_-]?img|spacer|transparent|\/common\/.*(?:logo|ci)|kakao(?:talk)?|shareimage|thumbnail\.png|%7b|\{\{/i;

function safeRemoteUrl(value: string | null, base?: string) {
  if (!value || REJECTED_ASSET.test(value)) return null;
  try {
    const url = new URL(value, base);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname)) return null;
    return url;
  } catch { return null; }
}

function attr(tag: string, name: string) {
  return tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] ?? null;
}

function pageArtwork(html: string, sourceUrl: string) {
  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of images) {
    const candidate = attr(tag, "data-original") || attr(tag, "data-src") || attr(tag, "src");
    const url = safeRemoteUrl(candidate, sourceUrl);
    const width = Number(attr(tag, "width") ?? 0);
    const height = Number(attr(tag, "height") ?? 0);
    if (url && !/icon|logo|sprite|loading|view\.svg|bbs_(?:up|down)/i.test(`${candidate} ${attr(tag, "class") ?? ""}`)
      && (!width || width >= 320) && (!height || height >= 240)) return url;
  }
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const key = attr(tag, "property") || attr(tag, "name");
    if (!/^(og:image|twitter:image)$/i.test(key ?? "")) continue;
    const url = safeRemoteUrl(attr(tag, "content"), sourceUrl);
    if (url) return url;
  }
  return null;
}

async function fetchImage(url: URL, referer: string) {
  const response = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(9000),
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: referer,
    },
  });
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !response.body || !type.startsWith("image/")) return null;
  return new NextResponse(response.body, { headers: {
    "Content-Type": type,
    "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=604800",
    "X-Content-Type-Options": "nosniff",
  }});
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.slice(0, 80);
  if (!id) return NextResponse.json({ error: "invalid promotion" }, { status: 400 });
  const { data } = await supabase.from("brand_promotions")
    .select("image_url,source_url").eq("id", id).eq("active", true).maybeSingle();
  const source = safeRemoteUrl(data?.source_url ?? null);
  if (!source) return NextResponse.json({ error: "unavailable" }, { status: 404 });

  const stored = safeRemoteUrl(data?.image_url ?? null, source.toString());
  if (stored) {
    try {
      const response = await fetchImage(stored, source.origin);
      if (response) return response;
    } catch { /* detail page fallback */ }
  }

  try {
    const page = await fetch(source, {
      cache: "no-store", signal: AbortSignal.timeout(9000),
      headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1", "Accept-Language": "ko-KR,ko;q=0.9" },
    });
    if (page.ok) {
      const artwork = pageArtwork((await page.text()).slice(0, 2_500_000), page.url);
      if (artwork) {
        const response = await fetchImage(artwork, new URL(page.url).origin);
        if (response) return response;
      }
    }
  } catch { /* return visual fallback in the client */ }
  return NextResponse.json({ error: "image unavailable" }, { status: 404, headers: { "Cache-Control": "public, s-maxage=600" } });
}
