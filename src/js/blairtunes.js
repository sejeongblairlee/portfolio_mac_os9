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
 * 재생: YouTube IFrame API — 플레이어 인스턴스는 항상 1개(#bt-win 안).
 * 트랙 전환은 loadVideoById (iframe 재생성 없음 → 볼륨/뮤트 유지),
 * 색/큐레이션 갱신은 iframe을 건드리지 않는다.
 * iframe은 화면 고정 도크(#bt-yt-dock)에 살고 DOM에서 절대 이동하지 않는다
 * (재부착 = 리로드 = 재생 끊김). 도크는 rAF로 활성 창(메인/미니)의
 * .bt-video 위에 위치 동기화 — 미니마이즈 중에도 영상이 보인다.
 * 영상 종료 시 다음 트랙 자동재생(순환).
 * 자동재생 차단 시: 뮤트로 재생 시작 → 첫 사용자 인터랙션에서 볼륨 복원.
 * Figma에 진행바 UI가 없어 시킹은 seekTo() 로직만 제공, 시각화는 duration 라벨.
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
// YouTube 플레이어 인스턴스는 항상 1개 (#bt-win 안). 미니는 같은 상태를 읽는
// 뷰일 뿐 별도 플레이어를 만들지 않는다.

let tracks = [];
// initBlairTunes()에서 실제 구현이 대입됨 — selectTrack()처럼 더 앞에서(모듈
// 최상위 스코프에) 정의된 함수도 트랙이 바뀔 때마다 좌/우 컬럼을 다시
// 동기화할 수 있게 모듈 스코프 변수로 선언(초기값은 no-op, 클로저 안에
// 갇힌 함수 선언이 아니라 이 변수에 재대입하는 방식이라 스코프 문제 없음).
let syncSideColumnHeights = () => {};
const state = {
  selectedTrackId: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 50,        // Figma 기본 = medium(50%) 위치
  isMuted: false,
  isMinimized: false,
  playerReady: false,
  embedError: false,
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
        p.mute();
        wasAutoMuted = true;
        p.playVideo();
      }
    } catch { /* noop */ }
  }, 900);
}

// 첫 사용자 인터랙션 → 자동 뮤트 해제 + 볼륨 복원 (사용자가 뮤트한 상태면 유지)
document.addEventListener('pointerdown', () => {
  if (!wasAutoMuted || !ytPlayer) return;
  wasAutoMuted = false;
  if (state.isMuted) return;
  try {
    ytPlayer.unMute();
    ytPlayer.setVolume(state.volume);
  } catch { /* noop */ }
}, { capture: true });

/** 공유 상태의 볼륨/뮤트를 활성 플레이어에 반영 */
function applyVolumeToPlayer() {
  if (!ytPlayer || !state.playerReady) return;
  try {
    ytPlayer.setVolume(state.volume);
    if (state.isMuted) ytPlayer.mute();
    else if (!wasAutoMuted) ytPlayer.unMute();
  } catch { /* noop */ }
}

// ── 비디오 도크: 단일 iframe이 사는 position:fixed 레이어 ──────────────────
// 메인/미니 어느 창이 보이든 그 창의 .bt-video 사각형 위에 rAF로 얹힌다.
// iframe을 창 사이로 reparent하면 리로드되어 재생이 끊기므로 이 방식이 필수.

let dock = null;

function ensureDock() {
  if (dock) return dock;
  dock = document.createElement('div');
  dock.id = 'bt-yt-dock';
  dock.style.visibility = 'hidden';
  document.body.appendChild(dock);
  requestAnimationFrame(syncDock);
  return dock;
}

/**
 * 창 드래그/리사이즈 중엔 도크(크로스 오리진 YT iframe)의 pointer-events를 꺼야 한다.
 * setPointerCapture는 렌더러(Blink) 내부 재타겟팅이라 iframe이 out-of-process일 때
 * 컴포지터가 입력을 그 프로세스로 먼저 라우팅해버려 무력화될 수 있음 — 실측으로 확인
 * (헤더 드래그 중 커서가 비디오 위를 지나가면 pointermove가 아예 도달하지 않음).
 */
function setDockInteractive(enabled) {
  if (dock) dock.style.pointerEvents = enabled ? '' : 'none';
}

/** 미니 오버레이(스크림+컨트롤)는 도크보다 위에 있어야 클릭 가능 — 도크 안팎 이동 */
function placeMiniOverlay(inDock) {
  const overlay = document.querySelector('.bt-mini-overlay');
  if (!overlay) return;
  const target = inDock ? dock : document.querySelector('#bt-mini .bt-video');
  if (target && overlay.parentElement !== target) target.appendChild(overlay);
}

function syncDock() {
  requestAnimationFrame(syncDock);   // 드래그/리사이즈/전환을 페인트 전에 반영
  const host = document.getElementById(state.isMinimized ? 'bt-mini' : 'bt-win');
  const show = !!ytPlayer && !!host && !host.hidden && !state.embedError;
  dock.style.visibility = show ? 'visible' : 'hidden';   // display 전환 없음 — 재생 유지
  placeMiniOverlay(show && state.isMinimized);
  if (!show) return;
  // 호스트 창이 desktop.html의 공용 topZ 포커스 스택(window.__bringToFront)에
  // 참여하면서 z-index가 매번 동적으로 바뀌므로, 도크도 매 프레임 그 실측값을
  // 따라가야 한다 — 그러지 않으면(예: 예전처럼 511 고정) 창이 다른 팝업 뒤로
  // 밀려도 iframe만 하드코딩된 z-index 때문에 계속 위에 떠서 "창과 분리된
  // 영상"처럼 보이는 문제가 생긴다. +1만 더해서 자기 창 바로 위에만 둔다 —
  // desktop.html의 topZ 카운터가 포커스마다 10씩 증가하도록 맞춰져 있어서
  // (nextZ()) +1~+9 구간은 다음 포커스 값과 절대 겹치지 않는 안전한 여유다.
  // (예전에 +1000처럼 큰 오프셋을 썼다가, 플레이어가 뒤로 밀려도 영상만 다른
  // 창 위에 계속 떠 있는 반대 방향 버그가 나서 이 방식으로 정정함.)
  const hostZ = parseInt(getComputedStyle(host).zIndex, 10) || 0;
  dock.style.zIndex = hostZ + 1;
  const r = host.querySelector('.bt-video').getBoundingClientRect();
  dock.style.left = (r.left + 1) + 'px';    // +1/-2 = .bt-video 보더 안쪽
  dock.style.top = (r.top + 1) + 'px';
  dock.style.width = (r.width - 2) + 'px';
  dock.style.height = (r.height - 2) + 'px';
}

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
      state.playerReady = false;
      stopProgressTicker();
      try { ytPlayer.stopVideo(); } catch { /* noop */ }
      try { ytPlayer.destroy(); } catch { /* noop */ }
      ytPlayer = null;
    }
    document.querySelectorAll('#bt-yt').forEach((el) => el.remove());

    const iframe = buildYouTubeIframe(videoId, autoplay);
    const d = ensureDock();
    d.insertBefore(iframe, d.firstChild);   // 오버레이가 도크에 있으면 그 아래로
    currentVideoId = videoId;
    state.currentTime = 0;
    state.duration = 0;

    ytPlayer = await new Promise((resolve) => {
      const p = new YT.Player(iframe, {
        events: {
          onReady: () => {
            state.playerReady = true;
            try { p.setVolume(state.volume); if (state.isMuted) p.mute(); } catch { /* noop */ }
            resolve(p);
          },
          onStateChange: (e) => {
            const YTPS = window.YT.PlayerState;
            if (e.data === YTPS.PLAYING) { setPlaying(true); hideEmbedFallback(); }
            else if (e.data === YTPS.PAUSED) setPlaying(false);
            else if (e.data === YTPS.ENDED) {
              // 자동 다음곡 — 마지막 트랙이면 첫 트랙으로 순환 (§5)
              setPlaying(false);
              stepTrack(1);
            }
          },
          onError: () => {
            setPlaying(false);
            showEmbedFallback();
          },
        },
      });
    });
    startProgressTicker();
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

// ═══ 진행 상태 — Figma UI에 진행바 요소가 없어 시각화는 duration 라벨만.
// 시킹은 seekTo(초)로 제공 (진행바가 디자인에 추가되면 여기 연결).

let progressTimer = null;

function formatTime(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function renderProgress() {
  if (!(state.duration > 0)) return;
  const label = formatTime(state.duration);
  const mini = document.getElementById('bt-mini-dur');
  if (mini && mini.textContent !== label) mini.textContent = label;
  const row = document.querySelector(`#bt-list .bt-row[data-id="${CSS.escape(state.selectedTrackId ?? '')}"] .bt-dur`);
  if (row && row.textContent !== label) row.textContent = label;
}

function startProgressTicker() {
  if (progressTimer) return;
  progressTimer = setInterval(() => {
    if (!ytPlayer || !state.playerReady) return;
    try {
      state.currentTime = ytPlayer.getCurrentTime() || 0;
      state.duration = ytPlayer.getDuration() || 0;
    } catch { return; }
    renderProgress();
  }, 250);
}

function stopProgressTicker() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
}

/** 재생/일시정지와 무관하게 동작. 끝 직전으로 클램프해 의도치 않은 ENDED 방지. */
function seekTo(sec) {
  if (!ytPlayer || !state.playerReady) return;
  const d = state.duration;
  const t = Math.max(0, d > 0 ? Math.min(sec, d - 0.3) : sec);
  try {
    ytPlayer.seekTo(t, true);
    state.currentTime = t;
  } catch { /* noop */ }
}

// ═══ 볼륨 슬라이더 — Figma 72:174 (fill/rest flex 비율 + 16px 핸들) ═══════════
// 라벨(mute~party!)은 시각 눈금일 뿐, 값은 0–100 연속.

function setVolume(v) {
  const vol = Math.round(Math.max(0, Math.min(100, v)));
  state.volume = vol;
  state.isMuted = vol === 0;          // 0 = 뮤트, 올리면 자동 언뮤트
  if (vol > 0) wasAutoMuted = false;  // 사용자 볼륨 조작 = 자동뮤트 복원 불필요
  applyVolumeToPlayer();
  renderVolume();
}

function renderVolume() {
  const win = document.getElementById('bt-win');
  const fill = win.querySelector('.bt-vol-fill');
  const rest = win.querySelector('.bt-vol-rest');
  const handle = win.querySelector('.bt-vol-handle');
  if (!fill) return;
  const ratio = state.volume / 100;
  fill.style.flexGrow = ratio;
  rest.style.flexGrow = 1 - ratio;
  // 기본값(50) = Figma 정적 좌표 112px (트랙 240px 기준)와 동일
  handle.style.left = `calc(17px + ${ratio} * (100% - 50px))`;
}

function initVolumeSlider() {
  const track = document.querySelector('#bt-win .bt-vol-track');
  if (!track) return;
  let dragging = false, pid = null;
  const volFromEvent = (e) => {
    const r = track.getBoundingClientRect();
    const inner = r.width - 40;                    // 좌우 패딩 20px
    if (inner <= 0) return state.volume;
    return ((e.clientX - r.left - 20) / inner) * 100;
  };
  track.addEventListener('pointerdown', (e) => {
    dragging = true;
    pid = e.pointerId;
    track.setPointerCapture(pid);
    setVolume(volFromEvent(e));
    e.preventDefault();
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pid) return;
    setVolume(volFromEvent(e));
  });
  const end = (e) => { if (e.pointerId === pid) dragging = false; };
  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', end);
}

// ═══ 임베드 불가 폴백 ══════════════════════════════════════════════════════

function showEmbedFallback() {
  const t = tracks[currentIndexOf()];
  const box = document.getElementById('bt-fallback');
  const link = document.getElementById('bt-fallback-link');
  if (!box || !link || !t) return;
  link.href = t.youtube_url;
  box.hidden = false;
  state.embedError = true;
}

function hideEmbedFallback() {
  const box = document.getElementById('bt-fallback');
  if (box) box.hidden = true;
  state.embedError = false;
}

// ═══ 재생 상태 표시 (메인·미니 동기화) ═════════════════════════════════════

// Figma "Spotify UI Kit" 일시정지 아이콘(node 0:1747) 그대로 — icon-play.svg와
// 동일한 <img> 패턴으로 통일. 예전엔 인라인 <svg>를 innerHTML로 직접 꽂았는데,
// .bt-btn img 규칙(24×24 절대 중앙 정렬)이 <img> 태그에만 걸리는 규칙이라
// 재생 버튼(아이콘)과 높이/정렬이 안 맞았음(사용자 지적) — <img> 태그로
// 바꿔서 같은 CSS 규칙을 그대로 타게 함.
const PLAY_IMG = `<img src="${ICONS}/icon-play.svg" alt="">`;
const PAUSE_IMG = `<img src="${ICONS}/icon-pause.svg" alt="">`;

function setPlaying(playing) {
  state.isPlaying = playing;
  document.querySelectorAll('.bt-play').forEach((btn) => {
    btn.innerHTML = playing ? PAUSE_IMG : PLAY_IMG;
    btn.setAttribute('aria-label', playing ? 'pause' : 'play');
  });
  // 이퀄라이저 동기화: 재생 중일 때만 애니메이션 (CSS animation-play-state)
  ['bt-win', 'bt-mini'].forEach((id) =>
    document.getElementById(id)?.classList.toggle('bt-playing', playing));
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

/**
 * 트랙 선택 → 자동재생. 진행 상태/임베드 에러는 리셋, 볼륨·뮤트·미니 상태는 유지 (§6).
 * 플레이어가 살아 있으면 loadVideoById로 videoId만 교체 — iframe 재생성 없음.
 */
function selectTrack(id, { autoplay = true } = {}) {
  const track = tracks.find((t) => t.id === id);
  if (!track) return;
  state.selectedTrackId = id;
  hideEmbedFallback();
  renderCurrent();            // 텍스트/썸네일/테마(DB 값) 즉시 반영 — 깜빡임 없음
  refreshThemeFor(track);     // 썸네일 파생 색 최신화 (iframe 미접촉)
  // 트랙마다 제목/아티스트/설명 길이가 달라 우측 패널의 스크롤 필요 여부가
  // 바뀔 수 있음 — 높이 자체(중앙 영상 기준)는 안 바뀌지만 스크롤바 표시는
  // 다시 계산해야 함.
  syncSideColumnHeights();

  if (!track.youtube_video_id) return;
  const opened = !document.getElementById('bt-win').hidden || state.isMinimized;
  if (!ytPlayer && !opened) return;   // 창 열기 전엔 재생 안 함

  if (track.youtube_video_id !== currentVideoId) {
    state.currentTime = 0;
    state.duration = 0;
    if (ytPlayer && state.playerReady) {
      currentVideoId = track.youtube_video_id;
      try {
        if (autoplay) ytPlayer.loadVideoById(track.youtube_video_id);
        else ytPlayer.cueVideoById(track.youtube_video_id);
      } catch {
        rebuildPlayer(track.youtube_video_id, autoplay);
      }
    } else {
      rebuildPlayer(track.youtube_video_id, autoplay);
    }
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

/** 자막 = "{performance_location}, {performance_year}" — 둘 다 있으면 콤마로 연결,
    하나만 있으면 그것만, 둘 다 없으면 빈 문자열. performance_year는 DB에 별도
    컬럼으로 들어와 있는데 화면에 전혀 노출이 안 되고 있었던 걸 수정(2026-08-02). */
function subtitleOf(track) {
  const location = (track.performance_location ?? '').trim();
  const year = track.performance_year ? String(track.performance_year).trim() : '';
  if (location && year) return `${location}, ${year}`;
  return location || year;
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
      <button class="bt-hbtn" id="bt-close" aria-label="close"><img src="${ICONS}/icon-close.svg" alt=""></button>
      <span class="bt-header-pinstripe" aria-hidden="true"></span>
      <span class="bt-title">Blair-tunes</span>
      <span class="bt-header-pinstripe" aria-hidden="true"></span>
      <button class="bt-hbtn" id="bt-minimize" aria-label="minimize"><img src="${ICONS}/icon-minimize.svg" alt=""></button>
    </div>
    <div class="bt-body">
      <div class="bt-col-list">
        <div class="bt-list" id="bt-list"></div>
        <div class="pixel-scrollbar" id="bt-list-scrollbar"><div class="pixel-scrollbar-handle" id="bt-list-scrollbar-handle" hidden></div></div>
      </div>
      <div class="bt-col-center">
        <div class="bt-video">
          <img class="bt-thumb" id="bt-thumb" src="" alt="">
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
        <div class="pixel-scrollbar" id="bt-cur-scrollbar"><div class="pixel-scrollbar-handle" id="bt-cur-scrollbar-handle" hidden></div></div>
      </div>
    </div>
  </div>

  <div class="bt-mini" id="bt-mini" hidden>
    <div class="bt-header">
      <button class="bt-hbtn" id="bt-mini-close" aria-label="close"><img src="${ICONS}/icon-close.svg" alt=""></button>
      <span class="bt-header-pinstripe" aria-hidden="true"></span>
      <span class="bt-title">Blair-tunes</span>
      <span class="bt-header-pinstripe" aria-hidden="true"></span>
      <button class="bt-hbtn" id="bt-restore" aria-label="maximize"><img src="${ICONS}/icon-maximize.svg" alt=""></button>
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
        <span class="bt-np" aria-hidden="true"><i></i><i></i><i></i></span>
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
  const label = subtitleOf(t);
  live.textContent = label;
  live.style.display = label ? '' : 'none';

  const des = document.getElementById('bt-cur-des');
  des.innerHTML = (t.curation ?? '')
    .split(/\n+/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`).join('');

  document.getElementById('bt-mini-title').textContent = t.title;
  document.getElementById('bt-mini-artist').textContent = t.artist;
  document.getElementById('bt-mini-dur').textContent = t.duration_label || '';

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
      <span class="bt-np" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="bt-dur">${esc(t.duration_label || '')}</span>
    </button>`).join('');
  list.querySelectorAll('.bt-row').forEach((row) => {
    row.addEventListener('click', () => selectTrack(row.dataset.id));
  });
}

// ═══ 창 드래그 — CU-SeeMe와 동일 패턴 (타이틀바만, 포인터 캡처, 경계 클램프) ═

function makeDraggable(win) {
  const header = win.querySelector('.bt-header');
  let dragging = false, pid = null, sx = 0, sy = 0, ox = 0, oy = 0;

  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.bt-hbtn')) return;   // 닫기/미니마이즈 버튼은 드래그 시작 안 함
    const r = win.getBoundingClientRect();
    // 센터(transform)/우하단(right·bottom) 배치 → 픽셀 배치로 전환 (점프 없음)
    win.style.left = r.left + 'px';
    win.style.top = r.top + 'px';
    win.style.right = 'auto';
    win.style.bottom = 'auto';
    win.style.transform = 'none';
    dragging = true;
    pid = e.pointerId;
    header.setPointerCapture(pid);   // iframe 위를 지나도 이벤트 유지
    setDockInteractive(false);       // 크로스 오리진 도크가 이벤트를 삼키는 것 방지
    sx = e.clientX; sy = e.clientY;
    ox = r.left; oy = r.top;
    win.classList.add('dragging');
    e.preventDefault();
  });

  header.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pid) return;
    let nx = ox + (e.clientX - sx);
    let ny = oy + (e.clientY - sy);
    // 타이틀바는 항상 잡을 수 있게 클램프 (design.md)
    nx = Math.max(-win.offsetWidth + 60, Math.min(nx, window.innerWidth - 60));
    ny = Math.max(0, Math.min(ny, window.innerHeight - 24));
    win.style.left = nx + 'px';
    win.style.top = ny + 'px';
  });

  const endDrag = (e) => {
    if (!dragging || e.pointerId !== pid) return;
    dragging = false;
    win.classList.remove('dragging');
    setDockInteractive(true);
  };
  header.addEventListener('pointerup', endDrag);
  header.addEventListener('pointercancel', endDrag);
}

// ═══ 창 리사이즈 — 좌/우 엣지 + 하단 코너 핸들 (풀 플레이어만) ═══════════════
// 폭만 조절: 높이는 비디오 비율이 결정하므로 자동. 880px 미만이 되면
// @container 쿼리가 모바일(세로 스택) 레이아웃으로 전환. iframe은 도크가
// rAF로 따라가므로 리사이즈 중에도 재생성/왜곡 없음.

function makeResizable(win) {
  const MIN_W = 380;    // 모바일 스택 레이아웃 최소폭 (CSS min-width와 동일)
  const MAX_W = 1600;   // 리사이즈 상한 (CSS max-width와 동일)
  [['e', 'bt-rs-e'], ['w', 'bt-rs-w'], ['e', 'bt-rs-se'], ['w', 'bt-rs-sw']].forEach(([side, cls]) => {
    const h = document.createElement('div');
    h.className = `bt-rs ${cls}`;
    win.appendChild(h);
    let pid = null, sx = 0, w0 = 0, left0 = 0;

    h.addEventListener('pointerdown', (e) => {
      const r = win.getBoundingClientRect();
      // 드래그와 동일: 센터 transform → 픽셀 배치 전환 (점프 없음)
      win.style.left = r.left + 'px';
      win.style.top = r.top + 'px';
      win.style.right = 'auto';
      win.style.bottom = 'auto';
      win.style.transform = 'none';
      pid = e.pointerId;
      h.setPointerCapture(pid);
      setDockInteractive(false);   // 크로스 오리진 도크가 이벤트를 삼키는 것 방지
      win.classList.add('resizing');   // 타이거 활동 신호(tiger-run.js)가 읽는 마커
      sx = e.clientX; w0 = r.width; left0 = r.left;
      e.preventDefault();
      e.stopPropagation();   // 타이틀바 드래그와 상호 배타
    });

    h.addEventListener('pointermove', (e) => {
      if (pid === null || e.pointerId !== pid) return;
      const dx = e.clientX - sx;
      let w = side === 'e' ? w0 + dx : w0 - dx;
      const safeMaxW = side === 'e'
        ? window.innerWidth - left0 - 20          // 좌변 고정 → 우측 세이프 에어리어까지
        : left0 + w0 - 20;                        // 우변 고정 → 좌측 세이프 에어리어까지
      const maxW = Math.min(safeMaxW, MAX_W);
      w = Math.max(MIN_W, Math.min(w, maxW));
      win.style.width = w + 'px';
      if (side === 'w') win.style.left = (left0 + w0 - w) + 'px';   // 우변 앵커
      // ResizeObserver만 믿지 않고 여기서도 직접 호출 — 드래그 리사이즈 중
      // 옵저버 콜백이 매 프레임 안정적으로 안 오는 경우가 있어서(실측)
      // 좌/우 컬럼 높이가 중앙 컬럼을 못 따라가는 현상이 있었다.
      syncSideColumnHeights();
    });

    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      setDockInteractive(true);
      win.classList.remove('resizing');
    };
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
  });
}

// ═══ 초기화 ════════════════════════════════════════════════════════════════

async function initBlairTunes() {
  const mount = document.createElement('div');
  mount.innerHTML = windowHTML();
  document.body.append(...mount.children);

  makeDraggable(document.getElementById('bt-win'));
  makeDraggable(document.getElementById('bt-mini'));
  makeResizable(document.getElementById('bt-win'));   // 풀 플레이어만 — 미니는 리사이즈 불가
  initVolumeSlider();
  renderVolume();

  // desktop.html의 다른 팝업(About/Works/Film/CU-SeeMe)과 같은 "클릭한 창이
  // 맨 위로" z-index 스택에 참여 — .bt-win/.bt-mini는 원래 CSS에 z-index가
  // 하드코딩돼 있어서(500/510) 그 값이 topZ 카운터와 무관하게 고정이었고,
  // 그래서 재생 중 다른 폴더를 열어도 플레이어가 항상 위에 남는 문제가 있었음.
  // window.__bringToFront는 desktop.html이 노출한 공용 헬퍼(옵셔널 체이닝 —
  // 이 스크립트가 desktop.html 없이 단독으로 쓰일 일은 없지만 방어적으로 처리).
  ['bt-win', 'bt-mini'].forEach((id) => {
    document.getElementById(id).addEventListener('pointerdown', () => {
      window.__bringToFront?.(document.getElementById(id));
    });
  });

  // 미니마이즈/복원 — 창만 전환. 도크(syncDock)가 다음 프레임에 영상을 미니 위로 옮겨 얹는다.
  const setMinimized = (min) => {
    state.isMinimized = min;
    document.getElementById('bt-win').hidden = min;
    document.getElementById('bt-mini').hidden = !min;
    window.__tigerRun?.reportWindowAction();   // 타이거 활동 펄스 (옵셔널 — 없어도 무해)
  };
  document.getElementById('bt-minimize').addEventListener('click', () => {
    setMinimized(true);
  });
  document.getElementById('bt-restore').addEventListener('click', () => {
    setMinimized(false);
    window.__bringToFront?.(document.getElementById('bt-win'));
  });

  document.getElementById('bt-close').addEventListener('click', () => {
    document.getElementById('bt-win').hidden = true;
    state.isMinimized = false;
    if (ytPlayer) { try { ytPlayer.pauseVideo(); } catch { /* noop */ } }
  });
  document.getElementById('bt-mini-close').addEventListener('click', () => {
    document.getElementById('bt-mini').hidden = true;
    state.isMinimized = false;
    if (ytPlayer) { try { ytPlayer.pauseVideo(); } catch { /* noop */ } }
  });

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

  // 트랙리스트 왼쪽 픽셀 스크롤바 — 예전엔 항상 고정 86px 높이로 뜨는 순수
  // 장식이라 실제로 스크롤할 게 없어도(트랙 수가 적어 리스트가 뷰포트 안에
  // 다 들어갈 때) 핸들이 계속 보였음. desktop.html이 노출한 공용 헬퍼
  // (window.__syncPixelScrollbar, Works/Film과 완전히 동일한 로직)로 실제
  // #bt-list 스크롤 상태에 맞춰 높이/위치를 계산하고, 스크롤이 필요 없으면
  // 핸들 자체를 숨긴다.
  const btList = document.getElementById('bt-list');
  const btListTrack = document.getElementById('bt-list-scrollbar');
  const btListHandle = document.getElementById('bt-list-scrollbar-handle');
  const syncListScrollbar = () => {
    window.__syncPixelScrollbar?.(btListTrack, btListHandle, btList.clientHeight, btList.scrollHeight, btList.scrollTop);
  };
  btList.addEventListener('scroll', syncListScrollbar);
  window.addEventListener('resize', syncListScrollbar);
  syncListScrollbar();

  // 우측 큐레이션 패널도 같은 방식으로 실제 스크롤 상태에 동기화 — 예전엔
  // 창 높이가 콘텐츠에 맞춰 늘어나서 여기가 스크롤될 일이 없었지만, 이제
  // 창 높이를 중앙 영상 영역 기준으로 고정하므로(아래 syncSideColumnHeights)
  // 설명이 길면 실제로 넘칠 수 있다.
  const btCurInner = document.getElementById('bt-win').querySelector('.bt-cur-inner');
  const btCurTrack = document.getElementById('bt-cur-scrollbar');
  const btCurHandle = document.getElementById('bt-cur-scrollbar-handle');
  const syncCurScrollbar = () => {
    window.__syncPixelScrollbar?.(btCurTrack, btCurHandle, btCurInner.clientHeight, btCurInner.scrollHeight, btCurInner.scrollTop);
  };
  btCurInner.addEventListener('scroll', syncCurScrollbar);
  syncCurScrollbar();

  // 좌(플레이리스트)/우(큐레이션) 컬럼 높이를 중앙(영상+컨트롤) 컬럼 높이에
  // 맞춘다 — 요청: "전체 높이는 가운데 영상 영역에 맞추고, 좌우는 정보가
  // 넘치면 내부 스크롤". 모바일/좁은 폭(컨테이너 쿼리 ≤768px, .bt-body가
  // column으로 바뀌는 시점)에서는 3열이 세로로 쌓이므로 높이를 강제하지
  // 않고 원래대로 자연스러운 높이를 쓴다.
  const btWin = document.getElementById('bt-win');
  const btBody = btWin.querySelector('.bt-body');
  const btColCenter = btWin.querySelector('.bt-col-center');
  const btColList = btWin.querySelector('.bt-col-list');
  const btColCur = btWin.querySelector('.bt-col-cur');
  // 모듈 최상위 스코프 변수(위 "let syncSideColumnHeights = () => {}")에 실제
  // 구현을 대입 — function 선언으로 새로 만들면 이 함수 스코프 안에서만
  // 보이는 별개 바인딩이 생겨서 바깥(selectTrack 등)에서는 여전히 no-op
  // 스텁만 보인다. 대입이라야 바깥 변수가 실제로 갱신된다.
  syncSideColumnHeights = function () {
    if (btWin.hidden) return;
    const stacked = getComputedStyle(btBody).flexDirection === 'column';
    if (stacked) {
      btColList.style.height = '';
      btColCur.style.height = '';
    } else {
      const h = btColCenter.getBoundingClientRect().height;
      if (h > 0) {
        btColList.style.height = h + 'px';
        btColCur.style.height = h + 'px';
      }
    }
    syncListScrollbar();
    syncCurScrollbar();
  };
  new ResizeObserver(syncSideColumnHeights).observe(btColCenter);
  window.addEventListener('resize', syncSideColumnHeights);   // 뷰포트 리사이즈로 .bt-win 자체 폭이 바뀌는 경우
  syncSideColumnHeights();

  document.querySelectorAll('.bt-play').forEach((b) => b.addEventListener('click', togglePlay));
  document.querySelectorAll('.bt-prev').forEach((b) => b.addEventListener('click', () => stepTrack(-1)));
  document.querySelectorAll('.bt-next').forEach((b) => b.addEventListener('click', () => stepTrack(1)));

  // "Enjoy Music!" → 플레이어 열기 + 현재 트랙 자동재생 (클릭 제스처 활용)
  const icon = document.getElementById('icon-tunes');
  if (icon) {
    icon.addEventListener('click', () => {
      const win = document.getElementById('bt-win');
      const wasClosed = win.hidden && !state.isMinimized;
      if (state.isMinimized) setMinimized(false);   // 미니 → 풀 플레이어 (재생 유지)
      win.hidden = false;
      // ResizeObserver는 창이 hidden→visible로 바뀌는 순간을 못 잡을 때가
      // 있어서(관찰 시작 시점에 이미 display:none이면 최초 콜백이 안 옴)
      // 여기서 직접 한 번 더 불러 확실히 맞춘다 — getBoundingClientRect()가
      // 강제 동기 레이아웃을 유발하므로 hidden 해제 직후에 호출해도 정확한
      // 값을 읽는다.
      syncSideColumnHeights();
      window.__bringToFront?.(win);
      window.__tigerRun?.reportWindowAction();
      const t = tracks[currentIndexOf()];
      if (wasClosed && t?.youtube_video_id && t.youtube_video_id !== currentVideoId) {
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
  setVolume,
  seekTo,
  getPlayerState: () => { try { return ytPlayer?.getPlayerState() ?? null; } catch { return null; } },
  getPlayerVolume: () => { try { return ytPlayer?.getVolume() ?? null; } catch { return null; } },
  getIframeSrc: () => document.querySelector('#bt-yt-dock iframe')?.src ?? null,
  getDockRect: () => dock ? { visibility: dock.style.visibility, ...dock.getBoundingClientRect().toJSON() } : null,
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
