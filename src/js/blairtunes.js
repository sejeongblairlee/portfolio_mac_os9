/**
 * Blair-tunes 플레이어.
 * Figma frames: 6:748(desktop) / 115:2964(mobile) / 107:2745(minimized)
 *
 * 빌드 없는 정적 사이트용 브라우저 스크립트.
 * 데이터 규칙은 src/lib/*.ts 파이프라인과 동일 (변경 시 동기화):
 *  - is_published=true, sort_order asc → created_at asc
 *  - youtube_video_id / thumbnail 파생
 *  - 테마: DB color_source='manual'이면 DB 값 그대로,
 *    아니면 /api/theme-color(썸네일 도미넌트, WCAG AA 보정)로 파생.
 *    파생 실패 시 DB 값 유지 — 잘못된 색을 캐시하지 않는다.
 *
 * 재생: YouTube IFrame API. videoId가 바뀔 때만 iframe을 파괴/재생성하고,
 * 색/큐레이션 갱신은 iframe을 건드리지 않는다.
 * 자동재생 차단 시: 뮤트로 재생 시작 → 첫 사용자 인터랙션에서 볼륨 복원.
 */
(function () {
'use strict';

const SUPABASE_URL = 'https://nmivopvhiwzaifpzlskf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5taXZvcHZoaXd6YWlmcHpsc2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjIxMjEsImV4cCI6MjA5ODczODEyMX0.vPaEwNSHlD-Zscr2FXtP1d5qgWTGyPymLUrKYbyDazY';

const ICONS = 'src/images/tunes';
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const FALLBACK_THEME = '#2A2118';   // 최종 폴백으로만 사용
const IS_DEV = window.location.protocol === 'file:' ||
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

// ═══ 데이터 (src/lib 파이프라인의 브라우저 포트) ═══════════════════════════

function extractYouTubeVideoId(url) {
  if (!url) return null;
  let u;
  try { u = new URL(url.trim()); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  let c = null;
  if (host === 'youtu.be') {
    c = u.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const seg = u.pathname.split('/').filter(Boolean);
    if (seg[0] === 'watch' || u.pathname === '/watch') c = u.searchParams.get('v');
    else if (['embed', 'shorts', 'live', 'v'].includes(seg[0])) c = seg[1] ?? null;
  }
  return c && VIDEO_ID_RE.test(c) ? c : null;
}

function enrichTrack(t) {
  const videoId = t.youtube_video_id || extractYouTubeVideoId(t.youtube_url);
  return {
    ...t,
    youtube_video_id: videoId,
    thumbnail_url: t.thumbnail_url || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null),
    thumbnail_fallback_url: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : (t.thumbnail_url ?? null),
    theme_color: t.theme_color || FALLBACK_THEME,
    text_color: t.text_color || '#FFFFFF',
  };
}

async function fetchTracks() {
  try {
    const qs = 'select=*&is_published=eq.true&order=sort_order.asc,created_at.asc';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tracks?${qs}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) return { tracks: [], error: `HTTP ${res.status}` };
    const rows = await res.json();
    return { tracks: rows.map(enrichTrack), error: null };
  } catch (e) {
    return { tracks: [], error: e instanceof Error ? e.message : 'fetch failed' };
  }
}

// ═══ 컬러 유틸 (액센트 파생용 최소 구현) ═══════════════════════════════════

function hexToHsl(hex) {
  const m = hex.trim().replace(/^#/, '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

/** 슬라이더 액티브용 액센트 — 테마 hue 유지, 배경보다 밝게 (배경색 그대로면 안 보임) */
function accentFrom(themeHex) {
  const hsl = hexToHsl(themeHex);
  if (!hsl) return '#0037FF';
  const l = Math.min(0.86, hsl.l + 0.32);
  const s = Math.min(1, hsl.s * 1.1 + 0.08);
  return `hsl(${Math.round(hsl.h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

// ═══ 공유 상태 — 메인/미니/플레이리스트가 함께 읽음 ════════════════════════

let tracks = [];
const state = {
  selectedTrackId: null,
  isPlaying: false,
};

function currentIndexOf() {
  const i = tracks.findIndex((t) => t.id === state.selectedTrackId);
  return i === -1 ? 0 : i;
}

// ═══ 테마 적용 (CSS 변수 — iframe 미접촉) ══════════════════════════════════

function applyTheme(track) {
  const theme = track.theme_color || FALLBACK_THEME;
  const text = track.text_color || '#FFFFFF';
  const accent = accentFrom(theme);
  ['bt-win', 'bt-mini'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.setProperty('--bt-theme', theme);
    el.style.setProperty('--bt-text', text);
    el.style.setProperty('--bt-accent', accent);
  });
}

/**
 * 선택 시 테마 최신화: manual이 아니면 /api/theme-color에서 다시 파생.
 * 성공(thumbnail)일 때만 교체, 실패하면 DB 값 유지 — 잘못된 색 캐시 금지.
 */
async function refreshThemeFor(track) {
  if (track.color_source === 'manual' || !track.youtube_video_id) return;
  try {
    const res = await fetch(`/api/theme-color?videoId=${encodeURIComponent(track.youtube_video_id)}`);
    if (!res.ok) return;
    const body = await res.json();
    if (body.color_source === 'thumbnail' && typeof body.theme_color === 'string') {
      track.theme_color = body.theme_color;
      track.text_color = body.text_color ?? track.text_color;
      track.color_source = 'thumbnail';
    }
  } catch { /* API 불가(file:// 등) → DB 값 유지 */ }
  if (state.selectedTrackId === track.id) applyTheme(track);
}

// ═══ YouTube IFrame API ════════════════════════════════════════════════════

let ytPlayer = null;
let currentVideoId = null;
let ytApiPromise = null;
let building = false;
let queuedBuild = null;
let wasAutoMuted = false;
let volumeBeforeMute = null;

function loadYouTubeAPI() {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) { resolve(window.YT); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return ytApiPromise;
}

/** Error 153 대응: origin/referrerPolicy를 로드 전에 설정. /embed/{id}만 사용. */
function buildYouTubeIframe(videoId, autoplay) {
  const params = new URLSearchParams();
  params.set('enablejsapi', '1');
  if (/^https?:$/.test(window.location.protocol)) {
    params.set('origin', window.location.origin);
  }
  params.set('rel', '0');
  params.set('modestbranding', '1');
  params.set('playsinline', '1');
  params.set('controls', '0');
  if (autoplay) params.set('autoplay', '1');

  const iframe = document.createElement('iframe');
  iframe.id = 'bt-yt';
  iframe.src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  if (IS_DEV) console.log('[blair-tunes] iframe src:', iframe.src);
  return iframe;
}

/** 자동재생 차단 감지: 재생 시도 후에도 멈춰 있으면 뮤트로 시작 */
function playWithAutoplayFallback(p) {
  try { p.playVideo(); } catch { return; }
  setTimeout(() => {
    try {
      const YTPS = window.YT.PlayerState;
      const st = p.getPlayerState();
      if (st !== YTPS.PLAYING && st !== YTPS.BUFFERING) {
        volumeBeforeMute = p.getVolume();
        p.mute();
        wasAutoMuted = true;
        p.playVideo();
      }
    } catch { /* noop */ }
  }, 900);
}

// 첫 사용자 인터랙션 → 자동 뮤트 해제 + 볼륨 복원
document.addEventListener('pointerdown', () => {
  if (!wasAutoMuted || !ytPlayer) return;
  try {
    ytPlayer.unMute();
    if (volumeBeforeMute != null) ytPlayer.setVolume(volumeBeforeMute);
  } catch { /* noop */ }
  wasAutoMuted = false;
}, { capture: true });

/**
 * videoId가 바뀔 때만 호출: 이전 플레이어 정지·파괴 → 새 iframe → (옵션) 자동재생.
 * 빠른 연속 클릭은 마지막 요청만 반영.
 */
async function rebuildPlayer(videoId, autoplay) {
  if (building) { queuedBuild = { videoId, autoplay }; return; }
  building = true;
  try {
    const YT = await loadYouTubeAPI();
    if (ytPlayer) {
      try { ytPlayer.stopVideo(); } catch { /* noop */ }
      try { ytPlayer.destroy(); } catch { /* noop */ }
      ytPlayer = null;
    }
    document.querySelectorAll('#bt-yt').forEach((el) => el.remove());

    const videoBox = document.querySelector('#bt-win .bt-video');
    const iframe = buildYouTubeIframe(videoId, autoplay);
    videoBox.insertBefore(iframe, document.getElementById('bt-fallback'));
    currentVideoId = videoId;

    ytPlayer = await new Promise((resolve) => {
      const p = new YT.Player(iframe, {
        events: {
          onReady: () => resolve(p),
          onStateChange: (e) => {
            const YTPS = window.YT.PlayerState;
            if (e.data === YTPS.PLAYING) { setPlaying(true); hideEmbedFallback(); }
            else if (e.data === YTPS.PAUSED || e.data === YTPS.ENDED) setPlaying(false);
          },
          onError: () => {
            setPlaying(false);
            showEmbedFallback();
          },
        },
      });
    });
    if (autoplay) playWithAutoplayFallback(ytPlayer);
  } finally {
    building = false;
  }
  if (queuedBuild) {
    const q = queuedBuild;
    queuedBuild = null;
    if (q.videoId !== currentVideoId) rebuildPlayer(q.videoId, q.autoplay);
  }
}

// ═══ 임베드 불가 폴백 ══════════════════════════════════════════════════════

function showEmbedFallback() {
  const t = tracks[currentIndexOf()];
  const box = document.getElementById('bt-fallback');
  const link = document.getElementById('bt-fallback-link');
  if (!box || !link || !t) return;
  link.href = t.youtube_url;
  box.hidden = false;
}

function hideEmbedFallback() {
  const box = document.getElementById('bt-fallback');
  if (box) box.hidden = true;
}

// ═══ 재생 상태 표시 (메인·미니 동기화) ═════════════════════════════════════

const PAUSE_SVG =
  '<svg width="24" height="24" viewBox="0 0 24 24" shape-rendering="crispEdges">' +
  '<rect x="6" y="5" width="4" height="14" fill="#111"/>' +
  '<rect x="14" y="5" width="4" height="14" fill="#111"/></svg>';
const PLAY_IMG = `<img src="${ICONS}/icon-play.svg" alt="">`;

function setPlaying(playing) {
  state.isPlaying = playing;
  document.querySelectorAll('.bt-play').forEach((btn) => {
    btn.innerHTML = playing ? PAUSE_SVG : PLAY_IMG;
    btn.setAttribute('aria-label', playing ? 'pause' : 'play');
  });
}

// ═══ 컨트롤 ════════════════════════════════════════════════════════════════

async function togglePlay() {
  if (!ytPlayer) {
    const t = tracks[currentIndexOf()];
    if (t?.youtube_video_id) await rebuildPlayer(t.youtube_video_id, true);
    return;
  }
  if (state.isPlaying) ytPlayer.pauseVideo();
  else playWithAutoplayFallback(ytPlayer);
}

/** 트랙 선택 → 자동재생. 같은 videoId면 iframe 재생성 없음 (§6). */
function selectTrack(id, { autoplay = true } = {}) {
  const track = tracks.find((t) => t.id === id);
  if (!track) return;
  state.selectedTrackId = id;
  hideEmbedFallback();
  renderCurrent();            // 텍스트/썸네일/테마(DB 값) 즉시 반영 — 깜빡임 없음
  refreshThemeFor(track);     // 썸네일 파생 색 최신화 (iframe 미접촉)

  if (!track.youtube_video_id) return;
  if (!ytPlayer && document.getElementById('bt-win').hidden) return;  // 창 열기 전엔 재생 안 함

  if (track.youtube_video_id !== currentVideoId) {
    rebuildPlayer(track.youtube_video_id, autoplay);
  } else if (autoplay && !state.isPlaying && ytPlayer) {
    playWithAutoplayFallback(ytPlayer);
  }
}

function stepTrack(delta) {
  if (!tracks.length) return;
  const next = (currentIndexOf() + delta + tracks.length) % tracks.length;  // 순환
  selectTrack(tracks[next].id);
}

// ═══ 렌더링 ════════════════════════════════════════════════════════════════

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function formatPerformanceLabel(track) {
  const loc = (track.performance_location ?? '').trim();
  const year = track.performance_year;
  if (!loc && !year) return '';
  if (!loc) return `Live Video, ${year}`;
  const base = /^live\s+video/i.test(loc) ? loc : `Live Video from ${loc}`;
  return year ? `${base}, ${year}` : base;
}

function controlsHTML() {
  return `
    <div class="bt-controls">
      <div class="bt-controls-inner">
        <div class="bt-btns">
          <button class="bt-btn bt-prev" aria-label="previous"><img src="${ICONS}/icon-playback.svg" alt=""></button>
          <button class="bt-btn bt-play" aria-label="play"><img src="${ICONS}/icon-play.svg" alt=""></button>
          <button class="bt-btn bt-next" aria-label="next"><img src="${ICONS}/icon-playforward.svg" alt=""></button>
        </div>
        <div class="bt-volume">
          <div class="bt-vol-track">
            <div class="bt-vol-fill"></div>
            <div class="bt-vol-rest"></div>
            <div class="bt-vol-handle"></div>
          </div>
          <div class="bt-vol-labels">
            ${['mute', 'low', 'medium', 'high', 'party!'].map((l) =>
              `<div class="bt-vol-step"><i></i><span>${l}</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

function windowHTML() {
  return `
  <div class="bt-win" id="bt-win" hidden>
    <div class="bt-header">
      <button class="bt-hbtn" id="bt-minimize" aria-label="minimize"><img src="${ICONS}/icon-minimize.svg" alt=""></button>
      <span class="bt-title">Blair-tunes</span>
      <button class="bt-hbtn" id="bt-close" aria-label="close"><img src="${ICONS}/icon-close.svg" alt=""></button>
    </div>
    <div class="bt-body">
      <div class="bt-col-list">
        <div class="bt-list" id="bt-list"></div>
        <div class="bt-slider"><div class="bt-slider-handle"></div></div>
      </div>
      <div class="bt-col-center">
        <div class="bt-video">
          <img class="bt-thumb" id="bt-thumb" src="" alt="">
          <div id="bt-yt"></div>
          <div class="bt-embed-fallback" id="bt-fallback" hidden>
            <p>This video can&rsquo;t be played here.</p>
            <a id="bt-fallback-link" href="#" target="_blank" rel="noopener">Watch on YouTube</a>
          </div>
        </div>
        ${controlsHTML()}
      </div>
      <div class="bt-col-cur">
        <div class="bt-cur-inner">
          <div class="bt-cur-tit">
            <div class="bt-cur-titline">
              <p class="bt-t1" id="bt-cur-title"></p>
              <p class="bt-t2" id="bt-cur-artist"></p>
            </div>
            <p class="bt-live" id="bt-cur-live"></p>
          </div>
          <div class="bt-cur-des" id="bt-cur-des"></div>
        </div>
        <div class="bt-slider"><div class="bt-slider-handle"></div></div>
      </div>
    </div>
  </div>

  <div class="bt-mini" id="bt-mini" hidden>
    <div class="bt-header">
      <button class="bt-hbtn" aria-label="maximize"><img src="${ICONS}/icon-maximize.svg" alt=""></button>
      <span class="bt-title">Blair-tunes</span>
      <button class="bt-hbtn" id="bt-mini-close" aria-label="close"><img src="${ICONS}/icon-close.svg" alt=""></button>
    </div>
    <div class="bt-mini-body">
      <div class="bt-video">
        <img class="bt-thumb" id="bt-mini-thumb" src="" alt="">
        <div class="bt-mini-overlay">
          <button class="bt-btn side bt-prev" aria-label="previous"><img src="${ICONS}/icon-playback.svg" alt=""></button>
          <button class="bt-btn bt-play" aria-label="play"><img src="${ICONS}/icon-play.svg" alt=""></button>
          <button class="bt-btn side bt-next" aria-label="next"><img src="${ICONS}/icon-playforward.svg" alt=""></button>
        </div>
      </div>
      <div class="bt-row playing">
        <div class="bt-row-txt">
          <p id="bt-mini-title"></p>
          <p id="bt-mini-artist"></p>
        </div>
        <img class="bt-np" src="${ICONS}/icon-nowplaying.svg" alt="" style="display:block">
        <span class="bt-dur" id="bt-mini-dur"></span>
      </div>
    </div>
  </div>`;
}

function setThumb(img, track) {
  img.src = track.thumbnail_url ?? '';
  img.onerror = () => {
    if (track.thumbnail_fallback_url && img.src !== track.thumbnail_fallback_url) {
      img.src = track.thumbnail_fallback_url;
    }
  };
}

function renderCurrent() {
  const currentIndex = currentIndexOf();
  const t = tracks[currentIndex];
  if (!t) return;

  applyTheme(t);

  setThumb(document.getElementById('bt-thumb'), t);
  setThumb(document.getElementById('bt-mini-thumb'), t);

  document.getElementById('bt-cur-title').textContent = t.title;
  document.getElementById('bt-cur-artist').textContent = `/${t.artist}`;
  const live = document.getElementById('bt-cur-live');
  const label = formatPerformanceLabel(t);
  live.textContent = label;
  live.style.display = label ? '' : 'none';

  const des = document.getElementById('bt-cur-des');
  des.innerHTML = (t.curation ?? '')
    .split(/\n+/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`).join('');

  document.getElementById('bt-mini-title').textContent = t.title;
  document.getElementById('bt-mini-artist').textContent = t.artist;
  document.getElementById('bt-mini-dur').textContent = t.duration_label ?? 'mm:hh';

  document.querySelectorAll('#bt-list .bt-row').forEach((row) => {
    row.classList.toggle('playing', row.dataset.id === t.id);
  });
}

function renderList() {
  const list = document.getElementById('bt-list');
  const current = tracks[currentIndexOf()];
  list.innerHTML = tracks.map((t) => `
    <button class="bt-row${t.id === current?.id ? ' playing' : ''}" data-id="${esc(t.id)}">
      <div class="bt-row-txt">
        <p>${esc(t.title)}</p>
        <p>${esc(t.artist)}</p>
      </div>
      <img class="bt-np" src="${ICONS}/icon-nowplaying.svg" alt="">
      <span class="bt-dur">${esc(t.duration_label ?? 'mm:hh')}</span>
    </button>`).join('');
  list.querySelectorAll('.bt-row').forEach((row) => {
    row.addEventListener('click', () => selectTrack(row.dataset.id));
  });
}

// ═══ 초기화 ════════════════════════════════════════════════════════════════

async function initBlairTunes() {
  const mount = document.createElement('div');
  mount.innerHTML = windowHTML();
  document.body.append(...mount.children);

  document.getElementById('bt-close').addEventListener('click', () => {
    document.getElementById('bt-win').hidden = true;
    if (ytPlayer) { try { ytPlayer.pauseVideo(); } catch { /* noop */ } }
  });
  document.getElementById('bt-mini-close').addEventListener('click', () => {
    document.getElementById('bt-mini').hidden = true;
  });
  // 미니마이즈 전환 인터랙션은 아직 미구현 (버튼 비주얼만)

  const { tracks: fetched, error } = await fetchTracks();
  if (error || !fetched.length) {
    console.warn('[blair-tunes] tracks fetch:', error ?? 'empty');
    return;
  }
  tracks = fetched;
  state.selectedTrackId = tracks[0].id;   // 첫 published 트랙 기본 선택
  renderList();
  renderCurrent();
  refreshThemeFor(tracks[0]);             // 열기 전에 미리 테마 파생

  document.querySelectorAll('.bt-play').forEach((b) => b.addEventListener('click', togglePlay));
  document.querySelectorAll('.bt-prev').forEach((b) => b.addEventListener('click', () => stepTrack(-1)));
  document.querySelectorAll('.bt-next').forEach((b) => b.addEventListener('click', () => stepTrack(1)));

  // "Enjoy Music!" → 플레이어 열기 + 현재 트랙 자동재생 (클릭 제스처 활용)
  const icon = document.getElementById('icon-tunes');
  if (icon) {
    icon.addEventListener('click', () => {
      const win = document.getElementById('bt-win');
      const wasHidden = win.hidden;
      win.hidden = false;
      const t = tracks[currentIndexOf()];
      if (wasHidden && t?.youtube_video_id && t.youtube_video_id !== currentVideoId) {
        rebuildPlayer(t.youtube_video_id, true).catch((e) => console.warn('[blair-tunes] YT init:', e));
      }
    });
  }
}

initBlairTunes();

// 테스트/디버그 훅
window.__blairTunes = {
  state,
  showEmbedFallback,
  hideEmbedFallback,
  selectTrack: (id) => selectTrack(id),
  getIframeSrc: () => document.querySelector('.bt-video iframe')?.src ?? null,
  getTheme: () => {
    const el = document.getElementById('bt-win');
    return {
      theme: el?.style.getPropertyValue('--bt-theme'),
      text: el?.style.getPropertyValue('--bt-text'),
      accent: el?.style.getPropertyValue('--bt-accent'),
    };
  },
};

})();
