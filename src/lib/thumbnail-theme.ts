/**
 * Blair-tunes Step 3 — 썸네일 → 접근성 보정된 테마 컬러 (서버 사이드 코어).
 * img.youtube.com은 CORS 헤더가 없어 브라우저 캔버스 추출이 불가능하므로
 * 이 모듈은 Vercel 함수(api/theme-color.ts)에서 실행된다.
 */
import { decode } from 'jpeg-js';
import { extractDominantColor } from './dominant-color';
import {
  ensureContrastWithWhite,
  isBadDominantColor,
  rgbToHex,
  FALLBACK_THEME_COLOR,
} from './color';
import { getYouTubeThumbnailUrl, getYouTubeThumbnailFallbackUrl } from './youtube';

export interface ThemeColorResult {
  theme_color: string;
  text_color: '#FFFFFF';
  color_source: 'thumbnail' | 'fallback';
}

export const FALLBACK_RESULT: ThemeColorResult = {
  theme_color: FALLBACK_THEME_COLOR,
  text_color: '#FFFFFF',
  color_source: 'fallback',
};

/** JPEG 바이트 → 테마 컬러. 어떤 실패든 fallback으로 안전하게 수렴. */
export function deriveThemeFromJpeg(jpegBytes: Uint8Array): ThemeColorResult {
  try {
    const img = decode(jpegBytes, {
      useTArray: true,
      maxMemoryUsageInMB: 128,
      maxResolutionInMP: 4,
    });
    if (!img || img.width < 100 || img.height < 100) return FALLBACK_RESULT; // 저화질 배제
    const rgb = extractDominantColor(img.data, img.width, img.height);
    if (!rgb || isBadDominantColor(rgb)) return FALLBACK_RESULT;
    const corrected = ensureContrastWithWhite(rgbToHex(rgb.r, rgb.g, rgb.b));
    if (!corrected) return FALLBACK_RESULT;
    return { theme_color: corrected, text_color: '#FFFFFF', color_source: 'thumbnail' };
  } catch {
    return FALLBACK_RESULT;
  }
}

/**
 * videoId → maxresdefault 시도, 실패/부적합 시 hqdefault 재시도 → 그래도 안 되면 fallback.
 */
export async function deriveThemeFromThumbnail(
  videoId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ThemeColorResult> {
  const urls = [getYouTubeThumbnailUrl(videoId), getYouTubeThumbnailFallbackUrl(videoId)];
  for (const url of urls) {
    try {
      const res = await fetchImpl(url);
      if (!res.ok) continue;                       // maxres 404 → hq로
      const buf = new Uint8Array(await res.arrayBuffer());
      const result = deriveThemeFromJpeg(buf);
      if (result.color_source === 'thumbnail') return result;
      // 디코드는 됐지만 색이 부적합 → 다음 화질에서 한 번 더 시도
    } catch {
      // 네트워크/디코드 오류 → 다음 화질
    }
  }
  return FALLBACK_RESULT;
}
