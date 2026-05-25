/**
 * 검단신도시 권역 마스터 데이터
 * 인천광역시 서구 검단신도시
 */

// ─── 법정동 (9개) ─────────────────────────────────────────────
// 도로명 주소 및 지번 주소의 기본 단위
export const LEGAL_DONGS = [
  "마전동", "당하동", "원당동", "불로동",
  "대곡동", "금곡동", "오류동", "왕길동", "백석동",
] as const;
export type LegalDong = typeof LEGAL_DONGS[number];

// ─── 행정동 (8개) ─────────────────────────────────────────────
// 행정복지센터 운영 및 실생활 권역 기준
export const ADMIN_DONGS = [
  "검단동", "불로대곡동", "원당동", "당하동",
  "오류왕길동", "마전동", "아라1동", "아라2동",
] as const;
export type AdminDong = typeof ADMIN_DONGS[number];

// ─── 법정동 → 행정동 매핑 ──────────────────────────────────────
export const LEGAL_TO_ADMIN: Record<LegalDong, AdminDong> = {
  "금곡동":  "검단동",
  "불로동":  "불로대곡동",
  "대곡동":  "불로대곡동",
  "원당동":  "원당동",
  "당하동":  "당하동",
  "오류동":  "오류왕길동",
  "왕길동":  "오류왕길동",
  "마전동":  "마전동",
  "백석동":  "아라1동",
};

// ─── 행정복지센터 ────────────────────────────────────────────
export interface AdminCenter {
  adminDong: AdminDong;
  name: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
}

export const ADMIN_CENTERS: AdminCenter[] = [
  { adminDong: "검단동",    name: "검단동 행정복지센터",    address: "인천 서구 검단로 512",       phone: "032-560-5120", lat: 37.5530, lng: 126.6720 },
  { adminDong: "불로대곡동",name: "불로대곡동 행정복지센터",address: "인천 서구 불로동 100-1",     phone: "032-560-5160", lat: 37.5410, lng: 126.6830 },
  { adminDong: "원당동",    name: "원당동 행정복지센터",    address: "인천 서구 원당대로 1001",    phone: "032-560-5170", lat: 37.5490, lng: 126.6760 },
  { adminDong: "당하동",    name: "당하동 행정복지센터",    address: "인천 서구 당하로 120",       phone: "032-560-5180", lat: 37.5460, lng: 126.6870 },
  { adminDong: "오류왕길동",name: "오류왕길동 행정복지센터",address: "인천 서구 오류도서로 30",    phone: "032-560-5190", lat: 37.5510, lng: 126.6940 },
  { adminDong: "마전동",    name: "마전동 행정복지센터",    address: "인천 서구 마전로 50",        phone: "032-560-5200", lat: 37.5470, lng: 126.6900 },
  { adminDong: "아라1동",   name: "아라1동 행정복지센터",   address: "인천 서구 가정로 30",        phone: "032-560-5210", lat: 37.5350, lng: 126.6790 },
  { adminDong: "아라2동",   name: "아라2동 행정복지센터",   address: "인천 서구 가정로 55",        phone: "032-560-5220", lat: 37.5330, lng: 126.6810 },
];

// ─── 동별 대표 좌표 (법정동) ─────────────────────────────────────
export const DONG_COORDS: Record<LegalDong, { lat: number; lng: number }> = {
  "마전동":  { lat: 37.5470, lng: 126.6900 },
  "당하동":  { lat: 37.5448, lng: 126.6863 },
  "원당동":  { lat: 37.5490, lng: 126.6760 },
  "불로동":  { lat: 37.5418, lng: 126.6831 },
  "대곡동":  { lat: 37.5400, lng: 126.6810 },
  "금곡동":  { lat: 37.5535, lng: 126.6730 },
  "오류동":  { lat: 37.5500, lng: 126.6940 },
  "왕길동":  { lat: 37.5520, lng: 126.6970 },
  "백석동":  { lat: 37.5360, lng: 126.6800 },
};

// ─── 검단신도시 중심 좌표 ────────────────────────────────────────
export const GEUMDAN_CENTER = { lat: 37.5446, lng: 126.6861 };

// ─── 권역 내 주요 도로 ─────────────────────────────────────────
export const MAIN_ROADS = [
  "검단로", "당하로", "마전로", "원당대로", "오류도서로",
  "불로로", "대곡로", "금곡대로", "왕길로", "아라대로",
];

// ─── UI용 동 목록 (필터 등에 사용) ───────────────────────────────
/** 법정동 전체 목록 (전체 포함) */
export const LEGAL_DONG_OPTIONS = ["전체", ...LEGAL_DONGS] as const;

/** 행정동 전체 목록 (전체 포함) */
export const ADMIN_DONG_OPTIONS = ["전체", ...ADMIN_DONGS] as const;

/** 회원가입·프로필에서 사용할 동 선택지 (법정동 기준) */
export const DONG_SELECT_OPTIONS = [...LEGAL_DONGS];
