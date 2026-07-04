/**
 * Blair-tunes Step 3 — 컬러 유틸리티.
 * 목표: theme_color가 항상 흰색(#FFFFFF) 텍스트와 WCAG AA(4.5:1) 이상 대비를 갖도록 보정.
 */

export interface RGB { r: number; g: number; b: number; }
/** h: 0–360, s/l: 0–1 */
export interface HSL { h: number; s: number; l: number; }

export const FALLBACK_THEME_COLOR = '#2A2118';
export const WHITE: RGB = { r: 255, g: 255, b: 255 };
export const WCAG_AA_NORMAL = 4.5;

export function hexToRgb(hex: string): RGB | null {
  const raw = hex.trim().replace(/^#/, '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const hn = ((h % 360) + 360) % 360 / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t0: number) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return {
    r: Math.round(channel(hn + 1 / 3) * 255),
    g: Math.round(channel(hn) * 255),
    b: Math.round(channel(hn - 1 / 3) * 255),
  };
}

/** WCAG 상대 휘도 (sRGB 선형화) */
export function getRelativeLuminance(rgb: RGB): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

/** WCAG 대비율 (1–21) */
export function getContrastRatio(a: RGB, b: RGB): number {
  const la = getRelativeLuminance(a);
  const lb = getRelativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * 도미넌트 컬러 후보로 부적합한 색 판정:
 * 근흑 / 근백 / 저채도 그레이 (JPEG 압축 아티팩트 포함)
 */
export function isBadDominantColor(rgb: RGB): boolean {
  const { s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  if (l < 0.10) return true;   // near-black
  if (l > 0.90) return true;   // near-white
  if (s < 0.18) return true;   // low-saturation gray
  return false;
}

/**
 * 흰색 텍스트와 4.5:1 이상이 될 때까지 점진 보정:
 * - 명도를 조금씩 낮춤 (hue 보존)
 * - 많이 어두워져도 부족하면 채도를 살짝만 낮춤
 * 실패 시 null (호출부에서 FALLBACK_THEME_COLOR 사용)
 */
export function ensureContrastWithWhite(
  hex: string,
  target: number = WCAG_AA_NORMAL,
): string | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  let { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  for (let i = 0; i < 80; i++) {
    const cur = hslToRgb(h, s, l);
    if (getContrastRatio(WHITE, cur) >= target) {
      return rgbToHex(cur.r, cur.g, cur.b);
    }
    l = Math.max(0, l - 0.02);
    if (l < 0.22) s = Math.max(0, s - 0.015);
  }
  return null;
}
