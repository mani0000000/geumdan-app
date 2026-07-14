-- Local creator / influencer collection model.
-- Keeps instagram_posts backwards compatible while adding managed sources,
-- categorized keywords, reels/stories and collection health.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.social_content_sources (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform          TEXT NOT NULL DEFAULT 'instagram',
  username          TEXT NOT NULL,
  display_name      TEXT,
  profile_url       TEXT,
  profile_image_url TEXT,
  biography         TEXT,
  category          TEXT NOT NULL DEFAULT '지역소식',
  external_id       TEXT,
  follower_count    BIGINT NOT NULL DEFAULT 0,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  collect_posts     BOOLEAN NOT NULL DEFAULT TRUE,
  collect_reels     BOOLEAN NOT NULL DEFAULT TRUE,
  collect_stories   BOOLEAN NOT NULL DEFAULT TRUE,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  featured          BOOLEAN NOT NULL DEFAULT FALSE,
  priority          INTEGER NOT NULL DEFAULT 0,
  discovered_by     TEXT,
  last_collected_at TIMESTAMPTZ,
  last_status       TEXT,
  last_error        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT social_sources_platform_username_key UNIQUE (platform, username),
  CONSTRAINT social_sources_username_normalized CHECK (username = LOWER(username))
);

CREATE TABLE IF NOT EXISTS public.social_content_keywords (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword         TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL DEFAULT '지역소식',
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  collect_hashtag BOOLEAN NOT NULL DEFAULT TRUE,
  priority        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.instagram_posts
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.social_content_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '지역소식',
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS follower_count BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_story BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS relevance_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS discovery_keyword TEXT,
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.instagram_posts
SET content_type = CASE
  WHEN is_reel THEN 'REEL'
  WHEN UPPER(COALESCE(media_type, '')) = 'CAROUSEL' THEN 'CAROUSEL'
  ELSE 'POST'
END
WHERE content_type IS NULL;

CREATE INDEX IF NOT EXISTS social_sources_active_priority_idx
  ON public.social_content_sources (active, featured DESC, priority DESC);
CREATE INDEX IF NOT EXISTS social_keywords_active_priority_idx
  ON public.social_content_keywords (active, priority DESC);
CREATE INDEX IF NOT EXISTS instagram_posts_active_recent_idx
  ON public.instagram_posts (active, posted_at DESC);
CREATE INDEX IF NOT EXISTS instagram_posts_category_recent_idx
  ON public.instagram_posts (category, posted_at DESC);
CREATE INDEX IF NOT EXISTS instagram_posts_source_recent_idx
  ON public.instagram_posts (source_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS instagram_posts_expiry_idx
  ON public.instagram_posts (expires_at) WHERE expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_social_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS social_sources_set_updated_at ON public.social_content_sources;
CREATE TRIGGER social_sources_set_updated_at
  BEFORE UPDATE ON public.social_content_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_social_updated_at();

DROP TRIGGER IF EXISTS social_keywords_set_updated_at ON public.social_content_keywords;
CREATE TRIGGER social_keywords_set_updated_at
  BEFORE UPDATE ON public.social_content_keywords
  FOR EACH ROW EXECUTE FUNCTION public.set_social_updated_at();

ALTER TABLE public.social_content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_content_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active social sources" ON public.social_content_sources;
CREATE POLICY "Public read active social sources"
  ON public.social_content_sources FOR SELECT
  TO anon, authenticated
  USING (active = TRUE);

DROP POLICY IF EXISTS "Public read active social keywords" ON public.social_content_keywords;
CREATE POLICY "Public read active social keywords"
  ON public.social_content_keywords FOR SELECT
  TO anon, authenticated
  USING (active = TRUE);

DROP POLICY IF EXISTS "Allow anon read" ON public.instagram_posts;
DROP POLICY IF EXISTS "Allow service write" ON public.instagram_posts;
DROP POLICY IF EXISTS "Public read active instagram content" ON public.instagram_posts;
CREATE POLICY "Public read active instagram content"
  ON public.instagram_posts FOR SELECT
  TO anon, authenticated
  USING (active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- New tables are no longer automatically exposed to the Data API on current
-- Supabase projects, so privileges are explicit. service_role bypasses RLS.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.social_content_sources, public.social_content_keywords, public.instagram_posts
  TO anon, authenticated;
GRANT ALL ON public.social_content_sources, public.social_content_keywords, public.instagram_posts
  TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

INSERT INTO public.social_content_keywords (keyword, category, priority)
VALUES
  ('검단신도시', '지역소식', 100),
  ('검단소식', '지역소식', 95),
  ('인천검단', '지역소식', 90),
  ('검단라이프', '지역소식', 85),
  ('검단맛집', '맛집', 100),
  ('검단신도시맛집', '맛집', 100),
  ('검단카페', '맛집', 90),
  ('검단신도시카페', '맛집', 90),
  ('아라동맛집', '맛집', 80),
  ('원당동맛집', '맛집', 80),
  ('당하동맛집', '맛집', 80),
  ('불로동맛집', '맛집', 75),
  ('마전동맛집', '맛집', 75),
  ('검단가볼만한곳', '가볼만한 곳', 100),
  ('검단핫플', '가볼만한 곳', 90),
  ('검단데이트', '가볼만한 곳', 85),
  ('검단아이와', '가볼만한 곳', 85),
  ('검단공원', '가볼만한 곳', 75),
  ('검단축제', '가볼만한 곳', 75),
  ('검단교통', '생활정보', 70)
ON CONFLICT (keyword) DO NOTHING;
