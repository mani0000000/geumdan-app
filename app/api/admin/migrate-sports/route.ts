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
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }
  return { ok: false, error: "All keys failed (401/403)" };
}

const MIGRATION_SQL = `
-- ── sport_categories ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sport_categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL UNIQUE,
  icon       TEXT,
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── leagues ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leagues (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_category_id UUID        NOT NULL REFERENCES sport_categories(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  type              TEXT        NOT NULL DEFAULT '리그' CHECK (type IN ('리그','A매치','컵','토너먼트')),
  logo_url          TEXT,
  sort_order        SMALLINT    NOT NULL DEFAULT 0,
  active            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sport_category_id, name)
);
CREATE INDEX IF NOT EXISTS idx_leagues_sport ON leagues(sport_category_id);

-- ── teams ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id     UUID        NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  short_name    TEXT,
  logo_url      TEXT,
  primary_color TEXT,
  city          TEXT,
  sort_order    SMALLINT    NOT NULL DEFAULT 0,
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league_id, name)
);
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id);

-- ── broadcasters ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broadcasters (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL UNIQUE,
  channel_number TEXT,
  logo_url       TEXT,
  sort_order     SMALLINT    NOT NULL DEFAULT 0,
  active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── sports_matches 컬럼 추가 ───────────────────────────────────
ALTER TABLE sports_matches ADD COLUMN IF NOT EXISTS league_id      UUID REFERENCES leagues(id)      ON DELETE SET NULL;
ALTER TABLE sports_matches ADD COLUMN IF NOT EXISTS team_home_id   UUID REFERENCES teams(id)        ON DELETE SET NULL;
ALTER TABLE sports_matches ADD COLUMN IF NOT EXISTS team_away_id   UUID REFERENCES teams(id)        ON DELETE SET NULL;
ALTER TABLE sports_matches ADD COLUMN IF NOT EXISTS broadcaster_id UUID REFERENCES broadcasters(id) ON DELETE SET NULL;

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE sport_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues           ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasters      ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sport_categories','leagues','teams','broadcasters'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename=t AND policyname='anon_select') THEN
      EXECUTE format('CREATE POLICY anon_select ON %I FOR SELECT TO anon USING (true)', t); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename=t AND policyname='anon_insert') THEN
      EXECUTE format('CREATE POLICY anon_insert ON %I FOR INSERT TO anon WITH CHECK (true)', t); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename=t AND policyname='anon_update') THEN
      EXECUTE format('CREATE POLICY anon_update ON %I FOR UPDATE TO anon USING (true) WITH CHECK (true)', t); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename=t AND policyname='anon_delete') THEN
      EXECUTE format('CREATE POLICY anon_delete ON %I FOR DELETE TO anon USING (true)', t); END IF;
  END LOOP;
END $$;

-- ── 시드 데이터 ────────────────────────────────────────────────
INSERT INTO sport_categories (name, icon, sort_order) VALUES
  ('축구','⚽',1),('야구','⚾',2),('농구','🏀',3),('배구','🏐',4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO leagues (sport_category_id, name, type, sort_order)
SELECT id,'K리그1','리그',1 FROM sport_categories WHERE name='축구' ON CONFLICT (sport_category_id,name) DO NOTHING;
INSERT INTO leagues (sport_category_id, name, type, sort_order)
SELECT id,'K리그2','리그',2 FROM sport_categories WHERE name='축구' ON CONFLICT (sport_category_id,name) DO NOTHING;
INSERT INTO leagues (sport_category_id, name, type, sort_order)
SELECT id,'A매치','A매치',3 FROM sport_categories WHERE name='축구' ON CONFLICT (sport_category_id,name) DO NOTHING;
INSERT INTO leagues (sport_category_id, name, type, sort_order)
SELECT id,'KBO리그','리그',1 FROM sport_categories WHERE name='야구' ON CONFLICT (sport_category_id,name) DO NOTHING;
INSERT INTO leagues (sport_category_id, name, type, sort_order)
SELECT id,'KBL','리그',1 FROM sport_categories WHERE name='농구' ON CONFLICT (sport_category_id,name) DO NOTHING;
INSERT INTO leagues (sport_category_id, name, type, sort_order)
SELECT id,'V리그','리그',1 FROM sport_categories WHERE name='배구' ON CONFLICT (sport_category_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'인천 유나이티드','ICU','#0033A0','인천',1
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='축구' AND l.name='K리그1' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'FC서울','SEO','#C8102E','서울',2
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='축구' AND l.name='K리그1' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'전북 현대','JEO','#1A5E3F','전주',3
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='축구' AND l.name='K리그1' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'울산 HD','ULS','#1428A0','울산',4
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='축구' AND l.name='K리그1' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'포항 스틸러스','POH','#000000','포항',5
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='축구' AND l.name='K리그1' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'수원 FC','SFC','#0046A8','수원',6
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='축구' AND l.name='K리그1' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'대한민국','KOR','#C60C30','서울',1
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='축구' AND l.name='A매치' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'SSG 랜더스','SSG','#CE0E2D','인천',1
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='야구' AND l.name='KBO리그' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'LG 트윈스','LG','#C30452','서울',2
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='야구' AND l.name='KBO리그' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'KIA 타이거즈','KIA','#EA0029','광주',3
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='야구' AND l.name='KBO리그' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'두산 베어스','OB','#131230','서울',4
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='야구' AND l.name='KBO리그' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'롯데 자이언츠','LOT','#041E42','부산',5
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='야구' AND l.name='KBO리그' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'키움 히어로즈','KIW','#570514','서울',6
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='야구' AND l.name='KBO리그' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'인천 전자랜드','ICH','#E31837','인천',1
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='농구' AND l.name='KBL' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'서울 SK','SK','#EE2737','서울',2
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='농구' AND l.name='KBL' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'울산 현대모비스','MOB','#1B2C5E','울산',3
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='농구' AND l.name='KBL' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'원주 DB','DB','#005EAB','원주',4
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='농구' AND l.name='KBL' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'인천 흥국생명','HKL','#F58220','인천',1
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='배구' AND l.name='V리그' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'대한항공 점보스','KAL','#003087','인천',2
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='배구' AND l.name='V리그' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'현대캐피탈','HCS','#003C7E','천안',3
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='배구' AND l.name='V리그' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO teams (league_id, name, short_name, primary_color, city, sort_order)
SELECT l.id,'삼성화재','SAM','#0033A0','대전',4
FROM leagues l JOIN sport_categories s ON l.sport_category_id=s.id
WHERE s.name='배구' AND l.name='V리그' ON CONFLICT (league_id,name) DO NOTHING;

INSERT INTO broadcasters (name, channel_number, sort_order) VALUES
  ('SPOTV','21',1),('SPOTV2','67',2),('SPOTV ON','70',3),
  ('MBC스포츠+','23',4),('KBS N스포츠','22',5),('SBS Sports','24',6),
  ('JTBC GOLF&SPORTS','53',7),('tvN스포츠','69',8),
  ('쿠팡플레이',NULL,9),('네이버스포츠',NULL,10),('티빙',NULL,11),('유튜브',NULL,12)
ON CONFLICT (name) DO NOTHING;
`;

export async function POST() {
  const result = await runSQL(MIGRATION_SQL);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
