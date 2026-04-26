import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "admin-images";

function getStorageKey() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_ADMIN_DB_KEY || "";
  return { url, key };
}

function extractShortcode(postUrl: string): string | null {
  const m = postUrl.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

async function fetchOgImage(postUrl: string): Promise<string | null> {
  // Try the embed endpoint first — works without auth for public posts
  const shortcode = extractShortcode(postUrl);
  if (!shortcode) return null;

  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "Referer": "https://www.instagram.com/",
  };

  // 1) Try embed page for og:image
  try {
    const res = await fetch(embedUrl, { headers });
    const html = await res.text();
    const match = html.match(/<img[^>]+src="(https:\/\/[^"]*(?:instagram|cdninstagram|fbcdn)[^"]*)"[^>]*class="[^"]*EmbeddedMediaImage[^"]*"/i)
      || html.match(/background-image:\s*url\(["']?(https:\/\/[^"')]*(?:instagram|cdninstagram|fbcdn)[^"')]*)/i)
      || html.match(/{"src":"(https:[^"]+(?:instagram|cdninstagram|fbcdn)[^"]+)"/i);
    if (match) return match[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
  } catch { /* continue */ }

  // 2) Try og:image from the post page
  try {
    const res = await fetch(`https://www.instagram.com/p/${shortcode}/`, { headers });
    const html = await res.text();
    const m = html.match(/<meta[^>]+property="og:image"\s+content="([^"]+)"/i)
      || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);
    if (m) return m[1];
  } catch { /* continue */ }

  return null;
}

async function downloadAndReupload(
  imageUrl: string,
  shortcode: string,
  supabaseUrl: string,
  key: string,
): Promise<string | null> {
  try {
    const imgRes = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.instagram.com/",
      },
    });
    if (!imgRes.ok) return null;

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const path = `instagram/${shortcode}.${ext}`;
    const body = await imgRes.arrayBuffer();

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`,
      {
        method: "POST",
        headers: {
          "apikey": key,
          "Authorization": `Bearer ${key}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body,
      },
    );

    if (!uploadRes.ok) return null;
    return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
  } catch {
    return null;
  }
}

// GET /api/instagram/thumb?url=https://www.instagram.com/p/...
export async function GET(req: NextRequest) {
  const postUrl = req.nextUrl.searchParams.get("url");
  if (!postUrl) return NextResponse.json({ error: "url 파라미터 필요" }, { status: 400 });

  const shortcode = extractShortcode(postUrl);
  if (!shortcode) return NextResponse.json({ error: "유효하지 않은 Instagram URL" }, { status: 400 });

  const { url: supabaseUrl, key } = getStorageKey();

  // Check if already uploaded to Supabase
  const existingJpg = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/instagram/${shortcode}.jpg`;
  const existingWebp = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/instagram/${shortcode}.webp`;
  const existingPng = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/instagram/${shortcode}.png`;
  for (const cached of [existingJpg, existingWebp, existingPng]) {
    try {
      const check = await fetch(cached, { method: "HEAD" });
      if (check.ok) return NextResponse.json({ thumbnail: cached, cached: true });
    } catch { /* continue */ }
  }

  // Fetch from Instagram
  const ogImage = await fetchOgImage(postUrl);
  if (!ogImage) {
    return NextResponse.json({ error: "인스타그램에서 썸네일을 가져오지 못했습니다. 이미지를 직접 업로드해주세요." }, { status: 404 });
  }

  // Re-upload to Supabase for permanent URL
  if (key) {
    const permanent = await downloadAndReupload(ogImage, shortcode, supabaseUrl, key);
    if (permanent) return NextResponse.json({ thumbnail: permanent, cached: false });
  }

  // Fallback: return original CDN URL (may expire)
  return NextResponse.json({ thumbnail: ogImage, cached: false, warning: "임시 URL — 만료될 수 있습니다" });
}
