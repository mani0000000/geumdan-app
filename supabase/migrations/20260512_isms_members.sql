-- ISMS 기준 회원 관리 스키마 확장
-- users 테이블에 ISMS 필수 컬럼 추가

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url         TEXT,
  ADD COLUMN IF NOT EXISTS email              TEXT,
  ADD COLUMN IF NOT EXISTS status             TEXT        NOT NULL DEFAULT 'active'
                                              CHECK (status IN ('active','suspended','withdrawn')),
  ADD COLUMN IF NOT EXISTS suspended_until    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason   TEXT,
  ADD COLUMN IF NOT EXISTS withdrawn_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes        TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS points             INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS login_type         TEXT        NOT NULL DEFAULT 'phone'
                                              CHECK (login_type IN ('phone','kakao','apple')),
  ADD COLUMN IF NOT EXISTS fail_login_count   INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_ip      TEXT,
  ADD COLUMN IF NOT EXISTS is_verified        BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS terms_agreed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_agreed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_agreed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketing_agreed_at TIMESTAMPTZ;

-- 접근 이력 테이블 (ISMS: 접근 통제, 접근 이력 관리)
CREATE TABLE IF NOT EXISTS user_login_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address  TEXT,
  user_agent  TEXT,
  login_type  TEXT        NOT NULL DEFAULT 'phone'
              CHECK (login_type IN ('phone','kakao','apple')),
  success     BOOLEAN     NOT NULL DEFAULT TRUE,
  fail_reason TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_login_history_user_id_idx ON user_login_history(user_id);
CREATE INDEX IF NOT EXISTS user_login_history_login_at_idx ON user_login_history(login_at DESC);

ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service read login history"  ON user_login_history FOR SELECT USING (true);
CREATE POLICY "service write login history" ON user_login_history FOR INSERT WITH CHECK (true);

-- 동의 이력 테이블 (ISMS: 개인정보 수집·이용 동의 이력)
CREATE TABLE IF NOT EXISTS user_consent_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT        NOT NULL
               CHECK (consent_type IN ('terms','privacy','location','marketing')),
  agreed       BOOLEAN     NOT NULL,
  agreed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address   TEXT,
  version      TEXT        NOT NULL DEFAULT '1.0',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_consent_history_user_id_idx ON user_consent_history(user_id);
CREATE INDEX IF NOT EXISTS user_consent_history_type_idx    ON user_consent_history(consent_type);

ALTER TABLE user_consent_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service read consent history"  ON user_consent_history FOR SELECT USING (true);
CREATE POLICY "service write consent history" ON user_consent_history FOR INSERT WITH CHECK (true);

-- 관리자 액션 로그 (ISMS: 관리자 행위 기록)
CREATE TABLE IF NOT EXISTS admin_member_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id    UUID,
  action      TEXT        NOT NULL,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_member_logs_user_id_idx  ON admin_member_logs(user_id);
CREATE INDEX IF NOT EXISTS admin_member_logs_created_idx  ON admin_member_logs(created_at DESC);

ALTER TABLE admin_member_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service read admin logs"  ON admin_member_logs FOR SELECT USING (true);
CREATE POLICY "service write admin logs" ON admin_member_logs FOR INSERT WITH CHECK (true);

-- 활동 통계 뷰 (admin-members.ts 에서 우선 참조)
CREATE OR REPLACE VIEW user_activity_stats AS
SELECT
  id,
  nickname,
  dong,
  avatar_url,
  email,
  status,
  suspended_until,
  withdrawn_at,
  admin_notes,
  level,
  points,
  joined_at,
  last_active_at,
  updated_at,
  COALESCE(post_count,    0)::INT AS post_count,
  COALESCE(comment_count, 0)::INT AS comment_count,
  0::INT                          AS received_like_count,
  last_active_at                  AS last_activity_at
FROM users;
