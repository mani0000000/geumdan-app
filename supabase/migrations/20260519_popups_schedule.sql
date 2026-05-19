-- 홈 화면 팝업 (바텀시트) 테이블 + 노출 스케줄
-- start_at / end_at 은 nullable: NULL 이면 해당 경계 제한 없이 항상 노출
CREATE TABLE IF NOT EXISTS popups (
  id          TEXT PRIMARY KEY,
  sort_order  SMALLINT     NOT NULL DEFAULT 0,
  title       TEXT         NOT NULL DEFAULT '',
  image_url   TEXT,
  link_url    TEXT,
  link_label  TEXT         NOT NULL DEFAULT '자세히 보기',
  start_at    TIMESTAMPTZ,
  end_at      TIMESTAMPTZ,
  active      BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 기존 환경에 테이블이 이미 있는 경우 컬럼만 보강
ALTER TABLE popups ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;
ALTER TABLE popups ADD COLUMN IF NOT EXISTS end_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS popups_active_schedule_idx
  ON popups (active, start_at, end_at);
