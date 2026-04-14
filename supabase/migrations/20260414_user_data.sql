-- ============================================================
-- 사용자 계정별 데이터 테이블
-- ============================================================

-- Users (익명 UUID 기반 사용자 프로필)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname    TEXT NOT NULL DEFAULT '검단주민',
  dong        TEXT DEFAULT '당하동',
  level       TEXT DEFAULT '새싹',  -- 새싹 | 주민 | 이웃 | 터줏대감
  post_count  INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Favorite buses
CREATE TABLE IF NOT EXISTS user_favorite_buses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id    TEXT NOT NULL,
  route_name  TEXT,
  stop_id     TEXT,
  stop_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, route_id)
);

-- Favorite stores
CREATE TABLE IF NOT EXISTS user_favorite_stores (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id      TEXT NOT NULL,
  store_name    TEXT,
  building_id   TEXT,
  building_name TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

-- Favorite apartments
CREATE TABLE IF NOT EXISTS user_favorite_apts (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  apt_id    TEXT NOT NULL,
  apt_name  TEXT,
  dong      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, apt_id)
);

-- Downloaded coupons
CREATE TABLE IF NOT EXISTS user_coupons (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coupon_id     TEXT NOT NULL,
  store_name    TEXT,
  title         TEXT,
  discount      TEXT,
  expiry        TEXT,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, coupon_id)
);

-- Notification & app settings
CREATE TABLE IF NOT EXISTS user_settings (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_all        BOOLEAN DEFAULT TRUE,
  push_comment    BOOLEAN DEFAULT TRUE,
  push_like       BOOLEAN DEFAULT FALSE,
  push_notice     BOOLEAN DEFAULT TRUE,
  push_marketing  BOOLEAN DEFAULT FALSE,
  location_on     BOOLEAN DEFAULT TRUE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- user_id 컬럼 추가 (community_posts, community_comments)
ALTER TABLE community_posts    ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS user_id UUID;

-- RLS
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_buses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_stores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorite_apts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings          ENABLE ROW LEVEL SECURITY;

-- anon 전체 허용 (클라이언트가 user_id로 직접 필터)
CREATE POLICY "public_users"        ON users              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_fav_buses"    ON user_favorite_buses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_fav_stores"   ON user_favorite_stores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_fav_apts"     ON user_favorite_apts  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_coupons"      ON user_coupons        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_settings"     ON user_settings       FOR ALL USING (true) WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_fav_buses_user   ON user_favorite_buses(user_id);
CREATE INDEX IF NOT EXISTS idx_fav_stores_user  ON user_favorite_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_fav_apts_user    ON user_favorite_apts(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_user     ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user       ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_user    ON community_comments(user_id);
