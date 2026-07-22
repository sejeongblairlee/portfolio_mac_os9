/**
 * 메뉴바 타이거 — 레트로 택시미터 + Mac OS 활동 인디케이터 하이브리드.
 *
 * 원 지시는 React(.tsx) + lottie-react였지만 이 프로젝트는 빌드 없는 정적 사이트
 * (CLAUDE.md: 바닐라 HTML/CSS/JS, 프레임워크 없음) — 동일 동작을 바닐라 JS로 이식,
 * lottie-web을 Three.js/YouTube API와 같은 CDN 로드 패턴으로 사용한다.
 *
 * 정지: 포인터가 멈춘 지 150ms 지나면 그 즉시 속도 기여 0. 아무 활동도 없으면
 * pause() — 달리던 포즈 그대로 프리즈(항상 같은 포즈로 멈추지 않도록 프레임 0
 * 리셋은 하지 않는다). 속도: 재생/정지 여부와 별개로 activitySpeed를 계속 갱신해
 * anim.setSpeed()만 호출 — JSON 리로드도 리마운트도 하지 않는다.
 *
 * 속도 곡선: raw 합산 점수(RAW_BASE + 신호별 기여) × TIGER_SPEED_MULTIPLIER(0.76),
 * 최종적으로 [0.35, 1.6]로 클램프 — 전체적으로 차분하게 움직이도록 다운스케일.
 * 활동 감지 자체(임계값/스무딩/타이밍)는 바뀌지 않았고, 여기서 바뀐 건 속도 곡선뿐.
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
// 2026-07-22: 말(horse) 애니메이션으로 교체. 롤백하려면 이 한 줄만
// 'src/tiger-run.json'으로 되돌리면 됨 — 원본 파일은 그대로 남아있음.
const JSON_PATH = 'src/horse.json';

const POINTER_STOP_MS = 150;    // 포인터 정지 판정 — "즉시 정지" 요구사항의 실제 임계값
const KEY_ACTIVE_MS = 300;      // 키다운 1회의 활동 지속시간
const WINDOW_ACTION_MS = 500;   // 창 열기/최소화/복원 펄스 지속시간
const VELOCITY_SMOOTH = 0.25;   // lerp 계수 — 매 프레임 떨림 완충
const DOM_SIGNAL_EVERY = 6;     // 창 개수/드래그/리사이즈 DOM 조회 주기(프레임) — 매 프레임 조회 방지

// 전체를 차분하게: raw 합산 점수를 낸 뒤 배율을 곱하고 최종 범위로 클램프.
// (활동 감지 로직·타이밍은 그대로 — 여기서 바뀌는 건 속도 곡선뿐)
const TIGER_SPEED_MULTIPLIER = 0.76;
const SPEED_MIN = 0.35, SPEED_MAX = 1.6;   // 배율 적용 "후" 최종 한계
const RAW_BASE = 0.5;
const W_PLAYER = 0.3, W_DRAG = 1.1, W_RESIZE = 1.45, W_ACTION = 0.3;
const W_WINDOW_EACH = 0.04, W_WINDOW_MAX = 0.16;   // 창 개수는 아주 미세하게만 가산

/** 포인터 속도(px/ms) → raw 기여도. 5단계: 매우 느림/느림/보통/빠름/매우 빠름. */
function pointerSpeedContribution(v) {
  if (v < 0.05) return 0;      // 무활동
  if (v < 0.15) return 0.1;    // 매우 느림 → 최종 speed ~0.42
  if (v < 0.35) return 0.35;   // 느림 → ~0.60
  if (v < 0.7) return 0.7;     // 보통 → ~0.84
  if (v < 1.3) return 1.15;    // 빠름 → ~1.16
  return 1.6;                  // 매우 빠름 → ~1.47
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
  let currentSpeed = SPEED_MIN;

  function setRunning(next) {
    if (next === running) return;
    running = next;
    if (running) anim.play();
    else anim.pause();   // 정지 = 달리던 그 포즈에서 프리즈 — 매번 같은 첫 프레임으로
                         // 리셋(goToAndStop(0))하면 항상 같은 포즈로 멈춰서 어색함
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

    const rawSpeed = RAW_BASE +
      pointerSpeedContribution(smoothedVelocity) +
      (playerPlaying ? W_PLAYER : 0) +
      Math.min(W_WINDOW_MAX, signals.openCount * W_WINDOW_EACH) +
      (signals.dragging ? W_DRAG : 0) +
      (signals.resizing ? W_RESIZE : 0) +
      (recentAction ? W_ACTION : 0);

    const speed = Math.min(SPEED_MAX, Math.max(SPEED_MIN, rawSpeed * TIGER_SPEED_MULTIPLIER));

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
