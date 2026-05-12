-- 검단신도시 부동산 배치 시스템
-- 국토부 실거래가 / 전월세 OPEN API → Supabase 적재
--
-- 적용:
--   Supabase 대시보드 SQL 에디터에서 실행하거나
--   `supabase db push` (CLI) 로 마이그레이션 적용
--
-- 적재 경로:
--   scripts/fetch_realestate.ts → upsert(apartment_trades / apartment_rentals)
--   app/api/cron/realestate/route.ts (Vercel Cron, 매일 02:00 KST)
--   app/admin/realestate/page.tsx ('배치 관리' 탭) → 수동 실행

-- ── 1. 아파트 매매 실거래가 ──────────────────────────────────
CREATE TABLE IF NOT EXISTS apartment_trades (
  id              BIGSERIAL PRIMARY KEY,
  apt_name        TEXT NOT NULL,                -- 단지명 (예: '검단 푸르지오 더 퍼스트')
  sigungu         TEXT,                         -- 시군구 (예: '인천광역시 서구')
  dong            TEXT NOT NULL,                -- 법정동 (예: '당하동')
  jibun           TEXT,                         -- 지번 (예: '1234-5')
  road_address    TEXT,                         -- 도로명 주소 (선택)
  exclu_use_ar    NUMERIC(8, 2) NOT NULL,       -- 전용면적 (㎡)
  pyeong          INTEGER,                      -- 평형 (㎡ ÷ 3.305785)
  floor_no        INTEGER,                      -- 층
  build_year      INTEGER,                      -- 건축년도
  deal_year       INTEGER NOT NULL,             -- 계약년도
  deal_month      INTEGER NOT NULL,             -- 계약월 (1~12)
  deal_day        INTEGER,                      -- 계약일 (1~31)
  deal_amount     INTEGER NOT NULL,             -- 거래금액 (만원)
  bjdong_cd       TEXT,                         -- 법정동코드 (10자리)
  cancel_yn       BOOLEAN DEFAULT FALSE,        -- 해제여부
  cancel_date     DATE,                         -- 해제일자
  raw             JSONB,                        -- 원본 응답 (디버깅)
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT apartment_trades_natural_key UNIQUE
    (apt_name, dong, jibun, exclu_use_ar, floor_no, deal_year, deal_month, deal_day, deal_amount)
);

CREATE INDEX IF NOT EXISTS idx_apt_trades_dong_dealdate
  ON apartment_trades (dong, deal_year DESC, deal_month DESC, deal_day DESC);
CREATE INDEX IF NOT EXISTS idx_apt_trades_apt_name
  ON apartment_trades (apt_name);
CREATE INDEX IF NOT EXISTS idx_apt_trades_bjdong
  ON apartment_trades (bjdong_cd);

-- ── 2. 아파트 전월세 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apartment_rentals (
  id              BIGSERIAL PRIMARY KEY,
  apt_name        TEXT NOT NULL,
  sigungu         TEXT,
  dong            TEXT NOT NULL,
  jibun           TEXT,
  road_address    TEXT,
  exclu_use_ar    NUMERIC(8, 2) NOT NULL,
  pyeong          INTEGER,
  floor_no        INTEGER,
  build_year      INTEGER,
  contract_year   INTEGER NOT NULL,             -- 계약년도
  contract_month  INTEGER NOT NULL,             -- 계약월
  contract_day    INTEGER,                      -- 계약일
  rent_type       TEXT NOT NULL,                -- '전세' | '월세'
  deposit         INTEGER NOT NULL,             -- 보증금 (만원)
  monthly_rent    INTEGER NOT NULL DEFAULT 0,   -- 월세 (만원, 전세=0)
  bjdong_cd       TEXT,
  raw             JSONB,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT apartment_rentals_natural_key UNIQUE
    (apt_name, dong, jibun, exclu_use_ar, floor_no, contract_year, contract_month, contract_day, deposit, monthly_rent)
);

CREATE INDEX IF NOT EXISTS idx_apt_rentals_dong_contract
  ON apartment_rentals (dong, contract_year DESC, contract_month DESC, contract_day DESC);
CREATE INDEX IF NOT EXISTS idx_apt_rentals_apt_name
  ON apartment_rentals (apt_name);
CREATE INDEX IF NOT EXISTS idx_apt_rentals_rent_type
  ON apartment_rentals (rent_type);

-- ── 3. 배치 실행 이력 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS realestate_batch_log (
  id              BIGSERIAL PRIMARY KEY,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  status          TEXT NOT NULL,                -- 'running' | 'success' | 'partial' | 'failed'
  trigger_source  TEXT,                         -- 'cron' | 'admin' | 'cli'
  target_months   TEXT[],                       -- ['202604', '202603', ...]
  trades_count    INTEGER NOT NULL DEFAULT 0,
  rentals_count   INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  detail          JSONB                         -- 월별 수집 상세
);

CREATE INDEX IF NOT EXISTS idx_realestate_batch_log_started
  ON realestate_batch_log (started_at DESC);

-- ── 4. RLS ────────────────────────────────────────────────────
ALTER TABLE apartment_trades       ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_rentals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE realestate_batch_log   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read"     ON apartment_trades;
DROP POLICY IF EXISTS "Service write"   ON apartment_trades;
CREATE POLICY "Public read"   ON apartment_trades  FOR SELECT USING (true);
CREATE POLICY "Service write" ON apartment_trades  FOR ALL    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read"     ON apartment_rentals;
DROP POLICY IF EXISTS "Service write"   ON apartment_rentals;
CREATE POLICY "Public read"   ON apartment_rentals FOR SELECT USING (true);
CREATE POLICY "Service write" ON apartment_rentals FOR ALL    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public read"     ON realestate_batch_log;
DROP POLICY IF EXISTS "Service write"   ON realestate_batch_log;
CREATE POLICY "Public read"   ON realestate_batch_log FOR SELECT USING (true);
CREATE POLICY "Service write" ON realestate_batch_log FOR ALL    USING (auth.role() = 'service_role');
