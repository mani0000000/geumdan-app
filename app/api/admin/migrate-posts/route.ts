import { NextResponse } from "next/server";

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

async function runSQL(sql: string): Promise<{ ok: boolean; error?: string }> {
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) return { ok: false, error: "Supabase URL not configured" };
  for (const key of candidateKeys()) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: sql }),
      });
      if (res.ok) return { ok: true };
      const err = await res.text();
      if (res.status !== 401 && res.status !== 403) return { ok: false, error: err };
    } catch (e) { return { ok: false, error: String(e) }; }
  }
  return { ok: false, error: "All keys failed" };
}

const SQL = `
-- community_posts images 컬럼 추가
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_posts_has_images ON community_posts USING GIN(images);
`;

export async function POST() {
  const result = await runSQL(SQL);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ success: true });
}
