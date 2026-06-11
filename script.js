// ═══════════════════════════════════════════════════════════
//  Mac OS 9 Portfolio — Interactions + Sound System
//  Blair Lee Studio
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  Finder Logo — Canvas 기반 인터랙티브 눈
//  Canvas(#finder-logo-canvas)에 finder-no-eyes.png 배경 위에
//  눈을 직접 그려 픽셀 퍼펙트 깜빡임 + 시선 추적 구현
// ═══════════════════════════════════════════════════════════
(function FinderEyes() {
  // ── 좌표 설정 (1x 기준) ─────────────────────────────────
  const SCALE = 2;
  const W = 109 * SCALE, H = 114 * SCALE;

  // 왼쪽 눈: 좌측으로부터 x=27, y=28 / 색상 #000088
  // 오른쪽 눈: 우측으로부터 30px → x = 109-30 = 79, y=28 / 색상 #000000
  const LEYE = { x: 27, y: 28, w: 6, h: 13, color: '#000088' };
  const REYE = { x: 79, y: 28, w: 6, h: 13, color: '#000000' };

  const MAX_GAZE = 7, BLINK_MS = 130, LERP = 0.12;

  let canvas, ctx, bgImg;
  let gazeActive = false;
  let gx = 0, gy = 0, tx = 0, ty = 0;
  let scaleY = 1, blinking = false;
  let rafId = null, blinkTimer = null;
  let ready = false;

  // ── 초기화 ───────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('finder-logo-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    bgImg = new Image();
    bgImg.src = 'src/images/finder-no-eyes.png';
    bgImg.onload = () => {
      ready = true;
      draw();
    };

    // 클릭
    canvas.addEventListener('click', () => { blink(); playSound('click'); });

    // 시선 추적
    document.addEventListener('pointerdown',  onDown);
    document.addEventListener('pointermove',  onMove, { passive: true });
    document.addEventListener('pointerup',    onUp);
    document.addEventListener('pointercancel', onUp);

    // 첫 사용자 상호작용(Enter 버튼 클릭) 직후 2번 깜빡임 + Droplet
    // → 브라우저 오디오 정책: 상호작용 후에만 재생 가능
    document.addEventListener('click', function onFirstClick() {
      document.removeEventListener('click', onFirstClick);
      blink(); playSound('droplet');
      setTimeout(() => { blink(); playSound('droplet'); }, 320);
    }, { once: true });

    // 자동 깜빡임
    scheduleBlink();

    // 루프
    rafId = requestAnimationFrame(loop);

    // startup 제거 시 정리
    const obs = new MutationObserver(() => {
      if (!document.getElementById('startup-screen')) {
        cleanup(); obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true });
  }

  // ── 렌더링 ───────────────────────────────────────────────
  function draw() {
    if (!ready) return;
    ctx.clearRect(0, 0, W, H);

    // 배경 PNG (눈 없는 버전)
    ctx.drawImage(bgImg, 0, 0, W, H);

    // 눈 하나 그리기 (2x + gaze + scaleY)
    function drawEye(eye) {
      ctx.fillStyle = eye.color;
      const cx = (eye.x + eye.w / 2 + gx) * SCALE;
      const cy = (eye.y + eye.h / 2 + gy) * SCALE;
      const hw = (eye.w / 2) * SCALE;
      const hh = (eye.h / 2) * SCALE * scaleY;
      ctx.fillRect(cx - hw, cy - hh, hw * 2, hh * 2);
    }

    drawEye(LEYE);
    drawEye(REYE);
  }

  // ── 깜빡임 ───────────────────────────────────────────────
  function blink() {
    if (blinking) return;
    blinking = true;
    const s = performance.now();
    (function frame(now) {
      const t = Math.min((now - s) / BLINK_MS, 1);
      scaleY = t < .35 ? 1 - (t / .35) * .95
             : t < .55 ? .05
             : .05 + ((t - .55) / .45) * .95;
      if (t < 1) requestAnimationFrame(frame);
      else { scaleY = 1; blinking = false; }
    })(performance.now());
  }

  function scheduleBlink() {
    blinkTimer = setTimeout(() => { blink(); scheduleBlink(); },
      3000 + Math.random() * 2000);
  }

  // ── 시선 추적 ─────────────────────────────────────────────
  function onDown() {
    if (document.getElementById('startup-screen')) gazeActive = true;
  }
  function onMove(e) {
    if (!document.getElementById('startup-screen')) return;
    // 터치: pointerdown 후에만 / 마우스: 항상 반응
    if (e.pointerType === 'touch' && !gazeActive) return;
    const nx = (e.clientX / innerWidth)  * 2 - 1;
    const ny = (e.clientY / innerHeight) * 2 - 1;
    tx = Math.max(-MAX_GAZE, Math.min(MAX_GAZE, nx * MAX_GAZE));
    ty = Math.max(-MAX_GAZE, Math.min(MAX_GAZE, ny * MAX_GAZE));
  }
  function onUp() { gazeActive = false; tx = 0; ty = 0; }

  // ── 60fps 루프 ────────────────────────────────────────────
  function loop() {
    gx += (tx - gx) * LERP; if (Math.abs(gx) < .005) gx = 0;
    gy += (ty - gy) * LERP; if (Math.abs(gy) < .005) gy = 0;
    draw();
    rafId = requestAnimationFrame(loop);
  }

  // ── 정리 ─────────────────────────────────────────────────
  function cleanup() {
    clearTimeout(blinkTimer);
    cancelAnimationFrame(rafId);
    document.removeEventListener('pointerdown',  onDown);
    document.removeEventListener('pointermove',  onMove);
    document.removeEventListener('pointerup',    onUp);
    document.removeEventListener('pointercancel', onUp);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();

// ═══════════════════════════════════════════════════════════
//  SOUND SYSTEM
// ═══════════════════════════════════════════════════════════

/**
 * playSound(name)
 * ─────────────────────────────────────────────────────────
 * index.html 에 선언된 <audio id="snd-{name}"> 요소를 찾아 재생.
 * currentTime = 0 으로 리셋하므로 연속 클릭해도 소리가 씹히지 않는다.
 * file:// 환경에서도 DOM <audio> 방식이 new Audio() 보다 안정적.
 *
 * @example  playSound('click')   playSound('quack')
 */
function playSound(name) {
  const template = document.getElementById('snd-' + name);
  if (!template) {
    console.warn('[Sound] 엘리먼트 없음: snd-' + name);
    return;
  }
  // 매번 새 인스턴스 → currentTime 리셋 불필요, 상태 충돌 없음
  // template.src 는 브라우저가 이미 절대 URL 로 변환한 경로
  const audio = new Audio(template.src);
  audio.volume = 1;
  audio.play().catch(e => {
    console.error('[Sound] 실패:', name, '|', e.name, e.message);
  });
}

// ─── Startup Screen ─────────────────────────────────────────
(function () {
  const screen      = document.getElementById('startup-screen');
  const dialog      = screen && screen.querySelector('.su-dialog');
  const btn         = document.getElementById('su-btn');
  const enterState  = document.getElementById('su-state-enter');
  const loadState   = document.getElementById('su-state-loading');
  const bar         = document.getElementById('startup-bar');
  if (!screen || !btn || !bar) return;

  // ─── 반응형 스케일링 ─────────────────────────────────────
  // 디자인 기준: 422×328 (1024×768 Figma 프레임)
  // 뷰포트에 맞게 비율 유지하며 축소 (확대 없음)
  function scaleDialog() {
    if (!dialog) return;
    const padding = 24;
    const scaleW = (window.innerWidth  - padding) / 422;
    const scaleH = (window.innerHeight - padding) / 328;
    const scale  = Math.min(1, scaleW, scaleH);
    dialog.style.transform = `scale(${scale})`;
  }
  scaleDialog();

  // 화면 회전/리사이즈 대응
  const _resizeHandler = () => { if (document.getElementById('startup-screen')) scaleDialog(); else window.removeEventListener('resize', _resizeHandler); };
  window.addEventListener('resize', _resizeHandler);

  // ─── Enter 버튼 클릭 ─────────────────────────────────────
  btn.addEventListener('click', function () {
    // 1. Startup.wav (사용자 인터랙션 후 → 브라우저 정책 통과)
    playSound('startup');

    // 2. Enter → Loading 전환
    enterState.style.display = 'none';
    loadState.style.display  = 'block';

    // 3. 0→100% 비선형 애니메이션
    let pct = 0;
    const tick = setInterval(() => {
      // 25~75% 구간은 3틱마다 1씩 증가 → 느린 중간 구간
      const slow = (pct >= 25 && pct < 75);
      if (slow && pct % 3 !== 0) { pct++; return; }

      pct = Math.min(pct + 1, 100);
      bar.style.width = pct + '%';

      if (pct >= 100) {
        clearInterval(tick);
        setTimeout(() => {
          screen.classList.add('su-hidden');
          screen.addEventListener('transitionend', () => {
            screen.remove();
            window.removeEventListener('resize', _resizeHandler);
            // 초기 상태: Projects 폴더 + CU-SeeMe 오픈
            // QuickTime Player는 CU-SeeMe 닫은 후 등장
            openWindow('portfolio');
            setTimeout(openCuSeeMe, 1500);
          }, { once: true });
        }, 300);
      }
    }, 38);
  });
})();

// ═══════════════════════════════════════════════════════════
// CU-SeeMe — 2개 독립 창 (Local + Remote)
// ═══════════════════════════════════════════════════════════

let _cuStream   = null;

// ─── Local 창: Blair 소개 영상 재생 ─────────────────────────
function initCuCanvas() {
  const video = document.getElementById('cu-canvas');
  if (!video) return;

  video.muted = true;
  video.loop = true;
  const playPromise = video.play();
  if (playPromise && playPromise.catch) playPromise.catch(() => {});

  // Local FPS 스탯 시뮬레이션
  const localStats = document.getElementById('cu-local-stats');
  if (localStats) {
    setInterval(() => {
      const fps  = (4 + Math.random()*4).toFixed(1);
      const kbps = Math.floor(20 + Math.random()*10);
      localStats.textContent = `${fps} fps  ${kbps} Kbps`;
    }, 2200);
  }
}

// ─── Remote 창: 웹캠 + 실시간 FPS ──────────────────────────
async function initCuWebcam() {
  const video  = document.getElementById('cu-webcam');
  const noCam  = document.getElementById('cu-no-cam');
  const stats  = document.getElementById('cu-remote-stats');
  const recv   = document.getElementById('cu-recv-info');
  const name   = document.getElementById('cu-remote-name');
  if (!video) return;

  try {
    _cuStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } },
      audio: false
    });
    video.srcObject = _cuStream;
    if (noCam) noCam.style.display = 'none';
    if (name)  name.textContent = 'YOU (LIVE)';

    // FPS 카운터
    let lastT = Date.now(), frames = 0;
    function countFps() {
      frames++;
      const now = Date.now();
      if (now - lastT >= 1000) {
        const fps  = frames;
        const kbps = 60 + Math.floor(Math.random()*80);
        if (stats) stats.textContent  = `${fps} fps  ${kbps} Kbps`;
        if (recv)  recv.textContent   = `${kbps} kbps (355 cap)`;
        frames = 0; lastT = now;
      }
      if (video.srcObject) {
        video.requestVideoFrameCallback
          ? video.requestVideoFrameCallback(countFps)
          : requestAnimationFrame(countFps);
      }
    }
    video.requestVideoFrameCallback
      ? video.requestVideoFrameCallback(countFps)
      : requestAnimationFrame(countFps);

  } catch(e) {
    if (noCam) {
      const msg = noCam.querySelector('div:last-child');
      if (msg) msg.textContent = '카메라 접근 거부됨';
    }
  }
}

// ─── 픽셀 파티클 (Local 창 canvas 위) ───────────────────────
// data-emoji 값 → 실제 표시 이모지 매핑
const _EMOJI_MAP = { heart: '♥', thumb: '▲', wow: '★' };

function spawnParticles(key) {
  const container = document.getElementById('cu-particles');
  if (!container) return;
  const glyph = _EMOJI_MAP[key] || key;
  const COUNT = 5 + Math.floor(Math.random()*4);
  for (let i = 0; i < COUNT; i++) {
    setTimeout(() => {
      const el = document.createElement('span');
      el.className = 'cu-particle';
      el.textContent = glyph;
      el.style.left = (8 + Math.random() * 78) + '%';
      el.style.animationDuration = (1.1 + Math.random()*.8) + 's';
      el.style.fontSize = (14 + Math.random()*10) + 'px';
      container.appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, i * 100);
  }
}

// ─── 두 창 동시 종료 → QuickTime Player 등장 ────────────────
function closeBothCuWindows() {
  if (_cuStream) { _cuStream.getTracks().forEach(t => t.stop()); _cuStream = null; }
  closeWindow('cu-local');
  closeWindow('cu-remote');
  // CU-SeeMe 닫힘 → QuickTime Player 등장 (close 애니메이션 후)
  setTimeout(openBlairTunes, 450);
}

// 닫기 버튼 두 창 연동 (DOM ready 후)
document.querySelectorAll('.cu-close-pair').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    closeBothCuWindows();
  });
});

// ─── CU-SeeMe 오픈: 두 창을 살짝 어긋나게 팝업 ────────────
function openCuSeeMe() {
  const local  = document.getElementById('window-cu-local');
  const remote = document.getElementById('window-cu-remote');
  if (!local || !remote) return;

  playSound('sosumi');

  // 두 창 오픈
  openWindow('cu-local');
  openWindow('cu-remote');

  if (!isMobile()) {
    const cxL = Math.max(20,  window.innerWidth  * .18);
    const cyL = Math.max(20,  window.innerHeight * .22);
    const cxR = Math.max(20,  window.innerWidth  * .52);
    const cyR = Math.max(20,  window.innerHeight * .32);

    local.style.left  = cxL + 'px';
    local.style.top   = cyL + 'px';
    local.style.transform = 'none';

    remote.style.left  = cxR + 'px';
    remote.style.top   = cyR + 'px';
    remote.style.transform = 'none';
  }

  // 미디어 초기화
  initCuCanvas();
  initCuWebcam();

  // 창 열릴 때마다 오버레이 상태 초기화
  const maskOverlay = document.getElementById('cu-mask-overlay');
  const camOffOverlay = document.getElementById('cu-camoff-overlay');
  const camVideo = document.getElementById('cu-webcam');
  const maskBtn  = document.getElementById('cu-mask-btn');
  const camOffBtn = document.getElementById('cu-camoff-btn');
  if (maskOverlay)  maskOverlay.classList.remove('active');
  if (camOffOverlay) { camOffOverlay.classList.remove('active'); }
  if (camVideo)     camVideo.style.opacity = '1';
  if (maskBtn)      { maskBtn.textContent = 'MASK FACE'; maskBtn.classList.remove('active'); }
  if (camOffBtn)    { camOffBtn.textContent = 'CAM OFF';  camOffBtn.classList.remove('active'); }
}

// ─── CU-SeeMe 버튼 이벤트 (딱 한 번만 등록) ─────────────────

// 리액션 버튼
document.querySelectorAll('.cu-react-btn').forEach(btn => {
  btn.addEventListener('click', () => spawnParticles(btn.dataset.emoji));
});

// MASK FACE 토글
(function () {
  const btn     = document.getElementById('cu-mask-btn');
  const overlay = document.getElementById('cu-mask-overlay');
  if (!btn || !overlay) return;
  btn.addEventListener('click', () => {
    const on = overlay.classList.toggle('active');
    btn.classList.toggle('active', on);
    btn.textContent = on ? 'MASK ON' : 'MASK FACE';
  });
})();

// CAM OFF 토글
(function () {
  const btn     = document.getElementById('cu-camoff-btn');
  const overlay = document.getElementById('cu-camoff-overlay');
  const video   = document.getElementById('cu-webcam');
  if (!btn || !overlay) return;
  btn.addEventListener('click', () => {
    const on = overlay.classList.toggle('active');
    btn.classList.toggle('active', on);
    btn.textContent = on ? 'CAM ON' : 'CAM OFF';
    if (video) video.style.opacity = on ? '0' : '1';
  });
})();

// ─── Projects 아코디언 ────────────────────────────────────────
document.querySelectorAll('.pj-acc-header').forEach(header => {
  header.addEventListener('click', () => {
    const item = header.closest('.pj-acc-item');
    const isOpen = item.dataset.open === 'true';
    // 전부 닫기
    document.querySelectorAll('.pj-acc-item').forEach(i => i.dataset.open = 'false');
    // 클릭한 것만 토글
    item.dataset.open = isOpen ? 'false' : 'true';
  });
});

// ═══════════════════════════════════════════════════════════
// Get Info — Project Detail Popup
// ═══════════════════════════════════════════════════════════

const PROJECT_DB = {
  // ── Finance (2)
  'monimo_SAMSUNG CARD.dmg': {
    service:'monimo', client:'SAMSUNG CARD', role:'UX strategy, UX Planning',
    domain:'Finance', period:'2023.03 – 2023.06',
    details:'Financial super-app redesign targeting Gen Z · User research · Service blueprint · Prototype testing'
  },
  'LOCA_LOTTE CARD.pkg': {
    service:'LOCA', client:'LOTTE CARD', role:'UX Planning, UI Design',
    domain:'Finance', period:'—',
    details:'Card rewards & loyalty platform UX/UI · Journey mapping · Design system component build'
  },
  // ── Commerce (3)
  'MLB_SUPRA_F&F.app': {
    service:'MLB Discovery SUPRA', client:'F&F', role:'Brand strategy, UX Planning, UI Design',
    domain:'Commerce', period:'2022.02 – 2023.02',
    details:'Global sportswear e-commerce UX · Brand strategy · Information architecture · UI design system'
  },
  'SI_Village_SHINSEGAE.dmg': {
    service:'S.I.Village', client:'SHINSEGAE', role:'Service strategy, UX Planning',
    domain:'Commerce', period:'—',
    details:'Luxury online department store service strategy · End-to-end UX Planning · User research'
  },
  'LOTTE_ON_LOTTE.pkg': {
    service:'LOTTE ON', client:'LOTTE e-commerce', role:'User Research, UX strategy, UI Design',
    domain:'Commerce', period:'—',
    details:'Super-app e-commerce UX overhaul · Multi-platform design · Personalization UX strategy'
  },
  // ── O2O (2)
  'DaLock_Startup.dmg': {
    service:'DaLock', client:'Startup', role:'Product Designer',
    domain:'O2O', period:'2024.03 – 2026.06',
    details:'Smart lock IoT service UX/UI · 0 to 1 product design · End-to-end feature design'
  },
  'T_Factory_SKT.pkg': {
    service:'T Factory', client:'SKT', role:'UI Design',
    domain:'O2O', period:'—',
    details:'Telecom retail experience design · Offline-to-online UX bridge · UI components'
  },
  // ── Etc (3): B2B + OTT
  'Addy_CJ ENM.sit': {
    service:'Addy', client:'CJ ENM', role:'UX strategy, UX Planning, UI Design',
    domain:'B2B SaaS', period:'—',
    details:'Creator advertising B2B SaaS platform · End-to-end UX design · Design system build'
  },
  'Tving_CJ ENM.dmg': {
    service:'Tving', client:'CJ ENM', role:'UI Design',
    domain:'OTT', period:'—',
    details:'OTT streaming platform UI · Content discovery interface · Live channel UX'
  },
  'TMR_LINA.pkg': {
    service:'TMR Assistant', client:'LINA', role:'User Research, UX Strategy, UI Design',
    domain:'B2B CRM', period:'—',
    details:'Insurance agent CRM tool UX · User research · Workflow optimization · UI components'
  }
};

function openGetInfo(key) {
  const data = PROJECT_DB[key] || {};
  const win  = document.getElementById('window-getinfo');
  if (!win) return;

  // 내용 채우기
  document.getElementById('gi-win-title').textContent = `Get Info — ${key}`;
  document.getElementById('gi-filename').textContent   = key;
  document.getElementById('gi-service').textContent   = data.service || '—';
  document.getElementById('gi-client').textContent    = data.client  || '—';
  document.getElementById('gi-role').textContent      = data.role    || '—';
  document.getElementById('gi-domain').textContent    = data.domain  || '—';
  document.getElementById('gi-period').textContent    = data.period  || '—';
  document.getElementById('gi-details').textContent   = data.details || '—';

  // Overview 탭 기본 활성화
  document.querySelectorAll('.gi-tab').forEach(t => t.classList.remove('gi-tab-active'));
  document.querySelectorAll('.gi-panel').forEach(p => p.classList.remove('gi-panel-active'));
  const defTab = document.querySelector('.gi-tab[data-panel="overview"]');
  const defPanel = document.getElementById('gi-panel-overview');
  if (defTab)   defTab.classList.add('gi-tab-active');
  if (defPanel) defPanel.classList.add('gi-panel-active');

  openWindow('getinfo');

  // 화면 중앙 근처 배치
  if (!isMobile()) {
    const w = win.offsetWidth || 360;
    const h = win.offsetHeight || 280;
    win.style.left      = ((window.innerWidth  - w) / 2 + 40) + 'px';
    win.style.top       = ((window.innerHeight - h) / 2 - 20) + 'px';
    win.style.transform = 'none';
  }
}

// Get Info 탭 전환
document.querySelectorAll('.gi-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.gi-tab').forEach(t => t.classList.remove('gi-tab-active'));
    document.querySelectorAll('.gi-panel').forEach(p => p.classList.remove('gi-panel-active'));
    tab.classList.add('gi-tab-active');
    const panel = document.getElementById('gi-panel-' + tab.dataset.panel);
    if (panel) panel.classList.add('gi-panel-active');
  });
});

// 프로젝트 파일 클릭 → 매거진 케이스 스터디 또는 Get Info 오픈
document.querySelectorAll('.pj-finder-row').forEach(row => {
  row.addEventListener('click', () => {
    const key = row.dataset.key;
    if (!key) return;
    const projectId = (window.PROJECT_KEY_TO_ID || {})[key];
    if (projectId) {
      openMagazine(projectId);
    } else {
      openGetInfo(key);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// Project Case Study (Magazine) Window
// ═══════════════════════════════════════════════════════════

const ASPECT_CLASS = {
  '16:9': 'mag-aspect-16-9',
  '4:5':  'mag-aspect-4-5',
  '3:2':  'mag-aspect-3-2',
  '1:1':  'mag-aspect-1-1',
};

const SECTION_TYPE_LABEL = {
  PROBLEM_DEFINITION:    'Problem',
  STRATEGY_PLANNING:     'Strategy',
  DESIGN_SYSTEM_OR_FLOW: 'Design',
  BUSINESS_IMPACT:       'Impact',
};

const TREND_ARROW = { up: '▲', down: '▼', neutral: '–' };

let _magObserver = null;

// 단일 미디어(이미지/플레이스홀더 + 캡션) DOM 생성
function buildMediaEl(media) {
  const wrap = document.createElement('div');
  const aspect = ASPECT_CLASS[media.aspectRatio] || 'mag-aspect-4-5';

  const img = document.createElement('img');
  img.className = `mag-media-img ${aspect}`;
  img.src = media.src;
  img.alt = media.alt || '';
  img.loading = 'lazy';
  img.addEventListener('error', () => {
    const placeholder = document.createElement('div');
    placeholder.className = `mag-media-placeholder ${aspect}`;
    placeholder.innerHTML =
      `<span class="mag-media-placeholder-icon">🖼</span>` +
      `<span class="mag-media-placeholder-text">${media.alt || ''}</span>`;
    img.replaceWith(placeholder);
  }, { once: true });
  wrap.appendChild(img);

  if (media.caption) {
    const cap = document.createElement('div');
    cap.className = 'mag-media-caption';
    cap.textContent = media.caption;
    wrap.appendChild(cap);
  }

  return wrap;
}

// 메트릭 카드 1장 생성
function buildMetricCard(metric) {
  const card = document.createElement('div');
  card.className = `mag-metric-card mag-trend-${metric.trend}` + (metric.highlight ? ' is-highlight' : '');

  const label = document.createElement('div');
  label.className = 'mag-metric-label';
  label.textContent = metric.label;
  card.appendChild(label);

  const values = document.createElement('div');
  values.className = 'mag-metric-values';
  values.innerHTML =
    `<span class="mag-metric-before">${metric.before}</span>` +
    `<span class="mag-metric-arrow">${TREND_ARROW[metric.trend] || '→'}</span>` +
    `<span class="mag-metric-after">${metric.after}</span>`;
  card.appendChild(values);

  return card;
}

// 프로젝트 데이터를 #window-magazine 에 렌더링하고 오픈
function openMagazine(projectId) {
  const list = window.PROJECTS_DATA || [];
  const project = list.find(p => p.id === projectId);
  if (!project) return;

  // ── 헤더 ──
  document.getElementById('mag-win-title').textContent = project.title;
  document.getElementById('mag-titlebar-icon').src = project.icon || 'src/images/icon-projects-32.png';
  document.getElementById('mag-icon').src = project.icon || 'src/images/icon-projects-32.png';
  document.getElementById('mag-title').textContent = project.title;
  document.getElementById('mag-subtitle').textContent = project.subtitle || '';
  document.getElementById('mag-meta-period').textContent = project.period || '—';
  document.getElementById('mag-meta-domain').textContent = project.clientDomain || '—';
  document.getElementById('mag-meta-role').textContent = project.role || '—';
  document.getElementById('mag-meta-contribution').textContent = project.contributionRate || '—';

  // ── 메트릭 스트립 ──
  const metricsEl = document.getElementById('mag-metrics');
  metricsEl.innerHTML = '';
  (project.keyMetrics || []).forEach(m => metricsEl.appendChild(buildMetricCard(m)));

  // ── 본문 (Split-Screen Storyteller) ──
  const storyCol = document.getElementById('mag-story-col');
  const visualStage = document.getElementById('mag-visual-stage');
  storyCol.innerHTML = '';
  visualStage.innerHTML = '';

  (project.sections || []).forEach((section, i) => {
    // 좌측: 텍스트 섹션
    const sec = document.createElement('div');
    sec.className = 'mag-section';
    sec.dataset.index = String(i);

    const typeEl = document.createElement('div');
    typeEl.className = 'mag-section-type';
    typeEl.textContent = SECTION_TYPE_LABEL[section.type] || section.type;
    sec.appendChild(typeEl);

    const titleEl = document.createElement('h3');
    titleEl.className = 'mag-section-title';
    titleEl.textContent = section.title;
    sec.appendChild(titleEl);

    const contentEl = document.createElement('p');
    contentEl.className = 'mag-section-content';
    contentEl.textContent = section.content;
    sec.appendChild(contentEl);

    // 모바일용 인라인 미디어
    if (section.media && section.media.length) {
      const mediaWrap = document.createElement('div');
      mediaWrap.className = 'mag-section-media';
      section.media.forEach(m => mediaWrap.appendChild(buildMediaEl(m)));
      sec.appendChild(mediaWrap);
    }

    storyCol.appendChild(sec);

    // 우측: 비주얼 스테이지 (데스크톱 sync 전용, 섹션의 첫 번째 미디어)
    const stageItem = document.createElement('div');
    stageItem.className = 'mag-visual-media' + (i === 0 ? ' is-active' : '');
    stageItem.dataset.index = String(i);
    const firstMedia = (section.media && section.media[0]) || null;
    if (firstMedia) {
      stageItem.appendChild(buildMediaEl(firstMedia));
    }
    visualStage.appendChild(stageItem);
  });

  // ── 스크롤 동기화 (IntersectionObserver) ──
  if (_magObserver) _magObserver.disconnect();
  const magBody = document.getElementById('mag-body');
  _magObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const idx = entry.target.dataset.index;
      visualStage.querySelectorAll('.mag-visual-media').forEach(el => {
        el.classList.toggle('is-active', el.dataset.index === idx);
      });
    });
  }, { root: magBody, threshold: 0, rootMargin: '-40% 0px -40% 0px' });

  storyCol.querySelectorAll('.mag-section').forEach(sec => _magObserver.observe(sec));

  // ── 이전/다음 프로젝트 내비게이션 ──
  const sorted = [...list].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex(p => p.id === projectId);
  const prevBtn = document.getElementById('mag-prev');
  const nextBtn = document.getElementById('mag-next');
  prevBtn.disabled = idx <= 0;
  nextBtn.disabled = idx >= sorted.length - 1;
  prevBtn.onclick = () => { if (idx > 0) openMagazine(sorted[idx - 1].id); };
  nextBtn.onclick = () => { if (idx < sorted.length - 1) openMagazine(sorted[idx + 1].id); };

  // 본문 스크롤 위치 초기화
  magBody.scrollTop = 0;

  openWindow('magazine');
}

// ═══════════════════════════════════════════════════════════
// Window Resize (drag bottom-right handle)
// ═══════════════════════════════════════════════════════════

document.querySelectorAll('.mac-window').forEach(win => {
  const handle = win.querySelector('.resize-handle');
  if (!handle) return;

  let resizing = false, startX, startY, startW, startH;

  handle.addEventListener('mousedown', e => {
    if (isMobile()) return;
    resizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startW = win.offsetWidth;
    startH = win.offsetHeight;

    // fixed width/height 로 전환
    win.style.width  = startW + 'px';
    win.style.height = startH + 'px';

    bringToFront(win);
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mousemove', e => {
    if (!resizing) return;
    const minW = parseInt(win.style.minWidth)  || parseInt(getComputedStyle(win).minWidth)  || 240;
    const minH = parseInt(win.style.minHeight) || parseInt(getComputedStyle(win).minHeight) || 180;
    const newW = Math.max(minW, startW + (e.clientX - startX));
    const newH = Math.max(minH, startH + (e.clientY - startY));
    win.style.width  = newW + 'px';
    win.style.height = newH + 'px';
  });

  document.addEventListener('mouseup', () => {
    resizing = false;
  });
});

// ─── Real-Time Clock ────────────────────────────────────────
function updateClock() {
  const now = new Date();
  let h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  document.getElementById('clock').textContent = `${h}:${m} ${ampm}`;
}
updateClock();
setInterval(updateClock, 1000);

// ─── Global click sound ─────────────────────────────────────
// 스타트업 버튼 제외한 모든 클릭에 click.wav 재생
document.addEventListener('click', e => {
  if (e.target.closest('#startup-screen')) return; // 스타트업은 제외
  playSound('click');
});

// ─── Helpers ────────────────────────────────────────────────
const isMobile = () => window.innerWidth <= 768 || 'ontouchstart' in window;

let topZ = 100;

function bringToFront(win) {
  topZ += 1;
  win.style.zIndex = topZ;
  document.querySelectorAll('.mac-window').forEach(w => {
    if (w !== win) w.classList.add('inactive');
  });
  win.classList.remove('inactive');
}

// ─── Open Window ────────────────────────────────────────────
function openWindow(id) {
  const win = document.getElementById('window-' + id);
  if (!win) return;

  // Reset to center on desktop
  if (!isMobile()) {
    win.style.left = '50%';
    win.style.top  = '36px';
    win.style.transform = 'translateX(-50%)';
  }

  win.classList.remove('hidden', 'closing');
  void win.offsetWidth; // force reflow so animation restarts cleanly
  win.classList.add('opening');
  bringToFront(win);

  win.addEventListener('animationend', () => {
    win.classList.remove('opening');
  }, { once: true });

  // Show mobile backdrop
  if (isMobile()) {
    document.getElementById('mobile-overlay').classList.add('active');
  }
}

// ─── Close Window ───────────────────────────────────────────
function closeWindow(id) {
  const win = document.getElementById('window-' + id);
  if (!win || win.classList.contains('hidden')) return;

  win.classList.add('closing');
  win.addEventListener('animationend', () => {
    win.classList.add('hidden');
    win.classList.remove('closing');

    // Hide backdrop if no windows remain open
    const stillOpen = document.querySelectorAll('.mac-window:not(.hidden)');
    if (stillOpen.length === 0) {
      document.getElementById('mobile-overlay').classList.remove('active');
    }
  }, { once: true });
}

// ─── Icon Double-Click / Single Touch ───────────────────────
const pendingClick = {};
const DBL_DELAY = 300; // ms

function handleIconTap(icon) {
  const id = icon.dataset.window;
  if (!id || id === 'none') return;
  // Visual selection
  document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
  icon.classList.add('selected');

  const _open = (windowId) => {
    if (windowId === 'blairTunes') return openBlairTunes();
    if (windowId === 'cuseme')     return openCuSeeMe();
    openWindow(windowId);
  };

  if (isMobile()) {
    _open(id);
  } else {
    if (pendingClick[id]) {
      clearTimeout(pendingClick[id]);
      delete pendingClick[id];
      _open(id); // ← double-click confirmed
    } else {
      pendingClick[id] = setTimeout(() => {
        delete pendingClick[id];
      }, DBL_DELAY);
    }
  }
}

// Attach to all icons
document.querySelectorAll('.desktop-icon').forEach(icon => {
  // Click event handles desktop double-click logic
  icon.addEventListener('click', () => handleIconTap(icon));

  // touchend prevents ghost 300ms click on mobile
  icon.addEventListener('touchend', e => {
    e.preventDefault();
    handleIconTap(icon);
  }, { passive: false });
});

// ─── Close Buttons (old handler — replaced by Mac OS 9 handler below) ──

// ─── Bring Window to Front on Click ─────────────────────────
document.querySelectorAll('.mac-window').forEach(win => {
  win.addEventListener('mousedown', () => bringToFront(win));
  win.addEventListener('touchstart', () => bringToFront(win), { passive: true });
});

// ═══════════════════════════════════════════════════════════
// Mac OS 9 Title Bar Interactions
// ═══════════════════════════════════════════════════════════

// ─── Close Box ──────────────────────────────────────────────
document.querySelectorAll('.window-close-btn').forEach(btn => {
  // CU-SeeMe pair buttons have their own handler — skip
  if (btn.classList.contains('cu-close-pair')) return;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    closeWindow(btn.dataset.target);
  });
});

// ─── Collapse Box: Window Shade (접기/펼치기) ─────────────────
const TITLEBAR_H = 20; // titlebar 19px + border 1px

document.querySelectorAll('.titlebar-collapse').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const win = btn.closest('.mac-window');
    if (!win) return;

    if (win.classList.contains('shaded')) {
      // 펼치기: 저장해둔 높이로 복원
      const savedH = win.dataset.shadedPrevH;
      win.classList.remove('shaded');
      win.style.height = savedH || '';
      win.style.overflow = '';
    } else {
      // 접기: 현재 높이 저장 후 타이틀바만 남김
      win.dataset.shadedPrevH = win.style.height ||
        win.getBoundingClientRect().height + 'px';
      win.classList.add('shaded');
      win.style.height   = TITLEBAR_H + 'px';
      win.style.overflow = 'hidden';
    }

    bringToFront(win);
  });
});

// ─── Zoom Box: 최대화/원복 ─────────────────────────────────────
document.querySelectorAll('.titlebar-zoom').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const win = btn.closest('.mac-window');
    if (!win || win.classList.contains('shaded')) return;

    // ── QuickTime Player: Zoom = Player 확장 + Playlist 토글 ──
    if (win.id === 'window-blairTunes') {
      const desk = document.getElementById('desktop').getBoundingClientRect();
      const listW = 320; // playlist 폭

      if (win.classList.contains('zoomed')) {
        // 원복: 저장해둔 크기/위치로 복귀
        win.classList.remove('zoomed');
        win.style.left      = win.dataset.zoomPrevL || '';
        win.style.top       = win.dataset.zoomPrevT || '';
        win.style.width     = win.dataset.zoomPrevW || '';
        win.style.height    = win.dataset.zoomPrevH || '';
        win.style.transform = win.dataset.zoomPrevL ? 'none' : 'translateX(-50%)';
        qtHidePlaylist();
      } else {
        // 현재 상태 저장
        win.dataset.zoomPrevL = win.style.left;
        win.dataset.zoomPrevT = win.style.top;
        win.dataset.zoomPrevW = win.style.width;
        win.dataset.zoomPrevH = win.style.height;

        win.classList.add('zoomed');

        // Player: list 오른쪽에 딱 붙어서 화면 꽉 채움
        win.style.left      = listW + 'px';
        win.style.top       = '0px';
        win.style.width     = (desk.width - listW) + 'px';
        win.style.height    = desk.height + 'px';
        win.style.transform = 'none';

        // Playlist: player와 동일한 top·height, 바로 왼쪽에 딱 붙임
        // (player 크기 반영을 위해 한 프레임 뒤에 실행)
        requestAnimationFrame(() => {
          const pH = win.offsetHeight;
          const pT = parseInt(win.style.top) || 0;
          qtShowPlaylist(listW, pH, pT);
        });
      }
      bringToFront(win);
      return;
    }

    // ── 다른 창: 기존 최대화/원복 동작 ────────────────────────
    const deskRect = document.getElementById('desktop').getBoundingClientRect();

    if (win.classList.contains('zoomed')) {
      win.classList.remove('zoomed');
      win.style.left      = win.dataset.zoomPrevL || '50%';
      win.style.top       = win.dataset.zoomPrevT || '36px';
      win.style.width     = win.dataset.zoomPrevW || '';
      win.style.height    = win.dataset.zoomPrevH || '';
      win.style.transform = win.dataset.zoomPrevL ? 'none' : 'translateX(-50%)';
    } else {
      win.dataset.zoomPrevL = win.style.left;
      win.dataset.zoomPrevT = win.style.top;
      win.dataset.zoomPrevW = win.style.width;
      win.dataset.zoomPrevH = win.style.height;

      win.classList.add('zoomed');
      win.style.left      = '0px';
      win.style.top       = '0px';
      win.style.width     = deskRect.width  + 'px';
      win.style.height    = deskRect.height + 'px';
      win.style.transform = 'none';
    }

    bringToFront(win);
  });
});


// ─── Deselect Icons on Desktop Click ────────────────────────
document.getElementById('desktop').addEventListener('mousedown', e => {
  if (!e.target.closest('.desktop-icon') && !e.target.closest('.mac-window')) {
    document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
  }
});

// ═══════════════════════════════════════════════════════════
// QuickTime Player — 2창 분리 버전
// file:// 호환: IFrame API 없이 iframe.src 교체 + postMessage
// ═══════════════════════════════════════════════════════════

// ── 유튜브 URL → ID 추출 정규식
const extractYtId = url =>
  (url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/) || [])[1] || url;

const QT_PLAYLIST = [
  { title:'Golden Hour',           artist:'JVKE',                  duration:'3:26', ytId: '5O_x20LF1Ak' },
  { title:'Blinding Lights',       artist:'The Weeknd',             duration:'3:20', ytId: extractYtId('https://youtu.be/4NRXx6U8ABQ') },
  { title:'As It Was',             artist:'Harry Styles',           duration:'2:37', ytId: extractYtId('https://youtu.be/H5v3kku4y6Q') },
  { title:'Levitating',            artist:'Dua Lipa',               duration:'3:23', ytId: extractYtId('https://youtu.be/TUVcZfQe-Kw') },
  { title:'Stay',                  artist:'The Kid LAROI',          duration:'2:21', ytId: extractYtId('https://youtu.be/hd7V7yu_PH8') },
  { title:'good 4 u',              artist:'Olivia Rodrigo',         duration:'2:58', ytId: extractYtId('https://youtu.be/gNi_6U5Pm58') },
  { title:'Peaches',               artist:'Justin Bieber',          duration:'3:18', ytId: extractYtId('https://youtu.be/tQ0yjYUFza4') },
  { title:'Montero',               artist:'Lil Nas X',              duration:'2:17', ytId: extractYtId('https://youtu.be/6swmTBVI83k') },
  { title:'Save Your Tears',       artist:'The Weeknd',             duration:'3:35', ytId: extractYtId('https://youtu.be/XXYlFuWEuKI') },
  { title:'Butter',                artist:'BTS',                    duration:'2:42', ytId: extractYtId('https://youtu.be/WMweEpGlu_U') },
  { title:'Permission to Dance',   artist:'BTS',                    duration:'3:05', ytId: extractYtId('https://youtu.be/CuklgrAPa-Y') },
  { title:'Bad Habits',            artist:'Ed Sheeran',             duration:'3:51', ytId: extractYtId('https://youtu.be/orJSJGHjBLI') },
  { title:'Kiss Me More',          artist:'Doja Cat ft. SZA',       duration:'3:33', ytId: extractYtId('https://youtu.be/0EgaV_nEMaU') },
  { title:'Mood',                  artist:'24kGoldn',               duration:'2:21', ytId: extractYtId('https://youtu.be/iik25wqIuFo') },
  { title:'Positions',             artist:'Ariana Grande',          duration:'2:52', ytId: extractYtId('https://youtu.be/tcYodQoapMg') },
  { title:'drivers license',       artist:'Olivia Rodrigo',         duration:'4:02', ytId: extractYtId('https://youtu.be/ZmDBbnmKpqQ') },
  { title:'Heat Waves',            artist:'Glass Animals',          duration:'3:58', ytId: extractYtId('https://youtu.be/mRD0-GxqHVo') },
  { title:'Industry Baby',         artist:'Lil Nas X',              duration:'3:32', ytId: extractYtId('https://youtu.be/UTHLKHL_whs') },
  { title:'Watermelon Sugar',      artist:'Harry Styles',           duration:'2:54', ytId: extractYtId('https://youtu.be/E07s5ZYygMg') },
  { title:'Die For You',           artist:'The Weeknd',             duration:'4:20', ytId: extractYtId('https://youtu.be/mLEbFBjnGKA') },
  { title:'Anti-Hero',             artist:'Taylor Swift',           duration:'3:20', ytId: extractYtId('https://youtu.be/b1kbLwvqugk') },
  { title:'Flowers',               artist:'Miley Cyrus',            duration:'3:21', ytId: extractYtId('https://youtu.be/G7KNmW9a75Y') },
  { title:'Cruel Summer',          artist:'Taylor Swift',           duration:'2:58', ytId: extractYtId('https://youtu.be/ic8j13piAhQ') },
  { title:'Unholy',                artist:'Sam Smith',              duration:'2:36', ytId: extractYtId('https://youtu.be/Uq9gPaIzbe8') },
  { title:'About Damn Time',       artist:'Lizzo',                  duration:'3:13', ytId: extractYtId('https://youtu.be/IXGDtMoer5c') },
  { title:'Running Up That Hill',  artist:'Kate Bush',              duration:'5:00', ytId: extractYtId('https://youtu.be/wp43OdtAAkM') },
  { title:'Starboy',               artist:'The Weeknd',             duration:'3:50', ytId: extractYtId('https://youtu.be/34Na4j8AVgA') },
  { title:'Easy On Me',            artist:'Adele',                  duration:'3:44', ytId: extractYtId('https://youtu.be/U3ASj1L6_sY') },
  { title:'Stay With Me',          artist:'Sam Smith',              duration:'2:52', ytId: extractYtId('https://youtu.be/pB-5XG-DbAA') },
  { title:'Espresso',              artist:'Sabrina Carpenter',      duration:'2:55', ytId: extractYtId('https://youtu.be/eVli-tstM5E') },
];

let qtIdx     = 0;       // 현재 선택된 트랙 인덱스
let qtLoaded  = false;   // iframe에 영상이 로드됐는지
let qtPlaying = false;   // 현재 재생 중인지
let qtTimer   = null;    // 경과 시간 카운터
let qtSec     = 0;       // 경과 초

const qtFmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

// ── 플레이리스트 렌더링 ──────────────────────────────────────
function qtRenderList() {
  const el = document.getElementById('qt-playlist');
  if (!el) return;
  el.innerHTML = QT_PLAYLIST.map((t, i) => `
    <div class="qtp-row${i===qtIdx?' active':''}" data-i="${i}">
      <span class="qtp-col-num">${String(i+1).padStart(2,'0')}</span>
      <span class="qtp-col-title">${t.title}</span>
      <span class="qtp-col-artist">${t.artist}</span>
      <span class="qtp-col-dur">${t.duration}</span>
    </div>`).join('');
}

function qtHighlight(i) {
  document.querySelectorAll('.qtp-row').forEach((r,j) => r.classList.toggle('active', j===i));
  document.querySelector(`.qtp-row[data-i="${i}"]`)?.scrollIntoView({ block:'nearest' });
}

// ── 트랙 선택 (스플래시 유지, 정보만 업데이트) ─────────────
function qtSelect(i) {
  qtIdx = i;
  qtHighlight(i);
  const t = QT_PLAYLIST[i];
  // 스플래시 곡명 업데이트
  const s = document.getElementById('qtp-splash-track');
  if (s) s.textContent = `${t.title} — ${t.artist}`;
  // 컨트롤바 곡 정보
  const ti = document.getElementById('qt-track-title');
  const ta = document.getElementById('qt-track-artist');
  if (ti) ti.textContent = t.title;
  if (ta) ta.textContent = t.artist;
  // 이미 재생 중이면 바로 새 트랙 로드
  if (qtLoaded) qtLoad(i);
}

// ── 실제 재생 로드 ───────────────────────────────────────────
function qtLoad(i) {
  qtIdx = i;
  const t = QT_PLAYLIST[i];

  // 1) iframe src 교체 (사용자 클릭 직후 → 브라우저 autoplay 정책 통과)
  const iframe = document.getElementById('qt-iframe');
  if (!iframe) { console.warn('qt-iframe not found'); return; }
  const origin = encodeURIComponent(location.origin || 'http://localhost:8080');
  iframe.src = `https://www.youtube.com/embed/${t.ytId}?autoplay=1&rel=0&modestbranding=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&origin=${origin}`;
  iframe.style.cssText = 'display:block; position:absolute; inset:0; width:100%; height:100%; border:none; z-index:1;';

  // 2) 스플래시 숨기기 — 영상은 보이되, YouTube 로고/제목 카드는
  //    .qtp-yt-mask-* 오버레이(z-index 3)로 가림
  const splash = document.getElementById('qtp-splash');
  if (splash) splash.style.display = 'none';

  // 3) 상태 업데이트
  qtLoaded  = true;
  qtPlaying = true;
  qtSec     = 0;
  qtHighlight(i);

  const btn = document.getElementById('qt-play');
  if (btn) btn.textContent = '⏸';

  const ti = document.getElementById('qt-track-title');
  const ta = document.getElementById('qt-track-artist');
  if (ti) ti.textContent = t.title;
  if (ta) ta.textContent = t.artist;

  // 4) 경과 시간 + 자동 다음 곡
  clearInterval(qtTimer);
  const dur = qtDuration(i);
  qtTimer = setInterval(() => {
    if (!qtPlaying) return;
    qtSec++;
    const timeEl = document.getElementById('qt-time');
    if (timeEl) timeEl.textContent = qtFmt(qtSec);
    if (dur) {
      const fill = document.getElementById('qtp-fill');
      if (fill) fill.style.width = Math.min(qtSec / dur * 100, 100) + '%';
      if (qtSec >= dur) { clearInterval(qtTimer); qtLoadNext(); }
    }
  }, 1000);
}

function qtDuration(i) {
  const dur = QT_PLAYLIST[i].duration;
  const [m,s] = dur.split(':').map(Number);
  return m*60 + s;
}

function qtLoadNext() { qtLoad((qtIdx + 1) % QT_PLAYLIST.length); }
function qtLoadPrev() { qtLoad((qtIdx - 1 + QT_PLAYLIST.length) % QT_PLAYLIST.length); }

// ── 재생/일시정지 토글 ───────────────────────────────────────
function qtTogglePlay() {
  console.log('[QT] qtTogglePlay called, qtLoaded=', qtLoaded, 'qtIdx=', qtIdx);
  if (!qtLoaded) {
    qtLoad(qtIdx);
    return;
  }
  const iframe = document.getElementById('qt-iframe');
  if (!iframe) return;

  if (qtPlaying) {
    // 일시정지
    iframe.contentWindow?.postMessage(
      '{"event":"command","func":"pauseVideo","args":""}', '*');
    qtPlaying = false;
    const btn = document.getElementById('qt-play');
    if (btn) btn.textContent = '▶';
  } else {
    // 재생 재개
    iframe.contentWindow?.postMessage(
      '{"event":"command","func":"playVideo","args":""}', '*');
    qtPlaying = true;
    const btn = document.getElementById('qt-play');
    if (btn) btn.textContent = '⏸';
  }
}

// ── 볼륨 (postMessage) ──────────────────────────────────────
function qtSetVolume(v) {
  const iframe = document.getElementById('qt-iframe');
  iframe?.contentWindow?.postMessage(
    `{"event":"command","func":"setVolume","args":[${v}]}`, '*');
}

// ── 양창 함께 닫기 ──────────────────────────────────────────
function qtCloseBoth() {
  closeWindow('blairTunes');
  closeWindow('qt-playlist');
  // iframe 초기화
  const iframe = document.getElementById('qt-iframe');
  if (iframe) { iframe.src = 'about:blank'; iframe.style.display = 'none'; }
  const splash = document.getElementById('qtp-splash');
  if (splash) splash.style.display = 'flex';
  qtLoaded = false; qtPlaying = false;
  clearInterval(qtTimer);
  const fill = document.getElementById('qtp-fill');
  if (fill) fill.style.width = '0%';
}

// ── Blair-Tunes 열기 (Player만, Playlist는 Zoom 시 등장) ─────
function openBlairTunes() {
  if (!document.getElementById('qt-playlist')?.children.length) {
    qtRenderList();
  }

  // Player 창만 오픈 — Playlist는 숨긴 상태 유지
  openWindow('blairTunes');

  if (!isMobile()) {
    const pad = 12;
    const playerEl = document.getElementById('window-blairTunes');
    const pw = playerEl?.offsetWidth  || 400;
    const ph = playerEl?.offsetHeight || 280;

    if (playerEl) {
      playerEl.style.left      = (window.innerWidth  - pw - pad) + 'px';
      playerEl.style.top       = (window.innerHeight - ph - pad) + 'px';
      playerEl.style.transform = 'none';
    }
  }

  // 자동재생
  setTimeout(() => qtLoad(0), 300);
}

// ── Playlist 노출 (Player 왼쪽 전체 높이로 고정) ─────────────
function qtShowPlaylist(w, h, top) {
  const player   = document.getElementById('window-blairTunes');
  const playlist = document.getElementById('window-qt-playlist');
  if (!player || !playlist) return;

  const listW = w   || 300;
  const listH = h   || player.offsetHeight;
  const listT = top || parseInt(player.style.top) || 0;

  // Player 바로 왼쪽, 같은 top, 같은 height
  playlist.style.left      = '0px';
  playlist.style.top       = listT + 'px';
  playlist.style.width     = listW + 'px';
  playlist.style.height    = listH + 'px';
  playlist.style.maxHeight = listH + 'px';
  playlist.style.transform = 'none';

  openWindow('qt-playlist');
  bringToFront(player);
}

// ── Playlist 숨기기 ───────────────────────────────────────────
function qtHidePlaylist() {
  const playlist = document.getElementById('window-qt-playlist');
  if (playlist) {
    playlist.style.height    = '';
    playlist.style.maxHeight = '';
  }
  closeWindow('qt-playlist');
}

// ── 플레이리스트 클릭 이벤트 ────────────────────────────────
document.addEventListener('click', e => {
  // 플레이리스트 행 클릭
  const row = e.target.closest('.qtp-row');
  if (row) {
    const i = +row.dataset.i;
    if (e.detail >= 2) qtLoad(i);
    else               qtSelect(i);
    return;
  }

  // 두 창 닫기 버튼 연동
  const closeBtn = e.target.closest('.window-close-btn');
  if (closeBtn) {
    const tgt = closeBtn.dataset.target;
    if (tgt === 'blairTunes' || tgt === 'qt-playlist') {
      e.stopPropagation();
      qtCloseBoth();
    }
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'qt-vol') qtSetVolume(+e.target.value);
});

// ─── Menu Bar Interactions ───────────────────────────────────
document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('pressed'));
    item.classList.add('pressed');
    setTimeout(() => item.classList.remove('pressed'), 150);

    const target = item.dataset.window;
    if (target) openWindow(target);
  });
});

// ─── Window Drag (desktop only) ─────────────────────────────
document.querySelectorAll('.mac-window').forEach(win => {
  const titlebar = win.querySelector('.window-titlebar');
  let dragging = false;
  let ox = 0, oy = 0; // offset from pointer to window top-left

  titlebar.addEventListener('mousedown', e => {
    if (isMobile()) return;
    if (e.target.closest('.window-close-btn')) return;
    if (e.target.closest('.titlebar-collapse')) return;
    if (e.target.closest('.titlebar-zoom'))     return;
    if (win.classList.contains('zoomed')) return; // 최대화 상태에서는 드래그 불가

    bringToFront(win);
    dragging = true;

    // Switch from percentage centering to fixed pixels
    const rect = win.getBoundingClientRect();
    const desktop = document.getElementById('desktop').getBoundingClientRect();
    win.style.left      = (rect.left - desktop.left) + 'px';
    win.style.top       = (rect.top  - desktop.top)  + 'px';
    win.style.transform = 'none';

    ox = e.clientX - rect.left;
    oy = e.clientY - rect.top;

    win.classList.add('dragging');
    titlebar.classList.add('drag-handle');
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const desktop = document.getElementById('desktop').getBoundingClientRect();
    const newLeft = e.clientX - ox - desktop.left;
    const newTop  = e.clientY - oy - desktop.top;
    win.style.left = newLeft + 'px';
    win.style.top  = newTop  + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    win.classList.remove('dragging');
    titlebar.classList.remove('drag-handle');
  });
});
