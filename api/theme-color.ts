/**
 * GET /api/theme-color?videoId={11자 YouTube id}
 * → { theme_color, text_color, color_source }
 *
 * Vercel 서버리스 함수 — 브라우저 CORS 제약(img.youtube.com) 우회용.
 * 썸네일 색은 사실상 불변이므로 CDN에 30일 캐시.
 */
import { deriveThemeFromThumbnail } from '../src/lib/thumbnail-theme';

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

interface VercelRequestLike {
  query?: Record<string, string | string[] | undefined>;
}
interface VercelResponseLike {
  status(code: number): VercelResponseLike;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  const raw = req.query?.videoId;
  const videoId = Array.isArray(raw) ? raw[0] : raw ?? '';

  if (!VIDEO_ID_RE.test(videoId)) {
    res.status(400).json({ error: 'invalid videoId' });
    return;
  }

  const result = await deriveThemeFromThumbnail(videoId);
  res.setHeader('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate=604800');
  res.status(200).json(result);
}
