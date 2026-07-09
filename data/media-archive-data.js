// ═══════════════════════════════════════════════════════════
// Media Archive Data — 3D 플로팅 미디어 아카이브(media-archive.html)용
//
// 이번 패스는 검정 placeholder 사각형만 그린다(실제 이미지/영상 매핑 안 함) —
// 그래서 src는 "다음 단계에서 매핑할 자리"로만 존재하고 지금은 사용되지 않는다.
// width/height는 지금 당장은 파티클의 종횡비(aspect ratio) 소스로 쓰이고,
// 나중에 실제 미디어를 매핑할 때도 그대로 실제 자산 픽셀 크기로 의미가 이어진다.
//
// 실제 자산으로 교체하는 법은 media-archive.html 상단 주석 참고.
//
// 각 항목 스키마:
//   id     — 고유 문자열
//   type   — 'image' | 'video' (현재는 렌더링에 전혀 안 쓰임 — 구조만 준비)
//   src    — src/ 기준 상대경로 (지금은 로드하지 않음)
//   width  — 원본(예정) 픽셀 가로
//   height — 원본(예정) 픽셀 세로
// ═══════════════════════════════════════════════════════════

(function () {
  const FRAGMENTS = [
    'src/images/media-archive/fragment-01.jpg',
    'src/images/media-archive/fragment-02.jpg',
    'src/images/media-archive/fragment-03.jpg',
    'src/images/media-archive/fragment-04.jpg',
    'src/images/media-archive/fragment-05.jpg',
    'src/images/media-archive/fragment-06.jpg',
    'src/images/media-archive/fragment-07.jpg',
    'src/images/media-archive/fragment-08.jpg',
    'src/images/media-archive/fragment-09.jpg',
    'src/images/media-archive/fragment-10.jpg',
    'src/images/media-archive/fragment-11.jpg',
    'src/images/media-archive/fragment-12.jpg',
    'src/images/media-archive/fragment-13.jpg',
    'src/images/media-archive/fragment-14.jpg',
  ];

  // 다양한 종횡비(정사각/세로/가로/와이드) 순환 — 실제 포트폴리오 사진·영상에서
  // 흔한 비율들을 대표로 삼음. 파티클의 "사이즈"는 별도로 렌더 단에서 랜덤 스케일을
  // 곱해 정하고, 여기 width/height는 순수하게 비율(aspect)만 제공한다.
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

  const TOTAL = 50;
  const data = [];
  for (let i = 0; i < TOTAL; i++) {
    const n = String(i + 1).padStart(2, '0');
    const dim = DIMENSIONS[i % DIMENSIONS.length];
    data.push({
      id: `frag-${n}`,
      type: 'image',
      src: FRAGMENTS[i % FRAGMENTS.length],
      width: dim.width,
      height: dim.height,
    });
  }

  window.MEDIA_ARCHIVE_DATA = data;
}());
