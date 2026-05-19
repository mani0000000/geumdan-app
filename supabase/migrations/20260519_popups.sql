-- 홈 메인 바텀시트 팝업 (활성 최대 3개는 어드민 UI에서 제어)
CREATE TABLE IF NOT EXISTS popups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL DEFAULT '',
  image_url   TEXT,
  link_url    TEXT,
  link_label  TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_popups_active_order
  ON popups (is_active, sort_order);
