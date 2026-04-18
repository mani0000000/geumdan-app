"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Clock, Phone, MapPin, Star, ParkingSquare, Lock, Pencil, CheckCircle2, ChevronRight } from "lucide-react";
import { findStoreById } from "@/lib/utils";
import type { StoreCategory } from "@/lib/types";

const catEmoji: Record<StoreCategory, string> = {
  카페: "☕", 음식점: "🍽️", 편의점: "🏪", "병원/약국": "💊",
  미용: "💇", 학원: "📚", 마트: "🛒", 기타: "🏢",
};
const catBg: Record<StoreCategory, string> = {
  카페: "bg-[#FEF3C7] text-[#92400E]",
  음식점: "bg-[#FEE2E2] text-[#991B1B]",
  편의점: "bg-[#e8f1fd] text-[#1E40AF]",
  "병원/약국": "bg-[#FEE2E2] text-[#991B1B]",
  미용: "bg-[#FCE7F3] text-[#9D174D]",
  학원: "bg-[#EDE9FE] text-[#5B21B6]",
  마트: "bg-[#D1FAE5] text-[#065F46]",
  기타: "bg-[#F3F4F6] text-[#374151]",
};
const catDot: Record<StoreCategory, string> = {
  카페: "#F59E0B", 음식점: "#F97316", 편의점: "#3B82F6",
  "병원/약국": "#EF4444", 미용: "#EC4899", 학원: "#8B5CF6",
  마트: "#10B981", 기타: "#9CA3AF",
};

// Mock reviews per store
const mockReviews: Record<string, { author: string; text: string; rating: number; date: string }[]> = {
  "s_b1_3": [
    { author: "당하맘", rating: 5, text: "검단에서 제일 좋은 스타벅스예요! 자리도 넓고 조용해요 ☕", date: "2026-03-25" },
    { author: "커피러버", rating: 4, text: "드라이브스루 빠르고 직원분들 친절해요.", date: "2026-03-20" },
  ],
  "s_1f_1": [
    { author: "뷰티퀸", rating: 5, text: "제품 종류가 다양해서 자주 들러요. 멤버십 할인도 좋아요!", date: "2026-03-26" },
  ],
  "s_2f_1": [
    { author: "먹부림러", rating: 4, text: "버거 퀄리티가 진짜 좋아요. 점심시간엔 좀 붐비지만 맛있어요!", date: "2026-03-27" },
    { author: "검단주민", rating: 5, text: "가성비 최고. 세트 메뉴 추천!", date: "2026-03-22" },
  ],
  "s_3f_1": [
    { author: "외식러버", rating: 5, text: "백종원 브랜드라서 믿고 먹어요. 맛도 가격도 다 좋아요!", date: "2026-03-28" },
    { author: "가족외식", rating: 4, text: "아이들도 잘 먹어서 자주 와요. 주차도 편리해요.", date: "2026-03-24" },
    { author: "점심파", rating: 4, text: "점심 런치 메뉴 가성비 좋아요!", date: "2026-03-18" },
  ],
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={13} className={i <= rating ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#d2d2d7]"} />
      ))}
    </div>
  );
}

function DetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = searchParams.get("id") ?? "";
  const result = findStoreById(storeId);
  const [showCode, setShowCode] = useState(false);
  const [editSent, setEditSent] = useState(false);
  const [favorited, setFavorited] = useState(false);

  if (!result) {
    return (
      <div className="min-h-dvh bg-[#f5f5f7] flex items-center justify-center">
        <div className="text-center px-8">
          <p className="text-4xl mb-3">🏢</p>
          <p className="text-[17px] font-bold text-[#1d1d1f]">매장을 찾을 수 없어요</p>
          <button onClick={() => router.back()} className="mt-4 h-11 px-6 bg-[#0071e3] rounded-xl text-white text-[15px] font-bold">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const { store, floor, building } = result;
  const reviews = mockReviews[store.id] ?? [];
  const avgRating = reviews.length > 0
    ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10
    : null;

  // Nearby stores on same floor
  const nearbyStores = floor.stores.filter(s => s.id !== store.id && s.name !== "공실").slice(0, 4);

  return (
    <div className="min-h-dvh bg-[#f5f5f7]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 bg-white sticky top-0 z-10 border-b border-[#f5f5f7]">
        <button onClick={() => router.back()} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#1d1d1f]" />
        </button>
        <h1 className="text-[18px] font-bold text-[#1d1d1f] truncate mx-2">{store.name}</h1>
        <button onClick={() => setFavorited(f => !f)} className="active:opacity-60">
          <Star size={22} className={favorited ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#86868b]"} />
        </button>
      </div>

      <div className="pb-8 space-y-3">
        {/* Hero */}
        <div className="bg-white px-5 py-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-4xl shrink-0"
              style={{ background: catDot[store.category] + "18" }}>
              {catEmoji[store.category]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${catBg[store.category]}`}>
                  {store.category}
                </span>
                {store.isPremium && (
                  <span className="text-[12px] font-bold bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full">⭐ 인기</span>
                )}
              </div>
              <h2 className="text-[23px] font-black text-[#1d1d1f]">{store.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {store.isOpen !== undefined && (
                  <span className={`text-[14px] font-semibold ${store.isOpen ? "text-[#00C471]" : "text-[#F04452]"}`}>
                    {store.isOpen ? "● 영업 중" : "● 영업 종료"}
                  </span>
                )}
                {avgRating && (
                  <span className="text-[14px] text-[#424245]">★ {avgRating} ({reviews.length})</span>
                )}
              </div>
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 bg-[#f5f5f7] rounded-xl px-4 py-3">
              <MapPin size={16} className="text-[#6e6e73] shrink-0" />
              <div>
                <p className="text-[12px] text-[#6e6e73]">위치</p>
                <p className="text-[15px] font-medium text-[#1d1d1f]">{building.name} {floor.label}</p>
                <p className="text-[13px] text-[#6e6e73]">{building.address}</p>
              </div>
            </div>
            {store.hours && (
              <div className="flex items-center gap-3 bg-[#f5f5f7] rounded-xl px-4 py-3">
                <Clock size={16} className="text-[#6e6e73] shrink-0" />
                <div>
                  <p className="text-[12px] text-[#6e6e73]">영업시간</p>
                  <p className="text-[15px] font-medium text-[#1d1d1f]">{store.hours}</p>
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
                  className="h-9 px-4 bg-[#0071e3] rounded-xl text-white text-[14px] font-bold flex items-center active:opacity-80">
                  전화
                </a>
              </div>
            )}
            <div className="flex items-center gap-3 bg-[#f5f5f7] rounded-xl px-4 py-3">
              <ParkingSquare size={16} className="text-[#0071e3] shrink-0" />
              <div>
                <p className="text-[12px] text-[#6e6e73]">주차</p>
                <p className="text-[15px] font-medium text-[#1d1d1f]">{building.parkingInfo}</p>
              </div>
            </div>
            {floor.hasRestroom && (
              <div className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <Lock size={16} className="text-[#6e6e73] shrink-0" />
                  <div>
                    <p className="text-[12px] text-[#6e6e73]">{floor.label} 화장실</p>
                    <p className="text-[15px] font-medium text-[#1d1d1f]">
                      {showCode && floor.restroomCode ? `비밀번호: ${floor.restroomCode}` : "비밀번호 잠금"}
                    </p>
                  </div>
                </div>
                {floor.restroomCode && (
                  <button onClick={() => setShowCode(s => !s)}
                    className="h-9 px-4 bg-[#e8f1fd] rounded-xl text-[#0071e3] text-[14px] font-bold flex items-center active:opacity-80">
                    {showCode ? "숨기기" : "보기"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-white px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[16px] font-bold text-[#1d1d1f]">방문 후기</p>
            {avgRating && (
              <div className="flex items-center gap-2">
                <StarRating rating={Math.round(avgRating)} />
                <span className="text-[15px] font-bold text-[#1d1d1f]">{avgRating}</span>
                <span className="text-[13px] text-[#6e6e73]">({reviews.length})</span>
              </div>
            )}
          </div>
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((r, i) => (
                <div key={i} className={`pb-3 ${i < reviews.length - 1 ? "border-b border-[#f5f5f7]" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#e8f1fd] flex items-center justify-center text-sm">
                        {r.author[0]}
                      </div>
                      <span className="text-[14px] font-medium text-[#1d1d1f]">{r.author}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={r.rating} />
                      <span className="text-[12px] text-[#86868b]">{r.date}</span>
                    </div>
                  </div>
                  <p className="text-[14px] text-[#424245] leading-relaxed pl-9">{r.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-3xl mb-2">💬</p>
              <p className="text-[15px] font-medium text-[#1d1d1f]">아직 후기가 없어요</p>
              <p className="text-[14px] text-[#6e6e73] mt-1">첫 번째 후기를 남겨보세요</p>
            </div>
          )}
          <button className="mt-3 w-full h-11 border border-[#d2d2d7] rounded-xl text-[14px] text-[#424245] font-medium active:bg-[#f5f5f7] flex items-center justify-center gap-1.5">
            <Star size={14} className="text-[#FFBB00]" /> 후기 작성하기
          </button>
        </div>

        {/* Same floor stores */}
        {nearbyStores.length > 0 && (
          <div className="bg-white px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[16px] font-bold text-[#1d1d1f]">{floor.label} 다른 매장</p>
              <button onClick={() => router.push("/stores/")} className="flex items-center gap-0.5 text-[14px] text-[#0071e3] font-medium active:opacity-60">
                지도 보기 <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {nearbyStores.map(s => (
                <button key={s.id}
                  onClick={() => router.push(`/stores/detail/?id=${s.id}`)}
                  className="flex items-center gap-2.5 bg-[#f5f5f7] rounded-xl px-3 py-3 active:opacity-70 text-left">
                  <span className="text-xl shrink-0">{catEmoji[s.category]}</span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{s.name}</p>
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${s.isOpen !== false ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                      {s.isOpen !== false ? "영업 중" : "영업 종료"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Edit suggestion */}
        <div className="mx-4">
          {!editSent ? (
            <button onClick={() => setEditSent(true)}
              className="w-full h-12 border border-[#d2d2d7] bg-white rounded-2xl flex items-center justify-center gap-2 text-[14px] text-[#424245] font-medium active:bg-[#f5f5f7]">
              <Pencil size={14} className="text-[#6e6e73]" /> 정보 수정 제안하기
            </button>
          ) : (
            <div className="w-full h-12 bg-[#D1FAE5] rounded-2xl flex items-center justify-center gap-2">
              <CheckCircle2 size={16} className="text-[#00C471]" />
              <span className="text-[14px] text-[#065F46] font-medium">제안이 접수됐어요. 감사해요!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StoreDetailPage() {
  return <Suspense><DetailContent /></Suspense>;
}
