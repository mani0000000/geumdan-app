import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";
const DEFAULT_ANON = "sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk";

function candidateKeys(): string[] {
  return [
    process.env.SUPABASE_SERVICE_KEY,
    process.env.NEXT_PUBLIC_ADMIN_DB_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    DEFAULT_ANON,
  ].filter((k): k is string => typeof k === "string" && k.length > 10);
}

function makeHeaders(key: string, prefer?: string): Record<string, string> {
  const h: Record<string, string> = { "apikey": key, "Content-Type": "application/json" };
  if (prefer) h["Prefer"] = prefer;
  // Bearer header only for real JWTs — sb_* publishable keys reject it as invalid JWS
  if (key.startsWith("eyJ")) h["Authorization"] = `Bearer ${key}`;
  return h;
}

async function callWithFallback(
  method: string,
  path: string,
  body?: string,
  prefer?: string,
): Promise<Response> {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const keys = candidateKeys();
  let last!: Response;
  for (const key of keys) {
    last = await fetch(url, {
      method,
      headers: makeHeaders(key, prefer),
      body: method !== "GET" ? body : undefined,
    });
    if (last.status !== 401 && last.status !== 403) return last;
  }
  return last;
}

// GET /api/admin/settings?key=logo_url
export async function GET(req: NextRequest) {
  const settingKey = req.nextUrl.searchParams.get("key");
  if (!settingKey) return NextResponse.json({ error: "key is required" }, { status: 400 });

  const res = await callWithFallback("GET", `site_settings?key=eq.${encodeURIComponent(settingKey)}&select=value&limit=1`);
  if (!res.ok) return NextResponse.json({ value: null });

  const rows = await res.json();
  return NextResponse.json({ value: rows?.[0]?.value ?? null });
}

// POST /api/admin/settings  { key, value }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.key || body.value === undefined) {
    return NextResponse.json({ error: "key and value are required" }, { status: 400 });
  }

  const payload = JSON.stringify([{ key: body.key, value: body.value, updated_at: new Date().toISOString() }]);
  const res = await callWithFallback("POST", "site_settings?on_conflict=key", payload, "resolution=merge-duplicates,return=minimal");

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string; hint?: string };
    const msg = err.message || err.hint || `DB error ${res.status}`;
    console.error("[admin/settings POST]", body.key, res.status, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

