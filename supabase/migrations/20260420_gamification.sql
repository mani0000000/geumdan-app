-- ============================================================
-- 게임화 데이터: users 컬럼 추가 + 새 테이블
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS intro          TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS points         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_likes   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_posts   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_points INTEGER NOT NULL DEFAULT 0;

-- 포인트 내역 로그
CREATE TABLE IF NOT EXISTS user_point_history (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points     INTEGER     NOT NULL,
  desc_text  TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 주간 미션 완료 기록
CREATE TABLE IF NOT EXISTS user_mission_completions (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  week_start DATE NOT NULL DEFAULT date_trunc('week', NOW())::DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, mission_id, week_start)
);

-- 포인트 교환 내역
CREATE TABLE IF NOT EXISTS user_reward_redemptions (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id  TEXT        NOT NULL,
  cost       INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE user_point_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mission_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reward_redemptions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_point_history" ON user_point_history       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_missions"      ON user_mission_completions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_redemptions"   ON user_reward_redemptions  FOR ALL USING (true) WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_point_history_user ON user_point_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_missions_user_week ON user_mission_completions(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_redemptions_user   ON user_reward_redemptions(user_id, created_at DESC);
