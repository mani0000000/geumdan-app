"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Phone, Clock, Lock, ParkingSquare, ChevronLeft, ChevronRight, X, Pencil, CheckCircle2 } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { buildings } from "@/lib/mockData";
import type { Store, StoreCategory, Floor } from "@/lib/types";

const catDot: Record<StoreCategory, string> = {
  카페: "#F59E0B", 음식점: "#F97316", 편의점: "#3B82F6",
  "병원/약국": "#EF4444", 미용: "#EC4899", 학원: "#8B5CF6", 마트: "#10B981", 기타: "#9CA3AF",
};
const catEmoji: Record<StoreCategory, string> = {
  카페:"☕", 음식점:"🍽️", 편의점:"🏪", "병원/약국":"💊", 미용:"💇", 학원:"📚", 마트:"🛒", 기타:"🏢",
};
const catBg: Record<StoreCategory, string> = {
  카페:"bg-[#FEF3C7] text-[#92400E]", 음식점:"bg-[#FEE2E2] text-[#991B1B]",
  편의점:"bg-[#DBEAFE] text-[#1E40AF]", "병원/약국":"bg-[#FEE2E2] text-[#991B1B]",
  미용:"bg-[#FCE7F3] text-[#9D174D]", 학원:"bg-[#EDE9FE] text-[#5B21B6]",
  마트:"bg-[#D1FAE5] text-[#065F46]", 기타:"bg-[#F3F4F6] text-[#374151]",
};

function FloorSVG({ floor, selectedId, onSelect }: { floor: Floor; selectedId: string | null; onSelect: (s: Store) => void }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full" style={{ aspectRatio: "1.5/1" }}>
      <rect width="100" height="100" fill="#F9FAFB" />
      <rect x="2" y="2" width="96" height="96" rx="3" fill="#F9FAFB" stroke="#E5E8EB" strokeWidth="1" />
      {floor.hasRestroom && (
        <>
          <rect x="44" y="44" width="12" height="12" rx="2" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="0.5" />
          <text x="50" y="52" textAnchor="middle" fontSize="5.5" fill="#2563EB" fontWeight="bold">WC</text>
        </>
      )}
      {floor.stores.map(s => {
        const vacant = s.name === "공실";
        const sel = selectedId === s.id;
        return (
          <g key={s.id} onClick={() => !vacant && onSelect(s)} style={{ cursor: vacant ? "default" : "pointer" }}>
            <rect x={`${s.x}%`} y={`${s.y}%`} width={`${s.w}%`} height={`${s.h}%`} rx="3"
              fill={sel ? "#EBF3FE" : "white"} stroke={sel ? "#3182F6" : "#E5E8EB"} strokeWidth={sel ? 1.5 : 0.8} />
            {!vacant && (
              <rect x={`${s.x}%`} y={`${s.y}%`} width={`${s.w}%`} height="3%"
                fill={catDot[s.category]} rx="3" opacity="0.9" />
            )}
            <foreignObject x={`${s.x+1}%`} y={`${s.y+4}%`} width={`${s.w-2}%`} height={`${s.h-5}%`}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", textAlign:"center" }}>
                {!vacant && <span style={{ fontSize:"12px" }}>{catEmoji[s.category]}</span>}
                <span style={{ fontSize:"8px", fontWeight: vacant ? 400 : 600, color: vacant ? "#9CA3AF" : "#1F2937", lineHeight:1.2, marginTop:"2px", wordBreak:"keep-all" }}>
                  {s.name}
                </span>
                {!vacant && s.isOpen === false && <span style={{ fontSize:"7px", color:"#EF4444" }}>영업종료</span>}
              </div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}

function StoreSheet({ store, onClose, onDetail }: { store: Store; onClose: () => void; onDetail: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-[#E5E8EB] rounded-full" /></div>
        <div className="px-5 pt-4 pb-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${catBg[store.category]}`}>{store.category}</span>
              <h2 className="text-[20px] font-bold text-[#191F28] mt-1">{store.name}</h2>
              {store.isOpen !== undefined && (
                <span className={`text-[12px] font-medium ${store.isOpen ? "text-[#00C471]" : "text-[#F04452]"}`}>
                  {store.isOpen ? "● 영업 중" : "● 영업 종료"}
                </span>
              )}
            </div>
            <button onClick={onClose} className="active:opacity-60"><X size={22} className="text-[#8B95A1]" /></button>
          </div>
          <div className="space-y-2.5">
            {store.hours && (
              <div className="flex items-center gap-3 bg-[#F2F4F6] rounded-xl px-3 py-3">
                <Clock size={16} className="text-[#8B95A1] shrink-0" />
                <div><p className="text-[11px] text-[#8B95A1]">영업시간</p><p className="text-[14px] font-medium text-[#191F28]">{store.hours}</p></div>
              </div>
            )}
            {store.phone && (
              <div className="flex items-center justify-between bg-[#F2F4F6] rounded-xl px-3 py-3">
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-[#8B95A1] shrink-0" />
                  <div><p className="text-[11px] text-[#8B95A1]">전화번호</p><p className="text-[14px] font-medium text-[#191F28]">{store.phone}</p></div>
                </div>
                <a href={`tel:${store.phone}`} className="h-9 px-4 bg-[#3182F6] rounded-xl text-white text-[13px] font-bold flex items-center active:opacity-80">전화</a>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <button onClick={onDetail}
              className="w-full h-12 bg-[#3182F6] rounded-xl flex items-center justify-center gap-2 text-[14px] text-white font-bold active:bg-[#1B64DA] transition-colors">
              매장 상세 정보 보기
            </button>
            {!sent
              ? <button onClick={() => setSent(true)}
                  className="w-full h-11 border border-[#E5E8EB] rounded-xl flex items-center justify-center gap-2 text-[13px] text-[#4E5968] font-medium active:bg-[#F2F4F6] transition-colors">
                  <Pencil size={14} className="text-[#8B95A1]" />정보 수정 제안하기
                </button>
              : <div className="w-full h-11 bg-[#D1FAE5] rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} className="text-[#00C471]" />
                  <span className="text-[13px] text-[#065F46] font-medium">제안이 접수됐어요</span>
                </div>
            }
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-black/40 -z-10" />
    </div>
  );
}

export default function StoresPage() {
  const router = useRouter();
  const b = buildings[0];
  const [floorIdx, setFloorIdx] = useState(1);
  const [selected, setSelected] = useState<Store | null>(null);
  const [showCode, setShowCode] = useState(false);
  const floor = b.floors[floorIdx];

  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-20">
      <Header title="상가 지도" />

      {/* Building Info */}
      <div className="mx-4 mt-4 mb-3 bg-white rounded-2xl px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[16px] font-bold text-[#191F28]">{b.name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="text-[#B0B8C1]" />
              <span className="text-[12px] text-[#8B95A1]">{b.address}</span>
            </div>
          </div>
          <span className="text-[11px] text-[#8B95A1] bg-[#F2F4F6] px-2 py-1 rounded-lg">{b.openTime}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <ParkingSquare size={13} className="text-[#3182F6]" />
          <span className="text-[12px] text-[#4E5968]">{b.parkingInfo}</span>
        </div>
      </div>

      {/* Floor Map */}
      <div className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden">
        {/* Floor selector */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F4F6]">
          <button onClick={() => { setFloorIdx(i => Math.max(0,i-1)); setSelected(null); }}
            disabled={floorIdx === 0}
            className="w-9 h-9 bg-[#F2F4F6] rounded-xl flex items-center justify-center active:opacity-60 disabled:opacity-30">
            <ChevronLeft size={18} className="text-[#191F28]" />
          </button>
          <div className="flex items-center gap-2">
            {b.floors.map((f,i) => (
              <button key={f.label} onClick={() => { setFloorIdx(i); setSelected(null); }}
                className={`w-10 h-10 rounded-xl text-[13px] font-bold transition-colors active:opacity-70 ${i===floorIdx ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#4E5968]"}`}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={() => { setFloorIdx(i => Math.min(b.floors.length-1,i+1)); setSelected(null); }}
            disabled={floorIdx === b.floors.length-1}
            className="w-9 h-9 bg-[#F2F4F6] rounded-xl flex items-center justify-center active:opacity-60 disabled:opacity-30">
            <ChevronRight size={18} className="text-[#191F28]" />
          </button>
        </div>
        <div className="p-3">
          <FloorSVG floor={floor} selectedId={selected?.id ?? null} onSelect={setSelected} />
        </div>
        <div className="px-4 py-3 border-t border-[#F2F4F6] flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${floor.hasRestroom ? "bg-[#3182F6]" : "bg-[#E5E8EB]"}`} />
            <span className="text-[12px] text-[#8B95A1]">화장실 {floor.hasRestroom ? "있음" : "없음"}</span>
          </div>
          {floor.hasRestroom && floor.restroomCode && (
            <button onClick={() => setShowCode(!showCode)} className="flex items-center gap-1 active:opacity-60">
              <Lock size={12} className="text-[#3182F6]" />
              <span className="text-[12px] text-[#3182F6] font-medium">{showCode ? `비번: ${floor.restroomCode}` : "비번 보기"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Store list */}
      <div className="mx-4 mb-4">
        <p className="text-[14px] font-bold text-[#191F28] mb-2.5">{floor.label} 입점 매장</p>
        <div className="space-y-2">
          {floor.stores.filter(s => s.name !== "공실").map(s => (
            <button key={s.id} onClick={() => setSelected(s)}
              className={`w-full bg-white rounded-xl px-4 py-3 flex items-center justify-between active:bg-[#F2F4F6] transition-colors ${selected?.id===s.id ? "ring-2 ring-[#3182F6]" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{catEmoji[s.category]}</span>
                <div className="text-left">
                  <p className="text-[14px] font-medium text-[#191F28]">{s.name}</p>
                  {s.hours && <p className="text-[12px] text-[#8B95A1]">{s.hours}</p>}
                </div>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.isOpen !== false ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                {s.isOpen !== false ? "영업 중" : "영업 종료"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mx-4 mb-4 bg-white rounded-2xl px-4 py-3.5">
        <p className="text-[12px] font-bold text-[#8B95A1] mb-2.5">범례</p>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(catDot) as StoreCategory[]).map(c => (
            <div key={c} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: catDot[c] }} />
              <span className="text-[11px] text-[#8B95A1] truncate">{c}</span>
            </div>
          ))}
        </div>
      </div>

      {selected && selected.name !== "공실" && (
        <StoreSheet store={selected} onClose={() => setSelected(null)}
          onDetail={() => { setSelected(null); router.push(`/stores/detail/?id=${selected.id}`); }} />
      )}
      <BottomNav />
    </div>
  );
}
