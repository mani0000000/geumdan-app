-- ============================================================
-- 즐겨찾는 가볼만한 곳 (user_favorite_places)
-- 회원(익명 UUID)별로 즐겨찾기 등록/해제 관리
-- ============================================================

CREATE TABLE IF NOT EXISTS user_favorite_places (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_id        TEXT NOT NULL,
  place_name      TEXT NOT NULL,
  place_category  TEXT,
  place_area      TEXT,
  place_image_url TEXT,
  place_address   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

ALTER TABLE user_favorite_places ENABLE ROW LEVEL SECURITY;

-- anon 전체 허용 (클라이언트가 user_id로 직접 필터)
CREATE POLICY "public_fav_places" ON user_favorite_places FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fav_places_user ON user_favorite_places(user_id);
