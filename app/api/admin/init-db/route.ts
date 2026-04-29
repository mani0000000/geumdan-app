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

const SETUP_SQL = `
-- ── site_settings ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_settings' AND policyname='anon_select') THEN
    EXECUTE 'CREATE POLICY anon_select ON site_settings FOR SELECT TO anon USING (true)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_settings' AND policyname='anon_insert') THEN
    EXECUTE 'CREATE POLICY anon_insert ON site_settings FOR INSERT TO anon WITH CHECK (true)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_settings' AND policyname='anon_update') THEN
    EXECUTE 'CREATE POLICY anon_update ON site_settings FOR UPDATE TO anon USING (true) WITH CHECK (true)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='site_settings' AND policyname='anon_delete') THEN
    EXECUTE 'CREATE POLICY anon_delete ON site_settings FOR DELETE TO anon USING (true)'; END IF;
END $$;

-- ── marts ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marts (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  brand           TEXT NOT NULL DEFAULT '',
  type            TEXT NOT NULL DEFAULT '동네마트',
  address         TEXT NOT NULL DEFAULT '',
  phone           TEXT,
  distance        TEXT,
  weekday_hours   TEXT,
  saturday_hours  TEXT,
  sunday_hours    TEXT,
  closing_pattern TEXT NOT NULL DEFAULT 'open',
  notice          TEXT,
  logo_url        TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  sort_order      INT  NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE marts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='marts' AND policyname='anon_select') THEN
    EXECUTE 'CREATE POLICY anon_select ON marts FOR SELECT TO anon USING (true)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='marts' AND policyname='anon_insert') THEN
    EXECUTE 'CREATE POLICY anon_insert ON marts FOR INSERT TO anon WITH CHECK (true)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='marts' AND policyname='anon_update') THEN
    EXECUTE 'CREATE POLICY anon_update ON marts FOR UPDATE TO anon USING (true) WITH CHECK (true)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='marts' AND policyname='anon_delete') THEN
    EXECUTE 'CREATE POLICY anon_delete ON marts FOR DELETE TO anon USING (true)'; END IF;
END $$;

-- ── pharmacies / emergency_rooms logo_url ────────────────────
ALTER TABLE IF EXISTS pharmacies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE IF EXISTS emergency_rooms ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ── sports_matches ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sports_matches (
  id         TEXT PRIMARY KEY,
  sport      TEXT NOT NULL,
  team_code  TEXT NOT NULL,
  home_team  TEXT NOT NULL,
  away_team  TEXT NOT NULL,
  home_score INT,
  away_score INT,
  match_date TIMESTAMPTZ NOT NULL,
  venue      TEXT,
  status     TEXT NOT NULL DEFAULT 'upcoming',
  ticket_url TEXT,
  broadcast  TEXT,
  sort_order INT  NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT TRUE
);
ALTER TABLE sports_matches ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sports_matches' AND policyname='anon_select') THEN
    EXECUTE 'CREATE POLICY anon_select ON sports_matches FOR SELECT TO anon USING (true)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sports_matches' AND policyname='anon_insert') THEN
    EXECUTE 'CREATE POLICY anon_insert ON sports_matches FOR INSERT TO anon WITH CHECK (true)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sports_matches' AND policyname='anon_update') THEN
    EXECUTE 'CREATE POLICY anon_update ON sports_matches FOR UPDATE TO anon USING (true) WITH CHECK (true)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sports_matches' AND policyname='anon_delete') THEN
    EXECUTE 'CREATE POLICY anon_delete ON sports_matches FOR DELETE TO anon USING (true)'; END IF;
END $$;

-- ── 스포츠 분류 (종목 → 리그 → 팀) + 방송사 ─────────────────────
CREATE TABLE IF NOT EXISTS sport_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  icon        TEXT,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  active      BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS leagues (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_category_id UUID NOT NULL REFERENCES sport_categories(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT '리그' CHECK (type IN ('리그','A매치','컵','토너먼트')),
  logo_url          TEXT,
  sort_order        SMALLINT NOT NULL DEFAULT 0,
  active            BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sport_category_id, name)
);
CREATE INDEX IF NOT EXISTS idx_leagues_sport ON leagues(sport_category_id);
CREATE TABLE IF NOT EXISTS teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id     UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  short_name    TEXT,
  logo_url      TEXT,
  primary_color TEXT,
  city          TEXT,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  active        BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league_id, name)
);
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id);
CREATE TABLE IF NOT EXISTS broadcasters (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL UNIQUE,
  channel_number TEXT,
  logo_url       TEXT,
  sort_order     SMALLINT NOT NULL DEFAULT 0,
  active         BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE sports_matches ADD COLUMN IF NOT EXISTS league_id      UUID REFERENCES leagues(id)      ON DELETE SET NULL;
ALTER TABLE sports_matches ADD COLUMN IF NOT EXISTS team_home_id   UUID REFERENCES teams(id)        ON DELETE SET NULL;
ALTER TABLE sports_matches ADD COLUMN IF NOT EXISTS team_away_id   UUID REFERENCES teams(id)        ON DELETE SET NULL;
ALTER TABLE sports_matches ADD COLUMN IF NOT EXISTS broadcaster_id UUID REFERENCES broadcasters(id) ON DELETE SET NULL;

ALTER TABLE sport_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues          ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasters     ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sport_categories','leagues','teams','broadcasters'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname='anon_select') THEN
      EXECUTE format('CREATE POLICY anon_select ON %I FOR SELECT TO anon USING (true)', t); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname='anon_insert') THEN
      EXECUTE format('CREATE POLICY anon_insert ON %I FOR INSERT TO anon WITH CHECK (true)', t); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname='anon_update') THEN
      EXECUTE format('CREATE POLICY anon_update ON %I FOR UPDATE TO anon USING (true) WITH CHECK (true)', t); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname='anon_delete') THEN
      EXECUTE format('CREATE POLICY anon_delete ON %I FOR DELETE TO anon USING (true)', t); END IF;
  END LOOP;
END $$;
`;

async function runSql(key: string, sql: string): Promise<{ ok: boolean; error?: string }> {
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) return { ok: false, error: "프로젝트 URL 파싱 실패" };

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql }),
    });
    if (res.ok) return { ok: true };
    const txt = await res.text();
    return { ok: false, error: `Management API ${res.status}: ${txt.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 100) };
  }
}

export async function POST() {
  const keys = candidateKeys();
  let lastError = "";

  for (const key of keys) {
    const result = await runSql(key, SETUP_SQL);
    if (result.ok) {
      return NextResponse.json({ success: true, message: "테이블 생성 및 RLS 정책 적용 완료" });
    }
    lastError = result.error ?? "알 수 없는 오류";
    console.warn("[init-db] 키 실패:", key.slice(0, 20), lastError.slice(0, 80));
  }

  // Management API failed — return the SQL for manual execution
  return NextResponse.json({
    success: false,
    error: lastError,
    sql: SETUP_SQL.trim(),
  }, { status: 500 });
}

export async function GET() {
  return NextResponse.json({ sql: SETUP_SQL.trim() });
}
