-- ─────────────────────────────────────────────────────────────────
-- 검단신도시 권역 마트 실제 데이터로 갱신 (2026-05-01)
-- Apply via Supabase SQL editor on project plwpfnbhyzblgvliiole.
--
-- 목적
--   - 기존 mart_001 ~ mart_005의 부정확한 좌표/주소를 실제 데이터로 교체
--   - 검단/검단신도시 권역의 실제 운영 마트 5곳 신규 추가
--   - 영업시간/의무휴업/연락처 정확도 향상
--
-- 좌표 출처
--   - 이마트 공식 점포안내 + 카카오/OSM 교차 검증
--   - 마트몬, 나무위키, 농협 공식 페이지
--   - OSM Nominatim 도로/건물 매칭
-- ─────────────────────────────────────────────────────────────────

-- ── 1. 좌표 컬럼 보강 (이미 존재 시 무시) ─────────────────────
ALTER TABLE marts ADD COLUMN IF NOT EXISTS lat float;
ALTER TABLE marts ADD COLUMN IF NOT EXISTS lng float;

-- ── 2. 기존 mart_001 ~ mart_005 정정 UPSERT ────────────────────
-- mart_001  이마트 검단점     서곶로 754(당하동 1065-1)
UPDATE marts SET
  name              = '이마트 검단점',
  brand             = '이마트',
  type              = '대형마트',
  address           = '인천 서구 서곶로 754 (당하동 1065-1)',
  phone             = '032-440-1234',
  weekday_hours     = '10:00 ~ 23:00',
  saturday_hours    = '10:00 ~ 23:00',
  sunday_hours      = '10:00 ~ 23:00',
  closing_pattern   = '2nd4th',
  notice            = '매월 2·4번째 일요일 의무휴업',
  lat               = 37.5855,
  lng               = 126.6767,
  sort_order        = 1,
  active            = true,
  distance          = NULL
WHERE id = 'mart_001';

-- mart_002  → 롯데마트 검단점으로 교체 (홈플러스 검단점은 실재하지 않음)
UPDATE marts SET
  name              = '롯데마트 검단점',
  brand             = '롯데마트',
  type              = '대형마트',
  address           = '인천 서구 원당대로 581 (마전동 626-7)',
  phone             = '032-560-2500',
  weekday_hours     = '10:00 ~ 23:00',
  saturday_hours    = '10:00 ~ 23:00',
  sunday_hours      = '10:00 ~ 23:00',
  closing_pattern   = '2nd4th',
  notice            = '매월 2·4번째 일요일 의무휴업',
  lat               = 37.5945,
  lng               = 126.6645,
  sort_order        = 2,
  active            = true,
  distance          = NULL
WHERE id = 'mart_002';

-- mart_003  롯데마트 청라점 (검단신도시 외 — 청라국제도시)
UPDATE marts SET
  name              = '롯데마트 청라점',
  brand             = '롯데마트',
  type              = '대형마트',
  address           = '인천 서구 청라커낼로 252 (경서동 958-1)',
  phone             = '032-590-2500',
  weekday_hours     = '10:00 ~ 23:00',
  saturday_hours    = '10:00 ~ 23:00',
  sunday_hours      = '10:00 ~ 23:00',
  closing_pattern   = '2nd4th',
  notice            = '매월 2·4번째 일요일 의무휴업',
  lat               = 37.5347,
  lng               = 126.6505,
  sort_order        = 3,
  active            = true,
  distance          = NULL
WHERE id = 'mart_003';

-- mart_004  홈플러스 익스프레스 인천마전점 (정확한 점포명으로 교체)
UPDATE marts SET
  name              = '홈플러스 익스프레스 인천마전점',
  brand             = '홈플러스 익스프레스',
  type              = '슈퍼마트',
  address           = '인천 서구 완정로 122 (마전동 641)',
  phone             = '032-566-8544',
  weekday_hours     = '10:00 ~ 23:00',
  saturday_hours    = '10:00 ~ 23:00',
  sunday_hours      = '10:00 ~ 23:00',
  closing_pattern   = '2nd4th',
  notice            = '매월 2·4번째 일요일 의무휴업',
  lat               = 37.5970,
  lng               = 126.6680,
  sort_order        = 4,
  active            = true,
  distance          = NULL
WHERE id = 'mart_004';

-- mart_005  GS더프레시 검단신도시점 (발산로 6, 원당동)
UPDATE marts SET
  name              = 'GS더프레시 검단신도시점',
  brand             = 'GS더프레시',
  type              = '슈퍼마트',
  address           = '인천 서구 발산로 6 (원당동)',
  phone             = '032-569-0319',
  weekday_hours     = '10:00 ~ 23:00',
  saturday_hours    = '10:00 ~ 23:00',
  sunday_hours      = '10:00 ~ 23:00',
  closing_pattern   = '2nd4th',
  notice            = '매월 2·4번째 일요일 의무휴업',
  lat               = 37.5926,
  lng               = 126.7110,
  sort_order        = 5,
  active            = true,
  distance          = NULL
WHERE id = 'mart_005';

-- ── 3. 검단/검단신도시 신규 마트 (mart_006 ~ mart_010) ─────────

-- mart_006  GS더프레시 검단푸르지오점 (원당동 1018, 검단신도시 푸르지오 더 베뉴 상가)
INSERT INTO marts (
  id, name, brand, type, address, phone,
  weekday_hours, saturday_hours, sunday_hours,
  closing_pattern, notice, lat, lng, sort_order, active
) VALUES (
  'mart_006',
  'GS더프레시 검단푸르지오점',
  'GS더프레시',
  '슈퍼마트',
  '인천 서구 원당동 1018 (푸르지오 더 베뉴 상가)',
  '032-562-7033',
  '10:00 ~ 23:00', '10:00 ~ 23:00', '10:00 ~ 23:00',
  '2nd4th',
  '매월 2·4번째 일요일 의무휴업',
  37.5950, 126.7000,
  6, true
)
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, brand=EXCLUDED.brand, type=EXCLUDED.type,
  address=EXCLUDED.address, phone=EXCLUDED.phone,
  weekday_hours=EXCLUDED.weekday_hours,
  saturday_hours=EXCLUDED.saturday_hours,
  sunday_hours=EXCLUDED.sunday_hours,
  closing_pattern=EXCLUDED.closing_pattern,
  notice=EXCLUDED.notice,
  lat=EXCLUDED.lat, lng=EXCLUDED.lng,
  sort_order=EXCLUDED.sort_order, active=EXCLUDED.active;

-- mart_007  노브랜드 인천원당점 (원당대로 865, 검단신도시 동측)
INSERT INTO marts (
  id, name, brand, type, address, phone,
  weekday_hours, saturday_hours, sunday_hours,
  closing_pattern, notice, lat, lng, sort_order, active
) VALUES (
  'mart_007',
  '노브랜드 인천원당점',
  '노브랜드',
  '슈퍼마트',
  '인천 서구 원당대로 865 (원당동, 대산프라자 1층)',
  '02-380-5111',
  '10:00 ~ 22:00', '10:00 ~ 22:00', '10:00 ~ 22:00',
  '2nd4th',
  '매월 2·4번째 일요일 의무휴업',
  37.5950, 126.7180,
  7, true
)
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, brand=EXCLUDED.brand, type=EXCLUDED.type,
  address=EXCLUDED.address, phone=EXCLUDED.phone,
  weekday_hours=EXCLUDED.weekday_hours,
  saturday_hours=EXCLUDED.saturday_hours,
  sunday_hours=EXCLUDED.sunday_hours,
  closing_pattern=EXCLUDED.closing_pattern,
  notice=EXCLUDED.notice,
  lat=EXCLUDED.lat, lng=EXCLUDED.lng,
  sort_order=EXCLUDED.sort_order, active=EXCLUDED.active;

-- mart_008  노브랜드 인천당하점 (서곶로 788, 당하동 홀리랜드 1층)
INSERT INTO marts (
  id, name, brand, type, address, phone,
  weekday_hours, saturday_hours, sunday_hours,
  closing_pattern, notice, lat, lng, sort_order, active
) VALUES (
  'mart_008',
  '노브랜드 인천당하점',
  '노브랜드',
  '슈퍼마트',
  '인천 서구 서곶로 788 (당하동 1098-5, 홀리랜드 1층)',
  '02-380-5111',
  '10:00 ~ 22:00', '10:00 ~ 22:00', '10:00 ~ 22:00',
  '2nd4th',
  '매월 2·4번째 일요일 의무휴업',
  37.5876, 126.6770,
  8, true
)
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, brand=EXCLUDED.brand, type=EXCLUDED.type,
  address=EXCLUDED.address, phone=EXCLUDED.phone,
  weekday_hours=EXCLUDED.weekday_hours,
  saturday_hours=EXCLUDED.saturday_hours,
  sunday_hours=EXCLUDED.sunday_hours,
  closing_pattern=EXCLUDED.closing_pattern,
  notice=EXCLUDED.notice,
  lat=EXCLUDED.lat, lng=EXCLUDED.lng,
  sort_order=EXCLUDED.sort_order, active=EXCLUDED.active;

-- mart_009  노브랜드 인천마전점 (완정로64번길 4, 마전동 영남탑스빌)
INSERT INTO marts (
  id, name, brand, type, address, phone,
  weekday_hours, saturday_hours, sunday_hours,
  closing_pattern, notice, lat, lng, sort_order, active
) VALUES (
  'mart_009',
  '노브랜드 인천마전점',
  '노브랜드',
  '슈퍼마트',
  '인천 서구 완정로64번길 4 (마전동 1000-1, 영남탑스빌 상가)',
  '02-380-5111',
  '10:00 ~ 22:00', '10:00 ~ 22:00', '10:00 ~ 22:00',
  '2nd4th',
  '매월 2·4번째 일요일 의무휴업',
  37.5985, 126.6655,
  9, true
)
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, brand=EXCLUDED.brand, type=EXCLUDED.type,
  address=EXCLUDED.address, phone=EXCLUDED.phone,
  weekday_hours=EXCLUDED.weekday_hours,
  saturday_hours=EXCLUDED.saturday_hours,
  sunday_hours=EXCLUDED.sunday_hours,
  closing_pattern=EXCLUDED.closing_pattern,
  notice=EXCLUDED.notice,
  lat=EXCLUDED.lat, lng=EXCLUDED.lng,
  sort_order=EXCLUDED.sort_order, active=EXCLUDED.active;

-- mart_010  검단농협 하나로마트 (검단로 497, 의무휴업 면제)
INSERT INTO marts (
  id, name, brand, type, address, phone,
  weekday_hours, saturday_hours, sunday_hours,
  closing_pattern, notice, lat, lng, sort_order, active
) VALUES (
  'mart_010',
  '검단농협 하나로마트',
  '농협 하나로마트',
  '중형마트',
  '인천 서구 검단로 497 (검단농협 1층)',
  '032-565-0027',
  '09:00 ~ 20:30', '09:00 ~ 20:30', '09:00 ~ 19:00',
  'open',
  '농협 하나로마트는 의무휴업 면제',
  37.6020, 126.6580,
  10, true
)
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, brand=EXCLUDED.brand, type=EXCLUDED.type,
  address=EXCLUDED.address, phone=EXCLUDED.phone,
  weekday_hours=EXCLUDED.weekday_hours,
  saturday_hours=EXCLUDED.saturday_hours,
  sunday_hours=EXCLUDED.sunday_hours,
  closing_pattern=EXCLUDED.closing_pattern,
  notice=EXCLUDED.notice,
  lat=EXCLUDED.lat, lng=EXCLUDED.lng,
  sort_order=EXCLUDED.sort_order, active=EXCLUDED.active;
