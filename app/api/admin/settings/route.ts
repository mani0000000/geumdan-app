import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_ADMIN_DB_KEY || "";
  return { url, key };
}

// GET /api/admin/settings?key=logo_url
export async function GET(req: NextRequest) {
  const { url, key } = getSupabaseConfig();
  const settingKey = req.nextUrl.searchParams.get("key");
  if (!settingKey) return NextResponse.json({ error: "key is required" }, { status: 400 });

  const res = await callPostgrest(url, key, "GET", `site_settings?key=eq.${settingKey}&select=value&limit=1`);
  if (!res.ok) return NextResponse.json({ value: null });

  const rows = await res.json();
  return NextResponse.json({ value: rows?.[0]?.value ?? null });
}

// POST /api/admin/settings  { key, value }
export async function POST(req: NextRequest) {
  const { url, key } = getSupabaseConfig();
  if (!key) return NextResponse.json({ error: "서비스 키가 설정되지 않았습니다" }, { status: 500 });

  const body = await req.json().catch(() => null);
  if (!body?.key || body.value === undefined) {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 });
  }

  const payload = JSON.stringify([{ key: body.key, value: body.value, updated_at: new Date().toISOString() }]);
  const res = await callPostgrest(url, key, "POST", "site_settings?on_conflict=key", payload);

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string; hint?: string };
    return NextResponse.json({ error: err.message || err.hint || `DB error ${res.status}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function callPostgrest(
  supabaseUrl: string,
  serviceKey: string,
  method: string,
  path: string,
  body?: string,
): Promise<Response> {
  const isJwt = serviceKey.startsWith("eyJ");
  const headers: Record<string, string> = {
    "apikey": serviceKey,
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=minimal",
  };
  // Only use Bearer when the key is a real JWT — new sb_* format keys cause
  // "Invalid Compact JWS" when sent as Authorization Bearer
  if (isJwt) headers["Authorization"] = `Bearer ${serviceKey}`;

  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers,
    body: method !== "GET" ? body : undefined,
  });
}
