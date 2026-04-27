"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapPin, RefreshCw, ChevronDown, ChevronUp, Star,
  Zap, Accessibility, Train, Navigation, Bus, Search, Clock,
  Car, Phone, Globe, ChevronRight, X,
} from "lucide-react";
import { fetchPublishedPlaces, CATEGORY_META, AREAS, type Place, type PlaceCategory, type PlaceArea } from "@/lib/db/places";
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
  searchRouteByNo, fetchRouteDetailFromTago, fetchStationsByRouteTago,
} from "@/lib/api/bus";
import {
  getAllSubwayStations, fetchSubwayArrivals, hasSubwayKey,
  estimateNextArrivals,
  type SubwayStationWithDist, type SubwayArrival,
} from "@/lib/api/subway";
import type { BusArrival, RouteDetail, RouteStation, BusLocation } from "@/lib/api/bus";

type Tab = "가볼만한곳" | "버스" | "지하철";

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
  const [loading, setLoading] = useState(true);
  const [noRouteData, setNoRouteData] = useState(false);
  const [dirTab, setDirTab] = useState<0 | 1>(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNoRouteData(false);

    async function load() {
      if (arrival.routeId) {
        const [d, s, l] = await Promise.all([
          fetchRouteDetail(arrival.routeId),
          fetchStationsByRoute(arrival.routeId),
          fetchBusLocations(arrival.routeId),
        ]);
        if (cancelled) return;
        setDetail(d); setStations(s); setLocations(l);
        setLoading(false);
        if (!d && s.length === 0) setNoRouteData(true);
      } else if (arrival.routeNo) {
        const tagoRouteId = await searchRouteByNo(arrival.routeNo);
        if (cancelled) return;
        if (tagoRouteId) {
          const [d, s] = await Promise.all([
            fetchRouteDetailFromTago(tagoRouteId),
            fetchStationsByRouteTago(tagoRouteId),
          ]);
          if (cancelled) return;
          setDetail(d); setStations(s); setLocations([]);
          setLoading(false);
          if (!d && s.length === 0) setNoRouteData(true);
        } else {
          setLoading(false);
          setNoRouteData(true);
        }
      } else {
        setLoading(false);
        setNoRouteData(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [arrival.routeId, arrival.routeNo]);

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
          ) : noRouteData ? (
            <div className="py-12 text-center">
              <Bus size={28} className="mx-auto text-[#D1D5DB] mb-2" />
              <p className="text-[14px] text-[#6e6e73]">노선 정보 없음</p>
              <p className="text-[12px] text-[#86868b] mt-1">공공 API에서 해당 노선을 찾을 수 없습니다</p>
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

// ─── 지하철 전체 시간표 바텀 시트 ────────────────────────────
function SubwayTimetableSheet({
  station,
  onClose,
}: {
  station: SubwayStationWithDist;
  onClose: () => void;
}) {
  const [dirTab, setDirTab] = useState<"up" | "down">("up");

  function generateTimes(first: string, last: string, interval: number): string[] {
    if (!first || first === "-" || !interval) return [];
    const parse = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const times: string[] = [];
    let cur = parse(first);
    let lastMin = parse(last);
    if (lastMin < cur) lastMin += 1440;
    while (cur <= lastMin) {
      const h = Math.floor(cur / 60) % 24;
      const m = cur % 60;
      times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      cur += interval;
    }
    return times;
  }

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const upTimes   = generateTimes(station.timetable.upFirst,   station.timetable.upLast,   station.timetable.intervalMin);
  const downTimes = generateTimes(station.timetable.downFirst, station.timetable.downLast, station.timetable.intervalMin);
  const curTimes  = dirTab === "up" ? upTimes : downTimes;
  const curDest   = dirTab === "up" ? station.timetable.upDirection : station.timetable.downDirection;

  const isTimePast = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const tMin = h * 60 + m;
    if (tMin < 300 && nowMin > 1200) return false; // 새벽 시간은 미래로 처리
    return tMin < nowMin;
  };

  const nextIdx = curTimes.findIndex(t => !isTimePast(t));

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[200]" onClick={onClose} />
      <div className="fixed left-0 right-0 bottom-0 bg-white rounded-t-3xl z-[250]"
        style={{ maxHeight: "88%", display: "flex", flexDirection: "column" }}>

        {/* 핸들 */}
        <div className="shrink-0 flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 bg-[#d2d2d7] rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="shrink-0 px-5 pt-4 pb-4 border-b border-[#f5f5f7]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: station.lineColor + "22" }}>
                <Train size={20} style={{ color: station.lineColor }} />
              </div>
              <div>
                <p className="text-[17px] font-bold text-[#1d1d1f]">{station.displayName}</p>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: station.lineColor }}>{station.line}</span>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center active:opacity-60">
              <span className="text-[#6e6e73] text-[16px] font-bold">✕</span>
            </button>
          </div>
          <p className="text-[11px] text-[#86868b] mt-2 flex items-center gap-1">
            <Clock size={11} />
            배차 {station.timetable.intervalDisplay ?? `${station.timetable.intervalMin}분`} 기준 추정 시간표
          </p>
        </div>

        {/* 방면 탭 */}
        <div className="shrink-0 flex border-b border-[#f5f5f7]">
          {(["up", "down"] as const).map(dir => (
            <button key={dir} onClick={() => setDirTab(dir)}
              className={`flex-1 h-10 text-[13px] font-semibold border-b-2 transition-colors ${
                dirTab === dir ? "text-[#0071e3] border-[#0071e3]" : "text-[#86868b] border-transparent"
              }`}>
              {dir === "up" ? `⬆ ${station.timetable.upDirection}` : `⬇ ${station.timetable.downDirection}`}
            </button>
          ))}
        </div>

        {/* 시간표 그리드 */}
        <div className="overflow-y-auto flex-1 px-4 py-4">
          {curTimes.length === 0 ? (
            <p className="text-[13px] text-[#86868b] text-center py-10">시간표 정보 없음</p>
          ) : (
            <>
              {/* 다음 열차 안내 */}
              {nextIdx >= 0 && (
                <div className="bg-[#e8f1fd] rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-[#0071e3] font-medium">다음 열차</p>
                    <p className="text-[20px] font-black text-[#0071e3]">{curTimes[nextIdx]}</p>
                    <p className="text-[11px] text-[#0071e3]/70">{curDest} 방면</p>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const [h, m] = curTimes[nextIdx].split(":").map(Number);
                      let diff = h * 60 + m - nowMin;
                      if (diff < 0) diff += 1440;
                      return diff === 0 ? (
                        <span className="text-[22px] font-black text-[#F04452]">곧도착</span>
                      ) : (
                        <>
                          <span className="text-[28px] font-black text-[#0071e3]">{diff}</span>
                          <span className="text-[13px] text-[#0071e3]/70">분 후</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* 전체 시간 그리드 */}
              <div className="grid grid-cols-4 gap-1.5">
                {curTimes.map((t, idx) => {
                  const isPast = isTimePast(t);
                  const isNext = idx === nextIdx;
                  return (
                    <div key={t} className={`rounded-xl py-2.5 text-center transition-colors ${
                      isNext ? "bg-[#0071e3] shadow-sm shadow-blue-200" :
                      isPast ? "bg-[#f5f5f7]" : "bg-[#f5f5f7]"
                    }`}>
                      <span className={`text-[14px] font-bold ${
                        isNext ? "text-white" : isPast ? "text-[#c7c7cc]" : "text-[#1d1d1f]"
                      }`}>{t}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 mt-4 px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-[#0071e3]" />
                  <span className="text-[11px] text-[#6e6e73]">다음 열차</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-[#f5f5f7] border border-[#d2d2d7]" />
                  <span className="text-[11px] text-[#c7c7cc]">지난 열차</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function TransportPage() {
  const [tab, setTab] = useState<Tab>("가볼만한곳");

  // URL ?tab= 파라미터로 초기 탭 설정
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (t && (["버스", "지하철", "가볼만한곳"] as string[]).includes(t)) setTab(t);
  }, []);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [favStops, setFavStops] = useState<Set<string>>(() => loadFavSet("favStops"));
  const [favRoutes, setFavRoutes] = useState<Set<string>>(() => loadFavSet("favRoutes"));
  const [favSubways, setFavSubways] = useState<Set<string>>(() => loadFavSet("favSubways"));
  const [selectedArrival, setSelectedArrival] = useState<BusArrival | null>(null);
  const [selectedSubway, setSelectedSubway] = useState<(SubwayStationWithDist & { arrivals: SubwayArrival[]; loadingArrivals: boolean }) | null>(null);
  const [timetableStation, setTimetableStation] = useState<SubwayStationWithDist | null>(null);
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

  // 가볼만한곳 state
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesCatFilter, setPlacesCatFilter] = useState<PlaceCategory | "all">("all");
  const [placesAreaFilter, setPlacesAreaFilter] = useState<PlaceArea | "all">("all");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
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
        } else if (source === "osm") {
          // OSM ref stationIds often match Incheon API stationIds — try real-time first
          arrivals = await fetchArrivalsByStationId(stop.id);
          if (arrivals.length === 0) arrivals = await fetchArrivalsByNodeId(stop.id);
        } else if (source === "fallback") {
          arrivals = await fetchArrivalsByNodeId(stop.id);
          if (arrivals.length === 0) arrivals = await fetchArrivalsByStationId(stop.id);
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
  const loadBusData = useCallback(async (lat: number, lng: number, clearStops = true) => {
    setLoading(true);
    if (clearStops) setApiStops(null);

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

  // ── 가볼만한곳 로드 (첫 번째 탭이므로 마운트 시 즉시 로드) ───
  useEffect(() => {
    if (places.length > 0) return;
    setPlacesLoading(true);
    fetchPublishedPlaces()
      .then(setPlaces)
      .catch(() => {})
      .finally(() => setPlacesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          loadBusData(p.lat, p.lng, false);  // GPS 갱신 시 기존 목록 유지하면서 교체
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

      {/* 지하철 시간표 바텀 시트 */}
      {timetableStation && (
        <SubwayTimetableSheet
          station={timetableStation}
          onClose={() => setTimetableStation(null)}
        />
      )}

      {/* 탭 */}
      <div className="bg-white sticky top-[52px] z-30 border-b border-[#f5f5f7] flex">
        {(["가볼만한곳", "버스", "지하철"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 h-11 text-[13px] font-semibold border-b-2 transition-colors ${
              t === tab ? "text-[#0071e3] border-[#0071e3]" : "text-[#86868b] border-transparent"
            }`}>
            {t === "버스" ? "🚌 버스" : t === "지하철" ? "🚇 지하철" : "📍 가볼만한곳"}
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
                  {([
                    ...upArr.filter(a => !a.isExpress).slice(0, 1).map(a => ({ a, dir: "상행" as const })),
                    ...upArr.filter(a =>  a.isExpress).slice(0, 1).map(a => ({ a, dir: "상행" as const })),
                    ...downArr.filter(a => !a.isExpress).slice(0, 1).map(a => ({ a, dir: "하행" as const })),
                    ...downArr.filter(a =>  a.isExpress).slice(0, 1).map(a => ({ a, dir: "하행" as const })),
                  ]).map(({ a, dir }, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3 py-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            dir === "상행" ? "bg-[#d2d2d7] text-[#424245]" : "bg-[#e8f1fd] text-[#0071e3]"
                          }`}>{dir}</span>
                          {a.isExpress && (
                            <span className="text-[10px] font-bold bg-[#FFF3E0] text-[#E65100] px-1 py-0.5 rounded shrink-0">
                              {a.trainTypeName ?? "급행"}
                            </span>
                          )}
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

          {/* 데이터 소스 상태 배너 */}
          {!loading && stopSource === "fallback" && (
            <div className="bg-[#FFF3E0] rounded-xl px-3.5 py-2.5 flex items-center gap-2">
              <span className="text-[13px]">⚠️</span>
              <p className="text-[12px] text-[#7C4700] font-medium">API 연결 불가 · 기본 검단 정류장 표시 중</p>
            </div>
          )}
          {!loading && stopSource === "osm" && (
            <div className="bg-[#e8f1fd] rounded-xl px-3.5 py-2.5 flex items-center gap-2">
              <span className="text-[13px]">🗺️</span>
              <p className="text-[12px] text-[#0071e3] font-medium">지도 기반 정류장 · 경유 노선만 표시</p>
            </div>
          )}

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
                            onClick={() => setSelectedArrival(a)}>
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
                                  {a.isScheduled ? "경유 노선 · 탭하여 전 경로 보기" : a.remainingStops > 0 ? `${a.remainingStops}정류장 전` : "곧 도착"}
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
                  {/* 역 헤더 — 탭하면 시간표 */}
                  <button
                    onClick={() => setTimetableStation(st)}
                    className="w-full px-4 pt-4 pb-3 flex items-center gap-3 active:bg-[#f5f5f7] text-left">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: st.lineColor + "22" }}>
                      <Train size={20} style={{ color: st.lineColor }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[16px] font-bold text-[#1d1d1f]">{st.displayName}</p>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: st.lineColor }}>{st.line}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {st.timetable.intervalMin > 0 && (
                          <p className="text-[12px] text-[#86868b]">배차 {st.timetable.intervalDisplay ?? `${st.timetable.intervalMin}분`}</p>
                        )}
                        <span className="flex items-center gap-0.5 text-[11px] text-[#0071e3] font-medium">
                          <Clock size={10} />시간표
                        </span>
                      </div>
                    </div>
                    {!st.planned && (
                      <button onClick={e => { e.stopPropagation(); toggleSubway(st.id); }} className="p-1.5 active:opacity-60">
                        <Star size={20}
                          className={favSubways.has(st.id) ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#d2d2d7]"} />
                      </button>
                    )}
                  </button>

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

                      // 방향 × 열차종류(일반/급행) 기준으로 행 목록 구성
                      const rows: { a: SubwayArrival; dir: "상행" | "하행" }[] = [
                        ...upArrivals.filter(a => !a.isExpress).slice(0, 1).map(a => ({ a, dir: "상행" as const })),
                        ...upArrivals.filter(a =>  a.isExpress).slice(0, 1).map(a => ({ a, dir: "상행" as const })),
                        ...downArrivals.filter(a => !a.isExpress).slice(0, 1).map(a => ({ a, dir: "하행" as const })),
                        ...downArrivals.filter(a =>  a.isExpress).slice(0, 1).map(a => ({ a, dir: "하행" as const })),
                      ];

                      return (
                      <>
                        {isEstimated && (
                          <div className="flex items-center gap-1.5 px-1 pb-1">
                            <span className="text-[11px] text-[#86868b]">⏱ 시간표 기준 추정 도착</span>
                          </div>
                        )}
                        {rows.map(({ a, dir }, i) => (
                          <div key={i} className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3 py-3">
                            <div className="flex-1 min-w-0 mr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  dir === "상행" ? "bg-[#d2d2d7] text-[#424245]" : "bg-[#e8f1fd] text-[#0071e3]"
                                }`}>{dir}</span>
                                {a.isExpress && (
                                  <span className="text-[10px] font-bold bg-[#FFF3E0] text-[#E65100] px-1 py-0.5 rounded shrink-0">
                                    {a.trainTypeName ?? "급행"}
                                  </span>
                                )}
                                <p className="text-[13px] font-semibold text-[#1d1d1f] truncate">{a.terminalStation} 방면</p>
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

      {/* ══ 가볼만한곳 탭 ══════════════════════════════════════ */}
      {tab === "가볼만한곳" && (
        <div className="pb-8">
          {/* 카테고리 필터 (홈 스타일 pill) */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pt-3 pb-2">
            {(["all", ...Object.keys(CATEGORY_META)] as (PlaceCategory | "all")[]).map(k => {
              const meta = k === "all" ? null : CATEGORY_META[k];
              const active = placesCatFilter === k;
              return (
                <button key={k} onClick={() => setPlacesCatFilter(k)}
                  className={`shrink-0 h-8 px-4 rounded-full text-[13px] font-bold transition-all ${
                    active ? "bg-[#1d1d1f] text-white" : "bg-white text-[#86868b]"
                  }`}>
                  {k === "all" ? "전체" : meta!.label}
                </button>
              );
            })}
          </div>
          {/* 지역 필터 */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
            {(["all", ...AREAS] as (PlaceArea | "all")[]).map(a => (
              <button key={a} onClick={() => setPlacesAreaFilter(a)}
                className={`shrink-0 h-7 px-3 rounded-full text-[12px] font-medium transition-all ${
                  placesAreaFilter === a
                    ? "bg-[#0071e3] text-white"
                    : "bg-white text-[#6e6e73]"
                }`}>
                {a === "all" ? "전체 지역" : a}
              </button>
            ))}
          </div>

          {/* 목록 */}
          {placesLoading ? (
            <div className="px-4 space-y-3">
              <div className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-52 bg-[#e5e5ea]" />
                <div className="px-4 py-4 space-y-2">
                  <div className="h-3 w-20 bg-[#f5f5f7] rounded-full" />
                  <div className="h-5 w-44 bg-[#f5f5f7] rounded" />
                  <div className="h-4 w-full bg-[#f5f5f7] rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                    <div className="h-32 bg-[#e5e5ea]" />
                    <div className="px-3 py-2.5 space-y-1.5">
                      <div className="h-3.5 w-20 bg-[#f5f5f7] rounded" />
                      <div className="h-3 w-full bg-[#f5f5f7] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (() => {
            const filtered = places.filter(p =>
              (placesCatFilter === "all" || p.category === placesCatFilter) &&
              (placesAreaFilter === "all" || p.area === placesAreaFilter)
            );
            if (filtered.length === 0) return (
              <div className="mx-4 bg-white rounded-2xl px-4 py-14 text-center">
                <MapPin size={32} className="text-[#d2d2d7] mx-auto mb-3" />
                <p className="text-[15px] font-semibold text-[#424245]">해당 장소가 없습니다</p>
                <p className="text-[13px] text-[#86868b] mt-1">다른 카테고리나 지역을 선택해 보세요</p>
              </div>
            );

            const [featured, ...rest] = filtered;
            const featCat = CATEGORY_META[featured.category];
            const catGrads: Record<PlaceCategory, [string, string]> = {
              kids:    ["#0071e3", "#38BDF8"],
              nature:  ["#2E7D32", "#4CAF50"],
              culture: ["#6B21A8", "#9C27B0"],
              travel:  ["#C2410C", "#F97316"],
              food:    ["#9D5C00", "#F59E0B"],
            };
            const [gFrom, gTo] = catGrads[featured.category];

            return (
              <div className="space-y-3">
                {/* ── 피처드 히어로 카드 ── */}
                <div className="px-4">
                  <button onClick={() => setSelectedPlace(featured)}
                    className="w-full rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform shadow-sm">
                    <div className="relative h-52"
                      style={featured.thumbnail_url ? {} : { background: `linear-gradient(135deg, ${gFrom}, ${gTo})` }}>
                      {featured.thumbnail_url
                        ? <>
                            <img src={featured.thumbnail_url} alt={featured.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 40%, rgba(0,0,0,0.1) 100%)" }} />
                          </>
                        : <div className="absolute inset-0 flex items-end justify-end p-4 opacity-20">
                            <MapPin size={80} className="text-white" />
                          </div>
                      }
                      {/* 상단 배지 */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="text-[11px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                          {featCat.label}
                        </span>
                        <span className="text-[11px] font-semibold bg-black/30 text-white px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                          {featured.area}
                        </span>
                      </div>
                      {/* PICK 배지 */}
                      <div className="absolute top-3 right-3 bg-white/90 rounded-full px-2 py-0.5">
                        <span className="text-[10px] font-black text-[#0071e3]">PICK</span>
                      </div>
                      {/* 하단 텍스트 오버레이 */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-[20px] font-black text-white leading-tight">{featured.name}</p>
                        <p className="text-[13px] text-white/80 mt-1 line-clamp-1">{featured.short_desc}</p>
                        {featured.drive_min && (
                          <div className="flex items-center gap-1 mt-2">
                            <Car size={11} className="text-white/70" />
                            <span className="text-[11px] text-white/70 font-medium">검단에서 차로 {featured.drive_min}분</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </div>

                {/* ── 나머지 카드 (2열 그리드) ── */}
                {rest.length > 0 && (
                  <div className="px-4">
                    {/* 섹션 라벨 */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[11px] font-black text-[#86868b] uppercase tracking-widest">
                        {filtered.length - 1}곳 더 보기
                      </span>
                      <div className="flex-1 h-px bg-[#e5e5ea]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {rest.map(place => {
                        const cat = CATEGORY_META[place.category];
                        const [pFrom, pTo] = catGrads[place.category];
                        return (
                          <button key={place.id} onClick={() => setSelectedPlace(place)}
                            className="bg-white rounded-2xl overflow-hidden text-left active:scale-95 transition-transform shadow-sm border border-[#f0f0f0]">
                            {/* 이미지 / 그라디언트 */}
                            <div className="relative h-[120px]"
                              style={place.thumbnail_url ? {} : { background: `linear-gradient(135deg, ${pFrom}, ${pTo})` }}>
                              {place.thumbnail_url
                                ? <>
                                    <img src={place.thumbnail_url} alt={place.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/20" />
                                  </>
                                : <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                    <MapPin size={40} className="text-white" />
                                  </div>
                              }
                              {/* 카테고리 배지 */}
                              <div className="absolute top-2 left-2">
                                <span className="text-[10px] font-bold bg-black/30 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                                  {cat.label}
                                </span>
                              </div>
                              {/* 드라이브 배지 */}
                              {place.drive_min && (
                                <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/40 rounded-full px-1.5 py-0.5 backdrop-blur-sm">
                                  <Car size={9} className="text-white" />
                                  <span className="text-[10px] text-white font-semibold">{place.drive_min}분</span>
                                </div>
                              )}
                            </div>
                            {/* 텍스트 */}
                            <div className="px-3 py-2.5">
                              <p className="text-[13px] font-bold text-[#1d1d1f] leading-tight line-clamp-1">{place.name}</p>
                              <p className="text-[11px] text-[#6e6e73] mt-0.5 line-clamp-2 leading-snug">{place.short_desc}</p>
                              <div className="flex items-center gap-1 mt-1.5">
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{ color: cat.color, background: cat.bg }}>{place.area}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* 가볼만한곳 상세 바텀 시트 */}
      {selectedPlace && (() => {
        const p = selectedPlace;
        const cat = CATEGORY_META[p.category];
        const catGrads: Record<PlaceCategory, [string, string]> = {
          kids:    ["#0071e3", "#38BDF8"],
          nature:  ["#2E7D32", "#4CAF50"],
          culture: ["#6B21A8", "#9C27B0"],
          travel:  ["#C2410C", "#F97316"],
          food:    ["#9D5C00", "#F59E0B"],
        };
        const [gFrom, gTo] = catGrads[p.category];
        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-[200]" onClick={() => setSelectedPlace(null)} />
            <div className="fixed left-0 right-0 bottom-0 z-[250] flex justify-center">
              <div className="w-full max-w-[430px] bg-white rounded-t-3xl overflow-hidden"
                style={{ maxHeight: "92dvh", display: "flex", flexDirection: "column" }}>

                {/* ── 그라디언트 헤더 이미지 ── */}
                <div className="relative shrink-0 h-56"
                  style={p.thumbnail_url ? {} : { background: `linear-gradient(135deg, ${gFrom}, ${gTo})` }}>
                  {p.thumbnail_url
                    ? <>
                        <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.15) 100%)" }} />
                      </>
                    : <div className="absolute inset-0 flex items-end justify-end p-6 opacity-20">
                        <MapPin size={96} className="text-white" />
                      </div>
                  }
                  {/* 핸들 바 */}
                  <div className="absolute top-3 left-0 right-0 flex justify-center">
                    <div className="w-10 h-1 bg-white/40 rounded-full" />
                  </div>
                  {/* 닫기 버튼 */}
                  <button onClick={() => setSelectedPlace(null)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center active:opacity-60 backdrop-blur-sm">
                    <X size={16} className="text-white" />
                  </button>
                  {/* 배지 */}
                  <div className="absolute top-4 left-4 flex items-center gap-1.5">
                    <span className="text-[11px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                      {cat.label}
                    </span>
                    <span className="text-[11px] font-semibold bg-black/30 text-white px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                      {p.area}
                    </span>
                  </div>
                  {/* 하단 텍스트 */}
                  <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                    <h2 className="text-[22px] font-black text-white leading-tight">{p.name}</h2>
                    <p className="text-[13px] text-white/80 mt-1 line-clamp-1">{p.short_desc}</p>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1">
                  <div className="px-5 pt-4 pb-10">
                    {/* 거리 정보 pill */}
                    {(p.distance_km || p.drive_min) && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-1.5 bg-[#f5f5f7] rounded-full px-3 py-1.5">
                          <Car size={13} className="text-[#424245]" />
                          <span className="text-[12px] font-semibold text-[#424245]">
                            검단에서 {p.distance_km && `${p.distance_km}km`}{p.drive_min && ` · 차로 약 ${p.drive_min}분`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 태그 */}
                    {p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {p.tags.map(tag => (
                          <span key={tag} className="text-[12px] text-[#6e6e73] bg-[#f5f5f7] px-2.5 py-1 rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* 본문 */}
                    {p.description && (
                      <div className="mb-4 pt-1">
                        <p className="text-[14px] text-[#1d1d1f] leading-relaxed whitespace-pre-line">{p.description}</p>
                      </div>
                    )}

                    {/* 상세 정보 카드 */}
                    {(p.operating_hours || p.admission_fee || p.address || p.phone || p.website) && (
                      <div className="bg-[#f5f5f7] rounded-2xl px-4 py-4 space-y-3 divide-y divide-[#e5e5ea]">
                        {p.operating_hours && (
                          <div className="flex items-start gap-3 pt-0">
                            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 mt-0.5">
                              <Clock size={13} className="text-[#0071e3]" />
                            </div>
                            <div>
                              <p className="text-[11px] text-[#86868b] font-semibold mb-0.5">운영시간</p>
                              <p className="text-[13px] text-[#1d1d1f] font-medium">{p.operating_hours}</p>
                            </div>
                          </div>
                        )}
                        {p.admission_fee && (
                          <div className="flex items-start gap-3 pt-3">
                            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-[12px] font-black text-[#2E7D32]">₩</span>
                            </div>
                            <div>
                              <p className="text-[11px] text-[#86868b] font-semibold mb-0.5">입장료</p>
                              <p className="text-[13px] text-[#1d1d1f] font-medium">{p.admission_fee}</p>
                            </div>
                          </div>
                        )}
                        {p.address && (
                          <div className="flex items-start gap-3 pt-3">
                            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 mt-0.5">
                              <MapPin size={13} className="text-[#F04452]" />
                            </div>
                            <div>
                              <p className="text-[11px] text-[#86868b] font-semibold mb-0.5">주소</p>
                              <p className="text-[13px] text-[#1d1d1f] font-medium">{p.address}</p>
                            </div>
                          </div>
                        )}
                        {p.phone && (
                          <div className="flex items-center gap-3 pt-3">
                            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0">
                              <Phone size={13} className="text-[#0071e3]" />
                            </div>
                            <a href={`tel:${p.phone}`} className="text-[13px] text-[#0071e3] font-semibold">{p.phone}</a>
                          </div>
                        )}
                        {p.website && (
                          <div className="flex items-center gap-3 pt-3">
                            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0">
                              <Globe size={13} className="text-[#0071e3]" />
                            </div>
                            <a href={p.website} target="_blank" rel="noopener noreferrer"
                              className="text-[13px] text-[#0071e3] font-semibold truncate">{p.website.replace(/^https?:\/\//, "")}</a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      <BottomNav />
    </div>
  );
}
