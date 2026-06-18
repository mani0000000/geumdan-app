// User
export interface User {
  id: string;
  nickname: string;
  avatar?: string;
  dong: string; // e.g. "당하동", "불로동"
  level: "새싹" | "주민" | "이웃" | "터줏대감";
  joinedAt: string;
  postCount: number;
  commentCount: number;
}

// Community
export type CommunityCategory =
  | "전체"
  | "맘카페"
  | "부동산"
  | "맛집"
  | "중고거래"
  | "분실/목격"
  | "동네질문"
  | "소모임"
  | "생활정보"
  | "육아/교육"
  | "취미/운동"
  | "반려동물"
  | "교통정보"
  | "이웃모임"
  | "공구/나눔";

export interface Post {
  id: string;
  category: CommunityCategory;
  title: string;
  content: string;
  author: string;
  authorDong: string;
  authorAvatarUrl?: string | null;
  authorUserId?: string | null;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  images?: string[];
  videos?: string[];
  isPinned?: boolean;
  isHot?: boolean;
  isHidden?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  author: string;
  authorAvatarUrl?: string | null;
  content: string;
  createdAt: string;
  likeCount: number;
}

// News
export type NewsType = "뉴스" | "유튜브" | "인스타";

export interface NewsItem {
  id: string;
  type: NewsType;
  title: string;
  summary: string;
  thumbnail: string;
  source: string;
  publishedAt: string;
  url: string;
  viewCount?: number;
}

// Transport
export interface BusRoute {
  id: string;
  routeNo: string;
  destination: string;
  arrivalMin: number; // minutes until arrival
  remainingStops: number;
  isLowFloor: boolean;
  isExpress: boolean;
}

export interface BusStop {
  id: string;
  name: string;
  stopNo: string;
  routes: BusRoute[];
  distance: number; // meters from user
}

export interface SubwayStation {
  id: string;
  name: string;
  line: string;
  lineColor: string;
  arrivals: SubwayArrival[];
  distance: number;
}

export interface SubwayArrival {
  direction: string;
  arrivalMin: number;
  trainNo: string;
}

// Real Estate
export interface Apartment {
  id: string;
  name: string;
  dong: string;
  households: number;
  built: number; // year
  sizes: ApartmentSize[];
  recentDeal?: Deal;
}

export interface ApartmentSize {
  pyeong: number;
  sqm: number;
  avgPrice: number; // 만원
  priceHistory: PricePoint[];
}

export interface Deal {
  price: number; // 만원
  date: string;
  floor: number;
  pyeong: number;
}

export interface PricePoint {
  date: string;
  price: number;
}

// Stores
export type StoreCategory =
  | "카페"
  | "음식점"
  | "편의점"
  | "병원/약국"
  | "미용"
  | "학원"
  | "마트"
  | "헬스/운동"
  | "반려동물"
  | "세탁"
  | "베이커리"
  | "부동산"
  | "스터디카페"
  | "안경원"
  | "꽃집"
  | "기타";

// 구조화 영업시간
export interface DayHours {
  open: string | null;   // "09:00"
  close: string | null;  // "21:00"
  closed: boolean;
}

export interface BreakTime {
  start: string;  // "14:00"
  end: string;    // "15:00"
}

export interface StructuredHours {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
  breakTime?: BreakTime | null;
}

// 매장 리뷰
export interface StoreReview {
  id: number;
  storeId: string;
  userId?: string | null;
  nickname: string;
  rating: 1 | 2 | 3 | 4 | 5;
  content?: string | null;
  mediaUrls?: string[];
  isVisible: boolean;
  createdAt: string;
}

// 매장/건물 미디어
export interface StoreMedia {
  id: number;
  storeId?: string | null;
  buildingId?: string | null;
  url: string;
  mediaType: "image" | "video";
  caption?: string | null;
  sortOrder: number;
  isPrimary: boolean;
  uploadedBy?: string | null;
  createdAt: string;
}

// Store suggestion (사용자 제안)
export type SuggestionChangeType =
  | "new_store"
  | "closed"
  | "name_change"
  | "hours_change"
  | "phone_change"
  | "category_change"
  | "other";

export type SuggestionType = "simple" | "detail";

export interface StoreSuggestion {
  id?: string;
  type: SuggestionType;
  suggestionType?: SuggestionChangeType;
  storeId?: string | null;
  category?: StoreCategory | string;
  subCategory?: string;
  storeName?: string;
  buildingName?: string;
  floor?: string;
  phone?: string;
  hours?: string;
  description?: string;
  message?: string;
  contact?: string;
  status?: "pending" | "reviewing" | "approved" | "rejected";
  adminNote?: string;
  createdAt?: string;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  floors: Floor[];
  parkingInfo?: string;
  openTime?: string;
}

export interface Floor {
  level: number; // -1 = B1, 0 = 1F, 1 = 2F, etc.
  label: string;
  stores: Store[];
  hasRestroom: boolean;
  restroomCode?: string;
  restroomLocation?: string;            // 화장실 위치 (예: "엘리베이터 옆")
  restroomGender?: string;              // '남여공용' | '남여분리' | '남자' | '여자'
  restroomNote?: string;                // 추가 안내
}

// Coupons
export interface Coupon {
  id: string;
  storeId: string;
  storeName: string;
  buildingName: string;
  title: string;
  discount: string;
  discountType: "rate" | "amount";
  category: StoreCategory;
  expiry: string;
  color: string;
  downloaded: boolean;
}

// New store openings
export interface OpenBenefit {
  summary: string;          // 1줄 요약 (카드에 표시)
  details: string[];        // 상세 항목 리스트 (상세 화면에 표시)
  validUntil?: string;      // 혜택 마감일 (YYYY-MM-DD)
}

export interface NewStoreOpening {
  id: string;
  storeId: string;
  storeName: string;
  category: StoreCategory;
  floor: string;
  openDate: string;
  emoji: string;
  isNew: boolean;
  openBenefit?: OpenBenefit;
}

// My Home Watchlist
export interface MyHome {
  id: string;
  aptId: string;
  aptName: string;
  dong: string;
  pyeong: number;
  floor: number;
  label: string; // "내 집", "관심 매물" etc.
  currentPrice: number; // 만원
  prevPrice: number; // 만원 (previous month)
}

// Property Listings
export type ListingType = "매매" | "전세" | "월세";

export interface Listing {
  id: string;
  aptId: string;
  aptName: string;
  dong: string;
  type: ListingType;
  price: number; // 만원 (매매/전세 price, or 월세 deposit)
  monthlyRent?: number; // 만원 (월세 only)
  pyeong: number;
  sqm: number;
  floor: number;
  totalFloors: number;
  direction: string; // 남향, 남동향, etc.
  description: string;
  features: string[];
  agencyName: string;
  agencyPhone: string;
  listedAt: string;
  isNew: boolean;
}

// Gas
export interface GasStation {
  id: string;
  name: string;
  brandCode: string;
  brandName: string;
  brandColor: string;
  brandBg: string;
  brandShort: string;
  address: string;
  distanceKm: number;
  lat: number;
  lng: number;
  area: string;
  isSelf: boolean;
  isAlttul: boolean;
  prices: {
    gasoline?: number;
    diesel?: number;
    lpg?: number;
  };
}

export type GasSource = "opinet" | "no_key" | "empty" | "error";

export interface GasApiResponse {
  stations: GasStation[];
  source: GasSource;
  timestamp: string;
  success: boolean;
  message?: string;
  error?: string;
}

export interface Store {
  id: string;
  name: string;
  category: StoreCategory;
  subCategory?: string | null;
  phone?: string;
  hours?: string;
  structuredHours?: StructuredHours | null;
  closedDays?: string[] | null;
  breakTime?: BreakTime | null;
  description?: string;
  avgRating?: number | null;
  reviewCount?: number;
  x: number; // SVG map position %
  y: number;
  w: number;
  h: number;
  isOpen?: boolean;
  isPremium?: boolean;
  thumbnail_url?: string | null;
  logo_url?: string | null;
  extra_info?: Record<string, unknown> | null;
}
