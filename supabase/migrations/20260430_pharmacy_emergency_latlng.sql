-- ─────────────────────────────────────────────────────────────────
-- 약국 / 응급실 좌표 (내 위치 기반 정렬용) — 2026-04-30
-- pharmacies / emergency_rooms 테이블에는 schema.sql 기준으로 lat/lng
-- 컬럼이 이미 존재. 좌표가 비어 있는 환경을 위해 ADD COLUMN IF NOT EXISTS
-- 도 함께 실행하고, 검단 인근 시드 데이터를 갱신한다.
-- 출처: 카카오/네이버 지도 도로명 주소 좌표 (대략값, 100m 이내)
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE pharmacies
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

ALTER TABLE emergency_rooms
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

-- 약국 좌표 시드
UPDATE pharmacies SET lat = 37.5953, lng = 126.6585 WHERE id = 'ph1'; -- 가온약국 (검단동)
UPDATE pharmacies SET lat = 37.5979, lng = 126.6688 WHERE id = 'ph2'; -- 검단아라태평양약국 (원당동)
UPDATE pharmacies SET lat = 37.6034, lng = 126.6643 WHERE id = 'ph3'; -- 레몬약국 (왕길동)
UPDATE pharmacies SET lat = 37.5310, lng = 126.6800 WHERE id = 'ph4'; -- 루원봄약국 (가정동)
UPDATE pharmacies SET lat = 37.6050, lng = 126.6595 WHERE id = 'ph5'; -- 메디피아약국 (마전동)
UPDATE pharmacies SET lat = 37.4990, lng = 126.6870 WHERE id = 'ph6'; -- 옥신온누리약국 (가좌동)

-- 응급실 좌표 시드
UPDATE emergency_rooms SET lat = 37.5950, lng = 126.6585 WHERE id = 'er1'; -- 검단탑병원
UPDATE emergency_rooms SET lat = 37.6018, lng = 126.6644 WHERE id = 'er2'; -- 인천검단 온누리병원
UPDATE emergency_rooms SET lat = 37.4870, lng = 126.7240 WHERE id = 'er3'; -- 가톨릭대 인천성모병원
UPDATE emergency_rooms SET lat = 37.4543, lng = 126.7023 WHERE id = 'er4'; -- 가천대 길병원
UPDATE emergency_rooms SET lat = 37.4566, lng = 126.6334 WHERE id = 'er5'; -- 인하대학교병원
