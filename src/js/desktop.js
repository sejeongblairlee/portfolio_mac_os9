'use strict';

// ── 메뉴바 시계 — "Mon Jun 10  9:41 AM" 포맷 ──────────────────────────────
function tickClock() {
  const d = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  document.getElementById('clock').textContent =
    days[d.getDay()] + ' ' + mons[d.getMonth()] + ' ' + d.getDate() +
    '  ' + h + ':' + m + ' ' + ap;
}
tickClock();
setInterval(tickClock, 1000);

// ── 창 닫기 ────────────────────────────────────────────────────────────────
document.querySelectorAll('.cu-close').forEach((btn) => {
  btn.addEventListener('click', () => {
    const winId = btn.dataset.win;
    document.getElementById(winId).style.display = 'none';
    // win-you 닫힐 때 카메라 스트림 완전 종료 (브라우저 카메라 사용 표시 제거)
    if (winId === 'win-you') {
      if (ditherRafId) { cancelAnimationFrame(ditherRafId); ditherRafId = null; }
      filterOn = false;
      if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; }
    }
  });
});

// ── 반응형 초기 배치 + 세이프 에어리어 — 규칙은 design.md 참조 ─────────────
const SAFE = 20;

function clampToSafeArea(x, y, winW, winH, vw, vh) {
  const maxX = Math.max(vw - winW - SAFE, SAFE);
  const maxY = Math.max(vh - winH - SAFE, SAFE);
  return [
    Math.min(Math.max(x, SAFE), maxX),
    Math.min(Math.max(y, SAFE), maxY),
  ];
}

function layoutWindows() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const mobile = vw <= 768;   // 단일 브레이크포인트 — design.md와 동일 값
  const local = document.getElementById('win-local');
  const you = document.getElementById('win-you');
  const wins = [local, you].filter((w) => w.style.display !== 'none');
  if (!wins.length) return;

  // 폭/비디오 높이는 CSS가 결정 (min(320px, 100vw - 40px) + aspect-ratio 3/2)
  // JS는 위치만 계산 → 리사이즈 시 좌우 흔들림 없음 (결정적 포지션)
  const winW = wins[0].offsetWidth;

  // 위치: 사용자가 드래그한 창은 리셋하지 않고 세이프 에어리어로 클램프만
  const place = (w, x, y) => {
    if (w.dataset.dragged) {
      const [cx, cy] = clampToSafeArea(w.offsetLeft, w.offsetTop, w.offsetWidth, w.offsetHeight, vw, vh);
      w.style.left = cx + 'px';
      w.style.top = cy + 'px';
      return;
    }
    const [cx, cy] = clampToSafeArea(x, y, w.offsetWidth, w.offsetHeight, vw, vh);
    w.style.left = cx + 'px';
    w.style.top = cy + 'px';
  };

  if (mobile) {
    // 수직 스택, 중앙 정렬 — ±8px 오프셋은 장식용, 세이프 에어리어 우선
    const centerX = (vw - winW) / 2;
    const off = Math.min(8, Math.max(0, centerX - SAFE));
    place(local, centerX - off, 120);
    const belowY = local.style.display !== 'none'
      ? local.offsetTop + local.offsetHeight + 18
      : 120;
    place(you, centerX + off, belowY);
  } else {
    // 중앙 근처, 어긋난 스태거 배치 (일렬 정렬 금지) — 폭은 320px 고정
    const lh = local.offsetHeight, yh = you.offsetHeight;
    place(local, vw / 2 - winW - 24, vh / 2 - lh / 2 - 24);
    place(you, vw / 2 + 24, vh / 2 - yh / 2 + 24);
  }
}
layoutWindows();
window.addEventListener('resize', layoutWindows);
// 초기 상태: Works도 기본으로 같이 열어두되 맨 밑에 깔리게 — CU-SeeMe 두 창보다
// 먼저 openCenteredDraggableWin()으로 z-index를 받아야 더 낮은 값이 됨.
// openCenteredDraggableWin/updateWorksScrollbar는 파일 아래쪽(Works 섹션)에서
// 선언되지만 함수 선언이라 호이스팅되고, 이 콜백은 RAF라 스크립트 전체가
// 동기 실행을 마친 뒤에야 실행되므로 아래쪽 const(winWorks 등)도 이미 준비돼 있음.
requestAnimationFrame(() => {
  openCenteredDraggableWin(document.getElementById('win-works'));
  updateWorksScrollbar();
  // CU-SeeMe 두 창을 Works보다 위로 — Remote 먼저, Local 마지막(icon-seeme
  // 재오픈 로직과 동일 순서, 최종적으로 Local이 맨 위=기본 포커스).
  focusWin(document.getElementById('win-you'));
  focusWin(document.getElementById('win-local'));
  openCenteredDraggableWin(document.getElementById('win-welcome'));
});

// ── 창 드래그 + 포커스 z-index (포인터 이벤트 — 마우스/터치 공용) ──────────
// 10씩 증가 — blairtunes.js가 자기 YT iframe 도크를 "호스트 창 z-index + 1"에
// 둬야 해서(도크는 항상 자기 창 바로 위, 하지만 다른 창을 앞으로 가져오면
// 그 창보다는 아래여야 함), 1씩만 증가하면 바로 다음 포커스가 정확히
// "호스트+1"과 같은 값을 받아버려 동점이 나는 걸 실측으로 확인함(동점이면
// DOM 순서로 도크가 이겨서 방금 앞으로 온 다른 창 위에 잘못 뜸). 10씩 띄우면
// +1~+9 사이는 항상 안전한 여유 구간이 된다.
let topZ = 100;
function nextZ() { return (topZ += 10); }
function focusWin(win) {
  document.querySelectorAll('.cu-win').forEach((w) => w.classList.remove('focused'));
  win.classList.add('focused');
  win.style.zIndex = nextZ();
}
// blairtunes.js(별도 스크립트, .bt-win/.bt-mini에 z-index:500/510이 하드코딩돼
// 있었음)처럼 이 파일 밖에서도 같은 "클릭한 창이 맨 위로" 스택에 참여할 수 있게
// 전역으로 노출 — window.__tigerRun 패턴과 동일한 컨벤션(옵셔널 체이닝으로 호출).
window.__bringToFront = (el) => { el.style.zIndex = nextZ(); };
document.querySelectorAll('.cu-win').forEach((win) => {
  // 창 아무 곳이나 클릭/탭 → 맨 앞으로 + 포커스 섀도
  win.addEventListener('pointerdown', () => focusWin(win));

  const header = win.querySelector('.cu-header');
  let dragging = false, pid = null, startX = 0, startY = 0, origX = 0, origY = 0;

  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.cu-close')) return;   // 닫기 버튼은 드래그 시작 안 함
    dragging = true;
    pid = e.pointerId;
    header.setPointerCapture(pid);
    startX = e.clientX;
    startY = e.clientY;
    origX = win.offsetLeft;
    origY = win.offsetTop;
    win.classList.add('dragging');
    win.dataset.dragged = '1';   // 리사이즈 시 위치 리셋 안 함 (design.md)
    e.preventDefault();
  });

  header.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pid) return;
    let nx = origX + (e.clientX - startX);
    let ny = origY + (e.clientY - startY);
    // 뷰포트 경계: 살짝은 나가되 타이틀바(24px)는 항상 잡을 수 있게
    const minVisible = 60;
    nx = Math.max(-win.offsetWidth + minVisible, Math.min(nx, window.innerWidth - minVisible));
    ny = Math.max(0, Math.min(ny, window.innerHeight - 24));
    win.style.left = nx + 'px';
    win.style.top = ny + 'px';
  });

  const endDrag = (e) => {
    if (!dragging || e.pointerId !== pid) return;
    dragging = false;
    win.classList.remove('dragging');
  };
  header.addEventListener('pointerup', endDrag);
  header.addEventListener('pointercancel', endDrag);
});

// ── You (Remote): 웹캠 — 브라우저 카메라 권한 요청 후 표시 ─────────────────
const youVideo = document.getElementById('you-video');
const youCanvas = document.getElementById('you-canvas');
const youMsg = document.getElementById('you-msg');
let camStream = null;
let camMuted = false;
let filterOn = false;

async function initCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    youMsg.innerHTML = 'Camera not<br>available';
    return;
  }
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 }, audio: false,
    });
    youVideo.srcObject = camStream;
    youMsg.style.display = 'none';
    youVideo.style.display = 'block';
  } catch (e) {
    youMsg.innerHTML = 'Camera blocked<br>allow &amp; reload';
  }
}
initCamera();

// ── FILTER: 소프트 흑백 + 은은한 하프톤 (hello 영상과 동일한 룩) ───────────
// 그레이스케일 → 대비 0.9·밝기 1.05 → 파인 Bayer 도트를 multiply 18%로만 블렌드
const BAYER4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
];

// 픽셀별 Bayer 도트 계산 (you-canvas / local-canvas 공용)
function applyBayerDither(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114;
      let base = ((lum - 128) * 0.9 + 128) * 1.05;
      base = base < 0 ? 0 : (base > 255 ? 255 : base);
      const dot = base / 255 > (BAYER4[y % 4][x % 4] + 0.5) / 16;
      const v = dot ? base : base * 0.82;
      d[i] = d[i+1] = d[i+2] = v;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// you-canvas: 웹캠 실시간 도트 필터 (BACK TO 90's 토글)
// 15fps 제한 — 레트로 느낌 + local-canvas 루프와 getImageData 겹침 방지
const youCtx = youCanvas.getContext('2d');
const YOU_W = youCanvas.width, YOU_H = youCanvas.height;
let ditherRafId = null;
let lastDitherTime = 0;
function ditherLoop(now) {
  if (!filterOn || !camStream) { ditherRafId = null; return; }
  if (now - lastDitherTime >= 66) {  // ~15fps
    lastDitherTime = now;
    youCtx.save();
    youCtx.scale(-1, 1);
    youCtx.drawImage(youVideo, -YOU_W, 0, YOU_W, YOU_H);
    youCtx.restore();
    applyBayerDither(youCtx, YOU_W, YOU_H);
  }
  ditherRafId = requestAnimationFrame(ditherLoop);
}

document.getElementById('btn-filter').addEventListener('click', () => {
  if (!camStream) return;
  // 기존 루프를 먼저 취소 — 빠른 연속 클릭으로 루프가 중복 실행되는 버그 방지
  if (ditherRafId) { cancelAnimationFrame(ditherRafId); ditherRafId = null; }
  filterOn = !filterOn;
  // you-video는 절대 display:none으로 숨기지 않는다 — 숨겨진 <video>는 브라우저가
  // 디코딩을 스로틀링해서(특히 모바일) drawImage가 그 시점 프레임에 멈춰버리는
  // "필터 누르면 영상이 멈추는" 버그의 원인이었음(video/canvas가 같은 자리에
  // 절대위치로 겹쳐있으니, video는 항상 켜둔 채로 canvas만 위에 덮어서 해결).
  youCanvas.style.display = filterOn ? 'block' : 'none';
  if (filterOn) ditherLoop();
});

// ── MUTE CAM ───────────────────────────────────────────────────────────────
document.getElementById('btn-mute').addEventListener('click', (e) => {
  if (!camStream) return;
  camMuted = !camMuted;
  camStream.getVideoTracks().forEach((t) => { t.enabled = !camMuted; });
  if (camMuted) {
    // 여기서도 video/canvas는 숨기지 않음 — you-msg(불투명 흰 배경, inset:0)가
    // 그 위를 완전히 덮으므로 안 보여도 되고, 숨기면 위와 동일한 프리즈 버그가 남는다.
    youMsg.innerHTML = 'Cam off';
    youMsg.style.display = 'flex';
    e.target.textContent = 'CAM ON';
  } else {
    youMsg.style.display = 'none';
    // 루프가 이미 실행 중이면 새로 시작하지 않음 (mute 중에도 루프는 유지됨)
    if (filterOn && !ditherRafId) ditherLoop();
    e.target.textContent = 'MUTE CAM';
  }
});

// ── local-canvas: Sejeong Lee 영상에 Bayer 도트 적용 ─────────────────────
// requestVideoFrameCallback으로 영상 프레임 갱신 시에만 처리 (24fps 수준)
// — RAF(60fps) 대신 사용해서 you-canvas 루프와 getImageData 충돌 방지
const localVideo = document.getElementById('local-video');
const localCanvas = document.getElementById('local-canvas');
(function startLocalDither() {
  const winLocal = document.getElementById('win-local');
  const ctx = localCanvas.getContext('2d');
  const w = localCanvas.width, h = localCanvas.height;
  const useVFC = typeof localVideo.requestVideoFrameCallback === 'function';

  function processFrame() {
    if (winLocal.style.display === 'none') return;
    if (localVideo.readyState >= 2) {
      ctx.drawImage(localVideo, 0, 0, w, h);
      applyBayerDither(ctx, w, h);
    }
    if (useVFC) localVideo.requestVideoFrameCallback(processFrame);
    else requestAnimationFrame(processFrame);
  }

  new MutationObserver(() => {
    if (winLocal.style.display !== 'none') {
      if (useVFC) localVideo.requestVideoFrameCallback(processFrame);
      else processFrame();
    }
  }).observe(winLocal, { attributes: true, attributeFilter: ['style'] });

  function onReady() {
    localCanvas.style.display = 'block';
    if (useVFC) localVideo.requestVideoFrameCallback(processFrame);
    else processFrame();
  }
  if (localVideo.readyState >= 2) { onReady(); }
  else { localVideo.addEventListener('loadeddata', onReady, { once: true }); }
})();

// ── 이펙트: Photo Booth 스타일 (픽셀 스프라이트) ───────────────────────────
// SHOW LOVE / GIMME LOVE — 빨간 픽셀 하트가 흔들리며 떠오름
// FREE BIRDS — 파랑새가 날개를 퍼덕이며 화면을 가로질러 비행

// Susan Kare "Heart" 픽셀 아이콘 (Esc Keys 커뮤니티 파일, Figma
// g9siOrhHKSg8Is4wdeWOdF node 1:10805) 그대로 재현 — SHOW LOVE/GIMME LOVE.
// 13×12 그리드, 대부분 행이 연속 구간이라 행별 [시작열,끝열] range로 인코딩
// (sudoku.js의 하트와 동일한 좌표 데이터). 색은 요청대로 빨강 한 가지 고정.
// 이름을 CU_ 접두어로 분리한 이유: <script> 최상위 const/let은 서로 다른
// 파일이라도 같은 이름이면 나중에 로드되는 스크립트가 "Identifier has
// already been declared" SyntaxError로 통째로 죽는다(실측 확인) — sudoku.js
// 쪽 이름(HEART_ROW_RANGES 등)과 절대 겹치면 안 됨.
const CU_HEART_ROW_RANGES = [
  [[2, 4], [8, 10]],
  [[1, 5], [7, 11]],
  [[0, 1], [4, 12]],
  [[0, 1], [3, 12]],
  [[0, 12]],
  [[0, 12]],
  [[1, 11]],
  [[2, 10]],
  [[3, 9]],
  [[4, 8]],
  [[5, 7]],
  [[6, 6]],
];
function heartSVG(size, color) {
  color = color || '#FF2D55';   // 기본값 = CU-SeeMe SHOW LOVE 레드, 다른 색은 옵션으로만
  const rects = CU_HEART_ROW_RANGES.map((ranges, row) =>
    ranges.map(([c0, c1]) =>
      '<rect x="' + c0 + '" y="' + row + '" width="' + (c1 - c0 + 1) + '" height="1" fill="' + color + '"/>'
    ).join('')
  ).join('');
  // xmlns 필수 — 인라인 innerHTML로 꽂을 땐 없어도 되지만(HTML 파서가 알아서
  // 네임스페이스 처리), data:image/svg+xml URI로 <img src>에 그대로 쓰려면
  // (메뉴바 내비게이션 About Me 아이콘) 독립된 XML 문서로 파싱되어야 해서
  // xmlns 없으면 로드 자체가 조용히 실패한다(naturalWidth 0) — 실제로 겪은 버그.
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + Math.round(size * 12 / 13) + '" viewBox="0 0 13 12" shape-rendering="crispEdges">' + rects + '</svg>';
}

function birdSVG(size, flip) {
  // 파랑새 2프레임(날개 위/아래) — CSS steps로 퍼덕임
  const body =
    '<rect x="3" y="5" width="8" height="4" fill="#3E7BFA"/>' +          // 몸통
    '<rect x="10" y="3" width="3" height="4" fill="#3E7BFA"/>' +         // 머리
    '<rect x="13" y="4" width="2" height="2" fill="#F5A623"/>' +         // 부리
    '<rect x="11" y="4" width="1" height="1" fill="#000"/>' +            // 눈
    '<rect x="4" y="8" width="6" height="2" fill="#FFF"/>' +             // 배
    '<rect x="0" y="4" width="3" height="2" fill="#2456C4"/>';           // 꼬리
  const wingUp = '<g class="fr1">' +
    '<rect x="5" y="0" width="4" height="2" fill="#2456C4"/>' +
    '<rect x="4" y="2" width="5" height="3" fill="#2E63D9"/></g>';
  const wingDown = '<g class="fr2">' +
    '<rect x="4" y="9" width="5" height="2" fill="#2E63D9"/>' +
    '<rect x="5" y="11" width="4" height="1" fill="#2456C4"/></g>';
  return '<svg width="' + size + '" height="' + Math.round(size * 12 / 15) + '" viewBox="0 0 15 12" ' +
    'shape-rendering="crispEdges" style="transform:scaleX(' + (flip ? -1 : 1) + ')">' +
    body + wingUp + wingDown + '</svg>';
}

function spawnHearts(wrapId) {
  const wrap = document.getElementById(wrapId);
  const H = wrap.clientHeight;
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('span');
    p.className = 'fx fx-heart';
    p.style.left = (5 + Math.random() * 85) + '%';
    p.style.setProperty('--dur', (2.2 + Math.random() * 1.3).toFixed(2) + 's');
    p.style.setProperty('--rise', -(H * 0.7 + Math.random() * H * 0.3 + 24).toFixed(0) + 'px');
    p.style.setProperty('--amp', (4 + Math.random() * 9).toFixed(0) + 'px');
    p.style.setProperty('--swaydur', (0.55 + Math.random() * 0.5).toFixed(2) + 's');
    p.style.animationDelay = (Math.random() * 0.9).toFixed(2) + 's';
    const sway = '<span class="sway" style="animation-delay:-' + (Math.random() * 1).toFixed(2) + 's">' +
      heartSVG(Math.round(12 + Math.random() * 18)) + '</span>';
    p.innerHTML = sway;
    wrap.appendChild(p);
    setTimeout(() => p.remove(), 4800);
  }
}

function spawnBirds(wrapId) {
  const wrap = document.getElementById(wrapId);
  const W = wrap.clientWidth;
  for (let i = 0; i < 6; i++) {
    const b = document.createElement('span');
    b.className = 'fx fx-bird';
    const fromLeft = Math.random() < 0.5;
    const size = Math.round(24 + Math.random() * 16);
    b.style.top = (6 + Math.random() * 55) + '%';
    b.style.left = fromLeft ? (-size - 10) + 'px' : (W + 10) + 'px';
    b.style.setProperty('--dist', ((W + size * 2 + 20) * (fromLeft ? 1 : -1)) + 'px');
    b.style.setProperty('--dur', (2.0 + Math.random() * 1.4).toFixed(2) + 's');
    b.style.animationDelay = (Math.random() * 0.8).toFixed(2) + 's';
    b.innerHTML = '<span class="bob" style="animation-delay:-' + (Math.random() * 0.5).toFixed(2) + 's">' +
      birdSVG(size, !fromLeft) + '</span>';
    wrap.appendChild(b);
    setTimeout(() => b.remove(), 4600);
  }
}

document.getElementById('btn-love').addEventListener('click', () => spawnHearts('local-video-wrap'));
document.getElementById('btn-birds').addEventListener('click', () => spawnBirds('local-video-wrap'));
document.getElementById('btn-gimme').addEventListener('click', () => spawnHearts('you-video-wrap'));

// ── SAY HI! → 이메일 ───────────────────────────────────────────────────────
document.getElementById('mb-contact').addEventListener('click', () => {
  window.location.href = 'mailto:whynotblair@gmail.com';
});
document.getElementById('btn-sayhi').addEventListener('click', () => {
  window.location.href = 'mailto:whynotblair@gmail.com';
});

// ── "About me" 메뉴 → 소개 창(About Me) 정중앙에 열기 ───────────────────────
// 다른 팝업들과 사용성 통일 — CU-SeeMe와 같은 방식으로 드래그 가능(모바일
// 포함, About은 풀스크린으로 전환되지 않고 계속 작은 카드로 뜨기 때문).
// z-index는 다른 창들과 공유하는 topZ 카운터에 태워서 맨 앞으로 오게 한다.
const winAbout = document.getElementById('win-about');
document.getElementById('mb-about').addEventListener('click', () => {
  openCenteredDraggableWin(winAbout);
});
winAbout.addEventListener('pointerdown', () => { winAbout.style.zIndex = nextZ(); });
document.getElementById('about-close').addEventListener('click', () => {
  winAbout.style.display = 'none';
});
document.getElementById('about-say-hi').addEventListener('click', () => {
  window.open('https://www.instagram.com/whynotblair', '_blank', 'noopener,noreferrer');
});
makeCenteredWinDraggable(winAbout, winAbout.querySelector('.about-header'), '.about-close');

const winWelcome = document.getElementById('win-welcome');
winWelcome.addEventListener('pointerdown', () => { winWelcome.style.zIndex = nextZ(); });
document.getElementById('welcome-close').addEventListener('click', () => {
  winWelcome.style.display = 'none';
});
makeCenteredWinDraggable(winWelcome, winWelcome.querySelector('.welcome-header'), '.welcome-close');

// "Last updated" — 손으로 날짜 고칠 필요 없이 저장소 최신 커밋 날짜를 그대로
// 보여줌(/api/last-updated, GitHub API를 감싼 캐시된 서버리스 함수). 실패해도
// (로컬 정적 서버, API 불가 등) 마크업에 있던 날짜를 그대로 두고 조용히 무시.
fetch('/api/last-updated')
  .then((res) => (res.ok ? res.json() : null))
  .then((body) => {
    if (body?.date) {
      document.getElementById('about-updated').textContent = `Last updated ${body.date}`;
    }
  })
  .catch(() => {});

// ── 프로젝트 상세 준비중 팝업(Figma 97:2319) — Works 카드 클릭 시 뜸 ────────
const winProject = document.getElementById('win-project');
winProject.addEventListener('pointerdown', () => { winProject.style.zIndex = nextZ(); });
document.getElementById('proj-close').addEventListener('click', () => {
  winProject.style.display = 'none';
});
document.getElementById('proj-cheer').addEventListener('click', () => {
  winProject.style.display = 'none';
});
makeCenteredWinDraggable(winProject, winProject.querySelector('.proj-header'), '.proj-close');

// Glider 4.0 — 아직 콘텐츠가 없어서 Works 카드와 동일한
// "작업중입니다" 팝업을 그대로 재사용(같은 winProject 공유, 별도 창 아님).
document.getElementById('icon-glider').addEventListener('click', () => {
  openCenteredDraggableWin(winProject);
});

// ── "Works" 아이콘 → 프로젝트 리스트 창(Works) 화면 정중앙에 열기 ───────────
// Figma 94:808 — 2열 그리드(모바일 1열) + 우측 픽셀 스타일 커스텀 스크롤바.
// 전 항목 실제 프로젝트 이미지 (2026-07-22 Figma 업데이트 반영). 이미지는
// 전부 Figma 노드를 2x(652×652)로 export해서 레티나에서도 또렷하게 보인다
// (work-thumb 표시 크기는 326px 기준이라 2x면 실제 표시 밀도가 2배).
const WORKS_ITEMS = [
  { title: 'Portfolio Old Mac OS ver.', desc: 'A to Z..', img: 'src/images/works/portfolio-old-macos.jpg' },
  { title: 'DaLock', desc: 'Product Design, Design System, Rebranding', img: 'src/images/works/dalock.jpg' },
  { title: 'Samsungcard monimo', desc: 'UX Strategy, UX Planning', img: 'src/images/works/samsungcard-monimo.jpg' },
  { title: 'F&F MLB Discovery SUPRA', desc: 'Team Lead, UX Strategy\nUX Design, Design System', img: 'src/images/works/ff-mlb-supra.jpg' },
  { title: 'CJ ENM Eddy', desc: 'Team Lead, Service Strategy, UX Design', img: 'src/images/works/cj-enm-eddy.jpg' },
  { title: 'SHINSEGAE S.I.Village', desc: 'Service Strategy', img: 'src/images/works/shinsegae-sivillage.jpg' },
  { title: 'LOTTECARD LOCA', desc: 'UX Stategy, UX Design', img: 'src/images/works/lottecard-loca.jpg' },
  { title: 'SKT T Factory', desc: 'UI Design, Design System', img: 'src/images/works/skt-t-factory.jpg' },
  { title: 'LINA TMR Assitant', desc: 'User Research, UX Design', img: 'src/images/works/lina-tmr.jpg' },
  { title: 'LOTTE ON', desc: 'User Research, UX Strategy, UX Design', img: 'src/images/works/lotte-on.jpg' },
  { title: 'CJ Viewing', desc: 'Design System, UI Design', img: 'src/images/works/cj-viewing.jpg' },
];
const worksGrid = document.getElementById('works-grid');
WORKS_ITEMS.forEach((item) => {
  const el = document.createElement('div');
  el.className = 'works-item';
  const thumb = document.createElement('div');
  thumb.className = 'works-thumb';
  if (item.img) {
    const img = document.createElement('img');
    img.src = item.img;
    img.alt = item.title;
    img.loading = 'lazy';
    thumb.appendChild(img);
  }
  const info = document.createElement('div');
  info.className = 'works-info';
  const title = document.createElement('p');
  title.className = 'works-title';
  title.textContent = item.title;
  const desc = document.createElement('p');
  desc.className = 'works-desc';
  desc.textContent = item.desc;
  info.append(title, desc);
  el.append(thumb, info);
  worksGrid.appendChild(el);
});

// 프로젝트 카드 클릭 → 상세 준비중 팝업(Figma 97:2319). 아직 프로젝트별 상세
// 페이지가 없어서 어떤 카드를 눌러도 동일한 "작업중입니다" 안내만 뜬다 —
// 이벤트 위임이라 winProject가 이 시점엔 아직 선언 전이어도 문제없음(클릭은
// 스크립트 전체 실행이 끝난 뒤에야 발생하므로).
worksGrid.addEventListener('click', (e) => {
  if (e.target.closest('.works-item')) openCenteredDraggableWin(winProject);
});

// 픽셀 스크롤바(Figma 71:3350) 공용 싱크 헬퍼 — Works/Film/Blair-tunes가 전부
// 이 함수 하나로 핸들 높이/위치를 계산한다. 스크롤할 콘텐츠가 없으면(뷰포트
// 안에 다 들어감) 핸들을 [hidden]으로 완전히 숨긴다 — 예전에는 이럴 때
// 트랙 전체를 채워서 "스크롤 없음"을 표시했는데, 실제로 스크롤 영역이 없는데
// 핸들만 항상 떠 있는 게(예: Blair-tunes 트랙리스트) 오해를 줘서 정정함.
// blairtunes.js(별도 스크립트)도 그대로 재사용할 수 있게 전역으로 노출
// (window.__bringToFront와 동일한 컨벤션).
function syncPixelScrollbar(track, handle, viewH, contentH, scrollTop) {
  if (contentH <= viewH + 1) {
    handle.hidden = true;
    return;
  }
  handle.hidden = false;
  const PAD = 1;   // .pixel-scrollbar의 상하 padding과 동일 — CSS와 여기 값이 어긋나면 안 됨
  const usable = Math.max(0, track.clientHeight - PAD * 2);
  const handleH = Math.max(20, usable * (viewH / contentH));
  const maxTop = usable - handleH;
  const scrollable = contentH - viewH;
  const top = scrollable > 0 ? (scrollTop / scrollable) * maxTop : 0;
  handle.style.height = handleH + 'px';
  handle.style.top = (PAD + top) + 'px';
}
window.__syncPixelScrollbar = syncPixelScrollbar;

const worksScroll = document.getElementById('works-scroll');
const worksTrack = document.getElementById('works-scrollbar');
const worksThumb = document.getElementById('works-scrollbar-thumb');
function updateWorksScrollbar() {
  syncPixelScrollbar(worksTrack, worksThumb, worksScroll.clientHeight, worksScroll.scrollHeight, worksScroll.scrollTop);
}
worksScroll.addEventListener('scroll', updateWorksScrollbar);
window.addEventListener('resize', updateWorksScrollbar);

// 중앙 고정 모달(About/Works/Film 전부)을 CU-SeeMe와 같은 방식으로 드래그
// 가능하게 만드는 공용 헬퍼 — "팝업은 사용성 다 공통"이라는 요청에 따라
// CU-SeeMe의 포인터 드래그 로직(경계 클램프 포함)을 그대로 재사용. 드래그를
// 시작하기 전까지는 CSS(top:50%+transform)가 계속 중앙 정렬을 담당 — 그래서
// 한 번도 안 끌고 닫았다 다시 열면 매번 그 시점 뷰포트 기준으로 재중앙정렬된다.
// 드래그를 시작하는 순간에만 그 렌더 위치를 절대 px(left/top)로 굳히고
// transform을 제거한다(위치는 시각적으로 동일, dataset.dragged로 표시).
// 이후로는 CU-SeeMe처럼 닫았다 열어도 마지막으로 끌어놓은 자리를 유지한다.
// Works/Film/AI Images도 예전엔 disableOnMobile=true로 좁은 폭에서 드래그/리사이즈를
// 꺼버렸는데, 그 판정이 실제 모바일 기기가 아니라 순전히 window.innerWidth로만
// 이뤄져서 데스크탑에서 창을 좁게 쓰기만 해도 "리사이즈가 안 된다"는 리포트로
// 이어졌다. Blair-tunes 플레이어처럼 폭과 무관하게 항상 드래그/리사이즈 가능하도록
// 통일 — 폭에 따른 레이아웃 반응(그리드 1열 전환)은 컨테이너 쿼리(CSS)가 담당한다.
function openCenteredDraggableWin(win) {
  win.style.display = 'flex';
  win.style.zIndex = nextZ();
}
function makeCenteredWinDraggable(win, headerEl, closeSelector) {
  let dragging = false, pid = null, startX = 0, startY = 0, origX = 0, origY = 0;
  headerEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest(closeSelector)) return;
    if (!win.dataset.dragged) {
      const rect = win.getBoundingClientRect();
      win.style.transform = 'none';
      win.style.left = rect.left + 'px';
      win.style.top = rect.top + 'px';
      win.dataset.dragged = '1';
    }
    dragging = true;
    pid = e.pointerId;
    headerEl.setPointerCapture(pid);
    startX = e.clientX;
    startY = e.clientY;
    origX = win.offsetLeft;
    origY = win.offsetTop;
    win.classList.add('dragging');
    e.preventDefault();
  });
  headerEl.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pid) return;
    let nx = origX + (e.clientX - startX);
    let ny = origY + (e.clientY - startY);
    const minVisible = 60;
    nx = Math.max(-win.offsetWidth + minVisible, Math.min(nx, window.innerWidth - minVisible));
    ny = Math.max(0, Math.min(ny, window.innerHeight - 24));
    win.style.left = nx + 'px';
    win.style.top = ny + 'px';
  });
  const endDrag = (e) => {
    if (!dragging || e.pointerId !== pid) return;
    dragging = false;
    win.classList.remove('dragging');
  };
  headerEl.addEventListener('pointerup', endDrag);
  headerEl.addEventListener('pointercancel', endDrag);
}

// 우하단 핸들 드래그로 폭/높이 조절 — 드래그(makeCenteredWinDraggable)와 같은
// "센터 transform → 절대 px 배치 전환" 규칙을 공유한다(win.dataset.dragged로
// 상태 공유). 리사이즈 중에도 onResize 콜백으로 스크롤바 등을 즉시 갱신.
function makeCenteredWinResizable(win, handleEl, minW, minH, onResize) {
  let resizing = false, pid = null, startX = 0, startY = 0, origX = 0, origY = 0, w0 = 0, h0 = 0;
  // 별도 자식 엘리먼트(handleEl)에 픽셀 단위로 정확히 맞혀야만 동작하던 이전 방식은
  // 히트 영역을 아무리 키워도(18→36px) 실사용에서 계속 "리사이즈가 안 된다"는
  // 리포트가 있었음 — 원인이 z-index/occlusion/좌표계 어느 쪽이든, 자식 엘리먼트
  // 하나에 의존하는 구조 자체를 없애는 게 가장 확실한 해결책. 이제 창(win) 자신의
  // getBoundingClientRect() 코너 좌표에 직접 히트테스트를 걸어서, 그 사이에 어떤
  // 엘리먼트가 있든(스크롤 콘텐츠, 스크롤바 등) 상관없이 항상 반응한다. handleEl은
  // 순수 비주얼(그립 점 + hover 커서 아이콘) 용도로만 남는다.
  const GRAB = 28;   // 코너에서 이 픽셀 안쪽(창 경계 기준)이면 리사이즈로 판정
  function inCorner(e) {
    const rect = win.getBoundingClientRect();
    return e.clientX >= rect.right - GRAB && e.clientX <= rect.right + 12 &&
           e.clientY >= rect.bottom - GRAB && e.clientY <= rect.bottom + 12;
  }
  // 캡처 단계 — works-item 클릭/헤더 드래그 등 그 자리의 다른 핸들러보다 먼저
  // 판정해서, 코너 안이면 stopImmediatePropagation으로 확실히 가로챈다.
  win.addEventListener('pointerdown', (e) => {
    if (!inCorner(e)) return;
    if (!win.dataset.dragged) {
      const rect = win.getBoundingClientRect();
      win.style.transform = 'none';
      win.style.left = rect.left + 'px';
      win.style.top = rect.top + 'px';
      win.dataset.dragged = '1';
    }
    const rect = win.getBoundingClientRect();
    win.style.width = rect.width + 'px';
    win.style.height = rect.height + 'px';
    resizing = true;
    pid = e.pointerId;
    // setPointerCapture가 (일부 환경/엣지케이스에서) 실패해도 나머지 상태(startX 등)는
    // 반드시 세팅되게 try/catch로 감싼다 — 여기서 그냥 던지면 아래 대입들이 전부
    // 스킵되고 startX/w0 등이 초기값 0에 머물러서, 다음 pointermove가 델타가 아니라
    // e.clientX 자체를 새 너비로 써버리는(등) 훨씬 이상한 2차 버그로 이어진다.
    try { win.setPointerCapture(pid); } catch (err) {}
    startX = e.clientX;
    startY = e.clientY;
    w0 = rect.width;
    h0 = rect.height;
    origX = win.offsetLeft;
    origY = win.offsetTop;
    win.classList.add('resizing');
    e.preventDefault();
    e.stopImmediatePropagation();   // 헤더 드래그/카드 클릭 등 그 자리의 다른 반응을 막음
  }, { capture: true });
  win.addEventListener('pointermove', (e) => {
    if (!resizing || e.pointerId !== pid) return;
    const maxW = window.innerWidth - origX - 20;    // 우측 세이프 에어리어까지
    const maxH = window.innerHeight - origY - 20;   // 하단 세이프 에어리어까지
    const w = Math.max(minW, Math.min(w0 + (e.clientX - startX), maxW));
    const h = Math.max(minH, Math.min(h0 + (e.clientY - startY), maxH));
    win.style.width = w + 'px';
    win.style.height = h + 'px';
    onResize?.();
  });
  const endResize = (e) => {
    if (!resizing || e.pointerId !== pid) return;
    resizing = false;
    win.classList.remove('resizing');
  };
  win.addEventListener('pointerup', endResize);
  win.addEventListener('pointercancel', endResize);
}

// 좌/우 엣지 리사이즈 — Blair-tunes(makeResizable의 'e'/'w' 핸들)와 같은 패턴을
// 그대로 이식. 코너 핸들(위)은 폭+높이를 함께 바꾸지만, 이건 폭만 바꾼다
// (높이 불변) — 유저가 "플레이어처럼 옆에서도 리사이즈"를 기대했는데 코너에만
// 있어서 못 찾은 리포트가 있었음(2026-07-28). .win-rs-e/.win-rs-w 두 스트립을
// win에 append하고 각각 독립적인 포인터 드래그를 붙인다.
function makeEdgeResizable(win, minW, onResize) {
  ['e', 'w'].forEach((side) => {
    const h = document.createElement('div');
    h.className = `win-rs-${side}`;
    win.appendChild(h);
    let pid = null, sx = 0, w0 = 0, left0 = 0;

    h.addEventListener('pointerdown', (e) => {
      if (!win.dataset.dragged) {
        const rect = win.getBoundingClientRect();
        win.style.transform = 'none';
        win.style.left = rect.left + 'px';
        win.style.top = rect.top + 'px';
        win.dataset.dragged = '1';
      }
      const r = win.getBoundingClientRect();
      pid = e.pointerId;
      try { h.setPointerCapture(pid); } catch (err) {}
      sx = e.clientX; w0 = r.width; left0 = r.left;
      win.classList.add('resizing');
      e.preventDefault();
      e.stopPropagation();   // 헤더 드래그와 상호 배타
    });

    h.addEventListener('pointermove', (e) => {
      if (pid === null || e.pointerId !== pid) return;
      const dx = e.clientX - sx;
      let w = side === 'e' ? w0 + dx : w0 - dx;
      const maxW = side === 'e'
        ? window.innerWidth - left0 - 20    // 좌변 고정 → 우측 세이프 에어리어까지
        : left0 + w0 - 20;                  // 우변 고정 → 좌측 세이프 에어리어까지
      w = Math.max(minW, Math.min(w, maxW));
      win.style.width = w + 'px';
      if (side === 'w') win.style.left = (left0 + w0 - w) + 'px';   // 우변 앵커
      onResize?.();
    });

    const end = (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      win.classList.remove('resizing');
    };
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
  });
}

const winWorks = document.getElementById('win-works');
document.getElementById('icon-works').addEventListener('click', () => {
  openCenteredDraggableWin(winWorks);
  requestAnimationFrame(updateWorksScrollbar);
});
// 헤더 메뉴바의 "Works" 텍스트도 데스크탑 아이콘과 동일하게 열기 — 같은 창 공유.
document.getElementById('mb-works').addEventListener('click', () => {
  openCenteredDraggableWin(winWorks);
  requestAnimationFrame(updateWorksScrollbar);
});
winWorks.addEventListener('pointerdown', () => { winWorks.style.zIndex = nextZ(); });
document.getElementById('works-close').addEventListener('click', () => {
  winWorks.style.display = 'none';
});
makeCenteredWinDraggable(winWorks, winWorks.querySelector('.works-header'), '.works-close');
makeCenteredWinResizable(winWorks, document.getElementById('works-resize-handle'), 360, 300, updateWorksScrollbar);
makeEdgeResizable(winWorks, 360, updateWorksScrollbar);

// ── "and my film" 아이콘 → 필름 사진 창(Film) 화면 정중앙에 열기 ────────────
// Figma 107:2680 — 2열 매손리(모바일 1열) + 공용 픽셀 스크롤바(syncPixelScrollbar).
const filmScroll = document.getElementById('film-scroll');
const filmTrack = document.getElementById('film-scrollbar');
const filmThumb = document.getElementById('film-scrollbar-thumb');
function updateFilmScrollbar() {
  syncPixelScrollbar(filmTrack, filmThumb, filmScroll.clientHeight, filmScroll.scrollHeight, filmScroll.scrollTop);
}
filmScroll.addEventListener('scroll', updateFilmScrollbar);
window.addEventListener('resize', updateFilmScrollbar);

const winFilm = document.getElementById('win-film');
document.getElementById('icon-film').addEventListener('click', () => {
  openCenteredDraggableWin(winFilm);
  requestAnimationFrame(updateFilmScrollbar);
});
winFilm.addEventListener('pointerdown', () => { winFilm.style.zIndex = nextZ(); });
document.getElementById('film-close').addEventListener('click', () => {
  winFilm.style.display = 'none';
});
makeCenteredWinDraggable(winFilm, winFilm.querySelector('.film-header'), '.film-close');
makeCenteredWinResizable(winFilm, document.getElementById('film-resize-handle'), 360, 300, updateFilmScrollbar);

// ── Picture Viewer — film-pic 클릭 시 Mac OS9 Picture Viewer 스타일 창으로 확대 ──
const winPv = document.getElementById('win-pv');
const pvImg = document.getElementById('pv-img');
const pvTitle = document.getElementById('pv-title');
document.querySelectorAll('.film-pic').forEach((img) => {
  img.addEventListener('click', () => {
    const caption = img.closest('.film-item')?.querySelector('.film-caption')?.textContent ?? '';
    openInPv(img.src, caption, img.getBoundingClientRect().width);
  });
});
winPv.addEventListener('pointerdown', () => { winPv.style.zIndex = nextZ(); });
document.getElementById('pv-close').addEventListener('click', () => { winPv.style.display = 'none'; });
makeCenteredWinDraggable(winPv, document.getElementById('pv-header'), '.pv-close');
makeEdgeResizable(winFilm, 360, updateFilmScrollbar);

// Picture Viewer 코너 드래그 → 이미지 자체 크기 조절 (창이 이미지를 따라 감쌈)
let pvMinW = 200;  // 열릴 때마다 자연 표시 폭으로 갱신 — 그보다 작게 줄일 수 없음
(function () {
  const GRAB = 28;
  function inCorner(e) {
    const rect = winPv.getBoundingClientRect();
    return e.clientX >= rect.right - GRAB && e.clientX <= rect.right + 12 &&
           e.clientY >= rect.bottom - GRAB && e.clientY <= rect.bottom + 12;
  }
  let resizing = false, pid = null, startX = 0, w0 = 0;
  winPv.addEventListener('pointerdown', (e) => {
    if (!inCorner(e)) return;
    if (!winPv.dataset.dragged) {
      const r = winPv.getBoundingClientRect();
      winPv.style.transform = 'none';
      winPv.style.left = r.left + 'px';
      winPv.style.top = r.top + 'px';
      winPv.dataset.dragged = '1';
    }
    resizing = true; pid = e.pointerId;
    try { winPv.setPointerCapture(pid); } catch (err) {}
    startX = e.clientX;
    w0 = pvImg.getBoundingClientRect().width;
    e.preventDefault(); e.stopImmediatePropagation();
  }, { capture: true });
  winPv.addEventListener('pointermove', (e) => {
    if (!resizing || e.pointerId !== pid) return;
    const maxW = window.innerWidth - winPv.getBoundingClientRect().left - 20;
    const w = Math.max(pvMinW, Math.min(w0 + (e.clientX - startX), maxW));
    pvImg.style.width = w + 'px';
    pvImg.style.height = 'auto';
  });
  const end = (e) => { if (e.pointerId !== pid) return; resizing = false; };
  winPv.addEventListener('pointerup', end);
  winPv.addEventListener('pointercancel', end);
})();

// Film/AI Images 공통 규칙: 비율은 항상 유지, 뷰포트("OS 영역")를 넘기지 않는
// 선에서 최대한 확대하되, 원본 해상도가 작아 그보다 작게 나올 상황이면 리스트
// 썸네일 폭(minW)을 하한으로 삼는다 — 축소는 하더라도 목록에서 보던 것보다
// 작아지지는 않게. 상한(maxW/maxH)은 .pv-img의 CSS max-width/max-height와
// 반드시 같은 값으로 맞춰야 함(둘 다 "OS 영역" 세이프 마진 기준).
function fitPvSize(naturalW, naturalH, minW) {
  const ratio = naturalW / naturalH;
  const maxW = Math.min(window.innerWidth - 42, 900);
  const maxH = window.innerHeight - 80;
  let w = Math.min(Math.max(naturalW, minW || 0), maxW);
  let h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  if (w > maxW) { w = maxW; h = w / ratio; }   // 위에서 높이 기준으로 다시 늘렸을 수 있어 폭 상한 재확인
  return { w, h };
}

function openInPv(src, caption, minW) {
  pvTitle.textContent = caption;
  winPv.style.display = 'flex';
  winPv.style.zIndex = nextZ();
  delete winPv.dataset.dragged;
  winPv.style.transform = 'translate(-50%, -50%)';
  winPv.style.left = '50%';
  winPv.style.top = '50%';

  const applySize = () => {
    const { w, h } = fitPvSize(pvImg.naturalWidth, pvImg.naturalHeight, minW || 200);
    pvImg.style.width = w + 'px';
    pvImg.style.height = h + 'px';
    pvMinW = w;   // 코너/엣지 드래그로도 이보다(=지금 적용된, 썸네일 하한 반영된 폭) 작게는 못 줄임
  };
  // 로드 전에는 이전 이미지의 인라인 크기가 잠깐 남아있지 않도록 초기화
  pvImg.style.width = '';
  pvImg.style.height = '';
  pvImg.src = src;
  if (pvImg.complete && pvImg.naturalWidth) applySize();
  else pvImg.addEventListener('load', applySize, { once: true });
}
document.querySelectorAll('.ai-pic').forEach((img) => {
  img.style.cursor = 'zoom-in';
  img.addEventListener('click', () => openInPv(img.src, '', img.getBoundingClientRect().width));
});

// ── "AI Images" 아이콘 → AI 이미지 창 화면 정중앙에 열기 ────────────────────
// Figma 95:1675 — Works와 동일한 2열 grid(모바일 1열) + 공용 픽셀 스크롤바.
const aiScroll = document.getElementById('ai-scroll');
const aiTrack = document.getElementById('ai-scrollbar');
const aiThumb = document.getElementById('ai-scrollbar-thumb');
function updateAiScrollbar() {
  syncPixelScrollbar(aiTrack, aiThumb, aiScroll.clientHeight, aiScroll.scrollHeight, aiScroll.scrollTop);
}
aiScroll.addEventListener('scroll', updateAiScrollbar);
window.addEventListener('resize', updateAiScrollbar);

const winAi = document.getElementById('win-ai');
document.getElementById('icon-ai').addEventListener('click', () => {
  openCenteredDraggableWin(winAi);
  requestAnimationFrame(updateAiScrollbar);
});
winAi.addEventListener('pointerdown', () => { winAi.style.zIndex = nextZ(); });
document.getElementById('ai-close').addEventListener('click', () => {
  winAi.style.display = 'none';
});
makeCenteredWinDraggable(winAi, winAi.querySelector('.ai-header'), '.ai-close');
makeCenteredWinResizable(winAi, document.getElementById('ai-resize-handle'), 360, 300, updateAiScrollbar);
makeEdgeResizable(winAi, 360, updateAiScrollbar);

// ── "If you want to ...SEE ME?" 아이콘 → CU-SeeMe 창 다시 열기 ─────────────
document.getElementById('icon-seeme').addEventListener('click', () => {
  ['win-local', 'win-you'].forEach((id) => {
    document.getElementById(id).style.display = '';
  });
  layoutWindows();   // 드래그 안 한 창은 초기 위치로, 드래그한 창은 클램프만
  // 두 창(Local/Remote) 다 앞으로 — 하나만 올리면 다른 팝업 위로 온 나머지
  // 한 창이 여전히 그 팝업 밑에 깔려있는 버그가 있었음. Remote를 먼저 올리고
  // Local을 마지막에 올려서 기존처럼 Local이 최종적으로 맨 위가 되게 함.
  focusWin(document.getElementById('win-you'));
  focusWin(document.getElementById('win-local'));
  window.__tigerRun?.reportWindowAction();   // 타이거 활동 펄스 (옵셔널 — 없어도 무해)
  // 카메라가 아직 연결 전(권한 거부 후 재시도 등)이면 다시 요청
  if (!camStream) initCamera();
});

// ── 메뉴바 우측 창 내비게이션(mb-nav) — 레퍼런스 구현의 "Home" 버튼(실제로는
// 클래식 Mac OS9 "Application/Windows 메뉴") 재구현. 각 항목은 실제 데스크탑
// 아이콘의 click()을 그대로 호출해서 기존 열기 로직을 하나도 중복 구현하지
// 않는다. "현재 열려있는 창 중 가장 앞(z-index 최대)"을 active로 굵게 표시하고
// 버튼 라벨도 그 이름으로 바꾼다 — 메뉴를 열 때마다 새로 계산(완전한 실시간
// 추적 대신, 클릭 시점 기준 — 창이 8개 이상이라 모든 focus 지점에 훅을 심는
// 것보다 훨씬 단순하고 충분히 정확하다). ─────────────────────────────────────
// About Me / Sudoku는 데스크탑에 대응하는 이미지 아이콘이 없어서(About Me는
// 메뉴바 항목일 뿐, Sudoku 아이콘은 CSS로만 그린 미니 그리드) 여기 전용으로
// 인라인 SVG를 데이터 URI로 만든다 — About Me는 요청대로 하트(CU-SeeMe
// SHOW LOVE와 같은 heartSVG 재사용, 다만 헤더에서만 흑백으로 — 2026-08-02
// 사용자 지적, CU-SeeMe 쪽 빨간 하트는 그대로 유지), Sudoku는 데스크탑
// 아이콘의 3×3 미니 그리드(dt-sudoku-icon)를 그대로 SVG로 재현.
function svgDataUri(svgMarkup) {
  return 'data:image/svg+xml,' + encodeURIComponent(svgMarkup);
}
const MB_ABOUT_ICON = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14">' +
  '<rect width="14" height="14" fill="#ccc"/>' +
  '<rect y="13" width="14" height="1" fill="#262626"/>' +
  '<text x="1" y="5.5" font-family="monospace" font-size="4" fill="#1112ea">Let me</text>' +
  '<text x="1" y="10.5" font-family="monospace" font-size="4" fill="#1112ea">intro..</text>' +
  '</svg>'
);
const MB_SUDOKU_ICON = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" shape-rendering="crispEdges">' +
  '<rect x="1" y="1" width="22" height="22" fill="#fff" stroke="#262626"/>' +
  '<path d="M8 1V23M16 1V23M1 8H23M1 16H23" stroke="#999"/>' +
  '<text x="4.3" y="6.8" font-family="monospace" font-size="6" fill="#262626">5</text>' +
  '<text x="12.3" y="6.8" font-family="monospace" font-size="6" fill="#262626">3</text>' +
  '<text x="12.3" y="14.8" font-family="monospace" font-size="6" fill="#262626">7</text>' +
  '<text x="20.3" y="22.8" font-family="monospace" font-size="6" fill="#262626">1</text>' +
  '</svg>'
);

const MB_FLOWER_ICON = 'src/images/desktop/globe.png';

const MB_NAV_ITEMS = [
  { winId: 'win-welcome', label: 'Welcome', icon: MB_FLOWER_ICON, open: () => openCenteredDraggableWin(document.getElementById('win-welcome')) },
  { winId: 'win-about', label: 'About Me', icon: MB_ABOUT_ICON, open: () => document.getElementById('mb-about').click() },
  { winId: 'win-works', label: 'Works', icon: 'src/images/desktop/folder-default.png', open: () => document.getElementById('icon-works').click() },
  { winId: 'win-film', label: 'and my film', icon: 'src/images/desktop/adobe-photoshop.png', open: () => document.getElementById('icon-film').click() },
  { winId: 'win-ai', label: 'AI Images', icon: 'src/images/desktop/adobe-illustrator-55.png', open: () => document.getElementById('icon-ai').click() },
  { winId: 'win-local', label: 'CU-SeeMe', icon: 'src/images/desktop/icon-zoom.png', open: () => document.getElementById('icon-seeme').click() },
  { winId: 'bt-win', label: 'Enjoy Music!', icon: 'src/images/desktop/music-ipod.png', open: () => document.getElementById('icon-tunes')?.click() },
  { winId: 'sudoku-win', label: 'Sudoku', icon: MB_SUDOKU_ICON, open: () => document.getElementById('icon-sudoku')?.click() },
];

function isWinOpen(winId) {
  const el = document.getElementById(winId);
  if (!el) return false;
  if (el.hidden) return false;
  if (getComputedStyle(el).display === 'none') return false;
  return true;
}
function getTopMbNavItem() {
  let top = null, topZ = -1;
  MB_NAV_ITEMS.forEach((item) => {
    if (!isWinOpen(item.winId)) return;
    const z = parseInt(getComputedStyle(document.getElementById(item.winId)).zIndex, 10) || 0;
    if (z > topZ) { topZ = z; top = item; }
  });
  return top;
}

const mbNav = document.getElementById('mb-nav');
const mbNavToggle = document.getElementById('mb-nav-toggle');
const mbNavList = document.getElementById('mb-nav-list');
const mbNavLabel = document.getElementById('mb-nav-label');
const mbNavIcon = document.getElementById('mb-nav-icon');

function renderMbNavList() {
  const top = getTopMbNavItem();
  mbNavList.innerHTML = MB_NAV_ITEMS.map((item) => {
    const iconHtml = item.icon
      ? `<img class="mb-nav-item-icon" src="${item.icon}" alt="">`
      : '<span class="mb-nav-item-icon-blank" aria-hidden="true"></span>';
    const activeCls = top && top.winId === item.winId ? ' active' : '';
    return `<li class="mb-nav-item${activeCls}" data-win-id="${item.winId}">${iconHtml}${item.label}</li>`;
  }).join('');
  mbNavLabel.textContent = top ? top.label : 'Desktop';
  // 토글 버튼 자체의 아이콘도 현재 활성 창에 맞춰 갱신 — 원래는 항상 같은
  // 제네릭 CSS 아이콘만 떠서 "CU-SeeMe인데 아이콘이 하나도 안 바뀐다"는
  // 지적이 있었음(2026-08-02).
  if (top && top.icon) {
    mbNavIcon.style.backgroundImage = `url("${top.icon}")`;
    mbNavIcon.classList.add('has-icon');
  } else {
    mbNavIcon.style.backgroundImage = '';
    mbNavIcon.classList.remove('has-icon');
  }
}
renderMbNavList();   // 초기 라벨: 아무 창도 없으니 "Desktop"

function closeMbNav() {
  mbNavList.hidden = true;
  mbNav.classList.remove('open');
  mbNavToggle.setAttribute('aria-expanded', 'false');
}
mbNavToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!mbNavList.hidden) { closeMbNav(); return; }
  renderMbNavList();
  mbNavList.hidden = false;
  mbNav.classList.add('open');
  mbNavToggle.setAttribute('aria-expanded', 'true');
});
mbNavList.addEventListener('click', (e) => {
  const li = e.target.closest('.mb-nav-item');
  if (!li) return;
  const item = MB_NAV_ITEMS.find((i) => i.winId === li.dataset.winId);
  item?.open();
  closeMbNav();
});
document.addEventListener('click', (e) => {
  if (!mbNavList.hidden && !mbNav.contains(e.target)) closeMbNav();
});

// ── 커서 컬러 트레일 ────────────────────────────────────────────────────────
// desktop.html 전용(index.html 미적용). 마우스가 실제로 움직일 때만, 커서를
// 거의 실시간으로 따라다니는 부드러운 컬러 블롭 리본이 생겼다가 사라지고,
// 그 위에 하프톤은 "살짝 더해지는" 텍스처로만 얹힌다(도트 자체가 주된
// 형태가 아님 — 실측 레퍼런스 피드백에 따라 재설계).
//
// 성능 설계는 이전과 동일한 원칙: 소프트 그라디언트 블롭 스프라이트를 색상별로
// 로드 시 딱 한 번만 굽고(createRadialGradient는 생성 시점에만 계산됨),
// 런타임엔 drawImage만 반복 — 픽셀 루프 없음. 끊김 없이 커서를 따라오는
// 느낌은 "느슨한 스폰 + 큰 반경"이 아니라 "촘촘한 스폰(짧은 간격) + 서로
// 겹치는 블롭"으로 만든다. 하프톤 텍스처는 블롭 하나하나에 굽지 않고,
// 매 프레임 전체 캔버스에 기존 BAYER4 기반 도트 타일을 한 번만
// source-atop으로 얹어서(이미 그려진 블롭 위에만 자연히 마스킹됨) 저비용으로
// 낸다.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // jeehyun.com 홈 트레일 참조: "찍고 방치"(스폰 후 그 자리에서 페이드)
  // 방식은 원이 찍히는 시점의 위치 오차와 무관하게, 지난 수명(구 560ms) 동안
  // 찍힌 블롭들이 이동 경로를 따라 줄줄이 남아 "꼬리 길이 = 속도 × 수명"만큼
  // 커서와 멀어져 보였다. 그래서 고정 개수의 원을 매 프레임 커서 쪽으로
  // 계속 이징(ease)시키는 방식으로 교체 — 새로 만들고 버리는 대신 이미 있는
  // 원들을 재배치하므로 커서가 멈추면 원도 곧장 모여서 멈춘다.
  const HUE_COUNT = 24;               // 24색 프리베이크 — 15° 간격
  const HUE_SAT = 72, HUE_LIGHT = 56; // 채도/명도 고정, hue만 회전
  const HUE_HOLD_BLOOMS = 3;           // 도트 몇 개마다 무작위(최소 60°) 색으로 점프 — N=12에 맞춘 값
                                       // (예전 10은 "블롭 10개 스폰마다"였던 무한 스트림 기준이라,
                                       // 도트 12개 중 딱 한 번만 나뉘어 사실상 2색 고정이 되는 버그였음)
  const RECOLOR_INTERVAL_MS = 4000;   // 계속 움직이는 동안 이 주기로 전체 팔레트를 다시 굴려
                                       // 색이 한 세트로 고정되지 않고 세션 내내 서서히 바뀌게 한다
  const BLOB_R = 42;                  // 원 기본 반경(px)
  const HALFTONE_ALPHA = 0.1;         // 컬러 80 : 하프톤 20 — 도트는 질감으로만 은은하게

  function hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
  }
  function rgbToRgba([r, g, b], a) { return `rgba(${r},${g},${b},${a})`; }

  // 색상별(24색) 블룸 스프라이트를 로드 시 한 번만 굽는다. 완벽한 원 하나가
  // 아니라 중심 코어 + 무작위 로브 4개를 겹쳐 그려서 잉크가 번진 듯한
  // 불규칙한 실루엣 — 스프라이트마다 로브 배치가 달라 블롭마다 형태가 다르고,
  // 그릴 때 무작위 회전까지 더해져 같은 스프라이트도 매번 다르게 보인다.
  const SPR = BLOB_R * 2 + 8;
  const sprHalf = SPR / 2;
  const SPRITES = Array.from({ length: HUE_COUNT }, (_, i) => {
    const rgb = hslToRgb((360 / HUE_COUNT) * i, HUE_SAT, HUE_LIGHT);
    const c = document.createElement('canvas');
    c.width = c.height = SPR;
    const cctx = c.getContext('2d');
    const paint = (x, y, r, a) => {
      const g = cctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgbToRgba(rgb, a));
      g.addColorStop(0.55, rgbToRgba(rgb, a * 0.6));
      g.addColorStop(1, rgbToRgba(rgb, 0));
      cctx.fillStyle = g;
      cctx.fillRect(0, 0, SPR, SPR);
    };
    paint(sprHalf, sprHalf, BLOB_R * 0.78, 0.9);
    for (let k = 0; k < 4; k++) {
      const ang = Math.random() * Math.PI * 2;
      const d = BLOB_R * (0.2 + Math.random() * 0.2);
      paint(sprHalf + Math.cos(ang) * d, sprHalf + Math.sin(ang) * d,
            BLOB_R * (0.4 + Math.random() * 0.2), 0.55);
    }
    return c;
  });

  // 하프톤 텍스처 타일(8×8, 기존 BAYER4 재사용) — 절반 정도 셀만 어두운 점으로
  // 찍어서 "그냥 노이즈"가 아니라 실제 도트 패턴으로 읽히게 한다. 이 타일
  // 하나를 매 프레임 패턴으로 반복 채우기만 하면 되므로 블롭 개수와 무관하게
  // 항상 고정 비용.
  const ditherTile = document.createElement('canvas');
  ditherTile.width = ditherTile.height = 8;
  const dctx = ditherTile.getContext('2d');
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      if (BAYER4[ty][tx] < 8) { dctx.fillStyle = '#000'; dctx.fillRect(tx * 2, ty * 2, 2, 2); }
    }
  }

  const fxCanvas = document.getElementById('cursor-fx');
  // desynchronized — 캔버스를 컴포지터 동기화에서 분리해 표시 지연을 줄인다
  // (미지원 플랫폼에서는 조용히 무시됨).
  const fxCtx = fxCanvas.getContext('2d', { desynchronized: true });
  const ditherPattern = fxCtx.createPattern(ditherTile, 'repeat');
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeFxCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    fxCanvas.width = Math.round(window.innerWidth * dpr);
    fxCanvas.height = Math.round(window.innerHeight * dpr);
    // <canvas>는 교체 요소라 position:fixed+inset:0만으로는 뷰포트 크기에
    // 맞춰지지 않고 width/height 속성값(dpr을 곱해 키운 backing-store
    // 픽셀 수)을 그대로 CSS 크기로 써버린다. 그러면 dpr>1인 화면(레티나)에서
    // 캔버스 박스 자체가 뷰포트보다 dpr배 커지고, 커서 좌표에 dpr을 곱해
    // 그린 그림이 실제 화면 좌표 기준으로 또 dpr배 밀려서 커서와 원 사이에
    // (뷰포트 원점에서 멀어질수록 커지는) 오차가 생긴다. CSS 크기를 뷰포트에
    // 명시적으로 고정해서 브라우저가 backing store를 제대로 축소 표시하게 한다.
    fxCanvas.style.width = window.innerWidth + 'px';
    fxCanvas.style.height = window.innerHeight + 'px';
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeFxCanvas();
  window.addEventListener('resize', resizeFxCanvas);

  let rafRunning = false;
  let started = false;
  let dots = null;
  const N = 9;                  // 고정 개수 — 스폰/소멸 없이 이 원들이 매 프레임 커서를 추적
                                 // (예전 스폰 방식에서 동시에 살아있던 블롭 수(~5~6개)에 맞춰 12→9로 축소 —
                                 // 너무 많으면 자잘하게 움직이는 게 다 보여서 부산해 보인다)
  const CHAIN_EASE = 0.24;      // 클수록 커서에 밀착, 작을수록 길게 늘어짐. 처음엔 좌표 버그를 추적
                                 // 로직으로 억지로 보정하려고 0.55까지 올렸었는데, 진짜 원인(캔버스 dpr
                                 // 크기 버그)을 고치고 나니 그럴 필요가 없어져서 jeehyun.com 레퍼런스(0.26)에
                                 // 맞춰 다시 낮췄다 — 이래야 유연하게 따라오지 파르르 떨지 않는다
  const IDLE_FADE_DELAY = 250;  // 이만큼 움직임이 없으면 페이드 시작
  const IDLE_FADE_MS = 400;     // 페이드 아웃 소요 시간

  // 색은 청크 단위 — 체인의 앞쪽과 뒤쪽이 다른 색 덩어리로 보이도록, 도트를
  // 만들 때 하나씩 지나가며 HUE_HOLD_BLOOMS개마다 무작위(최소 60°) 색 점프
  // (레퍼런스의 "보라 뭉치 → 그린 뭉치" 구조를 도트 개수 기준으로 재현).
  let hueIndex = Math.floor(Math.random() * HUE_COUNT);
  let hueHold = 0;
  function nextHue() {
    if (++hueHold >= HUE_HOLD_BLOOMS) {
      hueHold = 0;
      const jump = 4 + Math.floor(Math.random() * (HUE_COUNT - 8));
      hueIndex = (hueIndex + jump) % HUE_COUNT;
    }
    return hueIndex;
  }

  function makeDots(x, y) {
    return Array.from({ length: N }, (_, i) => ({
      x, y,
      colorIndex: nextHue(),
      rot: Math.random() * Math.PI * 2,       // 도트마다 무작위 회전 — 같은 스프라이트도 다른 형태로
      scaleJit: 0.85 + Math.random() * 0.3,   // 도트마다 미세하게 다른 기준 크기
      // 예전(오늘 고치기 전) 버전은 블롭이 태어나서 560ms 동안 0.8→1.2배로
      // 서서히 자라며 번지는 게 수채화 느낌의 핵심이었다. 지금은 도트가
      // 새로 태어나고 사라지지 않으니 그 "자람"을 시간이 아니라 각자 다른
      // 위상/속도로 계속 숨쉬듯 맥동시켜서 대신한다 — 고정 크기라 뻣뻣해
      // 보이던 걸 완화.
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.5 + Math.random() * 0.5,  // rad/s
      alpha: 0.95 - (i / (N - 1)) * 0.35,     // 체인 뒤쪽으로 갈수록 살짝 옅어짐
    }));
  }

  // 팝업(Works/Film/About/프로젝트/Blair-tunes)이 하나라도 열려 있으면 커서
  // 이펙트를 숨긴다 — 처음엔(전부 닫힌 상태) 보이다가 폴더를 열면 그 순간
  // 사라지고, 전부 닫으면 다시 나타나야 한다는 요구사항. CU-SeeMe는 페이지
  // 로드 시 기본으로 열려 있는 창이라 여기 포함하면 처음부터 계속 숨는
  // 꼴이 되므로 의도적으로 제외 — "폴더"(데스크탑 아이콘으로 여는 팝업류)만.
  const POPUP_IDS = ['win-works', 'win-film', 'win-about', 'win-project', 'win-ai', 'bt-win', 'bt-mini', 'sudoku-win'];
  function isAnyPopupOpen() {
    return POPUP_IDS.some((id) => {
      const el = document.getElementById(id);
      if (!el || el.hidden || el.style.display === 'none') return false;
      return true;
    });
  }
  let suppressed = false, suppressMulCur = 1;
  // rAF 루프가 유휴 상태로 멈춰 있을 때(idle-fade 완료) 팝업이 닫혀도 다음
  // pointermove가 있어야만 다시 켜지는 문제 방지 — 가벼운 폴링으로 상태
  // 전환을 감지해서 필요하면 루프를 깨운다.
  setInterval(() => {
    const open = isAnyPopupOpen();
    if (open !== suppressed) {
      suppressed = open;
      if (!suppressed && !rafRunning) { rafRunning = true; requestAnimationFrame(tick); }
    }
  }, 200);

  let lastRecolor = 0;
  function tick(now) {
    const idle = now - lastMoveT;
    const fadeMul = idle <= IDLE_FADE_DELAY ? 1 : Math.max(0, 1 - (idle - IDLE_FADE_DELAY) / IDLE_FADE_MS);
    suppressMulCur += ((suppressed ? 0 : 1) - suppressMulCur) * 0.3;   // 빠르지만 딱 끊기지 않는 전환
    const visMul = fadeMul * suppressMulCur;
    // 계속 움직이는 동안 주기적으로 팔레트를 다시 굴린다 — 색이 처음 배정된
    // 세트로 세션 내내 고정되지 않고(구 버그: 12개 중 10:2로 딱 2색 고정),
    // 예전처럼 서서히 다른 색 뭉치로 전환되는 느낌을 유지한다.
    if (idle < IDLE_FADE_DELAY && now - lastRecolor > RECOLOR_INTERVAL_MS) {
      lastRecolor = now;
      dots.forEach((d) => { d.colorIndex = nextHue(); });
    }
    // 속도 외삽(최대 40ms/60px 앞)은 연속 이동 중 파이프라인 지연을 보정하기
    // 위한 것 — 마지막 이동 이후 그 외삽 구간(약 48ms)이 지나면 더 이상
    // "예측"이 아니라 "고정 오차"가 되므로, 실제 마지막 좌표로 되돌려 정지
    // 시 원이 실제 커서 위치가 아닌 예측 지점에 멈춰버리는 것을 막는다.
    if (idle > 48) { tx = lastX; ty = lastY; }

    // 체인 추적 — 첫 도트가 (예측 보정된) 실시간 커서 좌표를 이징으로 쫓고,
    // 다음 도트는 그 앞 도트를 쫓는 식으로 이어진다. 새로 만들고 버리는 게
    // 아니라 항상 존재하는 도트를 재배치하므로, 커서가 멈추면 도트도 곧장
    // 모여서 멈춘다 — 스폰형 구현과 달리 정지 후 남는 잔상이 없다.
    let px = tx, py = ty;
    dots.forEach((d) => {
      d.x += (px - d.x) * CHAIN_EASE;
      d.y += (py - d.y) * CHAIN_EASE;
      px = d.x; py = d.y;
    });

    fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    // source-over(기본값) — screen 블렌드는 흰 데스크탑 배경 위에서 도트가
    // 겹칠 때마다 하얗게 씻겨나가 채도가 죽는 문제가 있어서(측정으로 확인),
    // 잉크가 겹쳐 칠해지듯 자연스럽게 색이 살아있는 source-over로 변경.
    dots.forEach((d) => {
      const pulse = 1 + 0.18 * Math.sin((now / 1000) * d.pulseSpeed + d.pulsePhase);
      const scale = d.scaleJit * pulse;
      fxCtx.globalAlpha = d.alpha * visMul;
      fxCtx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * d.x, dpr * d.y);
      fxCtx.rotate(d.rot);
      fxCtx.drawImage(SPRITES[d.colorIndex], -sprHalf, -sprHalf);
    });
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 하프톤 텍스처를 색이 이미 칠해진 영역 위에만(source-atop) 낮은 강도로
    // 얹는다 — 빈 캔버스엔 아무것도 안 남고, 도트가 있는 곳에만 살짝 도트가 낌.
    fxCtx.globalCompositeOperation = 'source-atop';
    fxCtx.globalAlpha = HALFTONE_ALPHA * visMul;
    fxCtx.fillStyle = ditherPattern;
    fxCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    fxCtx.globalAlpha = 1;
    fxCtx.globalCompositeOperation = 'source-over';

    if (fadeMul > 0 || suppressMulCur > 0.002) {
      requestAnimationFrame(tick);
    } else {
      fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      rafRunning = false;   // 완전히 페이드 아웃되면 다음 프레임을 요청하지 않음 — 유휴 비용 0
    }
  }

  // pointerType이 mouse 또는 touch인 이벤트에 반응(펜은 제외). 모바일은
  // 상시 커서가 없어서 이 이펙트가 한 번도 안 보였는데, "터치하면 커서
  // 이펙트가 나타나게 해달라"는 요청으로 touch도 같은 경로를 타게 함 —
  // 팝업이 열려 있을 때 숨기는 isAnyPopupOpen() 로직은 그대로 공유되므로
  // 데스크탑 배경에서만 나타나는 동작도 동일하게 유지된다.
  // 매 이동마다 새로 만들고 버리는 대신 "타깃 좌표(tx, ty)"만 갱신 —
  // 실제 재배치는 tick()의 이징이 담당한다.
  let tx = 0, ty = 0, lastMoveT = 0;
  let lastX = null, lastY = null, lastT = 0;
  function onFxPointerMove(e) {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'touch') return;
    const now = performance.now();
    const dt = lastX !== null ? now - lastT : 0;

    // 예측 타깃 — OS 커서는 컴포지터가 지연 0으로 그리지만 캔버스는 이벤트→
    // JS→rAF→컴포지트를 거쳐 1~2프레임(16~33ms) 늦게 표시된다. 최근 속도로
    // ~40ms 외삽한 좌표를 타깃으로 삼는다(최대 60px — 방향 전환 오버슛 제한).
    // getPredictedEvents는 쓰지 않는다 — Chrome의 예측 지평이 몇 ms에
    // 불과해서 실제 마우스에서 보상이 거의 안 되는 걸 실사용으로 확인.
    let px = e.clientX, py = e.clientY;
    if (dt > 0 && dt < 100) {
      let lx = (e.clientX - lastX) * (40 / dt);
      let ly = (e.clientY - lastY) * (40 / dt);
      const lm = Math.hypot(lx, ly);
      if (lm > 60) { lx *= 60 / lm; ly *= 60 / lm; }
      px += lx; py += ly;
    }
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    tx = px; ty = py;
    lastMoveT = now;

    if (!started) {
      started = true;
      dots = makeDots(px, py);   // 첫 위치는 화면 밖에서 날아오지 않도록 즉시 스냅
      lastRecolor = now;
    }
    if (!rafRunning) { rafRunning = true; requestAnimationFrame(tick); }
  }
  document.addEventListener('pointermove', onFxPointerMove, { passive: true });

  // 탭만 하고 움직이지 않으면 pointermove가 아예 안 온다 — 터치 시작 시점에
  // 바로 그 자리에 도트를 배치해서 "터치하면 즉시 나타남"이 되게 한다.
  function onFxPointerDown(e) {
    if (e.pointerType !== 'touch') return;
    const now = performance.now();
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    tx = e.clientX; ty = e.clientY;
    lastMoveT = now;
    if (!started) {
      started = true;
      dots = makeDots(tx, ty);
      lastRecolor = now;
    }
    if (!rafRunning) { rafRunning = true; requestAnimationFrame(tick); }
  }
  document.addEventListener('pointerdown', onFxPointerDown, { passive: true });

  // 손가락을 떼면(터치는 마우스와 달리 "hover"가 없어 계속 멈춰있는 상태가
  // 없음) mouseleave와 동일하게 즉시 페이드아웃을 시작한다.
  function onFxTouchEnd(e) {
    if (e.pointerType !== 'touch') return;
    lastMoveT = performance.now() - IDLE_FADE_DELAY;
  }
  document.addEventListener('pointerup', onFxTouchEnd, { passive: true });
  document.addEventListener('pointercancel', onFxTouchEnd, { passive: true });

  // 커서가 창을 벗어나면 그 자리에 멈춰있지 않도록 페이드아웃을 즉시 시작
  document.documentElement.addEventListener('mouseleave', () => {
    lastMoveT = performance.now() - IDLE_FADE_DELAY;
  }, { passive: true });
})();



// ─── Flower Canvas Animation — Procedural Dot Cloud ──────────────────────────
// Flower is a fixed set of dots sampled from one reference image.
// Dots never appear/disappear. Position moves with breathing + breeze.
// Zero opacity changes. Zero frame swaps.
(function () {
  var display = document.getElementById('flower-canvas');
  if (!display) return;

  var DISPLAY = 320;
  display.width  = DISPLAY;
  display.height = DISPLAY;
  display.style.imageRendering = 'pixelated';
  var dCtx = display.getContext('2d');
  dCtx.imageSmoothingEnabled = false;

  // Internal canvas: 160×160 → nearest-neighbor ×2 → 320×320 (clean pixel doubling)
  var IW = 160, IH = 160;
  var iC = document.createElement('canvas'); iC.width = IW; iC.height = IH;
  var iCtx = iC.getContext('2d');

  // Sampling canvas (same size, used once at init)
  var sC = document.createElement('canvas'); sC.width = IW; sC.height = IH;
  var sCtx = sC.getContext('2d');

  var BG_R = 0x11, BG_G = 0x12, BG_B = 0xea;

  // 2×2 ordered checker — baked into dot color at init, moves with flower surface.
  // Larger clusters than 4×4 Bayer → reads as bitmap pattern, not grain.
  var BAYER = [
    [+32, -32],
    [-32, +32]
  ];

  // Flower center on the 96×96 canvas (approx stamen / petal junction)
  var FCX = IW * 0.50;
  var FCY = IH * 0.37;

  var dots  = [];
  var ready = false;

  var refImg = new Image();
  refImg.onload = function () {
    sCtx.clearRect(0, 0, IW, IH);
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = 'high';
    sCtx.drawImage(refImg, 0, 0, IW, IH);
    var px = sCtx.getImageData(0, 0, IW, IH).data;

    // ── Pass 1: build quantized flower pixel map ──────────────────────────────
    // Alpha threshold 130 (hard cut): no semi-transparent edge bleed.
    // Raw flower color only — NO background compositing.
    var pixMap = new Array(IW * IH);
    var gy, gx;
    for (gy = 0; gy < IH; gy++) {
      for (gx = 0; gx < IW; gx++) {
        pixMap[gy * IW + gx] = null;
        var ii = (gy * IW + gx) << 2;
        if (px[ii + 3] < 130) continue;

        var r = px[ii], g = px[ii+1], b = px[ii+2];

        // Saturation ×2.0 — vivid 90s color (flower palette only)
        var avg = (r + g + b) / 3;
        r = avg + (r - avg) * 2.0;
        g = avg + (g - avg) * 2.0;
        b = avg + (b - avg) * 2.0;
        r = Math.min(255, Math.max(0, r)) | 0;
        g = Math.min(255, Math.max(0, g)) | 0;
        b = Math.min(255, Math.max(0, b)) | 0;

        // Quantize to 4-bit per channel — limited palette for retro feel
        r = (r >> 4) << 4;
        g = (g >> 4) << 4;
        b = (b >> 4) << 4;

        pixMap[gy * IW + gx] = [r, g, b];
      }
    }

    // ── Pass 2: isolation cleanup + adaptive dithering + dot build ───────────
    var id = 0, ki, kj, ni, nj, nc;
    for (gy = 0; gy < IH; gy++) {
      for (gx = 0; gx < IW; gx++) {
        var cell = pixMap[gy * IW + gx];
        if (!cell) continue;

        var r = cell[0], g = cell[1], b = cell[2];

        // Isolation check: skip pixels with ≤1 any-flower neighbor (stray noise)
        var nbrCount = 0;
        for (ki = -1; ki <= 1; ki++) {
          for (kj = -1; kj <= 1; kj++) {
            if (ki === 0 && kj === 0) continue;
            ni = gy + ki; nj = gx + kj;
            if (ni >= 0 && ni < IH && nj >= 0 && nj < IW && pixMap[ni * IW + nj]) nbrCount++;
          }
        }
        if (nbrCount <= 1) continue;

        // Stray blue: background-colored pixel with no warm flower neighbors
        if (b > 200 && r < 80 && g < 80) {
          var hasWarmNbr = false;
          for (ki = -1; ki <= 1 && !hasWarmNbr; ki++) {
            for (kj = -1; kj <= 1; kj++) {
              if (ki === 0 && kj === 0) continue;
              ni = gy + ki; nj = gx + kj;
              if (ni < 0 || ni >= IH || nj < 0 || nj >= IW) continue;
              nc = pixMap[ni * IW + nj];
              if (nc && !(nc[2] > 200 && nc[0] < 80 && nc[1] < 80)) { hasWarmNbr = true; break; }
            }
          }
          if (!hasWarmNbr) continue;
        }

        // Boundary detection — mid-tone transitions only:
        //   skip exterior edges (flower vs background = hard silhouette, no dither)
        //   skip tiny differences (< 24 = same region)
        //   skip sharp jumps (> 96 = hard edge, keep clean)
        var isBound = false;
        for (ki = -1; ki <= 1 && !isBound; ki++) {
          for (kj = -1; kj <= 1 && !isBound; kj++) {
            if (ki === 0 && kj === 0) continue;
            ni = gy + ki; nj = gx + kj;
            if (ni < 0 || ni >= IH || nj < 0 || nj >= IW) continue; // exterior = skip
            nc = pixMap[ni * IW + nj];
            if (!nc) continue; // background neighbor = silhouette edge, no dither
            var colorDiff = Math.abs(nc[0]-r) + Math.abs(nc[1]-g) + Math.abs(nc[2]-b);
            if (colorDiff >= 24 && colorDiff <= 96) isBound = true;
          }
        }

        // Dither only if mid-tone boundary AND not a bright highlight
        var lum = (r + g + b) / 3;
        var dv = (isBound && lum < 210) ? BAYER[gy&1][gx&1] : 0;
        var fr = Math.min(255, Math.max(0, r + dv)) | 0;
        var fg = Math.min(255, Math.max(0, g + dv)) | 0;
        var fb = Math.min(255, Math.max(0, b + dv)) | 0;

        // Motion metadata
        var cx = gx - FCX, cy = gy - FCY;
        var dist  = Math.sqrt(cx*cx + cy*cy);
        var angle = Math.atan2(cy, cx);
        var normDist  = dist / (IH * 0.48);
        var stemDecay = Math.max(0, 1 - Math.max(0, gy - IH*0.56) / (IH*0.16));
        var expFactor = Math.min(1.0, normDist) * stemDecay;

        var phX = (id * 2.7183) % (Math.PI * 2);
        var phY = (id * 1.6180 + 1.0) % (Math.PI * 2);

        dots.push({ baseX:gx, baseY:gy, angle:angle,
                    expFactor:expFactor, r:fr, g:fg, b:fb,
                    phX:phX, phY:phY });
        id++;
      }
    }
    ready = true;
  };
  refImg.src = 'src/images/desktop/flowers/8.png';

  // ── Animation constants ───────────────────────────────────────────────────
  var CYCLE_S   = 4.0;   // breathing period (seconds)
  var MAX_EXP   = 5.0;   // max radial expansion in internal px (outer petals)
  var BREEZE    = 0.5;   // local oscillation amplitude (internal px)
  var SWAY_X    = 0.8;   // whole-flower global sway X
  var SWAY_Y    = 0.5;   // whole-flower global sway Y
  var FRAME_MS  = 1000 / 13;

  var startTime = null, lastRender = 0, rafId = null, running = false;

  function tick(ts) {
    if (!running) return;
    if (!startTime) startTime = ts;
    if (ts - lastRender < FRAME_MS) { rafId = requestAnimationFrame(tick); return; }
    lastRender = ts;
    if (!ready) { rafId = requestAnimationFrame(tick); return; }

    var t = (ts - startTime) / 1000; // seconds since start

    // Breathing: smooth 0→1→0 loop
    var breath = (Math.sin(t * 2 * Math.PI / CYCLE_S) + 1) / 2;

    // Global flower sway (whole cloud moves together)
    var gsx = SWAY_X * Math.sin(t * 0.65);
    var gsy = SWAY_Y * Math.sin(t * 0.47 + 0.9);

    // Fill pixel buffer with BG
    var img  = iCtx.createImageData(IW, IH);
    var data = img.data;
    for (var i = 0; i < data.length; i += 4) {
      data[i] = BG_R; data[i+1] = BG_G; data[i+2] = BG_B; data[i+3] = 255;
    }

    for (var k = 0; k < dots.length; k++) {
      var dot = dots[k];

      // Radial breathing — outer dots expand more
      var exp = breath * dot.expFactor * MAX_EXP;
      var bx  = Math.cos(dot.angle) * exp;
      var by  = Math.sin(dot.angle) * exp;

      // Per-dot local oscillation (low-freq, phase-shifted — never flickers)
      var lx = BREEZE * Math.sin(t * 0.85 + dot.phX);
      var ly = BREEZE * Math.sin(t * 0.65 + dot.phY);

      var px = (dot.baseX + bx + lx + gsx + 0.5) | 0;
      var py = (dot.baseY + by + ly + gsy + 0.5) | 0;

      if (px < 0 || px >= IW || py < 0 || py >= IH) continue;

      var di = (py * IW + px) << 2;
      data[di] = dot.r; data[di+1] = dot.g; data[di+2] = dot.b; data[di+3] = 255;
    }

    iCtx.putImageData(img, 0, 0);
    dCtx.imageSmoothingEnabled = false;
    dCtx.drawImage(iC, 0, 0, DISPLAY, DISPLAY);

    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true; startTime = null; lastRender = 0;
    rafId = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  var winWelcome = document.getElementById('win-welcome');
  if (winWelcome) {
    new MutationObserver(function () {
      winWelcome.style.display === 'none' ? stop() : start();
    }).observe(winWelcome, { attributes: true, attributeFilter: ['style'] });
    if (winWelcome.style.display !== 'none') start();
  }
})();
