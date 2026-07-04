# CLAUDE.md — Sejeong Lee 포트폴리오 (레트로 Mac OS9 컨셉)

바닐라 HTML/CSS/JS 정적 사이트. 빌드 없음, 프레임워크 없음.
Figma 파일이 디자인의 single source of truth:
https://www.figma.com/design/nOOniYoXTbhuQ0FxO4ifAV/Untitled

## 페이지 구조 / 플로우

- `index.html` — **3D 매킨토시 랜딩** (Three.js r128, CDN 로드). Figma 노드 `1:35`.
  스크린 클릭 → 화이트 페이드 → `desktop.html`로 이동.
- `desktop.html` — **OS9 스타일 데스크탑** (Figma 노드 `99:2332`).
  메뉴바 + 데스크탑 아이콘 + CU-SeeMe 창 2개:
  - "SEJEONG LEE (Local)": `src/CU-SeeME/hello-halftone.mp4` 재생 (흑백 하프톤)
  - "You (Remote)": `getUserMedia` 웹캠 (권한 요청 → 미러 표시), FILTER = 실시간 소프트 디더
  - SHOW LOVE/FREE BIRDS/GIMME LOVE = Photo Booth 스타일 픽셀 하트/새 이펙트
  - "...SEE ME?" 아이콘 클릭 = 닫힌 CU-SeeMe 창 재오픈
- `blair-os.html` — 레거시 데스크탑 (구 index.html, 참조용 보존. 플로우에서 미사용)
- `design.md` — **반응형 팝업 레이아웃 규칙의 source of truth** (브레이크포인트 768px,
  세이프 에어리어 20px, CU-SeeMe 320px max / 비디오 3:2, 스태거 배치, 레트로 섀도).
  팝업 레이아웃을 바꿀 땐 design.md와 구현을 함께 갱신할 것.

## 반드시 알아야 할 기술 제약

1. **file:// canvas taint**: 로컬에서 열면 외부 이미지 파일을 캔버스에 그리는 순간
   Three.js 텍스처 업로드가 `SecurityError`로 전부 실패한다. 그래서 3D 스크린에
   들어가는 이미지(워드마크·호랑이)는 `data/mac3d-assets.js`에 **data URI로 임베드**됨.
   스크린 콘텐츠 에셋을 바꿀 땐 반드시 이 파일의 base64를 갱신할 것.
2. **hello-halftone.mp4 재생성 파이프라인** (ffmpeg — imageio-ffmpeg 바이너리 사용 가능):
   `hue=s=0, eq=contrast=0.98:brightness=0.04` → 2색 Bayer 디더(bayer_scale=1)를
   `blend=multiply:opacity=0.26`으로 합성 → 320×240 → neighbor 2배 업스케일.
   "유령 포스터"처럼 무섭지 않게, 소프트 그레이스케일 + 은은한 도트가 목표.
3. **폰트**: Pretendard(CDN link), VT323(`src/fonts/VT323-Regular.ttf` 번들, FontFace 로드).
   태그라인·라벨·창 타이틀은 전부 VT323.
4. 3D 렌더 검증은 헤드리스 스크린샷(CDP + 몇 초 실시간 대기)으로 —
   `--virtual-time-budget`은 rAF만 빨리 돌아서 이미지/폰트 로드 전에 찍힘.
   SwiftShader 렌더는 실제 GPU보다 밝게 나오므로 톤 비교는 참고만.

## 배포

- **GitHub `main`에 push하면 Vercel이 자동으로 프로덕션 배포** (연결 완료 상태).
- 프로덕션: https://portfolio-mu-tan-9x1aeva6c8.vercel.app
- Vercel 프로젝트: `portfolio` (blair-lees-projects). 수동 배포: `npx vercel --prod`.
- 배포별 URL(`portfolio-xxxx-...vercel.app`)이 로그인 화면으로 가는 건 정상(SSO 보호).

## 작업 규칙

- 기기 여러 대(맥북/아이맥)에서 작업: **시작 전 `git pull`, 끝나면 push.**
- 프로젝트는 `~/development/portfolio`에 둘 것 (Desktop은 macOS 권한 문제 잦음).
- 디자인 수정은 Figma 기준으로: MCP로 노드를 가져와 실측값으로 구현·검증.
