"use client";
import { useState } from "react";
import { MapPin, RefreshCw, ChevronDown, ChevronUp, Star, Zap, Accessibility, Train } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { nearbyStops, subwayStations } from "@/lib/mockData";
import { formatDistance } from "@/lib/utils";

type Tab = "버스" | "지하철";

function ArrivalBadge({ min }: { min: number }) {
  const bg = min <= 3 ? "bg-[#F04452]" : min <= 7 ? "bg-[#FF9500]" : "bg-[#3182F6]";
  return (
    <div className={`${bg} rounded-xl px-3 py-1.5 text-center min-w-[54px]`}>
      {min <= 0
        ? <span className="text-white text-[11px] font-bold">곧도착</span>
        : <>
            <span className="text-white text-[20px] font-black leading-none">{min}</span>
            <span className="text-white/80 text-[10px] block leading-none mt-0.5">분 후</span>
          </>
      }
    </div>
  );
}

export default function TransportPage() {
  const [tab, setTab] = useState<Tab>("버스");
  const [expanded, setExpanded] = useState<string | null>("bs1");
  const [refreshing, setRefreshing] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());

  const refresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  };

  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-20">
      <Header title="교통 정보" />

      {/* Tabs */}
      <div className="bg-white sticky top-[56px] z-30 border-b border-[#F2F4F6] flex">
        {(["버스","지하철"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 h-11 text-[14px] font-semibold border-b-2 transition-colors active:opacity-70 ${tab === t ? "text-[#3182F6] border-[#3182F6]" : "text-[#B0B8C1] border-transparent"}`}>
            {t === "버스" ? "🚌 버스" : "🚇 지하철"}
          </button>
        ))}
      </div>

      {/* Location bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-[#3182F6]" />
          <span className="text-[13px] text-[#4E5968]">당하동 현재 위치</span>
        </div>
        <button onClick={refresh} className="flex items-center gap-1 active:opacity-60">
          <RefreshCw size={14} className={`text-[#8B95A1] ${refreshing ? "animate-spin" : ""}`} />
          <span className="text-[12px] text-[#8B95A1]">방금 전</span>
        </button>
      </div>

      {tab === "버스" && (
        <div className="px-4 space-y-3">
          {nearbyStops.map(stop => {
            const open = expanded === stop.id;
            const routes = open ? stop.routes : stop.routes.slice(0, 2);
            return (
              <div key={stop.id} className="bg-white rounded-2xl overflow-hidden">
                <button onClick={() => setExpanded(open ? null : stop.id)}
                  className="w-full flex items-center justify-between px-4 py-4 active:bg-[#F2F4F6] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EBF3FE] flex items-center justify-center text-xl">🚏</div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-bold text-[#191F28]">{stop.name}</p>
                        <span className="text-[11px] text-[#B0B8C1] bg-[#F2F4F6] px-1.5 py-0.5 rounded">{stop.stopNo}</span>
                      </div>
                      <p className="text-[12px] text-[#8B95A1] mt-0.5">{formatDistance(stop.distance)} · 노선 {stop.routes.length}개</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); setFavs(p => { const n = new Set(p); n.has(stop.id) ? n.delete(stop.id) : n.add(stop.id); return n; }); }}>
                      <Star size={18} className={favs.has(stop.id) ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#E5E8EB]"} />
                    </button>
                    {open ? <ChevronUp size={18} className="text-[#B0B8C1]" /> : <ChevronDown size={18} className="text-[#B0B8C1]" />}
                  </div>
                </button>
                <div className="px-4 pb-4 space-y-2">
                  {routes.map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-[#F2F4F6] rounded-xl px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-[#3182F6] rounded-lg px-2.5 py-1 min-w-[38px] text-center">
                          <span className="text-white text-[13px] font-black">{r.routeNo}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-semibold text-[#191F28]">{r.destination} 방면</p>
                            {r.isExpress && <span className="flex items-center gap-0.5 text-[10px] font-bold bg-[#FFF3E0] text-[#E65100] px-1 py-0.5 rounded"><Zap size={9}/>급행</span>}
                            {r.isLowFloor && <Accessibility size={12} className="text-[#3182F6]" />}
                          </div>
                          <p className="text-[11px] text-[#8B95A1]">{r.remainingStops}정류장 전</p>
                        </div>
                      </div>
                      <ArrivalBadge min={r.arrivalMin} />
                    </div>
                  ))}
                  {!open && stop.routes.length > 2 && (
                    <button onClick={() => setExpanded(stop.id)} className="w-full text-[12px] text-[#3182F6] text-center py-1 active:opacity-60">
                      {stop.routes.length - 2}개 노선 더 보기
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <div className="bg-white rounded-2xl px-4 py-3 flex gap-4">
            {[["bg-[#F04452]","3분 이내"],["bg-[#FF9500]","7분 이내"],["bg-[#3182F6]","8분 이상"]].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${c}`} />
                <span className="text-[11px] text-[#8B95A1]">{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "지하철" && (
        <div className="px-4 space-y-3">
          {subwayStations.map(st => (
            <div key={st.id} className="bg-white rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: st.lineColor + "20" }}>
                  <Train size={20} style={{ color: st.lineColor }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-[#191F28]">{st.name}</p>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: st.lineColor }}>{st.line}</span>
                  </div>
                  <p className="text-[12px] text-[#8B95A1]">{formatDistance(st.distance)}</p>
                </div>
              </div>
              <div className="px-4 pb-4 space-y-2">
                {st.arrivals.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F2F4F6] rounded-xl px-3 py-3">
                    <div>
                      <p className="text-[13px] font-semibold text-[#191F28]">{a.direction}</p>
                      <p className="text-[11px] text-[#8B95A1]">열차 {a.trainNo}</p>
                    </div>
                    <ArrivalBadge min={a.arrivalMin} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="bg-[#EBF3FE] rounded-2xl px-4 py-3.5">
            <p className="text-[13px] font-bold text-[#3182F6]">🚇 검단 2호선 연장 예정</p>
            <p className="text-[12px] text-[#3182F6]/80 mt-1">2026년 하반기 착공 · 2030년 개통 목표</p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
