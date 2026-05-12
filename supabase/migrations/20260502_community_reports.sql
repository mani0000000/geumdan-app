-- 커뮤니티 신고/숨기기 테이블 + 게시글 숨김 컬럼
-- 한국 정보통신망법 + 방송통신심의위원회 기준 신고 카테고리

-- ── community_posts 에 is_hidden 컬럼 추가 ─────────────────
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_posts_is_hidden
  ON community_posts(is_hidden);

-- ── 신고 테이블 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id TEXT REFERENCES community_comments(id) ON DELETE CASCADE,
  reporter_nickname TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam','obscene','privacy','harassment','illegal','hate','other')),
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT post_reports_target_chk
    CHECK ((post_id IS NOT NULL) OR (comment_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_comment_id ON post_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_created_at ON post_reports(created_at DESC);

ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can report" ON post_reports;
CREATE POLICY "Anyone can report" ON post_reports
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view reports" ON post_reports;
CREATE POLICY "Admins can view reports" ON post_reports
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can delete reports" ON post_reports;
CREATE POLICY "Admins can delete reports" ON post_reports
  FOR DELETE USING (true);

-- ── 숨김 테이블 (개인 피드 차단) ────────────────────────────
CREATE TABLE IF NOT EXISTS post_hidden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT REFERENCES community_posts(id) ON DELETE CASCADE,
  hidden_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, hidden_by)
);

CREATE INDEX IF NOT EXISTS idx_post_hidden_user ON post_hidden(hidden_by);

ALTER TABLE post_hidden ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can hide" ON post_hidden;
CREATE POLICY "Anyone can hide" ON post_hidden
  FOR ALL TO anon USING (true) WITH CHECK (true);
