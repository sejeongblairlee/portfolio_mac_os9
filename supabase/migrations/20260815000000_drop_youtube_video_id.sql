-- youtube_video_id 컬럼 제거
-- youtube_url에서 클라이언트가 항상 파싱하므로 DB에 저장할 필요 없음
ALTER TABLE public.tracks DROP COLUMN IF EXISTS youtube_video_id;
