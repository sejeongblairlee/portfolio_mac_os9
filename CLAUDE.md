# CLAUDE.md — Sejeong Lee 포트폴리오 (레트로 Mac OS9 컨셉)

바닐라 HTML/CSS/JS 정적 사이트. 빌드 없음, 프레임워크 없음.
Figma 파일이 디자인의 single source of truth:
https://www.figma.com/design/nOOniYoXTbhuQ0FxO4ifAV/Untitled

## 페이지 구조 / 플로우

- 루트(`/`)는 **`desktop.html`을 바로 서빙** (2026-08-05부터, `vercel.json`의
  `rewrites: "/" → "/desktop.html"`). 부팅 화면 없이 데스크탑이 바로 뜬다.
  루트에 실제 `index.html` 파일이 있으면 Vercel이 rewrite보다 filesystem을
  먼저 서빙해버려서 rewrite가 무시된다 — **`index.html`을 절대 다시 만들지
  말 것** (만들면 루트가 그 파일로 되돌아가고 rewrite가 죽는다).
- `media-archive.html` — **구 루트 랜딩**(2026-07-09~2026-08-05, Three.js
  r128 파티클 필드, CDN 로드, 완전 인라인 self-contained. "Hello world /
  Welcome to my space." + "Press enter to boot..." → Enter/클릭 →
  `desktop.html`로 이동). 지금은 플로우에서 빠졌지만 랜딩 디자인을 나중에
  다시 바꿀 때 재사용하려고 `/media-archive.html` 경로로 보존.
- `desktop.html` — **OS9 스타일 데스크탑** (Figma 노드 `99:2332`).
  메뉴바 + 데스크탑 아이콘 + CU-SeeMe 창 2개:
  - "SEJEONG LEE (Local)": `src/CU-SeeME/hello-halftone.mp4` 재생 (흑백 하프톤)
  - "You (Remote)": `getUserMedia` 웹캠 (권한 요청 → 미러 표시), FILTER = 실시간 소프트 디더
  - SHOW LOVE/FREE BIRDS/GIMME LOVE = Photo Booth 스타일 픽셀 하트/새 이펙트
  - "...SEE ME?" 아이콘 클릭 = 닫힌 CU-SeeMe 창 재오픈
  - "Enjoy Music!" 아이콘 클릭 = **Blair-tunes 플레이어** 열기
    (`src/css/blairtunes.css` + `src/js/blairtunes.js`, Figma 6:748 데스크탑 /
    115:2964 모바일 / 107:2745 미니마이즈드. 데이터는 Supabase `tracks` —
    스키마/파이프라인은 `src/lib/*.ts`, 브라우저 포트는 blairtunes.js에 인라인.
    재생/볼륨/미니마이즈/자동다음곡/드래그 구현 완료. YT 플레이어 인스턴스는
    항상 1개(#bt-win 안) — 미니마이즈는 창만 숨기고 iframe을 옮기지 않는다
    (재부착=리로드). 트랙 전환은 loadVideoById. Figma에 진행바 UI가 없어서
    시킹은 seekTo() 로직만 존재, 시각화는 리스트/미니 duration 라벨 갱신뿐)
- `blair-os.html` — 레거시 데스크탑 (구 index.html, 참조용 보존. 플로우에서 미사용)
- `design.md` — **반응형 팝업 레이아웃 규칙의 source of truth** (브레이크포인트 768px,
  세이프 에어리어 20px, CU-SeeMe 320px max / 비디오 3:2, 스태거 배치, 레트로 섀도).
  팝업 레이아웃을 바꿀 땐 design.md와 구현을 함께 갱신할 것.

## 반드시 알아야 할 기술 제약

0. **YouTube 재생은 file://에서 절대 안 됨**: YouTube 임베드는 유효한 리퍼러를
   요구해서 로컬 파일로 열면 무조건 Error 153. 로컬 확인은 `npm run dev`
   (localhost:5500, 정적 서버) 또는 `npx vercel dev`(API 함수까지 필요할 때)로.
   배포 사이트에서는 정상 재생 (origin 파라미터 + referrerPolicy 설정됨).

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
- **`public/` 폴더를 저장소 루트에 절대 만들지 말 것.** 프레임워크 프리셋이
  "Other"라서, Vercel이 `public/`이 존재하면 그걸 Output Directory로 자동
  인식해버림 — 그러면 `public/` 밖의 모든 파일(`desktop.html`, `src/` 전체
  포함)이 프로덕션에서 통째로 404. 실제로 이 문제로 전체 배포가 깨진 적
  있음. `vercel.json`이 생긴 지금도(루트 rewrite용, `outputDirectory`는
  설정 안 함) 이 자동 인식 로직 자체는 그대로라 여전히 위험함. 정적 에셋은
  전부 `src/`(예: `src/images/`, `src/fonts/`) 밑에 두는 기존 컨벤션을
  따를 것. `.gitignore`에 `public/`이 등록돼 있음 — 로컬에 레퍼런스용
  `public/` 폴더가 있어도 커밋되지 않게.

## 작업 규칙

- 기기 여러 대(맥북/아이맥)에서 작업: **시작 전 `git pull`, 끝나면 push.**
- 프로젝트는 `~/development/portfolio`에 둘 것 (Desktop은 macOS 권한 문제 잦음).
- 디자인 수정은 Figma 기준으로: MCP로 노드를 가져와 실측값으로 구현·검증.
