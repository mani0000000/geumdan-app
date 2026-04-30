import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getKey() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk";
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_ADMIN_DB_KEY || anonKey;
  return { url, key };
}

async function pgrest(url: string, key: string, method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = {
    "apikey": key,
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=minimal",
  };
  if (key.startsWith("eyJ")) headers["Authorization"] = `Bearer ${key}`;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${path} → ${res.status}: ${err.slice(0, 200)}`);
  }
}

// ─── 데이터 ───────────────────────────────────────────────────

const NOW = new Date().toISOString();
const NEXT_YEAR = new Date(Date.now() + 365 * 86400000).toISOString();

const BANNERS = [
  {
    id: "bnr_001",
    sort_order: 1,
    title: "검단신도시 5호선 예타 확정! 🎉",
    subtitle: "서울 접근성 대폭 개선 — 2030년 개통 목표",
    image_url: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&h=400&fit=crop",
    link_url: null,
    link_label: "자세히 보기",
    bg_from: "#1E3A5F",
    bg_to: "#3182F6",
    badge: "HOT",
    badge_color: "#FF3B30",
    starts_at: NOW,
    ends_at: NEXT_YEAR,
    active: true,
    created_at: NOW,
  },
  {
    id: "bnr_002",
    sort_order: 2,
    title: "이번 주 행사 정보 한눈에 보기 🛒",
    subtitle: "이마트·홈플러스·롯데마트 이번 주 할인",
    image_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=400&fit=crop",
    link_url: null,
    link_label: "쿠폰 받기",
    bg_from: "#0D5C2F",
    bg_to: "#059669",
    badge: "이벤트",
    badge_color: "#F59E0B",
    starts_at: NOW,
    ends_at: NEXT_YEAR,
    active: true,
    created_at: NOW,
  },
  {
    id: "bnr_003",
    sort_order: 3,
    title: "검단신도시 커뮤니티 🏘️",
    subtitle: "우리 동네 소식을 함께 나눠요",
    image_url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=400&fit=crop",
    link_url: null,
    link_label: "커뮤니티 가기",
    bg_from: "#4C1D95",
    bg_to: "#7C3AED",
    badge: null,
    badge_color: "#6D28D9",
    starts_at: NOW,
    ends_at: NEXT_YEAR,
    active: true,
    created_at: NOW,
  },
];

const MARTS = [
  {
    id: "mart_001",
    name: "이마트 검단점",
    brand: "이마트",
    type: "대형마트",
    address: "인천 서구 검단로 678",
    phone: "1588-1234",
    distance: "1.1km",
    weekday_hours: "10:00 ~ 23:00",
    saturday_hours: "10:00 ~ 23:00",
    sunday_hours: "10:00 ~ 23:00",
    closing_pattern: "2nd4th",
    notice: "매월 2·4번째 일요일 의무휴업",
    logo_url: null,
    lat: 37.5937,
    lng: 126.7225,
    sort_order: 1,
    active: true,
  },
  {
    id: "mart_002",
    name: "홈플러스 검단점",
    brand: "홈플러스",
    type: "대형마트",
    address: "인천 서구 당하동 110",
    phone: "1588-5678",
    distance: "1.8km",
    weekday_hours: "10:00 ~ 24:00",
    saturday_hours: "10:00 ~ 24:00",
    sunday_hours: "10:00 ~ 24:00",
    closing_pattern: "2nd4th",
    notice: "매월 2·4번째 일요일 의무휴업",
    logo_url: null,
    lat: 37.5870,
    lng: 126.7180,
    sort_order: 2,
    active: true,
  },
  {
    id: "mart_003",
    name: "롯데마트 검단점",
    brand: "롯데마트",
    type: "대형마트",
    address: "인천 서구 마전동 626-7",
    phone: "032-560-2500",
    distance: "1.5km",
    weekday_hours: "10:00 ~ 23:00",
    saturday_hours: "10:00 ~ 23:00",
    sunday_hours: "10:00 ~ 23:00",
    closing_pattern: "2nd4th",
    notice: "매월 2·4번째 일요일 의무휴업",
    logo_url: null,
    lat: 37.5993,
    lng: 126.6798,
    sort_order: 3,
    active: true,
  },
  {
    id: "mart_004",
    name: "홈플러스 익스프레스 검단점",
    brand: "홈플러스 익스프레스",
    type: "슈퍼마트",
    address: "인천 서구 마전동 345",
    phone: "032-567-0001",
    distance: "650m",
    weekday_hours: "08:00 ~ 23:00",
    saturday_hours: "08:00 ~ 23:00",
    sunday_hours: "09:00 ~ 22:00",
    closing_pattern: "open",
    notice: null,
    logo_url: null,
    lat: 37.5910,
    lng: 126.7160,
    sort_order: 4,
    active: true,
  },
  {
    id: "mart_005",
    name: "GS더프레시 검단신도시점",
    brand: "GS더프레시",
    type: "슈퍼마트",
    address: "인천 서구 발산로 6 (원당동)",
    phone: "032-567-0002",
    distance: "900m",
    weekday_hours: "10:00 ~ 23:00",
    saturday_hours: "10:00 ~ 23:00",
    sunday_hours: "10:00 ~ 22:00",
    closing_pattern: "2nd4th",
    notice: "매월 2·4번째 일요일 의무휴업",
    logo_url: null,
    lat: 37.5882,
    lng: 126.7195,
    sort_order: 5,
    active: true,
  },
  {
    id: "mart_006",
    name: "GS더프레시 검단더힐점",
    brand: "GS더프레시",
    type: "슈퍼마트",
    address: "인천 서구 검단로 (당하동, 검단더힐 단지)",
    phone: "032-567-0103",
    distance: "1.2km",
    weekday_hours: "10:00 ~ 23:00",
    saturday_hours: "10:00 ~ 23:00",
    sunday_hours: "10:00 ~ 22:00",
    closing_pattern: "2nd4th",
    notice: "매월 2·4번째 일요일 의무휴업",
    logo_url: null,
    lat: 37.5938,
    lng: 126.7156,
    sort_order: 6,
    active: true,
  },
  {
    id: "mart_007",
    name: "노브랜드 검단신도시점",
    brand: "노브랜드",
    type: "슈퍼마트",
    address: "인천 서구 당하동 (검단신도시 상업지구)",
    phone: "032-562-3000",
    distance: "1.0km",
    weekday_hours: "10:00 ~ 22:00",
    saturday_hours: "10:00 ~ 22:00",
    sunday_hours: "10:00 ~ 22:00",
    closing_pattern: "2nd4th",
    notice: "매월 2·4번째 일요일 의무휴업",
    logo_url: null,
    lat: 37.5895,
    lng: 126.7170,
    sort_order: 7,
    active: true,
  },
  {
    id: "mart_008",
    name: "이마트 에브리데이 검단점",
    brand: "이마트 에브리데이",
    type: "슈퍼마트",
    address: "인천 서구 검단로 (불로동)",
    phone: "032-562-4000",
    distance: "1.3km",
    weekday_hours: "09:00 ~ 23:00",
    saturday_hours: "09:00 ~ 23:00",
    sunday_hours: "09:00 ~ 23:00",
    closing_pattern: "open",
    notice: null,
    logo_url: null,
    lat: 37.5910,
    lng: 126.7220,
    sort_order: 8,
    active: true,
  },
  {
    id: "mart_009",
    name: "아라홈마트",
    brand: "아라홈마트",
    type: "동네마트",
    address: "인천 서구 서로3로 50 (모아미래도 엘리트파크)",
    phone: "032-567-7100",
    distance: "1.4km",
    weekday_hours: "09:00 ~ 23:00",
    saturday_hours: "09:00 ~ 23:00",
    sunday_hours: "09:00 ~ 22:00",
    closing_pattern: "open",
    notice: "동네마트 · 신선식품/배달 가능",
    logo_url: null,
    lat: 37.5905,
    lng: 126.7232,
    sort_order: 9,
    active: true,
  },
  {
    id: "mart_010",
    name: "원당홈마트",
    brand: "원당홈마트",
    type: "동네마트",
    address: "인천 서구 원당동 (검단신도시)",
    phone: "032-562-8800",
    distance: "1.1km",
    weekday_hours: "09:00 ~ 22:00",
    saturday_hours: "09:00 ~ 22:00",
    sunday_hours: "09:00 ~ 22:00",
    closing_pattern: "open",
    notice: null,
    logo_url: null,
    lat: 37.5878,
    lng: 126.7188,
    sort_order: 10,
    active: true,
  },
  {
    id: "mart_011",
    name: "당하홈플러스마트",
    brand: "당하홈플러스마트",
    type: "동네마트",
    address: "인천 서구 당하동",
    phone: "032-563-9090",
    distance: "1.6km",
    weekday_hours: "09:00 ~ 22:00",
    saturday_hours: "09:00 ~ 22:00",
    sunday_hours: "09:00 ~ 21:00",
    closing_pattern: "open",
    notice: null,
    logo_url: null,
    lat: 37.5860,
    lng: 126.7165,
    sort_order: 11,
    active: true,
  },
];

const PHARMACIES = [
  { id: "ph1", name: "가온약국", address: "인천 서구 봉오재 3로 90 (검단동)", phone: "032-567-0879", weekday_hours: "09:00~21:00", weekend_hours: "토·일 10:00~18:00", night_hours: "매일 22:00~01:00", tags: ["주말", "심야"], distance: "650m", lat: null, lng: null, active: true },
  { id: "ph2", name: "검단아라태평양약국", address: "인천 서구 이음대로 378 (원당동)", phone: "032-561-7768", weekday_hours: "09:00~21:00", weekend_hours: "토·일 10:00~18:00", night_hours: "매일 22:00~01:00", tags: ["주말", "심야"], distance: "1.0km", lat: null, lng: null, active: true },
  { id: "ph3", name: "레몬약국", address: "인천 서구 검단로 480 (왕길동)", phone: "032-562-1088", weekday_hours: "09:00~21:00", weekend_hours: "토·일 10:00~18:00", night_hours: "매일 22:00~01:00", tags: ["주말", "심야"], distance: "1.4km", lat: null, lng: null, active: true },
  { id: "ph4", name: "루원봄약국", address: "인천 서구 봉오대로 255 (가정동)", phone: "032-563-1486", weekday_hours: "09:00~20:00", weekend_hours: null, night_hours: "평일 22:00~01:00", tags: ["심야"], distance: "3.1km", lat: null, lng: null, active: true },
  { id: "ph5", name: "메디피아약국", address: "인천 서구 완정로 172 (마전동)", phone: "032-562-0258", weekday_hours: "09:00~21:00", weekend_hours: "토·일 10:00~18:00", night_hours: "매일 22:00~01:00", tags: ["주말", "심야"], distance: "1.8km", lat: null, lng: null, active: true },
  { id: "ph6", name: "옥신온누리약국", address: "인천 서구 고래울로 29 (가좌동)", phone: "032-578-1329", weekday_hours: "09:00~21:00", weekend_hours: "토·일 10:00~18:00", night_hours: "매일 22:00~01:00", tags: ["주말", "심야"], distance: "4.2km", lat: null, lng: null, active: true },
];

const NEWS = [
  { id: "news_001", type: "뉴스", title: "지하철 5호선 검단 연장, 예비타당성 최종 통과", summary: "서울 지하철 5호선이 방화역에서 김포·인천 검단까지 연장되는 사업이 예비타당성 조사를 최종 통과했다. 총 사업비 약 3조원, 구간 25.8km로 검단신도시 주민들의 서울 접근성이 크게 개선될 전망이다.", thumbnail: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=600&h=800&fit=crop", source: "헤럴드경제", published_at: "2026-03-11T09:00:00Z", url: "https://biz.heraldcorp.com/article/10691408", view_count: 18420, active: true },
  { id: "news_002", type: "뉴스", title: "검단신도시 5단계 사업구역 올해 준공…240만㎡ 신도시 완성", summary: "인천 검단신도시 5단계 사업구역이 2026년 준공을 앞두고 있다. 16개 주거블록과 공원·도로·상수도 등 도시 기반시설이 완성되면서 명실상부한 신도시로 완성될 예정이다.", thumbnail: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=800&fit=crop", source: "헤럴드경제", published_at: "2026-03-24T10:00:00Z", url: "https://biz.heraldcorp.com/article/10701358", view_count: 9812, active: true },
  { id: "news_003", type: "유튜브", title: "검단신도시 2026 봄 근황 — 5호선 예타 확정 후 달라진 분위기", summary: "지하철 5호선 예타 통과 이후 검단신도시의 분위기 변화를 담은 영상.", thumbnail: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&h=800&fit=crop", source: "유튜브", published_at: "2026-03-27T12:00:00Z", url: "https://www.youtube.com/results?search_query=검단신도시+2026+근황", view_count: 24730, active: true },
  { id: "news_004", type: "뉴스", title: "검단 아파트 '10억 클럽' 진입하나…아라역 초근접 단지 상승세", summary: "인천 지하철 1호선 연장으로 아라역 개통을 앞두고 있는 검단신도시의 아파트 값이 상승세다.", thumbnail: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=800&fit=crop", source: "헤럴드경제", published_at: "2026-02-14T09:00:00Z", url: "https://biz.heraldcorp.com/article/10492945", view_count: 31204, active: true },
  { id: "news_005", type: "인스타", title: "#검단맛집 이번 주 핫플 — 마전동 화로구이부터 신규 카페까지", summary: "검단 주민들이 공유하는 이번 주 맛집 사진들.", thumbnail: "https://images.unsplash.com/photo-1498654896293-37aaa4f3ced9?w=600&h=800&fit=crop", source: "@geumdan_food", published_at: "2026-03-28T09:00:00Z", url: "https://www.instagram.com/explore/tags/%EA%B2%80%EB%8B%A8%EB%A7%9B%EC%A7%91/", view_count: 5670, active: true },
  { id: "news_006", type: "유튜브", title: "검단 아파트 단지 투어 — 당하동·불로동 실거래가 분석 2026", summary: "2026년 봄 검단신도시 주요 아파트 단지를 직접 방문해 실거래가 현황을 분석했습니다.", thumbnail: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=800&fit=crop", source: "유튜브", published_at: "2026-03-25T15:00:00Z", url: "https://www.youtube.com/results?search_query=검단+아파트+부동산+시세+2026", view_count: 38110, active: true },
];

const PLACES = [
  { id: "place_001", name: "강화 고려궁지", category: "culture", area: "강화도", short_desc: "고려 시대 궁궐터, 유네스코 세계유산 잠정 목록", description: "고려가 몽골 침략에 맞서 강화도로 천도한 1232년부터 1270년까지 38년간 수도 역할을 했던 궁궐터입니다.", address: "인천 강화군 강화읍 북문길 42", thumbnail_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop", tags: ["역사", "궁궐", "유네스코"], distance_km: 28, drive_min: 40, operating_hours: "09:00~18:00 (월요일 휴관)", admission_fee: "성인 900원", phone: "032-930-7078", website: null, published: true, sort_order: 1, created_at: NOW },
  { id: "place_002", name: "인천대공원", category: "nature", area: "인천", short_desc: "인천 최대 규모의 자연 휴식 공원", description: "총 면적 72만㎡ 규모로 수목원, 호수, 캠핑장 등 다양한 시설을 갖춘 인천 대표 자연공원입니다.", address: "인천 남동구 장수동 산79-1", thumbnail_url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop", tags: ["공원", "자연", "산책"], distance_km: 18, drive_min: 25, operating_hours: "연중무휴 (수목원 09:00~18:00)", admission_fee: "무료 (수목원 1,000원)", phone: "032-466-7282", website: null, published: true, sort_order: 2, created_at: NOW },
  { id: "place_003", name: "영종도 을왕리 해수욕장", category: "travel", area: "영종도", short_desc: "인천공항 옆 서해 대표 해수욕장", description: "인천국제공항에서 15분 거리에 위치한 서해안 해수욕장으로, 넓은 갯벌과 조개잡이 체험이 유명합니다.", address: "인천 중구 을왕동 산 238-1", thumbnail_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop", tags: ["해변", "갯벌", "당일치기"], distance_km: 22, drive_min: 30, operating_hours: "연중무휴", admission_fee: "무료", phone: null, website: null, published: true, sort_order: 3, created_at: NOW },
  { id: "place_004", name: "파주 헤이리 예술마을", category: "culture", area: "파주", short_desc: "예술가들이 모여 만든 복합 문화 공간", description: "380여 명의 예술가, 작가, 건축가들이 함께 만든 문화예술 마을로 갤러리, 카페, 레스토랑이 한데 어우러져 있습니다.", address: "경기 파주시 탄현면 헤이리마을길 82-106", thumbnail_url: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&h=400&fit=crop", tags: ["예술", "갤러리", "카페"], distance_km: 35, drive_min: 45, operating_hours: "갤러리마다 상이 (보통 11:00~18:00)", admission_fee: "갤러리마다 상이", phone: null, website: null, published: true, sort_order: 4, created_at: NOW },
  { id: "place_005", name: "일산 호수공원", category: "kids", area: "일산", short_desc: "국내 최대 인공 호수 공원, 가족 나들이 명소", description: "30만 평 규모의 인공 호수를 중심으로 조성된 공원으로 수변 산책로, 자전거 도로, 잔디 광장이 잘 정비되어 있습니다.", address: "경기 고양시 일산동구 호수로 595", thumbnail_url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop", tags: ["호수", "산책", "가족"], distance_km: 30, drive_min: 40, operating_hours: "연중무휴", admission_fee: "무료", phone: "031-909-9000", website: null, published: true, sort_order: 5, created_at: NOW },
];

const BUILDINGS = [
  {
    id: "b1",
    name: "검단 센트럴 타워",
    address: "인천 서구 당하동 123",
    lat: 37.5925,
    lng: 126.7210,
    floors: 5,
    total_stores: 20,
    parking_info: "지하 1~2층 (3시간 무료)",
    open_time: "매일 10:00 ~ 22:00",
    has_data: true,
    categories: ["마트", "카페", "음식점", "병원/약국"],
    image_url: null,
  },
  {
    id: "b2",
    name: "당하 스퀘어몰",
    address: "인천 서구 당하동 456",
    lat: 37.5900,
    lng: 126.7195,
    floors: 4,
    total_stores: 15,
    parking_info: "지상 1층 (2시간 무료)",
    open_time: "매일 10:00 ~ 21:00",
    has_data: true,
    categories: ["카페", "음식점", "미용", "기타"],
    image_url: null,
  },
];

const STORE_OPENINGS = [
  { id: "ns1", store_id: "s_3f_1", store_name: "더본코리아 (백종원)", category: "음식점", floor: "3F", building_id: "b1", building_name: "검단 센트럴 타워", open_date: "2026-04-14", emoji: "🍽️", open_benefit: { summary: "오픈 기념 전 메뉴 20% 할인 + 음료 1잔 무료", details: ["전 메뉴 20% 할인 (4/30까지)", "1인 1음료 무료 제공", "앱 첫 주문 시 추가 10% 즉시 할인"], validUntil: "2026-04-30" }, active: true },
  { id: "ns2", store_id: "s_2f_4", store_name: "헬스앤뷰티", category: "미용", floor: "2F", building_id: "b1", building_name: "검단 센트럴 타워", open_date: "2026-04-15", emoji: "💄", open_benefit: { summary: "오픈 특가 전품목 30% OFF + 회원 가입 시 5,000원 적립", details: ["오픈 기념 전품목 30% 할인", "신규 회원 가입 시 5,000 포인트 즉시 적립"], validUntil: "2026-04-30" }, active: true },
  { id: "ns3", store_id: "s_4f_3", store_name: "헤어살롱 모이", category: "미용", floor: "4F", building_id: "b1", building_name: "검단 센트럴 타워", open_date: "2026-04-07", emoji: "💇", open_benefit: { summary: "오픈 한 달 커트 10,000원 고정 + 첫 방문 드라이 무료", details: ["커트 10,000원 고정가 (5/7까지)", "첫 방문 드라이 무료"], validUntil: "2026-05-07" }, active: true },
  { id: "ns4", store_id: "s_1f_2", store_name: "스타벅스 검단점", category: "카페", floor: "1F", building_id: "b1", building_name: "검단 센트럴 타워", open_date: "2026-04-03", emoji: "☕", open_benefit: { summary: "리유저블 컵 증정 + 사이즈업 무료", details: ["음료 2잔 이상 구매 시 리유저블 컵 증정", "그란데 이상 주문 시 벤티 사이즈업 무료"], validUntil: "2026-04-30" }, active: true },
];

const COUPONS = [
  { id: "cp1", store_id: "s_b1_3", store_name: "스타벅스 DT", building_id: "b1", building_name: "검단 센트럴 타워", title: "아메리카노 15% 할인", discount: "15%", discount_type: "rate", category: "카페", expiry: "2026-12-31", color: "#00704A", active: true },
  { id: "cp2", store_id: "s_2f_1", store_name: "맘스터치", building_id: "b1", building_name: "검단 센트럴 타워", title: "치킨버거 세트 1,000원 할인", discount: "1,000원", discount_type: "amount", category: "음식점", expiry: "2026-12-31", color: "#E63312", active: true },
  { id: "cp3", store_id: "s_1f_4", store_name: "약국", building_id: "b1", building_name: "검단 센트럴 타워", title: "건강기능식품 10% 할인", discount: "10%", discount_type: "rate", category: "병원/약국", expiry: "2026-12-31", color: "#3182F6", active: true },
  { id: "cp4", store_id: "s_3f_1", store_name: "더본코리아", building_id: "b1", building_name: "검단 센트럴 타워", title: "런치 세트 2인 이상 20% 할인", discount: "20%", discount_type: "rate", category: "음식점", expiry: "2026-12-31", color: "#F59E0B", active: true },
  { id: "cp5", store_id: "s_1f_1", store_name: "올리브영", building_id: "b2", building_name: "당하 스퀘어몰", title: "2만원 이상 구매 시 3,000원 할인", discount: "3,000원", discount_type: "amount", category: "기타", expiry: "2026-12-31", color: "#FF3399", active: true },
  { id: "cp6", store_id: "s_2f_3", store_name: "이디야커피", building_id: "b2", building_name: "당하 스퀘어몰", title: "아이스 음료 500원 할인", discount: "500원", discount_type: "amount", category: "카페", expiry: "2026-12-31", color: "#6366F1", active: true },
];

const SITE_SETTINGS = [
  { key: "app_name", value: "검단신도시", updated_at: NOW },
  { key: "greeting_title", value: "반갑습니다! 🏘️", updated_at: NOW },
  { key: "greeting_subtitle", value: "검단신도시 생활 정보 앱", updated_at: NOW },
];

// ─── 핸들러 ───────────────────────────────────────────────────

export async function POST() {
  const { url, key } = getKey();

  const results: Record<string, string> = {};

  const tables: { name: string; data: unknown[] }[] = [
    { name: "banners",        data: BANNERS },
    { name: "marts",          data: MARTS },
    { name: "pharmacies",     data: PHARMACIES },
    { name: "news_articles",  data: NEWS },
    { name: "places",         data: PLACES },
    { name: "buildings",      data: BUILDINGS },
    { name: "store_openings", data: STORE_OPENINGS },
    { name: "store_coupons",  data: COUPONS },
    { name: "site_settings",  data: SITE_SETTINGS },
  ];

  for (const { name, data } of tables) {
    try {
      await pgrest(url, key, "POST", `${name}?on_conflict=id`, data);
      results[name] = `✅ ${data.length}건 삽입`;
    } catch (e) {
      results[name] = `❌ ${String(e).slice(0, 120)}`;
    }
  }

  const allOk = Object.values(results).every(v => v.startsWith("✅"));
  return NextResponse.json({ success: allOk, results });
}

export async function GET() {
  return NextResponse.json({ message: "POST 요청으로 시드 데이터를 삽입하세요." });
}
