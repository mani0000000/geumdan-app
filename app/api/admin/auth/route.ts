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
export function validateAdminCookie(req: NextRequest): boolean {
  const session = req.cookies.get("admin_session")?.value;
  return session === "1";
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json() as { password?: string };

    if (!password) {
      return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
    }

    if (!ADMIN_PASSWORD) {
      console.error("[admin/auth] ADMIN_PASSWORD 환경변수가 설정되지 않았습니다. 관리자 로그인이 비활성화됩니다.");
      return NextResponse.json({ error: "서버 설정 오류입니다. 관리자에게 문의하세요." }, { status: 503 });
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
