import { NextRequest, NextResponse } from "next/server";
import { runRealestateBatch } from "@/lib/realestate-batch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET || "";
  // CRON_SECRET 미설정 시: Vercel 내부 크론 헤더가 있으면 허용, 없으면 로그 후 허용
  // (배포 환경에서 CRON_SECRET 없이도 cron이 동작하도록; 설정 시 Bearer 인증 강제)
  if (!expected) {
    if (req.headers.get("x-vercel-cron")) return true;
    console.warn("[cron/realestate] CRON_SECRET 미설정 — 보안을 위해 Vercel 대시보드에서 설정하세요");
    return true;
  }
  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${expected}`) return true;
  // 어드민 수동 호출 호환: x-cron-secret 헤더
  if (req.headers.get("x-cron-secret") === expected) return true;
  return false;
}

function loadEnv() {
  const apiKey =
    process.env.MOLIT_API_KEY ||
    process.env.DATA_GO_KR_API_KEY ||
    "";
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
  return { apiKey, supabaseUrl, supabaseKey };
}

async function handle(req: NextRequest, triggerSource: "cron" | "admin") {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { apiKey, supabaseUrl, supabaseKey } = loadEnv();
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

  // 쿼리 / 바디 옵션
  const { searchParams } = new URL(req.url);
  const monthsQ = searchParams.get("months");
  const ymQ     = searchParams.get("ym");
  let months = monthsQ ? parseInt(monthsQ, 10) || 1 : 1;
  let yearMonths: string[] | undefined = ymQ
    ? ymQ.split(",").map(s => s.trim()).filter(Boolean)
    : undefined;

  if (req.method === "POST") {
    try {
      const body = await req.json() as { months?: number; yearMonths?: string[]; ym?: string };
      if (typeof body.months === "number") months = body.months;
      if (Array.isArray(body.yearMonths) && body.yearMonths.length > 0) {
        yearMonths = body.yearMonths.map(String);
      } else if (typeof body.ym === "string") {
        yearMonths = body.ym.split(",").map(s => s.trim()).filter(Boolean);
      }
    } catch {
      // body 없거나 파싱 실패 → 쿼리 파라미터 사용
    }
  }

  try {
    const result = await runRealestateBatch({
      apiKey,
      supabaseUrl,
      supabaseKey,
      months,
      yearMonths,
      triggerSource,
    });
    return NextResponse.json({
      success: result.status !== "failed",
      ...result,
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Vercel Cron은 GET 으로 호출
  return handle(req, "cron");
}

export async function POST(req: NextRequest) {
  // 어드민 수동 실행
  return handle(req, "admin");
}
