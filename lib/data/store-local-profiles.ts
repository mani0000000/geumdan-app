import type { StoreCategory } from "@/lib/types";

export type LocalProfileTone = "blue" | "green" | "orange" | "purple" | "red" | "teal";

export interface LocalProfileSignal {
  label: string;
  value: string;
  tone?: LocalProfileTone;
}

export interface LocalProfileHighlight {
  title: string;
  value: string;
  description: string;
}

export interface LocalProfileGroup {
  title: string;
  items: string[];
}

export interface LocalProfileTimeTip {
  time: string;
  title: string;
  description: string;
}

export interface LocalStoreProfile {
  sourceLabel?: string;
  sourceUrl?: string;
  checkedAt?: string;
  badge?: string;
  sectionTitle?: string;
  groupsTitle?: string;
  actionLabel?: string;
  headline: string;
  oneLine: string;
  signals: LocalProfileSignal[];
  highlights: LocalProfileHighlight[];
  amenityGroups: LocalProfileGroup[];
  timeTips: LocalProfileTimeTip[];
  parking?: {
    title: string;
    body: string;
    chips?: string[];
  };
  neighborhoodTips: string[];
  reviewSignals: string[];
}

export interface StoreLocalProfileInput {
  id: string;
  name: string;
  category: StoreCategory | string;
  phone?: string | null;
  hours?: string | null;
  description?: string | null;
  buildingName?: string | null;
  buildingAddress?: string | null;
  floorLabel?: string | null;
  parkingInfo?: string | null;
  extraInfo?: Record<string, unknown> | null;
}

export interface GeneratedStoreDetail {
  description: string;
  tags: string[];
  priceRange?: string;
  menu?: { name: string; price: string; tag?: string }[];
  services: string[];
  notice: string;
}

const CHECKED_AT = "2026-07-11";
const DEFAULT_CATEGORY: StoreCategory = "기타";

const CATEGORY_SET = new Set<StoreCategory>([
  "카페",
  "음식점",
  "편의점",
  "병원/약국",
  "미용",
  "학원",
  "마트",
  "헬스/운동",
  "반려동물",
  "세탁",
  "베이커리",
  "부동산",
  "스터디카페",
  "안경원",
  "꽃집",
  "기타",
]);

const KAKAO_SOURCE = "카카오맵 공개 장소 정보";

function normalizeCategory(value: StoreLocalProfileInput["category"]): StoreCategory {
  return CATEGORY_SET.has(value as StoreCategory) ? value as StoreCategory : DEFAULT_CATEGORY;
}

export function kakaoPlaceIdFromStoreId(id?: string | null): string | null {
  return id?.match(/_(\d{6,})$/)?.[1] ?? null;
}

export function kakaoPlaceUrlFromStoreId(id?: string | null): string | undefined {
  const placeId = kakaoPlaceIdFromStoreId(id);
  return placeId ? `https://place.map.kakao.com/${placeId}` : undefined;
}

function looksLikeAddress(value?: string | null): boolean {
  return !!value && /^(인천|서울|경기|[가-힣]+(?:광역시|특별시|도))\s/.test(value.trim());
}

function compactList(items: Array<string | null | undefined>): string[] {
  return Array.from(new Set(items.map(item => item?.trim()).filter((item): item is string => !!item)));
}

function readString(extraInfo: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const value = extraInfo?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readBoolean(extraInfo: Record<string, unknown> | null | undefined, key: string): boolean | undefined {
  const value = extraInfo?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function detectBrand(name: string): string | null {
  const brands = [
    "스타벅스", "투썸플레이스", "공차", "컴포즈커피", "메가MGC커피", "메가커피", "빽다방",
    "우지커피", "더벤티", "탐앤탐스", "파리바게뜨", "뚜레쥬르", "배스킨라빈스", "설빙",
    "이마트24", "GS25", "세븐일레븐", "CU", "한솥도시락", "맘스터치", "프랭크버거",
    "명랑핫도그", "얌샘김밥", "두끼", "애슐리퀸즈", "이차돌", "굽네치킨",
  ];
  return brands.find(brand => name.includes(brand)) ?? null;
}

function detectCafeType(name: string): string {
  if (/키즈룸|방방|블럭|슬라임/.test(name)) return "키즈·체험형 카페";
  if (/보드게임|홈즈앤루팡/.test(name)) return "보드게임·체류형 카페";
  if (/베이글|베이커리|파리바게뜨|뚜레쥬르|한상민과자점|크라상|사과당|모찌|디저트|쿠키|오븐/.test(name)) return "베이커리·디저트";
  if (/설빙|배스킨|빙수|아이스/.test(name)) return "디저트·아이스크림";
  if (/주스|생과일/.test(name)) return "주스·음료";
  return "커피·디저트";
}

function detectFoodType(name: string): string {
  if (/김밥|분식|떡볶이|핫도그|밥버거/.test(name)) return "분식·간편식";
  if (/순대|국밥|해장국|감자탕|곰탕|탕/.test(name)) return "국밥·탕류";
  if (/스시|초밥|참치|회|수산|숙성회|도시어부/.test(name)) return "일식·해산물";
  if (/마라|중식|반점|짜장|차이/.test(name)) return "중식·마라";
  if (/고기|돼지|갈비|구이|냉삼|정육|회관|이차돌|애월도/.test(name)) return "고기·회식";
  if (/치킨|피자|버거|맘스터치|프랭크버거|뉴욕버거/.test(name)) return "배달·패스트푸드";
  if (/맥주|포차|부산집|대동집/.test(name)) return "주점·저녁 모임";
  if (/뷔페|애슐리/.test(name)) return "뷔페·가족 외식";
  return "동네 식사";
}

function detectMedicalType(name: string): string {
  if (/약국/.test(name)) return "약국";
  if (/동물/.test(name)) return "동물병원";
  if (/소아|청소년/.test(name)) return "소아청소년과";
  if (/치과/.test(name)) return "치과";
  if (/이비인후/.test(name)) return "이비인후과";
  if (/정형외과/.test(name)) return "정형외과";
  if (/내과/.test(name)) return "내과";
  if (/안과|눈/.test(name)) return "안과";
  if (/산부인과/.test(name)) return "산부인과";
  if (/피부|의원|닥터/.test(name)) return "의원";
  return "의료·약국";
}

function detectAcademyType(name: string): string {
  if (/수학/.test(name)) return "수학";
  if (/영어|어학|토스/.test(name)) return "영어·어학";
  if (/국어|논술|독서|책나무/.test(name)) return "독서·국어";
  if (/음악|피아노|바이올린/.test(name)) return "음악";
  if (/미술|아트/.test(name)) return "미술";
  if (/발레|댄스|짐/.test(name)) return "예체능";
  if (/눈높이|러닝센터|학원/.test(name)) return "종합학습";
  return "교육";
}

function detectBeautyType(name: string): string {
  if (/헤어|살롱|미용/.test(name)) return "헤어";
  if (/네일/.test(name)) return "네일";
  if (/뷰티|피부|에스테틱/.test(name)) return "뷰티";
  return "미용";
}

function primaryZone(input: StoreLocalProfileInput): string {
  if (input.buildingName?.trim()) return input.buildingName.trim();
  if (looksLikeAddress(input.description)) return input.description!.trim();
  if (input.buildingAddress?.trim()) return input.buildingAddress.trim();
  return "검단신도시 생활권";
}

function sourceUrl(input: StoreLocalProfileInput): string | undefined {
  return readString(input.extraInfo, "source_url")
    ?? readString(input.extraInfo, "sns_kakao")
    ?? kakaoPlaceUrlFromStoreId(input.id);
}

function baseSignals(input: StoreLocalProfileInput, category: StoreCategory, subtype: string): LocalProfileSignal[] {
  return compactList([
    input.hours ? `영업 ${input.hours}` : null,
    input.phone ? `전화 ${input.phone}` : null,
    input.floorLabel ? `${input.floorLabel} 위치` : null,
    subtype,
  ]).slice(0, 4).map((value, index) => ({
    label: ["시간", "연락", "위치", "유형"][index] ?? "정보",
    value,
    tone: (["blue", "green", "orange", "purple"] as LocalProfileTone[])[index],
  }));
}

function categoryBadge(category: StoreCategory): string {
  switch (category) {
    case "카페":
      return "신도시 카페 브리핑";
    case "음식점":
      return "신도시 식사 브리핑";
    case "병원/약국":
      return "의료·약국 이용 브리핑";
    case "학원":
      return "교육 생활권 브리핑";
    case "미용":
      return "뷰티·예약 브리핑";
    case "편의점":
      return "생활편의 브리핑";
    default:
      return "신도시 매장 브리핑";
  }
}

function categorySectionTitle(category: StoreCategory, name: string): string {
  switch (category) {
    case "카페":
      return `${name} 활용 포인트`;
    case "음식점":
      return "식사·모임 활용 포인트";
    case "병원/약국":
      return "방문 전 확인 포인트";
    case "학원":
      return "상담·등하원 체크 포인트";
    case "미용":
      return "예약·시술 체크 포인트";
    case "편의점":
      return "생활 편의 체크 포인트";
    default:
      return "이용 포인트";
  }
}

function categoryGroupsTitle(category: StoreCategory): string {
  switch (category) {
    case "카페":
      return "카페 이용 전 체크 정보";
    case "음식점":
      return "식사 전 체크 정보";
    case "병원/약국":
      return "방문 전 체크 정보";
    case "학원":
      return "상담 전 체크 정보";
    case "미용":
      return "예약 전 체크 정보";
    case "편의점":
      return "편의 서비스 체크 정보";
    default:
      return "매장 이용 체크 정보";
  }
}

function categoryTimeTips(category: StoreCategory, subtype: string): LocalProfileTimeTip[] {
  switch (category) {
    case "카페":
      return [
        { time: "오전", title: "등원·출근 전후", description: "커피 픽업, 짧은 업무 정리, 법원·역세권 이동 전 대기에 적합한 시간대입니다." },
        { time: "오후", title: "하교·하원 이후", description: "아이 동반 간식, 보호자 대기, 디저트 픽업 수요를 고려해 확인하세요." },
        { time: "저녁", title: "약속·픽업", description: "케이크·디저트 재고와 라스트오더는 당일 플레이스 또는 전화 확인을 권장합니다." },
      ];
    case "음식점":
      return [
        { time: "11:30~13:30", title: "점심 피크", description: `${subtype} 수요가 몰릴 수 있어 포장·웨이팅 여부를 먼저 확인하세요.` },
        { time: "17:30~20:30", title: "저녁·가족 외식", description: "검단신도시 거주민의 퇴근 후 식사와 가족 방문 수요가 높은 시간대입니다." },
        { time: "주말", title: "동네 모임", description: "예약 가능 여부, 주차 지원, 유아 동반 가능 여부를 함께 확인하면 좋습니다." },
      ];
    case "병원/약국":
      return [
        { time: "오전", title: "접수 시작 직후", description: "대기 시간을 줄이려면 진료 시작 시간과 접수 마감 시간을 먼저 확인하세요." },
        { time: "점심 전후", title: "브레이크 타임 확인", description: "의원·약국별 점심시간이 다를 수 있어 방문 전 전화 확인이 필요합니다." },
        { time: "저녁", title: "퇴근 후 방문", description: "야간·주말 운영 여부는 당일 변동 가능성이 있어 플레이스 확인을 권장합니다." },
      ];
    case "학원":
      return [
        { time: "하교 직후", title: "등원 동선", description: "학교·아파트에서 이동하기 쉬운지, 엘리베이터·대기 공간을 확인하세요." },
        { time: "상담 시간", title: "레벨·커리큘럼 확인", description: "학년·레벨·보강 방식·수업 정원을 상담 때 함께 확인하는 구성이 좋습니다." },
        { time: "저녁", title: "귀가 안전", description: "늦은 수업 후 보호자 픽업 위치와 건물 출입 동선을 확인하세요." },
      ];
    default:
      return [
        { time: "방문 전", title: "운영 정보 확인", description: "영업시간, 예약, 주차 조건은 매장 상황에 따라 바뀔 수 있어 방문 전 확인이 필요합니다." },
        { time: "이용 중", title: "건물 동선", description: "층 위치, 엘리베이터, 화장실, 주차 정산 정보를 함께 확인하세요." },
      ];
  }
}

function categoryHighlights(input: StoreLocalProfileInput, category: StoreCategory, subtype: string): LocalProfileHighlight[] {
  const zone = primaryZone(input);
  switch (category) {
    case "카페":
      return [
        { title: subtype, value: "커피·디저트 동선", description: `${zone} 기준으로 약속 전 대기, 픽업, 아이 동반 간식 수요에 맞춰 확인할 수 있습니다.` },
        { title: "좌석·체류", value: readString(input.extraInfo, "seats") ?? "좌석 확인", description: "체류형 방문이면 좌석 규모, 콘센트, 소음도, 단체 이용 가능 여부를 확인하는 것이 좋습니다." },
        { title: "픽업·배달", value: readBoolean(input.extraInfo, "delivery") ? "배달 가능" : "포장 확인", description: "케이크·디저트·음료 픽업은 재고와 라스트오더가 변동될 수 있습니다." },
        { title: "차량 방문", value: input.parkingInfo ?? "주차 확인", description: "검단신도시 상가 방문은 주차 정산 조건이 중요하므로 건물 주차 정보를 함께 제공합니다." },
      ];
    case "음식점":
      return [
        { title: subtype, value: "대표 메뉴 확인", description: `${zone} 생활권의 점심·저녁 식사 후보로 볼 수 있도록 메뉴, 포장, 예약 체크 포인트를 정리했습니다.` },
        { title: "가족·모임", value: "좌석/웨이팅 확인", description: "아이 동반, 단체 방문, 회식 수요가 있으면 좌석 구조와 예약 가능 여부를 먼저 확인하세요." },
        { title: "포장·배달", value: readBoolean(input.extraInfo, "delivery") ? "배달 가능" : "매장 확인", description: "신도시 아파트 생활권은 포장·배달 수요가 높아 주문 가능 여부를 함께 노출합니다." },
        { title: "차량 방문", value: input.parkingInfo ?? "주차 확인", description: "저녁 피크에는 주차 여유가 달라질 수 있어 건물 주차 조건을 확인하세요." },
      ];
    case "병원/약국":
      return [
        { title: subtype, value: "진료·조제 확인", description: `${zone} 인근 거주민이 급하게 찾을 때 전화, 접수, 대기, 주차 정보를 한 화면에서 확인하도록 구성했습니다.` },
        { title: "접수·예약", value: readString(input.extraInfo, "reservation_info") ?? "전화 확인", description: "진료과목, 접수 마감, 예약 방식은 당일 변동 가능성이 있어 전화 확인이 필요합니다." },
        { title: "가족 이용", value: "아이 동반 체크", description: "소아·가족 방문 시 대기 공간, 엘리베이터, 약국 연계 동선을 함께 확인하세요." },
        { title: "차량 방문", value: input.parkingInfo ?? "주차 확인", description: "의료 방문은 체류 시간이 길어질 수 있어 무료 주차 시간과 정산 조건을 확인하세요." },
      ];
    case "학원":
      return [
        { title: subtype, value: readString(input.extraInfo, "age_range") ?? "대상 확인", description: `${zone} 기준 등하원 동선과 학년·레벨·상담 정보를 우선 확인할 수 있습니다.` },
        { title: "커리큘럼", value: readString(input.extraInfo, "courses") ?? "과정 확인", description: "수업 방식, 숙제 관리, 보강, 테스트 주기를 상담 시 확인하도록 안내합니다." },
        { title: "등하원", value: "픽업 동선", description: "학원 밀집 상가에서는 엘리베이터와 보호자 대기 위치가 중요합니다." },
        { title: "체험·상담", value: readBoolean(input.extraInfo, "trial_available") ? "체험 가능" : "상담 확인", description: "신규 등록 전 체험 수업, 레벨테스트, 상담 가능 시간을 확인하세요." },
      ];
    case "미용":
      return [
        { title: subtype, value: "예약 우선", description: `${zone} 생활권에서 퇴근 후·주말 방문 전 예약 가능 시간과 시술 소요 시간을 확인하세요.` },
        { title: "시술", value: readString(input.extraInfo, "services") ?? "서비스 확인", description: "커트, 컬러, 펌, 네일, 피부관리 등 세부 서비스와 가격대를 확인할 수 있게 구성했습니다." },
        { title: "주말 수요", value: "대기 확인", description: "주말과 저녁 시간대는 예약이 몰릴 수 있어 네이버/카카오 플레이스 또는 전화 확인을 권장합니다." },
        { title: "차량 방문", value: input.parkingInfo ?? "주차 확인", description: "시술 시간이 길어질 수 있으므로 무료 주차 시간과 정산 조건을 확인하세요." },
      ];
    case "편의점":
      return [
        { title: detectBrand(input.name) ?? "편의점", value: readBoolean(input.extraInfo, "is_24h") ? "24시간 가능" : "운영 확인", description: `${zone}에서 택배, 간편식, 생활용품, 야간 구매 수요를 확인할 수 있습니다.` },
        { title: "생활 서비스", value: "택배·결제 확인", description: "택배 접수, ATM, 공공요금, 상품권 등 부가 서비스는 지점별 차이가 있습니다." },
        { title: "간편식", value: "도시락·음료", description: "출근 전후, 학원 귀가, 야식 동선에서 이용할 수 있는 간편식 수요를 반영했습니다." },
      ];
    default:
      return [
        { title: subtype, value: "이용 정보 확인", description: `${zone} 기준으로 전화, 위치, 운영시간, 주차 정보를 한 화면에서 확인하도록 구성했습니다.` },
        { title: "방문 전 체크", value: "운영·예약 확인", description: "상세 서비스와 가격은 매장 상황에 따라 바뀔 수 있어 방문 전 확인을 권장합니다." },
      ];
  }
}

function categoryAmenityGroups(input: StoreLocalProfileInput, category: StoreCategory, subtype: string): LocalProfileGroup[] {
  const common = compactList([
    input.phone ? "전화 연결 가능" : null,
    input.hours ? "영업시간 확인됨" : null,
    input.floorLabel ? `${input.floorLabel} 위치` : undefined,
    input.parkingInfo ? "주차 정산 정보 있음" : null,
  ]);

  switch (category) {
    case "카페":
      return [
        { title: "공간·체류", items: compactList([readString(input.extraInfo, "seats") ?? "좌석 확인", readBoolean(input.extraInfo, "wifi") ? "무선 인터넷" : "와이파이 확인", subtype]) },
        { title: "주문·픽업", items: compactList([readString(input.extraInfo, "menu_highlights") ?? "대표 메뉴 확인", readBoolean(input.extraInfo, "delivery") ? "배달 가능" : "포장 확인", "디저트 재고 확인"]) },
        { title: "기본 정보", items: common },
      ];
    case "음식점":
      return [
        { title: "식사 유형", items: compactList([subtype, readString(input.extraInfo, "menu_highlights") ?? "대표 메뉴 확인", readString(input.extraInfo, "price_range") ?? "가격대 확인"]) },
        { title: "이용 방식", items: compactList([readBoolean(input.extraInfo, "delivery") ? "배달 가능" : "배달 확인", readBoolean(input.extraInfo, "reservation") ? "예약 가능" : "예약 확인", "포장 확인"]) },
        { title: "기본 정보", items: common },
      ];
    case "병원/약국":
      return [
        { title: "진료·취급", items: compactList([subtype, readString(input.extraInfo, "specialties") ?? "진료과목 확인", readString(input.extraInfo, "reservation_info") ?? "접수 방식 확인"]) },
        { title: "방문 편의", items: compactList(["대기 시간 확인", "접수 마감 확인", ...common]) },
      ];
    case "학원":
      return [
        { title: "교육 정보", items: compactList([subtype, readString(input.extraInfo, "courses") ?? "강좌 확인", readString(input.extraInfo, "age_range") ?? "대상 학년 확인"]) },
        { title: "상담 정보", items: compactList([readString(input.extraInfo, "tuition") ?? "수강료 확인", "레벨 테스트 확인", "보강 방식 확인"]) },
        { title: "기본 정보", items: common },
      ];
    case "미용":
      return [
        { title: "서비스", items: compactList([subtype, readString(input.extraInfo, "services") ?? "시술 확인", readString(input.extraInfo, "price_range") ?? "가격대 확인"]) },
        { title: "예약", items: compactList([readString(input.extraInfo, "reservation_info") ?? "예약 방식 확인", "시술 소요시간 확인", ...common]) },
      ];
    default:
      return [
        { title: "매장 정보", items: common },
        { title: "방문 체크", items: compactList([subtype, "운영시간 확인", "가격·서비스 확인", "주차 조건 확인"]) },
      ];
  }
}

function subtypeFor(input: StoreLocalProfileInput, category: StoreCategory): string {
  const explicit = readString(input.extraInfo, "brand") ?? detectBrand(input.name);
  if (explicit) return explicit;
  switch (category) {
    case "카페":
    case "베이커리":
    case "스터디카페":
      return detectCafeType(input.name);
    case "음식점":
      return detectFoodType(input.name);
    case "병원/약국":
    case "반려동물":
      return detectMedicalType(input.name);
    case "학원":
      return detectAcademyType(input.name);
    case "미용":
      return detectBeautyType(input.name);
    case "편의점":
      return detectBrand(input.name) ?? "편의점";
    default:
      return category;
  }
}

function headlineFor(input: StoreLocalProfileInput, category: StoreCategory, subtype: string): string {
  const zone = primaryZone(input);
  switch (category) {
    case "카페":
      return `${zone}에서 ${subtype} 수요를 커버하는 ${input.name}`;
    case "음식점":
      return `${zone}의 ${subtype} 후보, ${input.name}`;
    case "병원/약국":
      return `${zone}에서 빠르게 확인하는 ${subtype} 정보`;
    case "학원":
      return `${zone} 등하원 동선에서 보는 ${subtype} 학원 정보`;
    case "미용":
      return `${zone} 생활권의 ${subtype} 예약 체크`;
    case "편의점":
      return `${zone} 생활 편의 동선의 ${input.name}`;
    default:
      return `${zone}에서 확인하는 ${input.name}`;
  }
}

function oneLineFor(input: StoreLocalProfileInput, category: StoreCategory, subtype: string): string {
  const zone = primaryZone(input);
  const floor = input.floorLabel ? ` · ${input.floorLabel}` : "";
  const source = sourceUrl(input) ? "공개 장소 정보와 등록 데이터를 함께 확인했습니다." : "등록된 상가 데이터를 기준으로 구성했습니다.";
  switch (category) {
    case "카페":
      return `${zone}${floor}의 ${subtype} 매장입니다. 좌석, 픽업, 주차, 영업시간 체크 포인트를 함께 제공합니다.`;
    case "음식점":
      return `${zone}${floor}의 ${subtype} 매장입니다. 점심·저녁·포장·주차 확인 동선을 한 번에 볼 수 있게 정리했습니다.`;
    case "병원/약국":
      return `${zone}${floor}의 ${subtype}입니다. 전화, 접수, 대기, 주차, 운영시간 확인을 우선 배치했습니다.`;
    case "학원":
      return `${zone}${floor}의 ${subtype} 교육 매장입니다. 상담, 대상 학년, 등하원 동선, 보호자 체크 포인트를 제공합니다.`;
    case "미용":
      return `${zone}${floor}의 ${subtype} 매장입니다. 예약, 시술, 가격대, 주차 확인 포인트를 정리했습니다.`;
    default:
      return `${zone}${floor}의 ${input.name}입니다. ${source}`;
  }
}

export function buildGeneratedLocalProfile(input: StoreLocalProfileInput): LocalStoreProfile {
  const category = normalizeCategory(input.category);
  const subtype = subtypeFor(input, category);
  const url = sourceUrl(input);

  return {
    sourceLabel: url ? KAKAO_SOURCE : "등록 상가 데이터",
    sourceUrl: url,
    checkedAt: CHECKED_AT,
    badge: categoryBadge(category),
    sectionTitle: categorySectionTitle(category, input.name),
    groupsTitle: categoryGroupsTitle(category),
    actionLabel: url ? "최신 플레이스" : "상가 지도",
    headline: headlineFor(input, category, subtype),
    oneLine: oneLineFor(input, category, subtype),
    signals: baseSignals(input, category, subtype),
    highlights: categoryHighlights(input, category, subtype),
    amenityGroups: categoryAmenityGroups(input, category, subtype),
    timeTips: categoryTimeTips(category, subtype),
    parking: {
      title: "주차·건물 동선",
      body: input.parkingInfo
        ? `${input.parkingInfo} 방문 전 무료 시간, 정산 방식, 만차 여부를 함께 확인하세요.`
        : "상가별 주차 지원 조건이 다를 수 있습니다. 차량 방문 전 건물 주차장, 무료 시간, 정산 조건을 확인하세요.",
      chips: compactList([input.parkingInfo ? "주차 정보 있음" : "주차 확인", input.floorLabel ? `${input.floorLabel} 위치` : undefined, "방문 전 확인"]),
    },
    neighborhoodTips: compactList([
      `${primaryZone(input)} 기준으로 가까운 상가·역세권·아파트 생활 동선을 함께 고려했습니다.`,
      "검단신도시는 신규 상권 변동이 잦아 운영시간, 가격, 재고, 예약 가능 여부는 당일 확인을 권장합니다.",
      url ? "원본 장소 페이지에서 최신 사진, 리뷰, 길찾기 정보를 추가로 확인할 수 있습니다." : undefined,
    ]),
    reviewSignals: compactList([
      "카카오맵 장소 ID 기반 매장은 원본 플레이스 링크를 우선 제공합니다.",
      "리뷰·메뉴·가격 정보는 매장별 공개 범위가 달라 앱에서는 확인 포인트 중심으로 정리합니다.",
      input.phone ? "전화번호가 등록되어 있어 방문 전 확인 동선을 제공합니다." : "전화번호가 없어 원본 장소 정보 확인을 우선 안내합니다.",
    ]),
  };
}

export function buildGeneratedStoreSummary(input: StoreLocalProfileInput): string {
  const current = input.description?.trim();
  if (current && !looksLikeAddress(current)) return current;
  return buildGeneratedLocalProfile(input).oneLine;
}

export function buildGeneratedStoreDetail(input: StoreLocalProfileInput): GeneratedStoreDetail {
  const profile = buildGeneratedLocalProfile(input);
  const category = normalizeCategory(input.category);
  const subtype = subtypeFor(input, category);
  const brand = detectBrand(input.name);
  const tags = compactList([
    "검단신도시",
    category,
    subtype,
    brand,
    input.buildingName ?? undefined,
  ]).slice(0, 8);

  const baseServices = profile.amenityGroups.flatMap(group => group.items).slice(0, 8);
  const menu = category === "카페"
    ? [
        { name: subtype.includes("베이커리") ? "베이커리·디저트" : "커피·음료", price: "매장 확인", tag: "대표" },
        { name: "포장·픽업", price: "매장 확인", tag: "확인" },
      ]
    : category === "음식점"
      ? [
          { name: subtype, price: "매장 확인", tag: "대표" },
          { name: "포장·예약", price: "매장 확인", tag: "확인" },
        ]
      : undefined;

  return {
    description: `${profile.oneLine} ${profile.sourceUrl ? "원본 장소 정보와 등록된 상가 데이터를 함께 사용합니다." : "등록된 상가 데이터를 기준으로 구성했습니다."}`,
    tags,
    priceRange: readString(input.extraInfo, "price_range") ?? (category === "학원" ? readString(input.extraInfo, "tuition") : undefined) ?? "매장 확인",
    menu,
    services: compactList(baseServices).slice(0, 7),
    notice: "영업시간, 가격, 메뉴, 예약, 주차 조건은 매장 사정에 따라 달라질 수 있습니다. 방문 전 전화 또는 원본 플레이스 확인을 권장합니다.",
  };
}
