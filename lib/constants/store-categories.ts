/**
 * store-categories.ts
 * 상가 업종 카테고리 공통 상수 — 이 파일을 단일 진실 출처로 사용
 * page.tsx, StoreMapView 등 여러 파일에서 import 해 사용
 */
import type { StoreCategory } from "@/lib/types";

export const CAT_DOT: Record<StoreCategory, string> = {
  카페:        "#F59E0B",
  음식점:      "#F97316",
  편의점:      "#3B82F6",
  "병원/약국": "#EF4444",
  미용:        "#EC4899",
  학원:        "#8B5CF6",
  마트:        "#10B981",
  "헬스/운동": "#0EA5E9",
  반려동물:    "#F472B6",
  세탁:        "#6366F1",
  베이커리:    "#D97706",
  부동산:      "#0891B2",
  스터디카페:  "#7C3AED",
  안경원:      "#0D9488",
  꽃집:        "#DB2777",
  기타:        "#9CA3AF",
};

export const CAT_EMOJI: Record<StoreCategory, string> = {
  카페:        "☕",
  음식점:      "🍽️",
  편의점:      "🏪",
  "병원/약국": "💊",
  미용:        "💇",
  학원:        "📚",
  마트:        "🛒",
  "헬스/운동": "💪",
  반려동물:    "🐾",
  세탁:        "👕",
  베이커리:    "🥐",
  부동산:      "🏠",
  스터디카페:  "📖",
  안경원:      "👓",
  꽃집:        "🌸",
  기타:        "🏢",
};

export const CAT_BG: Record<StoreCategory, string> = {
  카페:        "bg-[#FEF3C7] text-[#92400E]",
  음식점:      "bg-[#FFF0E6] text-[#C2410C]",
  편의점:      "bg-[#e8f1fd] text-[#1E40AF]",
  "병원/약국": "bg-[#FEE2E2] text-[#991B1B]",
  미용:        "bg-[#FCE7F3] text-[#9D174D]",
  학원:        "bg-[#EDE9FE] text-[#5B21B6]",
  마트:        "bg-[#D1FAE5] text-[#065F46]",
  "헬스/운동": "bg-[#E0F2FE] text-[#0369A1]",
  반려동물:    "bg-[#FDF2F8] text-[#9D174D]",
  세탁:        "bg-[#EEF2FF] text-[#4338CA]",
  베이커리:    "bg-[#FEF3C7] text-[#B45309]",
  부동산:      "bg-[#ECFEFF] text-[#164E63]",
  스터디카페:  "bg-[#F5F3FF] text-[#5B21B6]",
  안경원:      "bg-[#CCFBF1] text-[#134E4A]",
  꽃집:        "bg-[#FCE7F3] text-[#831843]",
  기타:        "bg-[#F3F4F6] text-[#374151]",
};

export const CAT_GRADS: Record<StoreCategory, [string, string]> = {
  카페:        ["#F59E0B", "#FB923C"],
  음식점:      ["#EF4444", "#F97316"],
  편의점:      ["#3B82F6", "#06B6D4"],
  "병원/약국": ["#EF4444", "#F472B6"],
  미용:        ["#EC4899", "#C026D3"],
  학원:        ["#8B5CF6", "#6366F1"],
  마트:        ["#10B981", "#059669"],
  "헬스/운동": ["#0EA5E9", "#6366F1"],
  반려동물:    ["#F472B6", "#EC4899"],
  세탁:        ["#6366F1", "#8B5CF6"],
  베이커리:    ["#D97706", "#F59E0B"],
  부동산:      ["#0891B2", "#0284C7"],
  스터디카페:  ["#7C3AED", "#6D28D9"],
  안경원:      ["#0D9488", "#059669"],
  꽃집:        ["#DB2777", "#BE185D"],
  기타:        ["#6B7280", "#4B5563"],
};

export const CAT_HERO_IMAGE: Record<StoreCategory, string> = {
  카페:        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=260&fit=crop&auto=format",
  음식점:      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=260&fit=crop&auto=format",
  편의점:      "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&h=260&fit=crop&auto=format",
  "병원/약국": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=260&fit=crop&auto=format",
  미용:        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=260&fit=crop&auto=format",
  학원:        "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=260&fit=crop&auto=format",
  마트:        "https://images.unsplash.com/photo-1534723452862-4c874986a2f6?w=600&h=260&fit=crop&auto=format",
  "헬스/운동": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=260&fit=crop&auto=format",
  반려동물:    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=260&fit=crop&auto=format",
  세탁:        "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600&h=260&fit=crop&auto=format",
  베이커리:    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=260&fit=crop&auto=format",
  부동산:      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=260&fit=crop&auto=format",
  스터디카페:  "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=600&h=260&fit=crop&auto=format",
  안경원:      "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=600&h=260&fit=crop&auto=format",
  꽃집:        "https://images.unsplash.com/photo-1490750967868-88df5691cc7d?w=600&h=260&fit=crop&auto=format",
  기타:        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=260&fit=crop&auto=format",
};

/** 모든 카테고리 목록 (순서 고정) */
export const ALL_CATEGORIES: StoreCategory[] = [
  "카페", "음식점", "편의점", "병원/약국", "미용", "학원",
  "마트", "헬스/운동", "반려동물", "세탁", "베이커리",
  "부동산", "스터디카페", "안경원", "꽃집", "기타",
];

/** 계층형 세부 업종 트리 — 빈 배열이면 세부업종 없음 */
export const STORE_CATEGORY_TREE: Record<StoreCategory, string[]> = {
  카페:        [],
  음식점:      ["한식", "일식", "중식", "양식", "분식", "치킨/버거/피자", "족발/보쌈", "해산물", "기타식당"],
  편의점:      [],
  "병원/약국": ["내과", "치과", "정형외과", "피부과", "안과", "이비인후과", "산부인과", "소아과", "성형외과", "한의원", "약국", "기타병원"],
  미용:        ["미용실/헤어살롱", "네일아트", "속눈썹/눈썹", "피부관리실/스파"],
  학원:        ["영어", "수학/과학", "예체능/미술/음악", "피아노/악기", "어린이/영유아", "보습/종합"],
  마트:        ["슈퍼마켓/마트", "청과/채소가게", "정육점"],
  "헬스/운동": ["헬스장", "요가", "필라테스", "테니스/배드민턴", "수영", "태권도/무도", "복싱/격투기", "골프"],
  반려동물:    ["동물병원", "펫샵", "반려동물 미용", "반려동물 호텔링"],
  세탁:        [],
  베이커리:    [],
  부동산:      [],
  스터디카페:  [],
  안경원:      [],
  꽃집:        [],
  기타:        [],
};

/** 제안 유형 한국어 레이블 */
export const SUGGESTION_TYPE_LABELS: Record<string, string> = {
  new_store:       "신규 매장 등록",
  closed:          "폐점/이전",
  name_change:     "상호명 변경",
  hours_change:    "영업시간 변경",
  phone_change:    "전화번호 변경",
  category_change: "업종 변경",
  other:           "기타",
};

export const SUGGESTION_TYPES = Object.keys(SUGGESTION_TYPE_LABELS) as (keyof typeof SUGGESTION_TYPE_LABELS)[];
