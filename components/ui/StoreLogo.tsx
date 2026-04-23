"use client";
import { useState } from "react";

// 브랜드별 설정
// logo: 실제 로고 이미지 URL (브라우저에서 로드). 실패 시 bg+label 폴백.
const BRANDS: Record<string, { bg: string; color: string; label: string; logo?: string }> = {
  "스타벅스": {
    bg: "#00704A", color: "#fff", label: "S",
    logo: "https://logo.clearbit.com/starbucks.com",
  },
  "스타벅스 DT": {
    bg: "#00704A", color: "#fff", label: "S",
    logo: "https://logo.clearbit.com/starbucks.com",
  },
  "맘스터치": {
    bg: "#E63312", color: "#fff", label: "맘",
    logo: "https://logo.clearbit.com/momstouch.co.kr",
  },
  "올리브영": {
    bg: "#1D1D1B", color: "#fff", label: "O",
    logo: "https://logo.clearbit.com/oliveyoung.co.kr",
  },
  "이디야커피": {
    bg: "#1A3A6B", color: "#fff", label: "E",
    logo: "https://logo.clearbit.com/ediya.com",
  },
  "더본코리아 (백종원)": {
    bg: "#D97706", color: "#fff", label: "더",
    logo: "https://logo.clearbit.com/theborn.co.kr",
  },
  "더본코리아": {
    bg: "#D97706", color: "#fff", label: "더",
    logo: "https://logo.clearbit.com/theborn.co.kr",
  },
  "약국": {
    bg: "#0071e3", color: "#fff", label: "약",
  },
  "파리바게뜨": {
    bg: "#003087", color: "#fff", label: "P",
    logo: "https://logo.clearbit.com/paris.co.kr",
  },
  "홈플러스 익스프레스": {
    bg: "#E21A1A", color: "#fff", label: "H",
    logo: "https://logo.clearbit.com/homeplus.co.kr",
  },
  "홈플러스": {
    bg: "#E21A1A", color: "#fff", label: "H",
    logo: "https://logo.clearbit.com/homeplus.co.kr",
  },
  "CU 편의점": {
    bg: "#6935A5", color: "#fff", label: "CU",
    logo: "https://logo.clearbit.com/bgfretail.com",
  },
  "우리은행": {
    bg: "#004B9B", color: "#fff", label: "우",
    logo: "https://logo.clearbit.com/wooribank.com",
  },
  "세탁특공대": {
    bg: "#0EA5E9", color: "#fff", label: "세",
    logo: "https://logo.clearbit.com/cleaningspecialforces.com",
  },
  "영어학원":  { bg: "#6366F1", color: "#fff", label: "영" },
  "수학학원":  { bg: "#8B5CF6", color: "#fff", label: "수" },
  "가정의학과":{ bg: "#10B981", color: "#fff", label: "가" },
  "치과":      { bg: "#06B6D4", color: "#fff", label: "치" },
  "헤어살롱 모이": { bg: "#F59E0B", color: "#fff", label: "모" },
  // 편의점
  "GS25":           { bg: "#0073CF", color: "#fff", label: "GS", logo: "https://logo.clearbit.com/gs25.com" },
  "GS25 오류점":    { bg: "#0073CF", color: "#fff", label: "GS", logo: "https://logo.clearbit.com/gs25.com" },
  "GS25 백석점":    { bg: "#0073CF", color: "#fff", label: "GS", logo: "https://logo.clearbit.com/gs25.com" },
  "세븐일레븐":     { bg: "#E31837", color: "#fff", label: "7", logo: "https://logo.clearbit.com/7eleven.co.kr" },
  "이마트24":       { bg: "#F5A623", color: "#fff", label: "E24", logo: "https://logo.clearbit.com/emart24.co.kr" },
  // 카페/베이커리
  "빽다방":         { bg: "#4D3320", color: "#fff", label: "빽", logo: "https://logo.clearbit.com/paik.co.kr" },
  "메가커피":       { bg: "#F5A623", color: "#fff", label: "메가" },
  "투썸플레이스":   { bg: "#2C2C2C", color: "#fff", label: "2S", logo: "https://logo.clearbit.com/twosome.co.kr" },
  "컴포즈커피":     { bg: "#FFCD00", color: "#1d1d1f", label: "컴" },
  "할리스":         { bg: "#B5151C", color: "#fff", label: "H", logo: "https://logo.clearbit.com/hollys.co.kr" },
  "탐앤탐스":       { bg: "#6B3F2A", color: "#fff", label: "Tom" },
  "배스킨라빈스":   { bg: "#E31837", color: "#fff", label: "BR", logo: "https://logo.clearbit.com/baskinrobbins.co.kr" },
  "던킨":           { bg: "#FF6600", color: "#fff", label: "D", logo: "https://logo.clearbit.com/dunkindonuts.com" },
  // 음식점
  "맥도날드":       { bg: "#DA020E", color: "#fff", label: "M", logo: "https://logo.clearbit.com/mcdonalds.com" },
  "버거킹":         { bg: "#D62300", color: "#fff", label: "BK", logo: "https://logo.clearbit.com/burgerking.com" },
  "롯데리아":       { bg: "#E31837", color: "#fff", label: "L", logo: "https://logo.clearbit.com/lotteeats.com" },
  "KFC":            { bg: "#E4002B", color: "#fff", label: "KFC", logo: "https://logo.clearbit.com/kfc.com" },
  "서브웨이":       { bg: "#009A44", color: "#fff", label: "SW", logo: "https://logo.clearbit.com/subway.com" },
  "피자헛":         { bg: "#E31837", color: "#fff", label: "PH", logo: "https://logo.clearbit.com/pizzahut.com" },
  "도미노피자":     { bg: "#006DB6", color: "#fff", label: "D", logo: "https://logo.clearbit.com/dominos.com" },
  "BBQ":            { bg: "#F7A800", color: "#1d1d1f", label: "BBQ", logo: "https://logo.clearbit.com/bbq.co.kr" },
  "교촌치킨":       { bg: "#8B1A1A", color: "#fff", label: "교촌", logo: "https://logo.clearbit.com/kyochon.com" },
  "BHC치킨":        { bg: "#E31837", color: "#fff", label: "BHC" },
  "BHC":            { bg: "#E31837", color: "#fff", label: "BHC" },
  "굽네치킨":       { bg: "#FF6600", color: "#fff", label: "굽네" },
  "네네치킨":       { bg: "#004B97", color: "#fff", label: "네네" },
  "처갓집양념치킨": { bg: "#E31837", color: "#fff", label: "처갓" },
  "지코바":         { bg: "#FF6600", color: "#fff", label: "지코" },
  "본죽":           { bg: "#1B5C35", color: "#fff", label: "본죽" },
  "한솥도시락":     { bg: "#E31837", color: "#fff", label: "한솥" },
  "김밥천국":       { bg: "#E31837", color: "#fff", label: "김천" },
  "롯데GRS":        { bg: "#E31837", color: "#fff", label: "L" },
  // 생활/뷰티
  "다이소":         { bg: "#E31837", color: "#fff", label: "D", logo: "https://logo.clearbit.com/daiso.co.kr" },
  "무신사":         { bg: "#1d1d1f", color: "#fff", label: "M" },
  "CJ올리브네트웍스":{ bg: "#1D1D1B", color: "#fff", label: "O" },
  // 금융/기타
  "신한은행":       { bg: "#0046BE", color: "#fff", label: "신한", logo: "https://logo.clearbit.com/shinhan.com" },
  "KB국민은행":     { bg: "#FFBC00", color: "#1d1d1f", label: "KB", logo: "https://logo.clearbit.com/kbstar.com" },
  "하나은행":       { bg: "#009A8A", color: "#fff", label: "하나", logo: "https://logo.clearbit.com/hanabank.com" },
  "농협은행":       { bg: "#0069C8", color: "#fff", label: "NH", logo: "https://logo.clearbit.com/nonghyup.com" },
  "카카오뱅크":     { bg: "#FAE100", color: "#1d1d1f", label: "K" },
  // 헬스
  "필라테스 스튜디오 온": { bg: "#0EA5E9", color: "#fff", label: "On" },
  "헬스앤뷰티":    { bg: "#EC4899", color: "#fff", label: "H&B" },
};

// 카테고리 폴백
const CAT_FALLBACK: Record<string, { bg: string; color: string }> = {
  "카페":      { bg: "#FEF3C7", color: "#92400E" },
  "음식점":    { bg: "#FEE2E2", color: "#991B1B" },
  "편의점":    { bg: "#e8f1fd", color: "#1E40AF" },
  "병원/약국": { bg: "#D1FAE5", color: "#065F46" },
  "미용":      { bg: "#FCE7F3", color: "#9D174D" },
  "학원":      { bg: "#EDE9FE", color: "#5B21B6" },
  "마트":      { bg: "#D1FAE5", color: "#065F46" },
  "기타":      { bg: "#F3F4F6", color: "#374151" },
  "헬스/운동": { bg: "#E0F2FE", color: "#0369A1" },
  "반려동물":  { bg: "#FDF2F8", color: "#9D174D" },
  "세탁":      { bg: "#EEF2FF", color: "#4338CA" },
};

const CAT_EMOJI: Record<string, string> = {
  "카페": "☕", "음식점": "🍽️", "편의점": "🏪",
  "병원/약국": "💊", "미용": "💇", "학원": "📚",
  "마트": "🛒", "기타": "🏢",
  "헬스/운동": "💪",
  "반려동물": "🐾",
  "세탁": "👕",
};

interface StoreLogoProps {
  name: string;
  category?: string;
  size?: number;
  rounded?: string;
}

export default function StoreLogo({
  name,
  category = "기타",
  size = 40,
  rounded = "rounded-xl",
}: StoreLogoProps) {
  const brand = BRANDS[name];
  const fallback = CAT_FALLBACK[category] ?? CAT_FALLBACK["기타"];
  const [imgFailed, setImgFailed] = useState(false);

  const bg        = brand?.bg    ?? fallback.bg;
  const color     = brand?.color ?? fallback.color;
  const fontSize  = size <= 32 ? 11 : size <= 44 ? 13 : 15;
  const emojiSize = size <= 32 ? 14 : size <= 44 ? 18 : 22;
  // 로고 이미지 padding: 크기 대비 10%
  const imgPad    = Math.round(size * 0.1);

  // 로고 이미지 있고 로드 성공한 경우
  if (brand?.logo && !imgFailed) {
    return (
      <div
        className={`flex items-center justify-center shrink-0 overflow-hidden bg-white ${rounded}`}
        style={{ width: size, height: size, minWidth: size }}
      >
        <img
          src={brand.logo}
          alt={name}
          onError={() => setImgFailed(true)}
          style={{
            width: size - imgPad * 2,
            height: size - imgPad * 2,
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    );
  }

  // 폴백: 브랜드 색상 배경 + 이니셜 또는 카테고리 이모지
  return (
    <div
      className={`flex items-center justify-center shrink-0 ${rounded}`}
      style={{ width: size, height: size, background: bg, minWidth: size }}
    >
      {brand ? (
        <span style={{ color, fontSize, fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1 }}>
          {brand.label}
        </span>
      ) : (
        <span style={{ fontSize: emojiSize, lineHeight: 1 }}>
          {CAT_EMOJI[category] ?? "🏢"}
        </span>
      )}
    </div>
  );
}
