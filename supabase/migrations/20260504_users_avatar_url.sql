-- 사용자 프로필 이미지 컬럼 추가
-- 마이페이지 / 커뮤니티 작성자 표시 / 댓글에서 사용
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS intro      TEXT DEFAULT '';
