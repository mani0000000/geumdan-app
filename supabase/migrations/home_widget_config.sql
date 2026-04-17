-- 홈 위젯 구성 테이블
CREATE TABLE IF NOT EXISTS home_widget_config (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE home_widget_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read"  ON home_widget_config FOR SELECT TO anon USING (true);
CREATE POLICY "anon_write" ON home_widget_config FOR ALL    TO anon USING (true) WITH CHECK (true);

INSERT INTO home_widget_config (id, label, enabled, sort_order) VALUES
  ('greeting',  '인사 배너',    true, 1),
  ('weather',   '날씨 위젯',    true, 2),
  ('quickmenu', '퀵 메뉴',      true, 3),
  ('coupons',   '이번 주 쿠폰', true, 4),
  ('openings',  '신규 오픈',    true, 5),
  ('mart',      '주변 마트',    true, 6),
  ('pharmacy',  '약국·응급실',  true, 7),
  ('transport', '교통',         true, 8),
  ('sosik',     '검단 소식',    true, 9)
ON CONFLICT (id) DO NOTHING;
