-- ============================================================
-- 북마크한 커뮤니티 글
-- ============================================================

CREATE TABLE IF NOT EXISTS user_favorite_posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     TEXT NOT NULL,
  title       TEXT,
  category    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE user_favorite_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_fav_posts" ON user_favorite_posts FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fav_posts_user ON user_favorite_posts(user_id);
