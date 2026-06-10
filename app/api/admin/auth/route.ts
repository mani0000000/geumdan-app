import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ||
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD ||
  process.env.CRON_SECRET ||
  "";

// admin API route들에서 공유하는 쿠키 검증 헬퍼
// 개발/테스트 중 인증 비활성화 — 운영 전 복원 필요
export function validateAdminCookie(_req: NextRequest): boolean {
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json() as { password?: string };

    if (!password) {
      return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
    }

    if (!ADMIN_PASSWORD) {
      // 환경변수 미설정 시 개발 편의상 허용 (프로덕션에서는 반드시 설정)
      console.warn("[admin/auth] ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.");
      return NextResponse.json({ ok: true });
    }

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    // httpOnly 쿠키로 세션 유지 (7일)
    res.cookies.set("admin_session", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
