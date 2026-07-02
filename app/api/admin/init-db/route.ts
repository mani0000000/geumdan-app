import { NextRequest, NextResponse } from "next/server";
import { validateAdminCookie } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function gone(req: NextRequest) {
  if (!validateAdminCookie(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  return NextResponse.json(
    { error: "런타임 DB 초기화는 폐쇄되었습니다. 버전 관리된 Supabase 마이그레이션을 사용하세요." },
    { status: 410 },
  );
}

export async function GET(req: NextRequest) {
  return gone(req);
}

export async function POST(req: NextRequest) {
  return gone(req);
}
