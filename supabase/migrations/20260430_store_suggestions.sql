-- 사용자가 제안하는 신규 매장 / 업종 정보
-- type=simple: 업종 + 짧은 메시지만 (간편 제안 탭)
-- type=detail: 업종/매장명/위치/연락처 등 상세 등록 (상세 등록 탭)
CREATE TABLE IF NOT EXISTS store_suggestions (
  id            BIGSERIAL    PRIMARY KEY,
  type          TEXT         NOT NULL CHECK (type IN ('simple', 'detail')),
  category      TEXT,
  store_name    TEXT,
  building_name TEXT,
  floor         TEXT,
  phone         TEXT,
  hours         TEXT,
  description   TEXT,
  contact       TEXT,
  message       TEXT,
  status        TEXT         NOT NULL DEFAULT 'pending', -- pending | reviewing | approved | rejected
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  reviewed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_store_suggestions_status_created
  ON store_suggestions (status, created_at DESC);

ALTER TABLE store_suggestions ENABLE ROW LEVEL SECURITY;

-- 누구나 제안을 등록할 수 있음 (anon insert)
CREATE POLICY "store_suggestions_insert"
  ON store_suggestions FOR INSERT
  WITH CHECK (true);

-- 어드민 관리용 — 모든 권한
CREATE POLICY "store_suggestions_admin"
  ON store_suggestions
  USING (true)
  WITH CHECK (true);
