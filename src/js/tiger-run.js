/**
 * 메뉴바 타이거 — 레트로 택시미터 + Mac OS 활동 인디케이터 하이브리드.
 *
 * 원 지시는 React(.tsx) + lottie-react였지만 이 프로젝트는 빌드 없는 정적 사이트
 * (CLAUDE.md: 바닐라 HTML/CSS/JS, 프레임워크 없음) — 동일 동작을 바닐라 JS로 이식,
 * lottie-web을 Three.js/YouTube API와 같은 CDN 로드 패턴으로 사용한다.
 *
 * 정지: 포인터가 멈춘 지 150ms 지나면 그 즉시 속도 기여 0. 아무 활동도 없으면
 * goToAndStop(0). 속도: 재생/정지 여부와 별개로 activitySpeed를 계속 갱신해
 * anim.setSpeed()만 호출 — JSON 리로드도 리마운트도 하지 않는다.
 *
 * 신호 소스:
 *  - 포인터 속도(px/ms, 지수이동평균으로 완충) → 구간별 기여도
 *  - Blair-tunes 재생 상태(window.__blairTunes.state.isPlaying, 읽기 전용)
 *  - 열린 창 개수(.cu-win 표시 여부 + #bt-win/#bt-mini hidden 여부) — 속도에만 기여,
 *    shouldRun에는 기여 안 함(기본으로 열려 있는 CU-SeeMe 창 때문에 영원히 안 멈추는 것 방지)
 *  - 드래그/리사이즈 중(.dragging/.resizing 클래스 — 창 매니저가 이미 붙이거나,
 *    blairtunes.js 리사이즈 핸들에 이번에 추가)
 *  - 최근 창 동작 펄스(열기/최소화/복원 — window.__tigerRun.reportWindowAction()을
 *    각 지점에서 호출, 존재하지 않아도 그냥 무시되는 옵셔널 훅)
 */
(function () {
'use strict';

const LOTTIE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
const JSON_PATH = 'src/tiger-run.json';

const POINTER_STOP_MS = 150;    // 포인터 정지 판정 — "즉시 정지" 요구사항의 실제 임계값
const KEY_ACTIVE_MS = 300;      // 키다운 1회의 활동 지속시간
const WINDOW_ACTION_MS = 500;   // 창 열기/최소화/복원 펄스 지속시간
const VELOCITY_SMOOTH = 0.25;   // lerp 계수 — 매 프레임 떨림 완충
const DOM_SIGNAL_EVERY = 6;     // 창 개수/드래그/리사이즈 DOM 조회 주기(프레임) — 매 프레임 조회 방지

const SPEED_MIN = 0.6, SPEED_MAX = 2.4, SPEED_BASE = 0.6;
const W_PLAYER = 0.45, W_DRAG = 0.6, W_RESIZE = 0.8, W_ACTION = 0.35;
const W_WINDOW_EACH = 0.12, W_WINDOW_MAX = 0.48;

function pointerSpeedContribution(v) {
  if (v < 0.05) return 0;
  if (v < 0.25) return 0.7;
  if (v < 0.6) return 1.0;
  if (v < 1.2) return 1.4;
  return 1.8;
}

let lottiePromise = null;
function loadLottie() {
  if (lottiePromise) return lottiePromise;
  lottiePromise = new Promise((resolve, reject) => {
    if (window.lottie) { resolve(window.lottie); return; }
    const s = document.createElement('script');
    s.src = LOTTIE_CDN;
    s.onload = () => resolve(window.lottie);
    s.onerror = () => reject(new Error('lottie-web load failed'));
    document.head.appendChild(s);
  });
  return lottiePromise;
}

function readWindowSignals() {
  const cuOpen = document.querySelectorAll('.cu-win').length
    ? Array.from(document.querySelectorAll('.cu-win')).filter((w) => w.style.display !== 'none').length
    : 0;
  const btOpen = ['bt-win', 'bt-mini'].reduce((n, id) => {
    const el = document.getElementById(id);
    return n + (el && !el.hidden ? 1 : 0);
  }, 0);
  return {
    openCount: cuOpen + btOpen,
    dragging: document.querySelector('.cu-win.dragging, #bt-win.dragging, #bt-mini.dragging') !== null,
    resizing: document.querySelector('#bt-win.resizing') !== null,
  };
}

async function initTigerRun(container) {
  const lottie = await loadLottie();
  const anim = lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: true,
    autoplay: false,   // 기본: 정지 — 활동 감지 전엔 절대 재생하지 않음
    path: JSON_PATH,
  });

  // ── 포인터 속도 추적 ──
  let lastX = null, lastY = null, lastMoveT = 0, lastMoveAt = 0;
  let smoothedVelocity = 0;

  function onPointerMove(e) {
    const t = performance.now();
    const p = e.touches && e.touches[0] ? e.touches[0] : e;
    const x = p.clientX, y = p.clientY;
    if (x == null || y == null) return;
    if (lastX !== null) {
      const dt = Math.max(1, t - lastMoveT);   // 0 나눗셈 방지
      const dist = Math.hypot(x - lastX, y - lastY);
      const rawVelocity = dist / dt;
      smoothedVelocity += (rawVelocity - smoothedVelocity) * VELOCITY_SMOOTH;
    }
    lastX = x; lastY = y; lastMoveT = t;
    lastMoveAt = t;
  }
  ['pointermove', 'mousemove', 'touchmove'].forEach((type) =>
    window.addEventListener(type, onPointerMove, { passive: true }));

  let keyActiveUntil = 0;
  function onKeydown() { keyActiveUntil = performance.now() + KEY_ACTIVE_MS; }
  window.addEventListener('keydown', onKeydown, { passive: true });

  // ── 최근 창 동작 펄스 (열기/최소화/복원 — 옵셔널 훅으로 외부에서 호출) ──
  let lastWindowActionAt = -Infinity;
  function reportWindowAction() { lastWindowActionAt = performance.now(); }

  // ── 재생/속도 적용 (중복 호출 방지 — 값이 바뀔 때만 Lottie API 호출) ──
  let running = false;
  let currentSpeed = SPEED_BASE;

  function setRunning(next) {
    if (next === running) return;
    running = next;
    if (running) anim.play();
    else anim.goToAndStop(0, true);   // 정지 = 첫 프레임 (트랜스폼 가공 없음, Lottie 자체 모션만)
  }
  function setSpeed(s) {
    if (Math.abs(s - currentSpeed) < 0.02) return;
    currentSpeed = s;
    anim.setSpeed(s);
  }

  let frame = 0;
  let signals = { openCount: 0, dragging: false, resizing: false };

  function tick() {
    requestAnimationFrame(tick);
    const now = performance.now();

    // pointerActive(활동 여부, shouldRun용)와 속도 기여도(speed용)는 별개 —
    // 첫 이동 이벤트는 아직 델타가 없어 속도가 0이어도 "지금 막 움직였다"는 사실 자체가 활동 신호.
    const pointerActive = (now - lastMoveAt) <= POINTER_STOP_MS;
    if (!pointerActive) smoothedVelocity = 0;   // §2: 150ms 정지 → 속도 0
    const keyActive = now < keyActiveUntil;
    const playerPlaying = !!(window.__blairTunes && window.__blairTunes.state.isPlaying);
    const recentAction = (now - lastWindowActionAt) < WINDOW_ACTION_MS;

    if (frame % DOM_SIGNAL_EVERY === 0) signals = readWindowSignals();
    frame++;

    // 창이 열려있다는 사실 자체는 "계속 달릴 이유"가 아님 — 속도 가산 요소일 뿐.
    // (기본 CU-SeeMe 창 2개가 항상 열려 있어도, 진짜 유휴 상태면 정지해야 함)
    const shouldRun = pointerActive || keyActive || playerPlaying ||
      signals.dragging || signals.resizing || recentAction;

    if (!shouldRun) { setRunning(false); return; }

    const speed = Math.min(SPEED_MAX, Math.max(SPEED_MIN,
      SPEED_BASE +
      pointerSpeedContribution(smoothedVelocity) +
      (playerPlaying ? W_PLAYER : 0) +
      Math.min(W_WINDOW_MAX, signals.openCount * W_WINDOW_EACH) +
      (signals.dragging ? W_DRAG : 0) +
      (signals.resizing ? W_RESIZE : 0) +
      (recentAction ? W_ACTION : 0)));

    setRunning(true);
    setSpeed(speed);
  }
  requestAnimationFrame(tick);

  window.__tigerRun = {
    reportWindowAction,
    isRunning: () => running,
    getSpeed: () => currentSpeed,
  };
}

const el = document.getElementById('mb-tiger');
if (el) initTigerRun(el).catch((e) => console.warn('[tiger-run]', e));

})();
