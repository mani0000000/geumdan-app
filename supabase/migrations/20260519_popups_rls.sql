-- popups 테이블 RLS 정책 (20260519_popups.sql 이 RLS 만 켜고 정책을 안 만들어
-- 익명 SELECT/INSERT 가 전부 차단되던 버그 수정 — instagram_posts 패턴과 동일).
-- 멱등: 여러 번 실행해도 안전.
ALTER TABLE popups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read"     ON popups;
DROP POLICY IF EXISTS "Allow service write" ON popups;

-- 프론트(anon publishable key)에서 활성 팝업 조회 허용
CREATE POLICY "Allow anon read"     ON popups FOR SELECT USING (true);

-- 어드민(service key / anon 폴백 모두) 쓰기 허용
CREATE POLICY "Allow service write" ON popups FOR ALL USING (true) WITH CHECK (true);
