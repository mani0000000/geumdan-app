"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, MapPin, Clock, Phone, Globe, Car,
  Bookmark, BookmarkCheck, ChevronRight,
} from "lucide-react";
import {
  fetchPublishedPlaces, CATEGORY_META,
  type Place, type PlaceCategory,
} from "@/lib/db/places";
import {
  addFavoritePlace, removeFavoritePlace, isFavoritePlace,
} from "@/lib/db/placeFavorites";
import { supabase } from "@/lib/supabase";

export async function generateStaticParams() {
  try {
    const { data } = await supabase.from("places").select("id").eq("is_published", true);
    if (data && data.length > 0) return data.map((p: { id: string }) => ({ id: String(p.id) }));
  } catch { /* fallback */ }
  return [];
}

// ── 카테고리별 그라디언트 ──────────────────────────────────────
const CAT_GRADS: Record<PlaceCategory, [string, string]> = {
  kids:    ["#3182F6", "#38BDF8"],
  nature:  ["#2E7D32", "#4CAF50"],
  culture: ["#6B21A8", "#9C27B0"],
  travel:  ["#C2410C", "#F97316"],
  food:    ["#9D5C00", "#F59E0B"],
};

export default function PlaceDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [place, setPlace]     = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved]     = useState(false);

  // ── 장소 데이터 로드 ─────────────────────────────────────────
  useEffect(() => {
    fetchPublishedPlaces().then(places => {
      const found = places.find(p => p.id === id) ?? null;
      setPlace(found);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  // ── 즐겨찾기 상태 로드 ───────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    isFavoritePlace(id).then(setSaved);
  }, [id]);

  // ── 즐겨찾기 토글 ────────────────────────────────────────────
  async function toggleSave() {
    if (!place) return;
    if (saved) {
      await removeFavoritePlace(place.id);
      setSaved(false);
    } else {
      await addFavoritePlace({
        place_id: place.id,
        place_name: place.name,
        place_category: place.category,
        place_area: place.area ?? "",
        place_image_url: place.thumbnail_url ?? null,
        place_address: place.address ?? "",
      });
      setSaved(true);
    }
  }

  // ── 카카오맵 열기 ────────────────────────────────────────────
  function openKakaoMap() {
    if (!place) return;
    const query = place.address || place.name;
    const url = place.lat && place.lng
      ? `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.lat},${place.lng}`
      : `https://map.kakao.com/link/search/${encodeURIComponent(query)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ── 로딩 스켈레톤 ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-dvh bg-[#f5f5f7]">
        <div className="h-[300px] bg-[#e5e5ea] animate-pulse" />
        <div className="px-5 pt-5 space-y-3">
          <div className="h-7 w-2/3 bg-[#e5e5ea] rounded-xl animate-pulse" />
          <div className="h-4 w-1/2 bg-[#e5e5ea] rounded-xl animate-pulse" />
          <div className="h-4 w-full bg-[#e5e5ea] rounded-xl animate-pulse" />
          <div className="h-4 w-full bg-[#e5e5ea] rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // ── 장소 없음 ────────────────────────────────────────────────
  if (!place) {
    return (
      <div className="min-h-dvh bg-[#f5f5f7] flex flex-col items-center justify-center gap-4">
        <MapPin size={48} className="text-[#c7c7cc]" />
        <p className="text-[#86868b] text-[15px]">장소를 찾을 수 없습니다</p>
        <button onClick={() => router.back()}
          className="text-[#3182F6] text-[15px] font-semibold">
          돌아가기
        </button>
      </div>
    );
  }

  const cat = CATEGORY_META[place.category];
  const [gFrom, gTo] = CAT_GRADS[place.category];

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-32">

      {/* ── 히어로 이미지 영역 ── */}
      <div className="relative h-[300px] md:h-[380px]"
        style={place.thumbnail_url ? {} : { background: `linear-gradient(135deg, ${gFrom}, ${gTo})` }}>
        {place.thumbnail_url
          ? <>
              <img src={place.thumbnail_url} alt={place.name}
                className="w-full h-full object-cover" />
              <div className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 45%, rgba(0,0,0,0.15) 100%)" }} />
            </>
          : <div className="absolute inset-0 flex items-end justify-end p-8 opacity-20">
              <MapPin size={120} className="text-white" />
            </div>
        }

        {/* 뒤로가기 + 저장 버튼 */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-[env(safe-area-inset-top,0px)] pt-4">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center active:opacity-60">
            <ArrowLeft size={18} className="text-white" />
          </button>
          <button onClick={toggleSave}
            className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center active:opacity-60 transition-transform active:scale-90">
            {saved
              ? <BookmarkCheck size={18} className="text-[#FFE100] fill-[#FFE100]" />
              : <Bookmark size={18} className="text-white" />
            }
          </button>
        </div>

        {/* 카테고리 + 지역 배지 */}
        <div className="absolute top-[60px] left-4 flex items-center gap-1.5">
          <span className="text-[11px] font-bold bg-white/20 text-white px-2.5 py-1 rounded-full backdrop-blur-sm">
            {cat.label}
          </span>
          <span className="text-[11px] font-semibold bg-black/30 text-white px-2.5 py-1 rounded-full backdrop-blur-sm">
            {place.area}
          </span>
        </div>

        {/* 하단 제목 오버레이 */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <h1 className="text-[26px] font-black text-white leading-tight">{place.name}</h1>
          <p className="text-[14px] text-white/80 mt-1.5 line-clamp-2">{place.short_desc}</p>
          {place.drive_min && (
            <div className="flex items-center gap-1.5 mt-2">
              <Car size={12} className="text-white/70" />
              <span className="text-[12px] text-white/70 font-medium">
                검단에서 차로 약 {place.drive_min}분
                {place.distance_km ? ` · ${place.distance_km}km` : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── 본문 콘텐츠 ── */}
      <div className="px-5 pt-5 space-y-4 max-w-screen-md mx-auto">

        {/* 태그 */}
        {place.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {place.tags.map(tag => (
              <span key={tag}
                className="text-[12px] font-medium px-3 py-1 rounded-full"
                style={{ color: cat.color, background: cat.bg }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 설명 */}
        {place.description && (
          <div className="bg-white rounded-2xl px-5 py-4">
            <p className="text-[14px] text-[#1d1d1f] leading-relaxed whitespace-pre-line">
              {place.description}
            </p>
          </div>
        )}

        {/* 상세 정보 카드 */}
        {(place.operating_hours || place.admission_fee || place.address || place.phone || place.website) && (
          <div className="bg-white rounded-2xl px-4 py-2 divide-y divide-[#f0f0f3]">
            {place.operating_hours && (
              <div className="flex items-start gap-3 py-3.5">
                <div className="w-8 h-8 rounded-xl bg-[#e8f1fd] flex items-center justify-center shrink-0">
                  <Clock size={14} className="text-[#3182F6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#86868b] font-semibold mb-0.5">운영시간</p>
                  <p className="text-[13px] text-[#1d1d1f] font-medium">{place.operating_hours}</p>
                </div>
              </div>
            )}
            {place.admission_fee && (
              <div className="flex items-start gap-3 py-3.5">
                <div className="w-8 h-8 rounded-xl bg-[#E8F5E9] flex items-center justify-center shrink-0">
                  <span className="text-[13px] font-black text-[#2E7D32]">₩</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#86868b] font-semibold mb-0.5">입장료</p>
                  <p className="text-[13px] text-[#1d1d1f] font-medium">{place.admission_fee}</p>
                </div>
              </div>
            )}
            {place.address && (
              <div className="flex items-start gap-3 py-3.5">
                <div className="w-8 h-8 rounded-xl bg-[#fff1f0] flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-[#F04452]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#86868b] font-semibold mb-0.5">주소</p>
                  <p className="text-[13px] text-[#1d1d1f] font-medium">{place.address}</p>
                </div>
              </div>
            )}
            {place.phone && (
              <div className="flex items-center gap-3 py-3.5">
                <div className="w-8 h-8 rounded-xl bg-[#e8f1fd] flex items-center justify-center shrink-0">
                  <Phone size={14} className="text-[#3182F6]" />
                </div>
                <a href={`tel:${place.phone}`}
                  className="text-[13px] text-[#3182F6] font-semibold">
                  {place.phone}
                </a>
              </div>
            )}
            {place.website && (
              <div className="flex items-center gap-3 py-3.5">
                <div className="w-8 h-8 rounded-xl bg-[#e8f1fd] flex items-center justify-center shrink-0">
                  <Globe size={14} className="text-[#3182F6]" />
                </div>
                <a href={place.website} target="_blank" rel="noopener noreferrer"
                  className="text-[13px] text-[#3182F6] font-semibold truncate flex-1">
                  {place.website.replace(/^https?:\/\//, "")}
                </a>
                <ChevronRight size={14} className="text-[#c7c7cc] shrink-0" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 하단 고정 CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-[env(safe-area-inset-bottom,16px)] pb-5 pt-3 bg-white/90 backdrop-blur-md border-t border-[#f0f0f3]">
        <button onClick={openKakaoMap}
          className="w-full h-[52px] bg-[#FEE500] rounded-2xl flex items-center justify-center gap-2 active:opacity-80 transition-opacity max-w-screen-md mx-auto">
          <MapPin size={18} className="text-[#1d1d1f]" />
          <span className="text-[15px] font-bold text-[#1d1d1f]">카카오맵에서 보기</span>
        </button>
      </div>

    </div>
  );
}
