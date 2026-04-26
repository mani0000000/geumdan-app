import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getKey() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk";
  const key = process.env.SUPABASE_SERVICE_KEY || anonKey;
  return { url, key, usingServiceKey: !!process.env.SUPABASE_SERVICE_KEY };
}

async function pgGet(url: string, key: string, path: string) {
  const headers: Record<string, string> = { "apikey": key };
  if (key.startsWith("eyJ")) headers["Authorization"] = `Bearer ${key}`;
  const res = await fetch(`${url}/rest/v1/${path}`, { headers });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 300) };
}

export async function GET() {
  const { url, key, usingServiceKey } = getKey();

  const keyType = usingServiceKey
    ? "✅ SUPABASE_SERVICE_KEY (서비스 롤 — RLS 우회)"
    : `⚠️ 어논 키 (RLS 적용됨) — ${key.slice(0, 30)}...`;

  const tables = ["banners", "places", "buildings", "stores", "marts", "site_settings", "community_posts"];
  const results: Record<string, string> = {};

  for (const table of tables) {
    try {
      const r = await pgGet(url, key, `${table}?select=id`);
      if (r.ok) {
        let count = "?";
        try { count = String(JSON.parse(r.body).length); } catch { count = r.body.slice(0, 30); }
        results[table] = `✅ OK — 행 ${count}개`;
      } else {
        results[table] = `❌ ${r.status} — ${r.body}`;
      }
    } catch (e) {
      results[table] = `❌ 예외: ${String(e)}`;
    }
  }

  return NextResponse.json({
    usingServiceKey,
    keyType,
    keyPrefix: key.slice(0, 32) + "...",
    fix: usingServiceKey
      ? "정상 — 서비스 키로 RLS 우회 중"
      : "Vercel 환경변수에 SUPABASE_SERVICE_KEY(서비스 롤 키)를 추가하면 해결됩니다",
    tableResults: results,
  });
}
