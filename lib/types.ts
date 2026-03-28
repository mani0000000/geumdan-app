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
  | "소모임";

export interface Post {
  id: string;
  category: CommunityCategory;
  title: string;
  content: string;
  author: string;
  authorDong: string;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  images?: string[];
  isPinned?: boolean;
  isHot?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  author: string;
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
  | "기타";

export interface Building {
  id: string;
  name: string;
  address: string;
  floors: Floor[];
  parkingInfo: string;
  openTime: string;
}

export interface Floor {
  level: number; // -1 = B1, 0 = 1F, 1 = 2F, etc.
  label: string;
  stores: Store[];
  hasRestroom: boolean;
  restroomCode?: string;
}

// Coupons
export interface Coupon {
  id: string;
  storeId: string;
  storeName: string;
  title: string;
  discount: string;
  discountType: "rate" | "amount";
  category: StoreCategory;
  expiry: string;
  floor: string;
  color: string;
  downloaded: boolean;
}

// New store openings
export interface NewStoreOpening {
  id: string;
  storeId: string;
  storeName: string;
  category: StoreCategory;
  floor: string;
  openDate: string;
  emoji: string;
  isNew: boolean;
}

export interface Store {
  id: string;
  name: string;
  category: StoreCategory;
  phone?: string;
  hours?: string;
  description?: string;
  x: number; // SVG map position %
  y: number;
  w: number;
  h: number;
  isOpen?: boolean;
  isPremium?: boolean;
}
