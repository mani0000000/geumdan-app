-- 커뮤니티 게시글에 이미지/동영상 첨부 컬럼 추가
-- - image_urls: 첨부 이미지 URL 배열 (Storage 또는 data URL)
-- - video_url:  첨부 동영상 URL (단일, 최대 1분 / 100MB / FHD)
--
-- 두 컬럼 모두 nullable. 기존 게시글은 변경되지 않는다.

alter table community_posts
  add column if not exists image_urls text[] not null default '{}'::text[];

alter table community_posts
  add column if not exists video_url text;
