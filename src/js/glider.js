// ═══════════════════════════════════════════════════════════════════════════
// Glider 4.0 — 클래식 Mac 게임 Glider(종이비행기 활공)의 미니 재해석.
// blairtunes.js/sudoku.js와 동일한 self-mounting 모듈 컨벤션: 자기 창 DOM을
// document.body에 붙이고, 드래그/포커스는 window.__bringToFront에 참여하고,
// 데스크탑의 "Glider 4.0" 아이콘(icon-glider) 클릭을 직접 배선한다.
//
// 룰/물리는 원작 Glider(중력으로 가라앉는 종이비행기 + 바닥 통풍구의 상승기류)를
// 따르고, 공간은 도쿄 재즈 라운지 인테리어로 재해석. 사용자가 실제 Glider 4.0
// 스크린샷 2장(인트로 화면 / 게임플레이 화면)을 참고 자료로 줘서(2026-08-03),
// 그 톤에 맞춰 다시 그림:
//  - 인트로: 원작처럼 창을 열면 타이틀 화면이 먼저 뜨고(카드형 프리뷰 +
//    안내문 + "시작" 프롬프트), 클릭/Enter/화살표로 게임 시작. 원작의 구체적인
//    로고 아트·사이드바 일러스트·홍보 문구는 저작권이 있는 실제 상용 게임
//    자산이라 그대로 베끼지 않고, "타이틀 화면"이라는 레이아웃 관례만 참고해
//    직접 그린 오리지널 요소로 구성(사이드 아이콘 4종, 크롬 그라디언트 타이틀
//    텍스트, 프리뷰 카드).
//  - 게임 화면 아트: 부드러운 그러데이션/글로우 대신 원작처럼 평평한 단색 채우기
//    + 굵은 검정 윤곽선(EGA/VGA 느낌), 통풍구 기류는 얇은 점선 3줄 대신 굵은
//    지그재그 실선 한 줄로. "블루노트 도쿄"라는 문자열은 실제 브랜드명이라
//    그대로 안 쓰고("텍스트가 직접 들어가지 않아도 됨" 요청 반영) 라운지
//    네온사인은 "LOUNGE"로.
//
// 전부 IIFE로 감싼 이유: <script> 최상위 선언은 파일이 달라도 이름이 겹치면
// 충돌한다(heartSVG 사건, sudoku.js와 desktop.html 사이에서 실제로 발생) —
// 게임처럼 내부 심볼이 많은 모듈은 처음부터 격리하는 게 안전.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
'use strict';

const W = 480, H = 300;
const FLOOR_Y = 280;          // 바닥(카펫) 윗면 — 닿으면 추락
const CEIL_Y = 10;            // 천장 클램프
const CEIL_BAND = 22;         // 천장 몰딩 띠 높이(장식)
const GRAVITY = 0.05;
const LIFT = -0.115;          // 통풍구 상승기류
const ACCEL = 0.18, MAX_VX = 2.3, FRICTION = 0.92;
const MAX_FALL = 2.2, MAX_RISE = -1.9;
const PLANE_W = 16, PLANE_H = 9;
const SPAWN = { x: 22, y: 70 };

// ── 방 데이터 — vents: 바닥 통풍구(상승기류 기둥), obstacles: 충돌체 ────────
// pendant: 천장에서 내려오는 펜던트 조명(코드+갓), table: 램프 올린 원형
// 테이블(라운지 시그니처), bass: 스테이지 옆 콘트라베이스.
const LEVELS = [
  {
    vents: [{ x: 90, w: 44 }, { x: 232, w: 44 }, { x: 366, w: 44 }],
    obstacles: [
      { type: 'pendant', x: 178, len: 74 },
      { type: 'table', x: 292 },
    ],
    exit: { y: 150, h: 86 },
  },
  {
    vents: [{ x: 66, w: 40 }, { x: 205, w: 40 }, { x: 345, w: 40 }],
    obstacles: [
      { type: 'pendant', x: 136, len: 96 },
      { type: 'pendant', x: 268, len: 62 },
      { type: 'table', x: 188 },
      { type: 'bass', x: 402 },
    ],
    exit: { y: 120, h: 80 },
  },
  {
    vents: [{ x: 104, w: 38 }, { x: 252, w: 38 }, { x: 392, w: 38 }],
    obstacles: [
      { type: 'pendant', x: 66, len: 64 },
      { type: 'pendant', x: 186, len: 108 },
      { type: 'pendant', x: 318, len: 76 },
      { type: 'table', x: 142 },
      { type: 'table', x: 236 },
      { type: 'bass', x: 356 },
    ],
    exit: { y: 96, h: 76 },
  },
];

const state = {
  room: 0,
  deaths: 0,
  x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0,
  keys: { left: false, right: false },
  phase: 'intro',        // 'intro' | 'play' | 'clear' | 'won'
  phaseT: 0,             // clear/won 오버레이 남은 프레임(인트로는 타이머 없이 입력 대기)
  flash: 0,              // 사망 플래시 남은 프레임
};

let ctx = null;
let rafId = null;

// ── 충돌 박스 계산 ──────────────────────────────────────────────────────────
function obstacleBoxes(level) {
  const boxes = [];
  for (const o of level.obstacles) {
    if (o.type === 'pendant') {
      boxes.push({ x: o.x - 2, y: 0, w: 4, h: o.len - 12 });            // 코드
      boxes.push({ x: o.x - 11, y: o.len - 14, w: 22, h: 16 });         // 갓+전구
    } else if (o.type === 'table') {
      boxes.push({ x: o.x - 19, y: FLOOR_Y - 46, w: 38, h: 46 });       // 테이블+램프
    } else if (o.type === 'bass') {
      boxes.push({ x: o.x - 13, y: FLOOR_Y - 92, w: 26, h: 92 });
    }
  }
  return boxes;
}

function inVent(level, px) {
  return level.vents.some((v) => px + PLANE_W * 0.5 > v.x && px + PLANE_W * 0.5 < v.x + v.w);
}

// ── 방 그리기 — 평평한 단색 + 굵은 검정 윤곽선(원작 스크린샷 참고 스타일) ──────
function drawRoom(t) {
  const level = LEVELS[state.room];

  // 벽 — 소프트 그러데이션 대신 2톤 플랫(천장 몰딩 띠 + 메인 벽)
  ctx.fillStyle = '#16233d';
  ctx.fillRect(0, 0, W, FLOOR_Y);
  ctx.fillStyle = '#5b6f92';
  ctx.fillRect(0, 0, W, CEIL_BAND);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, CEIL_BAND); ctx.lineTo(W, CEIL_BAND); ctx.stroke();

  // 네온 사인 — 블러/글로우 없이 크리스프한 이중 스트로크로 살짝 입체감만
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = "22px 'VT323', monospace";
  ctx.strokeStyle = '#0a1424';
  ctx.lineWidth = 3;
  ctx.strokeText('LOUNGE', 30, 48);
  ctx.fillStyle = '#7cc4ff';
  ctx.fillText('LOUNGE', 30, 48);
  ctx.restore();

  // 스테이지(우측 단상) + 피아노 실루엣 — 장식(충돌 없음)
  ctx.fillStyle = '#3a2416';
  ctx.fillRect(330, FLOOR_Y - 18, W - 330, 18);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(330, FLOOR_Y - 18, W - 330, 18);
  ctx.fillStyle = '#05080f';
  ctx.beginPath();
  ctx.moveTo(352, FLOOR_Y - 18);
  ctx.lineTo(352, FLOOR_Y - 46);
  ctx.lineTo(408, FLOOR_Y - 46);
  ctx.lineTo(428, FLOOR_Y - 30);
  ctx.lineTo(428, FLOOR_Y - 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(356, FLOOR_Y - 52, 40, 6);
  ctx.strokeRect(356, FLOOR_Y - 52, 40, 6);

  // 바닥 — 카펫
  ctx.fillStyle = '#2a1810';
  ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(W, FLOOR_Y); ctx.stroke();

  // 출구 — 오른쪽 벽의 밝은 문
  const ex = level.exit;
  ctx.fillStyle = '#ffd98c';
  ctx.fillRect(W - 8, ex.y, 8, ex.h);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(W - 8, ex.y, 8, ex.h);

  // 통풍구 + 상승기류 — 얇은 점선 3줄 대신 굵은 지그재그 실선 한 줄(원작 참고)
  for (const v of level.vents) {
    ctx.fillStyle = '#0e1626';
    ctx.fillRect(v.x, FLOOR_Y - 4, v.w, 4);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(v.x, FLOOR_Y - 4, v.w, 4);

    const cx = v.x + v.w / 2;
    ctx.save();
    ctx.strokeStyle = '#4fd6ff';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const top = CEIL_BAND + 6, bottom = FLOOR_Y - 6, step = 9, amp = 6;
    let first = true;
    for (let y = bottom; y >= top; y -= step) {
      const xOff = Math.sin(y * 0.25 + t * 0.12) * amp;
      if (first) { ctx.moveTo(cx + xOff, y); first = false; }
      else ctx.lineTo(cx + xOff, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 장애물
  for (const o of level.obstacles) {
    if (o.type === 'pendant') {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(o.x, CEIL_BAND); ctx.lineTo(o.x, o.len - 14); ctx.stroke();
      ctx.fillStyle = '#111826';
      ctx.beginPath();
      ctx.moveTo(o.x - 11, o.len);
      ctx.lineTo(o.x - 5, o.len - 14);
      ctx.lineTo(o.x + 5, o.len - 14);
      ctx.lineTo(o.x + 11, o.len);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd24d';
      ctx.beginPath(); ctx.arc(o.x, o.len + 3, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (o.type === 'table') {
      ctx.fillStyle = '#0c1018';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.fillRect(o.x - 3, FLOOR_Y - 28, 6, 28);
      ctx.strokeRect(o.x - 3, FLOOR_Y - 28, 6, 28);
      ctx.beginPath(); ctx.ellipse(o.x, FLOOR_Y - 28, 19, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#101820';
      ctx.fillRect(o.x + 6, FLOOR_Y - 42, 3, 14);
      ctx.strokeRect(o.x + 6, FLOOR_Y - 42, 3, 14);
      ctx.fillStyle = '#ffb84d';
      ctx.beginPath();
      ctx.moveTo(o.x + 1, FLOOR_Y - 42);
      ctx.lineTo(o.x + 4, FLOOR_Y - 50);
      ctx.lineTo(o.x + 11, FLOOR_Y - 50);
      ctx.lineTo(o.x + 14, FLOOR_Y - 42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (o.type === 'bass') {
      ctx.fillStyle = '#0c1018';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(o.x, FLOOR_Y - 26, 13, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(o.x, FLOOR_Y - 56, 9, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillRect(o.x - 2, FLOOR_Y - 90, 4, 34);
      ctx.strokeRect(o.x - 2, FLOOR_Y - 90, 4, 34);
      ctx.fillRect(o.x - 5, FLOOR_Y - 92, 10, 6);
      ctx.strokeRect(o.x - 5, FLOOR_Y - 92, 10, 6);
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(o.x - 2, FLOOR_Y - 88); ctx.lineTo(o.x - 2, FLOOR_Y - 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(o.x + 2, FLOOR_Y - 88); ctx.lineTo(o.x + 2, FLOOR_Y - 8); ctx.stroke();
    }
  }
}

function drawPlane() {
  // 종이비행기 — 오른쪽을 향한 흰 다트, vy에 따라 살짝 기울임, 검정 윤곽선으로
  // 방 전체의 플랫+아웃라인 톤과 통일
  ctx.save();
  ctx.translate(state.x + PLANE_W / 2, state.y + PLANE_H / 2);
  ctx.rotate(Math.max(-0.3, Math.min(0.35, state.vy * 0.18)));
  ctx.beginPath();
  ctx.moveTo(PLANE_W / 2, 0);
  ctx.lineTo(-PLANE_W / 2, -PLANE_H / 2);
  ctx.lineTo(-PLANE_W / 4, 0);
  ctx.lineTo(-PLANE_W / 2, PLANE_H / 2);
  ctx.closePath();
  ctx.fillStyle = '#f4f4f0';
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(PLANE_W / 2, 0);
  ctx.lineTo(-PLANE_W / 4, 0);
  ctx.strokeStyle = '#9aa0a8';
  ctx.stroke();
  ctx.restore();
}

function drawOverlay(lines) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,10,18,0.75)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = "28px 'VT323', monospace";
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText(lines[0], W / 2, H / 2 - 6);
  ctx.fillStyle = '#ffd24d';
  ctx.fillText(lines[0], W / 2, H / 2 - 6);
  if (lines[1]) {
    ctx.font = "15px 'VT323', monospace";
    ctx.fillStyle = '#bcd6ff';
    ctx.fillText(lines[1], W / 2, H / 2 + 20);
  }
  ctx.restore();
}

// ── 인트로(타이틀) 화면 — 원작처럼 창을 열면 먼저 뜨는 시작 화면.
// 원작의 구체적 로고 아트/사이드바 일러스트는 상용 게임 저작물이라 그대로
// 베끼지 않고, "타이틀 화면" 레이아웃 관례(프레임+로고+프리뷰+안내문+사이드
// 장식)만 참고해 오리지널 요소로 새로 그림. ──────────────────────────────────
function drawIconNote(cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#bcd6ff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(-3, 5, 3.2, 2.4, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillRect(-0.5, -8, 1.5, 13);
  ctx.beginPath();
  ctx.moveTo(1, -8); ctx.lineTo(6, -6); ctx.lineTo(6, -1); ctx.lineTo(1, -3); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawIconDisc(cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#111';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd24d';
  ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function drawIconGlass(cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#bcd6ff';
  ctx.beginPath();
  ctx.moveTo(-6, -7); ctx.lineTo(6, -7); ctx.lineTo(0.8, 1); ctx.lineTo(-0.8, 1); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillRect(-0.6, 1, 1.2, 5);
  ctx.fillRect(-4, 6.5, 8, 1.4);
  ctx.strokeRect(-4, 6.5, 8, 1.4);
  ctx.restore();
}
function drawIconKeys(cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#eee';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.fillRect(-8, -5, 16, 10);
  ctx.strokeRect(-8, -5, 16, 10);
  ctx.fillStyle = '#111';
  for (let i = -6; i <= 4; i += 3.2) ctx.fillRect(i, -5, 1.6, 6);
  ctx.restore();
}

function drawIntro(t) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // 외곽 프레임(원작의 컬러 보더 박스 관례를 시안 블루로)
  ctx.strokeStyle = '#4fd6ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, W - 8, H - 8);
  ctx.strokeStyle = 'rgba(79,214,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(7, 7, W - 14, H - 14);

  // 타이틀 — 크롬(블루→화이트) 그라디언트 + 검정 윤곽선
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = "34px 'VT323', monospace";
  const g = ctx.createLinearGradient(0, 14, 0, 48);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#bcd6ff');
  g.addColorStop(1, '#4a8fd8');
  ctx.strokeStyle = '#0a1424';
  ctx.lineWidth = 3;
  ctx.strokeText('Glider 4.0', W / 2, 46);
  ctx.fillStyle = g;
  ctx.fillText('Glider 4.0', W / 2, 46);
  ctx.font = "12px 'VT323', monospace";
  ctx.fillStyle = '#7db8ff';
  ctx.fillText('a midnight lounge mini-glider', W / 2, 62);
  ctx.restore();

  // 프리뷰 카드 — 실제 방 1을 축소 렌더(같은 drawRoom 재사용, transform으로 스케일)
  const pw = 200, ph = 125, px = (W - pw) / 2, py = 70;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  ctx.translate(px, py);
  ctx.scale(pw / W, ph / H);
  const savedRoom = state.room;
  state.room = 0;
  drawRoom(t);
  state.room = savedRoom;
  ctx.restore();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  // 안내 문구 + 깜빡이는 시작 프롬프트
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = "13px 'VT323', monospace";
  ctx.fillStyle = '#bcd6ff';
  ctx.fillText('← / →  TO GLIDE  ·  RIDE THE DRAFTS', W / 2, py + ph + 20);
  if (Math.floor(t / 30) % 2 === 0) {
    ctx.font = "15px 'VT323', monospace";
    ctx.fillStyle = '#ffd24d';
    ctx.fillText('CLICK OR PRESS ENTER TO START', W / 2, py + ph + 42);
  }
  ctx.font = "10px 'VT323', monospace";
  ctx.fillStyle = '#555';
  ctx.fillText('an original mini-glider, inspired by the 1994 classic', W / 2, H - 10);
  ctx.restore();

  // 좌우 장식 아이콘 컬럼(원작 사이드바 레이아웃 관례만 참고, 내용은 오리지널)
  const sideIcons = [drawIconNote, drawIconDisc, drawIconGlass, drawIconKeys];
  const ys = [46, 108, 170, 232];
  sideIcons.forEach((fn, i) => { fn(18, ys[i]); fn(W - 18, ys[i]); });
}

function startGameFromIntro() {
  state.phase = 'play';
  state.room = 0;
  state.deaths = 0;
  resetPlane();
  updateStatus();
}

// ── 게임 루프 ───────────────────────────────────────────────────────────────
let frame = 0;

function resetPlane() {
  state.x = SPAWN.x; state.y = SPAWN.y; state.vx = 0; state.vy = 0;
}

function die() {
  state.deaths += 1;
  state.flash = 8;
  resetPlane();
  updateStatus();
}

function step() {
  if (state.phase === 'intro') return;   // 인트로는 타이머 없이 입력으로만 넘어감

  const level = LEVELS[state.room];

  if (state.phase !== 'play') {
    state.phaseT -= 1;
    if (state.phaseT <= 0) {
      if (state.phase === 'clear') {
        state.room += 1;
        state.phase = 'play';
        resetPlane();
        updateStatus();
      } else {                       // 'won' — 처음부터 다시
        state.room = 0;
        state.deaths = 0;
        state.phase = 'play';
        resetPlane();
        updateStatus();
      }
    }
    return;
  }

  // 조작 — 좌우 가속
  if (state.keys.left) state.vx -= ACCEL;
  if (state.keys.right) state.vx += ACCEL;
  state.vx *= FRICTION;
  state.vx = Math.max(-MAX_VX, Math.min(MAX_VX, state.vx));

  // 중력/상승기류
  state.vy += inVent(level, state.x) ? LIFT : GRAVITY;
  state.vy = Math.max(MAX_RISE, Math.min(MAX_FALL, state.vy));

  state.x += state.vx;
  state.y += state.vy;

  // 벽 클램프 (왼쪽/천장)
  if (state.x < 2) { state.x = 2; state.vx = 0; }
  if (state.y < CEIL_Y) { state.y = CEIL_Y; state.vy = 0; }

  // 오른쪽 벽 — 출구 범위면 클리어, 아니면 벽
  const ex = level.exit;
  if (state.x + PLANE_W >= W - 8) {
    if (state.y > ex.y && state.y + PLANE_H < ex.y + ex.h) {
      if (state.room === LEVELS.length - 1) {
        state.phase = 'won'; state.phaseT = 150;
      } else {
        state.phase = 'clear'; state.phaseT = 80;
      }
      return;
    }
    state.x = W - 8 - PLANE_W;
    state.vx = 0;
  }

  // 바닥 추락
  if (state.y + PLANE_H >= FLOOR_Y) { die(); return; }

  // 장애물 충돌 (AABB)
  for (const b of obstacleBoxes(level)) {
    if (state.x < b.x + b.w && state.x + PLANE_W > b.x &&
        state.y < b.y + b.h && state.y + PLANE_H > b.y) {
      die();
      return;
    }
  }
}

function tick() {
  frame += 1;
  step();
  if (state.phase === 'intro') {
    drawIntro(frame);
  } else {
    drawRoom(frame);
    drawPlane();
    if (state.flash > 0) {
      state.flash -= 1;
      ctx.fillStyle = `rgba(255,80,80,${state.flash * 0.04})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (state.phase === 'clear') drawOverlay(['NEXT SET ♪', `ROOM ${state.room + 2} COMING UP`]);
    if (state.phase === 'won') drawOverlay(['ENCORE!', 'YOU MADE IT THROUGH THE LOUNGE']);
  }
  rafId = requestAnimationFrame(tick);
}

function startLoop() {
  if (rafId === null) rafId = requestAnimationFrame(tick);
}
function stopLoop() {
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}

function updateStatus() {
  const roomEl = document.getElementById('glider-room');
  const deathEl = document.getElementById('glider-deaths');
  if (roomEl) roomEl.textContent = `ROOM ${state.room + 1}/${LEVELS.length}`;
  if (deathEl) deathEl.textContent = `CRASHES ${state.deaths}`;
}

// ── 창 DOM ──────────────────────────────────────────────────────────────────
function gliderWindowHTML() {
  return `
  <div class="glider-win" id="glider-win" hidden>
    <div class="glider-header" id="glider-header">
      <div class="glider-header-side">
        <button class="glider-close" id="glider-close" aria-label="닫기"></button>
        <span class="glider-header-pinstripe" aria-hidden="true"></span>
      </div>
      <span class="glider-header-title">Glider 4.0</span>
      <div class="glider-header-side glider-header-side-right">
        <span class="glider-header-pinstripe" aria-hidden="true"></span>
      </div>
    </div>
    <div class="glider-body">
      <div class="glider-status">
        <span id="glider-room">ROOM 1/${LEVELS.length}</span>
        <span class="glider-hint">← → TO GLIDE &nbsp;·&nbsp; RIDE THE DRAFTS</span>
        <span id="glider-deaths">CRASHES 0</span>
      </div>
      <canvas class="glider-canvas" id="glider-canvas" width="${W}" height="${H}"></canvas>
    </div>
  </div>`;
}

function makeGliderDraggable(win) {
  const header = document.getElementById('glider-header');
  let dragging = false, pid = null, sx = 0, sy = 0, ox = 0, oy = 0;
  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.glider-close')) return;
    const r = win.getBoundingClientRect();
    win.style.left = r.left + 'px';
    win.style.top = r.top + 'px';
    win.style.transform = 'none';
    dragging = true;
    pid = e.pointerId;
    header.setPointerCapture(pid);
    sx = e.clientX; sy = e.clientY;
    ox = r.left; oy = r.top;
    win.classList.add('dragging');
    e.preventDefault();
  });
  header.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pid) return;
    let nx = ox + (e.clientX - sx);
    let ny = oy + (e.clientY - sy);
    nx = Math.max(-win.offsetWidth + 60, Math.min(nx, window.innerWidth - 60));
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
}

// ── 초기화 ──────────────────────────────────────────────────────────────────
function initGlider() {
  const mount = document.createElement('div');
  mount.innerHTML = gliderWindowHTML();
  document.body.append(...mount.children);

  const win = document.getElementById('glider-win');
  const canvas = document.getElementById('glider-canvas');
  ctx = canvas.getContext('2d');
  makeGliderDraggable(win);

  win.addEventListener('pointerdown', () => {
    window.__bringToFront?.(win);
  });

  canvas.addEventListener('click', () => {
    if (state.phase === 'intro') startGameFromIntro();
  });

  document.getElementById('glider-close').addEventListener('click', () => {
    win.hidden = true;
    stopLoop();
    state.keys.left = state.keys.right = false;
    // 다시 열면 인트로부터 — 아케이드 캐비닛처럼 세션이 리셋되는 느낌
    state.phase = 'intro';
    state.room = 0;
    state.deaths = 0;
    resetPlane();
  });

  win.tabIndex = -1;
  win.addEventListener('keydown', (e) => {
    if (state.phase === 'intro') {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        startGameFromIntro();
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowLeft') { state.keys.left = true; e.preventDefault(); }
    if (e.key === 'ArrowRight') { state.keys.right = true; e.preventDefault(); }
  });
  win.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') state.keys.left = false;
    if (e.key === 'ArrowRight') state.keys.right = false;
  });
  // 키를 누른 채 창 밖을 클릭하면 keyup을 놓칠 수 있음 — 포커스 잃으면 초기화
  win.addEventListener('blur', () => { state.keys.left = state.keys.right = false; });

  const icon = document.getElementById('icon-glider');
  if (icon) {
    icon.addEventListener('click', () => {
      win.hidden = false;
      window.__bringToFront?.(win);
      window.__tigerRun?.reportWindowAction();
      win.focus();
      startLoop();
    });
  }
}

initGlider();

// 테스트/디버그 훅 (blairtunes의 __blairTunes와 같은 컨벤션).
// stepN: rAF와 무관하게 물리를 n프레임 강제 진행 + 1회 그리기 — 백그라운드
// 탭(rAF 정지)에서도 게임 로직을 결정론적으로 검증할 수 있게 한다.
window.__glider = {
  state, LEVELS,
  resetPlane: () => resetPlane(),
  startGameFromIntro: () => startGameFromIntro(),
  stepN: (n) => {
    for (let i = 0; i < n; i++) { frame += 1; step(); }
    if (state.phase === 'intro') drawIntro(frame);
    else { drawRoom(frame); drawPlane(); }
    return { x: state.x, y: state.y, vx: state.vx, vy: state.vy, room: state.room, deaths: state.deaths, phase: state.phase };
  },
};
})();
