// ═══════════════════════════════════════════════════════════
// Projects Data — Magazine Case Study Window
// 정렬 순서: Monimo(1) > F&F(2) > S.I.Village(3) > 다락(4)
// ═══════════════════════════════════════════════════════════

window.PROJECTS_DATA = [

  // ────────────────────────────────────────────
  // 1. 삼성 모니모 (Monimo)
  // ────────────────────────────────────────────
  {
    id: 'monimo',
    order: 1,
    title: '삼성 모니모',
    subtitle: 'MAU 100만+ 금융 슈퍼앱, End-to-End 구축 및 설계',
    period: '2023.03 – 2023.06',
    clientDomain: 'Finance / Super App',
    role: 'UX Strategy, UX Planning',
    contributionRate: 'End-to-End 설계 리드',
    icon: 'src/logo/monimo.png',
    heroImage: {
      type: 'screenshot',
      src: 'src/images/projects/monimo/hero.png',
      alt: '모니모 메인 대시보드',
      caption: '모니모 통합 자산 대시보드',
      aspectRatio: '16:9',
    },
    keyMetrics: [
      { label: 'MAU', before: '출시 전', after: '100만+', trend: 'up', highlight: true },
      { label: '설계 범위', before: '단위 기능', after: 'End-to-End 슈퍼앱', trend: 'up' },
      { label: '서비스 통합', before: '개별 분산', after: '단일 앱 통합', trend: 'up' },
    ],
    sections: [
      {
        id: 'monimo-problem',
        type: 'PROBLEM_DEFINITION',
        title: '흩어진 금융 경험, 통합되지 않은 자산 정보',
        content:
          '삼성카드, 삼성생명, 삼성증권 등 그룹 내 다양한 금융 자산 정보가 각기 다른 앱에 분산되어 있어, 사용자는 자신의 전체 자산 현황을 한눈에 파악하기 어려웠습니다.\n\n신규 슈퍼앱은 단순히 메뉴를 모으는 것을 넘어, "내 돈이 지금 어디에 얼마나 있는지"를 하나의 화면에서 직관적으로 보여줘야 한다는 요구가 핵심 출발점이었습니다.',
        media: [
          { type: 'diagram', src: 'src/images/projects/monimo/problem-fragmentation.png', alt: '기존 분산된 금융 서비스 구조도', caption: 'Fig 1. 통합 이전 자산 정보 분산 구조', aspectRatio: '4:5' },
        ],
      },
      {
        id: 'monimo-strategy',
        type: 'STRATEGY_PLANNING',
        title: '"자산 허브" 중심의 정보 구조 재설계',
        content:
          '전체 정보 구조를 자산 허브를 중심으로 재편하여, 카드/예적금/보험/투자 자산을 하나의 그리드형 대시보드에서 동시에 조망할 수 있도록 설계했습니다.\n\n동시에 신규 사용자의 온보딩 단계를 단순화하여, 최초 진입 시점부터 본인의 자산이 한 화면에 모이는 경험을 빠르게 체감하도록 우선순위를 조정했습니다.',
        media: [
          { type: 'wireframe', src: 'src/images/projects/monimo/ia-restructure.png', alt: '자산 허브 중심 정보구조도(IA)', caption: 'Fig 2. 자산 허브 중심 IA 재설계안', aspectRatio: '3:2' },
        ],
      },
      {
        id: 'monimo-design',
        type: 'DESIGN_SYSTEM_OR_FLOW',
        title: 'End-to-End 플로우 설계와 핵심 화면 구축',
        content:
          '온보딩, 자산 대시보드, 카드/혜택 탐색, 송금/이체 등 핵심 사용자 여정 전반을 End-to-End로 설계했습니다.\n\n대형 슈퍼앱 특성상 화면 수가 매우 많아, 컴포넌트 단위의 재사용성을 고려한 Hi-fi 화면 설계를 진행하여 개발 전환 효율을 높였습니다.',
        media: [
          { type: 'screenshot', src: 'src/images/projects/monimo/flow-onboarding.png', alt: '온보딩 플로우 화면', caption: 'Fig 3. 온보딩 플로우', aspectRatio: '4:5' },
          { type: 'screenshot', src: 'src/images/projects/monimo/flow-dashboard.png', alt: '자산 대시보드 Hi-fi 화면', caption: 'Fig 4. 통합 자산 대시보드', aspectRatio: '4:5' },
        ],
      },
      {
        id: 'monimo-impact',
        type: 'BUSINESS_IMPACT',
        title: '출시 이후 MAU 100만 돌파',
        content:
          '통합 슈퍼앱 출시 이후 빠르게 MAU 100만을 돌파하며, 분산되어 있던 그룹 내 금융 서비스 이용자를 단일 플랫폼으로 성공적으로 유입시켰습니다.\n\n본 프로젝트를 통해 대규모 트래픽을 가진 슈퍼앱의 정보 구조 설계, End-to-End 사용자 여정 설계 역량을 검증했습니다.',
        media: [
          { type: 'chart', src: 'src/images/projects/monimo/impact-mau.png', alt: 'MAU 추이 그래프', caption: 'Fig 5. 출시 후 MAU 추이', aspectRatio: '16:9' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────
  // 2. F&F (MLB, Discovery 자사몰)
  // ────────────────────────────────────────────
  {
    id: 'fnf',
    order: 2,
    title: 'MLB Discovery SUPRA',
    subtitle: 'F&F 통합 자사몰 & 디자인 시스템 구축',
    period: '2022.02 – 2023.02',
    clientDomain: 'Commerce / Multi-brand',
    role: 'Brand Strategy, UX Planning, UI Design',
    contributionRate: '디자인 리드 100% · 설계/디자인 기여 20%',
    icon: 'src/images/icon-projects.png',
    heroImage: {
      type: 'screenshot',
      src: 'src/images/projects/fnf/hero.png',
      alt: 'MLB · Discovery 자사몰 메인',
      caption: 'MLB · Discovery 통합 자사몰 메인',
      aspectRatio: '16:9',
    },
    keyMetrics: [
      { label: '자사몰 + 무신사 매출 기여', before: '–', after: '470억 원', trend: 'up', highlight: true },
      { label: '디자인 시스템 적용', before: '브랜드별 개별 운영', after: 'MLB + Discovery 통합', trend: 'up' },
      { label: '컴포넌트 관리', before: '개별 파일', after: 'Figma Variables 통합', trend: 'up' },
    ],
    sections: [
      {
        id: 'fnf-problem',
        type: 'PROBLEM_DEFINITION',
        title: '브랜드마다 제각각인 UI, 늘어나는 운영 비용',
        content:
          'MLB와 Discovery는 각기 다른 브랜드 톤앤매너를 가지면서도, 동일한 커머스 기능(상품 카드, 필터, 결제 플로우 등)을 중복 설계·중복 개발하고 있었습니다.\n\n브랜드별로 색상, 컴포넌트 스펙이 파편화되어 있어 신규 캠페인이나 기능 추가 시마다 디자인-개발 간 싱크 비용이 누적되는 구조적 문제가 있었습니다.',
        media: [
          { type: 'diagram', src: 'src/images/projects/fnf/problem-fragmented-ui.png', alt: '브랜드별 파편화된 UI 컴포넌트 비교', caption: 'Fig 1. MLB / Discovery UI 파편화 현황', aspectRatio: '4:5' },
        ],
      },
      {
        id: 'fnf-strategy',
        type: 'STRATEGY_PLANNING',
        title: '멀티 브랜드 대응을 위한 토큰 기반 전략',
        content:
          '브랜드별 아이덴티티(색상, 타이포그래피)는 "토큰" 레벨에서 분리하고, 컴포넌트의 구조와 동작은 공통화하는 투트랙 전략을 수립했습니다.\n\nFigma Variables를 도입해 브랜드 토큰을 스위칭하는 것만으로 동일 컴포넌트가 MLB/Discovery 양쪽 톤에 자동 대응되도록 설계 방향을 잡았습니다.',
        media: [
          { type: 'diagram', src: 'src/images/projects/fnf/strategy-token-architecture.png', alt: '브랜드 토큰 아키텍처 다이어그램', caption: 'Fig 2. Figma Variables 기반 토큰 구조', aspectRatio: '3:2' },
        ],
      },
      {
        id: 'fnf-design',
        type: 'DESIGN_SYSTEM_OR_FLOW',
        title: 'Figma Variables 기반 통합 디자인 시스템 구축',
        content:
          '컬러, 타이포그래피, 스페이싱 등 핵심 토큰을 Variables로 정의하고, 이를 참조하는 공통 컴포넌트 라이브러리(버튼, 카드, 폼, 내비게이션 등)를 구축했습니다.\n\n브랜드 모드 전환 시 컴포넌트 재제작 없이 토큰 값만 교체되도록 설계하여, 디자인 시스템 전반의 설계를 리드했습니다.',
        media: [
          { type: 'screenshot', src: 'src/images/projects/fnf/design-system-grid.png', alt: '통합 디자인 시스템 컴포넌트 그리드', caption: 'Fig 3. 통합 컴포넌트 라이브러리', aspectRatio: '4:5' },
          { type: 'screenshot', src: 'src/images/projects/fnf/design-brand-modes.png', alt: 'MLB / Discovery 브랜드 모드 비교', caption: 'Fig 4. 동일 컴포넌트의 브랜드별 모드 적용', aspectRatio: '4:5' },
        ],
      },
      {
        id: 'fnf-impact',
        type: 'BUSINESS_IMPACT',
        title: '자사몰 + 무신사 합산 매출 470억 기여',
        content:
          '통합 디자인 시스템을 기반으로 한 자사몰 리뉴얼 및 무신사 입점 운영을 통해, 합산 매출 470억 원 달성에 기여했습니다.\n\n디자인 시스템 구축 및 운영 전반은 디자인 리드로서 100% 주도했으며, 실제 화면 설계·디자인 작업에는 20% 비중으로 참여했습니다.',
        media: [
          { type: 'chart', src: 'src/images/projects/fnf/impact-revenue.png', alt: '매출 기여 그래프', caption: 'Fig 5. 자사몰 + 무신사 매출 기여 현황', aspectRatio: '16:9' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────
  // 3. 신세계 S.I.VILLAGE
  // ────────────────────────────────────────────
  {
    id: 'sivillage',
    order: 3,
    title: 'S.I.Village',
    subtitle: '신세계 프리미엄 커머스 브랜드 탐색 경험 컨설팅',
    period: '2021.01 – 2021.05',
    clientDomain: 'Commerce / Premium · VIP',
    role: 'Service Strategy, UX Planning',
    contributionRate: '설계 기여 40%',
    icon: 'src/logo/sivillage.png',
    heroImage: {
      type: 'screenshot',
      src: 'src/images/projects/sivillage/hero.png',
      alt: 'S.I.VILLAGE Brand Home 메인',
      caption: 'S.I.VILLAGE Brand Home',
      aspectRatio: '16:9',
    },
    keyMetrics: [
      { label: '체류 시간', before: '100%', after: '115%', trend: 'up', highlight: true },
      { label: '구매 전환율(CVR)', before: '1x', after: '2x', trend: 'up', highlight: true },
      { label: '프로젝트 기여도', before: '–', after: '40%', trend: 'neutral' },
    ],
    sections: [
      {
        id: 'sivillage-problem',
        type: 'PROBLEM_DEFINITION',
        title: '명품/프리미엄 브랜드 탐색 경험의 파편화',
        content:
          'VIP 고객층이 주로 이용하는 S.I.VILLAGE에서는 브랜드별 페이지와 검색 결과의 정보 구조가 일관되지 않아, 사용자가 원하는 브랜드의 제품/스토리를 탐색하는 경험이 끊기는 문제가 있었습니다.\n\n특히 "Brand Home" 진입 후 이탈이 빈번하게 발생했고, 검색 결과가 탐색 맥락을 이어주지 못한다는 점이 핵심 이슈로 도출되었습니다.',
        media: [
          { type: 'diagram', src: 'src/images/projects/sivillage/problem-journey-break.png', alt: '브랜드 탐색 여정 단절 구간 분석', caption: 'Fig 1. 브랜드 탐색 여정 내 이탈 구간', aspectRatio: '4:5' },
        ],
      },
      {
        id: 'sivillage-strategy',
        type: 'STRATEGY_PLANNING',
        title: 'VIP 탐색 맥락을 잇는 검색 · Brand Home 전략',
        content:
          '검색을 단순 키워드 매칭이 아닌 "브랜드 탐색의 입구"로 재정의하고, Brand Home을 검색-탐색-구매로 이어지는 허브로 재설계하는 방향을 제안했습니다.\n\nVIP 고객의 탐색 패턴을 바탕으로, 브랜드 스토리·신상품·프로모션이 하나의 흐름 안에서 자연스럽게 노출되도록 우선순위를 설계했습니다.',
        media: [
          { type: 'wireframe', src: 'src/images/projects/sivillage/strategy-brandhome-ia.png', alt: 'Brand Home 재설계 IA', caption: 'Fig 2. Brand Home 허브 구조 설계안', aspectRatio: '3:2' },
        ],
      },
      {
        id: 'sivillage-design',
        type: 'DESIGN_SYSTEM_OR_FLOW',
        title: '검색 결과 & Brand Home 화면 전면 설계',
        content:
          '검색 결과 화면에 브랜드 단위 그룹핑과 빠른 진입 경로를 추가하고, Brand Home은 비주얼 중심의 풀스크린 레이아웃으로 재설계했습니다.\n\n프리미엄 브랜드 톤에 맞춰 타이포그래피와 여백을 재정의하여, 탐색 자체가 브랜드 경험의 일부로 느껴지도록 디테일을 설계했습니다.',
        media: [
          { type: 'screenshot', src: 'src/images/projects/sivillage/design-search.png', alt: '재설계된 검색 결과 화면', caption: 'Fig 3. 브랜드 그룹핑 검색 결과', aspectRatio: '4:5' },
          { type: 'screenshot', src: 'src/images/projects/sivillage/design-brandhome.png', alt: '재설계된 Brand Home 화면', caption: 'Fig 4. Brand Home 풀스크린 레이아웃', aspectRatio: '4:5' },
        ],
      },
      {
        id: 'sivillage-impact',
        type: 'BUSINESS_IMPACT',
        title: '체류 시간 15% 증가, 구매 전환율 2배',
        content:
          '재설계 적용 이후 사용자 평균 체류 시간이 15% 증가했고, 구매 전환율(CVR)은 약 2배 상승했습니다.\n\n본 프로젝트에는 설계 전반에 40%의 기여도로 참여했으며, 검색-Brand Home 간 탐색 흐름 개선이 핵심 성과로 이어졌습니다.',
        media: [
          { type: 'chart', src: 'src/images/projects/sivillage/impact-cvr.png', alt: '체류 시간 및 CVR 변화 그래프', caption: 'Fig 5. 체류 시간 / CVR Before-After', aspectRatio: '16:9' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────
  // 4. 다락 (세컨신드롬)
  // ────────────────────────────────────────────
  {
    id: 'darak',
    order: 4,
    title: 'DaLock',
    subtitle: '다락(세컨신드롬) 온오프라인 진입 및 픽업 경험 개선',
    period: '2024.03 – 2026.06',
    clientDomain: 'O2O / Subscription',
    role: 'Product Designer',
    contributionRate: '핵심 퍼널 개선 리드',
    icon: 'src/images/icon-projects.png',
    heroImage: {
      type: 'screenshot',
      src: 'src/images/projects/darak/hero.png',
      alt: '다락 픽업 플로우 메인 화면',
      caption: '다락 픽업 신청 플로우',
      aspectRatio: '16:9',
    },
    keyMetrics: [
      { label: '픽업 취소율', before: '56%', after: '35%', trend: 'down', highlight: true },
      { label: '픽업 신청률', before: '21%', after: '24%', trend: 'up', highlight: true },
      { label: 'VOC 건수', before: '100%', after: '63%', trend: 'down' },
    ],
    sections: [
      {
        id: 'darak-problem',
        type: 'PROBLEM_DEFINITION',
        title: '구독·결제·로그인 곳곳에서 발생하는 이탈',
        content:
          '다락은 구독, 결제, 로그인 등 핵심 퍼널 단계마다 사용자 이탈이 반복적으로 발생했고, 특히 오프라인 매장 픽업 단계에서 취소율이 56%에 달할 만큼 높았습니다.\n\nVOC 분석 결과, 픽업 가능 여부에 대한 정보 부족과 신청 과정의 복잡함이 주요 이탈 원인으로 지목되었습니다.',
        media: [
          { type: 'diagram', src: 'src/images/projects/darak/problem-funnel-dropoff.png', alt: '핵심 퍼널 이탈 구간 분석', caption: 'Fig 1. 구독-결제-픽업 퍼널 이탈 구간', aspectRatio: '4:5' },
        ],
      },
      {
        id: 'darak-strategy',
        type: 'STRATEGY_PLANNING',
        title: '반복 개선(iterative) 방식의 퍼널 최적화 전략',
        content:
          '한 번의 대규모 개편 대신, VOC 데이터를 기반으로 퍼널 단계별 가설을 세우고 작은 단위로 반복 개선하는 애자일한 접근을 채택했습니다.\n\n특히 픽업 신청 단계에서는 "신청 가능 여부를 미리 확인할 수 있는가"를 핵심 가설로 설정하고, 정보 노출 시점을 앞당기는 방향으로 설계했습니다.',
        media: [
          { type: 'wireframe', src: 'src/images/projects/darak/strategy-iteration-plan.png', alt: '퍼널 단계별 반복 개선 계획', caption: 'Fig 2. 퍼널 단계별 개선 가설 및 우선순위', aspectRatio: '3:2' },
        ],
      },
      {
        id: 'darak-design',
        type: 'DESIGN_SYSTEM_OR_FLOW',
        title: '픽업 신청 플로우 및 알림 체계 재설계',
        content:
          '픽업 가능 매장/시간을 신청 전 단계에서 미리 확인할 수 있도록 플로우를 재구성하고, 신청 이후에는 상태 변경 시점마다 명확한 알림을 받도록 설계했습니다.\n\n구독·결제·로그인 단계의 반복되는 오류 메시지와 입력 단계도 함께 정리하여 전체 퍼널의 일관성을 높였습니다.',
        media: [
          { type: 'screenshot', src: 'src/images/projects/darak/design-pickup-flow.png', alt: '재설계된 픽업 신청 플로우', caption: 'Fig 3. 픽업 신청 플로우 재설계', aspectRatio: '4:5' },
          { type: 'screenshot', src: 'src/images/projects/darak/design-notification.png', alt: '픽업 상태 알림 화면', caption: 'Fig 4. 픽업 상태 알림 체계', aspectRatio: '4:5' },
        ],
      },
      {
        id: 'darak-impact',
        type: 'BUSINESS_IMPACT',
        title: '픽업 취소율 56% → 35%, 신청률 21% → 24%',
        content:
          '픽업 신청 플로우 개선 이후 취소율이 56%에서 35%로 크게 감소했고, 신청률은 21%에서 24%로 증가했습니다.\n\n동시에 핵심 퍼널 전반의 반복 개선을 통해 VOC가 37% 감소하며, 사용자 불편 요소가 실질적으로 해소되었음을 확인했습니다.',
        media: [
          { type: 'chart', src: 'src/images/projects/darak/impact-pickup-rates.png', alt: '픽업 취소율/신청률 변화 그래프', caption: 'Fig 5. 픽업 취소율 / 신청률 Before-After', aspectRatio: '16:9' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────
  // 5. LOCA (LOTTE CARD)
  // ────────────────────────────────────────────
  {
    id: 'loca',
    order: 5,
    title: 'LOCA',
    subtitle: '롯데카드 리워드 · 로열티 플랫폼 UX/UI',
    period: '—',
    clientDomain: 'Finance / Loyalty',
    role: 'UX Planning, UI Design',
    contributionRate: 'UX Planning · UI Design',
    icon: 'src/logo/loca.png',
    heroImage: { type: 'screenshot', src: 'src/images/projects/loca/hero.png', alt: 'LOCA 메인 화면', caption: 'LOCA 메인 화면', aspectRatio: '16:9' },
    keyMetrics: [],
    sections: [
      {
        id: 'loca-overview',
        type: 'OVERVIEW',
        title: '카드 리워드 & 로열티 플랫폼 UX/UI',
        content:
          '롯데카드의 리워드·로열티 플랫폼 UX/UI를 담당했습니다.\n\n사용자 여정을 단계별로 매핑(Journey Mapping)하여 혜택 탐색부터 적립·사용까지의 흐름을 정리하고, 재사용 가능한 디자인 시스템 컴포넌트를 구축했습니다.',
        media: [
          { type: 'screenshot', src: 'src/images/projects/loca/hero.png', alt: 'LOCA 메인 화면', caption: 'LOCA 메인 화면', aspectRatio: '16:9' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────
  // 6. LOTTE ON (LOTTE e-commerce)
  // ────────────────────────────────────────────
  {
    id: 'lotteon',
    order: 6,
    title: 'LOTTE ON',
    subtitle: '롯데 이커머스 슈퍼앱 UX 개편',
    period: '—',
    clientDomain: 'Commerce / Super App',
    role: 'User Research, UX Strategy, UI Design',
    contributionRate: 'User Research · UX Strategy · UI Design',
    icon: 'src/logo/lotte on.jpg',
    heroImage: { type: 'screenshot', src: 'src/images/projects/lotteon/hero.png', alt: 'LOTTE ON 메인 화면', caption: 'LOTTE ON 메인 화면', aspectRatio: '16:9' },
    keyMetrics: [],
    sections: [
      {
        id: 'lotteon-overview',
        type: 'OVERVIEW',
        title: '슈퍼앱 이커머스 UX 전면 개편',
        content:
          '롯데 이커머스 슈퍼앱 LOTTE ON의 UX 전면 개편에 참여했습니다.\n\n사용자 리서치를 기반으로 멀티 플랫폼(앱/웹) 디자인 일관성을 정리하고, 개인화 추천 기반의 탐색 경험을 위한 UX 전략을 수립했습니다.',
        media: [
          { type: 'screenshot', src: 'src/images/projects/lotteon/hero.png', alt: 'LOTTE ON 메인 화면', caption: 'LOTTE ON 메인 화면', aspectRatio: '16:9' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────
  // 7. T Factory (SKT)
  // ────────────────────────────────────────────
  {
    id: 'tfactory',
    order: 7,
    title: 'T Factory',
    subtitle: 'SKT 오프라인-온라인 리테일 경험 디자인',
    period: '—',
    clientDomain: 'O2O / Retail',
    role: 'UI Design',
    contributionRate: 'UI Design',
    icon: 'src/images/icon-projects.png',
    heroImage: { type: 'screenshot', src: 'src/images/projects/tfactory/hero.png', alt: 'T Factory 매장 인터페이스', caption: 'T Factory 매장 인터페이스', aspectRatio: '16:9' },
    keyMetrics: [],
    sections: [
      {
        id: 'tfactory-overview',
        type: 'OVERVIEW',
        title: '오프라인 리테일 경험을 잇는 UI 디자인',
        content:
          'SKT의 체험형 매장 T Factory의 리테일 경험 디자인을 담당했습니다.\n\n오프라인 매장 경험과 온라인 채널을 잇는 UX 브릿지를 설계하고, 매장 내 디스플레이 및 인터랙션 UI 컴포넌트를 디자인했습니다.',
        media: [
          { type: 'screenshot', src: 'src/images/projects/tfactory/hero.png', alt: 'T Factory 매장 인터페이스', caption: 'T Factory 매장 인터페이스', aspectRatio: '16:9' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────
  // 8. Addy (CJ ENM)
  // ────────────────────────────────────────────
  {
    id: 'addy',
    order: 8,
    title: 'Addy',
    subtitle: 'CJ ENM 크리에이터 광고 B2B SaaS 플랫폼',
    period: '—',
    clientDomain: 'B2B SaaS',
    role: 'UX Strategy, UX Planning, UI Design',
    contributionRate: 'End-to-End UX 디자인 · 디자인 시스템 구축',
    icon: 'src/images/icon-projects.png',
    heroImage: { type: 'screenshot', src: 'src/images/projects/addy/hero.png', alt: 'Addy 대시보드', caption: 'Addy 대시보드', aspectRatio: '16:9' },
    keyMetrics: [],
    sections: [
      {
        id: 'addy-overview',
        type: 'OVERVIEW',
        title: '크리에이터 광고 B2B SaaS 플랫폼 설계',
        content:
          'CJ ENM의 크리에이터 광고 B2B SaaS 플랫폼 Addy의 End-to-End UX를 설계했습니다.\n\n광고주와 크리에이터 양쪽의 워크플로우를 분석하여 정보 구조를 정의하고, 운영 효율을 높이기 위한 디자인 시스템을 구축했습니다.',
        media: [
          { type: 'screenshot', src: 'src/images/projects/addy/hero.png', alt: 'Addy 대시보드', caption: 'Addy 대시보드', aspectRatio: '16:9' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────
  // 9. Tving (CJ ENM)
  // ────────────────────────────────────────────
  {
    id: 'tving',
    order: 9,
    title: 'Tving',
    subtitle: 'OTT 스트리밍 플랫폼 UI',
    period: '—',
    clientDomain: 'OTT',
    role: 'UI Design',
    contributionRate: 'UI Design',
    icon: 'src/images/icon-projects.png',
    heroImage: { type: 'screenshot', src: 'src/images/projects/tving/hero.png', alt: 'Tving 콘텐츠 탐색 화면', caption: 'Tving 콘텐츠 탐색 화면', aspectRatio: '16:9' },
    keyMetrics: [],
    sections: [
      {
        id: 'tving-overview',
        type: 'OVERVIEW',
        title: '콘텐츠 탐색 & 라이브 채널 UI',
        content:
          'CJ ENM의 OTT 스트리밍 플랫폼 Tving의 UI 디자인을 담당했습니다.\n\n콘텐츠 탐색 화면과 라이브 채널 UX를 중심으로, 다양한 콘텐츠 카테고리를 빠르게 탐색할 수 있는 인터페이스를 디자인했습니다.',
        media: [
          { type: 'screenshot', src: 'src/images/projects/tving/hero.png', alt: 'Tving 콘텐츠 탐색 화면', caption: 'Tving 콘텐츠 탐색 화면', aspectRatio: '16:9' },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────
  // 10. TMR Assistant (LINA)
  // ────────────────────────────────────────────
  {
    id: 'tmr',
    order: 10,
    title: 'TMR Assistant',
    subtitle: 'LINA 보험설계사 CRM 워크플로우 도구',
    period: '—',
    clientDomain: 'B2B CRM',
    role: 'User Research, UX Strategy, UI Design',
    contributionRate: 'User Research · UX Strategy · UI Design',
    icon: 'src/logo/lina.png',
    heroImage: { type: 'screenshot', src: 'src/images/projects/tmr/hero.png', alt: 'TMR Assistant 워크플로우 화면', caption: 'TMR Assistant 워크플로우 화면', aspectRatio: '16:9' },
    keyMetrics: [],
    sections: [
      {
        id: 'tmr-overview',
        type: 'OVERVIEW',
        title: '보험설계사 CRM 워크플로우 최적화',
        content:
          'LINA의 보험설계사용 CRM 도구 TMR Assistant의 UX를 담당했습니다.\n\n사용자 리서치를 통해 설계사의 업무 흐름을 분석하고, 반복 작업을 줄이는 방향으로 워크플로우와 UI 컴포넌트를 재설계했습니다.',
        media: [
          { type: 'screenshot', src: 'src/images/projects/tmr/hero.png', alt: 'TMR Assistant 워크플로우 화면', caption: 'TMR Assistant 워크플로우 화면', aspectRatio: '16:9' },
        ],
      },
    ],
  },
];

// data-key → project id 매핑 (Finder row 클릭 시 어떤 프로젝트를 열지 결정)
window.PROJECT_KEY_TO_ID = {
  'monimo_SAMSUNG CARD.dmg': 'monimo',
  'LOCA_LOTTE CARD.pkg': 'loca',
  'MLB_SUPRA_F&F.app': 'fnf',
  'SI_Village_SHINSEGAE.dmg': 'sivillage',
  'LOTTE_ON_LOTTE.pkg': 'lotteon',
  'DaLock_Startup.dmg': 'darak',
  'T_Factory_SKT.pkg': 'tfactory',
  'Addy_CJ ENM.sit': 'addy',
  'Tving_CJ ENM.dmg': 'tving',
  'TMR_LINA.pkg': 'tmr',
};
