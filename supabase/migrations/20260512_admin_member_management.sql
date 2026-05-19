-- ============================================================
-- 어드민 회원 관리 — users 컬럼, admin_member_logs, user_activity_stats 뷰
-- ============================================================

-- 1) users 테이블 관리자용 컬럼 추가
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status            TEXT        NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_until   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS withdrawn_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes       TEXT        NOT NULL DEFAULT '';

-- status는 'active' | 'suspended' | 'withdrawn' 셋 중 하나
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('active', 'suspended', 'withdrawn'));

CREATE INDEX IF NOT EXISTS idx_users_status        ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_joined_at     ON users(joined_at DESC);

-- 2) 회원 관리 로그
CREATE TABLE IF NOT EXISTS admin_member_logs (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action     TEXT        NOT NULL,
  detail     TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_member_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_member_logs" ON admin_member_logs;
CREATE POLICY "public_member_logs"
  ON admin_member_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_member_logs_user_created
  ON admin_member_logs(user_id, created_at DESC);

-- 3) 회원 활동 통계 뷰
DROP VIEW IF EXISTS user_activity_stats;

CREATE VIEW user_activity_stats AS
SELECT
  u.id,
  u.nickname,
  u.dong,
  NULL::TEXT       AS avatar_url,
  NULL::TEXT       AS email,
  COALESCE(u.status, 'active')        AS status,
  u.suspended_until,
  u.withdrawn_at,
  COALESCE(u.admin_notes, '')         AS admin_notes,
  COALESCE(u.level, '새싹')           AS level,
  COALESCE(u.points, 0)               AS points,
  u.joined_at,
  u.updated_at,
  NULL::TIMESTAMPTZ                   AS last_active_at,
  COALESCE(u.post_count, 0)           AS post_count,
  COALESCE(u.comment_count, 0)        AS comment_count,
  COALESCE(u.like_count, 0)           AS received_like_count,
  GREATEST(
    (SELECT MAX(created_at) FROM community_posts    WHERE user_id = u.id),
    (SELECT MAX(created_at) FROM community_comments WHERE user_id = u.id),
    u.updated_at,
    u.joined_at
  ) AS last_activity_at
FROM users u;

GRANT SELECT ON user_activity_stats TO anon, authenticated;
