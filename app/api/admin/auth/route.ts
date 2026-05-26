import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 비밀번호는 ADMIN_PASSWORD 환경변수. 없으면 빌드-인 폴백(배포 전 반드시 env 설정 권장).
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Geumdan@2026!";
// 세션 토큰(서버-전용). 클라이언트에는 절대 노출되지 않는다.
const ADMIN_SESSION_TOKEN = process.env.ADMIN_SESSION_TOKEN ?? "gd_admin_9f3k2m8x";

const COOKIE_NAME  = "gd_admin_session";
const COOKIE_MAX   = 60 * 60 * 8; // 8시간

export async function POST(req: NextRequest) {
  let body: { password?: string } = {};
  try { body = await req.json(); } catch { /* empty body */ }

  if (!body.password || body.password !== ADMIN_PASSWORD) {
    // 타이밍 공격 방지: 같은 지연 적용
    await new Promise(r => setTimeout(r, 300));
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, ADMIN_SESSION_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX,
    path: "/api/admin",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/api/admin" });
  return res;
}

/** 서버 내부에서 세션 쿠키를 검증하는 헬퍼 (다른 route.ts에서 import) */
export function validateAdminCookie(req: NextRequest): boolean {
  const cookie = req.cookies.get(COOKIE_NAME);
  return cookie?.value === ADMIN_SESSION_TOKEN;
}
