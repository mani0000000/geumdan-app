import { NextRequest, NextResponse } from "next/server";
import { validateAdminCookie } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";

function getKey() {
  const key = process.env.SUPABASE_SERVICE_KEY || "";

  const isServiceKey = !!process.env.SUPABASE_SERVICE_KEY;
  const keySource = isServiceKey ? "SUPABASE_SERVICE_KEY" : "MISSING";

  return { key, keySource, isServiceKey };
}

async function pgReq(key: string, method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = {
    "apikey": key,
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
  };
  if (key.startsWith("eyJ")) headers["Authorization"] = `Bearer ${key}`;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text.slice(0, 200) };
}

export async function GET(req: NextRequest) {
  if (!validateAdminCookie(req)) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { key, keySource, isServiceKey } = getKey();
  if (!key) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_KEY가 설정되지 않았습니다." }, { status: 503 });
  }

  // ── 1. 읽기 테스트 ──────────────────────────────────────────
  const TABLES = ["banners", "marts", "stores", "pharmacies", "community_posts", "sports_matches", "home_widget_config"];
  const readResults: Record<string, string> = {};

  for (const table of TABLES) {
    try {
      const r = await pgReq(key, "GET", `${table}?select=id&limit=5`);
      if (r.ok) {
        let count = "?";
        try { count = String(JSON.parse(r.body).length); } catch { /* skip */ }
        readResults[table] = `✅ 읽기 OK (${count}행)`;
      } else {
        readResults[table] = `❌ ${r.status} — ${r.body.slice(0, 80)}`;
      }
    } catch (e) {
      readResults[table] = `❌ 오류: ${String(e).slice(0, 80)}`;
    }
  }

  // ── 2. 쓰기 테스트 (site_settings 임시 upsert) ──────────────
  let writeResult = "";
  let writeOk = false;
  try {
    const testRow = { key: "__diag_write_test__", value: new Date().toISOString() };
    const r = await pgReq(key, "POST", "site_settings?on_conflict=key", [testRow]);
    if (r.ok) {
      // 삭제
      await pgReq(key, "DELETE", "site_settings?key=eq.__diag_write_test__");
      writeResult = "✅ 쓰기 OK";
      writeOk = true;
    } else {
      writeResult = `❌ ${r.status} — ${r.body.slice(0, 120)}`;
    }
  } catch (e) {
    writeResult = `❌ 오류: ${String(e).slice(0, 80)}`;
  }

  // ── 3. 진단 요약 ─────────────────────────────────────────────
  const allReadOk = Object.values(readResults).every(v => v.startsWith("✅"));
  const hasAuth401 = Object.values(readResults).some(v => v.includes("401")) || writeResult.includes("401");
  const hasRls403  = Object.values(readResults).some(v => v.includes("42501") || v.includes("403")) || writeResult.includes("42501");

  let advice = "";
  if (hasAuth401) {
    advice = isServiceKey
      ? "SUPABASE_SERVICE_KEY가 잘못됐습니다. Supabase → Settings → API → service_role 키를 복사해 Vercel 환경변수에 다시 설정하세요."
      : "Supabase 키 인증 실패. SUPABASE_SERVICE_KEY(service_role 키)를 Vercel 환경변수에 추가하세요.";
  } else if (hasRls403 || !writeOk) {
    advice = "SUPABASE_SERVICE_KEY 권한과 보안 마이그레이션 적용 상태를 확인하세요.";
  } else if (allReadOk && writeOk) {
    advice = "정상 — 읽기·쓰기 모두 OK";
  }

  return NextResponse.json({
    keySource,
    keyPrefix: key.slice(0, 32) + "...",
    isServiceKey,
    readResults,
    writeResult,
    writeOk,
    allReadOk,
    advice,
  });
}
