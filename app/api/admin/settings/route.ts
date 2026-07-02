import { NextRequest, NextResponse } from "next/server";
import { validateAdminCookie } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

function configured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

function headers(prefer?: string): Record<string, string> {
  const result: Record<string, string> = {
    apikey: SERVICE_KEY,
    "Content-Type": "application/json",
  };
  if (SERVICE_KEY.startsWith("eyJ")) result.Authorization = `Bearer ${SERVICE_KEY}`;
  if (prefer) result.Prefer = prefer;
  return result;
}

function validSettingKey(value: string | null): value is string {
  return Boolean(value && /^[a-zA-Z0-9_.-]{1,100}$/.test(value));
}

export async function GET(req: NextRequest) {
  if (!validateAdminCookie(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!configured()) {
    return NextResponse.json({ error: "Supabase 서비스 키가 설정되지 않았습니다." }, { status: 503 });
  }

  const settingKey = req.nextUrl.searchParams.get("key");
  if (!validSettingKey(settingKey)) {
    return NextResponse.json({ error: "올바른 key가 필요합니다." }, { status: 400 });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/site_settings?key=eq.${encodeURIComponent(settingKey)}&select=value&limit=1`,
    { headers: headers(), cache: "no-store" },
  );
  if (!res.ok) {
    return NextResponse.json({ error: `DB error ${res.status}` }, { status: 502 });
  }
  const rows = await res.json() as Array<{ value?: unknown }>;
  return NextResponse.json({ value: rows[0]?.value ?? null });
}

export async function POST(req: NextRequest) {
  if (!validateAdminCookie(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!configured()) {
    return NextResponse.json({ error: "Supabase 서비스 키가 설정되지 않았습니다." }, { status: 503 });
  }

  const body = await req.json().catch(() => null) as { key?: string; value?: unknown } | null;
  if (!validSettingKey(body?.key ?? null) || body?.value === undefined) {
    return NextResponse.json({ error: "올바른 key와 value가 필요합니다." }, { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?on_conflict=key`, {
    method: "POST",
    headers: headers("resolution=merge-duplicates,return=minimal"),
    body: JSON.stringify([{
      key: body.key,
      value: body.value,
      updated_at: new Date().toISOString(),
    }]),
  });
  if (!res.ok) {
    const error = await res.text();
    return NextResponse.json({ error: error.slice(0, 300) }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
