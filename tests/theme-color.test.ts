/**
 * Blair-tunes Step 3 테스트.
 * 실행: npx tsx tests/theme-color.test.ts
 */
import { encode } from 'jpeg-js';
import {
  hexToRgb, rgbToHex, rgbToHsl,
  getContrastRatio, ensureContrastWithWhite, isBadDominantColor,
  WHITE, FALLBACK_THEME_COLOR,
} from '../src/lib/color';
import { extractDominantColor } from '../src/lib/dominant-color';
import { deriveThemeFromJpeg, deriveThemeFromThumbnail } from '../src/lib/thumbnail-theme';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) failures++;
}

function hueDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** 단색+옵션 노이즈로 합성 RGBA 이미지 생성 */
function solidImage(w: number, h: number, rgb: [number, number, number]): Uint8Array {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = rgb[0]; data[i * 4 + 1] = rgb[1]; data[i * 4 + 2] = rgb[2]; data[i * 4 + 3] = 255;
  }
  return data;
}

// ── 1) 유틸 기본 검증 ───────────────────────────────────────────────────────
check('contrast(white, black) ≈ 21',
  Math.abs(getContrastRatio(WHITE, { r: 0, g: 0, b: 0 }) - 21) < 0.1);
check('fallback #2A2118 vs white ≥ 4.5',
  getContrastRatio(WHITE, hexToRgb(FALLBACK_THEME_COLOR)!) >= 4.5);

// ── 2) 흰 텍스트 대비 4.5 보장 + 밝은 노랑은 어두워짐 + hue 보존 ────────────
{
  const input = '#FFE135'; // 밝은 노랑
  const out = ensureContrastWithWhite(input);
  check('bright yellow corrected (non-null)', out !== null);
  if (out) {
    const ratio = getContrastRatio(WHITE, hexToRgb(out)!);
    check('corrected yellow contrast ≥ 4.5', ratio >= 4.5, `ratio=${ratio.toFixed(2)} (${out})`);
    const hIn = rgbToHsl(255, 225, 53).h;
    const o = hexToRgb(out)!;
    const { h: hOut, l: lOut } = rgbToHsl(o.r, o.g, o.b);
    check('yellow became darker', lOut < 0.5, `l=${lOut.toFixed(2)}`);
    check('hue preserved (±15°)', hueDiff(hIn, hOut) <= 15,
      `in=${hIn.toFixed(0)}° out=${hOut.toFixed(0)}°`);
  }
}
// 임의의 유채색들도 전부 4.5 이상으로 수렴하는지
for (const hex of ['#FF0000', '#00FF88', '#3E7BFA', '#FF69B4', '#00FFFF']) {
  const out = ensureContrastWithWhite(hex);
  const ok = out !== null && getContrastRatio(WHITE, hexToRgb(out)!) >= 4.5;
  check(`ensureContrast(${hex}) ≥ 4.5`, ok, out ?? 'null');
}

// ── 3) 나쁜 도미넌트 컬러 판정 ──────────────────────────────────────────────
check('black is bad', isBadDominantColor({ r: 0, g: 0, b: 0 }));
check('near-black is bad', isBadDominantColor({ r: 18, g: 15, b: 12 }));
check('white is bad', isBadDominantColor({ r: 255, g: 255, b: 255 }));
check('near-white is bad', isBadDominantColor({ r: 245, g: 244, b: 240 }));
check('mid gray is bad', isBadDominantColor({ r: 128, g: 128, b: 128 }));
check('saturated red is good', !isBadDominantColor({ r: 194, g: 59, b: 34 }));
check('saturated blue is good', !isBadDominantColor({ r: 62, g: 123, b: 250 }));

// ── 4) 도미넌트 추출: 대표 미드톤 선택 + 흑/백/띠 무시 ─────────────────────
{
  // 320×240: 상하 15%는 검은 레터박스, 중앙은 붉은색, 우측에 흰 블록
  const w = 320, h = 240;
  const data = solidImage(w, h, [194, 59, 34]);
  const bar = Math.floor(h * 0.15);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (y < bar || y >= h - bar) { data[i] = data[i+1] = data[i+2] = 3; }        // 검은 띠
      else if (x > w * 0.75) { data[i] = data[i+1] = data[i+2] = 250; }            // 흰 블록
    }
  }
  const rgb = extractDominantColor(data, w, h);
  const ok = !!rgb && Math.abs(rgb.r - 194) < 20 && Math.abs(rgb.g - 59) < 20 && Math.abs(rgb.b - 34) < 20;
  check('extracts red midtone, ignores black bars & white block', ok,
    rgb ? rgbToHex(rgb.r, rgb.g, rgb.b) : 'null');
}
check('all-black image → null', extractDominantColor(solidImage(64, 64, [5, 5, 5]), 64, 64) === null);
check('all-white image → null', extractDominantColor(solidImage(64, 64, [250, 250, 250]), 64, 64) === null);
check('all-gray image → null', extractDominantColor(solidImage(64, 64, [128, 128, 128]), 64, 64) === null);

// ── 5) JPEG 파이프라인 (jpeg-js encode → derive) ────────────────────────────
function jpegOf(rgb: [number, number, number], w = 320, h = 240): Uint8Array {
  return new Uint8Array(encode({ data: solidImage(w, h, rgb), width: w, height: h }, 90).data);
}
{
  const r = deriveThemeFromJpeg(jpegOf([194, 59, 34]));
  const ratio = getContrastRatio(WHITE, hexToRgb(r.theme_color)!);
  check('red jpeg → thumbnail source', r.color_source === 'thumbnail', r.theme_color);
  check('red jpeg → contrast ≥ 4.5', ratio >= 4.5, `ratio=${ratio.toFixed(2)}`);
  const { h: hOut } = rgbToHsl(hexToRgb(r.theme_color)!.r, hexToRgb(r.theme_color)!.g, hexToRgb(r.theme_color)!.b);
  check('red jpeg → hue preserved', hueDiff(hOut, rgbToHsl(194, 59, 34).h) <= 15, `h=${hOut.toFixed(0)}°`);
}
{
  const bright = deriveThemeFromJpeg(jpegOf([255, 225, 53]));   // 밝은 노랑 썸네일
  const ratio = getContrastRatio(WHITE, hexToRgb(bright.theme_color)!);
  check('bright yellow jpeg → darkened & AA', bright.color_source === 'thumbnail' && ratio >= 4.5,
    `${bright.theme_color} ratio=${ratio.toFixed(2)}`);
}
check('black jpeg → fallback', deriveThemeFromJpeg(jpegOf([2, 2, 2])).color_source === 'fallback');
check('white jpeg → fallback', deriveThemeFromJpeg(jpegOf([252, 252, 252])).color_source === 'fallback');
check('gray jpeg → fallback', deriveThemeFromJpeg(jpegOf([128, 128, 128])).color_source === 'fallback');
check('tiny/low-quality jpeg → fallback', deriveThemeFromJpeg(jpegOf([194, 59, 34], 60, 45)).color_source === 'fallback');
check('corrupt bytes → fallback', deriveThemeFromJpeg(new Uint8Array([1, 2, 3, 4])).color_source === 'fallback');

// ── 6) 추출 실패/네트워크 실패 → fallback ───────────────────────────────────
async function asyncCases() {
  {
    const fetch404 = (async () => ({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) })) as unknown as typeof fetch;
    const r = await deriveThemeFromThumbnail('AAAAAAAAAAA', fetch404);
    check('both thumbnails 404 → fallback', r.color_source === 'fallback' && r.theme_color === FALLBACK_THEME_COLOR);
  }
  {
    const fetchGarbage = (async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([9, 9, 9]).buffer })) as unknown as typeof fetch;
    const r = await deriveThemeFromThumbnail('AAAAAAAAAAA', fetchGarbage);
    check('garbage response → fallback', r.color_source === 'fallback');
  }
  {
    // maxres는 404, hq는 정상 붉은 썸네일 → hq에서 추출 성공해야 함
    let call = 0;
    const fetchMixed = (async () => {
      call++;
      if (call === 1) return { ok: false, arrayBuffer: async () => new ArrayBuffer(0) };
      return { ok: true, arrayBuffer: async () => jpegOf([194, 59, 34]).buffer };
    }) as unknown as typeof fetch;
    const r = await deriveThemeFromThumbnail('AAAAAAAAAAA', fetchMixed);
    check('maxres 404 → hq fallback succeeds', r.color_source === 'thumbnail', r.theme_color);
  }
}

asyncCases().then(() => {
  console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
  process.exit(failures ? 1 : 0);
});
