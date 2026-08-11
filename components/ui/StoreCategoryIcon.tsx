import {
  BookOpen, Building2, Coffee, Cross, Dumbbell, Flower2, Glasses,
  GraduationCap, PawPrint, Scissors, Shirt, ShoppingBasket, ShoppingCart,
  Store, Utensils, Wheat,
} from "lucide-react";

const CATEGORY_STYLE: Record<string, { icon: typeof Store; background: string; color: string }> = {
  "카페": { icon: Coffee, background: "#FFF4E6", color: "#B86516" },
  "음식점": { icon: Utensils, background: "#FFF0EA", color: "#D7542A" },
  "편의점": { icon: ShoppingBasket, background: "#EAF3FF", color: "#2571C8" },
  "병원/약국": { icon: Cross, background: "#EAF9F2", color: "#16865F" },
  "미용": { icon: Scissors, background: "#FFF0F7", color: "#C64D83" },
  "학원": { icon: GraduationCap, background: "#F1EEFF", color: "#7054C7" },
  "마트": { icon: ShoppingCart, background: "#E9F8EF", color: "#218B57" },
  "헬스/운동": { icon: Dumbbell, background: "#EAF6FF", color: "#287EBA" },
  "반려동물": { icon: PawPrint, background: "#FFF1F4", color: "#C85872" },
  "세탁": { icon: Shirt, background: "#EEF1FF", color: "#5A67C7" },
  "베이커리": { icon: Wheat, background: "#FFF5DF", color: "#A96C1E" },
  "부동산": { icon: Building2, background: "#EAF8FA", color: "#247E8A" },
  "스터디카페": { icon: BookOpen, background: "#F2EEFF", color: "#694BC2" },
  "안경원": { icon: Glasses, background: "#EAF8F5", color: "#257D70" },
  "꽃집": { icon: Flower2, background: "#FFF0F6", color: "#BF4F7C" },
  "기타": { icon: Store, background: "#F1F3F5", color: "#596273" },
};

export default function StoreCategoryIcon({ category = "기타", size = 40, rounded = "rounded-xl" }: { category?: string; size?: number; rounded?: string }) {
  const style = CATEGORY_STYLE[category] ?? CATEGORY_STYLE["기타"];
  const Icon = style.icon;
  return (
    <span
      aria-hidden="true"
      className={`relative grid shrink-0 place-items-center overflow-hidden border border-white/90 shadow-[0_5px_10px_rgba(33,45,65,.14),inset_0_-2px_4px_rgba(35,45,60,.08)] ${rounded}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        color: style.color,
        background: `linear-gradient(145deg, #ffffff 0%, ${style.background} 48%, ${style.background} 100%)`,
      }}
    >
      <span className="absolute left-[18%] top-[10%] h-[22%] w-[48%] rounded-full bg-white/75 blur-[1px]" />
      <Icon className="relative drop-shadow-[0_2px_1px_rgba(255,255,255,.95)]" size={Math.max(15, Math.round(size * 0.47))} strokeWidth={2.35} />
    </span>
  );
}
