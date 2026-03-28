"use client";
import { useState } from "react";

// basePath와 일치해야 함
const BASE = "/geumdan-app";

// 브랜드별 설정 (bg, color, label = 폴백 / logo = SVG 경로)
const BRANDS: Record<string, { bg: string; color: string; label: string; logo?: string }> = {
  "스타벅스":              { bg: "#00704A", color: "#fff", label: "S",   logo: `${BASE}/logos/starbucks.svg` },
  "스타벅스 DT":           { bg: "#00704A", color: "#fff", label: "S",   logo: `${BASE}/logos/starbucks.svg` },
  "맘스터치":              { bg: "#E63312", color: "#fff", label: "맘",  logo: `${BASE}/logos/momstouch.svg` },
  "올리브영":              { bg: "#1D1D1B", color: "#fff", label: "O",   logo: `${BASE}/logos/oliveyoung.svg` },
  "이디야커피":            { bg: "#1A3A6B", color: "#fff", label: "E",   logo: `${BASE}/logos/ediya.svg` },
  "더본코리아 (백종원)":   { bg: "#D97706", color: "#fff", label: "더" },
  "더본코리아":            { bg: "#D97706", color: "#fff", label: "더" },
  "약국":                  { bg: "#3182F6", color: "#fff", label: "약" },
  "파리바게뜨":            { bg: "#003087", color: "#fff", label: "P",   logo: `${BASE}/logos/parisbaguette.svg` },
  "홈플러스 익스프레스":   { bg: "#E21A1A", color: "#fff", label: "H",   logo: `${BASE}/logos/homeplus.svg` },
  "홈플러스":              { bg: "#E21A1A", color: "#fff", label: "H",   logo: `${BASE}/logos/homeplus.svg` },
  "CU 편의점":             { bg: "#6935A5", color: "#fff", label: "CU",  logo: `${BASE}/logos/cu.svg` },
  "우리은행":              { bg: "#004B9B", color: "#fff", label: "우",  logo: `${BASE}/logos/wooribank.svg` },
  "세탁특공대":            { bg: "#0EA5E9", color: "#fff", label: "세" },
  "영어학원":              { bg: "#6366F1", color: "#fff", label: "영" },
  "수학학원":              { bg: "#8B5CF6", color: "#fff", label: "수" },
  "가정의학과":            { bg: "#10B981", color: "#fff", label: "가" },
  "치과":                  { bg: "#06B6D4", color: "#fff", label: "치" },
  "헬스앤뷰티":            { bg: "#EC4899", color: "#fff", label: "헬" },
  "헤어살롱 모이":         { bg: "#F59E0B", color: "#fff", label: "모" },
};

// 카테고리 폴백
const CAT_FALLBACK: Record<string, { bg: string; color: string }> = {
  "카페":      { bg: "#FEF3C7", color: "#92400E" },
  "음식점":    { bg: "#FEE2E2", color: "#991B1B" },
  "편의점":    { bg: "#DBEAFE", color: "#1E40AF" },
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

  const bg    = brand?.bg    ?? fallback.bg;
  const color = brand?.color ?? fallback.color;
  const fontSize  = size <= 32 ? 11 : size <= 44 ? 13 : 15;
  const emojiSize = size <= 32 ? 14 : size <= 44 ? 18 : 22;

  // 로고 이미지가 있고 로드 실패하지 않았으면 이미지 표시
  if (brand?.logo && !imgFailed) {
    return (
      <div
        className={`flex items-center justify-center shrink-0 overflow-hidden ${rounded}`}
        style={{ width: size, height: size, minWidth: size, background: bg }}
      >
        <img
          src={brand.logo}
          alt={name}
          width={size}
          height={size}
          onError={() => setImgFailed(true)}
          style={{ width: size, height: size, objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  // 폴백: 색상 배경 + 이니셜/이모지
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
