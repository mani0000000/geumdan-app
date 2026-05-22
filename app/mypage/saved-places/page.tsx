"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MapPin, Trash2, Star } from "lucide-react";
import { getFavoritePlaces, removeFavoritePlace, type FavoritePlace } from "@/lib/db/placeFavorites";

const CATEGORY_EMOJI: Record<string, string> = {
  "공원": "🌳",
  "문화": "🎭",
  "체육": "⚽",
  "카페": "☕",
  "맛집": "🍽️",
  "쇼핑": "🛍️",
  "교육": "📚",
  "의료": "🏥",
  default: "📍",
};

export default function SavedPlacesPage() {
  const router = useRouter();
  const [places, setPlaces] = useState<FavoritePlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    getFavoritePlaces().then((data) => {
      setPlaces(data);
      setLoading(false);
    });
  }, []);

  async function handleRemove(placeId: string) {
    setRemoving(placeId);
    await removeFavoritePlace(placeId);
    setPlaces((prev) => prev.filter((p) => p.place_id !== placeId));
    setRemoving(null);
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-12">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[#f5f5f7]">
        <div className="flex items-center h-14 px-4 gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-[#f5f5f7]"
          >
            <ChevronLeft size={22} className="text-[#1d1d1f]" />
          </button>
          <h1 className="text-[17px] font-bold text-[#1d1d1f] flex-1">저장한 가볼만한곳</h1>
          <span className="text-[14px] text-[#6e6e73]">{places.length}곳</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center mt-20">
          <p className="text-[15px] text-[#6e6e73]">불러오는 중...</p>
        </div>
      ) : places.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 gap-3 px-8">
          <Star size={44} className="text-[#d2d2d7]" />
          <p className="text-[15px] text-[#6e6e73]">저장한 장소가 없습니다.</p>
          <p className="text-[13px] text-[#86868b] text-center">홈 또는 교통 탭의 가볼만한곳에서 ⭐ 버튼을 눌러 저장해 보세요.</p>
          <button
            onClick={() => router.push("/transport/?tab=가볼만한곳")}
            className="mt-2 h-10 px-6 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium"
          >
            가볼만한곳 보기
          </button>
        </div>
      ) : (
        <div className="mx-4 mt-4 space-y-2">
          {places.map((place) => {
            const emoji = CATEGORY_EMOJI[place.place_category] ?? CATEGORY_EMOJI.default;
            return (
              <div
                key={place.place_id}
                className="bg-white rounded-2xl overflow-hidden flex gap-3 items-center p-3 shadow-sm"
              >
                {/* 썸네일 */}
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[#f5f5f7] flex items-center justify-center">
                  {place.place_image_url ? (
                    <img
                      src={place.place_image_url}
                      alt={place.place_name}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <span className="text-[28px]">{emoji}</span>
                  )}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {place.place_category && (
                      <span className="text-[10px] font-bold text-[#0071e3] bg-[#EFF6FF] px-1.5 py-0.5 rounded-full">
                        {place.place_category}
                      </span>
                    )}
                    {place.place_area && (
                      <span className="text-[10px] text-[#86868b]">{place.place_area}</span>
                    )}
                  </div>
                  <p className="text-[15px] font-bold text-[#1d1d1f] truncate">{place.place_name}</p>
                  {place.place_address && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={10} className="text-[#86868b] shrink-0" />
                      <p className="text-[11px] text-[#86868b] truncate">{place.place_address}</p>
                    </div>
                  )}
                </div>

                {/* 삭제 버튼 */}
                <button
                  onClick={() => handleRemove(place.place_id)}
                  disabled={removing === place.place_id}
                  className="p-2 rounded-xl hover:bg-[#FFF0F0] active:bg-[#FFF0F0] text-[#F04452] shrink-0 disabled:opacity-40"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
