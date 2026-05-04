-- 배너 노출 기간 갱신: 만료된 배너의 starts_at/ends_at 를 현재 기준 이번주 ~ 다음주로 연장
-- 기존 시드 데이터(2026-04 한정)가 만료되어 홈 배너 캐러셀이 비어 보이는 버그 수정
UPDATE banners
SET
  starts_at = date_trunc('week', NOW()),
  ends_at   = date_trunc('week', NOW()) + INTERVAL '14 days'
WHERE active = true
  AND ends_at < NOW();
