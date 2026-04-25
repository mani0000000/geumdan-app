CREATE TABLE IF NOT EXISTS instagram_posts (
  id           BIGSERIAL PRIMARY KEY,
  account_name TEXT        NOT NULL,
  post_url     TEXT        NOT NULL UNIQUE,
  image_url    TEXT,
  caption      TEXT,
  posted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS instagram_posts_posted_at_idx ON instagram_posts (posted_at DESC);
CREATE INDEX IF NOT EXISTS instagram_posts_account_idx   ON instagram_posts (account_name);

ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read"    ON instagram_posts FOR SELECT USING (true);
CREATE POLICY "Allow service write" ON instagram_posts FOR ALL USING (true);
