-- ══════════════════════════════════════════════════════════════
--  매장 브랜드 페이지 + 매장 어드민 스키마
--  (기존 stores/buildings/floors 는 TEXT PK 를 사용하므로 동일하게 TEXT PK 채택)
-- ══════════════════════════════════════════════════════════════

-- ── 1. stores 컬럼 확장 ─────────────────────────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS cover_image_url   TEXT,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS website           TEXT,
  ADD COLUMN IF NOT EXISTS sns_instagram     TEXT,
  ADD COLUMN IF NOT EXISTS sns_kakao         TEXT,
  ADD COLUMN IF NOT EXISTS parking_info      TEXT,
  ADD COLUMN IF NOT EXISTS is_published      BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS admin_password    TEXT,
  ADD COLUMN IF NOT EXISTS admin_email       TEXT,
  ADD COLUMN IF NOT EXISTS page_modules      JSONB DEFAULT '["hero","info","menu","hours","events","coupons","reviews","map"]'::jsonb;

-- ── 2. store_menus (메뉴/상품) ─────────────────────────────
CREATE TABLE IF NOT EXISTS store_menus (
  id            TEXT PRIMARY KEY,
  store_id      TEXT NOT NULL,
  category      TEXT,
  name          TEXT NOT NULL,
  description   TEXT,
  price         INT,
  image_url     TEXT,
  is_signature  BOOLEAN DEFAULT FALSE,
  is_available  BOOLEAN DEFAULT TRUE,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_menus_store_id ON store_menus(store_id);
ALTER TABLE store_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_menus_public_read"  ON store_menus;
DROP POLICY IF EXISTS "store_menus_anon_write"   ON store_menus;
CREATE POLICY "store_menus_public_read" ON store_menus FOR SELECT TO anon USING (true);
CREATE POLICY "store_menus_anon_write"  ON store_menus FOR ALL    TO anon USING (true) WITH CHECK (true);

-- ── 3. store_hours (영업시간) ──────────────────────────────
CREATE TABLE IF NOT EXISTS store_hours (
  id          TEXT PRIMARY KEY,
  store_id    TEXT NOT NULL,
  day_of_week INT  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time   TEXT,
  close_time  TEXT,
  break_start TEXT,
  break_end   TEXT,
  is_closed   BOOLEAN DEFAULT FALSE,
  UNIQUE(store_id, day_of_week)
);
CREATE INDEX IF NOT EXISTS idx_store_hours_store_id ON store_hours(store_id);
ALTER TABLE store_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_hours_public_read" ON store_hours;
DROP POLICY IF EXISTS "store_hours_anon_write"  ON store_hours;
CREATE POLICY "store_hours_public_read" ON store_hours FOR SELECT TO anon USING (true);
CREATE POLICY "store_hours_anon_write"  ON store_hours FOR ALL    TO anon USING (true) WITH CHECK (true);

-- ── 4. store_events (이벤트) ───────────────────────────────
CREATE TABLE IF NOT EXISTS store_events (
  id          TEXT PRIMARY KEY,
  store_id    TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  image_url   TEXT,
  start_date  DATE,
  end_date    DATE,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_events_store_id ON store_events(store_id);
ALTER TABLE store_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_events_public_read" ON store_events;
DROP POLICY IF EXISTS "store_events_anon_write"  ON store_events;
CREATE POLICY "store_events_public_read" ON store_events FOR SELECT TO anon USING (true);
CREATE POLICY "store_events_anon_write"  ON store_events FOR ALL    TO anon USING (true) WITH CHECK (true);

-- ── 5. store_coupons 확장 ─────────────────────────────────
--    기존 store_coupons 테이블에 풍부한 쿠폰 필드 추가 (널 허용)
ALTER TABLE store_coupons
  ADD COLUMN IF NOT EXISTS description        TEXT,
  ADD COLUMN IF NOT EXISTS discount_value     INT,
  ADD COLUMN IF NOT EXISTS min_order_amount   INT,
  ADD COLUMN IF NOT EXISTS max_discount_amount INT,
  ADD COLUMN IF NOT EXISTS code               TEXT,
  ADD COLUMN IF NOT EXISTS start_date         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS usage_limit        INT,
  ADD COLUMN IF NOT EXISTS used_count         INT DEFAULT 0;
-- 코드 유니크 (널 허용 부분 인덱스)
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_coupons_code_unique
  ON store_coupons(code) WHERE code IS NOT NULL;

-- ── 6. coupon_uses (쿠폰 사용 내역) ────────────────────────
CREATE TABLE IF NOT EXISTS coupon_uses (
  id             TEXT PRIMARY KEY,
  coupon_id      TEXT NOT NULL,
  user_nickname  TEXT,
  used_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupon_uses_coupon_id ON coupon_uses(coupon_id);
ALTER TABLE coupon_uses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coupon_uses_public_read"  ON coupon_uses;
DROP POLICY IF EXISTS "coupon_uses_anon_insert"  ON coupon_uses;
CREATE POLICY "coupon_uses_public_read"  ON coupon_uses FOR SELECT TO anon USING (true);
CREATE POLICY "coupon_uses_anon_insert"  ON coupon_uses FOR INSERT TO anon WITH CHECK (true);

-- ── 7. store_reservations (예약) ───────────────────────────
CREATE TABLE IF NOT EXISTS store_reservations (
  id               TEXT PRIMARY KEY,
  store_id         TEXT NOT NULL,
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT,
  party_size       INT  DEFAULT 1,
  reservation_date DATE NOT NULL,
  reservation_time TEXT NOT NULL,
  status           TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  note             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_reservations_store_id  ON store_reservations(store_id);
CREATE INDEX IF NOT EXISTS idx_store_reservations_date      ON store_reservations(reservation_date);
ALTER TABLE store_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_reservations_anon_all" ON store_reservations;
CREATE POLICY "store_reservations_anon_all" ON store_reservations FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 8. store_waitings (웨이팅) ─────────────────────────────
CREATE TABLE IF NOT EXISTS store_waitings (
  id              TEXT PRIMARY KEY,
  store_id        TEXT NOT NULL,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  party_size      INT  DEFAULT 1,
  status          TEXT DEFAULT 'waiting'
                   CHECK (status IN ('waiting','called','seated','cancelled','no_show')),
  queue_number    INT,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_waitings_store_id ON store_waitings(store_id);
ALTER TABLE store_waitings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_waitings_anon_all" ON store_waitings;
CREATE POLICY "store_waitings_anon_all" ON store_waitings FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 9. store_reviews (리뷰) ────────────────────────────────
CREATE TABLE IF NOT EXISTS store_reviews (
  id               TEXT PRIMARY KEY,
  store_id         TEXT NOT NULL,
  author_nickname  TEXT NOT NULL,
  rating           INT  CHECK (rating BETWEEN 1 AND 5),
  content          TEXT,
  images           TEXT[] DEFAULT '{}',
  is_hidden        BOOLEAN DEFAULT FALSE,
  owner_reply      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_reviews_store_id ON store_reviews(store_id);
ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_reviews_public_read"  ON store_reviews;
DROP POLICY IF EXISTS "store_reviews_anon_insert"  ON store_reviews;
DROP POLICY IF EXISTS "store_reviews_anon_update"  ON store_reviews;
-- 매장 어드민이 숨김 리뷰까지 보여야 하므로 SELECT 는 전부 허용 → 숨김 필터는 앱 레벨에서 처리
CREATE POLICY "store_reviews_public_read"  ON store_reviews FOR SELECT TO anon USING (true);
CREATE POLICY "store_reviews_anon_insert"  ON store_reviews FOR INSERT TO anon WITH CHECK (true);
-- 매장 어드민이 hidden 토글, 사장님 답글 작성 (앱 레벨에서 비밀번호 검증)
CREATE POLICY "store_reviews_anon_update"  ON store_reviews FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "store_reviews_anon_delete"  ON store_reviews FOR DELETE TO anon USING (true);

-- ── 10. 확인 ───────────────────────────────────────────────
SELECT 'store_menus'        AS tbl, COUNT(*) FROM store_menus
UNION ALL SELECT 'store_hours',         COUNT(*) FROM store_hours
UNION ALL SELECT 'store_events',        COUNT(*) FROM store_events
UNION ALL SELECT 'coupon_uses',         COUNT(*) FROM coupon_uses
UNION ALL SELECT 'store_reservations',  COUNT(*) FROM store_reservations
UNION ALL SELECT 'store_waitings',      COUNT(*) FROM store_waitings
UNION ALL SELECT 'store_reviews',       COUNT(*) FROM store_reviews;
