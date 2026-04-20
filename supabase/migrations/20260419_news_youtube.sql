-- news_articles: 네이버 뉴스 검색 결과
CREATE TABLE IF NOT EXISTS news_articles (
  id           BIGSERIAL PRIMARY KEY,
  title        TEXT        NOT NULL,
  url          TEXT        NOT NULL UNIQUE,
  source       TEXT,
  summary      TEXT,
  thumbnail    TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  news_type    TEXT        NOT NULL DEFAULT 'local',
  tags         TEXT[]      NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS news_articles_published_at_idx ON news_articles (published_at DESC);
CREATE INDEX IF NOT EXISTS news_articles_news_type_idx    ON news_articles (news_type);

-- youtube_videos: 유튜브 innertube 검색 결과
CREATE TABLE IF NOT EXISTS youtube_videos (
  video_id     TEXT PRIMARY KEY,
  title        TEXT        NOT NULL,
  channel_name TEXT,
  thumbnail    TEXT,
  url          TEXT        NOT NULL,
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS youtube_videos_fetched_at_idx ON youtube_videos (fetched_at DESC);
