-- ============================================================
-- 알림(notifications) 테이블
-- ============================================================
-- 알림 타입:
--  coupon_expiry  : 쿠폰 만료 D-3, D-1
--  post_like      : 내 글에 좋아요
--  post_comment   : 내 글에 댓글
--  comment_reply  : 내 댓글에 답글
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL,
  type          TEXT        NOT NULL,
  title         TEXT        NOT NULL,
  body          TEXT        NOT NULL DEFAULT '',
  is_read       BOOLEAN     NOT NULL DEFAULT FALSE,
  related_id    TEXT,
  related_type  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read"   ON notifications;
DROP POLICY IF EXISTS "public write"  ON notifications;
DROP POLICY IF EXISTS "public update" ON notifications;
DROP POLICY IF EXISTS "public delete" ON notifications;

CREATE POLICY "public read"   ON notifications FOR SELECT USING (true);
CREATE POLICY "public write"  ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "public update" ON notifications FOR UPDATE USING (true);
CREATE POLICY "public delete" ON notifications FOR DELETE USING (true);

-- ============================================================
-- 글/댓글 작성자 추적용 user_id 컬럼 추가
-- (좋아요/댓글 시 작성자에게 알림을 보내기 위해 필요)
-- ============================================================

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE community_comments
  ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS idx_community_posts_user_id    ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_user_id ON community_comments(user_id);
