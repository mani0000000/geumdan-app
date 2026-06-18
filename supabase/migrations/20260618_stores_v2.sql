-- 상가/매장 시스템 v2 전면 개편
-- 1) stores: 세부업종, 구조화 영업시간, 휴무일, 브레이크타임, 평점/리뷰수
-- 2) buildings: 설명, 웹사이트, 인스타, 카카오 플레이스 ID, 편의시설, 주차공간
-- 3) store_reviews: 사용자 리뷰/평점
-- 4) store_media: 매장/건물 사진·동영상
-- 5) store_suggestions: 신규 오픈·폐점·정보변경 제안 (기존 테이블 확장)
-- 6) coupon_downloads: 쿠폰 다운로드/사용 이력
-- 7) store_coupons: 시작일, 노출수, 다운로드수, 이용조건, 1인 한도 추가
-- 모두 idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

-- ── stores 컬럼 추가 ─────────────────────────────────────────────
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sub_category      TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS structured_hours  JSONB;   -- { mon:{open,close,closed}, ... }
ALTER TABLE stores ADD COLUMN IF NOT EXISTS closed_days       TEXT[];  -- ['공휴일','첫째주월요일']
ALTER TABLE stores ADD COLUMN IF NOT EXISTS break_time        JSONB;   -- { start:'14:00', end:'15:00' }
ALTER TABLE stores ADD COLUMN IF NOT EXISTS avg_rating        NUMERIC(3,1);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS review_count      INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN stores.sub_category     IS '세부업종 (예: 한식, 내과, 헬스장)';
COMMENT ON COLUMN stores.structured_hours IS 'JSON: {mon,tue,wed,thu,fri,sat,sun} 각 {open,close,closed}';
COMMENT ON COLUMN stores.closed_days      IS '정기 휴무 설명 배열 (예: 매주 월요일, 공휴일)';
COMMENT ON COLUMN stores.break_time       IS 'JSON: {start, end} 브레이크타임';
COMMENT ON COLUMN stores.avg_rating       IS '평균 별점 (1.0~5.0)';
COMMENT ON COLUMN stores.review_count     IS '리뷰 수';

-- ── buildings 컬럼 추가 ──────────────────────────────────────────
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS description    TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS website        TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS instagram      TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS kakao_place_id TEXT;
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS facilities     TEXT[];   -- ['무료주차','엘리베이터','휠체어']
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS parking_spaces INTEGER;

COMMENT ON COLUMN buildings.facilities    IS '편의시설 목록 (예: 무료주차, 엘리베이터, 휠체어 접근)';
COMMENT ON COLUMN buildings.parking_spaces IS '주차 가능 대수';

-- ── store_reviews ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_reviews (
  id          BIGSERIAL    PRIMARY KEY,
  store_id    TEXT         NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id     TEXT,                     -- 로그인 사용자 ID (null = 비회원)
  nickname    TEXT         NOT NULL,
  rating      SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content     TEXT,
  media_urls  TEXT[],                   -- 첨부 이미지/동영상 URL 배열
  is_visible  BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_reviews_store_id
  ON store_reviews (store_id, created_at DESC);

ALTER TABLE store_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_reviews_select"
  ON store_reviews FOR SELECT USING (is_visible = true);

CREATE POLICY "store_reviews_insert"
  ON store_reviews FOR INSERT WITH CHECK (true);

-- 평점 집계 자동 갱신 함수
CREATE OR REPLACE FUNCTION refresh_store_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE stores
  SET
    avg_rating   = (SELECT ROUND(AVG(rating)::NUMERIC, 1) FROM store_reviews WHERE store_id = COALESCE(NEW.store_id, OLD.store_id) AND is_visible = true),
    review_count = (SELECT COUNT(*) FROM store_reviews WHERE store_id = COALESCE(NEW.store_id, OLD.store_id) AND is_visible = true)
  WHERE id = COALESCE(NEW.store_id, OLD.store_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_review_rating ON store_reviews;
CREATE TRIGGER trg_store_review_rating
  AFTER INSERT OR UPDATE OR DELETE ON store_reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_store_rating();

-- ── store_media ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_media (
  id          BIGSERIAL    PRIMARY KEY,
  store_id    TEXT         REFERENCES stores(id) ON DELETE CASCADE,
  building_id TEXT         REFERENCES buildings(id) ON DELETE CASCADE,
  url         TEXT         NOT NULL,
  media_type  TEXT         NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption     TEXT,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  is_primary  BOOLEAN      NOT NULL DEFAULT false,
  uploaded_by TEXT,        -- user_id 또는 'admin'
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CHECK (store_id IS NOT NULL OR building_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_store_media_store_id
  ON store_media (store_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_store_media_building_id
  ON store_media (building_id, sort_order);

ALTER TABLE store_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_media_select"
  ON store_media FOR SELECT USING (true);

CREATE POLICY "store_media_insert"
  ON store_media FOR INSERT WITH CHECK (true);

-- ── store_suggestions 기존 테이블 확장 ──────────────────────────
-- 기존: type IN ('simple','detail'), status
-- 추가: suggestion_type (세부 유형), store_id (연결된 기존 매장), admin_note, sub_category
ALTER TABLE store_suggestions ADD COLUMN IF NOT EXISTS suggestion_type TEXT CHECK (suggestion_type IN (
  'new_store', 'closed', 'name_change', 'hours_change', 'phone_change', 'category_change', 'other'
));
ALTER TABLE store_suggestions ADD COLUMN IF NOT EXISTS store_id     TEXT REFERENCES stores(id) ON DELETE SET NULL;
ALTER TABLE store_suggestions ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE store_suggestions ADD COLUMN IF NOT EXISTS admin_note   TEXT;
ALTER TABLE store_suggestions ADD COLUMN IF NOT EXISTS reviewed_by  TEXT;

COMMENT ON COLUMN store_suggestions.suggestion_type IS '제안 유형: new_store|closed|name_change|hours_change|phone_change|category_change|other';
COMMENT ON COLUMN store_suggestions.store_id        IS '수정 대상 기존 매장 ID (신규 제안은 NULL)';
COMMENT ON COLUMN store_suggestions.admin_note      IS '관리자 처리 메모';

-- ── coupon_downloads ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon_downloads (
  id            BIGSERIAL    PRIMARY KEY,
  coupon_id     TEXT         NOT NULL,
  user_id       TEXT,
  device_id     TEXT,
  downloaded_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  used_at       TIMESTAMPTZ,
  is_used       BOOLEAN      NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_coupon_downloads_coupon_id
  ON coupon_downloads (coupon_id, downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_coupon_downloads_user_id
  ON coupon_downloads (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE coupon_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupon_downloads_insert"
  ON coupon_downloads FOR INSERT WITH CHECK (true);
CREATE POLICY "coupon_downloads_select_own"
  ON coupon_downloads FOR SELECT USING (true);

-- ── store_coupons 컬럼 추가 ──────────────────────────────────────
ALTER TABLE store_coupons ADD COLUMN IF NOT EXISTS start_date     DATE;
ALTER TABLE store_coupons ADD COLUMN IF NOT EXISTS view_count     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE store_coupons ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE store_coupons ADD COLUMN IF NOT EXISTS conditions     TEXT;      -- 이용 조건 설명
ALTER TABLE store_coupons ADD COLUMN IF NOT EXISTS max_per_user   INTEGER;   -- 1인 최대 사용 횟수 (NULL = 무제한)

COMMENT ON COLUMN store_coupons.start_date     IS '쿠폰 적용 시작일 (NULL = 즉시)';
COMMENT ON COLUMN store_coupons.view_count     IS '쿠폰 노출 수';
COMMENT ON COLUMN store_coupons.download_count IS '쿠폰 다운로드 수';
COMMENT ON COLUMN store_coupons.conditions     IS '이용 조건 (예: 2만원 이상 구매 시)';
COMMENT ON COLUMN store_coupons.max_per_user   IS '1인 최대 사용 한도 (NULL = 무제한)';
