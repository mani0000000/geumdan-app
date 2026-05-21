"use client";
import { useState, useEffect, useMemo, useRef, memo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone, Clock, Tag, MapPin,
  ChevronRight, X,
  Search, List, Map as MapIcon,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import StoreLogo from "@/components/ui/StoreLogo";
import CouponCard, { loadDownloaded, saveDownloaded } from "@/components/ui/CouponCard";
import { fetchBuildings, fetchAllStoresFlat } from "@/lib/db/buildings";
import { fetchRecommendedKeywords, fetchPopularKeywords, logSearch } from "@/lib/db/search-keywords";
import { fetchActiveBanners, type Banner } from "@/lib/db/banners";
import BannerCarousel from "@/components/ui/BannerCarousel";
import { fetchActiveCoupons, fetchActiveOpenings } from "@/lib/db/stores";
import type { Store, StoreCategory } from "@/lib/types";
import type { BuildingRow, FlatStore } from "@/lib/db/buildings";

const catDot: Record<StoreCategory, string> = {
  카페: "#F59E0B", 음식점: "#F97316", 편의점: "#3B82F6",
  "병원/약국": "#EF4444", 미용: "#EC4899", 학원: "#8B5CF6",
  마트: "#10B981", "헬스/운동": "#0EA5E9", 반려동물: "#F472B6",
  세탁: "#6366F1",
  베이커리: "#D97706", 부동산: "#0EA5A8", 스터디카페: "#7C3AED",
  안경원: "#0F766E", 꽃집: "#DB2777",
  기타: "#9CA3AF",
};
const catEmoji: Record<StoreCategory, string> = {
  카페:"☕", 음식점:"🍽️", 편의점:"🏪", "병원/약국":"💊", 미용:"💇",
  학원:"📚", 마트:"🛒", "헬스/운동":"💪", 반려동물:"🐾", 세탁:"👕",
  베이커리:"🥐", 부동산:"🏘️", 스터디카페:"📖", 안경원:"👓", 꽃집:"💐",
  기타:"🏢",
};
const catBg: Record<StoreCategory, string> = {
  카페:"bg-[#FEF3C7] text-[#92400E]", 음식점:"bg-[#FFF0E6] text-[#C2410C]",
  편의점:"bg-[#e8f1fd] text-[#1E40AF]", "병원/약국":"bg-[#FEE2E2] text-[#991B1B]",
  미용:"bg-[#FCE7F3] text-[#9D174D]", 학원:"bg-[#EDE9FE] text-[#5B21B6]",
  마트:"bg-[#D1FAE5] text-[#065F46]", "헬스/운동":"bg-[#E0F2FE] text-[#0369A1]",
  반려동물:"bg-[#FDF2F8] text-[#9D174D]", 세탁:"bg-[#EEF2FF] text-[#4338CA]",
  베이커리:"bg-[#FEF3C7] text-[#9A3412]", 부동산:"bg-[#CCFBF1] text-[#115E59]",
  스터디카페:"bg-[#F3E8FF] text-[#6B21A8]", 안경원:"bg-[#CFFAFE] text-[#155E75]",
  꽃집:"bg-[#FCE7F3] text-[#9D174D]",
  기타:"bg-[#F3F4F6] text-[#374151]",
};


// 건물 이미지 매핑 (Unsplash 무료 이미지)
const BUILDING_IMAGES: Record<string, string> = {
  "b_jk":     "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=280&fit=crop&auto=format",
  "b_metro2": "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&h=280&fit=crop&auto=format",
  "b_aplus":  "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&h=280&fit=crop&auto=format",
  "b_syace2": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&h=280&fit=crop&auto=format",
  "b_sung":   "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=280&fit=crop&auto=format",
  "b_covent": "https://images.unsplash.com/photo-1464938050520-ef2270bb8ce8?w=600&h=280&fit=crop&auto=format",
  "b_sinahn": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=280&fit=crop&auto=format",
  "b_daseung":"https://images.unsplash.com/photo-1582139329536-e7284fece509?w=600&h=280&fit=crop&auto=format",
};
const DEFAULT_IMG = "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=280&fit=crop&auto=format";

// DB BuildingRow를 화면용 building 객체로 변환
type DirectionPhotos = {
  north: string | null; south: string | null;
  east: string | null;  west: string | null;
};

type NearbyBuilding = {
  id: string; name: string; address: string;
  lat: number; lng: number; floors: number; stores: number;
  hasData: boolean; image: string; categories: StoreCategory[]; km: number;
  photos: DirectionPhotos;
};

function rowToNearby(row: BuildingRow, userLat: number, userLng: number): NearbyBuilding {
  return {
    id: row.id, name: row.name, address: row.address,
    lat: row.lat ?? 37.586, lng: row.lng ?? 126.706,
    floors: row.floors ?? 1, stores: row.total_stores ?? 0,
    hasData: row.has_data,
    image: BUILDING_IMAGES[row.id] ?? DEFAULT_IMG,
    categories: (row.categories ?? []) as StoreCategory[],
    km: haversineKm(userLat, userLng, row.lat ?? 37.586, row.lng ?? 126.706),
    photos: {
      north: row.photo_north, south: row.photo_south,
      east: row.photo_east,   west: row.photo_west,
    },
  };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


// 업종별 대표 이미지 (Unsplash 특정 사진 ID — 안정적으로 로드됨)
const catHeroImage: Record<StoreCategory, string> = {
  카페:       "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=260&fit=crop&auto=format",
  음식점:     "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=260&fit=crop&auto=format",
  편의점:     "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&h=260&fit=crop&auto=format",
  "병원/약국":"https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=260&fit=crop&auto=format",
  미용:       "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=260&fit=crop&auto=format",
  학원:       "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=260&fit=crop&auto=format",
  마트:       "https://images.unsplash.com/photo-1534723452862-4c874986a2f6?w=600&h=260&fit=crop&auto=format",
  "헬스/운동":"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=260&fit=crop&auto=format",
  반려동물:   "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=260&fit=crop&auto=format",
  세탁:       "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600&h=260&fit=crop&auto=format",
  베이커리:   "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=260&fit=crop&auto=format",
  부동산:     "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=260&fit=crop&auto=format",
  스터디카페: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&h=260&fit=crop&auto=format",
  안경원:     "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=600&h=260&fit=crop&auto=format",
  꽃집:       "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=600&h=260&fit=crop&auto=format",
  기타:       "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=260&fit=crop&auto=format",
};

type EnrichedStore = Store & { floorLabel: string; buildingName: string };


// ─── 신규오픈 날짜 헬퍼 ─────────────────────────────────────
function getWeekBounds() {
  const now = new Date();
  const day = now.getDay(); // 0=일, 1=월
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now); mon.setDate(now.getDate() + diffToMon); mon.setHours(0,0,0,0);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
  return { mon, sun };
}
function classifyOpening(openDate: string): "week" | "month" | "none" {
  const d = new Date(openDate);
  const now = new Date();
  const { mon, sun } = getWeekBounds();
  if (d >= mon && d <= sun) return "week";
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return "month";
  return "none";
}

// ─── 매장 리스트 뷰 ──────────────────────────────────────────
const ALL_CATS = Object.keys(catDot) as StoreCategory[];

const catGrads: Record<StoreCategory, [string, string]> = {
  카페:       ["#F59E0B", "#FB923C"],
  음식점:     ["#EF4444", "#F97316"],
  편의점:     ["#3B82F6", "#06B6D4"],
  "병원/약국":["#EF4444", "#F472B6"],
  미용:       ["#EC4899", "#C026D3"],
  학원:       ["#8B5CF6", "#6366F1"],
  마트:       ["#10B981", "#059669"],
  "헬스/운동":["#0EA5E9", "#6366F1"],
  반려동물:   ["#F472B6", "#EC4899"],
  세탁:       ["#6366F1", "#8B5CF6"],
  베이커리:   ["#D97706", "#F59E0B"],
  부동산:     ["#0EA5A8", "#10B981"],
  스터디카페: ["#7C3AED", "#A855F7"],
  안경원:     ["#0F766E", "#14B8A6"],
  꽃집:       ["#DB2777", "#F472B6"],
  기타:       ["#6B7280", "#4B5563"],
};

// 매장 카드 — 매거진형 2열 그리드. memo로 리렌더 최소화 (props는 안정적 참조여야 함)
const StoreCard = memo(function StoreCard({
  store, hasNew, hasCoupon,
}: {
  store: EnrichedStore;
  hasNew: boolean;
  hasCoupon: boolean;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const [heroFailed, setHeroFailed] = useState(false);
  const heroThumb = !!store.thumbnail_url && !thumbFailed ? store.thumbnail_url! : null;
  const [gFrom, gTo] = catGrads[store.category];
  const isOpen = store.isOpen !== false;
  return (
    <Link href={`/stores/${store.id}`}
      className="bg-white rounded-2xl overflow-hidden text-left active:scale-[0.97] transition-transform shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[#eeeef0] flex flex-col h-full">
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "5/3" }}>
        {heroThumb ? (
          <img src={heroThumb} alt={store.name}
            loading="lazy" decoding="async"
            onError={() => setThumbFailed(true)}
            className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full relative">
            {!heroFailed && (
              <img src={catHeroImage[store.category]} alt=""
                loading="lazy" decoding="async"
                onError={() => setHeroFailed(true)}
                className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${gFrom}cc, ${gTo}99)` }} />
            <div className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
                backgroundSize: "10px 10px",
              }} />
            <div className="absolute right-1 -bottom-3 opacity-25"
              style={{ fontSize: 78, lineHeight: 1 }}>
              {catEmoji[store.category]}
            </div>
          </div>
        )}

        {/* 좌상단 뱃지 */}
        {(hasNew || store.isPremium || hasCoupon) && (
          <div className="absolute top-1.5 left-1.5 flex flex-col items-start gap-1">
            {hasNew && (
              <span className="text-[9px] font-black bg-[#F04452] text-white px-1.5 py-0.5 rounded-md shadow-sm">
                NEW
              </span>
            )}
            {store.isPremium && (
              <span className="text-[9px] font-black bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white px-1.5 py-0.5 rounded-md shadow-sm">
                ★ PREMIUM
              </span>
            )}
            {hasCoupon && (
              <span className="text-[9px] font-black bg-white/95 text-[#0071e3] px-1.5 py-0.5 rounded-md shadow-sm flex items-center gap-0.5 backdrop-blur-md">
                <Tag size={8} strokeWidth={3} /> 쿠폰
              </span>
            )}
          </div>
        )}

        {/* 우상단 영업 상태 */}
        <div className="absolute top-1.5 right-1.5">
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md backdrop-blur-md shadow-sm ${
            isOpen ? "bg-[#00C471]/95 text-white" : "bg-black/60 text-white"
          }`}>
            {isOpen ? "● 영업중" : "영업종료"}
          </span>
        </div>

        {/* 하단 그라디언트 (가독성) */}
        <div className="absolute inset-x-0 bottom-0 h-10 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)" }} />

        {/* 좌측 하단 로고 (오버랩) */}
        <div className="absolute -bottom-3.5 left-2.5">
          <div className="ring-[2.5px] ring-white rounded-xl shadow-md overflow-hidden bg-white">
            <StoreLogo name={store.name} category={store.category} size={38} rounded="rounded-xl" />
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="pt-5 pb-2.5 px-2.5 flex-1 flex flex-col gap-1">
        <span className={`self-start text-[9.5px] font-black px-1.5 py-0.5 rounded-md ${catBg[store.category]}`}>
          {catEmoji[store.category]} {store.category}
        </span>

        <p className="text-[14px] font-black text-[#1d1d1f] leading-tight line-clamp-1">
          {store.name}
        </p>

        <div className="flex items-center gap-0.5 text-[11px] text-[#6e6e73]">
          <MapPin size={9} className="shrink-0 text-[#86868b]" />
          <span className="truncate min-w-0">{store.buildingName}</span>
        </div>

        <div className="flex items-center justify-between gap-1 text-[10.5px] mt-auto">
          <span className="font-black px-1.5 py-0.5 rounded-md text-white shrink-0"
            style={{ background: catDot[store.category] }}>
            {store.floorLabel}
          </span>
          {store.hours ? (
            <span className="text-[#86868b] truncate flex items-center gap-0.5 min-w-0">
              <Clock size={9} className="shrink-0 text-[#a1a1a6]" />
              <span className="truncate">{store.hours}</span>
            </span>
          ) : store.phone ? (
            <span className="text-[#86868b] truncate flex items-center gap-0.5 min-w-0">
              <Phone size={9} className="shrink-0 text-[#a1a1a6]" />
              <span className="truncate">{store.phone}</span>
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
});

// 인기 매장 — 가로 스크롤 전용. StoreCard와 달리 고정 높이/단일 배지/정사각 히어로로 좁은 폭에 맞춤.
const PopularCard = memo(function PopularCard({
  store, hasNew, hasCoupon,
}: {
  store: EnrichedStore;
  hasNew: boolean;
  hasCoupon: boolean;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const [heroFailed, setHeroFailed] = useState(false);
  const heroThumb = !!store.thumbnail_url && !thumbFailed ? store.thumbnail_url! : null;
  const [gFrom, gTo] = catGrads[store.category];
  const isOpen = store.isOpen !== false;
  const badge = hasNew
    ? { label: "NEW", bg: "#F04452" }
    : store.isPremium
      ? { label: "★ PREMIUM", bg: "#F59E0B" }
      : hasCoupon
        ? { label: "쿠폰", bg: "#0071e3" }
        : null;
  return (
    <Link href={`/stores/${store.id}`}
      className="bg-white rounded-2xl overflow-hidden text-left active:scale-[0.97] transition-transform shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-[#eeeef0] flex flex-col w-full">
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "5/3" }}>
        {heroThumb ? (
          <img src={heroThumb} alt={store.name}
            loading="lazy" decoding="async"
            onError={() => setThumbFailed(true)}
            className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            {!heroFailed && (
              <img src={catHeroImage[store.category]} alt=""
                loading="lazy" decoding="async"
                onError={() => setHeroFailed(true)}
                className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${gFrom}cc, ${gTo}99)` }} />
            <div className="absolute right-1 -bottom-1 opacity-25"
              style={{ fontSize: 64, lineHeight: 1 }}>
              {catEmoji[store.category]}
            </div>
          </>
        )}
        {badge && (
          <span className="absolute top-1.5 left-1.5 text-[9px] font-black text-white px-1.5 py-0.5 rounded-md shadow-sm"
            style={{ background: badge.bg }}>
            {badge.label}
          </span>
        )}
        <span className={`absolute top-1.5 right-1.5 text-[8.5px] font-black px-1.5 py-0.5 rounded-md backdrop-blur-md shadow-sm ${
          isOpen ? "bg-[#00C471]/95 text-white" : "bg-black/60 text-white"
        }`}>
          {isOpen ? "● 영업중" : "종료"}
        </span>
        <div className="absolute inset-x-0 bottom-0 h-8 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)" }} />
      </div>
      <div className="px-2.5 pt-2 pb-2.5">
        <p className="text-[13px] font-black text-[#1d1d1f] leading-tight line-clamp-1">
          {store.name}
        </p>
        <div className="flex items-center gap-1 mt-1 text-[10.5px] text-[#6e6e73]">
          <span className="shrink-0 font-black text-white rounded"
            style={{ background: catDot[store.category], fontSize: 9, padding: "1px 4px" }}>
            {store.floorLabel}
          </span>
          <span className="truncate min-w-0">{store.buildingName}</span>
        </div>
      </div>
    </Link>
  );
});

const PAGE_SIZE = 12;
const POPULAR_LIMIT = 12;

function StoreListView() {
  const router = useRouter();
  const [catFilter, setCatFilter] = useState<StoreCategory | "전체">("전체");
  const [dbStores, setDbStores] = useState<FlatStore[]>([]);
  const [dbCoupons, setDbCoupons] = useState<import("@/lib/types").Coupon[]>([]);
  const [dbOpenings, setDbOpenings] = useState<import("@/lib/types").NewStoreOpening[]>([]);
  const [dlState, setDlState] = useState<Set<string>>(() => loadDownloaded());
  const [banners, setBanners] = useState<Banner[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAllStoresFlat().then(setDbStores);
    fetchActiveCoupons().then(setDbCoupons);
    fetchActiveOpenings().then(setDbOpenings);
    fetchActiveBanners("stores").then(setBanners);
  }, []);

  const allStores = useMemo<EnrichedStore[]>(() =>
    dbStores.map(s => ({ ...s, floorLabel: s.floorLabel, buildingName: s.buildingName })),
    [dbStores]
  );

  const newOpeningIds = useMemo(() => new Set(dbOpenings.map(o => o.storeId)), [dbOpenings]);
  const couponStoreIds = useMemo(() => new Set(dbCoupons.map(c => c.storeId)), [dbCoupons]);

  // 인기 매장: 프리미엄 + 쿠폰 + 신규 오픈 시그널 점수 합산 후 상위 N개
  const popularStores = useMemo(() => {
    const scored = allStores
      .map(s => {
        let score = 0;
        if (s.isPremium) score += 100;
        if (couponStoreIds.has(s.id)) score += 50;
        if (newOpeningIds.has(s.id)) score += 30;
        if (s.isOpen !== false) score += 5;
        return { s, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, POPULAR_LIMIT)
      .map(({ s }) => s);
    return scored;
  }, [allStores, couponStoreIds, newOpeningIds]);

  const baseList = useMemo<EnrichedStore[]>(
    () => (catFilter === "전체" ? allStores : allStores.filter(s => s.category === catFilter)),
    [catFilter, allStores]
  );
  const hasMore = visibleCount < baseList.length;

  const visibleList = useMemo(
    () => baseList.slice(0, visibleCount),
    [baseList, visibleCount]
  );

  // 카테고리=전체일 때만 업종별 그룹핑
  const grouped = useMemo(() => {
    if (catFilter !== "전체") return null;
    const map = new Map<StoreCategory, EnrichedStore[]>();
    ALL_CATS.forEach(c => {
      const group = visibleList.filter(s => s.category === c);
      if (group.length > 0) map.set(c, group);
    });
    return map;
  }, [catFilter, visibleList]);

  // 필터 전환 시 visibleCount 초기화
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [catFilter]);

  // IntersectionObserver — sentinel 노출 시 다음 페이지 로드
  useEffect(() => {
    if (!hasMore) return;
    const target = sentinelRef.current;
    if (!target) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount(c => Math.min(c + PAGE_SIZE, baseList.length));
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [hasMore, baseList.length]);


  return (
    <div>
      {/* ── 이번 주 행사 배너 ── */}
      {banners.length > 0 && <BannerCarousel banners={banners} />}

      {/* ── 신규 오픈 ── */}
      {(() => {
        const weekOpenings  = dbOpenings.filter(o => classifyOpening(o.openDate) === "week");
        const monthOpenings = dbOpenings.filter(o => classifyOpening(o.openDate) === "month");
        if (weekOpenings.length === 0 && monthOpenings.length === 0) return null;

        function OpeningGroup({ items, label, badge, color }: {
          items: import("@/lib/types").NewStoreOpening[];
          label: string; badge: string; color: string;
        }) {
          if (items.length === 0) return null;
          return (
            <div>
              <div className="flex items-center gap-2 px-4 pt-6 pb-3">
                <span className="text-[19px] font-extrabold text-[#1d1d1f]">{label}</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: color }}>{badge}</span>
                <span className="text-[11px] text-[#86868b]">{items.length}개</span>
              </div>
              <div className="px-4 space-y-2">
                {items.map((o, idx) => {
                  const isTop = idx === 0;
                  return (
                    <button key={o.id} onClick={() => router.push(`/stores/${o.storeId}`)}
                      className="w-full bg-white rounded-2xl overflow-hidden flex items-stretch active:scale-[0.99] transition-transform text-left shadow-sm">
                      <div className="w-[3px] shrink-0" style={{ background: color }} />
                      <div className="flex items-center gap-3 px-4 py-3.5 flex-1 min-w-0">
                        <StoreLogo name={o.storeName} category={o.category} size={46} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[15px] font-bold text-[#1d1d1f] truncate">{o.storeName}</p>
                            {isTop && (
                              <span className="shrink-0 text-[9px] font-black text-white px-1.5 py-0.5 rounded-full"
                                style={{ background: color }}>
                                {badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-[#6e6e73] mt-0.5">{o.floor} · {o.category} · {o.openDate.slice(5).replace("-", "/")} 오픈</p>
                          {o.openBenefit && (
                            <p className="text-[12px] text-[#F04452] font-semibold line-clamp-1 mt-0.5">{o.openBenefit.summary}</p>
                          )}
                        </div>
                        <ChevronRight size={14} className="shrink-0 text-[#d2d2d7]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <div className="pb-3 space-y-5">
            <OpeningGroup items={weekOpenings} label="이번 주 신규 오픈" badge="NEW" color="#F04452" />
            <OpeningGroup items={monthOpenings} label="이번달 오픈" badge="이달" color="#FF9500" />
          </div>
        );
      })()}

      {/* ── 이번 주 쿠폰 ── */}
      {(() => {
        const validCoupons = dbCoupons.filter(c =>
          Math.ceil((new Date(c.expiry).getTime() - Date.now()) / 86400000) > 0
        );
        if (validCoupons.length === 0) return null;

        function toggleCoupon(id: string) {
          setDlState(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            saveDownloaded(n);
            return n;
          });
        }

        return (
          <div className="pb-3">
            <div className="flex items-center gap-2 px-4 pt-6 pb-3">
              <span className="text-[19px] font-extrabold text-[#1d1d1f]">이번 주 쿠폰</span>
              <span className="text-[11px] font-bold bg-[#FEE2E2] text-[#F04452] px-2 py-0.5 rounded-full">{validCoupons.length}장</span>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
              {validCoupons.map(c => (
                <CouponCard
                  key={c.id}
                  coupon={c}
                  downloaded={dlState.has(c.id)}
                  onToggle={() => toggleCoupon(c.id)}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── 🔥 인기 매장 — 상단 고정 가로 스크롤 섹션 ── */}
      {popularStores.length > 0 && (
        <div className="pb-2">
          <div className="flex items-center gap-2 px-4 pt-6 pb-3">
            <span className="text-[19px] font-extrabold text-[#1d1d1f]">🔥 인기 매장</span>
            <span className="text-[11px] font-bold bg-[#FFF0F0] text-[#F04452] px-2 py-0.5 rounded-full">TOP {popularStores.length}</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 snap-x" style={{ scrollbarWidth: "none" }}>
            {popularStores.map(s => (
              <div key={s.id} className="shrink-0 snap-start" style={{ width: 156 }}>
                <PopularCard
                  store={s}
                  hasNew={newOpeningIds.has(s.id)}
                  hasCoupon={couponStoreIds.has(s.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 매장 목록 — 업종 필터 + Lazy Load ── */}
      <div className="pb-1">
        <div className="flex items-center gap-2 px-4 pt-6 pb-3">
          <span className="text-[19px] font-extrabold text-[#1d1d1f]">전체 매장</span>
          <span className="text-[11px] font-bold bg-[#e8f1fd] text-[#0071e3] px-2 py-0.5 rounded-full">{allStores.length}개</span>
        </div>

        {/* 업종 필터 */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
          {(["전체", ...ALL_CATS] as (StoreCategory | "전체")[]).map(cat => {
            const active = catFilter === cat;
            const color = cat === "전체" ? "#1d1d1f" : catDot[cat];
            return (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className={`shrink-0 h-8 px-4 rounded-full text-[13px] font-bold transition-all ${
                  active ? "text-white shadow-sm" : "bg-white text-[#6e6e73]"
                }`}
                style={active ? { background: color } : {}}>
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-2 pb-6">
        {visibleList.length === 0 ? (
          <div className="flex flex-col items-center py-14 gap-2">
            <span className="text-3xl">🏪</span>
            <p className="text-[14px] font-semibold text-[#424245]">조건에 맞는 매장이 없어요</p>
            <p className="text-[12px] text-[#86868b]">다른 업종을 선택해 보세요</p>
          </div>
        ) : grouped ? (
          // 카테고리=전체 → 업종별 그룹핑 + 그라디언트 헤더 + 2열 그리드
          <>
            {Array.from(grouped.entries()).map(([cat, stores]) => {
              const [gFrom, gTo] = catGrads[cat];
              return (
                <div key={cat} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${gFrom}, ${gTo})` }}>
                      <span className="text-[14px]">{catEmoji[cat]}</span>
                    </div>
                    <span className="text-[15px] font-black text-[#1d1d1f]">{cat}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: catDot[cat] }}>
                      {stores.length}
                    </span>
                    <div className="flex-1 h-px bg-[#e5e5ea]" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {stores.map(s => (
                      <StoreCard
                        key={s.id}
                        store={s}
                        hasNew={newOpeningIds.has(s.id)}
                        hasCoupon={couponStoreIds.has(s.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {/* Lazy load sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                <p className="text-[11px] text-[#86868b]">매장 더 불러오는 중...</p>
              </div>
            )}
          </>
        ) : (
          // 단일 그리드 (업종 필터 적용 시)
          <>
            <p className="text-[12px] font-semibold text-[#86868b] mb-2.5">
              {hasMore
                ? `${visibleList.length} / ${baseList.length}개 표시 중`
                : `${visibleList.length}개 매장`}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {visibleList.map(s => (
                <StoreCard
                  key={s.id}
                  store={s}
                  hasNew={newOpeningIds.has(s.id)}
                  hasCoupon={couponStoreIds.has(s.id)}
                />
              ))}
            </div>
            {/* Lazy load sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                <p className="text-[11px] text-[#86868b]">매장 더 불러오는 중...</p>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

// ─── 검색 결과 ────────────────────────────────────────────────
interface SearchResult { store: Store; floorLabel: string; buildingName: string; }

function SearchResults({ results, onSelect }: { results: SearchResult[]; onSelect: (s: Store) => void }) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <span className="text-4xl">🔍</span>
        <p className="text-[15px] font-semibold text-[#424245]">검색 결과가 없습니다</p>
        <p className="text-[13px] text-[#86868b]">다른 키워드로 검색해 보세요</p>
      </div>
    );
  }
  return (
    <div className="px-4 pt-3 pb-4">
      <p className="text-[12px] font-semibold text-[#86868b] mb-2.5">총 {results.length}건</p>
      <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#f5f5f7]">
        {results.map(({ store, floorLabel, buildingName }) => (
          <button key={store.id} onClick={() => onSelect(store)}
            className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-[#f5f5f7] text-left">
            <StoreLogo name={store.name} category={store.category} size={42} />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-[#1d1d1f] truncate">{store.name}</p>
              <p className="text-[12px] text-[#6e6e73]">{buildingName} · {floorLabel}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${catBg[store.category]}`}>{store.category}</span>
              <span className={`text-[11px] font-bold ${store.isOpen !== false ? "text-[#00C471]" : "text-[#F04452]"}`}>
                {store.isOpen !== false ? "● 영업 중" : "● 영업 종료"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 실제 지도 (Leaflet) — SSR 비활성화 ─────────────────────
const StoreMapView = dynamic(() => import("./StoreMapView"), {
  ssr: false,
  loading: () => (
    <div className="mx-4 mt-3 mb-3 rounded-2xl bg-[#f5f5f7] flex items-center justify-center border border-[#d2d2d7]"
      style={{ height: 440 }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[#0071e3] border-t-transparent rounded-full animate-spin"
          style={{ borderWidth: 3 }} />
        <p className="text-[13px] text-[#6e6e73]">지도 불러오는 중...</p>
      </div>
    </div>
  ),
});


// ─── 메인 ────────────────────────────────────────────────────
export default function StoresPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [recommendedKws, setRecommendedKws] = useState<string[]>([]);
  const [popularKws, setPopularKws] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"리스트" | "지도">("리스트");
  const [mapCatFilter, setMapCatFilter] = useState<StoreCategory | "전체">("전체");
  const [dbBuildings, setDbBuildings] = useState<BuildingRow[]>([]);
  const [allDbStores, setAllDbStores] = useState<FlatStore[]>([]);

  // DB 데이터 로드
  useEffect(() => {
    fetchBuildings().then(setDbBuildings);
    fetchAllStoresFlat().then(setAllDbStores);
    fetchRecommendedKeywords().then(setRecommendedKws);
    fetchPopularKeywords().then(setPopularKws);
  }, []);

  function handleSearchSelect(kw: string) {
    setSearchQuery(kw);
    setSearchFocused(false);
    if (kw.trim().length >= 2) logSearch(kw.trim());
    searchInputRef.current?.blur();
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && searchQuery.trim().length >= 2) {
      logSearch(searchQuery.trim());
      setSearchFocused(false);
      searchInputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setSearchFocused(false);
      searchInputRef.current?.blur();
    }
  }

  // 위치 권한 요청
  function requestLocation() {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => {
        // 위치 거부 시 검단신도시 실제 좌표
        setUserPos({ lat: 37.586, lng: 126.706 });
        setLocationLoading(false);
      },
      { timeout: 8000 }
    );
  }

  useEffect(() => {
    requestLocation();
  }, []);

  // 검색 결과
  const searchResults = useMemo<SearchResult[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const stores = allDbStores
      .filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .map(s => ({ store: s, floorLabel: s.floorLabel, buildingName: s.buildingName }));
    // 지도 탭에서는 상가명도 검색하여 그 건물의 모든 매장을 결과에 포함
    if (viewMode === "지도") {
      const buildingMatches = allDbStores
        .filter(s => s.buildingName.toLowerCase().includes(q))
        .filter(s => !stores.some(r => r.store.id === s.id))
        .map(s => ({ store: s, floorLabel: s.floorLabel, buildingName: s.buildingName }));
      return [...stores, ...buildingMatches];
    }
    return stores;
  }, [searchQuery, allDbStores, viewMode]);

  // 주변 건물 거리 계산
  const nearbyWithDist = useMemo<NearbyBuilding[]>(() => {
    const base = userPos ?? { lat: 37.586, lng: 126.706 };
    return dbBuildings
      .map(row => rowToNearby(row, base.lat, base.lng))
      .sort((a, b) => a.km - b.km);
  }, [userPos, dbBuildings]);

  // 지도 탭 검색 시: 상가명 매칭된 건물 목록
  const buildingSearchMatches = useMemo<NearbyBuilding[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || viewMode !== "지도") return [];
    return nearbyWithDist.filter(b => b.name.toLowerCase().includes(q));
  }, [searchQuery, viewMode, nearbyWithDist]);

  const isSearching = searchQuery.trim().length > 0;

  // 지도 필터: 선택 업종이 없는 건물 ID set
  const dimmedIds = useMemo(() => {
    if (mapCatFilter === "전체") return new Set<string>();
    return new Set(nearbyWithDist.filter(b => !b.categories.includes(mapCatFilter as StoreCategory)).map(b => b.id));
  }, [mapCatFilter, nearbyWithDist]);

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-28">
      <Header title="상가" />

      {/* 탭 토글 (매장리스트 / 상가지도) */}
      <div className="bg-white px-4 pt-3 pb-2 sticky top-[56px] z-30 border-b border-[#f5f5f7]">
        <div className="flex gap-1 bg-[#f5f5f7] rounded-2xl p-1">
          {(["리스트", "지도"] as const).map(mode => (
            <button key={mode} onClick={() => { setViewMode(mode); setSearchQuery(""); setSearchFocused(false); }}
              className={`flex-1 h-9 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                viewMode === mode ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"
              }`}>
              {mode === "리스트" ? <List size={14} /> : <MapIcon size={14} />}
              {mode === "리스트" ? "매장 리스트" : "상가 지도"}
            </button>
          ))}
        </div>
      </div>

      {/* 검색바 */}
      <div className="bg-white px-4 pt-2 pb-3 sticky top-[112px] z-30 border-b border-[#f5f5f7]">
        <div className={`flex items-center gap-2.5 rounded-2xl px-4 h-12 transition-all ${searchFocused ? "bg-white ring-2 ring-[#0071e3] shadow-sm" : "bg-[#f5f5f7]"}`}>
          <Search size={16} className={`shrink-0 transition-colors ${searchFocused ? "text-[#0071e3]" : "text-[#86868b]"}`} />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder={viewMode === "지도"
              ? "상가명, 매장명, 업종 검색"
              : "매장명, 업종 검색 (예: 카페, 스타벅스)"}
            className="flex-1 bg-transparent text-[15px] focus:outline-none text-[#1d1d1f] placeholder:text-[#86868b]"
          />
          {(searchQuery || searchFocused) && (
            <button onMouseDown={e => e.preventDefault()} onClick={() => { setSearchQuery(""); setSearchFocused(false); searchInputRef.current?.blur(); }} className="active:opacity-60">
              <X size={16} className="text-[#86868b]" />
            </button>
          )}
        </div>
      </div>

      {/* 키워드 검색 패널 */}
      {searchFocused && !isSearching && (
        <div className="bg-white min-h-[calc(100dvh-184px)]" onMouseDown={e => e.preventDefault()}>
          {recommendedKws.length > 0 && (
            <div className="px-4 pt-5 pb-4 border-b border-[#f5f5f7]">
              <p className="text-[12px] font-bold text-[#86868b] mb-3 uppercase tracking-wide">추천 검색어</p>
              <div className="flex flex-wrap gap-2">
                {recommendedKws.map(kw => (
                  <button key={kw} onClick={() => handleSearchSelect(kw)}
                    className="h-9 px-4 bg-[#f5f5f7] rounded-full text-[14px] font-semibold text-[#1d1d1f] active:bg-[#e5e5ea] transition-colors">
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          )}
          {popularKws.length > 0 && (
            <div className="px-4 pt-4 pb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-bold text-[#86868b] uppercase tracking-wide">실시간 인기 검색어</p>
                <p className="text-[10px] text-[#86868b]">최근 7일 기준</p>
              </div>
              <div className="space-y-1">
                {popularKws.map((kw, i) => (
                  <button key={kw} onClick={() => handleSearchSelect(kw)}
                    className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl active:bg-[#f5f5f7] transition-colors text-left">
                    <span className={`text-[13px] font-black w-5 text-center shrink-0 ${i < 3 ? "text-[#F04452]" : "text-[#86868b]"}`}>{i + 1}</span>
                    <span className="text-[15px] text-[#1d1d1f] font-medium flex-1">{kw}</span>
                    {i < 3 && <span className="text-[10px] font-bold text-[#F04452] bg-[#FFF0F0] px-1.5 py-0.5 rounded-full shrink-0">HOT</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          {recommendedKws.length === 0 && popularKws.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Search size={32} className="text-[#d2d2d7]" />
              <p className="text-[14px] text-[#86868b]">검색어를 입력해 보세요</p>
            </div>
          )}
        </div>
      )}

      {isSearching ? (
        <SearchResults results={searchResults} onSelect={(s) => { setSearchFocused(false); router.push(`/stores/${s.id}`); }} />
      ) : searchFocused ? null : viewMode === "지도" ? (
        /* ─── 지도 모드 ─── */
        <div className="fixed left-0 right-0" style={{ top: 170, bottom: 58, zIndex: 10 }}>
          {/* 업종별 필터 바 */}
          <div className="absolute top-0 left-0 right-0 z-[50] pt-2 pb-1.5"
            style={{ background: "linear-gradient(180deg,rgba(255,255,255,.96) 70%,transparent)" }}>
            <div className="flex gap-2 px-3 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {(["전체", ...ALL_CATS] as (StoreCategory | "전체")[]).map(cat => (
                <button key={cat} onClick={() => setMapCatFilter(cat)}
                  className={`shrink-0 flex items-center gap-1 px-3 h-8 rounded-full text-[12px] font-bold shadow-sm transition-all border ${mapCatFilter === cat ? "bg-[#0071e3] text-white border-transparent" : "bg-white text-[#424245] border-[#d2d2d7]"}`}>
                  {cat === "전체" ? "🏢 전체" : `${catEmoji[cat as StoreCategory]} ${cat}`}
                </button>
              ))}
              {/* 마지막 필 잘림 방지 스페이서 */}
              <div className="shrink-0 w-3" />
            </div>
          </div>

          {/* 지도 */}
          <StoreMapView
            buildings={nearbyWithDist}
            selectedId={null}
            onSelect={id => router.push(`/stores/building/?id=${id}`)}
            dimmedIds={dimmedIds}
          />
        </div>
      ) : (
        /* ─── 리스트 모드 ─── */
        <StoreListView />
      )}

      <BottomNav />
    </div>
  );
}
