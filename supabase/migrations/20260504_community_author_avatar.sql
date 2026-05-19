-- 커뮤니티 글/댓글 작성자 프로필 이미지 컬럼
ALTER TABLE community_posts    ADD COLUMN IF NOT EXISTS author_avatar_url TEXT;
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS author_avatar_url TEXT;
