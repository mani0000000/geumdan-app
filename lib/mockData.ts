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
    content:
      "내년에 아이가 어린이집 갈 나이인데 당하동 근처 좋은 어린이집 아시는 분 계신가요? 국공립 위주로 알아보고 있어요.",
    author: "육아맘김씨",
    authorDong: "당하동",
    createdAt: "2026-03-28T10:23:00",
    viewCount: 342,
    likeCount: 28,
    commentCount: 15,
    isHot: true,
  },
  {
    id: "p2",
    category: "맛집",
    title: "마전동 담가화로구이 다녀왔어요 🔥",
    content: "드디어 갔다왔어요! 연탄 화로 위에 구워주는 고기 진짜 맛있더라고요. 오겹살이랑 목살 조합 강추예요. 주차도 넉넉하고 웨이팅은 저녁 6시 이후엔 좀 있으니 미리 가세요.",
    author: "먹부림러",
    authorDong: "마전동",
    createdAt: "2026-03-28T09:15:00",
    viewCount: 891,
    likeCount: 67,
    commentCount: 33,
    isHot: true,
    images: ["/images/restaurant1.jpg"],
  },
  {
    id: "p3",
    category: "중고거래",
    title: "[판매] 아이쿠션 5만원 (거의 새것)",
    content:
      "아이가 크면서 안 쓰게 되어 판매합니다. 직거래 선호, 당하동 가능합니다.",
    author: "정리왕맘",
    authorDong: "당하동",
    createdAt: "2026-03-28T08:45:00",
    viewCount: 156,
    likeCount: 5,
    commentCount: 8,
  },
  {
    id: "p4",
    category: "동네질문",
    title: "검단 GS25 야간 배달되나요?",
    content: "밤 11시 이후에도 검단 지역 편의점 배달 되는 곳 있나요?",
    author: "야식러",
    authorDong: "마전동",
    createdAt: "2026-03-27T23:11:00",
    viewCount: 204,
    likeCount: 12,
    commentCount: 19,
  },
  {
    id: "p5",
    category: "부동산",
    title: "검단 신도시 4단지 최근 실거래가 어때요?",
    content:
      "지금 매수 타이밍인지 고민 중입니다. 84㎡ 기준으로 어느 정도 선에서 거래되고 있나요?",
    author: "부동산고민",
    authorDong: "왕길동",
    createdAt: "2026-03-27T21:30:00",
    viewCount: 567,
    likeCount: 34,
    commentCount: 42,
  },
  {
    id: "p6",
    category: "맘카페",
    title: "검단 신도시 초등학교 통학 버스 운행 정보",
    content:
      "A초 B초 통학버스 시간표 공유드립니다. 저장해두시면 유용할 것 같아요!",
    author: "학교정보맘",
    authorDong: "당하동",
    createdAt: "2026-03-27T18:00:00",
    viewCount: 1203,
    likeCount: 98,
    commentCount: 27,
    isPinned: true,
    isHot: true,
  },
  {
    id: "p7",
    category: "소모임",
    title: "검단 주말 배드민턴 모임 멤버 모집",
    content:
      "토요일 오전 7시 ~ 9시 검단체육관에서 같이 치실 분 모십니다. 초보 환영!",
    author: "배드민턴킹",
    authorDong: "불로동",
    createdAt: "2026-03-27T16:44:00",
    viewCount: 334,
    likeCount: 19,
    commentCount: 11,
  },
  {
    id: "p8",
    category: "분실/목격",
    title: "당하동 인근 회색 고양이 발견",
    content:
      "오늘 아침 당하동 주민센터 앞에서 회색 고양이가 돌아다니더라고요. 목줄 있어서 잃어버리신 분 있으면 연락주세요.",
    author: "동네지킴이",
    authorDong: "당하동",
    createdAt: "2026-03-28T07:30:00",
    viewCount: 445,
    likeCount: 31,
    commentCount: 7,
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
      "인천 지하철 1호선 연장으로 아라역 개통을 앞두고 있는 검단신도시의 아파트 값이 상승세다. 아라역 인근 단지들이 10억원 진입을 눈앞에 두고 있어 투자자와 실수요자 모두 주목하고 있다.",
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
  // ── 구도심 단지 ──────────────────────────────────────────
  {
    id: "apt5",
    name: "검단 힐스테이트",
    dong: "왕길동",
    households: 1298,
    built: 2016,
    sizes: [
      {
        pyeong: 25,
        sqm: 84,
        avgPrice: 28500,
        priceHistory: [
          { date: "2024-01", price: 23500 },
          { date: "2024-04", price: 24500 },
          { date: "2024-07", price: 25500 },
          { date: "2024-10", price: 26000 },
          { date: "2025-01", price: 26800 },
          { date: "2025-04", price: 27200 },
          { date: "2025-07", price: 27800 },
          { date: "2025-10", price: 28000 },
          { date: "2026-01", price: 28500 },
          { date: "2026-03", price: 28800 },
        ],
      },
      {
        pyeong: 34,
        sqm: 114,
        avgPrice: 38000,
        priceHistory: [
          { date: "2024-01", price: 32000 },
          { date: "2024-04", price: 33500 },
          { date: "2024-07", price: 35000 },
          { date: "2024-10", price: 35500 },
          { date: "2025-01", price: 36500 },
          { date: "2025-04", price: 37000 },
          { date: "2025-07", price: 37500 },
          { date: "2025-10", price: 37800 },
          { date: "2026-01", price: 38000 },
          { date: "2026-03", price: 38500 },
        ],
      },
    ],
    recentDeal: { price: 28800, date: "2026-03-10", floor: 8, pyeong: 25 },
  },
  {
    id: "apt6",
    name: "오류지구 현대아파트",
    dong: "오류동",
    households: 784,
    built: 2010,
    sizes: [
      {
        pyeong: 24,
        sqm: 79,
        avgPrice: 22000,
        priceHistory: [
          { date: "2024-01", price: 18000 },
          { date: "2024-04", price: 19000 },
          { date: "2024-07", price: 19800 },
          { date: "2024-10", price: 20200 },
          { date: "2025-01", price: 20800 },
          { date: "2025-04", price: 21200 },
          { date: "2025-07", price: 21700 },
          { date: "2025-10", price: 21900 },
          { date: "2026-01", price: 22000 },
          { date: "2026-03", price: 22500 },
        ],
      },
    ],
    recentDeal: { price: 22500, date: "2026-03-05", floor: 5, pyeong: 24 },
  },
  {
    id: "apt7",
    name: "금곡마을 LG자이",
    dong: "금곡동",
    households: 1060,
    built: 2008,
    sizes: [
      {
        pyeong: 24,
        sqm: 79,
        avgPrice: 24500,
        priceHistory: [
          { date: "2024-01", price: 20500 },
          { date: "2024-04", price: 21500 },
          { date: "2024-07", price: 22500 },
          { date: "2024-10", price: 23000 },
          { date: "2025-01", price: 23500 },
          { date: "2025-04", price: 24000 },
          { date: "2025-07", price: 24200 },
          { date: "2025-10", price: 24500 },
          { date: "2026-01", price: 24500 },
          { date: "2026-03", price: 25000 },
        ],
      },
      {
        pyeong: 34,
        sqm: 114,
        avgPrice: 30500,
        priceHistory: [
          { date: "2024-01", price: 26000 },
          { date: "2024-04", price: 27000 },
          { date: "2024-07", price: 28000 },
          { date: "2024-10", price: 28500 },
          { date: "2025-01", price: 29000 },
          { date: "2025-04", price: 29500 },
          { date: "2025-07", price: 30000 },
          { date: "2025-10", price: 30200 },
          { date: "2026-01", price: 30500 },
          { date: "2026-03", price: 31000 },
        ],
      },
    ],
    recentDeal: { price: 25000, date: "2026-03-12", floor: 7, pyeong: 24 },
  },
  {
    id: "apt8",
    name: "백석마을 두산위브",
    dong: "백석동",
    households: 920,
    built: 2007,
    sizes: [
      {
        pyeong: 25,
        sqm: 84,
        avgPrice: 26000,
        priceHistory: [
          { date: "2024-01", price: 21500 },
          { date: "2024-04", price: 22500 },
          { date: "2024-07", price: 23500 },
          { date: "2024-10", price: 24000 },
          { date: "2025-01", price: 24500 },
          { date: "2025-04", price: 25000 },
          { date: "2025-07", price: 25500 },
          { date: "2025-10", price: 25800 },
          { date: "2026-01", price: 26000 },
          { date: "2026-03", price: 26500 },
        ],
      },
    ],
    recentDeal: { price: 26500, date: "2026-03-08", floor: 6, pyeong: 25 },
  },
];

// ---------- Coupons ----------
export const coupons: Coupon[] = [
  { id: "cp1", storeId: "s_b1_1", storeName: "롯데마트 검단점", title: "전품목 5% 할인 (3만원 이상)", discount: "5%", discountType: "rate", category: "마트", expiry: "2026-03-31", floor: "B1", color: "#E60012", downloaded: false },
  { id: "cp2", storeId: "s_2f_1", storeName: "하이마트 검단점", title: "가전제품 구매 시 5% 캐시백", discount: "5%", discountType: "rate", category: "기타", expiry: "2026-04-05", floor: "2F", color: "#003DA5", downloaded: true },
  { id: "cp3", storeId: "s_b1_2", storeName: "즐거운약국", title: "건강기능식품 10% 할인", discount: "10%", discountType: "rate", category: "병원/약국", expiry: "2026-04-10", floor: "B1", color: "#3182F6", downloaded: false },
  { id: "cp4", storeId: "s_2f_2", storeName: "토이저러스 검단점", title: "완구 2개 이상 구매 시 20% 할인", discount: "20%", discountType: "rate", category: "기타", expiry: "2026-04-02", floor: "2F", color: "#E8251A", downloaded: false },
  { id: "cp5", storeId: "s_1f_1", storeName: "지오웰치과", title: "스케일링 정기권 3,000원 할인", discount: "3,000원", discountType: "amount", category: "병원/약국", expiry: "2026-04-15", floor: "1F", color: "#0066CC", downloaded: false },
  { id: "cp6", storeId: "s_1f_4", storeName: "쿨펫동물병원", title: "기본 건강검진 20% 할인", discount: "20%", discountType: "rate", category: "병원/약국", expiry: "2026-03-30", floor: "1F", color: "#6366F1", downloaded: true },
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
    promo: "검단 최대 대형마트 — 식품부터 생활용품까지 한 번에",
    description:
      "롯데마트 검단점은 마전동 원당대로에 위치한 대형마트로, 신선식품·가공식품·생활용품·의류 등 3만여 품목을 취급합니다. 하이마트·토이저러스·즐거운약국 등이 함께 입점해 있어 원스톱 쇼핑이 가능합니다.",
    highlights: ["🛒 3만여 품목 원스톱 쇼핑", "🅿️ 지하 3층 대형 주차장 무료", "🍱 신선식품 당일 신선 입고", "🎠 2층 하이마트·토이저러스 입점"],
    conditions: [
      "3만원 이상 결제 시 자동 적용 (식품·생활용품)",
      "롯데마트 L.POINT 중복 적용 가능",
      "주류·담배·상품권 제외",
      "의무휴업일(매월 2·4번째 일요일) 사용 불가",
    ],
    hours: "매일 10:00 ~ 23:00 (매월 2·4번째 일요일 의무휴업)",
    phone: "032-560-2590",
    location: "인천 서구 원당대로 581 (마전동) · 마전역 도보 5분",
    menu: [
      { name: "당일 신선 육류 코너", price: "구매가 5% 할인", tag: "인기" },
      { name: "수산물 코너", price: "구매가 5% 할인" },
      { name: "유기농 채소·과일", price: "구매가 5% 할인", tag: "추천" },
    ],
  },
  cp2: {
    promo: "가전 전문 하이마트 검단점 — 국내 최대 가전 매장",
    description:
      "LG·삼성·다이슨 등 국내외 주요 가전 브랜드를 한 자리에서 비교·체험할 수 있습니다. 전문 상담사가 상주하여 제품 선택부터 설치까지 도와드립니다.",
    highlights: ["📺 LG·삼성·다이슨 등 전 브랜드", "🔧 구매 후 무료 설치 서비스", "🛡️ 하이마트 10년 연장 보증", "💳 무이자 할부 최대 36개월"],
    conditions: [
      "가전제품 구매 시 5% 캐시백 (다음 방문 시 사용)",
      "스마트폰·태블릿 제외",
      "이벤트 상품 중복 적용 불가",
      "캐시백은 하이마트 멤버십 포인트로 적립",
    ],
    hours: "매일 10:00 ~ 21:00",
    phone: "1588-2552",
    location: "롯데마트 검단점 2층",
    menu: [
      { name: "LG 올레드 TV", price: "캐시백 최대 6만원", tag: "베스트" },
      { name: "삼성 비스포크 냉장고", price: "캐시백 최대 8만원" },
      { name: "다이슨 청소기", price: "캐시백 최대 2만5천원", tag: "인기" },
    ],
  },
  cp3: {
    promo: "전문 약사가 상주하는 즐거운약국 — 편의·전문성 모두 잡다",
    description:
      "롯데마트 검단점 B1에 위치한 즐거운약국은 마트 이용 고객이 쇼핑 후 간편하게 약을 구매할 수 있습니다. 건강기능식품부터 일반·전문의약품까지 공인 약사가 직접 상담해 드립니다.",
    highlights: ["💊 건강기능식품 150종 이상", "👨‍⚕️ 공인 약사 무료 1:1 상담", "🏠 처방전 팩스 접수 가능", "🕙 마트 연계 영업 (10:00~22:00)"],
    conditions: [
      "건강기능식품 카테고리 한정",
      "전문의약품·처방약 제외",
      "1인 1회 사용 가능",
      "롯데마트 영수증 지참 시 추가 할인 가능",
    ],
    hours: "매일 10:00 ~ 22:00 (마트 휴업일 동일 휴무)",
    phone: "032-560-2591",
    location: "롯데마트 검단점 B1층 즐거운약국",
    menu: [
      { name: "종합 비타민 (3개월분)", price: "28,000원~", tag: "추천" },
      { name: "유산균 프로바이오틱스", price: "25,000원~", tag: "인기" },
      { name: "루테인 아이케어", price: "19,000원~" },
    ],
  },
  cp4: {
    promo: "아이들의 천국 토이저러스 — 완구·유아용품 전문점",
    description:
      "국내외 인기 완구 브랜드를 총망라한 토이저러스 검단점입니다. 레고, 닌텐도, 바비 등 1,500여 종의 완구를 직접 보고 체험할 수 있으며, 생일 선물·어린이날 선물 추천 상담도 제공합니다.",
    highlights: ["🧸 완구 1,500여 종 한자리", "🎮 닌텐도·레고 체험 존 운영", "🎁 생일·기념일 선물 포장 무료", "👶 0세 영유아 완구 별도 코너"],
    conditions: [
      "완구 2개 이상 동시 구매 시 적용",
      "이미 할인 중인 세일 상품 제외",
      "온라인 주문·배달 제외 (매장 구매만 적용)",
      "1인 1회 사용 가능",
    ],
    hours: "매일 10:00 ~ 21:00",
    phone: "1588-2552",
    location: "롯데마트 검단점 2층 토이저러스",
    menu: [
      { name: "레고 시티 시리즈", price: "20% 할인 적용", tag: "인기" },
      { name: "닌텐도 Switch 게임", price: "20% 할인 적용" },
      { name: "바비 인형 세트", price: "20% 할인 적용", tag: "추천" },
    ],
  },
  cp5: {
    promo: "지오웰치과 — 검단 대표 치과, 투명한 진료비",
    description:
      "롯데마트 검단점 1층에 위치한 지오웰치과는 임플란트·교정·스케일링 등 다양한 치과 진료를 제공합니다. 디지털 X-ray와 구강 스캐너 등 최신 장비를 갖추고 있으며, 보험 적용 진료는 모두 실비 청구 가능합니다.",
    highlights: ["🦷 임플란트·교정·스케일링 전문", "📷 디지털 3D 구강 스캐너 보유", "💰 보험 진료 실비 청구 가능", "🅿️ 롯데마트 주차 2시간 무료"],
    conditions: [
      "스케일링 정기권 3개월 1회 쿠폰에 적용",
      "신규 환자 첫 방문 시에만 적용",
      "임플란트·교정 시술 비용 제외",
      "전화 예약 필수 (당일 가능)",
    ],
    hours: "평일 09:00 ~ 18:30 / 토 09:00 ~ 14:00 / 일·공휴일 휴무",
    phone: "032-560-2595",
    location: "롯데마트 검단점 1층 지오웰치과",
    menu: [
      { name: "스케일링 (1회)", price: "15,000원~", tag: "추천" },
      { name: "임플란트 (1개)", price: "80만원~" },
      { name: "치아 미백", price: "20만원~", tag: "인기" },
    ],
  },
  cp6: {
    promo: "쿨펫동물병원 — 반려동물 건강 주치의",
    description:
      "롯데마트 검단점 1층의 쿨펫동물병원은 강아지·고양이를 비롯한 반려동물 전문 1차 동물병원입니다. 기본 건강검진·예방접종·내과 진료 등을 제공하며, 마트 쇼핑 후 방문하기 편리한 위치입니다.",
    highlights: ["🐾 강아지·고양이 전문 1차 병원", "💉 예방접종·건강검진 패키지", "🔬 혈액·소변 검사 당일 결과", "🛒 마트 쇼핑 후 바로 방문 가능"],
    conditions: [
      "기본 건강검진 패키지 (혈액+신체검사)에만 적용",
      "예방접종·치료비 별도",
      "쿠폰 사용 기간 내 1회 가능",
      "예약 방문 시 우선 진료",
    ],
    hours: "평일 10:00 ~ 19:00 / 토 10:00 ~ 17:00 / 일 휴무",
    phone: "032-560-2598",
    location: "롯데마트 검단점 1층 쿨펫동물병원",
    menu: [
      { name: "기본 건강검진 패키지", price: "5만원~", tag: "추천" },
      { name: "종합 예방접종", price: "3만원~", tag: "인기" },
      { name: "심장사상충 검사", price: "2만원~" },
    ],
  },
};

// ---------- New Store Openings ----------
export const newStoreOpenings: NewStoreOpening[] = [
  { id: "ns1", storeId: "s_1f_4", storeName: "쿨펫동물병원", category: "병원/약국", floor: "1F", openDate: "2026-03-25", emoji: "🐾", isNew: true, event: "오픈 기념 기본검진 20% 할인" },
  { id: "ns2", storeId: "s_1f_2", storeName: "시호비전", category: "기타", floor: "1F", openDate: "2026-03-22", emoji: "👓", isNew: true, event: "오픈 특가 안경 전품목 30% 할인" },
  { id: "ns3", storeId: "s_2f_2", storeName: "토이저러스 검단점", category: "기타", floor: "2F", openDate: "2026-03-18", emoji: "🧸", isNew: false, event: "완구 2개 이상 구매 시 20% 할인" },
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
    name: "롯데마트 검단점",
    brand: "롯데마트",
    type: "대형마트",
    address: "인천 서구 원당대로 581 (마전동)",
    phone: "032-560-2590",
    distance: "0.8km",
    weekdayHours: "10:00 ~ 23:00",
    saturdayHours: "10:00 ~ 23:00",
    sundayHours: "10:00 ~ 23:00",
    closingPattern: "2nd4th",
    notice: "매월 2·4번째 일요일 의무휴업 · 하이마트·토이저러스 입점",
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
    name: "이마트 청라점",
    brand: "이마트",
    type: "대형마트",
    address: "인천 서구 청라커낼로 228",
    phone: "1588-1234",
    distance: "4.2km",
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
  // ── 구도심 매물 ──────────────────────────────────────────
  {
    id: "l13", aptId: "apt5", aptName: "검단 힐스테이트", dong: "왕길동",
    type: "매매", price: 29500, pyeong: 25, sqm: 84, floor: 10, totalFloors: 22,
    direction: "남향", description: "검단사거리역 도보 5분. 리모델링 완료. 지하 주차 편리.",
    features: ["역세권", "리모델링"], agencyName: "왕길부동산", agencyPhone: "032-999-0000",
    listedAt: "2026-03-24", isNew: true,
  },
  {
    id: "l14", aptId: "apt5", aptName: "검단 힐스테이트", dong: "왕길동",
    type: "전세", price: 18000, pyeong: 25, sqm: 84, floor: 6, totalFloors: 22,
    direction: "남동향", description: "역 가깝고 학군 우수. 전세 대출 가능. 즉시 입주.",
    features: ["전세대출가능", "즉시입주"], agencyName: "왕길부동산", agencyPhone: "032-999-0000",
    listedAt: "2026-03-22", isNew: false,
  },
  {
    id: "l15", aptId: "apt6", aptName: "오류지구 현대아파트", dong: "오류동",
    type: "매매", price: 22800, pyeong: 24, sqm: 79, floor: 4, totalFloors: 15,
    direction: "남향", description: "중소형 단지, 관리비 저렴. 인근 공원 도보 2분.",
    features: ["공원인접", "관리비저렴"], agencyName: "검단부동산", agencyPhone: "032-111-2222",
    listedAt: "2026-03-19", isNew: false,
  },
  {
    id: "l16", aptId: "apt6", aptName: "오류지구 현대아파트", dong: "오류동",
    type: "전세", price: 14000, pyeong: 24, sqm: 79, floor: 8, totalFloors: 15,
    direction: "남향", description: "구도심 가성비 전세. 편의시설 도보 이용 가능.",
    features: ["가성비", "편의시설"], agencyName: "검단부동산", agencyPhone: "032-111-2222",
    listedAt: "2026-03-18", isNew: false,
  },
  {
    id: "l17", aptId: "apt7", aptName: "금곡마을 LG자이", dong: "금곡동",
    type: "매매", price: 25500, pyeong: 24, sqm: 79, floor: 9, totalFloors: 18,
    direction: "남서향", description: "브랜드 단지 가성비 매물. 깔끔한 내부, 주차 여유.",
    features: ["브랜드단지", "주차여유"], agencyName: "금곡공인", agencyPhone: "032-562-1111",
    listedAt: "2026-03-21", isNew: false,
  },
  {
    id: "l18", aptId: "apt7", aptName: "금곡마을 LG자이", dong: "금곡동",
    type: "월세", price: 5000, monthlyRent: 65, pyeong: 24, sqm: 79, floor: 3, totalFloors: 18,
    direction: "동향", description: "보증금 5천, 월세 65. 구도심 최저가 월세. 단기 가능.",
    features: ["단기가능", "가성비"], agencyName: "금곡공인", agencyPhone: "032-562-1111",
    listedAt: "2026-03-23", isNew: true,
  },
  {
    id: "l19", aptId: "apt8", aptName: "백석마을 두산위브", dong: "백석동",
    type: "매매", price: 26800, pyeong: 25, sqm: 84, floor: 7, totalFloors: 16,
    direction: "남향", description: "아라1동 중심부. 생활편의시설 도보 가능. 초등학교 인근.",
    features: ["초품아", "생활편의"], agencyName: "아라공인", agencyPhone: "032-563-2222",
    listedAt: "2026-03-20", isNew: false,
  },
  {
    id: "l20", aptId: "apt8", aptName: "백석마을 두산위브", dong: "백석동",
    type: "전세", price: 17000, pyeong: 25, sqm: 84, floor: 11, totalFloors: 16,
    direction: "남향", description: "구도심 안정적 전세. 조용한 주거환경. 역 버스 연결 양호.",
    features: ["조용한환경", "교통편리"], agencyName: "아라공인", agencyPhone: "032-563-2222",
    listedAt: "2026-03-17", isNew: false,
  },
];

// ---------- Stores ----------
export const buildings: Building[] = [
  {
    id: "b1",
    name: "롯데마트 검단점",
    address: "인천 서구 원당대로 581 (마전동)",
    parkingInfo: "지하 1~3층 (3시간 무료, 마트 이용 시 1시간 추가)",
    openTime: "매일 10:00 ~ 23:00 (의무휴업일 제외)",
    floors: [
      {
        level: -1,
        label: "B1",
        hasRestroom: true,
        restroomCode: "1234",
        stores: [
          {
            id: "s_b1_1",
            name: "롯데마트",
            category: "마트",
            hours: "10:00~23:00",
            phone: "032-560-2590",
            x: 5,
            y: 5,
            w: 90,
            h: 60,
            isOpen: true,
            isPremium: true,
          },
          {
            id: "s_b1_2",
            name: "즐거운약국",
            category: "병원/약국",
            hours: "10:00~22:00",
            phone: "032-560-2591",
            x: 5,
            y: 71,
            w: 43,
            h: 24,
            isOpen: true,
          },
          {
            id: "s_b1_3",
            name: "고객서비스센터",
            category: "기타",
            hours: "10:00~22:00",
            x: 52,
            y: 71,
            w: 43,
            h: 24,
            isOpen: true,
          },
        ],
      },
      {
        level: 0,
        label: "1F",
        hasRestroom: true,
        stores: [
          {
            id: "s_1f_1",
            name: "지오웰치과",
            category: "병원/약국",
            hours: "09:00~18:30",
            phone: "032-560-2595",
            x: 5,
            y: 5,
            w: 43,
            h: 42,
            isOpen: true,
          },
          {
            id: "s_1f_2",
            name: "시호비전",
            category: "기타",
            hours: "10:00~20:00",
            x: 52,
            y: 5,
            w: 43,
            h: 42,
            isOpen: true,
          },
          {
            id: "s_1f_3",
            name: "크린토피아",
            category: "기타",
            hours: "08:00~21:00",
            x: 5,
            y: 54,
            w: 28,
            h: 38,
            isOpen: true,
          },
          {
            id: "s_1f_4",
            name: "쿨펫동물병원",
            category: "병원/약국",
            hours: "10:00~19:00",
            phone: "032-560-2598",
            x: 37,
            y: 54,
            w: 30,
            h: 38,
            isOpen: true,
          },
          {
            id: "s_1f_5",
            name: "공실",
            category: "기타",
            x: 71,
            y: 54,
            w: 24,
            h: 38,
            isOpen: false,
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
            name: "하이마트",
            category: "기타",
            hours: "10:00~21:00",
            phone: "1588-2552",
            x: 5,
            y: 5,
            w: 55,
            h: 88,
            isOpen: true,
            isPremium: true,
          },
          {
            id: "s_2f_2",
            name: "토이저러스",
            category: "기타",
            hours: "10:00~21:00",
            x: 65,
            y: 5,
            w: 30,
            h: 42,
            isOpen: true,
          },
          {
            id: "s_2f_3",
            name: "공실",
            category: "기타",
            x: 65,
            y: 54,
            w: 30,
            h: 39,
            isOpen: false,
          },
        ],
      },
    ],
  },
];
