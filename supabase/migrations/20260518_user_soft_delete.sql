-- ============================================================
-- 회원 탈퇴: soft delete + 소멸 스냅샷
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_reason      TEXT,
  ADD COLUMN IF NOT EXISTS deleted_points       INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_coupon_count INTEGER;

-- 활성/탈퇴 회원 분리 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

COMMENT ON COLUMN users.deleted_at           IS '탈퇴 시각 (NULL = 활성 회원)';
COMMENT ON COLUMN users.deletion_reason      IS '탈퇴 사유 (선택 입력)';
COMMENT ON COLUMN users.deleted_points       IS '탈퇴 시점 소멸된 보유 포인트';
COMMENT ON COLUMN users.deleted_coupon_count IS '탈퇴 시점 소멸된 보유 쿠폰 수';
