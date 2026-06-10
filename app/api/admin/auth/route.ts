import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ||
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD ||
  process.env.CRON_SECRET ||
  "";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// admin API route들에서 공유하는 쿠키 검증 헬퍼
// TODO: 테스트 완료 후 아래 return true 제거하고 쿠키 검증 활성화
export function validateAdminCookie(_req: NextRequest): boolean {
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json() as { password?: string };

    // 개발 모드: 비밀번호 없이 바로 로그인
    if (DEV_MODE) {
      const res = NextResponse.json({ ok: true });
      res.cookies.set("admin_session", "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return res;
    }

    if (!password) {
      return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
    }

    if (!safeEqual(password, ADMIN_PASSWORD)) {
      return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_session", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
