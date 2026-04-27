import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";

// 서비스 롤 키만 SQL 실행 가능
function getServiceKey(): string | null {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_ADMIN_DB_KEY;
  return key ?? null;
}

const ADMIN_TABLES = [
  "banners", "buildings", "floors", "stores", "store_coupons", "store_openings",
  "pharmacies", "emergency_rooms", "community_posts", "community_comments",
  "news_articles", "apartments", "apartment_sizes", "apartment_price_history",
  "apt_price_index", "home_widget_config", "places", "search_keywords",
  "marts", "site_settings", "youtube_videos", "instagram_posts", "sports_matches",
];

// 각 테이블에 anon 전체 허용 정책 적용 (upsert 방식으로 개별 테이블 시도)
async function enableAnonWrite(key: string, table: string): Promise<{ table: string; ok: boolean; msg: string }> {
  try {
    // PostgREST를 통한 직접 RLS 수정은 불가능하므로
    // Supabase Management API 사용 시도
    const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectRef) return { table, ok: false, msg: "프로젝트 URL 파싱 실패" };

    const sql = `
DO $$
BEGIN
  -- anon SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = 'anon_select'
  ) THEN
    EXECUTE 'CREATE POLICY anon_select ON ${table} FOR SELECT TO anon USING (true)';
  END IF;
  -- anon INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = 'anon_insert'
  ) THEN
    EXECUTE 'CREATE POLICY anon_insert ON ${table} FOR INSERT TO anon WITH CHECK (true)';
  END IF;
  -- anon UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = 'anon_update'
  ) THEN
    EXECUTE 'CREATE POLICY anon_update ON ${table} FOR UPDATE TO anon USING (true) WITH CHECK (true)';
  END IF;
  -- anon DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = 'anon_delete'
  ) THEN
    EXECUTE 'CREATE POLICY anon_delete ON ${table} FOR DELETE TO anon USING (true)';
  END IF;
END $$;`;

    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      },
    );

    if (res.ok) return { table, ok: true, msg: "✅ 정책 적용 완료" };
    const txt = await res.text();
    return { table, ok: false, msg: `❌ ${res.status}: ${txt.slice(0, 100)}` };
  } catch (e) {
    return { table, ok: false, msg: `❌ 오류: ${String(e).slice(0, 80)}` };
  }
}

// 쓰기 테스트
async function testWrite(key: string): Promise<{ ok: boolean; msg: string }> {
  const headers: Record<string, string> = { "apikey": key, "Content-Type": "application/json", "Prefer": "return=minimal" };
  if (key.startsWith("eyJ")) headers["Authorization"] = `Bearer ${key}`;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?on_conflict=key`, {
      method: "POST",
      headers,
      body: JSON.stringify([{ key: "__rls_test__", value: "ok" }]),
    });
    if (r.ok) {
      // 테스트 행 삭제
      await fetch(`${SUPABASE_URL}/rest/v1/site_settings?key=eq.__rls_test__`, { method: "DELETE", headers });
      return { ok: true, msg: "✅ 쓰기 성공" };
    }
    const txt = await r.text();
    return { ok: false, msg: `❌ ${r.status}: ${txt.slice(0, 120)}` };
  } catch (e) {
    return { ok: false, msg: `❌ ${String(e).slice(0, 80)}` };
  }
}

export async function POST() {
  const key = getServiceKey();
  if (!key) {
    return NextResponse.json({ error: "키 없음" }, { status: 500 });
  }

  // 먼저 쓰기 테스트
  const writeTest = await testWrite(key);
  if (writeTest.ok) {
    return NextResponse.json({
      success: true,
      message: "이미 쓰기 가능 상태입니다.",
      writeTest,
    });
  }

  // RLS 정책 적용 시도 (Management API)
  const results = await Promise.all(ADMIN_TABLES.map(t => enableAnonWrite(key, t)));
  const allOk = results.every(r => r.ok);

  // 재테스트
  const retest = await testWrite(key);

  return NextResponse.json({
    success: retest.ok,
    writeTest: retest,
    policyResults: results,
    sql: allOk ? null : `-- Supabase SQL Editor에서 수동 실행:\n${ADMIN_TABLES.map(t =>
      `ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;\nCREATE POLICY IF NOT EXISTS "anon_all" ON ${t} FOR ALL TO anon USING (true) WITH CHECK (true);`
    ).join("\n")}`,
  });
}
