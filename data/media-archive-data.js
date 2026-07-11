// ═══════════════════════════════════════════════════════════
// Media Archive Data — index.html(루트 랜딩, 미디어 아카이브)용
//
// src는 리포 루트 기준 URL 경로(선행 슬래시)다. index.html이 이 경로를
// THREE.TextureLoader(이미지) / <video>+VideoTexture(영상)로 실제 로드한다.
// 로드에 성공하면 실측 naturalWidth/naturalHeight(영상은 videoWidth/videoHeight)
// 비율에 맞춰 파티클 프레임 자체의 크기(scale.x/scale.y)를 다시 잡아서 크롭 없이
// 전체 이미지/영상이 보이게 한다(0.55~1.8로 clamp — 9:16/16:9는 그대로 커버하고
// 극단적 비율만 레이아웃 보호용으로 완화). 파일이 없거나 로드에 실패하면 별도
// 처리 없이 검정 placeholder가 그대로 유지된다.
//
// 실제 파일은 다음 폴더에 넣는다:
//   이미지 — images/media-archive/
//   영상   — videos/media-archive/
// (public/ 아래에는 두지 않는다 — 이 리포는 빌드 없는 순수 정적 루트라
// public/이 커밋되면 Vercel이 배포 루트를 public/로 오인해 index.html 등
// 기존 페이지가 전부 깨질 수 있음. 자세한 배경은 커밋 로그 참고.)
//
// width/height는 로드 전(placeholder 단계) 파티클 프레임의 종횡비를 미리 잡는
// 용도일 뿐 — 실제 로드가 끝나면 위 실측 비율로 다시 계산되어 대체된다.
//
// 각 항목 스키마:
//   id     — 고유 문자열
//   type   — 'image' | 'video'
//   src    — 루트 기준 URL 경로.
//            예: /images/media-archive/fragment-01.jpg
//                /videos/media-archive/clip-01.mp4
//   width  — 원본(예정) 픽셀 가로
//   height — 원본(예정) 픽셀 세로
// ═══════════════════════════════════════════════════════════

(function () {
  // images/media-archive/ 에 실제로 들어있는 파일 목록 그대로 — 파일을 추가/교체하면
  // 여기 목록도 같이 갱신한다(확장자까지 정확히 일치해야 함, 대소문자 포함).
  const FRAGMENTS = [
    '/images/media-archive/fragment-01.png',
    '/images/media-archive/fragment-02.JPG',
    '/images/media-archive/fragment-03.png',
    '/images/media-archive/fragment-04.png',
    '/images/media-archive/fragment-05.jpg',
    '/images/media-archive/fragment-06.jpg',
    '/images/media-archive/fragment-07.jpg',
    '/images/media-archive/fragment-08.jpg',
    '/images/media-archive/fragment-09.jpg',
    '/images/media-archive/fragment-10.png',
    '/images/media-archive/fragment-11.png',
    '/images/media-archive/fragment-12.jpg',
    '/images/media-archive/fragment-13.JPG',
    '/images/media-archive/fragment-14.JPG',
    '/images/media-archive/fragment-15.png',
    '/images/media-archive/fragment-16.png',
    '/images/media-archive/fragment-17.jpg',
    '/images/media-archive/fragment-18.jpg',
    '/images/media-archive/fragment-19.jpg',
    '/images/media-archive/fragment-20.jpg',
    '/images/media-archive/fragment-21.jpg',
    '/images/media-archive/fragment-22.JPG',
    '/images/media-archive/fragment-23.png',
    '/images/media-archive/fragment-24.png',
    '/images/media-archive/fragment-25.png',
    '/images/media-archive/fragment-26.jpg',
    '/images/media-archive/fragment-27.JPG',
    '/images/media-archive/fragment-28.png',
    '/images/media-archive/fragment-29.png',
    '/images/media-archive/fragment-30.png',
  ];

  // videos/media-archive/ 에 실제로 들어있는 영상 목록 — 마찬가지로 파일 추가/교체 시
  // 갱신한다. 없으면 빈 배열로 둬도 안전(아래 로직이 자동으로 전부 이미지로 채움).
  const VIDEOS = [
    '/videos/media-archive/clip-01.mp4',
    '/videos/media-archive/clip-02.mp4',
    '/videos/media-archive/clip-03.mp4',
    '/videos/media-archive/clip-04.mp4',
    '/videos/media-archive/clip-05.mp4',
    '/videos/media-archive/clip-06.mp4',
  ];

  // 다양한 종횡비(정사각/세로/가로/와이드) 순환 — 실제 포트폴리오 사진·영상에서
  // 흔한 비율들을 대표로 삼음. 파티클의 "사이즈"는 별도로 렌더 단에서 랜덤 스케일을
  // 곱해 정하고, 여기 width/height는 순수하게 비율(aspect)만 제공한다(로드 전
  // placeholder 단계에서만 쓰이고, 로드 후에는 실측 비율로 대체됨).
  const DIMENSIONS = [
    { width: 1600, height: 1200 }, // 4:3
    { width: 1200, height: 1600 }, // 3:4
    { width: 1920, height: 1080 }, // 16:9
    { width: 1080, height: 1920 }, // 9:16
    { width: 1400, height: 1750 }, // 4:5
    { width: 1750, height: 1400 }, // 5:4
    { width: 1200, height: 1200 }, // 1:1
    { width: 1600, height: 900 },  // 16:9
    { width: 1000, height: 1500 }, // 2:3
    { width: 1500, height: 1000 }, // 3:2
  ];

  // FRAGMENTS/VIDEOS에 실제로 있는 파일 각각 정확히 1개씩만 파티클로 배치 —
  // 개수를 임의로 부풀리거나 순환(modulo)시켜 중복 표시하지 않는다. 그래서
  // 파티클 총 개수는 두 목록을 합친 실제 파일 개수를 그대로 따라간다(파일을
  // 추가/삭제하면 파티클 개수도 자동으로 늘고 줄어듦).
  const data = [];
  FRAGMENTS.forEach((src, i) => {
    const dim = DIMENSIONS[i % DIMENSIONS.length];
    data.push({
      id: `frag-${String(data.length + 1).padStart(2, '0')}`,
      type: 'image',
      src,
      width: dim.width,
      height: dim.height,
    });
  });
  VIDEOS.forEach((src, i) => {
    const dim = DIMENSIONS[(FRAGMENTS.length + i) % DIMENSIONS.length];
    data.push({
      id: `frag-${String(data.length + 1).padStart(2, '0')}`,
      type: 'video',
      src,
      width: dim.width,
      height: dim.height,
    });
  });

  window.MEDIA_ARCHIVE_DATA = data;
}());
