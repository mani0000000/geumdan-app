"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, Clock, Phone, MapPin, Star,
  ParkingSquare, Lock, Pencil, CheckCircle2, ChevronRight,
  Globe, BookOpen, ExternalLink, Send, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import StoreLogo from "@/components/ui/StoreLogo";
import { CAT_BG as catBg, CAT_GRADS as catGrads, SUGGESTION_TYPE_LABELS, SUGGESTION_TYPES } from "@/lib/constants/store-categories";

// ─── Local types matching Supabase rows ────────────────────────
interface StoreDetailRow {
  id: string;
  building_id: string;
  floor_label: string;
  name: string;
  category: string;
  sub_category: string | null;
  phone: string | null;
  hours: string | null;
  structured_hours: Record<string, { open: string | null; close: string | null; closed: boolean }> | null;
  closed_days: string[] | null;
  break_time: { start: string; end: string } | null;
  is_open: boolean | null;
  is_premium: boolean | null;
  logo_url: string | null;
  thumbnail_url: string | null;
  description: string | null;
  extra_info: Record<string, unknown> | null;
  avg_rating: number | null;
  review_count: number;
}

interface ReviewRow {
  id: number;
  nickname: string;
  rating: number;
  content: string | null;
  created_at: string;
}

interface BuildingRow {
  id: string;
  name: string;
  address: string;
  parking_info: string | null;
  open_time: string | null;
}

interface FloorRow {
  id: string;
  label: string;
  has_restroom: boolean;
  restroom_code: string | null;
  restroom_location: string | null;
}

interface SiblingStore {
  id: string;
  name: string;
  category: string;
  is_open: boolean | null;
}

// ─── Constants ─────────────────────────────────────────────────
const AMENITY_EMOJI: Record<string, string> = {
  "예약": "📅", "무선인터넷": "📶", "남녀화장실 구분": "🚻",
  "장애인 출입": "♿", "장애인 주차구역": "🅿", "영유아 동반": "👶",
  "반려동물 동반": "🐾", "포장가능": "📦", "배달가능": "🛵",
  "단체이용": "👥", "노키즈존": "🚫", "오픈키친": "👨‍🍳",
};

const CAT_EXTRA_LABELS: Partial<Record<string, Record<string, string>>> = {
  "병원/약국": { specialties: "진료과목", doctor_count: "의료진", reservation_required: "예약", reservation_url: "예약 링크" },
  "카페": { menu_highlights: "대표 메뉴", price_range: "가격대", seats: "좌석", wifi: "와이파이", delivery: "배달" },
  "음식점": { menu_highlights: "대표 메뉴", price_range: "가격대", delivery: "배달", reservation_required: "예약", private_room: "단체룸" },
  "편의점": { brand: "브랜드", is_24h: "24시간" },
  "미용": { services: "주요 시술", price_range: "가격대", reservation_required: "예약", reservation_url: "예약 링크" },
  "학원": { courses: "강좌", age_range: "대상", tuition: "수강료", trial_class: "체험수업" },
  "헬스/운동": { programs: "프로그램", price_range: "가격대", trial_available: "체험", pt_available: "PT" },
  "마트": { brand: "브랜드", fresh_food: "신선식품", delivery: "배달" },
  "반려동물": { pet_types: "동물 종류", service_types: "서비스", grooming: "미용", boarding: "호텔링" },
  "세탁": { service_types: "서비스", same_day: "당일 처리", dry_clean: "드라이클리닝" },
  "베이커리": { specialty: "대표 제품", custom_order: "맞춤 주문", delivery: "배달" },
  "안경원": { services: "취급 제품/서비스" },
  "부동산": { specialties: "전문 분야" },
  "스터디카페": { seats: "좌석", price_range: "가격대", wifi: "와이파이", locker: "사물함", is_24h: "24시간" },
  "꽃집": { services: "서비스", delivery: "배달", custom_order: "맞춤 주문" },
};

// ─── Main content ───────────────────────────────────────────────
function DetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = searchParams.get("id") ?? "";

  const [store, setStore] = useState<StoreDetailRow | null>(null);
  const [building, setBuilding] = useState<BuildingRow | null>(null);
  const [floor, setFloor] = useState<FloorRow | null>(null);
  const [siblings, setSiblings] = useState<SiblingStore[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCode, setShowCode] = useState(false);

  // 리뷰 작성
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewNickname, setReviewNickname] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);

  // 정보 제안
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [suggestionType, setSuggestionType] = useState("other");
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [suggestionContact, setSuggestionContact] = useState("");
  const [suggestionSubmitting, setSuggestionSubmitting] = useState(false);
  const [suggestionSent, setSuggestionSent] = useState(false);

  useEffect(() => {
    if (!storeId) { setLoading(false); return; }

    async function fetchData() {
      setLoading(true);
      try {
        // 1. Fetch store
        const { data: storeData, error: storeErr } = await supabase
          .from("stores")
          .select("*")
          .eq("id", storeId)
          .single();
        if (storeErr || !storeData) { setLoading(false); return; }

        const s = storeData as StoreDetailRow;
        setStore(s);

        // 2. Fetch building, floor, siblings, reviews in parallel
        const [bRes, fRes, sibRes, revRes] = await Promise.all([
          supabase
            .from("buildings")
            .select("id,name,address,parking_info,open_time")
            .eq("id", s.building_id)
            .single(),
          supabase
            .from("floors")
            .select("id,label,has_restroom,restroom_code,restroom_location")
            .eq("building_id", s.building_id)
            .eq("label", s.floor_label)
            .maybeSingle(),
          supabase
            .from("stores")
            .select("id,name,category,is_open")
            .eq("building_id", s.building_id)
            .eq("floor_label", s.floor_label)
            .neq("id", storeId)
            .neq("name", "공실")
            .limit(4),
          supabase
            .from("store_reviews")
            .select("id,nickname,rating,content,created_at")
            .eq("store_id", storeId)
            .eq("is_visible", true)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        if (bRes.data) setBuilding(bRes.data as BuildingRow);
        if (fRes.data) setFloor(fRes.data as FloorRow);
        setSiblings((sibRes.data ?? []) as SiblingStore[]);
        setReviews((revRes.data ?? []) as ReviewRow[]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [storeId]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#f5f5f7] flex items-center justify-center">
        <p className="text-[#86868b] text-[15px]">불러오는 중...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-dvh bg-[#f5f5f7] flex items-center justify-center">
        <div className="text-center px-8">
          <p className="text-4xl mb-3">🏢</p>
          <p className="text-[17px] font-bold text-[#1d1d1f]">매장을 찾을 수 없어요</p>
          <button onClick={() => router.back()} className="mt-4 h-11 px-6 bg-[#3182F6] rounded-xl text-white text-[15px] font-bold">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  async function submitReview() {
    if (!reviewNickname.trim()) return;
    setReviewSubmitting(true);
    try {
      await fetch("/api/stores/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          nickname: reviewNickname.trim(),
          rating: reviewRating,
          content: reviewContent.trim() || undefined,
        }),
      });
      setReviewSent(true);
      setShowReviewForm(false);
      // reload reviews
      const res = await supabase
        .from("store_reviews")
        .select("id,nickname,rating,content,created_at")
        .eq("store_id", storeId)
        .eq("is_visible", true)
        .order("created_at", { ascending: false })
        .limit(20);
      setReviews((res.data ?? []) as ReviewRow[]);
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function submitSuggestion() {
    if (!suggestionMessage.trim() && suggestionType === "other") return;
    if (!store) return;
    setSuggestionSubmitting(true);
    try {
      await fetch("/api/stores/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestion_type: suggestionType,
          store_id: storeId,
          store_name: store.name,
          message: suggestionMessage.trim() || undefined,
          contact: suggestionContact.trim() || undefined,
        }),
      });
      setSuggestionSent(true);
      setShowSuggestionForm(false);
    } finally {
      setSuggestionSubmitting(false);
    }
  }

  const extra = store.extra_info ?? {};
  const amenities = Array.isArray(extra.amenities) ? (extra.amenities as string[]) : [];
  const paymentMethods = Array.isArray(extra.payment_methods) ? (extra.payment_methods as string[]) : [];
  const keywords = Array.isArray(extra.keywords) ? (extra.keywords as string[]) : [];
  const snsWebsite = (extra.sns_website as string | undefined) ?? "";
  const snsBlog = (extra.sns_blog as string | undefined) ?? "";
  const snsYoutube = (extra.sns_youtube as string | undefined) ?? "";
  const snsInstagram = (extra.sns_instagram as string | undefined) ?? "";
  const hasSns = snsWebsite || snsBlog || snsYoutube || snsInstagram;
  const parkingNote = (extra.parking_note as string | undefined) ?? "";
  const parkingType = (extra.parking as string | undefined) ?? "";
  const parkingLabel = parkingType === "free" ? "무료" : parkingType === "paid" ? "유료" : parkingType === "none" ? "없음" : "";

  const catExtraLabels = CAT_EXTRA_LABELS[store.category] ?? {};
  const catExtraEntries = Object.entries(catExtraLabels).filter(([k]) => {
    const v = extra[k];
    return v !== undefined && v !== null && v !== "";
  });

  const parkingDisplay = parkingLabel
    ? (parkingNote ? `${parkingLabel} · ${parkingNote}` : parkingLabel)
    : (parkingNote || building?.parking_info || null);

  return (
    <div className="min-h-dvh bg-[#f5f5f7]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 bg-white sticky top-0 z-10 border-b border-[#f5f5f7]">
        <button onClick={() => router.back()} className="active:scale-90 transition-transform duration-100">
          <ChevronLeft size={24} className="text-[#1d1d1f]" />
        </button>
        <h1 className="text-[18px] font-bold text-[#1d1d1f] truncate mx-2">{store.name}</h1>
        <div className="w-6" />
      </div>

      <div className="pb-8 space-y-3">
        {/* Hero card — gradient banner + white info area */}
        <div className="bg-white overflow-hidden">
          {/* 카테고리 그라디언트 배너 */}
          {(() => {
            const [gFrom, gTo] = (catGrads as Record<string, [string, string]>)[store.category] ?? ["#6B7280", "#4B5563"];
            return (
              <div className="relative h-[120px] flex items-center justify-center overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${gFrom}, ${gTo})` }}>
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/[0.08] pointer-events-none" />
                <div className="absolute left-4 bottom-4 w-12 h-12 rounded-full bg-white/[0.06] pointer-events-none" />
                <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <StoreLogo name={store.name} category={store.category} size={56} rounded="rounded-xl" />
                </div>
              </div>
            );
          })()}

          <div className="px-5 pt-4 pb-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${catBg[store.category as keyof typeof catBg] ?? "bg-[#F3F4F6] text-[#374151]"}`}>
                    {store.category}
                  </span>
                  {store.is_premium && (
                    <span className="text-[12px] font-bold bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full">⭐ 인기</span>
                  )}
                </div>
                <h2 className="text-[24px] font-black text-[#1d1d1f] leading-tight">{store.name}</h2>
                <div className="flex items-center gap-3 mt-1.5">
                  {store.is_open !== null && (
                    <span className={`text-[14px] font-bold ${store.is_open ? "text-[#00C471]" : "text-[#F04452]"}`}>
                      {store.is_open ? "● 영업 중" : "● 영업 종료"}
                    </span>
                  )}
                </div>
              </div>
              {store.phone && (
                <a href={`tel:${store.phone}`}
                  className="shrink-0 h-10 px-5 rounded-xl text-white text-[14px] font-bold flex items-center gap-1.5 active:scale-[0.97] transition-transform duration-100"
                  style={{ background: "linear-gradient(135deg, #3182F6, #2563EB)", boxShadow: "0 4px 14px rgba(49,130,246,0.35)" }}>
                  <Phone size={14} />전화
                </a>
              )}
            </div>

          {/* 소개 */}
          {(store.description || keywords.length > 0) && (
            <div className="mb-4 space-y-2">
              {store.description && (
                <p className="text-[14px] text-[#424245] leading-relaxed">{store.description}</p>
              )}
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map(kw => (
                    <span key={kw} className="text-[12px] font-medium bg-[#F2F4F6] text-[#4E5968] px-2.5 py-1 rounded-full">
                      #{kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 상세 정보 rows */}
          <div className="space-y-2.5">
            {building && (
              <div className="flex items-center gap-3 bg-[#f5f5f7] rounded-xl px-4 py-3">
                <MapPin size={16} className="text-[#6e6e73] shrink-0" />
                <div>
                  <p className="text-[12px] text-[#6e6e73]">위치</p>
                  <p className="text-[15px] font-medium text-[#1d1d1f]">{building.name} {store.floor_label}</p>
                  <p className="text-[13px] text-[#6e6e73]">{building.address}</p>
                </div>
              </div>
            )}
            {(store.hours || store.structured_hours) && (
              <div className="flex items-start gap-3 bg-[#f5f5f7] rounded-xl px-4 py-3">
                <Clock size={16} className="text-[#6e6e73] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[#6e6e73] mb-1">영업시간</p>
                  {store.structured_hours ? (
                    <div className="space-y-0.5">
                      {(["mon","tue","wed","thu","fri","sat","sun"] as const).map((d, i) => {
                        const label = ["월","화","수","목","금","토","일"][i];
                        const day = store.structured_hours?.[d];
                        return day ? (
                          <div key={d} className={`flex items-center gap-2 text-[13px] ${day.closed ? "text-[#6e6e73]" : "text-[#1d1d1f]"}`}>
                            <span className="w-4 font-medium">{label}</span>
                            <span>{day.closed ? "휴무" : `${day.open} ~ ${day.close}`}</span>
                          </div>
                        ) : null;
                      })}
                      {store.break_time && (
                        <p className="text-[12px] text-[#6e6e73] mt-1">
                          브레이크타임 {store.break_time.start}~{store.break_time.end}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[15px] font-medium text-[#1d1d1f]">{store.hours}</p>
                  )}
                  {store.closed_days && store.closed_days.length > 0 && (
                    <p className="text-[12px] text-[#6e6e73] mt-1">휴무: {store.closed_days.join(", ")}</p>
                  )}
                </div>
              </div>
            )}
            {store.phone && (
              <div className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-[#6e6e73] shrink-0" />
                  <div>
                    <p className="text-[12px] text-[#6e6e73]">전화번호</p>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">{store.phone}</p>
                  </div>
                </div>
                <a href={`tel:${store.phone}`}
                  className="h-9 px-4 bg-[#3182F6] rounded-xl text-white text-[14px] font-bold flex items-center active:opacity-80">
                  전화
                </a>
              </div>
            )}
            {parkingDisplay && (
              <div className="flex items-center gap-3 bg-[#f5f5f7] rounded-xl px-4 py-3">
                <ParkingSquare size={16} className="text-[#3182F6] shrink-0" />
                <div>
                  <p className="text-[12px] text-[#6e6e73]">주차</p>
                  <p className="text-[15px] font-medium text-[#1d1d1f]">{parkingDisplay}</p>
                </div>
              </div>
            )}
            {floor?.has_restroom && (
              <div className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <Lock size={16} className="text-[#6e6e73] shrink-0" />
                  <div>
                    <p className="text-[12px] text-[#6e6e73]">{store.floor_label} 화장실</p>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">
                      {showCode && floor.restroom_code
                        ? `비밀번호: ${floor.restroom_code}`
                        : "비밀번호 잠금"}
                    </p>
                    {floor.restroom_location && (
                      <p className="text-[12px] text-[#6e6e73]">{floor.restroom_location}</p>
                    )}
                  </div>
                </div>
                {floor.restroom_code && (
                  <button onClick={() => setShowCode(s => !s)}
                    className="h-9 px-4 bg-[#e8f1fd] rounded-xl text-[#3182F6] text-[14px] font-bold flex items-center active:opacity-80">
                    {showCode ? "숨기기" : "보기"}
                  </button>
                )}
              </div>
            )}
          </div>
          </div>{/* end px-5 */}
        </div>{/* end hero card */}

        {/* 편의시설 */}
        {amenities.length > 0 && (
          <div className="bg-white px-5 py-4">
            <p className="text-[16px] font-bold text-[#1d1d1f] mb-3">편의시설</p>
            <div className="flex flex-wrap gap-2">
              {amenities.map(a => (
                <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F4F6] rounded-full text-[13px] text-[#4E5968]">
                  <span>{AMENITY_EMOJI[a] ?? "✓"}</span> {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 결제수단 */}
        {paymentMethods.length > 0 && (
          <div className="bg-white px-5 py-4">
            <p className="text-[16px] font-bold text-[#1d1d1f] mb-3">결제수단</p>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map(p => (
                <span key={p} className="px-3 py-1.5 bg-[#e8f1fd] rounded-full text-[13px] text-[#3182F6] font-medium">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 업종별 정보 */}
        {catExtraEntries.length > 0 && (
          <div className="bg-white px-5 py-4">
            <p className="text-[16px] font-bold text-[#1d1d1f] mb-3">상세 정보</p>
            <div className="space-y-2.5">
              {catExtraEntries.map(([key, label]) => {
                const val = extra[key];
                let display: string;
                if (typeof val === "boolean") {
                  display = val ? "예" : "아니오";
                } else {
                  display = String(val);
                }
                return (
                  <div key={key} className="flex items-start gap-3 bg-[#f5f5f7] rounded-xl px-4 py-3">
                    <div>
                      <p className="text-[12px] text-[#6e6e73]">{label}</p>
                      <p className="text-[15px] font-medium text-[#1d1d1f]">{display}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SNS */}
        {hasSns && (
          <div className="bg-white px-5 py-4">
            <p className="text-[16px] font-bold text-[#1d1d1f] mb-3">온라인</p>
            <div className="flex flex-wrap gap-2">
              {snsWebsite && (
                <a href={snsWebsite} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 h-9 px-4 bg-[#f5f5f7] rounded-xl text-[13px] text-[#1d1d1f] font-medium active:opacity-70">
                  <Globe size={14} /> 홈페이지
                </a>
              )}
              {snsBlog && (
                <a href={snsBlog} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 h-9 px-4 bg-[#f5f5f7] rounded-xl text-[13px] text-[#1d1d1f] font-medium active:opacity-70">
                  <BookOpen size={14} /> 블로그
                </a>
              )}
              {snsYoutube && (
                <a href={snsYoutube} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 h-9 px-4 bg-[#f5f5f7] rounded-xl text-[13px] text-[#FF0000] font-medium active:opacity-70">
                  <ExternalLink size={14} /> 유튜브
                </a>
              )}
              {snsInstagram && (
                <a href={`https://instagram.com/${snsInstagram.replace(/^@/, "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 h-9 px-4 bg-[#f5f5f7] rounded-xl text-[13px] text-[#E1306C] font-medium active:opacity-70">
                  <ExternalLink size={14} /> 인스타그램
                </a>
              )}
            </div>
          </div>
        )}

        {/* 방문 후기 */}
        <div className="bg-white px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[16px] font-bold text-[#1d1d1f]">
              방문 후기 {reviews.length > 0 && <span className="text-[14px] font-normal text-[#6e6e73]">({reviews.length})</span>}
            </p>
            {!showReviewForm && !reviewSent && (
              <button onClick={() => setShowReviewForm(true)}
                className="h-8 px-3 bg-[#e8f1fd] rounded-xl text-[13px] text-[#0071e3] font-bold active:opacity-70 flex items-center gap-1">
                <Star size={12} className="text-[#FFBB00]" /> 후기 쓰기
              </button>
            )}
          </div>

          {/* 후기 작성 폼 */}
          {showReviewForm && (
            <div className="mb-4 p-4 bg-[#f5f5f7] rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#1d1d1f]">후기 작성</span>
                <button onClick={() => setShowReviewForm(false)}><X size={16} className="text-[#6e6e73]" /></button>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setReviewRating(n)}
                    className={`text-2xl transition-transform active:scale-90 ${n <= reviewRating ? "opacity-100" : "opacity-30"}`}>
                    ⭐
                  </button>
                ))}
              </div>
              <input
                value={reviewNickname}
                onChange={e => setReviewNickname(e.target.value)}
                placeholder="닉네임 *"
                className="w-full border border-[#d2d2d7] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#0071e3] bg-white" />
              <textarea
                value={reviewContent}
                onChange={e => setReviewContent(e.target.value)}
                placeholder="후기를 남겨주세요 (선택)"
                rows={3}
                className="w-full border border-[#d2d2d7] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#0071e3] bg-white resize-none" />
              <button
                onClick={submitReview}
                disabled={reviewSubmitting || !reviewNickname.trim()}
                className="w-full h-11 bg-[#0071e3] rounded-xl text-white text-[14px] font-bold disabled:opacity-40 flex items-center justify-center gap-1.5">
                <Send size={14} /> {reviewSubmitting ? "등록 중..." : "후기 등록"}
              </button>
            </div>
          )}

          {reviewSent && (
            <div className="mb-3 flex items-center gap-2 px-4 py-3 bg-[#D1FAE5] rounded-xl">
              <CheckCircle2 size={16} className="text-[#00C471]" />
              <span className="text-[14px] text-[#065F46] font-medium">후기가 등록됐어요. 감사해요!</span>
            </div>
          )}

          {/* 후기 목록 */}
          {reviews.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-3xl mb-2">💬</p>
              <p className="text-[15px] font-medium text-[#1d1d1f]">아직 후기가 없어요</p>
              <p className="text-[14px] text-[#6e6e73] mt-1">첫 번째 후기를 남겨보세요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="bg-[#f5f5f7] rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-bold text-[#1d1d1f]">{r.nickname}</span>
                    <span className="text-[11px] text-[#6e6e73]">{new Date(r.created_at).toLocaleDateString("ko-KR")}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mb-1.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={`text-sm ${i < r.rating ? "text-[#FFBB00]" : "text-[#d2d2d7]"}`}>★</span>
                    ))}
                  </div>
                  {r.content && <p className="text-[13px] text-[#424245] leading-relaxed">{r.content}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 같은 층 매장 */}
        {siblings.length > 0 && (
          <div className="bg-white px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[16px] font-bold text-[#1d1d1f]">{store.floor_label} 다른 매장</p>
              <button onClick={() => router.push("/stores/")} className="flex items-center gap-0.5 text-[14px] text-[#3182F6] font-medium active:opacity-60">
                지도 보기 <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {siblings.map((s, i) => (
                <button key={s.id}
                  onClick={() => router.push(`/stores/detail/?id=${s.id}`)}
                  className="card-enter flex items-center gap-2.5 bg-[#f5f5f7] rounded-xl px-3 py-3 active:scale-[0.96] transition-transform duration-100 text-left"
                  style={{ animationDelay: `${i * 60}ms` }}>
                  <StoreLogo name={s.name} category={s.category} size={32} rounded="rounded-lg" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{s.name}</p>
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${s.is_open !== false ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                      {s.is_open !== false ? "영업 중" : "영업 종료"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 정보 수정 제안 */}
        <div className="mx-4">
          {suggestionSent ? (
            <div className="w-full h-12 bg-[#D1FAE5] rounded-2xl flex items-center justify-center gap-2">
              <CheckCircle2 size={16} className="text-[#00C471]" />
              <span className="text-[14px] text-[#065F46] font-medium">제안이 접수됐어요. 감사해요!</span>
            </div>
          ) : showSuggestionForm ? (
            <div className="bg-white rounded-2xl border border-[#d2d2d7] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-[#1d1d1f]">정보 제안하기</span>
                <button onClick={() => setShowSuggestionForm(false)}><X size={16} className="text-[#6e6e73]" /></button>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[#6e6e73] mb-1.5">제안 유형</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTION_TYPES.map(t => (
                    <button key={t} onClick={() => setSuggestionType(t)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                        suggestionType === t
                          ? "bg-[#0071e3] border-[#0071e3] text-white"
                          : "border-[#d2d2d7] text-[#424245] hover:border-[#0071e3]"
                      }`}>
                      {SUGGESTION_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={suggestionMessage}
                onChange={e => setSuggestionMessage(e.target.value)}
                placeholder="변경된 내용이나 추가 정보를 알려주세요"
                rows={3}
                className="w-full border border-[#d2d2d7] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#0071e3] resize-none" />
              <input
                value={suggestionContact}
                onChange={e => setSuggestionContact(e.target.value)}
                placeholder="연락처 (선택 — 확인 후 안내드려요)"
                className="w-full border border-[#d2d2d7] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#0071e3]" />
              <button
                onClick={submitSuggestion}
                disabled={suggestionSubmitting}
                className="w-full h-11 bg-[#1d1d1f] rounded-xl text-white text-[14px] font-bold disabled:opacity-40 flex items-center justify-center gap-1.5">
                <Send size={14} /> {suggestionSubmitting ? "제출 중..." : "제안 보내기"}
              </button>
            </div>
          ) : (
            <button onClick={() => setShowSuggestionForm(true)}
              className="w-full h-12 border border-[#d2d2d7] bg-white rounded-2xl flex items-center justify-center gap-2 text-[14px] text-[#424245] font-medium active:bg-[#f5f5f7]">
              <Pencil size={14} className="text-[#6e6e73]" /> 정보 제안하기 (신규·폐점·변경)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StoreDetailPage() {
  return <Suspense><DetailContent /></Suspense>;
}
