/**
 * Blair-tunes Step 2 — YouTube 메타데이터 자동 파생.
 * DB에는 title / artist / youtube_url / curation만 넣어도
 * video id와 썸네일 URL이 코드에서 자동으로 채워진다.
 *
 * DB에 다시 쓰지 않음 — fetch 시점에 프론트/서버 사이드에서만 파생.
 */
import type { Track, EnrichedTrack } from './types';

/** YouTube video id 형식: 11자 [A-Za-z0-9_-] */
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const FALLBACK_THEME_COLOR = '#2A2118';
const FALLBACK_TEXT_COLOR = '#FFFFFF';

/**
 * youtube_url에서 video id 추출. 지원 형태:
 * - youtube.com/watch?v={id}
 * - youtu.be/{id}
 * - youtube.com/embed/{id}
 * - youtube.com/shorts/{id}
 * (www. / m. / music. 서브도메인, 추가 쿼리 파라미터 허용)
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^(www|m|music)\./, '');
  let candidate: string | null = null;

  if (host === 'youtu.be') {
    candidate = parsed.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments[0] === 'watch' || parsed.pathname === '/watch') {
      candidate = parsed.searchParams.get('v');
    } else if (segments[0] === 'embed' || segments[0] === 'shorts' || segments[0] === 'live' || segments[0] === 'v') {
      candidate = segments[1] ?? null;
    }
  }

  return candidate && VIDEO_ID_RE.test(candidate) ? candidate : null;
}

/**
 * video id → 썸네일 URL (최고 화질).
 * maxresdefault는 일부 영상에서 404가 나므로, UI에서는
 * getYouTubeThumbnailFallbackUrl()을 <img onerror> 대체 소스로 쓸 것.
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/** maxresdefault가 없는 영상용 폴백 (항상 존재) */
export function getYouTubeThumbnailFallbackUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * DB row → 플레이어가 바로 쓸 수 있는 트랙.
 * - youtube_video_id는 항상 youtube_url에서 파싱 (DB 컬럼 없음)
 * - thumbnail_url 없으면 video id로 생성
 * - theme_color / text_color는 DB 값 우선, 비어 있으면 폴백
 */
export function enrichTrack(track: Track): EnrichedTrack {
  const videoId = extractYouTubeVideoId(track.youtube_url);

  const thumbnailUrl =
    track.thumbnail_url || (videoId ? getYouTubeThumbnailUrl(videoId) : null);

  const thumbnailFallbackUrl = videoId
    ? getYouTubeThumbnailFallbackUrl(videoId)
    : track.thumbnail_url;

  return {
    ...track,
    youtube_video_id: videoId,
    thumbnail_url: thumbnailUrl,
    thumbnail_fallback_url: thumbnailFallbackUrl ?? null,
    theme_color: track.theme_color || FALLBACK_THEME_COLOR,
    text_color: track.text_color || FALLBACK_TEXT_COLOR,
  };
}
