import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

const TOKEN_VERSION = "v1";

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createAdminSessionToken(nowMs = Date.now(), secret = sessionSecret()): string {
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  const expiresAt = Math.floor(nowMs / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const payload = `${TOKEN_VERSION}.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyAdminSessionToken(
  token: string | undefined,
  nowMs = Date.now(),
  secret = sessionSecret(),
): boolean {
  if (!token || !secret) return false;
  const [version, expiresRaw, signature, ...rest] = token.split(".");
  if (rest.length > 0 || version !== TOKEN_VERSION || !expiresRaw || !signature) return false;

  const expiresAt = Number(expiresRaw);
  const now = Math.floor(nowMs / 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return false;
  if (expiresAt > now + ADMIN_SESSION_TTL_SECONDS + 60) return false;

  const payload = `${version}.${expiresRaw}`;
  return safeEqual(signature, sign(payload, secret));
}

export function validateAdminCookie(req: NextRequest): boolean {
  return verifyAdminSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    path: "/",
  };
}
