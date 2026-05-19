-- ────────────────────────────────────────────────────────────────────────────
-- 커뮤니티 글쓰기 동영상 첨부 기능
-- Supabase SQL 에디터에서 실행하세요.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. community_posts 테이블에 videos 컬럼 추가
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS videos TEXT[];

-- 2. community-videos Storage 버킷 생성 (또는 재설정)
--    - public: 영상은 누구나 재생 가능
--    - file_size_limit: 100MB
--    - allowed_mime_types: 일반적인 영상 포맷
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-videos',
  'community-videos',
  true,
  104857600,
  ARRAY[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v',
    'video/x-msvideo',
    'video/x-matroska',
    'video/3gpp',
    'video/3gpp2'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Storage RLS 정책 (storage.objects)
--    클라이언트가 anon key 로 직접 업로드 → 공개 URL 로 재생.
--    삭제는 작성 후 취소(글 등록 전 미리보기 삭제) 흐름을 위해 허용한다.

DROP POLICY IF EXISTS "community_videos_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "community_videos_anon_insert"  ON storage.objects;
DROP POLICY IF EXISTS "community_videos_anon_delete"  ON storage.objects;

CREATE POLICY "community_videos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-videos');

CREATE POLICY "community_videos_anon_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'community-videos');

CREATE POLICY "community_videos_anon_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'community-videos');
