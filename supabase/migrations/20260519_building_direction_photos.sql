-- ─────────────────────────────────────────────────────────────────
-- 상가지도 로드뷰 (2026-05-19): 건물 동/서/남/북 방향별 사진 컬럼 추가
-- 어드민에서 방향별 이미지를 업로드해 실제 로드뷰 같은 상가지도를 구성한다.
-- Apply via Supabase SQL editor on project plwpfnbhyzblgvliiole.
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS photo_north text;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS photo_south text;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS photo_east  text;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS photo_west  text;
