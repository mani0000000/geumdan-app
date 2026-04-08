"use client";
import { useState, useEffect, useCallback } from "react";
import {
  MapPin, RefreshCw, ChevronDown, ChevronUp, Star,
  Zap, Accessibility, Train, Navigation, Bus,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { Skeleton } from "@/components/ui/Skeleton";
import { nearbyStops, subwayStations } from "@/lib/mockData";
import {
  fetchBusStop, hasBusApiKey,
  fetchBusLocations, fetchRouteDetail, fetchStationsByRoute,
} from "@/lib/api/bus";
import type { BusRoute } from "@/lib/types";
import type { BusArrival, RouteDetail, RouteStation, BusLocation } from "@/lib/api/bus";

type Tab = "버스" | "지하철" | "즐겨찾기";

// ─── 정류장/역 좌표 ──────────────────────────────────────────
const STOP_COORDS: Record<string, [number, number]> = {
  bs1: [37.5448, 126.6875],
  bs2: [37.5452, 126.6842],
  bs3: [37.5431, 126.6817],
};
const STATION_COORDS: Record<string, [number, number]> = {
  sw1: [37.5642, 126.6578],
  sw2: [37.5443, 126.7201],
};

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function distLabel(m: number) {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

// ─── 도착 뱃지 ───────────────────────────────────────────────
function ArrivalBadge({ min, live }: { min: number; live: boolean }) {
  if (!live) {
    return (
      <div className="bg-[#E5E8EB] rounded-xl px-3 py-1.5 text-center min-w-[54px]">
        <span className="text-[#8B95A1] text-[14px] font-bold">--</span>
      </div>
    );
  }
  const bg = min <= 3 ? "bg-[#F04452]" : min <= 7 ? "bg-[#FF9500]" : "bg-[#3182F6]";
  return (
    <div className={`${bg} rounded-xl px-3 py-1.5 text-center min-w-[54px]`}>
      {min <= 0
        ? <span className="text-white text-[12px] font-bold">곧도착</span>
        : <>
            <span className="text-white text-[21px] font-black leading-none">{min}</span>
            <span className="text-white/80 text-[11px] block leading-none mt-0.5">분 후</span>
          </>
      }
    </div>
  );
}

function SkeletonStop() {
  return (
    <div className="bg-white rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      {[1, 2].map(i => (
        <div key={i} className="flex items-center justify-between bg-[#F2F4F6] rounded-xl px-3 py-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-10 h-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="w-14 h-12 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ─── 버스 상세 바텀 시트 ──────────────────────────────────────
function BusDetailSheet({
  arrival,
  onClose,
}: {
  arrival: BusArrival;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<RouteDetail | null>(null);
  const [stations, setStations] = useState<RouteStation[]>([]);
  const [locations, setLocations] = useState<BusLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirTab, setDirTab] = useState<0 | 1>(0); // 0=상행, 1=하행

  useEffect(() => {
    if (!arrival.routeId) { setLoading(false); return; }
    Promise.all([
      fetchRouteDetail(arrival.routeId),
      fetchStationsByRoute(arrival.routeId),
      fetchBusLocations(arrival.routeId),
    ]).then(([d, s, l]) => {
      setDetail(d);
      setStations(s);
      setLocations(l);
      setLoading(false);
    });
  }, [arrival.routeId]);

  const upStations   = stations.filter(s => s.direction === 0);
  const downStations = stations.filter(s => s.direction === 1);
  const curStations  = dirTab === 0 ? upStations : downStations;
  const busesOnDir   = locations.filter(l => l.direction === dirTab);
  const busSeqs      = new Set(busesOnDir.map(b => b.stationSeq));

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[200]" onClick={onClose} />
      <div className="fixed left-0 right-0 bottom-0 bg-white rounded-t-3xl z-[250]"
        style={{ maxHeight: "86%", display: "flex", flexDirection: "column" }}>

        {/* 헤더 */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-[#F2F4F6]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="bg-[#3182F6] rounded-xl px-3.5 py-1.5">
                <span className="text-white text-[20px] font-black">{arrival.routeNo}</span>
              </div>
              {arrival.isExpress && (
                <span className="flex items-center gap-1 text-[12px] font-bold bg-[#FFF3E0] text-[#E65100] px-2 py-1 rounded-lg">
                  <Zap size={10} />급행
                </span>
              )}
              {arrival.isLowFloor && (
                <span className="flex items-center gap-1 text-[12px] font-bold bg-[#EBF3FE] text-[#3182F6] px-2 py-1 rounded-lg">
                  <Accessibility size={10} />저상
                </span>
              )}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F2F4F6] flex items-center justify-center active:opacity-60">
              <span className="text-[#8B95A1] text-[16px] font-bold">✕</span>
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="h-4 w-48 bg-[#F2F4F6] rounded animate-pulse" />
              <div className="h-3 w-32 bg-[#F2F4F6] rounded animate-pulse" />
            </div>
          ) : detail ? (
            <>
              <p className="text-[13px] text-[#4E5968] font-medium">
                {detail.startStation} ↔ {detail.endStation}
              </p>
              {/* 첫차/막차 */}
              <div className="flex gap-3 mt-3">
                <div className="flex-1 bg-[#F8F9FA] rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-[#8B95A1] font-medium mb-0.5">상행 첫차/막차</p>
                  <p className="text-[13px] font-bold text-[#191F28]">
                    {detail.upFirstTime || "-"} / {detail.upLastTime || "-"}
                  </p>
                </div>
                <div className="flex-1 bg-[#F8F9FA] rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-[#8B95A1] font-medium mb-0.5">하행 첫차/막차</p>
                  <p className="text-[13px] font-bold text-[#191F28]">
                    {detail.downFirstTime || "-"} / {detail.downLastTime || "-"}
                  </p>
                </div>
              </div>
              {detail.interval > 0 && (
                <p className="text-[12px] text-[#8B95A1] mt-2">배차 간격 약 {detail.interval}분</p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-[#8B95A1]">{arrival.destination} 방면</p>
          )}
        </div>

        {/* 상행/하행 탭 */}
        {stations.length > 0 && (
          <div className="shrink-0 flex border-b border-[#F2F4F6]">
            {([0, 1] as const).map(dir => (
              <button key={dir} onClick={() => setDirTab(dir)}
                className={`flex-1 h-10 text-[13px] font-semibold border-b-2 transition-colors ${
                  dirTab === dir ? "text-[#3182F6] border-[#3182F6]" : "text-[#B0B8C1] border-transparent"
                }`}>
                {dir === 0 ? "⬆ 상행" : "⬇ 하행"}
                {busesOnDir.length > 0 && dirTab === dir && (
                  <span className="ml-1.5 text-[11px] font-black text-[#F04452]">
                    🚌 {busesOnDir.length}대 운행중
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* 정류장 목록 */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#E5E8EB]" />
                  <div className="h-4 flex-1 bg-[#F2F4F6] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : curStations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[14px] text-[#8B95A1]">정류장 정보를 불러올 수 없습니다</p>
            </div>
          ) : (
            <div className="relative">
              {/* 수직선 */}
              <div className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-[#E5E8EB]" />
              <div className="space-y-0">
                {curStations.map((st, idx) => {
                  const hasBus = busSeqs.has(st.seq);
                  const isFirst = idx === 0;
                  const isLast = idx === curStations.length - 1;
                  return (
                    <div key={st.stationId + st.seq} className="flex items-center gap-3 py-2">
                      <div className={`relative z-10 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        hasBus ? "bg-[#F04452] shadow-lg shadow-red-200" :
                        (isFirst || isLast) ? "bg-[#3182F6]" : "bg-white border-2 border-[#D1D5DB]"
                      }`}>
                        {hasBus && <span className="text-[8px]">🚌</span>}
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className={`text-[13px] ${
                          hasBus ? "font-bold text-[#F04452]" :
                          (isFirst || isLast) ? "font-bold text-[#3182F6]" : "text-[#4E5968]"
                        }`}>
                          {st.stationName}
                        </span>
                        {hasBus && (
                          <span className="text-[11px] font-bold text-white bg-[#F04452] px-2 py-0.5 rounded-full">
                            여기
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── 버스 노선 행 ─────────────────────────────────────────────
function RouteRow({
  route,
  isFav,
  live,
  onToggleFav,
  onSelect,
}: {
  route: BusRoute;
  isFav: boolean;
  live: boolean;
  onToggleFav: () => void;
  onSelect: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-[#F2F4F6] rounded-xl px-3 py-3"
      onClick={onSelect}>
      <div className="flex items-center gap-2.5">
        <div className="bg-[#3182F6] rounded-lg px-2.5 py-1 min-w-[38px] text-center">
          <span className="text-white text-[14px] font-black">{route.routeNo}</span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-[14px] font-semibold text-[#191F28]">{route.destination} 방면</p>
            {route.isExpress && (
              <span className="flex items-center gap-0.5 text-[11px] font-bold bg-[#FFF3E0] text-[#E65100] px-1 py-0.5 rounded">
                <Zap size={9} />급행
              </span>
            )}
            {route.isLowFloor && <Accessibility size={12} className="text-[#3182F6]" />}
          </div>
          <p className="text-[12px] text-[#8B95A1]">
            {live ? `${route.remainingStops}정류장 전` : "실시간 연동 필요"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={e => { e.stopPropagation(); onToggleFav(); }} className="p-1 active:opacity-60">
          <Star size={15} className={isFav ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#D1D5DB]"} />
        </button>
        <ArrivalBadge min={route.arrivalMin} live={live} />
      </div>
    </div>
  );
}

export default function TransportPage() {
  const [tab, setTab] = useState<Tab>("버스");
  const [expanded, setExpanded] = useState<string | null>("bs1");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favStops, setFavStops] = useState<Set<string>>(new Set());
  const [favRoutes, setFavRoutes] = useState<Set<string>>(new Set()); // "stopId::routeId"
  const [favSubways, setFavSubways] = useState<Set<string>>(new Set());
  const [liveRoutes, setLiveRoutes] = useState<Record<string, BusRoute[]>>({});
  const [selectedArrival, setSelectedArrival] = useState<BusArrival | null>(null);
  const [liveArrivals, setLiveArrivals] = useState<Record<string, BusArrival[]>>({}); // stopId → arrivals
  const [lastUpdated, setLastUpdated] = useState("");
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locState, setLocState] = useState<"loading" | "ok" | "denied" | "idle">("idle");
  const isLive = hasBusApiKey();

  // 위치
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocState("loading");
    navigator.geolocation.getCurrentPosition(
      pos => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocState("ok"); },
      ()  => { setUserPos({ lat: 37.5446, lng: 126.6861 }); setLocState("denied"); },
      { timeout: 8000 }
    );
  }, []);

  // 버스 데이터
  const loadBusData = useCallback(async () => {
    if (!isLive) { setLoading(false); return; }
    try {
      const results = await Promise.all(
        nearbyStops.map(async stop => {
          const arrivals = await fetchBusStop(stop.name);
          if (!arrivals.length) return { id: stop.id, routes: stop.routes, arrivals: [] };
          const routes: BusRoute[] = arrivals.map((a, i) => ({
            id: `live-${stop.id}-${i}`,
            routeNo: a.routeNo, destination: a.destination,
            arrivalMin: a.arrivalMin, remainingStops: a.remainingStops,
            isLowFloor: a.isLowFloor, isExpress: a.isExpress,
          }));
          return { id: stop.id, routes, arrivals };
        })
      );
      setLiveRoutes(Object.fromEntries(results.map(r => [r.id, r.routes])));
      setLiveArrivals(Object.fromEntries(results.map(r => [r.id, r.arrivals])));
      setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
    } catch { /* fallback */ }
    setLoading(false);
  }, [isLive]);

  useEffect(() => { loadBusData(); }, [loadBusData]);

  const refresh = async () => { setRefreshing(true); await loadBusData(); setRefreshing(false); };

  // 위치 기반 정렬
  const base = userPos ?? { lat: 37.5446, lng: 126.6861 };
  const stopsWithRoutes = nearbyStops
    .map(stop => ({
      ...stop,
      routes: liveRoutes[stop.id] ?? stop.routes,
      distM: STOP_COORDS[stop.id]
        ? haversineM(base.lat, base.lng, STOP_COORDS[stop.id][0], STOP_COORDS[stop.id][1])
        : stop.distance,
    }))
    .sort((a, b) => a.distM - b.distM);

  const stationsWithDist = subwayStations
    .map(st => ({
      ...st,
      distM: STATION_COORDS[st.id]
        ? haversineM(base.lat, base.lng, STATION_COORDS[st.id][0], STATION_COORDS[st.id][1])
        : st.distance,
    }))
    .sort((a, b) => a.distM - b.distM);

  function toggleStop(id: string) {
    setFavStops(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleRoute(key: string) {
    setFavRoutes(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  function toggleSubway(id: string) {
    setFavSubways(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const totalFavs = favStops.size + favRoutes.size + favSubways.size;

  // ─── 즐겨찾기 탭 데이터 ─────────────────────────────────────
  const favStopList = stopsWithRoutes.filter(s => favStops.has(s.id));
  const favRouteList = stopsWithRoutes.flatMap(stop =>
    stop.routes
      .filter(r => favRoutes.has(`${stop.id}::${r.id}`))
      .map(r => ({ ...r, stopName: stop.name, stopId: stop.id }))
  );
  const favSubwayList = stationsWithDist.filter(s => favSubways.has(s.id));

  // 위치 상태 뱃지
  function LocBadge() {
    if (locState === "loading")
      return <span className="text-[12px] text-[#8B95A1] animate-pulse">위치 확인 중...</span>;
    if (locState === "ok")
      return (
        <span className="flex items-center gap-1 text-[12px] font-bold bg-[#D1FAE5] text-[#065F46] px-2 py-0.5 rounded-full">
          <Navigation size={10} />내 위치
        </span>
      );
    return <span className="text-[12px] text-[#B0B8C1]">검단신도시 기준</span>;
  }

  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-20">
      <Header title="교통 정보" />

      {/* 버스 상세 바텀 시트 */}
      {selectedArrival && (
        <BusDetailSheet
          arrival={selectedArrival}
          onClose={() => setSelectedArrival(null)}
        />
      )}

      {/* 탭 */}
      <div className="bg-white sticky top-[56px] z-30 border-b border-[#F2F4F6] flex">
        {(["버스", "지하철", "즐겨찾기"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 h-11 text-[14px] font-semibold border-b-2 transition-colors relative ${
              t === tab ? "text-[#3182F6] border-[#3182F6]" : "text-[#B0B8C1] border-transparent"
            }`}>
            {t === "버스" ? "🚌 버스" : t === "지하철" ? "🚇 지하철" : "⭐ 즐겨찾기"}
            {t === "즐겨찾기" && totalFavs > 0 && (
              <span className="absolute -top-0.5 right-3 text-[10px] font-black bg-[#F04452] text-white w-4 h-4 rounded-full flex items-center justify-center">
                {totalFavs}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 위치 상태 바 */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-[#3182F6]" />
          <span className="text-[13px] text-[#4E5968] font-medium">가까운 순 정렬</span>
          <LocBadge />
        </div>
        <button onClick={refresh} className="flex items-center gap-1 active:opacity-60">
          <RefreshCw size={13} className={`text-[#8B95A1] ${refreshing ? "animate-spin" : ""}`} />
          <span className="text-[12px] text-[#8B95A1]">{lastUpdated || "새로고침"}</span>
        </button>
      </div>

      {/* ══ 버스 탭 ══════════════════════════════════════════ */}
      {tab === "버스" && (
        <div className="px-4 space-y-3">
          {loading ? (
            <><SkeletonStop /><SkeletonStop /></>
          ) : (
            stopsWithRoutes.map((stop, idx) => {
              const open = expanded === stop.id;
              const routes = open ? stop.routes : stop.routes.slice(0, 2);
              return (
                <div key={stop.id} className="bg-white rounded-2xl overflow-hidden">
                  <button onClick={() => setExpanded(open ? null : stop.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 active:bg-[#F2F4F6]">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-[#EBF3FE] flex items-center justify-center">
                          <Bus size={18} className="text-[#3182F6]" />
                        </div>
                        {idx === 0 && (
                          <span className="absolute -top-1 -right-1 text-[9px] font-black bg-[#3182F6] text-white px-1 rounded-full leading-tight py-0.5">
                            최근접
                          </span>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-bold text-[#191F28]">{stop.name}</p>
                          <span className="text-[11px] text-[#B0B8C1] bg-[#F2F4F6] px-1.5 py-0.5 rounded">{stop.stopNo}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Navigation size={10} className="text-[#3182F6]" />
                          <span className="text-[12px] font-semibold text-[#3182F6]">{distLabel(stop.distM)}</span>
                          <span className="text-[12px] text-[#B0B8C1]">· 노선 {stop.routes.length}개</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={e => { e.stopPropagation(); toggleStop(stop.id); }}
                        className="p-1.5 active:opacity-60">
                        <Star size={18} className={favStops.has(stop.id) ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#E5E8EB]"} />
                      </button>
                      {open ? <ChevronUp size={16} className="text-[#B0B8C1]" /> : <ChevronDown size={16} className="text-[#B0B8C1]" />}
                    </div>
                  </button>
                  <div className="px-4 pb-4 space-y-2">
                    {routes.map((r, i) => (
                      <RouteRow
                        key={r.id}
                        route={r}
                        live={isLive}
                        isFav={favRoutes.has(`${stop.id}::${r.id}`)}
                        onToggleFav={() => toggleRoute(`${stop.id}::${r.id}`)}
                        onSelect={() => {
                          const arr = liveArrivals[stop.id]?.[i];
                          if (arr) setSelectedArrival(arr);
                        }}
                      />
                    ))}
                    {!open && stop.routes.length > 2 && (
                      <button onClick={() => setExpanded(stop.id)}
                        className="w-full text-[13px] text-[#3182F6] text-center py-1">
                        {stop.routes.length - 2}개 노선 더 보기
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* 범례 — 실시간 연동 시에만 의미 있음 */}
          {isLive && (
            <div className="bg-white rounded-2xl px-4 py-3 flex gap-4">
              {[["bg-[#F04452]", "3분 이내"], ["bg-[#FF9500]", "7분 이내"], ["bg-[#3182F6]", "8분 이상"]].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${c}`} />
                  <span className="text-[12px] text-[#8B95A1]">{l}</span>
                </div>
              ))}
            </div>
          )}

          {!isLive && (
            <div className="bg-[#FFFDE7] rounded-2xl px-4 py-3 space-y-1">
              <p className="text-[13px] font-bold text-[#F57F17]">⚠️ 실시간 연동 미설정</p>
              <p className="text-[12px] text-[#F57F17]/80 leading-relaxed">
                현재 노선 정보만 표시됩니다. 실시간 도착 정보를 보려면 공공데이터포털에서{" "}
                <strong>인천광역시 버스도착정보 API 키</strong>를 발급받아 GitHub 시크릿{" "}
                <code className="font-mono bg-[#FFF9C4] px-1 rounded">NEXT_PUBLIC_BUS_API_KEY</code>에 설정 후 재배포하세요.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══ 지하철 탭 ════════════════════════════════════════ */}
      {tab === "지하철" && (
        <div className="px-4 space-y-3">
          {stationsWithDist.map((st, idx) => (
            <div key={st.id} className="bg-white rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: st.lineColor + "20" }}>
                    <Train size={20} style={{ color: st.lineColor }} />
                  </div>
                  {idx === 0 && (
                    <span className="absolute -top-1 -right-1 text-[9px] font-black bg-[#3182F6] text-white px-1 rounded-full leading-tight py-0.5">
                      최근접
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[16px] font-bold text-[#191F28]">{st.name}</p>
                    <span className="text-[12px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: st.lineColor }}>{st.line}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Navigation size={10} className="text-[#3182F6]" />
                    <span className="text-[12px] font-semibold text-[#3182F6]">{distLabel(st.distM)}</span>
                  </div>
                </div>
                <button onClick={() => toggleSubway(st.id)} className="p-1.5 active:opacity-60">
                  <Star size={20}
                    className={favSubways.has(st.id) ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#E5E8EB]"} />
                </button>
              </div>
              <div className="px-4 pb-4 space-y-2">
                {st.arrivals.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F2F4F6] rounded-xl px-3 py-3">
                    <div>
                      <p className="text-[14px] font-semibold text-[#191F28]">{a.direction}</p>
                      <p className="text-[12px] text-[#8B95A1]">열차 {a.trainNo}</p>
                    </div>
                    <ArrivalBadge min={a.arrivalMin} live={false} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="bg-[#EBF3FE] rounded-2xl px-4 py-3.5">
            <p className="text-[14px] font-bold text-[#3182F6]">🚇 검단 2호선 연장 예정</p>
            <p className="text-[13px] text-[#3182F6]/80 mt-1">2026년 하반기 착공 · 2030년 개통 목표</p>
          </div>
        </div>
      )}

      {/* ══ 즐겨찾기 탭 ══════════════════════════════════════ */}
      {tab === "즐겨찾기" && (
        <div className="px-4 space-y-3">
          {totalFavs === 0 ? (
            <div className="bg-white rounded-2xl py-16 flex flex-col items-center gap-3">
              <Star size={32} className="text-[#E5E8EB]" />
              <p className="text-[15px] font-medium text-[#8B95A1]">즐겨찾기가 없습니다</p>
              <p className="text-[13px] text-[#B0B8C1] text-center leading-relaxed">
                버스 탭에서 정류장/노선 ★ 버튼으로<br />즐겨찾기를 추가하세요
              </p>
            </div>
          ) : (
            <>
              {/* 즐겨찾기 정류장 */}
              {favStopList.length > 0 && (
                <div>
                  <p className="text-[13px] font-bold text-[#8B95A1] uppercase tracking-wide mb-2">📍 즐겨찾는 정류장</p>
                  {favStopList.map(stop => (
                    <div key={stop.id} className="bg-white rounded-2xl overflow-hidden mb-2.5">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F4F6]">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-bold text-[#191F28]">{stop.name}</span>
                          <span className="text-[11px] text-[#B0B8C1] bg-[#F2F4F6] px-1.5 py-0.5 rounded">{stop.stopNo}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Navigation size={11} className="text-[#3182F6]" />
                          <span className="text-[13px] font-semibold text-[#3182F6]">{distLabel(stop.distM)}</span>
                          <button onClick={async () => { setRefreshing(true); await loadBusData(); setRefreshing(false); }}
                            className="ml-1 bg-[#EBF3FE] rounded-lg px-2.5 py-1 active:opacity-60">
                            <RefreshCw size={12} className={`text-[#3182F6] ${refreshing ? "animate-spin" : ""}`} />
                          </button>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        {stop.routes.slice(0, 3).map(r => (
                          <div key={r.id} className="flex items-center justify-between bg-[#F2F4F6] rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="bg-[#3182F6] rounded-lg px-2 py-0.5 min-w-[34px] text-center">
                                <span className="text-white text-[13px] font-black">{r.routeNo}</span>
                              </div>
                              <div>
                                <span className="text-[13px] font-medium text-[#191F28]">{r.destination} 방면</span>
                                {r.isExpress && <span className="ml-1.5 text-[11px] text-[#E65100] font-bold">급행</span>}
                                <p className="text-[11px] text-[#8B95A1]">{r.remainingStops}정류장 전</p>
                              </div>
                            </div>
                            <ArrivalBadge min={r.arrivalMin} live={isLive} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 즐겨찾기 노선 */}
              {favRouteList.length > 0 && (
                <div>
                  <p className="text-[13px] font-bold text-[#8B95A1] uppercase tracking-wide mb-2">🚌 즐겨찾는 버스 노선</p>
                  <div className="bg-white rounded-2xl p-3 space-y-2">
                    {favRouteList.map(r => (
                      <div key={`${r.stopId}::${r.id}`} className="flex items-center justify-between bg-[#F2F4F6] rounded-xl px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="bg-[#3182F6] rounded-lg px-2.5 py-1 min-w-[38px] text-center">
                            <span className="text-white text-[14px] font-black">{r.routeNo}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-[14px] font-semibold text-[#191F28]">{r.destination} 방면</p>
                              {r.isExpress && <span className="text-[11px] text-[#E65100] font-bold">급행</span>}
                            </div>
                            <p className="text-[12px] text-[#8B95A1]">{r.stopName}</p>
                          </div>
                        </div>
                        <ArrivalBadge min={r.arrivalMin} live={isLive} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 즐겨찾기 지하철 */}
              {favSubwayList.length > 0 && (
                <div>
                  <p className="text-[13px] font-bold text-[#8B95A1] uppercase tracking-wide mb-2">🚇 즐겨찾는 지하철역</p>
                  {favSubwayList.map(st => (
                    <div key={st.id} className="bg-white rounded-2xl overflow-hidden mb-2.5">
                      <div className="px-4 py-3 flex items-center gap-3 border-b border-[#F2F4F6]">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: st.lineColor + "20" }}>
                          <Train size={16} style={{ color: st.lineColor }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold text-[#191F28]">{st.name}</span>
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white"
                              style={{ background: st.lineColor }}>{st.line}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Navigation size={10} className="text-[#3182F6]" />
                            <span className="text-[12px] font-semibold text-[#3182F6]">{distLabel(st.distM)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        {st.arrivals.map((a, i) => (
                          <div key={i} className="flex items-center justify-between bg-[#F2F4F6] rounded-xl px-3 py-2.5">
                            <div>
                              <p className="text-[13px] font-semibold text-[#191F28]">{a.direction}</p>
                              <p className="text-[11px] text-[#8B95A1]">열차 {a.trainNo}</p>
                            </div>
                            <ArrivalBadge min={a.arrivalMin} live={false} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
