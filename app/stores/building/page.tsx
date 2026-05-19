"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import StoreLogo from "@/components/ui/StoreLogo";
import { fetchBuildings, fetchBuildingWithFloors } from "@/lib/db/buildings";
import type { Store, StoreCategory, Building } from "@/lib/types";
import type { BuildingRow } from "@/lib/db/buildings";

const catEmoji: Record<StoreCategory, string> = {
  카페: "☕", 음식점: "🍽️", 편의점: "🏪", "병원/약국": "💊", 미용: "💇",
  학원: "📚", 마트: "🛒", "헬스/운동": "💪", 반려동물: "🐾", 세탁: "👕", 기타: "🏢",
}
const catBg: Record<StoreCategory, string> = {
  카페: "bg-[#FEF3C7] text-[#92400E]", 음식점: "bg-[#FFF0E6] text-[#C2410C]",
  편의점: "bg-[#e8f1fd] text-[#1E40AF]", "병원/약국": "bg-[#FEE2E2] text-[#991B1B]",
  미용: "bg-[#FCE7F3] text-[#9D174D]", 학원: "bg-[#EDE9FE] text-[#5B21B6]",
  마트: "bg-[#D1FAE5] text-[#065F46]", "헬스/운동": "bg-[#E0F2FE] text-[#0369A1]",
  반려동물: "bg-[#FDF2F8] text-[#9D174D]", 세탁: "bg-[#EEF2FF] text-[#4338CA]",
  기타: "bg-[#F3F4F6] text-[#374151]",
};

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

function BuildingDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const buildingId = searchParams.get("id") ?? "";

  const [row, setRow] = useState<BuildingRow | null>(null);
  const [buildingData, setBuildingData] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [floorIdx, setFloorIdx] = useState(-1);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!buildingId) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    Promise.all([fetchBuildings(), fetchBuildingWithFloors(buildingId)]).then(
      ([rows, data]) => {
        if (!alive) return;
        setRow(rows.find(r => r.id === buildingId) ?? null);
        setBuildingData(data);
        setLoading(false);
      }
    );
    return () => { alive = false; };
  }, [buildingId]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-white flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-[3px] border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-[#6e6e73]">상가 정보 불러오는 중...</p>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="min-h-dvh bg-[#f5f5f7] flex items-center justify-center">
        <div className="text-center px-8">
          <p className="text-4xl mb-3">🏢</p>
          <p className="text-[17px] font-bold text-[#1d1d1f]">상가를 찾을 수 없어요</p>
          <button onClick={() => router.back()} className="mt-4 h-11 px-6 bg-[#0071e3] rounded-xl text-white text-[15px] font-bold active:opacity-80">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const name = row.name;
  const address = row.address;
  const floorsCount = row.floors ?? 1;
  const storesCount = row.total_stores ?? 0;
  const image = BUILDING_IMAGES[row.id] ?? DEFAULT_IMG;

  const allStores: { store: Store; floorLabel: string }[] = buildingData
    ? buildingData.floors.flatMap(f => f.stores.filter(s => s.name !== "공실").map(s => ({ store: s, floorLabel: f.label })))
    : [];
  const visible = floorIdx === -1
    ? allStores
    : (buildingData ? buildingData.floors[floorIdx].stores.filter(s => s.name !== "공실").map(s => ({ store: s, floorLabel: buildingData.floors[floorIdx].label })) : []);

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <div className="flex items-center px-3 h-14 bg-white sticky top-0 z-20 border-b border-[#f5f5f7]">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center active:opacity-60">
          <ChevronLeft size={24} className="text-[#1d1d1f]" />
        </button>
        <h1 className="text-[18px] font-bold text-[#1d1d1f] truncate mx-1">{name}</h1>
      </div>

      <div className="relative shrink-0" style={{ height: 200 }}>
        {!imgFailed && image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} onError={() => setImgFailed(true)}
            className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0071e3] to-[#1849A3] flex items-center justify-center">
            <Building2 size={44} className="text-white/60" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.05) 0%, rgba(0,0,0,.6) 100%)" }} />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <p className="text-[20px] font-bold text-white leading-tight drop-shadow">{name}</p>
          <p className="text-[12px] text-white/80 mt-1">{address}</p>
          <p className="text-[12px] text-white/75 mt-0.5">{floorsCount}층 · {storesCount}개 매장</p>
        </div>
      </div>

      {!buildingData && (
        <div className="flex flex-col items-center justify-center flex-1 py-16 px-8">
          <span className="text-5xl mb-3">🏗️</span>
          <p className="text-[16px] font-bold text-[#1d1d1f]">정보 준비 중</p>
          <p className="text-[13px] text-[#6e6e73] mt-1 text-center leading-relaxed">
            이 건물의 상세 정보는 곧 업데이트돼요
          </p>
          <div className="mt-4 bg-[#f5f5f7] rounded-2xl px-5 py-4 w-full">
            <p className="text-[13px] text-[#424245]">{address}</p>
            <p className="text-[13px] text-[#6e6e73] mt-1">{floorsCount}층 · 약 {storesCount}개 매장</p>
          </div>
        </div>
      )}

      {buildingData && (
        <>
          <div className="flex gap-2 px-4 py-2.5 border-b border-[#f5f5f7] overflow-x-auto shrink-0 sticky top-14 bg-white z-10" style={{ scrollbarWidth: "none" }}>
            <button onClick={() => setFloorIdx(-1)}
              className={`shrink-0 px-3.5 h-8 rounded-xl text-[13px] font-bold transition-colors ${floorIdx === -1 ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#424245]"}`}>
              전체 {allStores.length}개
            </button>
            {buildingData.floors.map((f, i) => (
              <button key={f.label} onClick={() => setFloorIdx(i)}
                className={`shrink-0 px-3.5 h-8 rounded-xl text-[13px] font-bold transition-colors ${i === floorIdx ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#424245]"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex-1 pb-8">
            {visible.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-[13px] text-[#86868b]">입점 매장 없음</div>
            ) : (
              visible.map(({ store: s, floorLabel }) => (
                <button key={s.id}
                  onClick={() => router.push(`/stores/detail/?id=${s.id}`)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-[#f5f5f7] border-b border-[#f5f5f7] text-left">
                  <StoreLogo name={s.name} category={s.category} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[15px] font-semibold text-[#1d1d1f]">{s.name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${catBg[s.category]}`}>
                        {catEmoji[s.category]} {s.category}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#6e6e73] mt-0.5">
                      {floorIdx === -1 ? `${floorLabel} · ` : ""}{s.hours ?? "영업시간 미등록"}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.isOpen !== false ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                      {s.isOpen !== false ? "영업 중" : "영업 종료"}
                    </span>
                    <ChevronRight size={13} className="text-[#86868b]" />
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function BuildingDetailPage() {
  return <Suspense><BuildingDetailContent /></Suspense>;
}
