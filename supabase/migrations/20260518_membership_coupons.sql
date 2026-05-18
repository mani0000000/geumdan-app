-- ============================================================
-- 멤버십 등급 + 포인트→쿠폰 교환
-- ============================================================

-- 활동 포인트 적립/차감 원장 (글쓰기·댓글·로그인·쿠폰 교환 등)
CREATE TABLE IF NOT EXISTS user_points (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points     INTEGER     NOT NULL,
  reason     TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 멤버십 등급 정의 (누적 포인트 구간별)
CREATE TABLE IF NOT EXISTS membership_grades (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT        NOT NULL,
  required_points INTEGER     NOT NULL DEFAULT 0,
  benefits        TEXT        NOT NULL DEFAULT '',
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- store_coupons: 포인트 교환형 구분 + 수량 제한
--   required_points = NULL  → 일반(매장) 쿠폰
--   required_points > 0     → 포인트로 교환 가능한 쿠폰
--   stock           = NULL  → 수량 무제한
ALTER TABLE store_coupons
  ADD COLUMN IF NOT EXISTS required_points INTEGER,
  ADD COLUMN IF NOT EXISTS stock           INTEGER;

-- user_coupons: 사용 상태 추가 (사용가능 | 사용완료)
ALTER TABLE user_coupons
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT '사용가능';

-- 등급 시드 (마이페이지 기존 구간과 동일)
INSERT INTO membership_grades (name, required_points, benefits, sort_order)
SELECT v.name, v.required_points, v.benefits, v.sort_order
FROM (VALUES
  ('브론즈',   0,    '기본 혜택 · 쿠폰 교환 이용 가능',                  0),
  ('실버',     500,  '교환 쿠폰 5% 추가 적립 · 전용 쿠폰 열람',          1),
  ('골드',     1500, '교환 쿠폰 10% 추가 적립 · 골드 한정 쿠폰',         2),
  ('플래티넘', 3000, '교환 쿠폰 우선권 · 플래티넘 전용 프리미엄 쿠폰',   3)
) AS v(name, required_points, benefits, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM membership_grades);

-- RLS
ALTER TABLE user_points       ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_user_points"       ON user_points;
DROP POLICY IF EXISTS "public_membership_grades" ON membership_grades;
CREATE POLICY "public_user_points"       ON user_points       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_membership_grades" ON membership_grades FOR ALL USING (true) WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_points_user      ON user_points(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_membership_grades_ord ON membership_grades(sort_order);
CREATE INDEX IF NOT EXISTS idx_user_coupons_status   ON user_coupons(user_id, status);
CREATE INDEX IF NOT EXISTS idx_store_coupons_reqpts  ON store_coupons(required_points) WHERE required_points IS NOT NULL;
