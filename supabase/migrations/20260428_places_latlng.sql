-- ─────────────────────────────────────────────────────────────────
-- UI 개선 (2026-04-28): 가볼만한곳 카드 클릭 시 카카오맵 좌표로 바로 열기
-- Apply via Supabase SQL editor on project plwpfnbhyzblgvliiole.
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;
