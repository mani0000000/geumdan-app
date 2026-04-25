import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || "";
  const adminKey = process.env.NEXT_PUBLIC_ADMIN_DB_KEY || "";

  const keyInUse = serviceKey || adminKey || "없음";
  const isJwt = keyInUse.startsWith("eyJ");
  const keyFormat = isJwt ? "JWT (eyJ...)" : keyInUse.startsWith("sb_") ? `sb_* 포맷 (${keyInUse.slice(0, 20)}...)` : "미설정";

  // Test 1: Storage upload test (small blob)
  let storageResult = "";
  try {
    const testPath = `_test/${Date.now()}.txt`;
    const headers: Record<string, string> = { "apikey": keyInUse, "Content-Type": "text/plain", "x-upsert": "true" };
    if (isJwt) headers["Authorization"] = `Bearer ${keyInUse}`;

    const res = await fetch(`${supabaseUrl}/storage/v1/object/admin-images/${testPath}`, {
      method: "POST", headers, body: "test",
    });
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    storageResult = res.ok ? "✅ 성공" : `❌ ${res.status} — ${body.error ?? body.message ?? JSON.stringify(body)}`;
  } catch (e) {
    storageResult = `❌ 예외: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 2: DB read test
  let dbReadResult = "";
  try {
    const headers: Record<string, string> = { "apikey": keyInUse, "Content-Type": "application/json" };
    if (isJwt) headers["Authorization"] = `Bearer ${keyInUse}`;

    const res = await fetch(`${supabaseUrl}/rest/v1/site_settings?limit=1`, { headers });
    const body = await res.text();
    dbReadResult = res.ok ? `✅ 성공 (${res.status})` : `❌ ${res.status} — ${body.slice(0, 200)}`;
  } catch (e) {
    dbReadResult = `❌ 예외: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test 3: DB write test
  let dbWriteResult = "";
  try {
    const headers: Record<string, string> = {
      "apikey": keyInUse, "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=minimal",
    };
    if (isJwt) headers["Authorization"] = `Bearer ${keyInUse}`;

    const res = await fetch(`${supabaseUrl}/rest/v1/site_settings?on_conflict=key`, {
      method: "POST", headers,
      body: JSON.stringify([{ key: "_test_key", value: "test", updated_at: new Date().toISOString() }]),
    });
    const body = await res.text();
    dbWriteResult = res.ok ? `✅ 성공 (${res.status})` : `❌ ${res.status} — ${body.slice(0, 200)}`;
  } catch (e) {
    dbWriteResult = `❌ 예외: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({
    keyFormat,
    isJwt,
    supabaseUrl,
    tests: {
      storage: storageResult,
      dbRead: dbReadResult,
      dbWrite: dbWriteResult,
    },
  });
}
