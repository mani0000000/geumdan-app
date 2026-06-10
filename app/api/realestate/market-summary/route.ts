/**
 * GET /api/realestate/market-summary
 *
 * apartment_trades / apartment_rentals DB 데이터를 기반으로
 * 단지별·평형별 최근 6개월 평균 시세를 계산해 반환한다 (KB시세 대체 지표).
 *
 * 캐시: 30분 (s-maxage=1800, stale-while-revalidate=3600)
 */

import { NextResponse } from "next/server";
import { calcMarketSummary } from "@/lib/reb-price";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase 환경변수 미설정" },
      { status: 500 },
    );
  }

  try {
    const summaries = await calcMarketSummary(supabaseUrl, supabaseKey);
    return NextResponse.json(
      {
        summaries,
        calculatedAt: new Date().toISOString(),
        source: "db_calc" as const,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  } catch (err) {
    console.error("[market-summary] 계산 실패:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "시세 계산 실패" },
      { status: 500 },
    );
  }
}
