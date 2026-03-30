import type {
  Post,
  NewsItem,
  BusStop,
  SubwayStation,
  Apartment,
  Building,
  User,
  Coupon,
  NewStoreOpening,
  MyHome,
  Listing,
} from "./types";

export const currentUser: User = {
  id: "u1",
  nickname: "검단주민",
  dong: "당하동",
  level: "이웃",
  joinedAt: "2024-03-15",
  postCount: 23,
  commentCount: 87,
};

// ---------- Community ----------
export const posts: Post[] = [
  {
    id: "p1",
    category: "맘카페",
    title: "당하동 어린이집 추천해주세요 🙏",
    content: "내년에 아이가 어린이집 갈 나이인데 당하동 근처 좋은 어린이집 아시는 분 계신가요? 국공립 위주로 알아보고 있어요.",
    author: "육아맘김씨",
    authorDong: "당하동",
    createdAt: "2026-03-28T10:23:00",
    viewCount: 342, likeCount: 28, commentCount: 15, isHot: true,
  },
  {
    id: "p2",
    category: "맛집",
    title: "검단사거리 새로 생긴 국밥집 다녀왔어요",
    content: "어제 점심에 갔는데 육수가 진짜 깔끔하고 맛있더라고요. 뼈해장국 7500원인데 양도 많고 가성비 최고였어요!",
    author: "먹부림러",
    authorDong: "불로동",
    createdAt: "2026-03-28T09:15:00",
    viewCount: 891, likeCount: 67, commentCount: 33, isHot: true,
    images: ["/images/restaurant1.jpg"],
  },
  {
    id: "p3",
    category: "중고거래",
    title: "[판매] 아이쿠션 5만원 (거의 새것)",
    content: "아이가 크면서 안 쓰게 되어 판매합니다. 직거래 선호, 원당동·당하동 가능합니다.",
    author: "정리왕맘",
    authorDong: "원당동",
    createdAt: "2026-03-28T08:45:00",
    viewCount: 156, likeCount: 5, commentCount: 8,
  },
  {
    id: "p4",
    category: "동네질문",
    title: "검단 GS25 야간 배달되나요?",
    content: "밤 11시 이후에도 검단 지역 편의점 배달 되는 곳 있나요?",
    author: "야식러",
    authorDong: "마전동",
    createdAt: "2026-03-27T23:11:00",
    viewCount: 204, likeCount: 12, commentCount: 19,
  },
  {
    id: "p5",
    category: "부동산",
    title: "검단 신도시 4단지 최근 실거래가 어때요?",
    content: "지금 매수 타이밍인지 고민 중입니다. 84㎡ 기준으로 어느 정도 선에서 거래되고 있나요?",
    author: "부동산고민",
    authorDong: "왕길동",
    createdAt: "2026-03-27T21:30:00",
    viewCount: 567, likeCount: 34, commentCount: 42,
  },
  {
    id: "p6",
    category: "맘카페",
    title: "검단 신도시 초등학교 통학 버스 운행 정보",
    content: "A초 B초 통학버스 시간표 공유드립니다. 저장해두시면 유용할 것 같아요!",
    author: "학교정보맘",
    authorDong: "대곡동",
    createdAt: "2026-03-27T18:00:00",
    viewCount: 1203, likeCount: 98, commentCount: 27, isPinned: true, isHot: true,
  },
  {
    id: "p7",
    category: "소모임",
    title: "검단 주말 배드민턴 모임 멤버 모집",
    content: "토요일 오전 7시 ~ 9시 검단체육관에서 같이 치실 분 모십니다. 초보 환영!",
    author: "배드민턴킹",
    authorDong: "오류동",
    createdAt: "2026-03-27T16:44:00",
    viewCount: 334, likeCount: 19, commentCount: 11,
  },
  {
    id: "p8",
    category: "분실/목격",
    title: "당하동 인근 회색 고양이 발견",
    content: "오늘 아침 당하동 주민센터 앞에서 회색 고양이가 돌아다니더라고요. 목줄 있어서 잃어버리신 분 있으면 연락주세요.",
    author: "동네지킴이",
    authorDong: "금곡동",
    createdAt: "2026-03-28T07:30:00",
    viewCount: 445, likeCount: 31, commentCount: 7,
  },
];

// ---------- News ----------
export const newsItems: NewsItem[] = [
  {
    id: "n1",
    type: "뉴스",
    title: "지하철 5호선 검단 연장, 예비타당성 최종 통과",
    summary:
      "서울 지하철 5호선이 방화역에서 김포·인천 검단까지 연장되는 사업이 예비타당성 조사를 최종 통과했다. 총 사업비 약 3조원, 구간 25.8km로 검단신도시 주민들의 서울 접근성이 크게 개선될 전망이다.",
    thumbnail: "/images/news1.jpg",
    source: "헤럴드경제",
    publishedAt: "2026-03-11T09:00:00",
    url: "https://biz.heraldcorp.com/article/10691408",
    viewCount: 18420,
  },
  {
    id: "n2",
    type: "뉴스",
    title: "검단신도시 5단계 사업구역 올해 준공…240만㎡ 신도시 완성",
    summary:
      "인천 검단신도시 5단계 사업구역이 2026년 준공을 앞두고 있다. 16개 주거블록과 공원·도로·상수도 등 도시 기반시설이 완성되면서 명실상부한 신도시로 완성될 예정이다.",
    thumbnail: "/images/news2.jpg",
    source: "헤럴드경제",
    publishedAt: "2026-03-24T10:00:00",
    url: "https://biz.heraldcorp.com/article/10701358",
    viewCount: 9812,
  },
  {
    id: "n3",
    type: "유튜브",
    title: "검단신도시 2026 봄 근황 — 5호선 예타 확정 후 달라진 분위기",
    summary:
      "지하철 5호선 예타 통과 이후 검단신도시의 분위기 변화를 담은 영상. 신규 상가 입점 현황과 아파트 시세 동향까지 현장에서 직접 전달합니다.",
    thumbnail: "/images/youtube1.jpg",
    source: "유튜브",
    publishedAt: "2026-03-27T12:00:00",
    url: "https://www.youtube.com/results?search_query=검단신도시+2026+근황",
    viewCount: 24730,
  },
  {
    id: "n4",
    type: "뉴스",
    title: "검단 아파트 '10억 클럽' 진입하나…아라역 초근접 단지 상승세",
    summary:
      "인천 지하철 1호선 연장으로 아라역 개통을 앞두고 있는 검단신도시의 아파트 값이 상승세다. 아라역 인근 단지들이 10억원 진입을 눈앞에 두고 있다.",
    thumbnail: "/images/news3.jpg",
    source: "헤럴드경제",
    publishedAt: "2026-02-14T09:00:00",
    url: "https://biz.heraldcorp.com/article/10492945",
    viewCount: 31204,
  },
  {
    id: "n5",
    type: "인스타",
    title: "#검단맛집 이번 주 핫플 — 마전동 화로구이부터 신규 카페까지",
    summary:
      "검단 주민들이 공유하는 이번 주 맛집 사진들. 마전동 담가화로구이, 당하동 신규 브런치 카페 등 검단 핫플레이스 한눈에 보기.",
    thumbnail: "/images/insta1.jpg",
    source: "@geumdan_food",
    publishedAt: "2026-03-28T09:00:00",
    url: "https://www.instagram.com/explore/tags/%EA%B2%80%EB%8B%A8%EB%A7%9B%EC%A7%91/",
    viewCount: 5670,
  },
  {
    id: "n6",
    type: "유튜브",
    title: "검단 아파트 단지 투어 — 당하동·불로동 실거래가 분석 2026",
    summary:
      "2026년 봄 검단신도시 주요 아파트 단지를 직접 방문해 실거래가 현황을 분석했습니다. 5호선 개통 이후 어느 단지가 가장 많이 오를지 살펴봅니다.",
    thumbnail: "/images/youtube2.jpg",
    source: "유튜브",
    publishedAt: "2026-03-25T15:00:00",
    url: "https://www.youtube.com/results?search_query=검단+아파트+부동산+시세+2026",
    viewCount: 38110,
  },
];

// ---------- Transport ----------
export const nearbyStops: BusStop[] = [
  {
    id: "bs1",
    name: "당하지구 검단사거리",
    stopNo: "32-456",
    distance: 120,
    routes: [
      {
        id: "r1",
        routeNo: "55",
        destination: "인천터미널",
        arrivalMin: 3,
        remainingStops: 5,
        isLowFloor: true,
        isExpress: false,
      },
      {
        id: "r2",
        routeNo: "70",
        destination: "부평역",
        arrivalMin: 8,
        remainingStops: 11,
        isLowFloor: false,
        isExpress: false,
      },
      {
        id: "r3",
        routeNo: "780",
        destination: "강남역",
        arrivalMin: 12,
        remainingStops: 3,
        isLowFloor: true,
        isExpress: true,
      },
    ],
  },
  {
    id: "bs2",
    name: "당하동 주민센터",
    stopNo: "32-512",
    distance: 280,
    routes: [
      {
        id: "r4",
        routeNo: "16",
        destination: "검암역",
        arrivalMin: 2,
        remainingStops: 4,
        isLowFloor: true,
        isExpress: false,
      },
      {
        id: "r5",
        routeNo: "8600",
        destination: "서울역",
        arrivalMin: 6,
        remainingStops: 2,
        isLowFloor: false,
        isExpress: true,
      },
    ],
  },
  {
    id: "bs3",
    name: "불로지구 입구",
    stopNo: "32-701",
    distance: 540,
    routes: [
      {
        id: "r6",
        routeNo: "55",
        destination: "인천터미널",
        arrivalMin: 7,
        remainingStops: 9,
        isLowFloor: true,
        isExpress: false,
      },
    ],
  },
];

export const subwayStations: SubwayStation[] = [
  {
    id: "sw1",
    name: "검암역",
    line: "공항철도",
    lineColor: "#0065B3",
    distance: 3200,
    arrivals: [
      { direction: "서울역 방면", arrivalMin: 4, trainNo: "A1234" },
      { direction: "인천공항 방면", arrivalMin: 9, trainNo: "A1235" },
    ],
  },
  {
    id: "sw2",
    name: "계양역",
    line: "인천1호선",
    lineColor: "#759CCE",
    distance: 5100,
    arrivals: [
      { direction: "국제업무지구 방면", arrivalMin: 6, trainNo: "I0811" },
      { direction: "귤현 방면", arrivalMin: 11, trainNo: "I0812" },
    ],
  },
];

// ---------- Real Estate ----------
export const apartments: Apartment[] = [
  {
    id: "apt1",
    name: "검단 푸르지오 더 퍼스트",
    dong: "당하동",
    households: 1299,
    built: 2022,
    sizes: [
      {
        pyeong: 24,
        sqm: 79,
        avgPrice: 39800,
        priceHistory: [
          { date: "2024-01", price: 35000 },
          { date: "2024-04", price: 36500 },
          { date: "2024-07", price: 37800 },
          { date: "2024-10", price: 38200 },
          { date: "2025-01", price: 38900 },
          { date: "2025-04", price: 39200 },
          { date: "2025-07", price: 39500 },
          { date: "2025-10", price: 39600 },
          { date: "2026-01", price: 39800 },
          { date: "2026-03", price: 40100 },
        ],
      },
      {
        pyeong: 34,
        sqm: 114,
        avgPrice: 54500,
        priceHistory: [
          { date: "2024-01", price: 47000 },
          { date: "2024-04", price: 49500 },
          { date: "2024-07", price: 51000 },
          { date: "2024-10", price: 52000 },
          { date: "2025-01", price: 53000 },
          { date: "2025-04", price: 53500 },
          { date: "2025-07", price: 54000 },
          { date: "2025-10", price: 54200 },
          { date: "2026-01", price: 54500 },
          { date: "2026-03", price: 55200 },
        ],
      },
    ],
    recentDeal: { price: 40100, date: "2026-03-15", floor: 12, pyeong: 24 },
  },
  {
    id: "apt2",
    name: "검단 SK뷰 센트럴",
    dong: "불로동",
    households: 2041,
    built: 2023,
    sizes: [
      {
        pyeong: 25,
        sqm: 84,
        avgPrice: 42000,
        priceHistory: [
          { date: "2024-01", price: 37000 },
          { date: "2024-04", price: 38500 },
          { date: "2024-07", price: 40000 },
          { date: "2024-10", price: 41000 },
          { date: "2025-01", price: 41500 },
          { date: "2025-04", price: 41800 },
          { date: "2025-07", price: 42000 },
          { date: "2025-10", price: 42200 },
          { date: "2026-01", price: 42500 },
          { date: "2026-03", price: 43000 },
        ],
      },
    ],
    recentDeal: { price: 43000, date: "2026-03-20", floor: 8, pyeong: 25 },
  },
  {
    id: "apt3",
    name: "검단 한신더휴",
    dong: "마전동",
    households: 978,
    built: 2021,
    sizes: [
      {
        pyeong: 24,
        sqm: 79,
        avgPrice: 36500,
        priceHistory: [
          { date: "2024-01", price: 32000 },
          { date: "2024-04", price: 33000 },
          { date: "2024-07", price: 34500 },
          { date: "2024-10", price: 35000 },
          { date: "2025-01", price: 35500 },
          { date: "2025-04", price: 36000 },
          { date: "2025-07", price: 36200 },
          { date: "2025-10", price: 36400 },
          { date: "2026-01", price: 36500 },
          { date: "2026-03", price: 36800 },
        ],
      },
    ],
    recentDeal: { price: 36800, date: "2026-03-18", floor: 5, pyeong: 24 },
  },
  {
    id: "apt4",
    name: "검단 아이파크 2단지",
    dong: "왕길동",
    households: 1560,
    built: 2022,
    sizes: [
      {
        pyeong: 34,
        sqm: 114,
        avgPrice: 52000,
        priceHistory: [
          { date: "2024-01", price: 45000 },
          { date: "2024-04", price: 47000 },
          { date: "2024-07", price: 49000 },
          { date: "2024-10", price: 50000 },
          { date: "2025-01", price: 50500 },
          { date: "2025-04", price: 51000 },
          { date: "2025-07", price: 51500 },
          { date: "2025-10", price: 51800 },
          { date: "2026-01", price: 52000 },
          { date: "2026-03", price: 52500 },
        ],
      },
    ],
    recentDeal: { price: 52500, date: "2026-03-22", floor: 15, pyeong: 34 },
  },
];

// ---------- Coupons ----------
export const coupons: Coupon[] = [
  { id: "cp1", storeId: "s_b1_3", storeName: "스타벅스 DT", title: "아메리카노 15% 할인", discount: "15%", discountType: "rate", category: "카페", expiry: "2026-03-31", floor: "B1", color: "#00704A", downloaded: false },
  { id: "cp2", storeId: "s_2f_1", storeName: "맘스터치", title: "치킨버거 세트 1,000원 할인", discount: "1,000원", discountType: "amount", category: "음식점", expiry: "2026-04-05", floor: "2F", color: "#E63312", downloaded: true },
  { id: "cp3", storeId: "s_1f_4", storeName: "약국", title: "건강기능식품 10% 할인", discount: "10%", discountType: "rate", category: "병원/약국", expiry: "2026-04-10", floor: "1F", color: "#3182F6", downloaded: false },
  { id: "cp4", storeId: "s_3f_1", storeName: "더본코리아", title: "런치 세트 2인 이상 20% 할인", discount: "20%", discountType: "rate", category: "음식점", expiry: "2026-04-02", floor: "3F", color: "#F59E0B", downloaded: false },
  { id: "cp5", storeId: "s_1f_1", storeName: "올리브영", title: "2만원 이상 구매 시 3,000원 할인", discount: "3,000원", discountType: "amount", category: "기타", expiry: "2026-04-15", floor: "1F", color: "#FF3399", downloaded: false },
  { id: "cp6", storeId: "s_2f_3", storeName: "이디야커피", title: "아이스 음료 500원 할인", discount: "500원", discountType: "amount", category: "카페", expiry: "2026-03-30", floor: "2F", color: "#6366F1", downloaded: true },
];

// ---------- Coupon Details ----------
export interface CouponDetail {
  promo: string;              // 한 줄 홍보 문구
  description: string;        // 상세 설명 (2-3문장)
  highlights: string[];       // 매장/혜택 포인트 (아이콘 bullet)
  conditions: string[];       // 사용 조건
  hours: string;              // 영업시간
  phone: string;
  location: string;           // 위치 설명
  menu?: { name: string; price: string; tag?: string }[]; // 추천 메뉴/상품
}

export const couponDetails: Record<string, CouponDetail> = {
  cp1: {
    promo: "검단신도시 유일 스타벅스 드라이브스루 매장",
    description:
      "차에서 내리지 않고 편하게 주문하는 DT 전용 매장입니다. 리워드 포인트 적립도 동일하게 적용되며 사이렌 오더도 사용 가능합니다.",
    highlights: ["🚗 드라이브스루 전용 매장", "⭐ 스타벅스 리워드 포인트 적립", "📱 사이렌 오더 주문 가능", "🧊 시즌 한정 음료 상시 운영"],
    conditions: [
      "아메리카노 전 사이즈 (Tall·Grande·Venti) 적용",
      "1인 1회 사용 가능",
      "타 할인 쿠폰·멤버십 중복 사용 불가",
      "현장 제시 필수 (결제 전)",
    ],
    hours: "매일 07:00 ~ 22:00 (연중무휴)",
    phone: "032-560-1001",
    location: "검단 아울렛몰 B1층 DT 전용 출입구",
    menu: [
      { name: "아이스 아메리카노", price: "4,500원", tag: "인기 1위" },
      { name: "카페 라떼", price: "5,500원" },
      { name: "돌체 콜드브루", price: "6,500원", tag: "시즌 추천" },
    ],
  },
  cp2: {
    promo: "국내 최초 닭 전문 버거 브랜드, 바삭함의 원조",
    description:
      "신선한 국내산 닭고기를 당일 조리해 제공합니다. 뼈가 없는 순살과 뼈있는 오리지널 중 선택 가능하며, 사이드 메뉴도 다양하게 구성되어 있습니다.",
    highlights: ["🐔 국내산 당일 신선 닭고기 사용", "🍟 감자튀김·코울슬로 중 선택", "👶 어린이 메뉴 별도 운영", "🌮 순살·뼈닭 선택 가능"],
    conditions: [
      "치킨버거 세트 메뉴 주문 시 적용",
      "단품 및 사이드 단독 주문 제외",
      "1인 1세트 이상 주문 필수",
      "배달 주문 제외 (매장 내 이용 또는 포장만 적용)",
    ],
    hours: "매일 10:00 ~ 21:00 (연중무휴)",
    phone: "032-560-2002",
    location: "검단 아울렛몰 2층 푸드코트 내",
    menu: [
      { name: "싸이버거 세트", price: "8,400원", tag: "베스트" },
      { name: "맘스치킨버거 세트", price: "7,900원" },
      { name: "맘스 뿌링클 세트", price: "9,200원", tag: "신메뉴" },
    ],
  },
  cp3: {
    promo: "전문 약사와 1:1 건강 상담 — 내 몸에 맞는 영양제 찾기",
    description:
      "200종 이상의 건강기능식품을 갖추고 있으며 공인 약사가 개인 건강 상태에 맞는 제품을 추천해 드립니다. 처방전 없이 구매 가능한 일반의약품도 완비되어 있습니다.",
    highlights: ["💊 건강기능식품 200종 이상 보유", "👨‍⚕️ 공인 약사 무료 상담", "🏠 65세 이상 방문 배송 서비스", "📋 처방전 없이 구매 가능한 일반약"],
    conditions: [
      "건강기능식품 카테고리 한정 적용",
      "전문의약품·처방약 제외",
      "1인 1회 사용 가능",
      "영수증 발급 시 자동 적용",
    ],
    hours: "평일 09:00 ~ 20:00 / 토 09:00 ~ 18:00 / 일 휴무",
    phone: "032-560-3003",
    location: "검단 아울렛몰 1층 정문 우측",
    menu: [
      { name: "종합 비타민", price: "22,000원~", tag: "추천" },
      { name: "오메가3", price: "18,000원~" },
      { name: "유산균 프로바이오틱스", price: "25,000원~", tag: "인기" },
    ],
  },
  cp4: {
    promo: "백종원 셰프가 직접 개발한 검단 한식 맛집",
    description:
      "더본코리아가 직접 운영하는 한식 브랜드로, 검단신도시 3층에 새롭게 오픈했습니다. 합리적인 가격의 런치 세트로 든든한 한 끼를 즐겨보세요.",
    highlights: ["🍽️ 백종원 직접 개발 메뉴", "🕐 런치 세트 11:30~14:00 운영", "👥 단체 예약 가능 (20인 이상)", "♻️ 친환경 그릇 사용"],
    conditions: [
      "런치 세트 메뉴 한정 적용 (11:30~14:00)",
      "2인 이상 방문 시 적용",
      "저녁·단품 메뉴 제외",
      "사전 예약 시 자리 확보 권장",
    ],
    hours: "매일 11:00 ~ 21:00 (브레이크타임 15:00~17:00)",
    phone: "032-560-4004",
    location: "검단 아울렛몰 3층 레스토랑 구역",
    menu: [
      { name: "한우 불고기 런치 세트", price: "13,900원", tag: "인기" },
      { name: "제육볶음 정식", price: "10,900원" },
      { name: "된장찌개 세트", price: "9,900원", tag: "실속" },
    ],
  },
  cp5: {
    promo: "K-뷰티 1위 올리브영 검단신도시점 — 최신 트렌드를 한자리에",
    description:
      "국내외 인기 뷰티 브랜드 1,000여 종을 직접 체험하고 구매할 수 있습니다. 피부 타입별 전문 뷰티 어드바이저 상담이 무료로 제공되어 내 피부에 맞는 제품을 찾을 수 있습니다.",
    highlights: ["💄 1,000여 뷰티 브랜드 한자리", "🧴 무료 피부 타입 상담", "🎁 구매 금액별 샘플 증정", "📦 당일 배송 서비스 운영"],
    conditions: [
      "2만원 이상 결제 시 자동 적용",
      "올리브영 멤버십 중복 적용 불가",
      "세일 상품과의 중복 할인 불가",
      "카드·현금 결제 모두 적용",
    ],
    hours: "매일 10:00 ~ 22:00",
    phone: "032-560-5005",
    location: "검단 아울렛몰 1층 중앙 광장 옆",
    menu: [
      { name: "닥터자르트 시카페어 크림", price: "38,000원", tag: "베스트" },
      { name: "라운드랩 자작나무 선크림", price: "22,000원" },
      { name: "롬앤 쥬시 래스팅 틴트", price: "11,000원", tag: "인기" },
    ],
  },
  cp6: {
    promo: "합리적인 가격, 매일 마셔도 부담 없는 프리미엄 커피",
    description:
      "국내 바리스타 챔피언이 블렌딩한 원두를 사용합니다. 아이스 음료는 에스프레소 기반부터 과일 음료까지 20종 이상 운영하며, 이달의 시즌 음료도 놓치지 마세요.",
    highlights: ["☕ 챔피언 바리스타 블렌딩 원두", "🧋 아이스 음료 20종 이상", "🍓 시즌 한정 음료 월 2종 출시", "💳 이디야 멤버스 포인트 적립"],
    conditions: [
      "아이스 음료 전 메뉴 적용",
      "핫(Hot) 음료 제외",
      "1인 1일 1회 사용 가능",
      "이디야 멤버스 앱 연동 시 포인트 추가 적립",
    ],
    hours: "매일 08:00 ~ 21:30",
    phone: "032-560-6006",
    location: "검단 아울렛몰 2층 중앙 홀",
    menu: [
      { name: "아이스 아메리카노", price: "2,500원", tag: "가성비 1위" },
      { name: "아이스 카페모카", price: "3,500원" },
      { name: "딸기 스무디", price: "4,500원", tag: "시즌 한정" },
    ],
  },
};

// ---------- New Store Openings ----------
export const newStoreOpenings: NewStoreOpening[] = [
  {
    id: "ns1", storeId: "s_3f_1", storeName: "더본코리아 (백종원)", category: "음식점", floor: "3F",
    openDate: "2026-03-25", emoji: "🍽️", isNew: true,
    openBenefit: {
      summary: "오픈 기념 전 메뉴 20% 할인 + 음료 1잔 무료",
      details: [
        "전 메뉴 20% 할인 (4/6까지)",
        "1인 1음료 무료 제공 (테이크아웃 포함)",
        "앱 첫 주문 시 추가 10% 즉시 할인",
        "SNS 리뷰 작성 고객 디저트 1종 증정",
      ],
      validUntil: "2026-04-06",
    },
  },
  {
    id: "ns2", storeId: "s_2f_4", storeName: "헬스앤뷰티", category: "미용", floor: "2F",
    openDate: "2026-03-22", emoji: "💄", isNew: true,
    openBenefit: {
      summary: "오픈 특가 전품목 30% OFF + 회원 가입 시 5,000원 적립",
      details: [
        "오픈 기념 전품목 30% 할인 (3/31까지)",
        "신규 회원 가입 시 5,000 포인트 즉시 적립",
        "3만원 이상 구매 시 샘플 키트 증정",
        "SNS 팔로우 + 태그 시 추첨 경품 이벤트",
      ],
      validUntil: "2026-03-31",
    },
  },
  {
    id: "ns3", storeId: "s_4f_3", storeName: "헤어살롱 모이", category: "미용", floor: "4F",
    openDate: "2026-03-20", emoji: "💇", isNew: false,
    openBenefit: {
      summary: "오픈 한 달 커트 10,000원 고정 + 첫 방문 드라이 무료",
      details: [
        "오픈 기념 커트 10,000원 고정가 (4/20까지)",
        "첫 방문 드라이 무료 서비스",
        "펌·염색 예약 시 트리트먼트 무료 업그레이드",
        "인스타 후기 작성 시 다음 방문 20% 할인 쿠폰 증정",
      ],
      validUntil: "2026-04-20",
    },
  },
];

// ---------- Pharmacies ----------
export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  weekendHours: string | null;   // null = 미운영
  nightHours: string | null;     // null = 미운영
  isOpenNow: boolean;
  tags: string[];                // e.g. ["주말", "심야"]
  distance?: string;
}

// ---------- Nearby Marts ----------
export type MartClosingPattern =
  | "2nd4th"   // 2·4번째 일요일 의무휴업 (대형마트 일반)
  | "1st3rd"   // 1·3번째 일요일 의무휴업
  | "open"     // 일요일 정상 영업
  | "closed";  // 매주 일요일 휴무

export interface NearbyMart {
  id: string;
  name: string;
  brand: string;           // 브랜드명 (로고용)
  type: "대형마트" | "중형마트" | "슈퍼마트";
  address: string;
  phone: string;
  distance: string;
  weekdayHours: string;
  saturdayHours: string;
  sundayHours: string | null;  // null → 해당 주 휴무
  closingPattern: MartClosingPattern;
  notice?: string;         // 추가 안내
}

export const nearbyMarts: NearbyMart[] = [
  {
    id: "m1",
    name: "이마트 검단점",
    brand: "이마트",
    type: "대형마트",
    address: "인천 서구 검단로 678",
    phone: "1588-1234",
    distance: "1.1km",
    weekdayHours: "10:00 ~ 23:00",
    saturdayHours: "10:00 ~ 23:00",
    sundayHours: "10:00 ~ 23:00",
    closingPattern: "2nd4th",
    notice: "매월 2·4번째 일요일 의무휴업",
  },
  {
    id: "m2",
    name: "홈플러스 검단점",
    brand: "홈플러스",
    type: "대형마트",
    address: "인천 서구 당하동 110",
    phone: "1588-5678",
    distance: "1.8km",
    weekdayHours: "10:00 ~ 24:00",
    saturdayHours: "10:00 ~ 24:00",
    sundayHours: "10:00 ~ 24:00",
    closingPattern: "2nd4th",
    notice: "매월 2·4번째 일요일 의무휴업",
  },
  {
    id: "m3",
    name: "롯데마트 청라점",
    brand: "롯데마트",
    type: "대형마트",
    address: "인천 서구 경서동 200",
    phone: "1588-9012",
    distance: "3.2km",
    weekdayHours: "10:00 ~ 23:00",
    saturdayHours: "10:00 ~ 23:00",
    sundayHours: "10:00 ~ 23:00",
    closingPattern: "1st3rd",
    notice: "매월 1·3번째 일요일 의무휴업",
  },
  {
    id: "m4",
    name: "홈플러스 익스프레스 검단",
    brand: "홈플러스 익스프레스",
    type: "슈퍼마트",
    address: "인천 서구 마전동 345",
    phone: "032-567-0001",
    distance: "650m",
    weekdayHours: "08:00 ~ 23:00",
    saturdayHours: "08:00 ~ 23:00",
    sundayHours: "09:00 ~ 22:00",
    closingPattern: "open",
  },
  {
    id: "m5",
    name: "GS더프레시 검단신도시점",
    brand: "GS더프레시",
    type: "슈퍼마트",
    address: "인천 서구 불로동 501",
    phone: "032-567-0002",
    distance: "900m",
    weekdayHours: "09:00 ~ 22:00",
    saturdayHours: "09:00 ~ 22:00",
    sundayHours: "10:00 ~ 21:00",
    closingPattern: "open",
  },
];

export const pharmacies: Pharmacy[] = [
  {
    id: "ph1",
    name: "검단 온누리약국",
    address: "인천 서구 검단로 512",
    phone: "032-562-1234",
    weekendHours: "토 09:00~18:00 / 일 10:00~15:00",
    nightHours: "평일 22:00까지",
    isOpenNow: true,
    tags: ["주말", "심야"],
    distance: "350m",
  },
  {
    id: "ph2",
    name: "당하 건강약국",
    address: "인천 서구 당하동 123-4",
    phone: "032-563-2345",
    weekendHours: "토 10:00~17:00",
    nightHours: null,
    isOpenNow: false,
    tags: ["주말"],
    distance: "620m",
  },
  {
    id: "ph3",
    name: "검단신도시 24약국",
    address: "인천 서구 마전동 456-7",
    phone: "032-564-3456",
    weekendHours: "토·일 09:00~21:00",
    nightHours: "매일 24시간",
    isOpenNow: true,
    tags: ["주말", "심야", "24시"],
    distance: "980m",
  },
  {
    id: "ph4",
    name: "불로 해맑은약국",
    address: "인천 서구 불로동 789-1",
    phone: "032-565-4567",
    weekendHours: "토 09:00~19:00 / 일 휴무",
    nightHours: "평일 21:00까지",
    isOpenNow: false,
    tags: ["주말", "심야"],
    distance: "1.2km",
  },
  {
    id: "ph5",
    name: "왕길 드림약국",
    address: "인천 서구 왕길동 321-5",
    phone: "032-566-5678",
    weekendHours: "토·일 10:00~18:00",
    nightHours: null,
    isOpenNow: true,
    tags: ["주말"],
    distance: "1.5km",
  },
];

// ---------- Gamification ----------
export const userGameData = {
  points: 1250,
  weeklyLikes: 5,
  weeklyLikesMax: 10,
  weeklyPosts: 2,
  monthlyLevel: "실버" as "브론즈" | "실버" | "골드" | "플래티넘",
  monthlyPoints: 1250,
  monthlyLevelThresholds: { 브론즈: 0, 실버: 500, 골드: 1500, 플래티넘: 3000 },
  nextLevel: "골드" as "브론즈" | "실버" | "골드" | "플래티넘",
  nextLevelPoints: 1500,
  missions: [
    { id: "m1", title: "글 작성하기", desc: "커뮤니티에 글 1개 작성", reward: 10, done: true, icon: "✍️" },
    { id: "m2", title: "좋아요 5번", desc: "이번 주 좋아요 5회 이상", reward: 10, done: true, icon: "❤️" },
    { id: "m3", title: "댓글 달기", desc: "댓글 2개 작성", reward: 6, done: false, icon: "💬" },
    { id: "m4", title: "7일 연속 방문", desc: "앱 7일 연속 접속", reward: 50, done: false, icon: "🔥" },
    { id: "m5", title: "부동산 조회", desc: "단지 상세 1회 열람", reward: 5, done: true, icon: "🏠" },
  ],
  pointHistory: [
    { date: "2026-03-28", desc: "글 작성", points: +10 },
    { date: "2026-03-28", desc: "좋아요 활동", points: +2 },
    { date: "2026-03-27", desc: "댓글 작성", points: +3 },
    { date: "2026-03-27", desc: "좋아요 활동", points: +2 },
    { date: "2026-03-26", desc: "글 작성", points: +10 },
    { date: "2026-03-25", desc: "출석 보너스", points: +5 },
  ],
  rewards: [
    { id: "r1", title: "스타벅스 아메리카노 교환권", cost: 800, emoji: "☕", stock: 5 },
    { id: "r2", title: "맘스터치 할인쿠폰 500원", cost: 300, emoji: "🍔", stock: 10 },
    { id: "r3", title: "올리브영 1,000원 할인", cost: 500, emoji: "🛍️", stock: 8 },
    { id: "r4", title: "이디야 음료 무료", cost: 600, emoji: "☕", stock: 3 },
  ],
};

// ---------- My Home Watchlist ----------
export const myHomes: MyHome[] = [
  { id: "mh1", aptId: "apt1", aptName: "검단 푸르지오 더 퍼스트", dong: "당하동", pyeong: 34, floor: 12, label: "내 집", currentPrice: 55200, prevPrice: 54500 },
  { id: "mh2", aptId: "apt2", aptName: "검단 SK뷰 센트럴", dong: "불로동", pyeong: 25, floor: 8, label: "관심 매물", currentPrice: 43000, prevPrice: 42500 },
];

// ---------- Property Listings ----------
export const listings: Listing[] = [
  // 매매
  {
    id: "l1", aptId: "apt1", aptName: "검단 푸르지오 더 퍼스트", dong: "당하동",
    type: "매매", price: 56000, pyeong: 34, sqm: 114, floor: 15, totalFloors: 24,
    direction: "남향", description: "올수리 완료, 즉시 입주 가능. 교통 편리한 역세권.",
    features: ["올수리", "즉시입주", "주차2대"], agencyName: "검단부동산", agencyPhone: "032-111-2222",
    listedAt: "2026-03-25", isNew: true,
  },
  {
    id: "l2", aptId: "apt1", aptName: "검단 푸르지오 더 퍼스트", dong: "당하동",
    type: "매매", price: 41500, pyeong: 24, sqm: 79, floor: 7, totalFloors: 24,
    direction: "남동향", description: "로얄층 인근, 채광 우수. 초등학교 도보 5분.",
    features: ["채광좋음", "초품아"], agencyName: "당하공인", agencyPhone: "032-333-4444",
    listedAt: "2026-03-20", isNew: false,
  },
  {
    id: "l3", aptId: "apt2", aptName: "검단 SK뷰 센트럴", dong: "불로동",
    type: "매매", price: 44500, pyeong: 25, sqm: 84, floor: 11, totalFloors: 28,
    direction: "남향", description: "상업시설 5분 거리, 생활 인프라 최상. 신축급 관리 상태.",
    features: ["신축급", "커뮤니티시설"], agencyName: "SK공인중개", agencyPhone: "032-555-6666",
    listedAt: "2026-03-27", isNew: true,
  },
  {
    id: "l4", aptId: "apt3", aptName: "검단 한신더휴", dong: "마전동",
    type: "매매", price: 37500, pyeong: 24, sqm: 79, floor: 3, totalFloors: 20,
    direction: "동향", description: "저층 선호하시는 분께 추천. 공원 조망 우수.",
    features: ["공원뷰", "저층"], agencyName: "마전공인", agencyPhone: "032-777-8888",
    listedAt: "2026-03-18", isNew: false,
  },
  {
    id: "l5", aptId: "apt4", aptName: "검단 아이파크 2단지", dong: "왕길동",
    type: "매매", price: 53000, pyeong: 34, sqm: 114, floor: 20, totalFloors: 29,
    direction: "남향", description: "고층 탁 트인 조망. 관리비 저렴. 내부 깔끔.",
    features: ["고층뷰", "관리비저렴"], agencyName: "왕길부동산", agencyPhone: "032-999-0000",
    listedAt: "2026-03-22", isNew: false,
  },
  // 전세
  {
    id: "l6", aptId: "apt1", aptName: "검단 푸르지오 더 퍼스트", dong: "당하동",
    type: "전세", price: 33000, pyeong: 34, sqm: 114, floor: 9, totalFloors: 24,
    direction: "남향", description: "전세 안전 단지. 전입신고 즉시 가능. 2년 계약.",
    features: ["전세대출가능", "즉시입주"], agencyName: "검단부동산", agencyPhone: "032-111-2222",
    listedAt: "2026-03-26", isNew: true,
  },
  {
    id: "l7", aptId: "apt2", aptName: "검단 SK뷰 센트럴", dong: "불로동",
    type: "전세", price: 26000, pyeong: 25, sqm: 84, floor: 5, totalFloors: 28,
    direction: "남동향", description: "깨끗하게 사용, 신축 분위기. 학군 우수.",
    features: ["학군좋음", "깨끗"], agencyName: "SK공인중개", agencyPhone: "032-555-6666",
    listedAt: "2026-03-24", isNew: false,
  },
  {
    id: "l8", aptId: "apt3", aptName: "검단 한신더휴", dong: "마전동",
    type: "전세", price: 22000, pyeong: 24, sqm: 79, floor: 12, totalFloors: 20,
    direction: "남향", description: "중층 채광 좋음. 공원 산책로 연결.",
    features: ["공원인접", "채광좋음"], agencyName: "마전공인", agencyPhone: "032-777-8888",
    listedAt: "2026-03-19", isNew: false,
  },
  {
    id: "l9", aptId: "apt4", aptName: "검단 아이파크 2단지", dong: "왕길동",
    type: "전세", price: 31000, pyeong: 34, sqm: 114, floor: 17, totalFloors: 29,
    direction: "남향", description: "브랜드 단지 전세. 커뮤니티 이용 가능. 피트니스 완비.",
    features: ["피트니스", "커뮤니티"], agencyName: "왕길부동산", agencyPhone: "032-999-0000",
    listedAt: "2026-03-23", isNew: true,
  },
  // 월세
  {
    id: "l10", aptId: "apt1", aptName: "검단 푸르지오 더 퍼스트", dong: "당하동",
    type: "월세", price: 10000, monthlyRent: 80, pyeong: 24, sqm: 79, floor: 6, totalFloors: 24,
    direction: "남향", description: "보증금 1억, 월세 80. 관리비 별도. 반려동물 불가.",
    features: ["즉시입주"], agencyName: "검단부동산", agencyPhone: "032-111-2222",
    listedAt: "2026-03-27", isNew: true,
  },
  {
    id: "l11", aptId: "apt2", aptName: "검단 SK뷰 센트럴", dong: "불로동",
    type: "월세", price: 5000, monthlyRent: 110, pyeong: 25, sqm: 84, floor: 14, totalFloors: 28,
    direction: "서향", description: "보증금 5천, 월세 110. 고층 뷰 우수. 주차 1대 포함.",
    features: ["주차포함", "고층뷰"], agencyName: "SK공인중개", agencyPhone: "032-555-6666",
    listedAt: "2026-03-21", isNew: false,
  },
  {
    id: "l12", aptId: "apt3", aptName: "검단 한신더휴", dong: "마전동",
    type: "월세", price: 3000, monthlyRent: 70, pyeong: 24, sqm: 79, floor: 8, totalFloors: 20,
    direction: "남동향", description: "보증금 3천, 월세 70. 가성비 최고. 신혼부부 환영.",
    features: ["가성비", "신혼부부환영"], agencyName: "마전공인", agencyPhone: "032-777-8888",
    listedAt: "2026-03-20", isNew: false,
  },
];

// ---------- Stores ----------
export const buildings: Building[] = [
  {
    id: "b1",
    name: "검단 센트럴 타워",
    address: "인천 서구 당하동 123",
    parkingInfo: "지하 1~2층 (3시간 무료)",
    openTime: "매일 10:00 ~ 22:00",
    floors: [
      {
        level: -1,
        label: "B1",
        hasRestroom: true,
        restroomCode: "1234",
        stores: [
          {
            id: "s_b1_1",
            name: "홈플러스 익스프레스",
            category: "마트",
            hours: "08:00~23:00",
            phone: "032-123-4567",
            x: 5,
            y: 5,
            w: 90,
            h: 50,
            isOpen: true,
          },
          {
            id: "s_b1_2",
            name: "세탁특공대",
            category: "기타",
            hours: "09:00~21:00",
            x: 5,
            y: 62,
            w: 25,
            h: 30,
            isOpen: true,
          },
          {
            id: "s_b1_3",
            name: "스타벅스 DT",
            category: "카페",
            hours: "07:00~22:00",
            x: 35,
            y: 62,
            w: 30,
            h: 30,
            isOpen: true,
            isPremium: true,
          },
          {
            id: "s_b1_4",
            name: "주차장 입구",
            category: "기타",
            x: 70,
            y: 62,
            w: 25,
            h: 30,
            isOpen: true,
          },
        ],
      },
      {
        level: 0,
        label: "1F",
        hasRestroom: false,
        stores: [
          {
            id: "s_1f_1",
            name: "올리브영",
            category: "기타",
            hours: "10:00~22:00",
            phone: "032-234-5678",
            x: 5,
            y: 5,
            w: 40,
            h: 42,
            isOpen: true,
            isPremium: true,
          },
          {
            id: "s_1f_2",
            name: "파리바게뜨",
            category: "카페",
            hours: "08:00~22:00",
            x: 52,
            y: 5,
            w: 43,
            h: 42,
            isOpen: true,
          },
          {
            id: "s_1f_3",
            name: "우리은행",
            category: "기타",
            hours: "09:00~16:00",
            x: 5,
            y: 54,
            w: 40,
            h: 38,
            isOpen: false,
          },
          {
            id: "s_1f_4",
            name: "약국",
            category: "병원/약국",
            hours: "09:00~21:00",
            x: 52,
            y: 54,
            w: 43,
            h: 38,
            isOpen: true,
          },
        ],
      },
      {
        level: 1,
        label: "2F",
        hasRestroom: true,
        restroomCode: "5678",
        stores: [
          {
            id: "s_2f_1",
            name: "맘스터치",
            category: "음식점",
            hours: "10:00~22:00",
            x: 5,
            y: 5,
            w: 40,
            h: 42,
            isOpen: true,
          },
          {
            id: "s_2f_2",
            name: "CU 편의점",
            category: "편의점",
            hours: "24시간",
            x: 52,
            y: 5,
            w: 43,
            h: 42,
            isOpen: true,
          },
          {
            id: "s_2f_3",
            name: "이디야커피",
            category: "카페",
            hours: "08:00~22:00",
            x: 5,
            y: 54,
            w: 40,
            h: 38,
            isOpen: true,
          },
          {
            id: "s_2f_4",
            name: "헬스앤뷰티",
            category: "미용",
            hours: "10:00~20:00",
            x: 52,
            y: 54,
            w: 43,
            h: 38,
            isOpen: true,
          },
        ],
      },
      {
        level: 2,
        label: "3F",
        hasRestroom: true,
        restroomCode: "9012",
        stores: [
          {
            id: "s_3f_1",
            name: "더본코리아 (백종원)",
            category: "음식점",
            hours: "11:00~22:00",
            x: 5,
            y: 5,
            w: 55,
            h: 88,
            isOpen: true,
            isPremium: true,
          },
          {
            id: "s_3f_2",
            name: "영어학원",
            category: "학원",
            hours: "13:00~21:00",
            x: 66,
            y: 5,
            w: 29,
            h: 42,
            isOpen: true,
          },
          {
            id: "s_3f_3",
            name: "수학학원",
            category: "학원",
            hours: "14:00~22:00",
            x: 66,
            y: 54,
            w: 29,
            h: 39,
            isOpen: true,
          },
        ],
      },
      {
        level: 3,
        label: "4F",
        hasRestroom: false,
        stores: [
          {
            id: "s_4f_1",
            name: "가정의학과",
            category: "병원/약국",
            hours: "09:00~18:00",
            phone: "032-345-6789",
            x: 5,
            y: 5,
            w: 43,
            h: 42,
            isOpen: false,
          },
          {
            id: "s_4f_2",
            name: "치과",
            category: "병원/약국",
            hours: "09:00~19:00",
            x: 52,
            y: 5,
            w: 43,
            h: 42,
            isOpen: true,
          },
          {
            id: "s_4f_3",
            name: "헤어살롱 모이",
            category: "미용",
            hours: "10:00~20:00",
            x: 5,
            y: 54,
            w: 43,
            h: 38,
            isOpen: true,
          },
          {
            id: "s_4f_4",
            name: "공실",
            category: "기타",
            x: 52,
            y: 54,
            w: 43,
            h: 38,
            isOpen: false,
          },
        ],
      },
    ],
  },
];
