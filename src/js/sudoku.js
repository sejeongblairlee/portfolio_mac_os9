// ═══════════════════════════════════════════════════════════════════════════
// Sudoku — blairtunes.js와 동일한 컨벤션의 self-mounting 모듈.
// 자체 창 DOM을 만들어 document.body에 붙이고, 드래그/포커스 스택은
// desktop.html이 노출한 window.__bringToFront(옵셔널 체이닝)에 참여한다.
// 이 스크립트가 desktop.html 없이 단독으로 쓰일 일은 없지만 방어적으로 처리.
// ═══════════════════════════════════════════════════════════════════════════

const DIFFICULTY_CLUES = { easy: 40, medium: 32, hard: 26 };

// ── "Flower on Stem" 픽셀 아이콘 (Susan Kare, Esc Keys 커뮤니티 파일) ───────
// Figma g9siOrhHKSg8Is4wdeWOdF, node 1:11331 — 11×12 픽셀 그리드를 좌표
// 그대로 옮김(원본 39개 vector 노드 좌표를 29px 그리드 피치로 역산). 원본은
// 흑백이라 색은 임의로 칠함(요청대로): 꽃잎 핑크 / 줄기·잎 그린. 꽃머리 중앙의
// 빈 칸 1개는 원본에도 있는 "구멍" 하이라이트라 그대로 투명 유지.
const FLOWER_PETAL_CELLS = [
  [4, 0], [5, 0], [6, 0],
  [3, 1], [4, 1], [6, 1], [7, 1],
  [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
  [4, 3], [5, 3], [6, 3],
];
const FLOWER_STEM_CELLS = [
  [0, 4], [1, 4], [5, 4], [8, 4], [9, 4], [10, 4],
  [0, 5], [1, 5], [2, 5], [5, 5], [7, 5], [8, 5], [9, 5],
  [1, 6], [2, 6], [3, 6], [5, 6], [6, 6], [7, 6],
  [4, 7],
  [4, 8],
  [3, 9],
  [3, 10],
  [3, 11],
];
const FLOWER_CELL = 2;
const FLOWER_W = 11 * FLOWER_CELL;
const FLOWER_H = 12 * FLOWER_CELL;

function flowerSVG(petalColor, stemColor) {
  const rects = [
    ...FLOWER_PETAL_CELLS.map(([c, r]) =>
      `<rect x="${c * FLOWER_CELL}" y="${r * FLOWER_CELL}" width="${FLOWER_CELL}" height="${FLOWER_CELL}" fill="${petalColor}"/>`),
    ...FLOWER_STEM_CELLS.map(([c, r]) =>
      `<rect x="${c * FLOWER_CELL}" y="${r * FLOWER_CELL}" width="${FLOWER_CELL}" height="${FLOWER_CELL}" fill="${stemColor}"/>`),
  ].join('');
  return `<svg viewBox="0 0 ${FLOWER_W} ${FLOWER_H}" width="${FLOWER_W}" height="${FLOWER_H}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

const FLOWER_STEM_COLOR = '#3fa35c';

// 지우개 버튼을 누르면 버튼 주변으로 무작위 색 꽃이 여러 송이 튀어나왔다 사라짐.
function spawnFlowerBloom(btn) {
  const COUNT = 7;
  for (let i = 0; i < COUNT; i++) {
    const el = document.createElement('div');
    el.className = 'sudoku-bloom';
    const hue = Math.floor(Math.random() * 360);
    el.innerHTML = flowerSVG(`hsl(${hue} 80% 60%)`, FLOWER_STEM_COLOR);
    const angle = (Math.PI * 2 * i) / COUNT + (Math.random() * 0.6 - 0.3);
    const dist = 26 + Math.random() * 18;
    el.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    el.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    el.style.setProperty('--rot0', `${Math.random() * 40 - 20}deg`);
    el.style.setProperty('--rot1', `${Math.random() * 90 - 45}deg`);
    el.style.setProperty('--sc', `${0.8 + Math.random() * 0.6}`);
    btn.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// ── "Heart" 픽셀 아이콘 (Susan Kare, Esc Keys 커뮤니티 파일) ────────────────
// Figma g9siOrhHKSg8Is4wdeWOdF, node 1:10805 — 13×12 그리드. 대부분 행이
// 연속 구간이라(왼쪽 로브/오른쪽 로브/노치 정도만 예외) 셀 하나하나가 아니라
// 행별 [시작열,끝열] range로 인코딩(101개 vector 좌표를 29px 그리드로 역산 후
// 압축). 완성 시 보드 중앙에서 팡 터지는 연출에 사용(spawnHeartBurst).
// 함수명은 desktop.html이 CU-SeeMe SHOW LOVE/GIMME LOVE에서 이미 쓰고 있는
// 전역 heartSVG(size)와 겹치지 않게 sudokuHeartSVG로 분리(둘 다 <script> 최상위
// 함수 선언이라 이름이 같으면 나중에 로드되는 쪽이 window.heartSVG를 덮어써버림
// — 실제로 이 충돌 때문에 CU-SeeMe 하트가 깨졌었음, 재발 방지용 네이밍).
const HEART_ROW_RANGES = [
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
const HEART_CELL = 2;
const HEART_W = 13 * HEART_CELL;
const HEART_H = 12 * HEART_CELL;

function sudokuHeartSVG(color) {
  const rects = [];
  HEART_ROW_RANGES.forEach((ranges, row) => {
    ranges.forEach(([c0, c1]) => {
      rects.push(`<rect x="${c0 * HEART_CELL}" y="${row * HEART_CELL}" width="${(c1 - c0 + 1) * HEART_CELL}" height="${HEART_CELL}" fill="${color}"/>`);
    });
  });
  return `<svg viewBox="0 0 ${HEART_W} ${HEART_H}" width="${HEART_W}" height="${HEART_H}" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}

const HEART_COLORS = ['#ff4d6d', '#ff8fa3', '#ff1744', '#ff6b9d', '#e63950', '#ff9eb5'];

// 스도쿠를 다 풀면 보드(#sudoku-grid) 중앙에서 하트가 팡 터지듯 사방으로 퍼짐.
function spawnHeartBurst() {
  const grid = document.getElementById('sudoku-grid');
  const COUNT = 22;
  for (let i = 0; i < COUNT; i++) {
    const el = document.createElement('div');
    el.className = 'sudoku-heart-burst';
    const color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
    el.innerHTML = sudokuHeartSVG(color);
    const angle = (Math.PI * 2 * i) / COUNT + (Math.random() * 0.5 - 0.25);
    const dist = 90 + Math.random() * 90;
    const dur = 550 + Math.random() * 350;
    const delay = Math.random() * 200;
    const rot = (Math.random() - 0.5) * 100;
    const peakScale = 1.1 + Math.random() * 0.6;
    el.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    el.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    el.style.setProperty('--rot', `${rot}deg`);
    el.style.setProperty('--peak', `${peakScale}`);
    el.style.animationDuration = `${dur}ms`;
    el.style.animationDelay = `${delay}ms`;
    grid.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

const state = {
  grid: null,        // 9x9 현재 값 (0 = 빈칸)
  given: null,        // 9x9 boolean — true면 초기 단서(수정 불가)
  solution: null,      // 9x9 정답 그리드
  selected: null,       // {r, c} | null
  difficulty: 'easy',
};

// ── 스도쿠 생성 — 백트래킹으로 완성 그리드 → 유일해 유지하며 셀 제거 ──────────

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValidPlacement(grid, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num || grid[i][col] === num) return false;
  }
  const br = row - (row % 3), bc = col - (col % 3);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[br + r][bc + c] === num) return false;
    }
  }
  return true;
}

function fillGrid(grid) {
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9), col = i % 9;
    if (grid[row][col] !== 0) continue;
    for (const n of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (isValidPlacement(grid, row, col, n)) {
        grid[row][col] = n;
        if (fillGrid(grid)) return true;
        grid[row][col] = 0;
      }
    }
    return false;
  }
  return true;
}

// limit개 도달하면 즉시 중단 — "해가 정확히 1개인가"만 확인하면 되므로 limit=2로 충분
function countSolutions(grid, limit) {
  let count = 0;
  function backtrack() {
    if (count >= limit) return;
    for (let i = 0; i < 81; i++) {
      const row = Math.floor(i / 9), col = i % 9;
      if (grid[row][col] === 0) {
        for (let n = 1; n <= 9; n++) {
          if (isValidPlacement(grid, row, col, n)) {
            grid[row][col] = n;
            backtrack();
            grid[row][col] = 0;
            if (count >= limit) return;
          }
        }
        return;
      }
    }
    count++;
  }
  backtrack();
  return count;
}

function generatePuzzle(difficulty) {
  const solved = Array.from({ length: 9 }, () => Array(9).fill(0));
  fillGrid(solved);

  const puzzle = solved.map((row) => row.slice());
  const targetClues = DIFFICULTY_CLUES[difficulty] ?? DIFFICULTY_CLUES.easy;
  let clues = 81;

  for (const idx of shuffled(Array.from({ length: 81 }, (_, i) => i))) {
    if (clues <= targetClues) break;
    const row = Math.floor(idx / 9), col = idx % 9;
    const backup = puzzle[row][col];
    if (backup === 0) continue;
    puzzle[row][col] = 0;
    // 유일해 여부는 이 셀만 지운 상태로 매번 새로 확인 — 해 개수 세는 동안
    // grid를 파괴적으로 건드리므로 puzzle 자체가 아니라 복사본에 대해 수행.
    const solutions = countSolutions(puzzle.map((r) => r.slice()), 2);
    if (solutions === 1) {
      clues--;
    } else {
      puzzle[row][col] = backup;
    }
  }

  const given = puzzle.map((row) => row.map((v) => v !== 0));
  return { puzzle, solved, given };
}

function newGame(difficulty) {
  state.difficulty = difficulty;
  const { puzzle, solved, given } = generatePuzzle(difficulty);
  state.grid = puzzle;
  state.solution = solved;
  state.given = given;
  state.selected = null;
  renderGrid();
  updateDifficultyButtons();
  setStatus('');
}

// ── 렌더링 ────────────────────────────────────────────────────────────────

function sudokuWindowHTML() {
  const cells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cls = ['sudoku-cell'];
      if (c === 2 || c === 5) cls.push('border-r3');
      if (r === 2 || r === 5) cls.push('border-b3');
      cells.push(`<button type="button" class="${cls.join(' ')}" data-row="${r}" data-col="${c}"></button>`);
    }
  }
  return `
  <div class="sudoku-win" id="sudoku-win" hidden>
    <div class="sudoku-header" id="sudoku-header">
      <div class="sudoku-header-side">
        <button class="sudoku-close" id="sudoku-close" aria-label="닫기"></button>
        <span class="sudoku-header-pinstripe" aria-hidden="true"></span>
      </div>
      <span class="sudoku-header-title">Sudoku</span>
      <div class="sudoku-header-side sudoku-header-side-right">
        <span class="sudoku-header-pinstripe" aria-hidden="true"></span>
      </div>
    </div>
    <div class="sudoku-body">
      <div class="sudoku-toolbar">
        <div class="sudoku-diff-group" id="sudoku-diff-group">
          <button class="sudoku-diff-btn" data-diff="easy">EASY</button>
          <button class="sudoku-diff-btn" data-diff="medium">MEDIUM</button>
          <button class="sudoku-diff-btn" data-diff="hard">HARD</button>
        </div>
        <button class="sudoku-new-btn" id="sudoku-new">NEW GAME</button>
      </div>
      <div class="sudoku-grid" id="sudoku-grid">${cells.join('')}</div>
      <div class="sudoku-numpad" id="sudoku-numpad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" class="sudoku-num-btn" data-num="${n}">${n}</button>`).join('')}
        <button type="button" class="sudoku-num-btn sudoku-erase" data-num="0" aria-label="지우기">${flowerSVG('#ff3d8e', FLOWER_STEM_COLOR)}</button>
      </div>
      <p class="sudoku-status" id="sudoku-status">&nbsp;</p>
    </div>
  </div>`;
}

function hasConflict(row, col) {
  const val = state.grid[row][col];
  if (val === 0) return false;
  for (let i = 0; i < 9; i++) {
    if (i !== col && state.grid[row][i] === val) return true;
    if (i !== row && state.grid[i][col] === val) return true;
  }
  const br = row - (row % 3), bc = col - (col % 3);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if ((br + r !== row || bc + c !== col) && state.grid[br + r][bc + c] === val) return true;
    }
  }
  return false;
}

function renderGrid() {
  const sel = state.selected;
  document.querySelectorAll('#sudoku-grid .sudoku-cell').forEach((cell) => {
    const r = Number(cell.dataset.row), c = Number(cell.dataset.col);
    const val = state.grid[r][c];
    cell.textContent = val === 0 ? '' : String(val);
    cell.classList.toggle('given', state.given[r][c]);
    cell.classList.toggle('error', hasConflict(r, c));
    cell.classList.toggle('selected', !!sel && sel.r === r && sel.c === c);
    cell.classList.toggle('peer', !!sel && !(sel.r === r && sel.c === c) &&
      (sel.r === r || sel.c === c || (Math.floor(sel.r / 3) === Math.floor(r / 3) && Math.floor(sel.c / 3) === Math.floor(c / 3))));
  });
}

function updateDifficultyButtons() {
  document.querySelectorAll('.sudoku-diff-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.diff === state.difficulty);
  });
}

function setStatus(text, isWin = false) {
  const el = document.getElementById('sudoku-status');
  el.textContent = text || ' ';
  el.classList.toggle('win', isWin);
}

function checkWin() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.grid[r][c] === 0 || hasConflict(r, c)) return false;
    }
  }
  return true;
}

// ── 입력 처리 ─────────────────────────────────────────────────────────────

function selectCell(r, c) {
  if (state.given[r][c]) {
    state.selected = { r, c };
    renderGrid();
    return;
  }
  state.selected = { r, c };
  renderGrid();
}

function inputNumber(n) {
  if (!state.selected) return;
  const { r, c } = state.selected;
  if (state.given[r][c]) return;
  state.grid[r][c] = n;
  renderGrid();
  if (n !== 0 && checkWin()) {
    setStatus('SOLVED!', true);
    // 한 번 팡 터지고 끝나던 걸 연속 3연타로 — 각 버스트가 550~900ms 정도
    // 지속되니 450ms 간격으로 살짝 겹치게 터뜨려서 하나씩 끊기지 않고
    // 리듬감 있게 이어지는 느낌으로.
    spawnHeartBurst();
    setTimeout(spawnHeartBurst, 450);
    setTimeout(spawnHeartBurst, 900);
  } else {
    setStatus('');
  }
}

function moveSelection(dr, dc) {
  const base = state.selected ?? { r: 0, c: 0 };
  const r = Math.max(0, Math.min(8, base.r + dr));
  const c = Math.max(0, Math.min(8, base.c + dc));
  state.selected = { r, c };
  renderGrid();
}

// ── 드래그 (blairtunes.js의 makeDraggable과 동일 패턴, 이름은 겹치지 않게) ──
// blairtunes.js도 최상위 function makeDraggable/windowHTML을 똑같이 쓰는데,
// <script> 최상위 function 선언은 두 파일 다 window에 같은 이름으로 걸려서
// 나중에 로드되는 쪽이 덮어씀 — 지금까지는 blairtunes가 자기 버전을 이미 다
// 쓰고 난 뒤에 sudoku.js가 로드되는 순서라 우연히 증상이 없었을 뿐, heartSVG
// 충돌(CU-SeeMe 하트 깨짐)과 같은 종류의 잠재 버그라 sudoku 쪽만 접두어를 붙임.

function makeSudokuDraggable(win) {
  const header = document.getElementById('sudoku-header');
  let dragging = false, pid = null, sx = 0, sy = 0, ox = 0, oy = 0;

  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.sudoku-close')) return;
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

// ── 초기화 ────────────────────────────────────────────────────────────────

function initSudoku() {
  const mount = document.createElement('div');
  mount.innerHTML = sudokuWindowHTML();
  document.body.append(...mount.children);

  const win = document.getElementById('sudoku-win');
  makeSudokuDraggable(win);

  win.addEventListener('pointerdown', () => {
    window.__bringToFront?.(win);
  });

  document.getElementById('sudoku-close').addEventListener('click', () => {
    win.hidden = true;
  });

  document.getElementById('sudoku-grid').addEventListener('click', (e) => {
    const cell = e.target.closest('.sudoku-cell');
    if (!cell) return;
    selectCell(Number(cell.dataset.row), Number(cell.dataset.col));
  });

  document.getElementById('sudoku-numpad').addEventListener('click', (e) => {
    const btn = e.target.closest('.sudoku-num-btn');
    if (!btn) return;
    if (btn.classList.contains('sudoku-erase')) spawnFlowerBloom(btn);
    inputNumber(Number(btn.dataset.num));
  });

  document.getElementById('sudoku-diff-group').addEventListener('click', (e) => {
    const btn = e.target.closest('.sudoku-diff-btn');
    if (!btn) return;
    newGame(btn.dataset.diff);
  });

  document.getElementById('sudoku-new').addEventListener('click', () => {
    newGame(state.difficulty);
  });

  win.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '9') { inputNumber(Number(e.key)); return; }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { inputNumber(0); return; }
    if (e.key === 'ArrowUp') { moveSelection(-1, 0); e.preventDefault(); return; }
    if (e.key === 'ArrowDown') { moveSelection(1, 0); e.preventDefault(); return; }
    if (e.key === 'ArrowLeft') { moveSelection(0, -1); e.preventDefault(); return; }
    if (e.key === 'ArrowRight') { moveSelection(0, 1); e.preventDefault(); return; }
  });
  win.tabIndex = -1;

  newGame('easy');

  const icon = document.getElementById('icon-sudoku');
  if (icon) {
    icon.addEventListener('click', () => {
      win.hidden = false;
      window.__bringToFront?.(win);
      window.__tigerRun?.reportWindowAction();
      win.focus();
    });
  }
}

initSudoku();
