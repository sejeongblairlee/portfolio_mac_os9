// ═══════════════════════════════════════════════════════════════════════════
// Mac OS9 클릭음 — Web Audio API 기반 엔진 아키텍처를 쓰되, 소리 종류는
// 하나(Click.wav)로 통일했다. 원래 동작별로
// 다른 음원(열기/닫기/접기/펼치기/드래그 각각 다른 wav)을 다 매핑했었는데,
// 실사용해보니 동작 하나에 클릭음+동작음이 겹쳐 들리고 소리 종류가 산만해서
// (2026-08-02 피드백) 전역 클릭음 하나로 단순화 — 클릭 위치/대상과 무관하게
// mousedown마다 항상 Click.wav 한 번만 재생.
//
// <audio>/new Audio() 대신 Web Audio API(AudioContext + decodeAudioData +
// AudioBufferSourceNode)를 쓴다 — 이유: BufferSourceNode는 1회용이라 재생마다
// 새로 만들어서 독립적으로 재생되므로, 연타 클릭해도 이전 재생을 끊거나
// currentTime을 리셋할 필요 없이 자연스럽게 겹쳐 재생된다.
//
// 브라우저 자동재생 정책 때문에 AudioContext는 suspended로 시작하고, 첫
// 사용자 제스처(mousedown/touchstart)에서 딱 한 번만 resume한다.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  const CLICK_SRC = 'src/sounds/Click.wav';
  const CLICK_VOLUME = 0.35;

  let ctx = null;
  let ready = false;
  let buffer = null;
  let gain = null;

  function play() {
    if (!ready) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.start(0);
  }

  function resumeOnce() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  async function init() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    ctx = new AudioContextCtor({ latencyHint: 'interactive' });
    window.addEventListener('mousedown', resumeOnce, { once: true });
    window.addEventListener('touchstart', resumeOnce, { once: true });

    // 전역 클릭음 — 요소 구분 없이 mousedown마다 항상 재생.
    window.addEventListener('mousedown', play);

    const arrayBuffer = await (await fetch(CLICK_SRC)).arrayBuffer();
    buffer = await ctx.decodeAudioData(arrayBuffer);
    gain = ctx.createGain();
    gain.gain.value = CLICK_VOLUME;
    gain.connect(ctx.destination);
    ready = true;
  }

  init().catch((e) => console.warn('[sound-engine] init failed', e));

  // desktop.html/blairtunes.js/sudoku.js가 예전에 열기/닫기/드래그 등 동작별로
  // 호출하던 window.__playSound(name) 자리는 그대로 남아 있어도 안전하게
  // no-op — 전역 클릭음이 이미 모든 상호작용의 mousedown에서 재생되므로 각
  // 호출부를 일일이 되돌리지 않아도 중복 재생이 없다.
  window.__playSound = () => {};
})();
