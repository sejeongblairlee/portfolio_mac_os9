/**
 * 메뉴바 타이거 — 레트로 택시미터 스타일: 평소엔 첫 프레임에 정지, 활동 감지 시 러닝.
 *
 * 원 지시는 React(.tsx) + lottie-react였지만 이 프로젝트는 빌드 없는 정적 사이트
 * (CLAUDE.md: 바닐라 HTML/CSS/JS, 프레임워크 없음 — JSX를 트랜스파일할 파이프라인이 없음).
 * 그래서 동일한 동작/설정을 바닐라 JS로 이식: lottie-web을 Three.js/YouTube API와
 * 같은 방식(CDN <script> 로드, 프로미스 캐시)으로 불러와 src/tiger-run.json을 재생한다.
 *
 * 활동 감지: pointermove/mousemove/touchmove/keydown → 즉시 러닝, 1200ms 무활동 시
 * 첫 프레임으로 정지. Blair-tunes 재생 중이면(state.isPlaying) 무활동이어도 계속 러닝.
 * 플레이어 드래그/리사이즈도 포인터 이벤트가 window까지 버블링하므로 이미 활동으로 잡힘.
 */
(function () {
'use strict';

const LOTTIE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
const JSON_PATH = 'src/tiger-run.json';
const INACTIVITY_MS = 1200;
const ACTIVITY_EVENTS = ['pointermove', 'mousemove', 'touchmove', 'keydown'];

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

async function initTigerRun(container) {
  const lottie = await loadLottie();
  const anim = lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: true,
    autoplay: false,   // 기본: 정지 — 활동 감지 전엔 절대 재생하지 않음
    path: JSON_PATH,
  });

  let userActive = false;
  let idleTimer = null;
  let running = false;   // 현재 재생 중인지 — play()/goToAndStop() 중복 호출 방지

  function setRunning(next) {
    if (next === running) return;
    running = next;
    if (running) anim.play();
    else anim.goToAndStop(0, true);   // 정지 = 첫 프레임 (모션은 Lottie 자체에 내장 — 트랜스폼 가공 없음)
  }

  function evaluate() {
    const playerPlaying = !!(window.__blairTunes && window.__blairTunes.state.isPlaying);
    setRunning(userActive || playerPlaying);
  }

  function onActivity() {
    userActive = true;
    evaluate();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { userActive = false; evaluate(); }, INACTIVITY_MS);
  }

  ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, onActivity, { passive: true }));
  // Blair-tunes 재생 상태 변화(전용 이벤트 없음)를 놓치지 않도록 짧게 폴링
  const pollId = setInterval(evaluate, 250);

  window.__tigerRun = {
    destroy() {
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, onActivity));
      clearTimeout(idleTimer);
      clearInterval(pollId);
      anim.destroy();
    },
    isRunning: () => running,
  };
}

const el = document.getElementById('mb-tiger');
if (el) initTigerRun(el).catch((e) => console.warn('[tiger-run]', e));

})();
