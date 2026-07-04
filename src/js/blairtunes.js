/**
 * Blair-tunes 플레이어 — UI 연결 단계.
 * Figma frames: 6:748(desktop) / 115:2964(mobile) / 107:2745(minimized)
 *
 * 이 파일은 빌드 없는 정적 사이트용 브라우저 ESM.
 * 데이터 로직은 src/lib/*.ts(fetchTracks 파이프라인)와 동일한 규칙의 포트:
 *  - is_published=true, sort_order asc → created_at asc
 *  - youtube_video_id / thumbnail 파생 (src/lib/youtube.ts와 동일 규칙)
 *  - color_source='fallback'이면 /api/theme-color로 테마 파생
 * 값 변경 시 src/lib/supabase-config.ts와 동기화할 것.
 *
 * Step 5: YouTube IFrame API 재생 구현.
 * 공유 상태(state.selectedTrackId / state.isPlaying)를 메인·미니 플레이어가 함께 읽음.
 * 아직 구현하지 않음(스펙): 진행바/볼륨 로직/영상 종료 시 자동 다음곡/드래그/키보드 단축키
 */

(function () {
'use strict';

const SUPABASE_URL = 'https://nmivopvhiwzaifpzlskf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5taXZvcHZoaXd6YWlmcHpsc2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjIxMjEsImV4cCI6MjA5ODczODEyMX0.vPaEwNSHlD-Zscr2FXtP1d5qgWTGyPymLUrKYbyDazY';

const ICONS = 'src/images/tunes';
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

// ── 데이터 (src/lib 파이프라인의 브라우저 포트) ─────────────────────────────
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
    theme_color: t.theme_color || '#2A2118',
    text_color: t.text_color || '#FFFFFF',
  };
}

async function applyDerivedThemeColors(tracks) {
  return Promise.all(tracks.map(async (t) => {
    if (t.color_source !== 'fallback' || !t.youtube_video_id) return t;
    try {
      const res = await fetch(`/api/theme-color?videoId=${encodeURIComponent(t.youtube_video_id)}`);
      if (!res.ok) return t;
      const body = await res.json();
      if (body.color_source === 'thumbnail' && typeof body.theme_color === 'string') {
        return { ...t, theme_color: body.theme_color, text_color: body.text_color ?? '#FFFFFF', color_source: 'thumbnail' };
      }
    } catch { /* 로컬 file:// 등 API 불가 → fallback 유지 */ }
    return t;
  }));
}

async function fetchTracks() {
  try {
    const qs = 'select=*&is_published=eq.true&order=sort_order.asc,created_at.asc';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tracks?${qs}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) return { tracks: [], error: `HTTP ${res.status}` };
    const rows = await res.json();
    const tracks = await applyDerivedThemeColors(rows.map(enrichTrack));
    return { tracks, error: null };
  } catch (e) {
    return { tracks: [], error: e instanceof Error ? e.message : 'fetch failed' };
  }
}

// ── 렌더링 ──────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * 공연 정보 라벨.
 * - location + year : "Live Video from San Diego, 2016"
 * - location만      : "Live Video from San Diego"
 * - year만          : "Live Video, 2016"
 * - 둘 다 없음       : ""
 * DB 값에 이미 "Live Video..." 프리픽스가 들어 있으면 중복으로 붙이지 않는다.
 */
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

let tracks = [];

// ── 공유 상태 — 메인 플레이어와 미니 플레이어가 함께 읽음 (Step 5) ──────────
const state = {
  selectedTrackId: null,
  isPlaying: false,
};

function currentIndexOf() {
  const i = tracks.findIndex((t) => t.id === state.selectedTrackId);
  return i === -1 ? 0 : i;
}

// ── YouTube IFrame API ──────────────────────────────────────────────────────
let ytPlayer = null;          // YT.Player 인스턴스 (메인 비디오 영역 하나만 존재)
let ytApiPromise = null;

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

async function ensurePlayer() {
  if (ytPlayer) return ytPlayer;
  const YT = await loadYouTubeAPI();
  const t = tracks[currentIndexOf()];
  ytPlayer = await new Promise((resolve) => {
    const p = new YT.Player('bt-yt', {
      videoId: t?.youtube_video_id ?? undefined,
      playerVars: {
        controls: 0,          // 진행바/볼륨은 스펙상 미구현 — 크롬리스 유지
        rel: 0,
        playsinline: 1,
        modestbranding: 1,
      },
      events: {
        onReady: () => resolve(p),
        onStateChange: (e) => {
          const YTPS = window.YT.PlayerState;
          if (e.data === YTPS.PLAYING) { setPlaying(true); hideEmbedFallback(); }
          else if (e.data === YTPS.PAUSED || e.data === YTPS.ENDED) setPlaying(false);
        },
        // 임베드 불가(101/150/153 등) 포함 모든 플레이어 오류 → 폴백 오버레이
        onError: () => {
          setPlaying(false);
          showEmbedFallback();
        },
      },
    });
  });
  return ytPlayer;
}

// 재생 중 표시용 픽셀 pause 글리프 (play 아이콘과 동일 스케일)
const PAUSE_SVG =
  '<svg width="24" height="24" viewBox="0 0 24 24" shape-rendering="crispEdges">' +
  '<rect x="6" y="5" width="4" height="14" fill="#111"/>' +
  '<rect x="14" y="5" width="4" height="14" fill="#111"/></svg>';
const PLAY_IMG = `<img src="${ICONS}/icon-play.svg" alt="">`;

// ── 임베드 불가 폴백 (Watch on YouTube) ─────────────────────────────────────
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

function setPlaying(playing) {
  state.isPlaying = playing;
  document.querySelectorAll('.bt-play').forEach((btn) => {
    btn.innerHTML = playing ? PAUSE_SVG : PLAY_IMG;
    btn.setAttribute('aria-label', playing ? 'pause' : 'play');
  });
}

// ── 컨트롤 (Step 5) ─────────────────────────────────────────────────────────
async function togglePlay() {
  const p = await ensurePlayer();
  if (state.isPlaying) p.pauseVideo();
  else p.playVideo();
}

function selectTrack(id, { autoplay } = { autoplay: true }) {
  const track = tracks.find((t) => t.id === id);
  if (!track) return;
  state.selectedTrackId = id;
  hideEmbedFallback();          // 새 트랙은 다시 임베드 시도
  renderCurrent();
  if (ytPlayer && track.youtube_video_id) {
    if (autoplay) ytPlayer.loadVideoById(track.youtube_video_id);
    else ytPlayer.cueVideoById(track.youtube_video_id);
  }
}

function stepTrack(delta) {
  if (!tracks.length) return;
  const next = (currentIndexOf() + delta + tracks.length) % tracks.length;  // 순환
  selectTrack(tracks[next].id, { autoplay: state.isPlaying });
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

  // 테마 — transition: background-color 300ms ease (CSS)
  document.getElementById('bt-win').style.backgroundColor = t.theme_color;
  document.getElementById('bt-mini').style.backgroundColor = t.theme_color;

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

  document.querySelectorAll('#bt-list .bt-row').forEach((row, i) => {
    row.classList.toggle('playing', i === currentIndex);
  });
}

function renderList() {
  const list = document.getElementById('bt-list');
  const currentIndex = currentIndexOf();
  list.innerHTML = tracks.map((t, i) => `
    <button class="bt-row${i === currentIndex ? ' playing' : ''}" data-id="${esc(t.id)}">
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

async function initBlairTunes() {
  const mount = document.createElement('div');
  mount.innerHTML = windowHTML();
  document.body.append(...mount.children);

  document.getElementById('bt-close').addEventListener('click', () => {
    document.getElementById('bt-win').hidden = true;
  });
  document.getElementById('bt-mini-close').addEventListener('click', () => {
    document.getElementById('bt-mini').hidden = true;
  });
  // 미니마이즈 전환 인터랙션은 스펙상 아직 미구현 (버튼은 비주얼만)

  const { tracks: fetched, error } = await fetchTracks();
  if (error || !fetched.length) {
    console.warn('[blair-tunes] tracks fetch:', error ?? 'empty');
    return;
  }
  tracks = fetched;
  state.selectedTrackId = tracks[0].id;   // 첫 published 트랙 기본 선택
  renderList();
  renderCurrent();

  // 컨트롤 버튼 — 메인·미니 공통 (같은 공유 상태/플레이어 제어)
  document.querySelectorAll('.bt-play').forEach((b) => b.addEventListener('click', togglePlay));
  document.querySelectorAll('.bt-prev').forEach((b) => b.addEventListener('click', () => stepTrack(-1)));
  document.querySelectorAll('.bt-next').forEach((b) => b.addEventListener('click', () => stepTrack(1)));

  // "Enjoy Music!" 아이콘 → 플레이어 열기 (+ 최초 오픈 시 YouTube 플레이어 생성)
  const icon = document.getElementById('icon-tunes');
  if (icon) {
    icon.addEventListener('click', () => {
      document.getElementById('bt-win').hidden = false;
      ensurePlayer().catch((e) => console.warn('[blair-tunes] YT init:', e));
    });
  }
}

initBlairTunes();

// 테스트/디버그 훅 (콘솔에서 폴백 오버레이 확인용)
window.__blairTunes = { state, showEmbedFallback, hideEmbedFallback };

})();
