-- 상가/매장 시스템 전면 개편
-- 1) 층(floors)에 화장실 상세 정보 추가 (위치 / 남·여 구분 / 안내)
-- 2) 매장 쿠폰(store_coupons)에 발행일 / 수량 / 사용횟수 추가 → 잔여수량 계산 기반
-- 모두 idempotent (IF NOT EXISTS) 하므로 재실행 안전

-- ── 층 화장실 정보 ────────────────────────────────────────────
ALTER TABLE floors ADD COLUMN IF NOT EXISTS restroom_location TEXT;   -- 예: "엘리베이터 옆", "복도 끝"
ALTER TABLE floors ADD COLUMN IF NOT EXISTS restroom_gender   TEXT;   -- '남여공용' | '남여분리' | '남자' | '여자'
ALTER TABLE floors ADD COLUMN IF NOT EXISTS restroom_note     TEXT;   -- 예: "장애인 화장실 별도"

-- ── 매장 쿠폰 발행/사용 관리 ──────────────────────────────────
ALTER TABLE store_coupons ADD COLUMN IF NOT EXISTS issued_date DATE DEFAULT CURRENT_DATE;  -- 발행일
ALTER TABLE store_coupons ADD COLUMN IF NOT EXISTS quantity    INTEGER;                    -- 총 발행 수량 (NULL = 무제한)
ALTER TABLE store_coupons ADD COLUMN IF NOT EXISTS used_count  INTEGER NOT NULL DEFAULT 0; -- 사용 횟수

-- 잔여수량 = quantity - used_count (quantity NULL 이면 무제한)
COMMENT ON COLUMN store_coupons.quantity   IS '총 발행 수량 (NULL = 무제한)';
COMMENT ON COLUMN store_coupons.used_count  IS '사용 완료 횟수';
COMMENT ON COLUMN store_coupons.issued_date IS '쿠폰 발행일';
