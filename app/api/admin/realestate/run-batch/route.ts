import { NextRequest, NextResponse } from "next/server";
import { runRealestateBatch } from "@/lib/realestate-batch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 어드민 백오피스에서 부동산 배치를 수동 실행한다.
 * 어드민 페이지 자체는 클라이언트 단에서 sessionStorage로 보호되며,
 * 본 라우트는 동일 패턴(/api/admin/db 등)을 따른다.
 */
export async function POST(req: NextRequest) {
  const apiKey =
    process.env.MOLIT_API_KEY ||
    process.env.DATA_GO_KR_API_KEY ||
    "";
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

  if (!apiKey || !supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      error: "환경변수 누락",
      missing: {
        MOLIT_API_KEY:        !apiKey,
        SUPABASE_URL:         !supabaseUrl,
        SUPABASE_SERVICE_KEY: !supabaseKey,
      },
    }, { status: 500 });
  }

  let months = 1;
  let yearMonths: string[] | undefined;
  try {
    const body = await req.json() as { months?: number; yearMonths?: string[]; ym?: string };
    if (typeof body.months === "number" && body.months > 0) months = body.months;
    if (Array.isArray(body.yearMonths) && body.yearMonths.length > 0) {
      yearMonths = body.yearMonths.map(String);
    } else if (typeof body.ym === "string" && body.ym) {
      yearMonths = body.ym.split(",").map(s => s.trim()).filter(Boolean);
    }
  } catch {
    /* body 없으면 기본값(전월 1개월) 사용 */
  }

  try {
    const result = await runRealestateBatch({
      apiKey, supabaseUrl, supabaseKey,
      months, yearMonths,
      triggerSource: "admin",
    });
    return NextResponse.json({ success: result.status !== "failed", ...result });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
