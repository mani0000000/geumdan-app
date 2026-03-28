// 브랜드별 로고 설정 (배경색, 텍스트색, 표시 이니셜/약어)
const BRANDS: Record<string, { bg: string; color: string; label: string }> = {
  "스타벅스":              { bg: "#00704A", color: "#fff", label: "S" },
  "스타벅스 DT":           { bg: "#00704A", color: "#fff", label: "S" },
  "맘스터치":              { bg: "#E63312", color: "#fff", label: "맘" },
  "올리브영":              { bg: "#FF3399", color: "#fff", label: "O" },
  "이디야커피":            { bg: "#1A3A6B", color: "#fff", label: "E" },
  "더본코리아 (백종원)":   { bg: "#D97706", color: "#fff", label: "더" },
  "더본코리아":            { bg: "#D97706", color: "#fff", label: "더" },
  "약국":                  { bg: "#3182F6", color: "#fff", label: "약" },
  "파리바게뜨":            { bg: "#003087", color: "#fff", label: "P" },
  "홈플러스 익스프레스":   { bg: "#E21A1A", color: "#fff", label: "H" },
  "홈플러스":              { bg: "#E21A1A", color: "#fff", label: "H" },
  "CU 편의점":             { bg: "#7B3F9B", color: "#fff", label: "CU" },
  "우리은행":              { bg: "#004B9B", color: "#fff", label: "W" },
  "세탁특공대":            { bg: "#0EA5E9", color: "#fff", label: "세" },
  "영어학원":              { bg: "#6366F1", color: "#fff", label: "영" },
  "수학학원":              { bg: "#8B5CF6", color: "#fff", label: "수" },
  "가정의학과":            { bg: "#10B981", color: "#fff", label: "가" },
  "치과":                  { bg: "#06B6D4", color: "#fff", label: "치" },
  "헬스앤뷰티":            { bg: "#EC4899", color: "#fff", label: "헬" },
  "헤어살롱 모이":         { bg: "#F59E0B", color: "#fff", label: "모" },
};

// 카테고리 폴백 색상
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
  size?: number;   // px, 기본 40
  rounded?: string; // 기본 rounded-xl
}

export default function StoreLogo({
  name,
  category = "기타",
  size = 40,
  rounded = "rounded-xl",
}: StoreLogoProps) {
  const brand = BRANDS[name];
  const fallback = CAT_FALLBACK[category] ?? CAT_FALLBACK["기타"];

  const bg    = brand?.bg    ?? fallback.bg;
  const color = brand?.color ?? fallback.color;

  const fontSize = size <= 32 ? 11 : size <= 44 ? 13 : 15;
  const emojiSize = size <= 32 ? 14 : size <= 44 ? 18 : 22;

  return (
    <div
      className={`flex items-center justify-center shrink-0 ${rounded}`}
      style={{ width: size, height: size, background: bg, minWidth: size }}
    >
      {brand ? (
        <span
          style={{
            color,
            fontSize,
            fontWeight: 900,
            letterSpacing: "-0.5px",
            lineHeight: 1,
          }}
        >
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
