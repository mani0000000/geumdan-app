-- 아파트 가격 지수 테이블 (KB부동산 / 한국부동산원)
-- Supabase SQL 에디터에서 실행하거나 supabase db push 로 적용

CREATE TABLE IF NOT EXISTS apt_price_index (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,        -- 'kb' | 'reb'
  region      TEXT NOT NULL,        -- '인천시 서구' 등
  period      TEXT NOT NULL,        -- YYYYMM (예: 202503)
  index_value FLOAT,                -- 가격지수 (KB 기준 2017.11=100)
  change_rate FLOAT,                -- 전월(주) 대비 변동률 (%)
  trade_count INT,                  -- 거래건수 (있을 경우)
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (source, region, period)
);

-- 조회 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_apt_price_index_source_period
  ON apt_price_index (source, period DESC);

-- RLS 정책 (anon은 읽기만, service key는 모든 권한)
ALTER TABLE apt_price_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON apt_price_index
  FOR SELECT USING (true);

CREATE POLICY "Service write" ON apt_price_index
  FOR ALL USING (auth.role() = 'service_role');
