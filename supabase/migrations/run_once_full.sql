-- ══════════════════════════════════════════════════════════════
--  검단앱 상가 DB 마이그레이션 + 시딩 (한 번에 실행)
--  Supabase SQL Editor: https://supabase.com/dashboard/project/plwpfnbhyzblgvliiole/sql/new
-- ══════════════════════════════════════════════════════════════

-- ── 1. buildings 컬럼 추가 ───────────────────────────────────
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS parking_info TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS open_time    TEXT;

-- ── 2. store_details ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_details (
  store_id    TEXT PRIMARY KEY,
  description TEXT,
  price_range TEXT,
  tags        TEXT[]      DEFAULT '{}',
  menu        JSONB       DEFAULT '[]',
  services    TEXT[]      DEFAULT '{}',
  notice      TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE store_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_details_public_read" ON store_details;
CREATE POLICY "store_details_public_read" ON store_details FOR SELECT TO anon USING (true);

-- ── 3. store_openings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_openings (
  id           TEXT        PRIMARY KEY,
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

-- ── 4. store_coupons ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_coupons (
  id            TEXT        PRIMARY KEY,
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

-- ── 5. buildings 샘플 데이터 upsert ──────────────────────────
INSERT INTO buildings (id, name, address, parking_info, open_time, floors, total_stores, lat, lng, has_data)
VALUES
  ('b1',  '검단 센트럴 타워',     '인천 서구 당하동 123',    '지하 1~2층 (3시간 무료)',    '매일 10:00 ~ 22:00', 5, 18, 37.5910, 126.7065, true),
  ('nb2', '당하 스퀘어몰',         '인천 서구 당하동 456',    '지상 주차 가능',              '매일 10:00 ~ 22:00', 4, 14, 37.5917, 126.7071, true),
  ('nb3', '검단 플리마켓 타운',    '인천 서구 불로동 789',    '건물 앞 공영주차장',          '매일 08:00 ~ 22:00', 2, 24, 37.5870, 126.7025, true),
  ('nb4', '불로대곡 상가단지 A동', '인천 서구 대곡동 321',    NULL,                          '매일 09:00 ~ 21:00', 3,  8, 37.5852, 126.7018, true),
  ('nb5', '마전 주민센터 상가',    '인천 서구 마전로 654',    NULL,                          '매일 09:00 ~ 21:00', 2,  6, 37.5838, 126.6952, true),
  ('nb6', '원당 금곡 상권 A',      '인천 서구 금곡대로 100',  NULL,                          '매일 09:00 ~ 22:00', 3, 11, 37.5868, 126.6990, true),
  ('nb7', '오류왕길 근린상가',     '인천 서구 오류동 200',    NULL,                          '매일 08:00 ~ 22:00', 2,  8, 37.5778, 126.6932, true),
  ('nb8', '백석 아라 타운',        '인천 서구 백석동 300',    '지하 주차 가능 (2시간 무료)', '매일 10:00 ~ 22:00', 4, 14, 37.5930, 126.7095, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, address = EXCLUDED.address,
  parking_info = EXCLUDED.parking_info, open_time = EXCLUDED.open_time,
  floors = EXCLUDED.floors, total_stores = EXCLUDED.total_stores,
  lat = EXCLUDED.lat, lng = EXCLUDED.lng, has_data = EXCLUDED.has_data;

-- ── 6. store_openings 시딩 ───────────────────────────────────
INSERT INTO store_openings (id, store_id, store_name, category, floor, open_date, emoji, open_benefit, active)
VALUES
  ('ns1','s_3f_1','더본코리아 (백종원)','음식점','3F','2026-04-14','🍽️',
   '{"summary":"오픈 기념 전 메뉴 20% 할인 + 음료 1잔 무료","details":["전 메뉴 20% 할인 (4/30까지)","1인 1음료 무료 제공","앱 첫 주문 시 추가 10% 할인","SNS 리뷰 작성 시 디저트 증정"],"validUntil":"2026-04-30"}',
   true),
  ('ns2','s_2f_4','헬스앤뷰티','미용','2F','2026-04-15','💄',
   '{"summary":"오픈 특가 전품목 30% OFF + 회원 가입 시 5,000원 적립","details":["전품목 30% 할인 (4/30까지)","신규 회원 가입 시 5,000 포인트 적립","3만원 이상 구매 시 샘플 키트 증정"],"validUntil":"2026-04-30"}',
   true),
  ('ns3','s_4f_3','헤어살롱 모이','미용','4F','2026-04-07','💇',
   '{"summary":"오픈 한 달 커트 10,000원 고정 + 첫 방문 드라이 무료","details":["커트 10,000원 고정가 (5/7까지)","첫 방문 드라이 무료","펌·염색 예약 시 트리트먼트 업그레이드"],"validUntil":"2026-05-07"}',
   true),
  ('ns4','s_1f_2','스타벅스 검단점','카페','1F','2026-04-03','☕',
   '{"summary":"리유저블 컵 증정 + 사이즈업 무료","details":["음료 2잔 이상 구매 시 리유저블 컵 증정","그란데 이상 벤티 사이즈업 무료 (4/30까지)","첫 방문 아메리카노 1잔 무료"],"validUntil":"2026-04-30"}',
   true),
  ('ns5','s_5f_1','필라테스 스튜디오 온','기타','5F','2026-04-10','🧘',
   '{"summary":"오픈 기념 첫 달 50% 할인 + 무료 체험","details":["첫 달 수강료 50% 할인","무료 체험 수업 1회 (예약 필수)","3개월 등록 시 1개월 무료 추가"],"validUntil":"2026-05-10"}',
   true)
ON CONFLICT (id) DO UPDATE SET
  store_name=EXCLUDED.store_name, category=EXCLUDED.category, floor=EXCLUDED.floor,
  open_date=EXCLUDED.open_date, emoji=EXCLUDED.emoji, open_benefit=EXCLUDED.open_benefit, active=EXCLUDED.active;

-- ── 7. store_coupons 시딩 ────────────────────────────────────
INSERT INTO store_coupons (id, store_id, store_name, building_name, title, discount, discount_type, category, expiry, color, active)
VALUES
  ('cp1','s_b1_3','스타벅스 DT','검단 센트럴 타워','아메리카노 15% 할인','15%','rate','카페','2026-05-31','#00704A',true),
  ('cp2','s_2f_1','맘스터치','검단 센트럴 타워','치킨버거 세트 1,000원 할인','1,000원','amount','음식점','2026-05-05','#E63312',true),
  ('cp3','s_1f_4','약국','검단 센트럴 타워','건강기능식품 10% 할인','10%','rate','병원/약국','2026-05-10','#3182F6',true),
  ('cp4','s_3f_1','더본코리아','검단 센트럴 타워','런치 세트 2인 이상 20% 할인','20%','rate','음식점','2026-04-30','#F59E0B',true),
  ('cp5','s_1f_1','올리브영','당하 스퀘어몰','2만원 이상 구매 시 3,000원 할인','3,000원','amount','기타','2026-05-15','#FF3399',true),
  ('cp6','s_2f_3','이디야커피','당하 스퀘어몰','아이스 음료 500원 할인','500원','amount','카페','2026-04-30','#6366F1',true)
ON CONFLICT (id) DO UPDATE SET
  store_name=EXCLUDED.store_name, building_name=EXCLUDED.building_name,
  title=EXCLUDED.title, discount=EXCLUDED.discount, discount_type=EXCLUDED.discount_type,
  category=EXCLUDED.category, expiry=EXCLUDED.expiry, color=EXCLUDED.color, active=EXCLUDED.active;

-- 확인
SELECT 'store_details' AS tbl, COUNT(*) FROM store_details
UNION ALL SELECT 'store_openings', COUNT(*) FROM store_openings
UNION ALL SELECT 'store_coupons', COUNT(*) FROM store_coupons
UNION ALL SELECT 'buildings (parking_info)', COUNT(*) FROM buildings WHERE parking_info IS NOT NULL;
