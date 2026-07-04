/**
 * Blair-tunes Step 3 — 클라이언트에서 /api/theme-color 호출해
 * fallback 상태인 트랙의 theme_color를 썸네일 파생 색으로 교체.
 *
 * 규칙 (DB에 쓰지 않음):
 * - DB의 color_source가 'fallback'이 아니면 (manual 등) DB 값 그대로 사용
 * - fallback이면 API로 파생 시도, 실패하면 기존 fallback 색 유지
 */
import type { EnrichedTrack } from './types';

interface ThemeColorResponse {
  theme_color?: string;
  text_color?: string;
  color_source?: string;
}

export async function applyDerivedThemeColors(
  tracks: EnrichedTrack[],
  endpoint = '/api/theme-color',
): Promise<EnrichedTrack[]> {
  return Promise.all(
    tracks.map(async (track) => {
      if (track.color_source !== 'fallback' || !track.youtube_video_id) return track;
      try {
        const res = await fetch(`${endpoint}?videoId=${encodeURIComponent(track.youtube_video_id)}`);
        if (!res.ok) return track;
        const body = (await res.json()) as ThemeColorResponse;
        if (body.color_source === 'thumbnail' && typeof body.theme_color === 'string') {
          return {
            ...track,
            theme_color: body.theme_color,
            text_color: body.text_color ?? '#FFFFFF',
            color_source: 'thumbnail',
          };
        }
      } catch {
        // API 불가(로컬 file:// 등) → fallback 색 유지
      }
      return track;
    }),
  );
}
