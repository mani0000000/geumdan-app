"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapPin, RefreshCw, ChevronDown, ChevronUp, Star,
  Zap, Accessibility, Train, Navigation, Bus, Search,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  hasBusApiKey,
  haversineM,
  GEUMDAN_BUS_STATIONS,
  fetchNearbyStopsFromTago, fetchNearbyStopsFromApi, fetchNearbyStopsWide,
  fetchArrivalsByStationId, fetchArrivalsByNodeId, osmRoutesToArrivals,
  fetchBusLocations, fetchRouteDetail, fetchStationsByRoute,
} from "@/lib/api/bus";
import {
  getAllSubwayStations, fetchSubwayArrivals, hasSubwayKey,
  estimateNextArrivals,
  type SubwayStationWithDist, type SubwayArrival,
} from "@/lib/api/subway";
import type { BusArrival, RouteDetail, RouteStation, BusLocation } from "@/lib/api/bus";

type Tab = "버스" | "지하철";

type DisplayStop = {
  id: string;          // stationId (OSM ref 또는 node ID)
  name: string;
  distM: number;
  arrivals: BusArrival[];
  loadingArrivals: boolean;
  lat?: number;
  lng?: number;
  osmRoutes?: Array<{ routeNo: string; destination: string }>; // OSM 경유 노선
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

// ─── 도착 뱃지 ───────────────────────────────────────────────
function ArrivalBadge({ min, live }: { min: number; live: boolean }) {
  if (!live || min === -1) {
    return (
      <div className="bg-[#d2d2d7] rounded-xl px-3 py-1.5 text-center min-w-[54px]">
        <span className="text-[#6e6e73] text-[14px] font-bold">--</span>
      </div>
    );
  }
  const bg = min <= 3 ? "bg-[#F04452]" : min <= 7 ? "bg-[#FF9500]" : "bg-[#0071e3]";
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
        <div key={i} className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3 py-3">
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
  const [loading, setLoading] = useState(() => Boolean(arrival.routeId));
  const [dirTab, setDirTab] = useState<0 | 1>(0);

  useEffect(() => {
    if (!arrival.routeId) return;
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
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-[#f5f5f7]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="bg-[#0071e3] rounded-xl px-3.5 py-1.5">
                <span className="text-white text-[20px] font-black">{arrival.routeNo}</span>
              </div>
              {arrival.isExpress && (
                <span className="flex items-center gap-1 text-[12px] font-bold bg-[#FFF3E0] text-[#E65100] px-2 py-1 rounded-lg">
                  <Zap size={10} />급행
                </span>
              )}
              {arrival.isLowFloor && (
                <span className="flex items-center gap-1 text-[12px] font-bold bg-[#e8f1fd] text-[#0071e3] px-2 py-1 rounded-lg">
                  <Accessibility size={10} />저상
                </span>
              )}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center active:opacity-60">
              <span className="text-[#6e6e73] text-[16px] font-bold">✕</span>
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="h-4 w-48 bg-[#f5f5f7] rounded animate-pulse" />
              <div className="h-3 w-32 bg-[#f5f5f7] rounded animate-pulse" />
            </div>
          ) : detail ? (
            <>
              <p className="text-[13px] text-[#424245] font-medium">
                {detail.startStation} ↔ {detail.endStation}
              </p>
              {/* 첫차/막차 */}
              <div className="flex gap-3 mt-3">
                <div className="flex-1 bg-[#F8F9FA] rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-[#6e6e73] font-medium mb-0.5">상행 첫차/막차</p>
                  <p className="text-[13px] font-bold text-[#1d1d1f]">
                    {detail.upFirstTime || "-"} / {detail.upLastTime || "-"}
                  </p>
                </div>
                <div className="flex-1 bg-[#F8F9FA] rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-[#6e6e73] font-medium mb-0.5">하행 첫차/막차</p>
                  <p className="text-[13px] font-bold text-[#1d1d1f]">
                    {detail.downFirstTime || "-"} / {detail.downLastTime || "-"}
                  </p>
                </div>
              </div>
              {detail.interval > 0 && (
                <p className="text-[12px] text-[#6e6e73] mt-2">배차 간격 약 {detail.interval}분</p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-[#6e6e73]">{arrival.destination} 방면</p>
          )}
        </div>

        {/* 상행/하행 탭 */}
        {stations.length > 0 && (
          <div className="shrink-0 flex border-b border-[#f5f5f7]">
            {([0, 1] as const).map(dir => (
              <button key={dir} onClick={() => setDirTab(dir)}
                className={`flex-1 h-10 text-[13px] font-semibold border-b-2 transition-colors ${
                  dirTab === dir ? "text-[#0071e3] border-[#0071e3]" : "text-[#86868b] border-transparent"
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
                  <div className="w-2 h-2 rounded-full bg-[#d2d2d7]" />
                  <div className="h-4 flex-1 bg-[#f5f5f7] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : curStations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[14px] text-[#6e6e73]">정류장 정보를 불러올 수 없습니다</p>
            </div>
          ) : (
            <div className="relative">
              {/* 수직선 */}
              <div className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-[#d2d2d7]" />
              <div className="space-y-0">
                {curStations.map((st, idx) => {
                  const hasBus = busSeqs.has(st.seq);
                  const isFirst = idx === 0;
                  const isLast = idx === curStations.length - 1;
                  return (
                    <div key={st.stationId + st.seq} className="flex items-center gap-3 py-2">
                      <div className={`relative z-10 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        hasBus ? "bg-[#F04452] shadow-lg shadow-red-200" :
                        (isFirst || isLast) ? "bg-[#0071e3]" : "bg-white border-2 border-[#D1D5DB]"
                      }`}>
                        {hasBus && <span className="text-[8px]">🚌</span>}
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className={`text-[13px] ${
                          hasBus ? "font-bold text-[#F04452]" :
                          (isFirst || isLast) ? "font-bold text-[#0071e3]" : "text-[#424245]"
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

export default function TransportPage() {
  const [tab, setTab] = useState<Tab>("버스");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [favStops, setFavStops] = useState<Set<string>>(() => loadFavSet("favStops"));
  const [favRoutes, setFavRoutes] = useState<Set<string>>(() => loadFavSet("favRoutes"));
  const [favSubways, setFavSubways] = useState<Set<string>>(() => loadFavSet("favSubways"));
  const [selectedArrival, setSelectedArrival] = useState<BusArrival | null>(null);
  const [selectedSubway, setSelectedSubway] = useState<(SubwayStationWithDist & { arrivals: SubwayArrival[]; loadingArrivals: boolean }) | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const [, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locState, setLocState] = useState<"loading" | "ok" | "denied" | "idle">("idle");
  // 버스 정류장 소스: "tago"=국가API실시간, "ic"=인천API실시간, "osm"=경유만, "fallback"=하드코딩
  const [stopSource, setStopSource] = useState<"tago"|"ic"|"osm"|"fallback"|null>(null);
  // GPS 기반으로 API에서 조회한 정류장 (null = 미조회)
  const [apiStops, setApiStops] = useState<DisplayStop[] | null>(null);
  // 지하철 역 + 실시간 도착정보
  const [subwayList, setSubwayList] = useState<(SubwayStationWithDist & { arrivals: SubwayArrival[]; loadingArrivals: boolean })[]>([]);
  const [subwayLoading, setSubwayLoading] = useState(false);
  const [busSearch, setBusSearch] = useState("");
  const isLive = hasBusApiKey();
  const posRef = useRef<{ lat: number; lng: number } | null>(null);
  const apiStopsRef = useRef<DisplayStop[] | null>(null);
  const subwayListRef = useRef<(SubwayStationWithDist & { arrivals: SubwayArrival[]; loadingArrivals: boolean })[]>([]);

  // ref 동기화
  useEffect(() => { apiStopsRef.current = apiStops; }, [apiStops]);
  useEffect(() => { subwayListRef.current = subwayList; }, [subwayList]);

  // ── 정류장별 실시간 도착 조회 (소스별 API 분기) ──
  const fetchArrivalsForStops = useCallback(async (stops: DisplayStop[], src?: "tago"|"ic"|"osm"|"fallback"|null) => {
    const source = src ?? stopSource;
    await Promise.allSettled(
      stops.map(async stop => {
        let arrivals: BusArrival[] = [];
        if (source === "tago") {
          arrivals = await fetchArrivalsByNodeId(stop.id);
        } else if (source === "ic") {
          arrivals = await fetchArrivalsByStationId(stop.id);
        }
        if (arrivals.length === 0 && stop.osmRoutes && stop.osmRoutes.length > 0) {
          arrivals = osmRoutesToArrivals(stop.osmRoutes);
        }
        setApiStops(prev =>
          prev ? prev.map(s => s.id === stop.id
            ? { ...s, arrivals, loadingArrivals: false }
            : s)
          : prev
        );
      })
    );
    setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
  }, [stopSource]);

  // ── 버스 데이터 전체 로드: GPS 기반 주변 정류장 + 도착정보 ──
  const loadBusData = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setApiStops(null);

    let stops: DisplayStop[] = [];
    let src: "tago"|"ic"|"osm"|"fallback" = "fallback";

    try {
      // 1순위: TAGO 국가대중교통 API (전국 공통 stationId, 실시간 도착 연동)
      const tagoNearby = await Promise.race([
        fetchNearbyStopsFromTago(lat, lng),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
      ]);
      if (tagoNearby.length > 0) {
        src = "tago";
        stops = tagoNearby.slice(0, 14).map(s => ({
          id: s.stationId, name: s.stationName,
          distM: s.distanceM, arrivals: [], loadingArrivals: true,
          lat: s.lat, lng: s.lng, osmRoutes: [],
        }));
      } else throw new Error("tago_empty");
    } catch {
      try {
        // 2순위: 인천 공공API (stationId가 도착정보 API와 일치)
        const apiNearby = await Promise.race([
          fetchNearbyStopsFromApi(lat, lng),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
        ]);
        if (apiNearby.length > 0) {
          src = "ic";
          stops = apiNearby.slice(0, 14).map(s => ({
            id: s.stationId, name: s.stationName,
            distM: s.distanceM, arrivals: [], loadingArrivals: true,
            lat: s.lat, lng: s.lng, osmRoutes: [],
          }));
        } else throw new Error("api_empty");
      } catch {
        // 3순위: OSM Overpass (경유 노선 정보 포함)
        try {
          const nearby = await Promise.race([
            fetchNearbyStopsWide(lat, lng),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 18000)),
          ]);
          if (nearby.length === 0) throw new Error("empty");
          src = "osm";
          stops = nearby.slice(0, 14).map(s => ({
            id: s.stationId, name: s.stationName,
            distM: s.distanceM, arrivals: [], loadingArrivals: true,
            lat: s.lat, lng: s.lng, osmRoutes: s.osmRoutes,
          }));
        } catch {
          // 4순위: 검단신도시 하드코딩 정류장
          src = "fallback";
          stops = GEUMDAN_BUS_STATIONS
            .map(s => ({
              id: s.stationId, name: s.name,
              distM: Math.round(haversineM(lat, lng, s.lat, s.lng)),
              arrivals: [], loadingArrivals: true,
              lat: s.lat, lng: s.lng,
            }))
            .sort((a, b) => a.distM - b.distM);
        }
      }
    }

    setStopSource(src);
    setApiStops(stops);
    setLoading(false);
    await fetchArrivalsForStops(stops, src);
  }, [fetchArrivalsForStops]);

  // ── 지하철 도착정보만 갱신 (역 목록 유지) ──────────────────
  const refreshSubwayArrivals = useCallback(async (stations: typeof subwayList) => {
    await Promise.allSettled(
      stations.map(async st => {
        const arrivals = hasSubwayKey() ? await fetchSubwayArrivals(st) : [];
        setSubwayList(prev =>
          prev.map(s => s.id === st.id ? { ...s, arrivals, loadingArrivals: false } : s)
        );
      })
    );
    setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
  }, []);

  // ── 지하철 데이터 로드 (위치 무관, 전체 역 표시) ────────────
  const loadSubwayData = useCallback(async () => {
    setSubwayLoading(true);
    const all = getAllSubwayStations();
    const initial = all.map(st => ({ ...st, arrivals: [], loadingArrivals: true }));
    setSubwayList(initial);
    setSubwayLoading(false);
    await refreshSubwayArrivals(initial);
  }, [refreshSubwayArrivals]);

  // ── 초기 로드 + GPS 갱신 ─────────────────────────────────────
  useEffect(() => {
    const DEFAULT = { lat: 37.594, lng: 126.710 };
    posRef.current = DEFAULT;
    setUserPos(DEFAULT);
    loadSubwayData();
    loadBusData(DEFAULT.lat, DEFAULT.lng);

    if (!navigator.geolocation) { setLocState("denied"); return; }
    setLocState("loading");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        posRef.current = p;
        setUserPos(p);
        setLocState("ok");
        if (haversineM(DEFAULT.lat, DEFAULT.lng, p.lat, p.lng) > 300) {
          loadBusData(p.lat, p.lng);
        }
      },
      () => setLocState("denied"),
      { timeout: 3000, maximumAge: 300000, enableHighAccuracy: false }
    );
  }, [loadBusData, loadSubwayData]);

  // ── 30초 자동 갱신 (도착정보만, 정류장 목록은 재조회 안 함) ──
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      if (tab === "버스" && apiStopsRef.current && apiStopsRef.current.length > 0) {
        fetchArrivalsForStops(apiStopsRef.current);
      } else if (tab === "지하철" && subwayListRef.current.length > 0) {
        refreshSubwayArrivals(subwayListRef.current);
      }
    }, 30000);
    return () => clearInterval(id);
  }, [tab, fetchArrivalsForStops, refreshSubwayArrivals]);

  const refresh = async () => {
    const p = posRef.current ?? { lat: 37.594, lng: 126.710 };
    setRefreshing(true);
    if (tab === "버스") {
      await loadBusData(p.lat, p.lng);
    } else {
      await loadSubwayData();
    }
    setRefreshing(false);
  };

  const stopsWithRoutes: DisplayStop[] = apiStops ?? [];
  const q = busSearch.trim().toLowerCase();
  const filteredStops = q
    ? stopsWithRoutes.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.arrivals.some(a => a.routeNo.toLowerCase().includes(q))
      )
    : stopsWithRoutes;

  function toggleStop(id: string) {
    setFavStops(p => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      saveFavSet("favStops", n);
      return n;
    });
  }
  function toggleRoute(key: string) {
    setFavRoutes(p => {
      const n = new Set(p);
      if (n.has(key)) n.delete(key); else n.add(key);
      saveFavSet("favRoutes", n);
      return n;
    });
  }
  function toggleSubway(id: string) {
    setFavSubways(p => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      saveFavSet("favSubways", n);
      return n;
    });
  }

  // 즐겨찾기 노선 키: `${stationId}::${routeId||routeNo}`
  const routeFavKey = (stopId: string, a: BusArrival) =>
    `${stopId}::${a.routeId || a.routeNo}`;

  const favStopList = stopsWithRoutes.filter(s => favStops.has(s.id));
  const favRouteList = stopsWithRoutes.flatMap(stop =>
    stop.arrivals
      .filter(a => favRoutes.has(routeFavKey(stop.id, a)))
      .map(a => ({ ...a, stopName: stop.name, stopId: stop.id }))
  );
  const favSubwayList = subwayList.filter(s => favSubways.has(s.id));

  // 위치 상태 뱃지
  function LocBadge() {
    if (locState === "loading")
      return <span className="text-[12px] text-[#6e6e73] animate-pulse">위치 확인 중...</span>;
    if (locState === "ok")
      return (
        <span className="flex items-center gap-1 text-[12px] font-bold bg-[#D1FAE5] text-[#065F46] px-2 py-0.5 rounded-full">
          <Navigation size={10} />내 위치
        </span>
      );
    return <span className="text-[12px] text-[#86868b]">검단신도시 기준</span>;
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-20">
      <Header title="교통 정보" />

      {/* 플로팅 새로고침 버튼 (하단) */}
      <button
        onClick={refresh}
        disabled={refreshing}
        className="fixed bottom-[76px] right-4 z-50 w-11 h-11 bg-[#0071e3] rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
        aria-label="새로고침"
      >
        <RefreshCw size={18} className={`text-white ${refreshing ? "animate-spin" : ""}`} />
      </button>

      {/* 버스 상세 바텀 시트 */}
      {selectedArrival && (
        <BusDetailSheet
          arrival={selectedArrival}
          onClose={() => setSelectedArrival(null)}
        />
      )}

      {/* 탭 */}
      <div className="bg-white sticky top-[52px] z-30 border-b border-[#f5f5f7] flex">
        {(["버스", "지하철"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 h-11 text-[14px] font-semibold border-b-2 transition-colors ${
              t === tab ? "text-[#0071e3] border-[#0071e3]" : "text-[#86868b] border-transparent"
            }`}>
            {t === "버스" ? "🚌 버스" : "🚇 지하철"}
          </button>
        ))}
      </div>

      {/* ══ 버스 즐겨찾기 인라인 (버스 탭 전용) ══════════════════ */}
      {tab === "버스" && (favStopList.length > 0 || favRouteList.length > 0) && (
        <div className="bg-white border-b border-[#f5f5f7]">
          <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Star size={12} className="text-[#FFBB00] fill-[#FFBB00]" />
              <span className="text-[12px] font-bold text-[#424245]">즐겨찾기</span>
            </div>
            <button onClick={refresh} className="flex items-center gap-1 active:opacity-60">
              <RefreshCw size={11} className={`text-[#6e6e73] ${refreshing ? "animate-spin" : ""}`} />
              <span className="text-[11px] text-[#6e6e73]">{lastUpdated || "새로고침"}</span>
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
            {favRouteList.map(r => {
              const fk = routeFavKey(r.stopId, r);
              return (
              <div key={fk}
                className="shrink-0 bg-[#F8F9FA] rounded-2xl px-3 py-2.5 w-[130px] border border-[#f5f5f7] relative">
                <button onClick={() => toggleRoute(fk)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#d2d2d7] flex items-center justify-center active:opacity-60">
                  <span className="text-[#6e6e73] text-[11px] leading-none">✕</span>
                </button>
                <div className="flex items-center gap-1.5 mb-1 pr-5">
                  <div className="bg-[#0071e3] rounded-lg px-2 py-0.5">
                    <span className="text-white text-[13px] font-black leading-tight">{r.routeNo}</span>
                  </div>
                  {r.isExpress && <Zap size={9} className="text-[#E65100]" />}
                </div>
                <p className="text-[10px] text-[#6e6e73] truncate mb-2">{r.stopName}</p>
                <ArrivalBadge min={r.arrivalMin} live={isLive} />
              </div>
              );
            })}
            {favStopList.map(stop => (
              <div key={stop.id}
                className="shrink-0 bg-[#F8F9FA] rounded-2xl px-3 py-2.5 w-[130px] border border-[#f5f5f7] relative">
                <button onClick={() => toggleStop(stop.id)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#d2d2d7] flex items-center justify-center active:opacity-60">
                  <span className="text-[#6e6e73] text-[11px] leading-none">✕</span>
                </button>
                <div className="flex items-center gap-1 mb-1 pr-5">
                  <MapPin size={10} className="text-[#0071e3] shrink-0" />
                  <span className="text-[11px] font-bold text-[#1d1d1f] truncate">{stop.name}</span>
                </div>
                <p className="text-[10px] text-[#86868b] mb-2">{distLabel(stop.distM)}</p>
                <div className="flex flex-wrap gap-1">
                  {stop.arrivals.slice(0, 4).map((a, i) => (
                    <div key={i} className="bg-[#0071e3] rounded px-1.5 py-0.5">
                      <span className="text-white text-[10px] font-bold">{a.routeNo}</span>
                    </div>
                  ))}
                  {stop.loadingArrivals && (
                    <div className="bg-[#d2d2d7] rounded px-4 py-0.5 animate-pulse" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ 지하철 즐겨찾기 인라인 (지하철 탭 전용) ══════════════ */}
      {tab === "지하철" && favSubwayList.length > 0 && (
        <div className="bg-white border-b border-[#f5f5f7]">
          <div className="flex items-center px-4 pt-3 pb-1.5 gap-1.5">
            <Star size={12} className="text-[#FFBB00] fill-[#FFBB00]" />
            <span className="text-[12px] font-bold text-[#424245]">즐겨찾기</span>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
            {favSubwayList.map(st => {
              const displayArrivals = st.arrivals.length > 0 ? st.arrivals : estimateNextArrivals(st.timetable);
              const nextUp   = displayArrivals.find(a => a.direction === "상행");
              const nextDown = displayArrivals.find(a => a.direction === "하행");
              return (
                <div key={st.id} className="shrink-0 relative">
                <button onClick={() => toggleSubway(st.id)}
                  className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-[#d2d2d7] flex items-center justify-center active:opacity-60">
                  <span className="text-[#6e6e73] text-[11px] leading-none">✕</span>
                </button>
                <button
                  onClick={() => setSelectedSubway(st)}
                  className="shrink-0 bg-[#F8F9FA] rounded-2xl px-3 py-2.5 w-[160px] border border-[#f5f5f7] text-left active:opacity-70">
                  <div className="flex items-center gap-1 mb-0.5 pr-5">
                    <Train size={11} style={{ color: st.lineColor }} className="shrink-0" />
                    <span className="text-[12px] font-bold text-[#1d1d1f] truncate">{st.displayName}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white inline-block mb-2"
                    style={{ background: st.lineColor }}>{st.line}</span>
                  {st.loadingArrivals ? (
                    <div className="h-10 bg-[#d2d2d7] rounded animate-pulse" />
                  ) : (
                    <div className="space-y-1.5">
                      {nextUp && (
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] text-[#6e6e73] truncate">{nextUp.terminalStation}</span>
                          <ArrivalBadge min={nextUp.arrivalMin} live />
                        </div>
                      )}
                      {nextDown && (
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] text-[#6e6e73] truncate">{nextDown.terminalStation}</span>
                          <ArrivalBadge min={nextDown.arrivalMin} live />
                        </div>
                      )}
                    </div>
                  )}
                </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 지하철 즐겨찾기 상세 바텀 시트 */}
      {selectedSubway && (() => {
        const st = selectedSubway;
        const displayArrivals = st.arrivals.length > 0 ? st.arrivals : estimateNextArrivals(st.timetable);
        const isEst = st.arrivals.length === 0;
        const upArr   = displayArrivals.filter(a => a.direction === "상행");
        const downArr = displayArrivals.filter(a => a.direction === "하행");
        return (
          <>
            <div className="fixed inset-0 bg-black/40 z-[200]" onClick={() => setSelectedSubway(null)} />
            <div className="fixed left-0 right-0 bottom-0 bg-white rounded-t-3xl z-[250] max-h-[70%] overflow-y-auto">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-[#d2d2d7] rounded-full" />
              </div>
              <div className="px-5 pt-3 pb-6">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: st.lineColor + "22" }}>
                      <Train size={20} style={{ color: st.lineColor }} />
                    </div>
                    <div>
                      <p className="text-[17px] font-bold text-[#1d1d1f]">{st.displayName}</p>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: st.lineColor }}>{st.line}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedSubway(null)}
                    className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center active:opacity-60">
                    <span className="text-[#6e6e73] text-[16px] font-bold">✕</span>
                  </button>
                </div>

                {isEst && (
                  <p className="text-[11px] text-[#86868b] mb-3">⏱ 시간표 기준 추정 도착</p>
                )}

                <div className="space-y-2">
                  {upArr.map((a, i) => (
                    <div key={`u${i}`} className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3 py-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold bg-[#d2d2d7] text-[#424245] px-1.5 py-0.5 rounded">상행</span>
                          <p className="text-[14px] font-semibold text-[#1d1d1f]">{a.terminalStation} 방면</p>
                        </div>
                        {!isEst && a.currentStation && (
                          <p className="text-[11px] text-[#6e6e73] mt-0.5">현재: {a.currentStation}</p>
                        )}
                      </div>
                      <ArrivalBadge min={a.arrivalMin} live />
                    </div>
                  ))}
                  {downArr.map((a, i) => (
                    <div key={`d${i}`} className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3 py-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold bg-[#e8f1fd] text-[#0071e3] px-1.5 py-0.5 rounded">하행</span>
                          <p className="text-[14px] font-semibold text-[#1d1d1f]">{a.terminalStation} 방면</p>
                        </div>
                        {!isEst && a.currentStation && (
                          <p className="text-[11px] text-[#6e6e73] mt-0.5">현재: {a.currentStation}</p>
                        )}
                      </div>
                      <ArrivalBadge min={a.arrivalMin} live />
                    </div>
                  ))}
                  {displayArrivals.length === 0 && (
                    <div className="bg-[#f5f5f7] rounded-xl px-3 py-4 text-center">
                      <p className="text-[13px] text-[#6e6e73]">운행 종료</p>
                    </div>
                  )}
                </div>

                {st.timetable.upFirst !== "-" && (
                  <div className="flex gap-2 mt-3">
                    <div className="flex-1 bg-[#F8F9FA] rounded-xl px-3 py-2">
                      <p className="text-[10px] text-[#6e6e73] mb-0.5">{st.timetable.upDirection} 첫차/막차</p>
                      <p className="text-[12px] font-bold text-[#1d1d1f]">{st.timetable.upFirst} / {st.timetable.upLast}</p>
                    </div>
                    <div className="flex-1 bg-[#F8F9FA] rounded-xl px-3 py-2">
                      <p className="text-[10px] text-[#6e6e73] mb-0.5">{st.timetable.downDirection} 첫차/막차</p>
                      <p className="text-[12px] font-bold text-[#1d1d1f]">{st.timetable.downFirst} / {st.timetable.downLast}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* 위치 상태 바 */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-[#0071e3]" />
          <span className="text-[13px] text-[#424245] font-medium">가까운 순 정렬</span>
          <LocBadge />
        </div>
        <button onClick={refresh} className="flex items-center gap-1 active:opacity-60">
          <RefreshCw size={13} className={`text-[#6e6e73] ${refreshing ? "animate-spin" : ""}`} />
          <span className="text-[12px] text-[#6e6e73]">{lastUpdated || "새로고침"}</span>
        </button>
      </div>

      {/* ══ 버스 탭 ══════════════════════════════════════════ */}
      {tab === "버스" && (
        <div className="px-4 space-y-3">
          {/* 검색 바 */}
          <div className="bg-white rounded-xl flex items-center gap-2 px-3 h-10">
            <Search size={15} className="text-[#86868b]" />
            <input
              value={busSearch}
              onChange={e => setBusSearch(e.target.value)}
              placeholder="정류장 이름 · 노선 번호 검색"
              className="flex-1 text-[14px] outline-none bg-transparent placeholder:text-[#86868b]"
            />
            {busSearch && (
              <button onClick={() => setBusSearch("")} className="text-[#86868b] active:opacity-60">
                <span className="text-[13px]">✕</span>
              </button>
            )}
          </div>

          {loading ? (
            <><SkeletonStop /><SkeletonStop /><SkeletonStop /></>
          ) : stopsWithRoutes.length === 0 ? (
            <div className="bg-white rounded-2xl px-4 py-10 text-center">
              <Bus size={32} className="mx-auto text-[#D1D5DB] mb-2" />
              <p className="text-[14px] font-bold text-[#6e6e73]">주변 버스 정류장을 찾을 수 없습니다</p>
              <p className="text-[12px] text-[#86868b] mt-1">위치 권한을 허용하거나 새로고침해 주세요</p>
            </div>
          ) : filteredStops.length === 0 ? (
            <div className="bg-white rounded-2xl px-4 py-10 text-center">
              <Search size={28} className="mx-auto text-[#D1D5DB] mb-2" />
              <p className="text-[14px] font-bold text-[#6e6e73]">검색 결과가 없습니다</p>
              <p className="text-[12px] text-[#86868b] mt-1">다른 키워드로 검색해 보세요</p>
            </div>
          ) : (
            filteredStops.map((stop, idx) => {
              const open = expanded === stop.id;
              const displayArrivals = open ? stop.arrivals : stop.arrivals.slice(0, 3);
              return (
                <div key={stop.id} className="bg-white rounded-2xl overflow-hidden">
                  {/* 정류장 헤더 */}
                  <button onClick={() => setExpanded(open ? null : stop.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 active:bg-[#f5f5f7]">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-[#e8f1fd] flex items-center justify-center">
                          <Bus size={18} className="text-[#0071e3]" />
                        </div>
                        {idx === 0 && (
                          <span className="absolute -top-1 -right-1 text-[9px] font-black bg-[#0071e3] text-white px-1 rounded-full leading-tight py-0.5">
                            최근접
                          </span>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-[15px] font-bold text-[#1d1d1f]">{stop.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Navigation size={10} className="text-[#0071e3]" />
                          <span className="text-[12px] font-semibold text-[#0071e3]">{distLabel(stop.distM)}</span>
                          {!stop.loadingArrivals && stop.arrivals.length > 0 && (
                            <span className="text-[12px] text-[#86868b]">
                              · 노선 {stop.arrivals.length}개
                              {stop.arrivals.every(a => a.isScheduled) && (
                                <span className="ml-1 text-[#FF9500]">경유</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={e => { e.stopPropagation(); toggleStop(stop.id); }}
                        className="p-1.5 active:opacity-60">
                        <Star size={18} className={favStops.has(stop.id) ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#d2d2d7]"} />
                      </button>
                      {open ? <ChevronUp size={16} className="text-[#86868b]" /> : <ChevronDown size={16} className="text-[#86868b]" />}
                    </div>
                  </button>

                  {/* 도착 정보 */}
                  <div className="px-4 pb-4 space-y-2">
                    {stop.loadingArrivals ? (
                      [1, 2].map(i => (
                        <div key={i} className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3 py-3 animate-pulse">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-8 bg-[#d2d2d7] rounded-lg" />
                            <div className="space-y-1.5">
                              <div className="h-3.5 w-28 bg-[#d2d2d7] rounded" />
                              <div className="h-3 w-16 bg-[#d2d2d7] rounded" />
                            </div>
                          </div>
                          <div className="w-14 h-12 bg-[#d2d2d7] rounded-xl" />
                        </div>
                      ))
                    ) : stop.arrivals.length === 0 ? (
                      <div className="bg-[#f5f5f7] rounded-xl px-3 py-3 text-center">
                        <p className="text-[12px] text-[#86868b]">운행 정보 없음</p>
                      </div>
                    ) : (
                      <>
                        {displayArrivals.map((a, i) => (
                          <div key={i}
                            className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3 py-3 cursor-pointer active:bg-[#eaeaea]"
                            onClick={() => !a.isScheduled && setSelectedArrival(a)}>
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <div className={`${a.isScheduled ? "bg-[#86868b]" : "bg-[#0071e3]"} rounded-lg px-2.5 py-1 min-w-[44px] text-center shrink-0`}>
                                <span className="text-white text-[14px] font-black">{a.routeNo}</span>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-[14px] font-semibold text-[#1d1d1f] truncate">{a.destination} 방면</p>
                                  {a.isExpress && (
                                    <span className="flex items-center gap-0.5 text-[11px] font-bold bg-[#FFF3E0] text-[#E65100] px-1 py-0.5 rounded shrink-0">
                                      <Zap size={9} />급행
                                    </span>
                                  )}
                                  {a.isLowFloor && <Accessibility size={12} className="text-[#0071e3] shrink-0" />}
                                </div>
                                <p className="text-[12px] text-[#6e6e73]">
                                  {a.isScheduled ? "경유 노선" : a.remainingStops > 0 ? `${a.remainingStops}정류장 전` : "곧 도착"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {!a.isScheduled && (
                                <button onClick={e => { e.stopPropagation(); toggleRoute(routeFavKey(stop.id, a)); }}
                                  className="p-1 active:opacity-60">
                                  <Star size={15} className={favRoutes.has(routeFavKey(stop.id, a)) ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#D1D5DB]"} />
                                </button>
                              )}
                              <ArrivalBadge min={a.arrivalMin} live={!a.isScheduled} />
                            </div>
                          </div>
                        ))}
                        {!open && stop.arrivals.length > 3 && (
                          <button onClick={() => setExpanded(stop.id)}
                            className="w-full text-[13px] text-[#0071e3] text-center py-1">
                            {stop.arrivals.length - 3}개 노선 더 보기
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* 범례 — 실시간 연동 시에만 의미 있음 */}
          {isLive && (
            <div className="bg-white rounded-2xl px-4 py-3 flex gap-4">
              {[["bg-[#F04452]", "3분 이내"], ["bg-[#FF9500]", "7분 이내"], ["bg-[#0071e3]", "8분 이상"]].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${c}`} />
                  <span className="text-[12px] text-[#6e6e73]">{l}</span>
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
              <p className="text-[14px] font-bold text-[#6e6e73]">위치를 확인하는 중입니다</p>
            </div>
          ) : (
            subwayList.map((st) => {
              return (
                <div key={st.id} className="bg-white rounded-2xl overflow-hidden">
                  {/* 역 헤더 */}
                  <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: st.lineColor + "22" }}>
                      <Train size={20} style={{ color: st.lineColor }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[16px] font-bold text-[#1d1d1f]">{st.displayName}</p>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: st.lineColor }}>{st.line}</span>
                      </div>
                      {st.timetable.intervalMin > 0 && (
                        <p className="text-[12px] text-[#86868b] mt-0.5">배차 {st.timetable.intervalMin}분</p>
                      )}
                    </div>
                    {!st.planned && (
                      <button onClick={() => toggleSubway(st.id)} className="p-1.5 active:opacity-60">
                        <Star size={20}
                          className={favSubways.has(st.id) ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#d2d2d7]"} />
                      </button>
                    )}
                  </div>

                  {/* 상하행 도착정보 */}
                  <div className="px-4 pb-4 space-y-2">
                    {st.loadingArrivals ? (
                      [0, 1].map(i => (
                        <div key={i} className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3 py-3 animate-pulse">
                          <div className="space-y-1.5">
                            <div className="h-3.5 w-20 bg-[#d2d2d7] rounded" />
                            <div className="h-3 w-14 bg-[#d2d2d7] rounded" />
                          </div>
                          <div className="w-14 h-12 bg-[#d2d2d7] rounded-xl" />
                        </div>
                      ))
                    ) : (() => {
                      // 실시간 있으면 실시간, 없으면 시간표 계산으로 대체
                      const displayArrivals = st.arrivals.length > 0
                        ? st.arrivals
                        : estimateNextArrivals(st.timetable);
                      const isEstimated = st.arrivals.length === 0;
                      const upArrivals   = displayArrivals.filter(a => a.direction === "상행");
                      const downArrivals = displayArrivals.filter(a => a.direction === "하행");

                      if (displayArrivals.length === 0) return (
                        <div className="bg-[#f5f5f7] rounded-xl px-3 py-3 text-center">
                          <p className="text-[13px] text-[#6e6e73]">운행 종료</p>
                        </div>
                      );

                      return (
                      <>
                        {isEstimated && (
                          <div className="flex items-center gap-1.5 px-1 pb-1">
                            <span className="text-[11px] text-[#86868b]">⏱ 시간표 기준 추정 도착</span>
                          </div>
                        )}
                        {/* 상행 */}
                        {upArrivals.slice(0, 2).map((a, i) => (
                          <div key={`up-${i}`} className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3 py-3">
                            <div className="flex-1 min-w-0 mr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold bg-[#d2d2d7] text-[#424245] px-1.5 py-0.5 rounded shrink-0">상행</span>
                                <p className="text-[13px] font-semibold text-[#1d1d1f] truncate">{a.terminalStation} 방면</p>
                                {a.isExpress && (
                                  <span className="text-[10px] font-bold bg-[#FFF3E0] text-[#E65100] px-1 py-0.5 rounded shrink-0">급행</span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#6e6e73] mt-0.5">
                                {!isEstimated && a.currentStation ? `현재: ${a.currentStation}` : a.trainNo ? `열차 ${a.trainNo}` : ""}
                              </p>
                            </div>
                            <ArrivalBadge min={a.arrivalMin} live />
                          </div>
                        ))}
                        {/* 하행 */}
                        {downArrivals.slice(0, 2).map((a, i) => (
                          <div key={`down-${i}`} className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3 py-3">
                            <div className="flex-1 min-w-0 mr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold bg-[#e8f1fd] text-[#0071e3] px-1.5 py-0.5 rounded shrink-0">하행</span>
                                <p className="text-[13px] font-semibold text-[#1d1d1f] truncate">{a.terminalStation} 방면</p>
                                {a.isExpress && (
                                  <span className="text-[10px] font-bold bg-[#FFF3E0] text-[#E65100] px-1 py-0.5 rounded shrink-0">급행</span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#6e6e73] mt-0.5">
                                {!isEstimated && a.currentStation ? `현재: ${a.currentStation}` : a.trainNo ? `열차 ${a.trainNo}` : ""}
                              </p>
                            </div>
                            <ArrivalBadge min={a.arrivalMin} live />
                          </div>
                        ))}
                      </>
                      );
                    })()}

                    {/* 첫차/막차 */}
                    {st.timetable.upFirst !== "-" && (
                      <div className="flex gap-2 pt-1">
                        <div className="flex-1 bg-[#F8F9FA] rounded-xl px-3 py-2">
                          <p className="text-[10px] text-[#6e6e73] mb-0.5">상행 첫차/막차</p>
                          <p className="text-[12px] font-bold text-[#1d1d1f]">
                            {st.timetable.upFirst} / {st.timetable.upLast}
                          </p>
                        </div>
                        <div className="flex-1 bg-[#F8F9FA] rounded-xl px-3 py-2">
                          <p className="text-[10px] text-[#6e6e73] mb-0.5">하행 첫차/막차</p>
                          <p className="text-[12px] font-bold text-[#1d1d1f]">
                            {st.timetable.downFirst} / {st.timetable.downLast}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {!subwayLoading && (
            <div className="bg-[#e8f1fd] rounded-2xl px-4 py-3.5">
              <p className="text-[14px] font-bold text-[#0071e3]">🚇 검단 2호선 연장 예정</p>
              <p className="text-[13px] text-[#0071e3]/80 mt-1">2026년 하반기 착공 · 2030년 개통 목표</p>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
