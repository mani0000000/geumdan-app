-- Add night_hours and is_weekend_pharmacy columns to pharmacies
ALTER TABLE pharmacies
  ADD COLUMN IF NOT EXISTS night_hours text,
  ADD COLUMN IF NOT EXISTS is_weekend_pharmacy boolean DEFAULT false;

-- ─────────────────────────────────────────────────────────────────
-- 인천 서구 공공심야약국 실제 데이터 (인천시 서구 보건소 지정, 2025~2026)
-- 운영시간: 매일 22:00~01:00 (3시간) / 루원봄약국은 평일만
-- 출처: 인천광역시 서구 보건소 의약업안내 (seo.incheon.kr)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO pharmacies (id, name, address, phone, is_night_pharmacy, is_weekend_pharmacy, weekday_hours, weekend_hours, night_hours, dong)
VALUES
  ('ph1', '가온약국',          '인천 서구 봉오재 3로 90 (검단동)',    '032-567-0879', true, true,  '09:00~22:00', '10:00~18:00', '22:00~01:00', '검단동'),
  ('ph2', '검단아라태평양약국', '인천 서구 이음대로 378 (원당동)',    '032-561-7768', true, true,  '09:00~22:00', '10:00~18:00', '22:00~01:00', '원당동'),
  ('ph3', '레몬약국',          '인천 서구 검단로 480 (왕길동)',      '032-562-1088', true, true,  '09:00~22:00', '10:00~18:00', '22:00~01:00', '왕길동'),
  ('ph4', '루원봄약국',        '인천 서구 봉오대로 255 (가정동)',    '032-563-1486', true, false, '09:00~22:00', null,          '평일 22:00~01:00', '가정동'),
  ('ph5', '메디피아약국',      '인천 서구 완정로 172 (마전동)',      '032-562-0258', true, true,  '09:00~22:00', '10:00~18:00', '22:00~01:00', '마전동'),
  ('ph6', '옥신온누리약국',    '인천 서구 고래울로 29 (가좌동)',     '032-578-1329', true, true,  '09:00~22:00', '10:00~18:00', '22:00~01:00', '가좌동')
ON CONFLICT (id) DO UPDATE SET
  name                = EXCLUDED.name,
  address             = EXCLUDED.address,
  phone               = EXCLUDED.phone,
  is_night_pharmacy   = EXCLUDED.is_night_pharmacy,
  is_weekend_pharmacy = EXCLUDED.is_weekend_pharmacy,
  weekday_hours       = EXCLUDED.weekday_hours,
  weekend_hours       = EXCLUDED.weekend_hours,
  night_hours         = EXCLUDED.night_hours,
  dong                = EXCLUDED.dong,
  updated_at          = now();

-- ─────────────────────────────────────────────────────────────────
-- 검단 인근 응급의료기관 실제 데이터 (2025~2026)
-- 출처: 응급의료포털 e-gen.or.kr, 각 병원 공식 홈페이지
-- ─────────────────────────────────────────────────────────────────
INSERT INTO emergency_rooms (id, name, address, phone, level, is_pediatric, distance_km)
VALUES
  -- 검단 내 지역응급의료기관
  ('er1', '검단탑병원',
   '인천 서구 청마로 19번길 5 (당하동)',
   '032-590-0114', '지역응급의료기관', false, 1.5),

  ('er2', '인천검단 온누리병원',
   '인천 서구 완정로 199 (왕길동)',
   '032-568-9111', '지역응급의료기관', false, 2.2),

  -- 인근 권역응급의료센터
  ('er3', '가톨릭대학교 인천성모병원',
   '인천 부평구 동수로 56 (부평동)',
   '1544-9004', '권역응급의료센터', true, 8.5),

  ('er4', '가천대 길병원',
   '인천 남동구 남동대로 774번길 21 (구월동)',
   '1577-2299', '권역응급의료센터', true, 13.5),

  ('er5', '인하대학교병원',
   '인천 중구 인항로 27 (신흥동)',
   '032-890-2300', '권역응급의료센터', true, 16.0)
ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  address      = EXCLUDED.address,
  phone        = EXCLUDED.phone,
  level        = EXCLUDED.level,
  is_pediatric = EXCLUDED.is_pediatric,
  distance_km  = EXCLUDED.distance_km,
  updated_at   = now();
