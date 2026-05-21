-- Add extended fields to instagram_posts for richer feed data
ALTER TABLE instagram_posts
  ADD COLUMN IF NOT EXISTS media_type    TEXT,
  ADD COLUMN IF NOT EXISTS shortcode     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS like_count    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count    INTEGER,
  ADD COLUMN IF NOT EXISTS hashtags      TEXT[],
  ADD COLUMN IF NOT EXISTS username      TEXT,
  ADD COLUMN IF NOT EXISTS is_reel       BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS instagram_posts_shortcode_idx ON instagram_posts (shortcode);
CREATE INDEX IF NOT EXISTS instagram_posts_is_reel_idx   ON instagram_posts (is_reel);
CREATE INDEX IF NOT EXISTS instagram_posts_media_type_idx ON instagram_posts (media_type);
