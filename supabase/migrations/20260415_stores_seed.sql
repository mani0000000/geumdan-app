-- ─── 1. Extend buildings table ────────────────────────────────────────────────
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS parking_info TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS open_time TEXT;

-- ─── 2. store_details ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_details (
  store_id    TEXT PRIMARY KEY,
  description TEXT,
  price_range TEXT,
  tags        TEXT[]  DEFAULT '{}',
  menu        JSONB   DEFAULT '[]',
  services    TEXT[]  DEFAULT '{}',
  notice      TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE store_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_details_public_read" ON store_details;
CREATE POLICY "store_details_public_read" ON store_details FOR SELECT TO anon USING (true);

-- ─── 3. store_openings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_openings (
  id           TEXT PRIMARY KEY,
  store_id     TEXT,
  store_name   TEXT        NOT NULL,
  category     TEXT        NOT NULL,
  floor        TEXT        NOT NULL,
  open_date    DATE        NOT NULL,
  emoji        TEXT        DEFAULT '🏪',
  open_benefit JSONB,
  active       BOOLEAN     DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE store_openings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_openings_public_read" ON store_openings;
CREATE POLICY "store_openings_public_read" ON store_openings FOR SELECT TO anon USING (true);

-- ─── 4. store_coupons ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_coupons (
  id            TEXT PRIMARY KEY,
  store_id      TEXT,
  store_name    TEXT        NOT NULL,
  building_name TEXT        NOT NULL,
  title         TEXT        NOT NULL,
  discount      TEXT        NOT NULL,
  discount_type TEXT        NOT NULL,
  category      TEXT        NOT NULL,
  expiry        DATE        NOT NULL,
  color         TEXT        NOT NULL DEFAULT '#3182F6',
  active        BOOLEAN     DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE store_coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_coupons_public_read" ON store_coupons;
CREATE POLICY "store_coupons_public_read" ON store_coupons FOR SELECT TO anon USING (true);

-- ─── 5. Upsert buildings ──────────────────────────────────────────────────────
INSERT INTO buildings (id, name, address, parking_info, open_time, floors, total_stores, lat, lng, has_data)
VALUES
  ('b1',  '검단 센트럴 타워',      '인천 서구 당하동 123',   '지하 1~2층 (3시간 무료)',      '매일 10:00 ~ 22:00', 5, 18, 37.5910, 126.7065, true),
  ('nb2', '당하 스퀘어몰',          '인천 서구 당하동 456',   '지상 주차 가능',                '매일 10:00 ~ 22:00', 4, 14, 37.5917, 126.7071, true),
  ('nb3', '검단 플리마켓 타운',     '인천 서구 불로동 789',   '건물 앞 공영주차장',            '매일 08:00 ~ 22:00', 2, 24, 37.5870, 126.7025, true),
  ('nb4', '불로대곡 상가단지 A동',  '인천 서구 대곡동 321',   NULL,                            '매일 09:00 ~ 21:00', 3,  8, 37.5852, 126.7018, true),
  ('nb5', '마전 주민센터 상가',     '인천 서구 마전로 654',   NULL,                            '매일 09:00 ~ 21:00', 2,  6, 37.5838, 126.6952, true),
  ('nb6', '원당 금곡 상권 A',       '인천 서구 금곡대로 100', NULL,                            '매일 09:00 ~ 22:00', 3, 11, 37.5868, 126.6990, true),
  ('nb7', '오류왕길 근린상가',      '인천 서구 오류동 200',   NULL,                            '매일 08:00 ~ 22:00', 2,  8, 37.5778, 126.6932, true),
  ('nb8', '백석 아라 타운',         '인천 서구 백석동 300',   '지하 주차 가능 (2시간 무료)',   '매일 10:00 ~ 22:00', 4, 14, 37.5930, 126.7095, true)
ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  address      = EXCLUDED.address,
  parking_info = EXCLUDED.parking_info,
  open_time    = EXCLUDED.open_time,
  floors       = EXCLUDED.floors,
  total_stores = EXCLUDED.total_stores,
  lat          = EXCLUDED.lat,
  lng          = EXCLUDED.lng,
  has_data     = EXCLUDED.has_data;
