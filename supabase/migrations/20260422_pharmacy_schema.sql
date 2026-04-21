-- Add night_hours and is_weekend_pharmacy columns to pharmacies
ALTER TABLE pharmacies
  ADD COLUMN IF NOT EXISTS night_hours text,
  ADD COLUMN IF NOT EXISTS is_weekend_pharmacy boolean DEFAULT false;

-- Seed pharmacy data (검단 주요 약국)
INSERT INTO pharmacies (id, name, address, phone, is_night_pharmacy, is_weekend_pharmacy, weekday_hours, weekend_hours, night_hours, dong)
VALUES
  ('ph1', '검단 온누리약국',    '인천 서구 검단로 512',      '032-562-1234', true,  true,  '09:00~22:00',  '토 09:00~18:00 / 일 10:00~15:00', '평일 22:00까지', '검단동'),
  ('ph2', '당하 건강약국',      '인천 서구 당하동 123-4',    '032-563-2345', false, true,  '09:00~21:00',  '토 10:00~17:00',                  null,             '당하동'),
  ('ph3', '검단신도시 24약국',  '인천 서구 마전동 456-7',    '032-564-3456', true,  true,  '24시간',       '토·일 24시간',                    '매일 24시간',    '마전동'),
  ('ph4', '불로 해맑은약국',    '인천 서구 불로동 789-1',    '032-565-4567', true,  true,  '09:00~21:00',  '토 09:00~19:00 / 일 휴무',         '평일 21:00까지', '불로동'),
  ('ph5', '왕길 드림약국',      '인천 서구 왕길동 321-5',    '032-566-5678', false, true,  '09:00~21:00',  '토·일 10:00~18:00',               null,             '왕길동')
ON CONFLICT (id) DO UPDATE SET
  name               = EXCLUDED.name,
  address            = EXCLUDED.address,
  phone              = EXCLUDED.phone,
  is_night_pharmacy  = EXCLUDED.is_night_pharmacy,
  is_weekend_pharmacy = EXCLUDED.is_weekend_pharmacy,
  weekday_hours      = EXCLUDED.weekday_hours,
  weekend_hours      = EXCLUDED.weekend_hours,
  night_hours        = EXCLUDED.night_hours,
  dong               = EXCLUDED.dong,
  updated_at         = now();

-- Seed emergency room data (검단 인근 응급실)
INSERT INTO emergency_rooms (id, name, address, phone, level, is_pediatric, distance_km)
VALUES
  ('er1', '검단탑병원',    '인천 서구 검단로 345',        '032-561-1119', '지역응급의료기관',  false, 1.4),
  ('er2', '인천성모병원',  '인천 부평구 동수로 56',       '032-280-5114', '권역응급의료센터',  true,  6.2),
  ('er3', '나사렛국제병원','인천 부평구 부평대로 56',     '032-570-2114', '지역응급의료센터',  true,  7.1),
  ('er4', '가천대 길병원', '인천 남동구 남동대로 774',    '032-460-3114', '권역응급의료센터',  true,  11.3),
  ('er5', '인하대병원',    '인천 중구 인항로 27',         '032-890-2114', '권역응급의료센터',  true,  13.8)
ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  address      = EXCLUDED.address,
  phone        = EXCLUDED.phone,
  level        = EXCLUDED.level,
  is_pediatric = EXCLUDED.is_pediatric,
  distance_km  = EXCLUDED.distance_km,
  updated_at   = now();
