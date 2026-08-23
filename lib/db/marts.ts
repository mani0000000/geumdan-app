import { supabase } from "@/lib/supabase";
import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

export type MartClosingPattern = "2nd4th" | "1st3rd" | "open" | "closed";
export type MartType = "대형마트" | "중형마트" | "동네마트" | "슈퍼마트";

export interface Mart {
  id: string;
  name: string;
  brand: string;
  type: MartType;
  address: string;
  phone: string | null;
  distance: string | null;
  weekday_hours: string | null;
  saturday_hours: string | null;
  sunday_hours: string | null;
  closing_pattern: MartClosingPattern;
  notice: string | null;
  logo_url: string | null;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
  sort_order: number;
  active: boolean;
}

type MartSeed = Pick<Mart, "id" | "name" | "brand" | "type" | "address" | "closing_pattern" | "sort_order" | "active"> &
  Partial<Omit<Mart, "id" | "name" | "brand" | "type" | "address" | "closing_pattern" | "sort_order" | "active">>;

export const DEFAULT_GEUMDAN_MARTS: MartSeed[] = [
  {
    id: "mart_001",
    name: "이마트 검단점",
    brand: "이마트",
    type: "대형마트",
    address: "인천 서구 서곶로 754 (당하동)",
    phone: "032-440-1234",
    weekday_hours: "10:00 ~ 23:00",
    saturday_hours: "10:00 ~ 23:00",
    sunday_hours: "10:00 ~ 23:00",
    closing_pattern: "2nd4th",
    notice: "공식 매장 기준 · 문화센터/전기차 충전/일렉트로마트",
    lat: 37.5855,
    lng: 126.6767,
    sort_order: 1,
    active: true,
  },
  {
    id: "mart_002",
    name: "롯데마트 검단점",
    brand: "롯데마트",
    type: "대형마트",
    address: "인천 서구 원당대로 581 (마전동)",
    phone: "032-560-2500",
    weekday_hours: "10:00 ~ 23:00",
    saturday_hours: "10:00 ~ 23:00",
    sunday_hours: "10:00 ~ 23:00",
    closing_pattern: "2nd4th",
    notice: "마전역권 대형마트 · 주차 가능",
    lat: 37.5945,
    lng: 126.6645,
    sort_order: 2,
    active: true,
  },
  {
    id: "mart_005",
    name: "GS더프레시 검단신도시점",
    brand: "GS더프레시",
    type: "슈퍼마트",
    address: "인천 서구 발산로 6, 101~107호 (원당동, 검단아인시티주차타워)",
    phone: "032-569-0319",
    weekday_hours: "10:00 ~ 23:00",
    saturday_hours: "10:00 ~ 23:00",
    sunday_hours: "10:00 ~ 23:00",
    closing_pattern: "2nd4th",
    notice: "검단신도시 생활권 슈퍼마켓 · 전단/행사 확인 권장",
    lat: 37.5926,
    lng: 126.711,
    sort_order: 3,
    active: true,
  },
  {
    id: "mart_011",
    name: "GS더프레시 검단대방점",
    brand: "GS더프레시",
    type: "슈퍼마트",
    address: "인천 서구 이음2로 30 (대방디에트르 더 펠리체)",
    phone: "032-561-5251",
    weekday_hours: "10:00 ~ 23:00",
    saturday_hours: "10:00 ~ 23:00",
    sunday_hours: "10:00 ~ 23:00",
    closing_pattern: "2nd4th",
    notice: "검단신도시 남측 생활권 · 단지 상권형 슈퍼",
    lat: 37.587,
    lng: 126.7039,
    sort_order: 4,
    active: true,
  },
  {
    id: "mart_012",
    name: "GS더프레시 검단법원점",
    brand: "GS더프레시",
    type: "슈퍼마트",
    address: "인천 서구 서로3로 104 1층",
    phone: "032-568-5488",
    weekday_hours: "10:00 ~ 23:00",
    saturday_hours: "10:00 ~ 23:00",
    sunday_hours: "10:00 ~ 23:00",
    closing_pattern: "2nd4th",
    notice: "법조타운·아라역 생활권 슈퍼",
    lat: 37.596,
    lng: 126.712,
    sort_order: 5,
    active: true,
  },
  {
    id: "mart_006",
    name: "GS더프레시 검단푸르지오점",
    brand: "GS더프레시",
    type: "슈퍼마트",
    address: "인천 서구 이음6로 33 (검단신도시푸르지오더베뉴)",
    phone: "032-562-7033",
    weekday_hours: "10:00 ~ 23:00",
    saturday_hours: "10:00 ~ 23:00",
    sunday_hours: "10:00 ~ 23:00",
    closing_pattern: "2nd4th",
    notice: "푸르지오더베뉴 상가 생활권 슈퍼",
    lat: 37.595,
    lng: 126.7,
    sort_order: 6,
    active: true,
  },
  {
    id: "mart_014",
    name: "GS더프레시 검단더힐점",
    brand: "GS더프레시",
    type: "슈퍼마트",
    address: "인천 서구 서로3로 255",
    phone: "032-569-2592",
    weekday_hours: "10:00 ~ 23:00",
    saturday_hours: "10:00 ~ 23:00",
    sunday_hours: "10:00 ~ 23:00",
    closing_pattern: "2nd4th",
    notice: "대방디에트르더힐 생활권 슈퍼",
    lat: 37.601,
    lng: 126.708,
    sort_order: 7,
    active: true,
  },
  {
    id: "mart_015",
    name: "GS더프레시 신검단중앙역점",
    brand: "GS더프레시",
    type: "슈퍼마트",
    address: "인천 서구 금정로 12, 상가동 138호",
    phone: "032-567-7255",
    weekday_hours: "10:00 ~ 23:00",
    saturday_hours: "10:00 ~ 23:00",
    sunday_hours: "10:00 ~ 23:00",
    closing_pattern: "2nd4th",
    notice: "신검단중앙역 풍경채어바니티 상권",
    lat: 37.608,
    lng: 126.695,
    sort_order: 8,
    active: true,
  },
  {
    id: "mart_007",
    name: "노브랜드 인천원당점",
    brand: "노브랜드",
    type: "슈퍼마트",
    address: "인천 서구 원당대로 865 (원당동, 대산프라자 1층)",
    phone: "02-380-5111",
    weekday_hours: "10:00 ~ 22:00",
    saturday_hours: "10:00 ~ 22:00",
    sunday_hours: "10:00 ~ 22:00",
    closing_pattern: "2nd4th",
    notice: "공식 매장 기준 · 현금 없는 매장",
    lat: 37.595,
    lng: 126.718,
    sort_order: 9,
    active: true,
  },
  {
    id: "mart_008",
    name: "노브랜드 인천당하점",
    brand: "노브랜드",
    type: "슈퍼마트",
    address: "인천 서구 서곶로 788 (당하동, 홀리랜드 1층)",
    phone: "02-380-5111",
    weekday_hours: "10:00 ~ 22:00",
    saturday_hours: "10:00 ~ 22:00",
    sunday_hours: "10:00 ~ 22:00",
    closing_pattern: "2nd4th",
    notice: "당하동 생활권 노브랜드",
    lat: 37.5876,
    lng: 126.677,
    sort_order: 10,
    active: true,
  },
  {
    id: "mart_009",
    name: "노브랜드 인천마전점",
    brand: "노브랜드",
    type: "슈퍼마트",
    address: "인천 서구 완정로64번길 4 (마전동, 영남탑스빌 상가)",
    phone: "02-380-5111",
    weekday_hours: "10:00 ~ 22:00",
    saturday_hours: "10:00 ~ 22:00",
    sunday_hours: "10:00 ~ 22:00",
    closing_pattern: "2nd4th",
    notice: "마전동 생활권 노브랜드",
    lat: 37.5985,
    lng: 126.6655,
    sort_order: 11,
    active: true,
  },
  {
    id: "mart_013",
    name: "롯데프레시 검단신도시점",
    brand: "롯데프레시",
    type: "슈퍼마트",
    address: "인천 서구 서로3로 198 지하 1층",
    phone: "032-721-5671",
    weekday_hours: "10:00 ~ 23:00",
    saturday_hours: "10:00 ~ 23:00",
    sunday_hours: "10:00 ~ 23:00",
    closing_pattern: "2nd4th",
    notice: "검단신도시 중심 상권 식자재·슈퍼",
    lat: 37.599,
    lng: 126.714,
    sort_order: 12,
    active: true,
  },
  {
    id: "mart_010",
    name: "검단농협 하나로마트",
    brand: "농협 하나로마트",
    type: "중형마트",
    address: "인천 서구 검단로 497 (검단농협 1층)",
    phone: "032-565-0027",
    weekday_hours: "09:00 ~ 20:30",
    saturday_hours: "09:00 ~ 20:30",
    sunday_hours: "09:00 ~ 19:00",
    closing_pattern: "open",
    notice: "농협 하나로마트 · 일요일 운영",
    lat: 37.602,
    lng: 126.658,
    sort_order: 13,
    active: true,
  },
  {
    id: "mart_016",
    name: "더제이마켓 검단점",
    brand: "더제이마켓",
    type: "중형마트",
    address: "인천 서구 이음대로 435 (당하동)",
    phone: null,
    weekday_hours: "10:00 ~ 22:00",
    saturday_hours: "10:00 ~ 22:00",
    sunday_hours: "10:00 ~ 22:00",
    closing_pattern: "open",
    notice: "검단신도시 대형 식자재형 마켓 · 운영시간 확인 권장",
    lat: 37.591,
    lng: 126.704,
    sort_order: 14,
    active: true,
  },
];

function getDefaultMarts(): Mart[] {
  return DEFAULT_GEUMDAN_MARTS.map((mart) => ({
    phone: null,
    distance: null,
    weekday_hours: null,
    saturday_hours: null,
    sunday_hours: null,
    notice: null,
    logo_url: null,
    image_url: null,
    lat: null,
    lng: null,
    ...mart,
  })) as Mart[];
}

export async function fetchMarts(): Promise<Mart[]> {
  try {
    const { data, error } = await supabase
      .from("marts")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .order("name");

    // 인증 정책 누락이나 일시적인 네트워크 장애가 있어도 홈 위젯 자체가
    // 사라지지 않도록 검증된 기본 마트 목록을 즉시 제공합니다.
    if (error || !data?.length) return getDefaultMarts();
    return data as Mart[];
  } catch {
    return getDefaultMarts();
  }
}

// ── Admin ──────────────────────────────────────────────────────

export async function adminFetchMarts(): Promise<Mart[]> {
  return adminApiGet<Mart>("marts", { order: "sort_order,name" });
}

export async function adminCreateMart(m: Omit<Mart, "id">): Promise<string> {
  const id = "mart_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  await adminApiPost("marts", "POST", [{ ...m, id }]);
  return id;
}

export async function adminUpdateMart(id: string, m: Partial<Omit<Mart, "id">>): Promise<void> {
  await adminApiPost("marts", "PATCH", m, { eq: `id=eq.${id}` });
}

export async function adminDeleteMart(id: string): Promise<void> {
  await adminApiPost("marts", "DELETE", null, { eq: `id=eq.${id}` });
}

export async function adminSeedDefaultMarts(): Promise<void> {
  await adminApiPost("marts", "POST", DEFAULT_GEUMDAN_MARTS, { onConflict: "id" });
}
