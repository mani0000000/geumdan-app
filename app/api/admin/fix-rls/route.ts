import { NextRequest, NextResponse } from "next/server";
import { validateAdminCookie } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!validateAdminCookie(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  return NextResponse.json(
    { error: "이 엔드포인트는 보안상 폐쇄되었습니다. Supabase 마이그레이션을 사용하세요." },
    { status: 410 },
  );
}
