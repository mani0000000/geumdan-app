-- 매장 썸네일 (간판/현관 사진)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 추천 검색어 (어드민 관리)
CREATE TABLE IF NOT EXISTS search_keywords (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  keyword     TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE search_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_keywords_read"  ON search_keywords FOR SELECT USING (active = true);
CREATE POLICY "search_keywords_admin" ON search_keywords USING (true) WITH CHECK (true);

-- 초기 추천 검색어
INSERT INTO search_keywords (id, keyword, sort_order) VALUES
  ('skw_01', '스타벅스',   10),
  ('skw_02', '카페',       20),
  ('skw_03', '편의점',     30),
  ('skw_04', '파리바게뜨', 40),
  ('skw_05', '약국',       50),
  ('skw_06', '헬스',       60),
  ('skw_07', '치킨',       70),
  ('skw_08', '미용실',     80)
ON CONFLICT (id) DO NOTHING;

-- 검색 로그 (실시간 인기 검색어 집계용)
CREATE TABLE IF NOT EXISTS search_logs (
  id          BIGSERIAL PRIMARY KEY,
  keyword     TEXT        NOT NULL,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_logs_insert" ON search_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "search_logs_read"   ON search_logs FOR SELECT USING (true);

-- 인기 검색어 집계 뷰 (최근 7일, 상위 10개)
CREATE OR REPLACE VIEW popular_search_keywords AS
SELECT keyword, COUNT(*) AS cnt
FROM search_logs
WHERE searched_at > NOW() - INTERVAL '7 days'
  AND length(keyword) >= 2
GROUP BY keyword
ORDER BY cnt DESC
LIMIT 10;
