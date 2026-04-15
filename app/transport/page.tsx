"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapPin, RefreshCw, ChevronDown, ChevronUp, Star,
  Zap, Accessibility, Train, Navigation, Bus, AlertCircle,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  hasBusApiKey,
  haversineM,
  fetchNearbyStopsWide, fetchArrivalsByStationId,
  fetchBusLocations, fetchRouteDetail, fetchStationsByRoute,
} from "@/lib/api/bus";
import {
  findNearbySubwayStations, fetchSubwayArrivals, hasSubwayKey,
  type SubwayStationWithDist, type SubwayArrival,
} from "@/lib/api/subway";
import type { BusRoute } from "@/lib/types";
import type { BusArrival, RouteDetail, RouteStation, BusLocation } from "@/lib/api/bus";

type Tab = "버스" | "지하철";

// 실시간 또는 목업 정류장을 통합하는 디스플레이 타입
type DisplayStop = {
  id: string;
  name: string;
  stopNo: string;   // API 정류장은 stationId, 목업은 "36-219" 등
  distM: number;
  routes: BusRoute[];
  arrivals: BusArrival[];
  lat?: number;
  lng?: number;
};


function distLabel(m: number) {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

// localStorage helpers for favorites persistence
function loadFavSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { return new Set(); }
}
function saveFavSet(key: string, set: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch { /* ignore */ }
}

// localStorage cache for API stops (stale-while-revalidate)
const STOPS_CACHE_KEY = "transport_stops_v2";
const STOPS_CACHE_TTL = 5 * 60 * 1000; // 5분

function loadCachedStops(): DisplayStop[] | null {
  try {
    const raw = localStorage.getItem(STOPS_CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: DisplayStop[] };
    if (Date.now() - ts > STOPS_CACHE_TTL) return null;
    return data;
  } catch { return null; }
}
function saveCachedStops(stops: DisplayStop[]) {
  try {
    localStorage.setItem(STOPS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: stops }));
  } catch { /* ignore */ }
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [favStops, setFavStops] = useState<Set<string>>(() => loadFavSet("favStops"));
  const [favRoutes, setFavRoutes] = useState<Set<string>>(() => loadFavSet("favRoutes"));
  const [favSubways, setFavSubways] = useState<Set<string>>(() => loadFavSet("favSubways"));
  const [selectedArrival, setSelectedArrival] = useState<BusArrival | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locState, setLocState] = useState<"loading" | "ok" | "denied" | "idle">("idle");
  // GPS 기반으로 API에서 조회한 정류장 (null = 미조회)
  const [apiStops, setApiStops] = useState<DisplayStop[] | null>(null);
  // 지하철 역 + 실시간 도착정보
  const [subwayList, setSubwayList] = useState<(SubwayStationWithDist & { arrivals: SubwayArrival[]; loadingArrivals: boolean })[]>([]);
  const [subwayLoading, setSubwayLoading] = useState(false);
  const isLive = hasBusApiKey();
  const posRef = useRef<{ lat: number; lng: number } | null>(null);

  // ── GPS 기반 버스 데이터 로드 (3km, progressive) ─────────────
  const loadBusData = useCallback(async (lat: number, lng: number) => {
    if (!isLive) { return; }
    setLoading(true);
    try {
      // 1. 3km 이내 주변 정류장 조회 (5방향 병렬)
      const nearby = await fetchNearbyStopsWide(lat, lng);

      if (nearby.length === 0) {
        // API 결과 없으면 목업 데이터 유지 (null = 목업 폴백)
        setApiStops(null);
        setLoading(false);
        return;
      }

      // 2. 최대 12개 정류장을 즉시 노출 (도착정보 로딩 전에 정류장명 먼저 표시)
      const top = nearby.slice(0, 12);
      const initialStops: DisplayStop[] = top.map(stop => ({
        id: stop.stationId,
        name: stop.stationName,
        stopNo: "",
        distM: stop.distanceM,
        routes: [],
        arrivals: [],
        lat: stop.lat,
        lng: stop.lng,
      }));
      setApiStops(initialStops);
      setLoading(false);
      if (initialStops.length > 0 && !expanded) setExpanded(initialStops[0].id);

      // 3. 도착정보 병렬 조회 후 정류장별로 순차 업데이트
      const finalStops = [...initialStops];
      await Promise.allSettled(
        top.map(async (stop, idx) => {
          const arrivals = await fetchArrivalsByStationId(stop.stationId);
          const routes: BusRoute[] = arrivals.map((a, i) => ({
            id: `live-${stop.stationId}-${i}`,
            routeNo: a.routeNo,
            destination: a.destination,
            arrivalMin: a.arrivalMin,
            remainingStops: a.remainingStops,
            isLowFloor: a.isLowFloor,
            isExpress: a.isExpress,
          }));
          finalStops[idx] = { ...finalStops[idx], routes, arrivals };
          setApiStops(prev =>
            prev ? prev.map(s =>
              s.id === stop.stationId ? { ...s, routes, arrivals } : s
            ) : prev
          );
        })
      );

      // 캐시에 저장 (다음 방문 시 즉시 표시)
      saveCachedStops(finalStops);
      setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setLoading(false);
      setApiStops(prev => prev ?? null);
    }
  }, [isLive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 지하철 도착정보 로드 ──────────────────────────────────────
  const loadSubwayData = useCallback(async (lat: number, lng: number) => {
    setSubwayLoading(true);
    const nearby = findNearbySubwayStations(lat, lng);
    setSubwayList(nearby.map(st => ({ ...st, arrivals: [], loadingArrivals: true })));
    setSubwayLoading(false);

    if (hasSubwayKey()) {
      await Promise.allSettled(
        nearby.map(async st => {
          const arrivals = await fetchSubwayArrivals(st);
          setSubwayList(prev =>
            prev.map(s => s.id === st.id ? { ...s, arrivals, loadingArrivals: false } : s)
          );
        })
      );
    } else {
      setSubwayList(prev => prev.map(s => ({ ...s, loadingArrivals: false })));
    }
  }, []);

  // ── GPS 취득 → loadBusData + loadSubwayData 호출 ──────────────
  useEffect(() => {
    // 캐시된 정류장 즉시 표시 (stale-while-revalidate)
    if (isLive) {
      const cached = loadCachedStops();
      if (cached && cached.length > 0) setApiStops(cached);
    }

    const DEFAULT = { lat: 37.594, lng: 126.710 }; // 검단신도시 중심
    if (!navigator.geolocation) {
      posRef.current = DEFAULT;
      setUserPos(DEFAULT);
      setLocState("denied");
      loadBusData(DEFAULT.lat, DEFAULT.lng);
      return;
    }
    setLocState("loading");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        posRef.current = p;
        setUserPos(p);
        setLocState("ok");
        loadBusData(p.lat, p.lng);
        loadSubwayData(p.lat, p.lng);
      },
      () => {
        posRef.current = DEFAULT;
        setUserPos(DEFAULT);
        setLocState("denied");
        loadBusData(DEFAULT.lat, DEFAULT.lng);
        loadSubwayData(DEFAULT.lat, DEFAULT.lng);
      },
      { timeout: 5000, maximumAge: 30000, enableHighAccuracy: false }
    );
  }, [loadBusData, loadSubwayData, isLive]);

  const refresh = async () => {
    const p = posRef.current ?? { lat: 37.594, lng: 126.710 };
    setRefreshing(true);
    await Promise.all([
      loadBusData(p.lat, p.lng),
      loadSubwayData(p.lat, p.lng),
    ]);
    setRefreshing(false);
  };

  // ── 버스 정류장 목록 (API 전용, 목업 없음) ──────────────────
  const stopsWithRoutes: DisplayStop[] = apiStops ?? [];

  // liveArrivals: stopsWithRoutes에 arrivals 내장
  const liveArrivals: Record<string, BusArrival[]> = Object.fromEntries(
    stopsWithRoutes.map(s => [s.id, s.arrivals])
  );

  function toggleStop(id: string) {
    setFavStops(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); saveFavSet("favStops", n); return n; });
  }
  function toggleRoute(key: string) {
    setFavRoutes(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); saveFavSet("favRoutes", n); return n; });
  }
  function toggleSubway(id: string) {
    setFavSubways(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); saveFavSet("favSubways", n); return n; });
  }

  const favStopList = stopsWithRoutes.filter(s => favStops.has(s.id));
  const favRouteList = stopsWithRoutes.flatMap(stop =>
    stop.routes
      .filter(r => favRoutes.has(`${stop.id}::${r.id}`))
      .map(r => ({ ...r, stopName: stop.name, stopId: stop.id }))
  );
  const favSubwayList = subwayList.filter(s => favSubways.has(s.id));

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
        {(["버스", "지하철"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 h-11 text-[14px] font-semibold border-b-2 transition-colors ${
              t === tab ? "text-[#3182F6] border-[#3182F6]" : "text-[#B0B8C1] border-transparent"
            }`}>
            {t === "버스" ? "🚌 버스" : "🚇 지하철"}
          </button>
        ))}
      </div>

      {/* ══ 버스 즐겨찾기 인라인 (버스 탭 전용) ══════════════════ */}
      {tab === "버스" && (favStopList.length > 0 || favRouteList.length > 0) && (
        <div className="bg-white border-b border-[#F2F4F6]">
          <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Star size={12} className="text-[#FFBB00] fill-[#FFBB00]" />
              <span className="text-[12px] font-bold text-[#4E5968]">즐겨찾기</span>
            </div>
            <button onClick={refresh} className="flex items-center gap-1 active:opacity-60">
              <RefreshCw size={11} className={`text-[#8B95A1] ${refreshing ? "animate-spin" : ""}`} />
              <span className="text-[11px] text-[#8B95A1]">{lastUpdated || "새로고침"}</span>
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
            {favRouteList.map(r => (
              <div key={`${r.stopId}::${r.id}`}
                className="shrink-0 bg-[#F8F9FA] rounded-2xl px-3 py-2.5 w-[130px] border border-[#F2F4F6]">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="bg-[#3182F6] rounded-lg px-2 py-0.5">
                    <span className="text-white text-[13px] font-black leading-tight">{r.routeNo}</span>
                  </div>
                  {r.isExpress && <Zap size={9} className="text-[#E65100]" />}
                </div>
                <p className="text-[10px] text-[#8B95A1] truncate mb-2">{r.stopName}</p>
                <ArrivalBadge min={r.arrivalMin} live={isLive} />
              </div>
            ))}
            {favStopList.map(stop => (
              <div key={stop.id}
                className="shrink-0 bg-[#F8F9FA] rounded-2xl px-3 py-2.5 w-[130px] border border-[#F2F4F6]">
                <div className="flex items-center gap-1 mb-1">
                  <MapPin size={10} className="text-[#3182F6] shrink-0" />
                  <span className="text-[11px] font-bold text-[#191F28] truncate">{stop.name}</span>
                </div>
                <p className="text-[10px] text-[#B0B8C1] mb-2">{distLabel(stop.distM)}</p>
                <div className="flex flex-wrap gap-1">
                  {stop.routes.slice(0, 4).map(r => (
                    <div key={r.id} className="bg-[#3182F6] rounded px-1.5 py-0.5">
                      <span className="text-white text-[10px] font-bold">{r.routeNo}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ 지하철 즐겨찾기 인라인 (지하철 탭 전용) ══════════════ */}
      {tab === "지하철" && favSubwayList.length > 0 && (
        <div className="bg-white border-b border-[#F2F4F6]">
          <div className="flex items-center px-4 pt-3 pb-1.5 gap-1.5">
            <Star size={12} className="text-[#FFBB00] fill-[#FFBB00]" />
            <span className="text-[12px] font-bold text-[#4E5968]">즐겨찾기</span>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
            {favSubwayList.map(st => {
              const nextUp   = st.arrivals.find(a => a.direction === "상행");
              const nextDown = st.arrivals.find(a => a.direction === "하행");
              return (
                <div key={st.id}
                  className="shrink-0 bg-[#F8F9FA] rounded-2xl px-3 py-2.5 w-[155px] border border-[#F2F4F6]">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Train size={11} style={{ color: st.lineColor }} className="shrink-0" />
                    <span className="text-[12px] font-bold text-[#191F28] truncate">{st.displayName}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white inline-block mb-2"
                    style={{ background: st.lineColor }}>{st.line}</span>
                  {st.loadingArrivals ? (
                    <div className="h-8 bg-[#E5E8EB] rounded animate-pulse" />
                  ) : nextUp || nextDown ? (
                    <div className="space-y-1">
                      {nextUp && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#8B95A1]">상행</span>
                          <ArrivalBadge min={nextUp.arrivalMin} live />
                        </div>
                      )}
                      {nextDown && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-[#8B95A1]">하행</span>
                          <ArrivalBadge min={nextDown.arrivalMin} live />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#3182F6] font-semibold">{distLabel(st.distM)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          {!isLive ? (
            <div className="bg-[#FFFDE7] rounded-2xl px-4 py-5 flex items-start gap-3">
              <AlertCircle size={18} className="text-[#F57F17] shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-bold text-[#F57F17]">버스 API 키 미설정</p>
                <p className="text-[12px] text-[#F57F17]/80 mt-0.5 leading-relaxed">
                  공공데이터포털에서 인천광역시 버스도착정보 API 키를 발급받아<br />
                  <code className="font-mono bg-[#FFF9C4] px-1 rounded">NEXT_PUBLIC_BUS_API_KEY</code> 로 설정하세요.
                </p>
              </div>
            </div>
          ) : (loading || refreshing) && !apiStops ? (
            <><SkeletonStop /><SkeletonStop /></>
          ) : stopsWithRoutes.length === 0 ? (
            <div className="bg-white rounded-2xl px-4 py-10 flex flex-col items-center gap-2">
              <Bus size={32} className="text-[#D1D5DB]" />
              <p className="text-[14px] font-bold text-[#8B95A1]">주변 정류장을 찾는 중...</p>
              <button onClick={refresh}
                className="mt-2 h-9 px-4 bg-[#EBF3FE] rounded-xl text-[13px] font-bold text-[#3182F6] active:opacity-70">
                다시 시도
              </button>
            </div>
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
                          {stop.stopNo && (
                            <span className="text-[11px] text-[#B0B8C1] bg-[#F2F4F6] px-1.5 py-0.5 rounded">{stop.stopNo}</span>
                          )}
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

        </div>
      )}

      {/* ══ 지하철 탭 ════════════════════════════════════════ */}
      {tab === "지하철" && (
        <div className="px-4 space-y-3">
          {subwayLoading ? (
            <><SkeletonStop /><SkeletonStop /></>
          ) : subwayList.length === 0 ? (
            <div className="bg-white rounded-2xl px-4 py-10 text-center">
              <Train size={32} className="mx-auto text-[#D1D5DB] mb-2" />
              <p className="text-[14px] font-bold text-[#8B95A1]">위치를 확인하는 중입니다</p>
            </div>
          ) : (
            subwayList.map((st, idx) => {
              const upArrivals   = st.arrivals.filter(a => a.direction === "상행");
              const downArrivals = st.arrivals.filter(a => a.direction === "하행");
              return (
                <div key={st.id} className="bg-white rounded-2xl overflow-hidden">
                  {/* 역 헤더 */}
                  <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: st.lineColor + "22" }}>
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
                        <p className="text-[16px] font-bold text-[#191F28]">{st.displayName}</p>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: st.lineColor }}>{st.line}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Navigation size={10} className="text-[#3182F6]" />
                        <span className="text-[12px] font-semibold text-[#3182F6]">{distLabel(st.distM)}</span>
                        <span className="text-[11px] text-[#B0B8C1]">
                          배차 {st.timetable.intervalMin}분
                        </span>
                      </div>
                    </div>
                    <button onClick={() => toggleSubway(st.id)} className="p-1.5 active:opacity-60">
                      <Star size={20}
                        className={favSubways.has(st.id) ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#E5E8EB]"} />
                    </button>
                  </div>

                  {/* 상하행 도착정보 */}
                  <div className="px-4 pb-4 space-y-2">
                    {st.loadingArrivals ? (
                      [0, 1].map(i => (
                        <div key={i} className="flex items-center justify-between bg-[#F2F4F6] rounded-xl px-3 py-3 animate-pulse">
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-20 bg-[#E5E8EB] rounded" />
                            <div className="h-3 w-14 bg-[#E5E8EB] rounded" />
                          </div>
                          <div className="w-14 h-12 bg-[#E5E8EB] rounded-xl" />
                        </div>
                      ))
                    ) : !hasSubwayKey() ? (
                      <div className="flex items-center gap-2 bg-[#FFFDE7] rounded-xl px-3 py-3">
                        <AlertCircle size={14} className="text-[#F57F17] shrink-0" />
                        <div>
                          <p className="text-[12px] font-bold text-[#F57F17]">실시간 정보 미설정</p>
                          <p className="text-[11px] text-[#F57F17]/80">
                            첫차 상행 {st.timetable.upFirst} · 막차 {st.timetable.upLast}
                          </p>
                        </div>
                      </div>
                    ) : st.arrivals.length === 0 ? (
                      <div className="bg-[#F2F4F6] rounded-xl px-3 py-3 text-center">
                        <p className="text-[13px] text-[#8B95A1]">운행 정보 없음</p>
                      </div>
                    ) : (
                      <>
                        {/* 상행 */}
                        {upArrivals.slice(0, 1).map((a, i) => (
                          <div key={`up-${i}`} className="flex items-center justify-between bg-[#F2F4F6] rounded-xl px-3 py-3">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold bg-[#E5E8EB] text-[#4E5968] px-1.5 py-0.5 rounded">상행</span>
                                <p className="text-[14px] font-semibold text-[#191F28]">{a.terminalStation} 방면</p>
                                {a.isExpress && <span className="text-[11px] font-bold text-[#E65100]">급행</span>}
                              </div>
                              <p className="text-[12px] text-[#8B95A1] mt-0.5">
                                {a.currentStation ? `${a.currentStation} 출발` : `열차 ${a.trainNo}`}
                              </p>
                            </div>
                            <ArrivalBadge min={a.arrivalMin} live />
                          </div>
                        ))}
                        {/* 하행 */}
                        {downArrivals.slice(0, 1).map((a, i) => (
                          <div key={`down-${i}`} className="flex items-center justify-between bg-[#F2F4F6] rounded-xl px-3 py-3">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold bg-[#EBF3FE] text-[#3182F6] px-1.5 py-0.5 rounded">하행</span>
                                <p className="text-[14px] font-semibold text-[#191F28]">{a.terminalStation} 방면</p>
                                {a.isExpress && <span className="text-[11px] font-bold text-[#E65100]">급행</span>}
                              </div>
                              <p className="text-[12px] text-[#8B95A1] mt-0.5">
                                {a.currentStation ? `${a.currentStation} 출발` : `열차 ${a.trainNo}`}
                              </p>
                            </div>
                            <ArrivalBadge min={a.arrivalMin} live />
                          </div>
                        ))}
                      </>
                    )}

                    {/* 첫차/막차 항상 표시 */}
                    <div className="flex gap-2 pt-1">
                      <div className="flex-1 bg-[#F8F9FA] rounded-xl px-3 py-2">
                        <p className="text-[10px] text-[#8B95A1] mb-0.5">상행 첫차/막차</p>
                        <p className="text-[12px] font-bold text-[#191F28]">
                          {st.timetable.upFirst} / {st.timetable.upLast}
                        </p>
                      </div>
                      <div className="flex-1 bg-[#F8F9FA] rounded-xl px-3 py-2">
                        <p className="text-[10px] text-[#8B95A1] mb-0.5">하행 첫차/막차</p>
                        <p className="text-[12px] font-bold text-[#191F28]">
                          {st.timetable.downFirst} / {st.timetable.downLast}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {!subwayLoading && (
            <div className="bg-[#EBF3FE] rounded-2xl px-4 py-3.5">
              <p className="text-[14px] font-bold text-[#3182F6]">🚇 검단 2호선 연장 예정</p>
              <p className="text-[13px] text-[#3182F6]/80 mt-1">2026년 하반기 착공 · 2030년 개통 목표</p>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
