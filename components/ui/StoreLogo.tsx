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
  "헬스앤뷰티":{ bg: "#EC4899", color: "#fff", label: "헬" },
  "헤어살롱 모이": { bg: "#F59E0B", color: "#fff", label: "모" },
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
};

const CAT_EMOJI: Record<string, string> = {
  "카페": "☕", "음식점": "🍽️", "편의점": "🏪",
  "병원/약국": "💊", "미용": "💇", "학원": "📚",
  "마트": "🛒", "기타": "🏢",
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
