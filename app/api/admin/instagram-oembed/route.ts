import { NextRequest, NextResponse } from "next/server";
import { validateAdminCookie } from "@/app/api/admin/auth/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_ID     = process.env.INSTAGRAM_APP_ID     ?? "";
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET ?? "";

// Instagram 공개 oEmbed (인증 불필요) — 썸네일·작성자명 제공
async function tryPublicOEmbed(url: string): Promise<Record<string, unknown> | null> {
  try {
    const endpoint = new URL("https://www.instagram.com/api/v1/oembed/");
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("hidecaption", "false");
    endpoint.searchParams.set("maxwidth", "640");
    const res = await fetch(endpoint.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Facebook Graph API oEmbed (앱 ID·시크릿 필요, 더 안정적)
async function tryGraphOEmbed(url: string): Promise<Record<string, unknown> | null> {
  if (!APP_ID || !APP_SECRET) return null;
  try {
    const token = `${APP_ID}|${APP_SECRET}`;
    const endpoint = new URL("https://graph.facebook.com/v19.0/instagram_oembed");
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("access_token", token);
    endpoint.searchParams.set("fields", "thumbnail_url,author_name,title,media_id,provider_name");
    const res = await fetch(endpoint.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!validateAdminCookie(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { url } = await req.json().catch(() => ({})) as { url?: string };
  if (!url) return NextResponse.json({ error: "url 필요" }, { status: 400 });

  // 1순위: Facebook Graph API (설정된 경우)
  const graphData = await tryGraphOEmbed(url);
  if (graphData) return NextResponse.json(graphData);

  // 2순위: Instagram 공개 oEmbed (인증 불필요)
  const publicData = await tryPublicOEmbed(url);
  if (publicData) return NextResponse.json(publicData);

  return NextResponse.json(
    { error: "썸네일을 가져올 수 없습니다. Instagram URL이 올바른지 확인해 주세요." },
    { status: 422 }
  );
}
