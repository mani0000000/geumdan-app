import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_ID     = process.env.INSTAGRAM_APP_ID     ?? "";
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET ?? "";

export async function POST(req: NextRequest) {
  const { url } = await req.json().catch(() => ({})) as { url?: string };
  if (!url) return NextResponse.json({ error: "url 필요" }, { status: 400 });

  if (!APP_ID || !APP_SECRET) {
    return NextResponse.json(
      { error: "INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const token = `${APP_ID}|${APP_SECRET}`;
  const endpoint = new URL("https://graph.facebook.com/v19.0/instagram_oembed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("access_token", token);
  endpoint.searchParams.set("fields", "thumbnail_url,author_name,title,media_id,provider_name");

  try {
    const res = await fetch(endpoint.toString());
    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      return NextResponse.json(
        { error: (data.error as { message?: string })?.message ?? "oEmbed 오류" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
