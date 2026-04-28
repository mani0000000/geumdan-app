-- ─────────────────────────────────────────────────────────────────
-- UI 개선 (2026-04-28): 마트 매장 사진 (logo_url과 별도) 컬럼 추가
-- Apply via Supabase SQL editor on project plwpfnbhyzblgvliiole.
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE marts ADD COLUMN IF NOT EXISTS image_url text;
