-- ============================================================
-- 회원관리 시스템 — users 테이블 확장 + 관리자 기능
-- ============================================================

-- 1) 프로필 + 상태 컬럼 추가
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url       TEXT,
  ADD COLUMN IF NOT EXISTS email            TEXT,
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'withdrawn')),
  ADD COLUMN IF NOT EXISTS suspended_until  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS withdrawn_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_active_at   TIMESTAMPTZ;

-- 2) 인덱스
CREATE INDEX IF NOT EXISTS idx_users_status        ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_joined_at     ON users(joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_active   ON users(last_active_at DESC);

-- 2-1) community_posts.user_id, community_comments.user_id 외래키 (PostgREST embedded resource 활성화)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'community_posts_user_id_fkey'
      AND table_name = 'community_posts'
  ) THEN
    ALTER TABLE community_posts
      ADD CONSTRAINT community_posts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'community_comments_user_id_fkey'
      AND table_name = 'community_comments'
  ) THEN
    ALTER TABLE community_comments
      ADD CONSTRAINT community_comments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) 정지 자동 해제 트리거: 정지 만료 시 status='active'로 복구
--    (조회 시점에 처리하는 게 더 안전하므로 트리거 대신 어플리케이션 로직 + 뷰로 처리)
CREATE OR REPLACE VIEW users_view AS
SELECT
  u.*,
  CASE
    WHEN u.status = 'suspended'
     AND u.suspended_until IS NOT NULL
     AND u.suspended_until < NOW() THEN 'active'
    ELSE u.status
  END AS effective_status
FROM users u;

-- 4) 회원 활동 통계 뷰 (집계용 — 관리자 페이지 성능)
CREATE OR REPLACE VIEW user_activity_stats AS
SELECT
  u.id,
  u.nickname,
  u.dong,
  u.avatar_url,
  u.email,
  u.status,
  u.suspended_until,
  u.withdrawn_at,
  u.admin_notes,
  u.level,
  u.points,
  u.joined_at,
  u.last_active_at,
  u.updated_at,
  COALESCE(p.cnt, 0)            AS post_count,
  COALESCE(c.cnt, 0)            AS comment_count,
  COALESCE(u.like_count, 0)     AS received_like_count,
  GREATEST(
    u.last_active_at,
    p.last_post_at,
    c.last_comment_at,
    u.updated_at
  ) AS last_activity_at
FROM users u
LEFT JOIN (
  SELECT user_id, COUNT(*)::int AS cnt, MAX(created_at) AS last_post_at
  FROM community_posts
  WHERE user_id IS NOT NULL
  GROUP BY user_id
) p ON p.user_id = u.id
LEFT JOIN (
  SELECT user_id, COUNT(*)::int AS cnt, MAX(created_at) AS last_comment_at
  FROM community_comments
  WHERE user_id IS NOT NULL
  GROUP BY user_id
) c ON c.user_id = u.id;

-- 5) 관리자 메모 변경 이력 (선택: 추후 감사 로그용)
CREATE TABLE IF NOT EXISTS admin_member_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,    -- 'suspend' | 'unsuspend' | 'withdraw' | 'note'
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_member_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_admin_member_logs"
  ON admin_member_logs FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_member_logs_user
  ON admin_member_logs(user_id, created_at DESC);
