-- 주유소 가격 컬럼 추가 (배치 스크립트로 매시간 업데이트)
ALTER TABLE gas_stations
  ADD COLUMN IF NOT EXISTS price_gasoline   int,          -- 휘발유 가격 (원)
  ADD COLUMN IF NOT EXISTS price_diesel     int,          -- 경유 가격 (원)
  ADD COLUMN IF NOT EXISTS price_lpg        int,          -- LPG 가격 (원)
  ADD COLUMN IF NOT EXISTS price_updated_at timestamptz;  -- 마지막 가격 업데이트 시각
