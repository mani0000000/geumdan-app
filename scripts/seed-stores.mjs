#!/usr/bin/env node
/**
 * seed-stores.mjs
 *
 * 상가 DB 시딩 스크립트
 * store_details, store_openings, store_coupons 테이블에 데이터를 upsert합니다.
 *
 * 사용법:
 *   SUPABASE_SERVICE_KEY=<key> node scripts/seed-stores.mjs
 *
 * 또는 .env.local에 SUPABASE_SERVICE_KEY 설정 후:
 *   node scripts/seed-stores.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://plwpfnbhyzblgvliiole.supabase.co";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY ??
  "";

if (!SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── store_details ────────────────────────────────────────────
const storeDetails = [
  {
    store_id: "s_b1_1",
    description: "신선 식품부터 생활용품까지 한 번에 해결하는 홈플러스 소형 매장. 마트 대비 빠른 쇼핑이 가능합니다.",
    tags: ["🥩 신선식품 매일 입고", "🧴 생활용품 풀라인업", "🏷️ 홈플러스 앱 할인 적용", "♿ 배리어프리 매장"],
    price_range: "일반 마트 수준",
    menu: [],
    services: [],
    notice: "매주 수·토 신선 세일 진행",
  },
  {
    store_id: "s_b1_2",
    description: "첨단 세탁 장비를 갖춘 전문 세탁소. 드라이클리닝, 이불 세탁, 수선까지 원스톱으로 제공합니다.",
    tags: ["👔 드라이클리닝 전문", "🛏️ 이불·침구류 세탁", "✂️ 간단 수선 서비스", "📦 당일 세탁 가능 (오전 접수)"],
    price_range: null,
    menu: [],
    services: ["셔츠·정장 드라이클리닝", "이불·패딩 세탁", "가죽·스웨이드 특수 세탁", "지퍼·단추 수선"],
    notice: "당일 세탁은 오전 11시까지 접수",
  },
  {
    store_id: "s_b1_3",
    description: "검단신도시 유일 스타벅스 드라이브스루 매장. 차 안에서 편하게 주문·수령 가능합니다.",
    tags: ["🚗 드라이브스루 전용 매장", "⭐ 스타벅스 리워드 포인트", "📱 사이렌 오더 가능", "🧊 시즌 한정 음료 운영"],
    price_range: "아메리카노 4,500원~",
    menu: [
      { name: "아이스 아메리카노", price: "4,500원", tag: "인기 1위" },
      { name: "카페 라떼", price: "5,500원" },
      { name: "돌체 콜드브루", price: "6,500원", tag: "시즌 추천" },
      { name: "자바 칩 프라푸치노", price: "7,200원" },
    ],
    services: [],
    notice: null,
  },
  {
    store_id: "s_1f_1",
    description: "뷰티·헬스 전문 편집숍. 스킨케어부터 헬스용품까지 3,000여 종을 한자리에서 만날 수 있습니다.",
    tags: ["💄 뷰티·헬스 3,000종 이상", "🎁 멤버십 포인트 적립", "🆓 샘플 증정 이벤트 상시", "📦 온라인 픽업 서비스"],
    price_range: null,
    menu: [],
    services: ["화장품·스킨케어", "헤어·바디 용품", "건강·영양 보조식품", "향수·향수 소품"],
    notice: null,
  },
  {
    store_id: "s_1f_2",
    description: "SPC그룹 직영 베이커리 카페. 매일 아침 갓 구운 빵과 커피를 제공합니다.",
    tags: ["🥖 매일 오전 신선 베이킹", "☕ 스페셜티 커피 라인업", "🎂 맞춤 케이크 주문 제작", "🏆 파리크라상 프리미엄 빵"],
    price_range: "아메리카노 3,500원 / 빵 2,000원~",
    menu: [
      { name: "크로와상", price: "2,800원", tag: "베스트" },
      { name: "소시지빵", price: "2,200원" },
      { name: "아이스 아메리카노", price: "3,500원" },
      { name: "생크림 케이크 조각", price: "4,800원" },
    ],
    services: [],
    notice: null,
  },
  {
    store_id: "s_1f_3",
    description: "우리은행 검단 지점. ATM 및 창구 업무, 대출 상담까지 종합 금융 서비스를 제공합니다.",
    tags: ["🏦 우리은행 ATM 24시간 운영", "💳 전 금융 창구 업무", "🏡 주택담보대출 상담", "📱 모바일 뱅킹 가입 지원"],
    price_range: null,
    menu: [],
    services: ["입·출금 및 계좌 개설", "외환·환전 업무", "대출 상담", "연금·보험 상담"],
    notice: "창구 09:00~16:00, ATM 24시간",
  },
  {
    store_id: "s_1f_4",
    description: "전문 약사 상주, 처방약·일반의약품·건강기능식품 200종 이상 보유. 1:1 건강 상담 가능.",
    tags: ["💊 건강기능식품 200종 보유", "👨‍⚕️ 전문 약사 무료 상담", "🚚 65세 이상 방문 배송", "📋 처방전 없이 구매 가능"],
    price_range: null,
    menu: [],
    services: ["처방전 조제", "일반의약품 판매", "건강기능식품 상담", "혈압·혈당 측정"],
    notice: "처방전 조제 당일 가능",
  },
  {
    store_id: "s_2f_1",
    description: "국내 최초 닭 전문 버거 브랜드. 국내산 당일 신선 닭고기로 만든 바삭한 버거를 제공합니다.",
    tags: ["🐔 국내산 당일 신선 닭고기", "🍟 감자튀김·코울슬로 선택", "👶 어린이 메뉴 운영", "🌮 순살·뼈닭 선택 가능"],
    price_range: "단품 5,000원~, 세트 8,000원~",
    menu: [
      { name: "싸이버거 세트", price: "8,400원", tag: "베스트" },
      { name: "맘스치킨버거 세트", price: "7,900원" },
      { name: "뿌링클 세트", price: "9,200원", tag: "신메뉴" },
      { name: "어린이 세트", price: "5,900원" },
    ],
    services: [],
    notice: null,
  },
  {
    store_id: "s_2f_2",
    description: "24시간 운영하는 CU 편의점. 간편식·음료·생활용품과 ATM, 택배, 복사 서비스도 이용 가능합니다.",
    tags: ["🕐 24시간 연중무휴", "📦 택배 접수·수령", "🏧 ATM 설치", "🍱 간편식·즉석조리 코너"],
    price_range: null,
    menu: [],
    services: ["편의식품·음료", "ATM 서비스", "택배 접수·수령", "복사·팩스 서비스"],
    notice: null,
  },
  {
    store_id: "s_2f_3",
    description: "합리적인 가격의 국내 카페 브랜드. 다양한 음료와 베이커리를 매일 신선하게 제공합니다.",
    tags: ["☕ 아메리카노 1,500원 균일가", "🥐 신선 베이커리 입고", "🌿 디카페인 메뉴 운영", "💻 공부·업무 친화 공간"],
    price_range: "아메리카노 1,500원~",
    menu: [
      { name: "아이스 아메리카노", price: "1,500원", tag: "최저가" },
      { name: "카페 라떼", price: "2,500원" },
      { name: "초코 스무디", price: "3,000원" },
      { name: "크루아상", price: "2,000원" },
    ],
    services: [],
    notice: null,
  },
  {
    store_id: "s_2f_4",
    description: "피부·헤어·네일을 아우르는 복합 뷰티숍. 전문 테라피스트가 시술합니다.",
    tags: ["💆 피부 관리 전문", "💅 네일 아트·젤 네일", "✨ 에스테틱·왁싱 시술", "📅 예약 우선 입장"],
    price_range: "피부 관리 5만원~, 네일 3만원~",
    menu: [],
    services: ["피부 관리 (클렌징·트리트먼트)", "네일 아트·젤 네일", "왁싱 전 부위 시술", "눈썹 디자인·속눈썹"],
    notice: "예약 고객 우선 입장, 당일 예약 가능",
  },
  {
    store_id: "s_3f_1",
    description: "백종원 대표의 더본코리아 직영 레스토랑. 다양한 한식과 분식을 합리적인 가격에 즐길 수 있습니다.",
    tags: ["🏆 백종원 대표 직영", "🍱 한식·분식 전 메뉴", "👨‍🍳 오픈 키친 운영", "🎉 단체석·프라이빗룸 가능"],
    price_range: "1인 8,000원~15,000원",
    menu: [
      { name: "런치 세트 (평일)", price: "9,900원", tag: "베스트" },
      { name: "제육볶음 정식", price: "11,000원" },
      { name: "된장찌개 정식", price: "9,000원" },
      { name: "삼겹살 (1인분)", price: "13,000원" },
    ],
    services: [],
    notice: "2인 이상 런치 세트 20% 할인 (오픈 이벤트)",
  },
  {
    store_id: "s_3f_2",
    description: "원어민 및 이중 언어 강사 보유 영어학원. 취학 전 아동부터 성인까지 레벨별 수업 운영.",
    tags: ["🌍 원어민 강사 상주", "📘 레벨별 맞춤 커리큘럼", "👶 유아~성인 전 연령", "📝 회화·문법·토익 과정"],
    price_range: null,
    menu: [],
    services: ["유아 영어 (4~7세)", "초등 회화 & 문법", "중·고등 내신·수능 영어", "성인 회화·비즈니스 영어"],
    notice: "입학 상담 및 레벨 테스트 사전 예약",
  },
  {
    store_id: "s_3f_3",
    description: "수능·내신 전문 수학학원. 소수 정원 개인 맞춤 지도로 성적 향상을 보장합니다.",
    tags: ["📐 소수 정원 (8명 이하)", "📊 주 1회 개인 성적 리포트", "🎯 수능·내신·경시 대비", "🖥️ 태블릿 활용 스마트 수업"],
    price_range: null,
    menu: [],
    services: ["초등 수학 심화", "중등 수학 (내신 대비)", "고등 수학 (수능·내신)", "경시·올림피아드 준비"],
    notice: "신규 등원 첫 달 수업료 30% 할인",
  },
  {
    store_id: "s_4f_1",
    description: "가정의학과 전문의 상주. 감기부터 만성질환 관리까지 1차 의료 서비스를 제공합니다.",
    tags: ["👨‍⚕️ 가정의학과 전문의", "💉 독감·폐렴 예방접종", "🩺 건강 검진 패키지", "🚑 응급 처치 가능"],
    price_range: null,
    menu: [],
    services: ["감기·내과 진료", "만성질환 관리 (고혈압·당뇨)", "예방접종", "건강 검진 (기본·심화)"],
    notice: "진료 예약 권장, 당일 접수 가능",
  },
  {
    store_id: "s_4f_2",
    description: "임플란트·교정·미백 전문 치과. 최신 디지털 장비로 정확하고 편안한 치료를 제공합니다.",
    tags: ["🦷 임플란트 전문 치과", "😁 치아 미백·교정", "🖥️ 디지털 파노라마 X-ray", "💳 신용카드 무이자 할부"],
    price_range: "임플란트 100만원~, 미백 20만원~",
    menu: [],
    services: ["임플란트 (당일 가식)", "투명 교정·일반 교정", "치아 미백", "충치 치료·스케일링"],
    notice: "첫 방문 치과 검진 무료",
  },
  {
    store_id: "s_4f_3",
    description: "감성적인 인테리어의 헤어 살롱. 트렌디한 헤어 스타일링과 두피 케어 서비스를 제공합니다.",
    tags: ["✂️ 트렌드 헤어 스타일링", "🌿 두피·모발 케어 프로그램", "🎨 컬러 전문 (탈색·염색)", "📷 SNS 피드 가능 스타일 제안"],
    price_range: "커트 15,000원~, 펌 70,000원~",
    menu: [],
    services: ["커트 (남·여·아동)", "펌 (일반·매직·볼륨)", "염색·탈색·하이라이트", "두피 케어·트리트먼트"],
    notice: "오픈 기념 커트 10,000원 고정 (4/20까지)",
  },
];

// ─── store_openings ───────────────────────────────────────────
const storeOpenings = [
  {
    id: "ns1",
    store_id: "s_3f_1",
    store_name: "더본코리아 (백종원)",
    category: "음식점",
    floor: "3F",
    open_date: "2026-04-14",
    emoji: "🍽️",
    open_benefit: {
      summary: "오픈 기념 전 메뉴 20% 할인 + 음료 1잔 무료",
      details: [
        "전 메뉴 20% 할인 (4/30까지)",
        "1인 1음료 무료 제공 (테이크아웃 포함)",
        "앱 첫 주문 시 추가 10% 즉시 할인",
        "SNS 리뷰 작성 고객 디저트 1종 증정",
      ],
      validUntil: "2026-04-30",
    },
    active: true,
  },
  {
    id: "ns2",
    store_id: "s_2f_4",
    store_name: "헬스앤뷰티",
    category: "미용",
    floor: "2F",
    open_date: "2026-04-15",
    emoji: "💄",
    open_benefit: {
      summary: "오픈 특가 전품목 30% OFF + 회원 가입 시 5,000원 적립",
      details: [
        "오픈 기념 전품목 30% 할인 (4/30까지)",
        "신규 회원 가입 시 5,000 포인트 즉시 적립",
        "3만원 이상 구매 시 샘플 키트 증정",
        "SNS 팔로우 + 태그 시 추첨 경품 이벤트",
      ],
      validUntil: "2026-04-30",
    },
    active: true,
  },
  {
    id: "ns3",
    store_id: "s_4f_3",
    store_name: "헤어살롱 모이",
    category: "미용",
    floor: "4F",
    open_date: "2026-04-07",
    emoji: "💇",
    open_benefit: {
      summary: "오픈 한 달 커트 10,000원 고정 + 첫 방문 드라이 무료",
      details: [
        "오픈 기념 커트 10,000원 고정가 (5/7까지)",
        "첫 방문 드라이 무료 서비스",
        "펌·염색 예약 시 트리트먼트 무료 업그레이드",
        "인스타 후기 작성 시 다음 방문 20% 할인 쿠폰 증정",
      ],
      validUntil: "2026-05-07",
    },
    active: true,
  },
  {
    id: "ns4",
    store_id: "s_1f_2",
    store_name: "스타벅스 검단점",
    category: "카페",
    floor: "1F",
    open_date: "2026-04-03",
    emoji: "☕",
    open_benefit: {
      summary: "리유저블 컵 증정 + 사이즈업 무료",
      details: [
        "음료 2잔 이상 구매 시 리유저블 컵 증정",
        "그란데 이상 주문 시 벤티 사이즈업 무료 (4/30까지)",
        "첫 방문 쿠폰 발급 시 아메리카노 1잔 무료",
      ],
      validUntil: "2026-04-30",
    },
    active: true,
  },
  {
    id: "ns5",
    store_id: "s_5f_1",
    store_name: "필라테스 스튜디오 온",
    category: "기타",
    floor: "5F",
    open_date: "2026-04-10",
    emoji: "🧘",
    open_benefit: {
      summary: "오픈 기념 첫 달 50% 할인 + 체험 수업 무료",
      details: [
        "오픈 기념 첫 달 수강료 50% 할인",
        "무료 체험 수업 1회 제공 (예약 필수)",
        "3개월 등록 시 1개월 무료 추가",
        "친구 소개 시 쌍방 1만원 포인트 지급",
      ],
      validUntil: "2026-05-10",
    },
    active: true,
  },
];

// ─── store_coupons ────────────────────────────────────────────
const storeCoupons = [
  {
    id: "cp1",
    store_id: "s_b1_3",
    store_name: "스타벅스 DT",
    building_name: "검단 센트럴 타워",
    title: "아메리카노 15% 할인",
    discount: "15%",
    discount_type: "rate",
    category: "카페",
    expiry: "2026-05-31",
    color: "#00704A",
    active: true,
  },
  {
    id: "cp2",
    store_id: "s_2f_1",
    store_name: "맘스터치",
    building_name: "검단 센트럴 타워",
    title: "치킨버거 세트 1,000원 할인",
    discount: "1,000원",
    discount_type: "amount",
    category: "음식점",
    expiry: "2026-05-05",
    color: "#E63312",
    active: true,
  },
  {
    id: "cp3",
    store_id: "s_1f_4",
    store_name: "약국",
    building_name: "검단 센트럴 타워",
    title: "건강기능식품 10% 할인",
    discount: "10%",
    discount_type: "rate",
    category: "병원/약국",
    expiry: "2026-05-10",
    color: "#3182F6",
    active: true,
  },
  {
    id: "cp4",
    store_id: "s_3f_1",
    store_name: "더본코리아",
    building_name: "검단 센트럴 타워",
    title: "런치 세트 2인 이상 20% 할인",
    discount: "20%",
    discount_type: "rate",
    category: "음식점",
    expiry: "2026-04-30",
    color: "#F59E0B",
    active: true,
  },
  {
    id: "cp5",
    store_id: "s_1f_1",
    store_name: "올리브영",
    building_name: "당하 스퀘어몰",
    title: "2만원 이상 구매 시 3,000원 할인",
    discount: "3,000원",
    discount_type: "amount",
    category: "기타",
    expiry: "2026-05-15",
    color: "#FF3399",
    active: true,
  },
  {
    id: "cp6",
    store_id: "s_2f_3",
    store_name: "이디야커피",
    building_name: "당하 스퀘어몰",
    title: "아이스 음료 500원 할인",
    discount: "500원",
    discount_type: "amount",
    category: "카페",
    expiry: "2026-04-30",
    color: "#6366F1",
    active: true,
  },
];

async function seed() {
  console.log("🌱 상가 DB 시딩 시작...\n");

  // ── store_details ──
  console.log(`📝 store_details: ${storeDetails.length}개 upsert 중...`);
  const { error: detailsErr } = await supabase
    .from("store_details")
    .upsert(storeDetails, { onConflict: "store_id" });
  if (detailsErr) {
    console.error("  ❌ store_details 오류:", detailsErr.message);
  } else {
    console.log(`  ✅ store_details ${storeDetails.length}개 완료`);
  }

  // ── store_openings ──
  console.log(`📝 store_openings: ${storeOpenings.length}개 upsert 중...`);
  const { error: openingsErr } = await supabase
    .from("store_openings")
    .upsert(storeOpenings, { onConflict: "id" });
  if (openingsErr) {
    console.error("  ❌ store_openings 오류:", openingsErr.message);
  } else {
    console.log(`  ✅ store_openings ${storeOpenings.length}개 완료`);
  }

  // ── store_coupons ──
  console.log(`📝 store_coupons: ${storeCoupons.length}개 upsert 중...`);
  const { error: couponsErr } = await supabase
    .from("store_coupons")
    .upsert(storeCoupons, { onConflict: "id" });
  if (couponsErr) {
    console.error("  ❌ store_coupons 오류:", couponsErr.message);
  } else {
    console.log(`  ✅ store_coupons ${storeCoupons.length}개 완료`);
  }

  console.log("\n✅ 시딩 완료!");
}

seed().catch(console.error);
