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
  // Bearer only for real JWTs — sb_* publishable keys reject it as invalid JWS
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

// Try Supabase Management API to add anon RLS policies for site_settings.
// Works if any candidate key is a service role JWT or PAT.
async function tryFixSiteSettingsRls(): Promise<boolean> {
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) return false;

  const sql = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_settings' AND policyname='anon_select') THEN
    EXECUTE 'CREATE POLICY anon_select ON site_settings FOR SELECT TO anon USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_settings' AND policyname='anon_insert') THEN
    EXECUTE 'CREATE POLICY anon_insert ON site_settings FOR INSERT TO anon WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_settings' AND policyname='anon_update') THEN
    EXECUTE 'CREATE POLICY anon_update ON site_settings FOR UPDATE TO anon USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_settings' AND policyname='anon_delete') THEN
    EXECUTE 'CREATE POLICY anon_delete ON site_settings FOR DELETE TO anon USING (true)';
  END IF;
END $$;`;

  for (const key of candidateKeys()) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: sql }),
      });
      if (res.ok) {
        console.log("[admin/settings] RLS 정책 추가 성공:", key.slice(0, 20));
        return true;
      }
    } catch { /* try next key */ }
  }
  return false;
}

// GET /api/admin/settings?key=xxx
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
  const prefer = "resolution=merge-duplicates,return=minimal";
  let res = await callWithFallback("POST", "site_settings?on_conflict=key", payload, prefer);

  if (!res.ok) {
    // Read error body before consuming stream
    const errBody = await res.json().catch(() => ({}) as Record<string, string>);
    const errMsg: string = (errBody as Record<string, string>).message ?? (errBody as Record<string, string>).hint ?? "";

    // RLS violation (PostgreSQL code 42501) → try to add policies, then retry once
    if ((errBody as Record<string, string>).code === "42501" || errMsg.includes("row-level security")) {
      console.warn("[admin/settings] RLS 위반 감지 — 정책 자동 추가 시도");
      const fixed = await tryFixSiteSettingsRls();
      if (fixed) {
        res = await callWithFallback("POST", "site_settings?on_conflict=key", payload, prefer);
        if (res.ok) return NextResponse.json({ success: true });
      }
      // Fix didn't work — return helpful message
      return NextResponse.json({
        error: "site_settings 테이블에 쓰기 권한이 없습니다. Supabase SQL Editor에서 실행해 주세요:\nCREATE POLICY anon_insert ON site_settings FOR INSERT TO anon WITH CHECK (true);\nCREATE POLICY anon_update ON site_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);",
      }, { status: 500 });
    }

    const msg = errMsg || `DB error ${res.status}`;
    console.error("[admin/settings POST]", body.key, res.status, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
