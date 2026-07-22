import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname)) return null;
    return url;
  } catch { return null; }
}

function deviceUrl(target: URL, userAgent: string) {
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  if (!mobile) return target;
  // 공식 모바일 도메인이 별도로 운영되는 브랜드만 변환하고, 나머지는
  // 동일 URL에 모바일 UA가 전달되어 각 공식 사이트의 반응형 화면을 사용한다.
  if (target.hostname === "www.starbucks.co.kr") target.hostname = "m.starbucks.co.kr";
  return target;
}

/** 공식 행사 페이지를 복제하지 않고 브랜드 원문으로만 이동한다. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.slice(0, 80);
  if (!id) return new NextResponse("Invalid promotion", { status: 400 });
  const { data, error } = await supabase.from("brand_promotions").select("source_url").eq("id", id).eq("active", true).maybeSingle();
  const target = safeUrl(data?.source_url ?? null);
  if (error || !target) return new NextResponse("Unregistered promotion", { status: 403 });
  const responsiveTarget = deviceUrl(target, request.headers.get("user-agent") ?? "");
  return NextResponse.redirect(responsiveTarget, { status: 307, headers: {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
    Vary: "User-Agent",
  }});
}
