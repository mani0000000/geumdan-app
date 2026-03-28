"use client";

import { useState } from "react";
import {
  MapPin, RefreshCw, ChevronDown, ChevronUp,
  Clock, Users, Accessibility, Zap, Train,
  Star, StarOff
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { nearbyStops, subwayStations } from "@/lib/mockData";
import { formatDistance } from "@/lib/utils";
import { cn } from "@/lib/utils";

type TransportTab = "버스" | "지하철";

function ArrivalBadge({ minutes }: { minutes: number }) {
  const color =
    minutes <= 3
      ? "bg-red-500"
      : minutes <= 7
      ? "bg-orange-400"
      : "bg-blue-500";
  return (
    <div className={`${color} rounded-lg px-2.5 py-1.5 text-center min-w-[52px]`}>
      {minutes <= 0 ? (
        <span className="text-white text-[11px] font-bold">곧도착</span>
      ) : (
        <>
          <span className="text-white text-[18px] font-black leading-none">{minutes}</span>
          <span className="text-white/80 text-[10px] block">분 후</span>
        </>
      )}
    </div>
  );
}

export default function TransportPage() {
  const [activeTab, setActiveTab] = useState<TransportTab>("버스");
  const [expandedStop, setExpandedStop] = useState<string | null>("bs1");
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [lastUpdated] = useState("방금 전");

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setRefreshing(false);
  };

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-dvh bg-gray-100 pb-[70px]">
      <Header title="교통 정보" showNotification />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-[56px] z-30">
        <div className="flex">
          {(["버스", "지하철"] as TransportTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 h-11 text-[14px] font-semibold press-effect border-b-2 transition-colors",
                activeTab === tab
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-400 border-transparent"
              )}
            >
              {tab === "버스" ? "🚌 버스" : "🚇 지하철"}
            </button>
          ))}
        </div>
      </div>

      {/* Location + Refresh */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-blue-600" />
          <span className="text-[13px] text-gray-600 font-medium">당하동 현재 위치 기준</span>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1 press-effect"
        >
          <RefreshCw size={14} className={cn("text-gray-400", refreshing && "animate-spin")} />
          <span className="text-[12px] text-gray-400">{lastUpdated}</span>
        </button>
      </div>

      {activeTab === "버스" && (
        <div className="px-4 space-y-3">
          {nearbyStops.map((stop) => {
            const isExpanded = expandedStop === stop.id;
            return (
              <div key={stop.id} className="bg-white rounded-2xl overflow-hidden card-shadow">
                {/* Stop Header */}
                <button
                  onClick={() => setExpandedStop(isExpanded ? null : stop.id)}
                  className="w-full flex items-center justify-between px-4 py-4 press-effect"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-lg">🚏</span>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-bold text-gray-900">{stop.name}</p>
                        <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {stop.stopNo}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <MapPin size={11} className="text-gray-400" />
                        <span className="text-[12px] text-gray-400">
                          {formatDistance(stop.distance)}
                        </span>
                        <span className="text-[12px] text-gray-300">·</span>
                        <span className="text-[12px] text-gray-400">노선 {stop.routes.length}개</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFav(stop.id); }}
                      className="press-effect"
                    >
                      {favorites.has(stop.id) ? (
                        <Star size={18} className="text-yellow-400 fill-yellow-400" />
                      ) : (
                        <StarOff size={18} className="text-gray-300" />
                      )}
                    </button>
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Routes (Collapsed: show first 2) */}
                {!isExpanded && (
                  <div className="px-4 pb-4 space-y-2.5">
                    {stop.routes.slice(0, 2).map((route) => (
                      <RouteRow key={route.id} route={route} />
                    ))}
                    {stop.routes.length > 2 && (
                      <button
                        onClick={() => setExpandedStop(stop.id)}
                        className="w-full text-[12px] text-blue-600 text-center py-1 press-effect"
                      >
                        {stop.routes.length - 2}개 노선 더 보기
                      </button>
                    )}
                  </div>
                )}

                {/* Routes (Expanded: show all) */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2.5">
                    {stop.routes.map((route) => (
                      <RouteRow key={route.id} route={route} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Legend */}
          <div className="bg-white rounded-xl px-4 py-3 card-shadow">
            <p className="text-[12px] font-semibold text-gray-600 mb-2">도착 안내</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-[11px] text-gray-500">3분 이내</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                <span className="text-[11px] text-gray-500">7분 이내</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-[11px] text-gray-500">8분 이상</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "지하철" && (
        <div className="px-4 space-y-3">
          {subwayStations.map((station) => (
            <div key={station.id} className="bg-white rounded-2xl overflow-hidden card-shadow">
              {/* Station Header */}
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: station.lineColor + "20" }}
                  >
                    <Train size={20} style={{ color: station.lineColor }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold text-gray-900">{station.name}</p>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: station.lineColor }}
                      >
                        {station.line}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-gray-400" />
                      <span className="text-[12px] text-gray-400">{formatDistance(station.distance)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrivals */}
              <div className="px-4 pb-4 space-y-2.5">
                {station.arrivals.map((arr, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-3"
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800">{arr.direction}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">열차번호 {arr.trainNo}</p>
                    </div>
                    <ArrivalBadge minutes={arr.arrivalMin} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-blue-50 rounded-xl px-4 py-3.5">
            <p className="text-[13px] text-blue-700 font-semibold">🚇 검단 2호선 연장 예정</p>
            <p className="text-[12px] text-blue-600 mt-1">
              2026년 하반기 착공, 2030년 개통 목표로 공사가 진행됩니다.
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function RouteRow({ route }: { route: typeof nearbyStops[0]["routes"][0] }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <div className="bg-blue-600 rounded-lg px-2 py-1 min-w-[36px] text-center">
          <span className="text-white text-[13px] font-black">{route.routeNo}</span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold text-gray-800">{route.destination} 방면</p>
            {route.isExpress && (
              <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                <Zap size={9} />급행
              </span>
            )}
            {route.isLowFloor && (
              <Accessibility size={13} className="text-blue-400" />
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {route.remainingStops}정류장 전
          </p>
        </div>
      </div>
      <ArrivalBadge minutes={route.arrivalMin} />
    </div>
  );
}
