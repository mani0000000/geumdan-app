-- ============================================================
-- 약관 테이블 + 저장한 글 테이블
-- ============================================================

-- 약관 관리 테이블
CREATE TABLE IF NOT EXISTS terms (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type           TEXT        NOT NULL CHECK (type IN ('service','privacy','location','marketing')),
  title          TEXT        NOT NULL,
  content        TEXT        NOT NULL,
  version        TEXT        NOT NULL DEFAULT '1.0',
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  effective_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS terms_type_unique ON terms(type);

ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read terms"  ON terms FOR SELECT USING (true);
CREATE POLICY "service write terms" ON terms FOR ALL USING (true);

-- 저장한 글(북마크) 테이블
CREATE TABLE IF NOT EXISTS user_favorite_posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id     TEXT NOT NULL,
  title       TEXT,
  category    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE user_favorite_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_fav_posts" ON user_favorite_posts FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_fav_posts_user ON user_favorite_posts(user_id);

-- 초기 약관 데이터 (있으면 무시)
INSERT INTO terms (type, title, version, effective_date, content) VALUES
('service', '서비스 이용약관', '1.0', '2024-01-01',
 E'## 제1조 (목적)\n본 약관은 검단 라이프(이하 "서비스")가 제공하는 검단신도시 커뮤니티 서비스의 이용에 관한 조건 및 절차를 규정함을 목적으로 합니다.\n\n## 제2조 (정의)\n① "서비스"란 검단신도시 주민을 위한 커뮤니티, 상가정보, 교통, 부동산 정보 등을 제공하는 플랫폼을 말합니다.\n② "이용자"란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다.\n\n## 제3조 (이용 자격)\n① 만 14세 이상이면 누구나 서비스를 이용할 수 있습니다.\n\n## 제4조 (금지 행위)\n① 타인의 개인정보 무단 수집, 저장 또는 게시하는 행위\n② 음란, 폭력적, 혐오적 게시물을 작성하거나 유포하는 행위\n③ 광고, 홍보 목적의 스팸성 게시물을 반복적으로 작성하는 행위\n\n## 부칙\n본 약관은 2024년 1월 1일부터 시행합니다.'),
('privacy', '개인정보처리방침', '1.0', '2024-01-01',
 E'검단 라이프(이하 "서비스")은 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」을 준수합니다.\n\n## 1. 수집하는 개인정보 항목\n[필수 항목]\n• 닉네임\n• 거주 동(洞) 정보\n• 서비스 이용 기록, 접속 로그\n\n## 2. 개인정보 수집 목적\n• 커뮤니티 서비스 제공 및 회원 관리\n• 서비스 품질 개선 및 맞춤형 정보 제공\n\n## 3. 개인정보 보유 및 이용 기간\n• 원칙: 회원 탈퇴 시 즉시 파기\n\n## 부칙\n본 방침은 2024년 1월 1일부터 시행합니다.'),
('location', '위치기반 서비스 이용약관', '1.0', '2024-01-01',
 E'## 제1조 (목적)\n본 약관은 검단 라이프(이하 "서비스")가 위치기반서비스사업자로서 이용자의 위치정보를 이용하여 제공하는 서비스에 관한 사항을 규정합니다.\n\n## 제2조 (위치정보 수집)\n• GPS 기반 현재 위치 (위도, 경도)\n• 위치정보는 서버에 저장되지 않으며 기기 내에서만 처리됩니다.\n\n## 제3조 (위치기반 서비스)\n① 주변 버스 정류장 검색 및 실시간 도착 정보 제공\n② 인근 상가, 편의시설 거리 정보 제공\n\n## 부칙\n본 약관은 2024년 1월 1일부터 시행합니다.'),
('marketing', '마케팅 정보 수신 동의', '1.0', '2024-01-01',
 E'## 마케팅 정보 수신 동의 (선택사항)\n본 동의는 선택사항으로, 동의하지 않아도 기본 서비스 이용에 제한이 없습니다.\n\n## 수신 동의 목적\n• 검단신도시 내 새로운 상가·입점 소식 안내\n• 앱 내 쿠폰 및 혜택 정보 발송\n• 이벤트, 프로모션 안내\n\n## 동의 철회 방법\n앱 내: 마이페이지 > 설정 > 알림 설정에서 마케팅 알림 해제')
ON CONFLICT (type) DO NOTHING;
