/**
 * Blair-tunes Step 3 — 썸네일 도미넌트 컬러 추출.
 * RGBA 픽셀 버퍼에서 "시각적으로 대표적인 미드톤 색"을 찾는다.
 *
 * 배제 규칙:
 * - 근흑 (레터박스 검은 띠, 압축 아티팩트)
 * - 근백 (하이라이트/배경)
 * - 저채도 그레이
 * - 가장자리 12% (YouTube 썸네일 검은 바 영역)
 */
import { rgbToHsl, type RGB } from './color';

export interface ExtractOptions {
  /** 가장자리 무시 비율 (기본 0.12) */
  marginRatio?: number;
  /** 픽셀 샘플링 간격 (기본 2 = 4픽셀당 1개) */
  step?: number;
  /** 최소 버킷 표본 수 — 미달이면 신뢰 불가로 null */
  minCount?: number;
}

interface Bucket { n: number; r: number; g: number; b: number; s: number; }

export function extractDominantColor(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  opts: ExtractOptions = {},
): RGB | null {
  if (!rgba || width <= 0 || height <= 0) return null;
  const margin = opts.marginRatio ?? 0.12;
  const step = opts.step ?? 2;
  const mx = Math.floor(width * margin);
  const my = Math.floor(height * margin);

  const buckets = new Map<number, Bucket>();
  let valid = 0;

  for (let y = my; y < height - my; y += step) {
    for (let x = mx; x < width - mx; x += step) {
      const i = (y * width + x) * 4;
      const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
      const { s, l } = rgbToHsl(r, g, b);
      if (l < 0.10 || l > 0.90 || s < 0.18) continue;   // 나쁜 후보 픽셀 배제
      valid++;
      // 4bit/채널 양자화 버킷 (4096칸) — 같은 계열 색을 묶음
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const cur = buckets.get(key);
      if (cur) {
        cur.n++; cur.r += r; cur.g += g; cur.b += b; cur.s += s;
      } else {
        buckets.set(key, { n: 1, r, g, b, s });
      }
    }
  }

  if (buckets.size === 0) return null;

  // 대표성 점수 = 빈도 × (0.6 + 평균 채도) → 칙칙한 색보다 살아있는 미드톤 선호
  let best: Bucket | null = null;
  let bestScore = -1;
  for (const bkt of buckets.values()) {
    const score = bkt.n * (0.6 + bkt.s / bkt.n);
    if (score > bestScore) { bestScore = score; best = bkt; }
  }

  const minCount = opts.minCount ?? Math.max(24, Math.floor(valid * 0.02));
  if (!best || best.n < minCount) return null;   // 표본 부족 = 저품질/파편화 → 신뢰 불가

  return {
    r: Math.round(best.r / best.n),
    g: Math.round(best.g / best.n),
    b: Math.round(best.b / best.n),
  };
}
