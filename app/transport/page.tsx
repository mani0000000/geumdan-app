"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapPin, RefreshCw, ChevronDown, ChevronUp, Star,
  Zap, Accessibility, Train, Navigation, Bus, Search, Clock,
  Car, Phone, Globe, ChevronRight, X, ArrowUp, ArrowDown,
} from "lucide-react";
import { fetchPublishedPlaces, CATEGORY_META, AREAS, type Place, type PlaceCategory, type PlaceArea } from "@/lib/db/places";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  hasBusApiKey,
  haversineM,
  GEUMDAN_BUS_STATIONS,
  fetchNearbyStopsFromTago,
  fetchArrivalsByNodeId, fetchArrivalsByStationId, osmRoutesToArrivals,
  fetchBusLocations, fetchRouteDetail, fetchStationsByRoute,
  searchRouteByNo, fetchRouteDetailFromTago, fetchStationsByRouteTago,
  searchStationsByName, searchStationsByNameOsm, searchRoutesByQuery,
  fetchBusLocationsTago, formatBusTime,
  type RouteSearchResult,
} from "@/lib/api/bus";
import {
  findNearbySubwayStations, fetchSubwayArrivals, hasSubwayKey,
  estimateNextArrivals, GIMPO_AIRPORT_GROUP,
  type SubwayStationWithDist, type SubwayArrival,
} from "@/lib/api/subway";
import type { BusArrival, RouteDetail, RouteStation, BusLocation, NearbyStop } from "@/lib/api/bus";

type Tab = "가볼만한곳" | "버스" | "지하철";

// 검단신도시 중심 좌표 — GPS 미취득/실패 시 폴백 기준점
const GEUMDAN_DEFAULT = { lat: 37.5777, lng: 126.7209 } as const;

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

// localStorage helpers — 순서가 의미 있는 즐겨찾기 ID 목록
function loadFavList(key: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}
function saveFavList(key: string, list: string[]) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* ignore */ }
}

// ─── 도착 뱃지 ───────────────────────────────────────────────
function ArrivalBadge({ min, live }: { min: number; live: boolean }) {
  if (!live || min === -1) {
    return (
      <div className="bg-[#d2d2d7] rounded-xl px-3 py-1.5 text-center min-w-[64px]">
        <span className="text-[#6e6e73] text-[16px] font-bold">--</span>
      </div>
    );
  }
  const bg = min <= 3 ? "bg-[#F04452]" : min <= 7 ? "bg-[#FF9500]" : "bg-[#0071e3]";
  return (
    <div className={`${bg} rounded-xl px-3 py-1.5 text-center min-w-[68px]`}>
      {min <= 1
        ? <span className="text-white text-[13px] font-extrabold">곧 도착 예정</span>
        : <>
            <span className="text-white text-[22px] font-black leading-none">{min}</span>
            <span className="text-white/80 text-[12px] block leading-none mt-0.5">분 후</span>
          </>
      }
    </div>
  );
}

function SkeletonStop() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
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
  isFav,
  onToggleFav,
}: {
  arrival: BusArrival;
  onClose: () => void;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  const [detail, setDetail] = useState<RouteDetail | null>(null);
  const [stations, setStations] = useState<RouteStation[]>([]);
  const [locations, setLocations] = useState<BusLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [noRouteData, setNoRouteData] = useState(false);
  const [dirTab, setDirTab] = useState<0 | 1>(0);
  // 실시간 위치 갱신을 위해 어떤 API로 어떤 routeId를 쓰는지 기억
  const locSourceRef = useRef<{ kind: "incheon" | "tago"; routeId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNoRouteData(false);
    locSourceRef.current = null;

    async function load() {
      let d: RouteDetail | null = null;
      let s: RouteStation[] = [];
      let l: BusLocation[] = [];
      let locSrc: { kind: "incheon" | "tago"; routeId: string } | null = null;

      // 1) 인천 routeId가 있으면 인천 API 우선 시도
      if (arrival.routeId) {
        const [icDetail, icStations, icLocations] = await Promise.all([
          fetchRouteDetail(arrival.routeId),
          fetchStationsByRoute(arrival.routeId),
          fetchBusLocations(arrival.routeId),
        ]);
        if (cancelled) return;
        d = icDetail; s = icStations; l = icLocations;
        if (icDetail || icStations.length > 0 || icLocations.length > 0) {
          locSrc = { kind: "incheon", routeId: arrival.routeId };
        }
      }

      // 2) 인천 API가 비어있고 routeNo가 있으면 TAGO로 보강
      if ((!d || s.length === 0 || l.length === 0) && arrival.routeNo) {
        const tagoRouteId = await searchRouteByNo(arrival.routeNo);
        if (cancelled) return;
        if (tagoRouteId) {
          const [tagoDetail, tagoStations, tagoLocations] = await Promise.all([
            fetchRouteDetailFromTago(tagoRouteId),
            fetchStationsByRouteTago(tagoRouteId),
            fetchBusLocationsTago(tagoRouteId),
          ]);
          if (cancelled) return;
          if (!d) d = tagoDetail;
          if (s.length === 0) s = tagoStations;
          if (l.length === 0) {
            l = tagoLocations;
            // 인천 API 위치가 비었을 때만 TAGO를 자동갱신 소스로 사용
            if (!locSrc || locSrc.kind === "incheon") {
              locSrc = { kind: "tago", routeId: tagoRouteId };
            }
          }
        }
      }

      if (cancelled) return;
      setDetail(d); setStations(s); setLocations(l);
      setLoading(false);
      if (!d && s.length === 0) setNoRouteData(true);
      else locSourceRef.current = locSrc;
    }

    load();
    return () => { cancelled = true; };
  }, [arrival.routeId, arrival.routeNo]);

  // 30초마다 실시간 버스 위치 자동 갱신 (탭 활성 상태일 때만)
  useEffect(() => {
    if (loading || noRouteData) return;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      const src = locSourceRef.current;
      if (!src) return;
      const fetcher = src.kind === "incheon" ? fetchBusLocations : fetchBusLocationsTago;
      fetcher(src.routeId).then(l => {
        if (locSourceRef.current?.routeId === src.routeId) setLocations(l);
      }).catch(() => { /* ignore */ });
    }, 30000);
    return () => clearInterval(id);
  }, [loading, noRouteData]);

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
            <div className="flex items-center gap-1">
              <button onClick={onToggleFav}
                className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center active:opacity-60"
                aria-label={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}>
                <Star size={16} className={isFav ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#86868b]"} />
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center active:opacity-60">
                <span className="text-[#6e6e73] text-[16px] font-bold">✕</span>
              </button>
            </div>
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
                    {formatBusTime(detail.upFirstTime)} / {formatBusTime(detail.upLastTime)}
                  </p>
                </div>
                <div className="flex-1 bg-[#F8F9FA] rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-[#6e6e73] font-medium mb-0.5">하행 첫차/막차</p>
                  <p className="text-[13px] font-bold text-[#1d1d1f]">
                    {formatBusTime(detail.downFirstTime)} / {formatBusTime(detail.downLastTime)}
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
            <div className="py-10 text-center">
              <Bus size={28} className="mx-auto text-[#D1D5DB] mb-2" />
              <p className="text-[14px] font-semibold text-[#424245]">
                {arrival.routeNo}번 {arrival.destination !== "종점" && arrival.destination !== "방향 미상" ? `· ${arrival.destination} 방면` : ""}
              </p>
              <p className="text-[12px] text-[#86868b] mt-1.5">상세 노선 정보를 불러오지 못했습니다</p>
              <p className="text-[11px] text-[#a1a1a6] mt-0.5">잠시 후 새로고침해 주세요</p>
            </div>
          ) : curStations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[14px] text-[#6e6e73]">정류장 정보를 불러올 수 없습니다</p>
            </div>
          ) : (
            <>
              {locations.length === 0 && (
                <div className="mb-3 rounded-xl bg-[#f5f5f7] px-3 py-2 text-center text-[12px] text-[#6e6e73]">
                  현재 운행 중인 버스 없음
                </div>
              )}
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
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── 김포공항역 환승 통합 카드 (5호선·9호선·공항철도·서해선·김포골드라인) ────
// 일반 역 카드와 동일한 컨테이너·헤더·도착정보 레이아웃을 사용하고,
// 노선 탭 셀렉터만 카드 내부에 추가로 둔다.
function GimpoAirportHubCard({
  stations,
  favSubways,
  onToggleFav,
  onOpenTimetable,
}: {
  stations: (SubwayStationWithDist & { arrivals: SubwayArrival[]; loadingArrivals: boolean })[];
  favSubways: string[];
  onToggleFav: (id: string) => void;
  onOpenTimetable: (st: SubwayStationWithDist) => void;
}) {
  const [activeId, setActiveId] = useState<string>(stations[0]?.id ?? "");

  useEffect(() => {
    if (stations.length > 0 && !stations.find(s => s.id === activeId)) {
      setActiveId(stations[0].id);
    }
  }, [stations, activeId]);

  if (stations.length === 0) return null;
  const active = stations.find(s => s.id === activeId) ?? stations[0];

  const displayArrivals = active.arrivals.length > 0
    ? active.arrivals
    : estimateNextArrivals(active.timetable, 3);
  const isEstimated = active.arrivals.length === 0;
  const upArrivals   = displayArrivals.filter(a => a.direction === "상행").slice(0, 3);
  const downArrivals = displayArrivals.filter(a => a.direction === "하행").slice(0, 3);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* 역 헤더 — 활성 노선 컬러 (일반 역 카드와 동일 패턴) */}
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: active.lineColor }}>
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
          <span className="text-[11px] font-black leading-none" style={{ color: active.lineColor }}>환승</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-extrabold text-[18px] leading-tight truncate">김포공항역</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="flex items-center gap-0.5 text-white/85 text-[12px] font-bold">
              <Navigation size={11} />{distLabel(active.distM)}
            </span>
            <span className="text-white/50">·</span>
            <span className="text-white/85 text-[12px] font-medium">{stations.length}개 노선 환승역</span>
          </div>
        </div>
        <button onClick={() => onToggleFav(active.id)} className="p-1.5 active:opacity-60 shrink-0">
          <Star size={20}
            className={favSubways.includes(active.id) ? "text-yellow-300 fill-yellow-300" : "text-white/50"} />
        </button>
      </div>

      {/* 노선 셀렉터 (카드 내부 전용) */}
      <div className="flex gap-1.5 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-[#f5f5f7]">
        {stations.map(st => {
          const isActive = st.id === activeId;
          return (
            <button key={st.id} onClick={() => setActiveId(st.id)}
              className={`shrink-0 px-3 h-8 rounded-full text-[12px] font-bold transition-all flex items-center gap-1.5 ${
                isActive ? "text-white" : "bg-[#f5f5f7] text-[#1d1d1f]"
              }`}
              style={isActive ? { background: st.lineColor } : {}}>
              <span className="w-2 h-2 rounded-full"
                style={{ background: isActive ? "rgba(255,255,255,0.9)" : st.lineColor }} />
              {st.shortLineLabel ?? st.line}
            </button>
          );
        })}
      </div>

      {/* 도착 정보 헤더 — 일반 역 카드와 동일 */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-[#f5f5f7]">
        <span className="text-[13px] font-bold text-[#1d1d1f]">도착 정보</span>
        <div className="flex items-center gap-2">
          {isEstimated && (
            <span className="text-[11px] text-[#86868b]">
              ⏱ {active.apiType === "gimpogold" ? "김포골드라인 시간표" : "시간표 기준"}
            </span>
          )}
          {active.timetable.intervalMin > 0 && (
            <span className="text-[11px] text-[#86868b]">
              배차 {active.timetable.intervalDisplay ?? `${active.timetable.intervalMin}분`}
            </span>
          )}
          <button onClick={() => onOpenTimetable(active)}
            className="flex items-center gap-1 text-[11px] text-[#0071e3] font-bold px-2 py-1 active:opacity-60">
            <Clock size={11} />시간표
          </button>
        </div>
      </div>

      {/* 2열 도착 — 일반 역 카드와 동일 */}
      {active.loadingArrivals ? (
        <div className="grid grid-cols-2 gap-2 p-3">
          {[0,1].map(i => <div key={i} className="h-20 bg-[#f5f5f7] rounded-xl animate-pulse" />)}
        </div>
      ) : displayArrivals.length === 0 ? (
        <p className="px-3 py-4 text-[14px] text-[#6e6e73] text-center">운행 종료</p>
      ) : (
        <div className="grid grid-cols-2 divide-x divide-[#f5f5f7]">
          {[
            { label: active.timetable.upDirection, arrivals: upArrivals },
            { label: active.timetable.downDirection, arrivals: downArrivals },
          ].map(({ label, arrivals: dirArrivals }, col) => (
            <div key={col} className="px-3 py-3">
              <div className="flex items-center gap-0.5 mb-2 pb-1.5 border-b border-[#f5f5f7]">
                <span className="text-[13px] font-bold text-[#1d1d1f] flex-1 truncate">
                  {label === "-" ? "운행 없음" : `${label} 방면`}
                </span>
                <ChevronRight size={13} className="text-[#86868b] shrink-0" />
              </div>
              {dirArrivals.length > 0 ? dirArrivals.map((a, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div className="flex-1 min-w-0 mr-1">
                    <span className="text-[13px] text-[#424245] block truncate font-medium">{a.terminalStation}</span>
                    {!isEstimated && a.currentStation && (
                      <span className="text-[10px] text-[#86868b]">{a.currentStation} 출발</span>
                    )}
                    {a.isExpress && (
                      <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                        a.trainTypeName === "직통"
                          ? "bg-[#F3E8FF] text-[#7C3AED]"
                          : "bg-[#FFF3E0] text-[#E65100]"
                      }`}>
                        {a.trainTypeName ?? "급행"}
                      </span>
                    )}
                  </div>
                  <span className={`text-[18px] font-black shrink-0 ${a.arrivalMin <= 1 ? "text-[#F04452]" : "text-[#0071e3]"}`}>
                    {a.arrivalMin <= 1 ? "곧 도착" : `${a.arrivalMin}분`}
                  </span>
                </div>
              )) : (
                <span className="text-[12px] text-[#86868b]">정보 없음</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 첫차/막차 */}
      {active.timetable.upFirst !== "-" && (
        <div className="flex gap-2 px-3 pb-3 pt-1 border-t border-[#f5f5f7]">
          <div className="flex-1 bg-[#f5f5f7] rounded-xl px-3 py-2.5">
            <p className="text-[11px] text-[#86868b] mb-0.5">{active.timetable.upDirection} 첫/막차</p>
            <p className="text-[13px] font-bold text-[#1d1d1f]">{active.timetable.upFirst} / {active.timetable.upLast}</p>
          </div>
          {active.timetable.downFirst !== "-" && (
            <div className="flex-1 bg-[#f5f5f7] rounded-xl px-3 py-2.5">
              <p className="text-[11px] text-[#86868b] mb-0.5">{active.timetable.downDirection} 첫/막차</p>
              <p className="text-[13px] font-bold text-[#1d1d1f]">{active.timetable.downFirst} / {active.timetable.downLast}</p>
            </div>
          )}
        </div>
      )}
    </div>
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
  // 일반/급행 토글 (급행 시간표가 별도로 있는 노선만 활성)
  const hasExpress = !!station.timetable.expressIntervalMin;
  const [typeTab, setTypeTab] = useState<"normal" | "express">("normal");
  const useExpress = hasExpress && typeTab === "express";
  const expressLabel = station.timetable.expressLabel ?? "급행";

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

  const tt = station.timetable;
  const upFirst   = useExpress ? (tt.expressUpFirst   ?? tt.upFirst)   : tt.upFirst;
  const upLast    = useExpress ? (tt.expressUpLast    ?? tt.upLast)    : tt.upLast;
  const downFirst = useExpress ? (tt.expressDownFirst ?? tt.downFirst) : tt.downFirst;
  const downLast  = useExpress ? (tt.expressDownLast  ?? tt.downLast)  : tt.downLast;
  const curIntervalMin = useExpress ? (tt.expressIntervalMin ?? tt.intervalMin) : tt.intervalMin;

  const upTimes   = generateTimes(upFirst,   upLast,   curIntervalMin);
  const downTimes = generateTimes(downFirst, downLast, curIntervalMin);
  const curTimes  = dirTab === "up" ? upTimes : downTimes;
  const curDest   = dirTab === "up" ? tt.upDirection : tt.downDirection;

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
          <p className="text-[12px] text-[#86868b] mt-2 flex items-center gap-1">
            <Clock size={12} />
            배차 {useExpress
              ? `${tt.expressIntervalMin}분 (${expressLabel})`
              : tt.intervalDisplay ?? `${tt.intervalMin}분`} 기준 추정 시간표
          </p>
        </div>

        {/* 일반/급행(직통) 탭 — 급행 시간표가 별도로 있는 노선에만 표시 */}
        {hasExpress && (
          <div className="shrink-0 flex border-b border-[#f5f5f7]">
            {([
              { v: "normal" as const,  label: "일반열차", color: "#0071e3" },
              { v: "express" as const, label: expressLabel, color: expressLabel === "직통" ? "#7C3AED" : "#E65100" },
            ]).map(opt => (
              <button key={opt.v} onClick={() => setTypeTab(opt.v)}
                className={`flex-1 h-10 text-[13px] font-bold border-b-2 transition-colors ${
                  typeTab === opt.v ? "" : "text-[#86868b] border-transparent"
                }`}
                style={typeTab === opt.v ? { color: opt.color, borderColor: opt.color } : undefined}>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* 방면 탭 */}
        <div className="shrink-0 flex border-b border-[#f5f5f7]">
          {(["up", "down"] as const).map(dir => (
            <button key={dir} onClick={() => setDirTab(dir)}
              className={`flex-1 h-10 text-[13px] font-semibold border-b-2 transition-colors ${
                dirTab === dir ? "text-[#0071e3] border-[#0071e3]" : "text-[#86868b] border-transparent"
              }`}>
              {dir === "up" ? `⬆ ${tt.upDirection}` : `⬇ ${tt.downDirection}`}
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
                      return diff <= 1 ? (
                        <span className="text-[20px] font-black text-[#F04452]">곧 도착 예정</span>
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
  const [favStops, setFavStops] = useState<string[]>(() => loadFavList("favStops"));
  const [favRoutes, setFavRoutes] = useState<string[]>(() => loadFavList("favRoutes"));
  // 노선 자체 즐겨찾기 (key=routeNo) — 정류장 무관, 모든 정류장에서 해당 routeNo 도착정보를 모아 보여줌
  const [favBusRoutes, setFavBusRoutes] = useState<string[]>(() => loadFavList("favBusRoutes"));
  const [favSubways, setFavSubways] = useState<string[]>(() => loadFavList("favSubways"));
  // 가까운 N개만 기본 표시, 나머지는 "더 보기" 토글로
  const [showAllStops, setShowAllStops] = useState(false);
  const [selectedArrival, setSelectedArrival] = useState<BusArrival | null>(null);
  const [selectedSubway, setSelectedSubway] = useState<(SubwayStationWithDist & { arrivals: SubwayArrival[]; loadingArrivals: boolean }) | null>(null);
  const [timetableStation, setTimetableStation] = useState<SubwayStationWithDist | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const [, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  // "far" = GPS는 잡혔지만 검단 권역 밖 → 검단 중심 좌표로 강제 검색 중
  const [locState, setLocState] = useState<"loading" | "ok" | "far" | "denied" | "idle">("idle");
  // 버스 정류장 소스: "tago"=국가API실시간, "ic"=인천API실시간, "osm"=경유만, "fallback"=하드코딩
  const [stopSource, setStopSource] = useState<"tago"|"ic"|"osm"|"fallback"|null>(null);
  // GPS 기반으로 API에서 조회한 정류장 (null = 미조회)
  const [apiStops, setApiStops] = useState<DisplayStop[] | null>(null);
  // 지하철 역 + 실시간 도착정보
  // 검단 기준 정렬된 역 목록으로 동기 초기화 — GPS 대기 중에도 빈 상태 노출 방지
  const [subwayList, setSubwayList] = useState<(SubwayStationWithDist & { arrivals: SubwayArrival[]; loadingArrivals: boolean })[]>(
    () => findNearbySubwayStations(GEUMDAN_DEFAULT.lat, GEUMDAN_DEFAULT.lng, 25000)
      .map(st => ({ ...st, arrivals: [], loadingArrivals: true }))
  );
  const [subwayLoading, setSubwayLoading] = useState(false);
  const [busSearch, setBusSearch] = useState("");
  // 광역 검색 결과 (TAGO/Overpass에서 검단 외 정류장·노선까지)
  const [searchStations, setSearchStations] = useState<NearbyStop[]>([]);
  const [searchRoutes, setSearchRoutes] = useState<RouteSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchStationArrivals, setSearchStationArrivals] = useState<Record<string, BusArrival[]>>({});
  const [searchExpanded, setSearchExpanded] = useState<string | null>(null);
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
  // 우선순위: 첫 PRIORITY_N개 await → 사용자 시야 카드 먼저 채움.
  // 나머지는 fire-and-forget → setApiStops로 점진적 업데이트.
  const fetchArrivalsForStops = useCallback(async (stops: DisplayStop[], src?: "tago"|"ic"|"osm"|"fallback"|null) => {
    const source = src ?? stopSource;
    const PRIORITY_N = 5;
    const dev = process.env.NODE_ENV !== "production";
    const t0 = dev ? performance.now() : 0;

    // production 진단: 인천 BUS_BASE arrivals API는 5자리·ICB nodeId 모두
    // resultCode=3 거부 (활용신청 미승인). TAGO tagoArrivals만 신뢰 가능.
    // → 모든 source에서 TAGO 도착 API 우선. 빈 응답이면 osmRoutes 정적 정보로 폴백.
    const fetchOne = async (stop: DisplayStop) => {
      let arrivals: BusArrival[] = await fetchArrivalsByNodeId(stop.id);
      if (arrivals.length === 0 && stop.osmRoutes && stop.osmRoutes.length > 0) {
        arrivals = osmRoutesToArrivals(stop.osmRoutes);
      }
      setApiStops(prev =>
        prev ? prev.map(s => s.id === stop.id
          ? { ...s, arrivals, loadingArrivals: false }
          : s)
        : prev
      );
    };

    const priority = stops.slice(0, PRIORITY_N);
    const rest     = stops.slice(PRIORITY_N);

    await Promise.allSettled(priority.map(fetchOne));
    if (dev) console.log(`[transport] arrivals priority(${priority.length}) ${(performance.now() - t0).toFixed(0)}ms src=${source}`);
    setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));

    // 나머지는 fire-and-forget (UI에 점진 반영)
    if (rest.length > 0) {
      Promise.allSettled(rest.map(fetchOne)).then(() => {
        if (dev) console.log(`[transport] arrivals rest(${rest.length}) total ${(performance.now() - t0).toFixed(0)}ms`);
        setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      });
    }
  }, [stopSource]);

  // ── 버스 데이터 전체 로드: GPS 기반 주변 정류장 + 도착정보 ──
  // 단일 소스: TAGO BusSttnInfoInqireService/getCrdntPrxmtSttnList.
  // 인천 aroundStations(별도 활용신청 미승인 → 500), Overpass(빈 응답·외부 불안정)는
  // 모두 신뢰 불가로 판명되어 race에서 제거. TAGO 빈 응답 시 검단 하드코딩 폴백.
  //
  // 깜박임 방지: 첫 로드(apiStops==null)일 때만 setLoading(true)→스켈레톤.
  // GPS 재호출 등 갱신 시에는 기존 정류장 목록을 유지한 채 데이터만 교체.
  const loadBusData = useCallback(async (lat: number, lng: number, clearStops = true) => {
    const isFirstLoad = clearStops || apiStopsRef.current === null;
    if (isFirstLoad) {
      setLoading(true);
      setApiStops(null);
    }

    const dev = process.env.NODE_ENV !== "production";
    const t0 = dev ? performance.now() : 0;
    const since = () => (performance.now() - t0).toFixed(0);

    let stops: DisplayStop[] = [];
    let src: "tago"|"ic"|"osm"|"fallback" = "fallback";

    // TAGO race timeout 제거: apiFetch 자체에 10s AbortSignal 있음.
    // Vercel cold start(3-5s) + TAGO(1-3s)가 6s 초과해서 false-fallback 트리거되던
    // 버그 수정. 클라이언트는 최대 10s 기다린 뒤 빈 배열 받으면 폴백.
    //
    // 정렬 정책: 반경 500m 내 가까운 순 상위 4개. 비면 최근접 1개 폴백.
    const NEARBY_RADIUS_M = 500;
    const NEARBY_MAX = 4;
    const pickNearest = <T extends { distanceM: number }>(arr: T[]): T[] => {
      const sorted = [...arr].sort((a, b) => a.distanceM - b.distanceM);
      const within = sorted.filter(s => s.distanceM <= NEARBY_RADIUS_M).slice(0, NEARBY_MAX);
      return within.length > 0 ? within : sorted.slice(0, 1);
    };

    try {
      const tagoNearby = await fetchNearbyStopsFromTago(lat, lng);
      if (dev) console.log(`[transport] TAGO nearby ${since()}ms → ${tagoNearby.length}`);
      if (tagoNearby.length > 0) {
        src = "tago";
        stops = pickNearest(tagoNearby).map(s => ({
          id: s.stationId, name: s.stationName,
          distM: s.distanceM, arrivals: [], loadingArrivals: true,
          lat: s.lat, lng: s.lng, osmRoutes: [],
        }));
      } else throw new Error("tago_empty");
    } catch {
      // TAGO 실패/빈 응답 — 검단 하드코딩 폴백.
      // 거리 계산은 사용자 좌표가 검단에서 5km+ 떨어진 경우 검단 중심 기준으로
      // 보정 (사용자가 서울에 있는데 "아라역 37km" 같은 무의미한 표시 방지).
      src = "fallback";
      // 사용자 좌표가 검단에서 5km+ 멀면 검단 중심 기준으로 거리 계산 →
      // "아라역 37km" 같은 무의미한 표시 방지.
      const farFromGeumdan = haversineM(lat, lng, GEUMDAN_DEFAULT.lat, GEUMDAN_DEFAULT.lng) > 5000;
      const refLat = farFromGeumdan ? GEUMDAN_DEFAULT.lat : lat;
      const refLng = farFromGeumdan ? GEUMDAN_DEFAULT.lng : lng;
      const all = GEUMDAN_BUS_STATIONS.map(s => ({
        ...s,
        distanceM: Math.round(haversineM(refLat, refLng, s.lat, s.lng)),
      }));
      stops = pickNearest(all).map(s => ({
        id: s.stationId, name: s.name,
        distM: s.distanceM, arrivals: [], loadingArrivals: true,
        lat: s.lat, lng: s.lng,
        osmRoutes: s.routes,
      }));
      if (dev) console.warn(`[transport] hard-coded fallback ${since()}ms (farFromGeumdan=${farFromGeumdan})`);
    }

    setStopSource(src);
    setApiStops(stops);
    setLoading(false);
    if (dev) console.log(`[transport] stop list painted ${since()}ms`);
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

  // ── 지하철 데이터 로드 — GPS 기준 가까운 순 정렬 ────────────
  // GPS 미취득/실패 시 검단신도시(GEUMDAN_DEFAULT) 기준으로 정렬 → 항상 목록 표시.
  const loadSubwayData = useCallback(async (lat?: number, lng?: number) => {
    const ref = lat != null && lng != null
      ? { lat, lng }
      : (posRef.current ?? GEUMDAN_DEFAULT);
    // 김포공항역(허브)까지 포함하도록 반경 25km. 빈 결과 방지 — 후속 안전망.
    let all = findNearbySubwayStations(ref.lat, ref.lng, 25000);
    if (all.length === 0) {
      // 반경 내 결과가 없으면(이상 좌표 등) 검단 기준 전체 정렬로 폴백
      all = findNearbySubwayStations(GEUMDAN_DEFAULT.lat, GEUMDAN_DEFAULT.lng, 100000);
    }
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
  // 검단신도시 중심 좌표 + 권역 반경. GPS가 권역 밖이면 검단 중심으로 강제
  // 검색해서 의미 있는 정류장을 보여준다 (이 앱은 검단 전용이므로).
  useEffect(() => {
    const GEUMDAN_RADIUS_M = 8000;
    // 1) GPS 와 무관하게 검단 기본 좌표로 지하철 목록을 즉시 채운다.
    //    GPS 가 늦게 오거나 실패해도 사용자는 검단 인근 역 전체를 바로 본다.
    posRef.current = GEUMDAN_DEFAULT;
    setUserPos(GEUMDAN_DEFAULT);
    loadSubwayData(GEUMDAN_DEFAULT.lat, GEUMDAN_DEFAULT.lng);

    if (!navigator.geolocation) {
      setLocState("denied");
      loadBusData(GEUMDAN_DEFAULT.lat, GEUMDAN_DEFAULT.lng);
      return;
    }

    setLocState("loading");
    const tGpsStart = performance.now();
    const dev = process.env.NODE_ENV !== "production";

    // 700ms 안에 GPS 응답 없으면 DEFAULT 로 버스 우선 로드. GPS 도착 시 재조회.
    // GPS 자체 timeout 은 8초.
    let busDispatched = false;
    const dispatchBus = (lat: number, lng: number) => {
      if (busDispatched) return;
      busDispatched = true;
      loadBusData(lat, lng);
    };

    const fastTimer = setTimeout(() => {
      if (dev) console.log(`[transport] GPS fastTimer fired at ${(performance.now() - tGpsStart).toFixed(0)}ms — using DEFAULT`);
      dispatchBus(GEUMDAN_DEFAULT.lat, GEUMDAN_DEFAULT.lng);
    }, 700);

    navigator.geolocation.getCurrentPosition(
      pos => {
        clearTimeout(fastTimer);
        if (dev) console.log(`[transport] GPS resolved at ${(performance.now() - tGpsStart).toFixed(0)}ms`);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const distFromGeumdan = haversineM(p.lat, p.lng, GEUMDAN_DEFAULT.lat, GEUMDAN_DEFAULT.lng);
        const inGeumdan = distFromGeumdan <= GEUMDAN_RADIUS_M;
        if (dev) console.log(`[transport] GPS @ ${distFromGeumdan.toFixed(0)}m from 검단 (in=${inGeumdan})`);

        if (!inGeumdan) {
          // 사용자가 검단 밖 → 검단 중심 좌표로 강제 검색.
          // userPos는 실제 위치를 기록하되 정류장 검색만 검단 기준.
          setLocState("far");
          setUserPos(p);
          posRef.current = GEUMDAN_DEFAULT;
          if (busDispatched) {
            loadBusData(GEUMDAN_DEFAULT.lat, GEUMDAN_DEFAULT.lng, false);
          } else {
            dispatchBus(GEUMDAN_DEFAULT.lat, GEUMDAN_DEFAULT.lng);
          }
          return;
        }

        setLocState("ok");
        posRef.current = p;
        setUserPos(p);
        // 50m 이상 이동했을 때만 재조회 — 깜빡임 방지
        if (haversineM(GEUMDAN_DEFAULT.lat, GEUMDAN_DEFAULT.lng, p.lat, p.lng) > 50) {
          if (busDispatched) {
            loadBusData(p.lat, p.lng, false);
          } else {
            dispatchBus(p.lat, p.lng);
          }
          loadSubwayData(p.lat, p.lng);
        } else {
          dispatchBus(p.lat, p.lng);
        }
      },
      () => {
        clearTimeout(fastTimer);
        setLocState("denied");
        dispatchBus(GEUMDAN_DEFAULT.lat, GEUMDAN_DEFAULT.lng);
      },
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true }
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

  // ── 버스 광역 검색 (정류장명 + 노선번호) ────────────────────
  useEffect(() => {
    const q = busSearch.trim();
    if (q.length < 2) {
      setSearchStations([]);
      setSearchRoutes([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const handle = setTimeout(async () => {
      const [stationsResult, osmResult, routesResult] = await Promise.allSettled([
        searchStationsByName(q),
        searchStationsByNameOsm(q),
        searchRoutesByQuery(q),
      ]);
      if (cancelled) return;
      // 인천 BIS 응답 우선, 비어 있으면 Overpass 사용. 중복은 stationId 기준 제거
      const incheon = stationsResult.status === "fulfilled" ? stationsResult.value : [];
      const osm = osmResult.status === "fulfilled" ? osmResult.value : [];
      const seen = new Set<string>();
      const merged: NearbyStop[] = [];
      for (const s of [...incheon, ...osm]) {
        if (seen.has(s.stationId)) continue;
        seen.add(s.stationId);
        merged.push(s);
      }
      setSearchStations(merged.slice(0, 30));
      setSearchRoutes(routesResult.status === "fulfilled" ? routesResult.value.slice(0, 15) : []);
      setSearching(false);
    }, 350);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [busSearch]);

  // 검색 결과 정류장 클릭 → 도착정보 조회
  const loadSearchStationArrivals = useCallback(async (stationId: string) => {
    if (searchStationArrivals[stationId]) return;
    let arrivals = await fetchArrivalsByNodeId(stationId);
    if (arrivals.length === 0) arrivals = await fetchArrivalsByStationId(stationId);
    setSearchStationArrivals(prev => ({ ...prev, [stationId]: arrivals }));
  }, [searchStationArrivals]);

  const refresh = async () => {
    // posRef.current는 "far" 상태일 때 이미 검단 중심으로 보정되어 있음
    const p = posRef.current ?? GEUMDAN_DEFAULT;
    setRefreshing(true);
    if (tab === "버스") {
      await loadBusData(p.lat, p.lng, false);
    } else {
      await loadSubwayData(p.lat, p.lng);
    }
    setRefreshing(false);
  };

  const stopsWithRoutes: DisplayStop[] = apiStops ?? [];

  function makeToggle(key: string, setter: React.Dispatch<React.SetStateAction<string[]>>) {
    return (id: string) => setter(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      saveFavList(key, next);
      return next;
    });
  }
  function makeMove(key: string, setter: React.Dispatch<React.SetStateAction<string[]>>) {
    return (id: string, dir: -1 | 1) => setter(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      saveFavList(key, next);
      return next;
    });
  }
  const toggleStop     = makeToggle("favStops",     setFavStops);
  const toggleRoute    = makeToggle("favRoutes",    setFavRoutes);
  const toggleSubway   = makeToggle("favSubways",   setFavSubways);
  const toggleBusRoute = makeToggle("favBusRoutes", setFavBusRoutes);
  const moveStop       = makeMove("favStops",       setFavStops);
  const moveRoute      = makeMove("favRoutes",      setFavRoutes);
  const moveSubway     = makeMove("favSubways",     setFavSubways);
  const moveBusRoute   = makeMove("favBusRoutes",   setFavBusRoutes);

  // 즐겨찾기 노선 키: `${stationId}::${routeId||routeNo}`
  const routeFavKey = (stopId: string, a: BusArrival) =>
    `${stopId}::${a.routeId || a.routeNo}`;

  // 즐겨찾기는 사용자가 정한 순서대로 표시 (배열 순서 그대로)
  const favStopList = favStops
    .map(id => stopsWithRoutes.find(s => s.id === id))
    .filter((s): s is DisplayStop => Boolean(s));
  const favRouteList = favRoutes
    .map(fk => {
      for (const stop of stopsWithRoutes) {
        const a = stop.arrivals.find(ar => routeFavKey(stop.id, ar) === fk);
        if (a) return { ...a, stopName: stop.name, stopId: stop.id, favKey: fk };
      }
      return null;
    })
    .filter(<T,>(x: T | null): x is T => x !== null);
  // favBusRoutes (routeNo 기반): 사용자 지정 순서대로, 노선당 가장 빨리 오는 도착 1건
  const favBusRouteCards = (() => {
    const byRouteNo = new Map<string, { arrival: BusArrival; stopName: string; stopId: string; stopDistM: number }>();
    for (const stop of stopsWithRoutes) {
      for (const a of stop.arrivals) {
        if (!favBusRoutes.includes(a.routeNo)) continue;
        const existing = byRouteNo.get(a.routeNo);
        const candidate = { arrival: a, stopName: stop.name, stopId: stop.id, stopDistM: stop.distM };
        if (!existing) {
          byRouteNo.set(a.routeNo, candidate);
        } else {
          // 더 빨리 오는(또는 더 가까운) 정류장의 카드를 채택
          const existingMin = existing.arrival.arrivalMin;
          const newMin = a.arrivalMin;
          const existingLive = existingMin >= 0;
          const newLive = newMin >= 0;
          if ((newLive && !existingLive) ||
              (newLive && existingLive && newMin < existingMin) ||
              (!newLive && !existingLive && stop.distM < existing.stopDistM)) {
            byRouteNo.set(a.routeNo, candidate);
          }
        }
      }
    }
    return favBusRoutes
      .map(rn => byRouteNo.get(rn))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  })();
  const favSubwayList = favSubways
    .map(id => subwayList.find(s => s.id === id))
    .filter((s): s is (typeof subwayList)[number] => Boolean(s));

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
    if (locState === "far")
      return (
        <span className="flex items-center gap-1 text-[12px] font-bold bg-[#FFF3E0] text-[#7C4700] px-2 py-0.5 rounded-full">
          <MapPin size={10} />검단 권역 밖
        </span>
      );
    return <span className="text-[12px] text-[#86868b]">검단신도시 기준</span>;
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-28">
      <Header title="교통 정보" />

      {/* 플로팅 새로고침 버튼 — 네비(bottom-5 + h-64px = 84px) 위로 16px 여백 = 100px */}
      <button
        onClick={refresh}
        disabled={refreshing}
        className="fixed bottom-[100px] right-4 z-50 w-12 h-12 bg-[#0071e3] rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
        aria-label="새로고침"
      >
        <RefreshCw size={20} className={`text-white ${refreshing ? "animate-spin" : ""}`} />
      </button>

      {/* 버스 상세 바텀 시트 */}
      {selectedArrival && (
        <BusDetailSheet
          arrival={selectedArrival}
          onClose={() => setSelectedArrival(null)}
          isFav={favBusRoutes.includes(selectedArrival.routeNo)}
          onToggleFav={() => toggleBusRoute(selectedArrival.routeNo)}
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
      {tab === "버스" && (favBusRouteCards.length > 0 || favStopList.length > 0 || favRouteList.length > 0) && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Star size={12} className="text-[#FFBB00] fill-[#FFBB00]" />
              <span className="text-[12px] font-bold text-[#424245]">즐겨찾기</span>
            </div>
            <button onClick={refresh} className="flex items-center gap-1 active:opacity-60">
              <RefreshCw size={11} className={`text-[#6e6e73] ${refreshing ? "animate-spin" : ""}`} />
              <span className="text-[11px] text-[#6e6e73]">{lastUpdated || "새로고침"}</span>
            </button>
          </div>
          <div className="space-y-2">
            {favBusRouteCards.map(({ arrival: r, stopName }, idx) => (
              <div key={`favr-${r.routeNo}`}
                className="bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-2.5 flex items-center gap-2.5">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveBusRoute(r.routeNo, -1)} disabled={idx === 0}
                    className="w-6 h-5 rounded bg-[#f5f5f7] flex items-center justify-center active:opacity-60 disabled:opacity-30">
                    <ArrowUp size={11} className="text-[#6e6e73]" />
                  </button>
                  <button onClick={() => moveBusRoute(r.routeNo, 1)} disabled={idx === favBusRouteCards.length - 1}
                    className="w-6 h-5 rounded bg-[#f5f5f7] flex items-center justify-center active:opacity-60 disabled:opacity-30">
                    <ArrowDown size={11} className="text-[#6e6e73]" />
                  </button>
                </div>
                <button onClick={() => setSelectedArrival(r)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left active:opacity-70">
                  <div className="bg-[#0071e3] rounded-lg px-2 py-1 min-w-[44px] text-center shrink-0">
                    <span className="text-white text-[13px] font-black leading-tight">{r.routeNo}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-semibold text-[#1d1d1f] truncate">{r.destination} 방면</p>
                      {r.isExpress && <Zap size={10} className="text-[#E65100] shrink-0" />}
                    </div>
                    <p className="text-[11px] text-[#86868b] truncate">{stopName}</p>
                  </div>
                  <ArrivalBadge min={r.arrivalMin} live={isLive && !r.isScheduled} />
                </button>
                <button onClick={() => toggleBusRoute(r.routeNo)}
                  className="w-6 h-6 rounded-full bg-[#f5f5f7] flex items-center justify-center active:opacity-60 shrink-0">
                  <X size={11} className="text-[#6e6e73]" />
                </button>
              </div>
            ))}
            {favRouteList.map((r, idx) => (
              <div key={r.favKey}
                className="bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-2.5 flex items-center gap-2.5">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveRoute(r.favKey, -1)} disabled={idx === 0}
                    className="w-6 h-5 rounded bg-[#f5f5f7] flex items-center justify-center active:opacity-60 disabled:opacity-30">
                    <ArrowUp size={11} className="text-[#6e6e73]" />
                  </button>
                  <button onClick={() => moveRoute(r.favKey, 1)} disabled={idx === favRouteList.length - 1}
                    className="w-6 h-5 rounded bg-[#f5f5f7] flex items-center justify-center active:opacity-60 disabled:opacity-30">
                    <ArrowDown size={11} className="text-[#6e6e73]" />
                  </button>
                </div>
                <div className="bg-[#0071e3] rounded-lg px-2 py-1 min-w-[44px] text-center shrink-0">
                  <span className="text-white text-[13px] font-black leading-tight">{r.routeNo}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-semibold text-[#1d1d1f] truncate">{r.destination} 방면</p>
                    {r.isExpress && <Zap size={10} className="text-[#E65100] shrink-0" />}
                  </div>
                  <p className="text-[11px] text-[#86868b] truncate">{r.stopName}</p>
                </div>
                <ArrivalBadge min={r.arrivalMin} live={isLive} />
                <button onClick={() => toggleRoute(r.favKey)}
                  className="w-6 h-6 rounded-full bg-[#f5f5f7] flex items-center justify-center active:opacity-60 shrink-0">
                  <X size={11} className="text-[#6e6e73]" />
                </button>
              </div>
            ))}
            {favStopList.map((stop, idx) => (
              <div key={stop.id}
                className="bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-2.5 flex items-center gap-2.5">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveStop(stop.id, -1)} disabled={idx === 0}
                    className="w-6 h-5 rounded bg-[#f5f5f7] flex items-center justify-center active:opacity-60 disabled:opacity-30">
                    <ArrowUp size={11} className="text-[#6e6e73]" />
                  </button>
                  <button onClick={() => moveStop(stop.id, 1)} disabled={idx === favStopList.length - 1}
                    className="w-6 h-5 rounded bg-[#f5f5f7] flex items-center justify-center active:opacity-60 disabled:opacity-30">
                    <ArrowDown size={11} className="text-[#6e6e73]" />
                  </button>
                </div>
                <div className="w-9 h-9 rounded-lg bg-[#e8f1fd] flex items-center justify-center shrink-0">
                  <Bus size={16} className="text-[#0071e3]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#1d1d1f] truncate">{stop.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Navigation size={9} className="text-[#0071e3]" />
                    <span className="text-[11px] font-semibold text-[#0071e3]">{distLabel(stop.distM)}</span>
                    <span className="text-[11px] text-[#86868b]"> · 노선 {stop.arrivals.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {stop.arrivals.slice(0, 5).map((a, i) => (
                      <span key={i} className="bg-[#0071e3] rounded px-1.5 py-0.5 text-white text-[10px] font-bold">
                        {a.routeNo}
                      </span>
                    ))}
                    {stop.loadingArrivals && (
                      <span className="bg-[#d2d2d7] rounded px-4 py-1 animate-pulse" />
                    )}
                  </div>
                </div>
                <button onClick={() => toggleStop(stop.id)}
                  className="w-6 h-6 rounded-full bg-[#f5f5f7] flex items-center justify-center active:opacity-60 shrink-0">
                  <X size={11} className="text-[#6e6e73]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ 지하철 즐겨찾기 인라인 (지하철 탭 전용) ══════════════ */}
      {tab === "지하철" && favSubwayList.length > 0 && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Star size={12} className="text-[#FFBB00] fill-[#FFBB00]" />
              <span className="text-[12px] font-bold text-[#424245]">즐겨찾기</span>
            </div>
            <button onClick={refresh} className="flex items-center gap-1 active:opacity-60">
              <RefreshCw size={11} className={`text-[#6e6e73] ${refreshing ? "animate-spin" : ""}`} />
              <span className="text-[11px] text-[#6e6e73]">{lastUpdated || "새로고침"}</span>
            </button>
          </div>
          <div className="space-y-2">
            {favSubwayList.map((st, idx) => {
              const displayArrivals = st.arrivals.length > 0 ? st.arrivals : estimateNextArrivals(st.timetable);
              const nextUp   = displayArrivals.find(a => a.direction === "상행");
              const nextDown = displayArrivals.find(a => a.direction === "하행");
              return (
                <div key={st.id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-2.5 flex items-center gap-2.5">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => moveSubway(st.id, -1)} disabled={idx === 0}
                      className="w-6 h-5 rounded bg-[#f5f5f7] flex items-center justify-center active:opacity-60 disabled:opacity-30">
                      <ArrowUp size={11} className="text-[#6e6e73]" />
                    </button>
                    <button onClick={() => moveSubway(st.id, 1)} disabled={idx === favSubwayList.length - 1}
                      className="w-6 h-5 rounded bg-[#f5f5f7] flex items-center justify-center active:opacity-60 disabled:opacity-30">
                      <ArrowDown size={11} className="text-[#6e6e73]" />
                    </button>
                  </div>
                  <button onClick={() => setSelectedSubway(st)}
                    className="flex-1 flex items-center gap-2.5 min-w-0 text-left active:opacity-70">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: st.lineColor + "22" }}>
                      <Train size={16} style={{ color: st.lineColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[13px] font-bold text-[#1d1d1f] truncate">{st.displayName}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0"
                          style={{ background: st.lineColor }}>{st.line}</span>
                      </div>
                      {st.loadingArrivals ? (
                        <div className="h-3 w-24 bg-[#d2d2d7] rounded animate-pulse mt-1" />
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#6e6e73]">
                          {nextUp && (
                            <span className="truncate">↑ {nextUp.terminalStation} {nextUp.arrivalMin <= 0 ? "곧" : `${nextUp.arrivalMin}분`}</span>
                          )}
                          {nextDown && (
                            <span className="truncate">↓ {nextDown.terminalStation} {nextDown.arrivalMin <= 0 ? "곧" : `${nextDown.arrivalMin}분`}</span>
                          )}
                          {!nextUp && !nextDown && <span>운행 종료</span>}
                        </div>
                      )}
                    </div>
                  </button>
                  <button onClick={() => toggleSubway(st.id)}
                    className="w-6 h-6 rounded-full bg-[#f5f5f7] flex items-center justify-center active:opacity-60 shrink-0">
                    <X size={11} className="text-[#6e6e73]" />
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
                      <p className="text-[18px] font-bold text-[#1d1d1f]">{st.displayName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: st.lineColor }}>{st.line}</span>
                        <span className="text-[11px] text-[#86868b] font-medium">{distLabel(st.distM)}</span>
                      </div>
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
                    <div key={i} className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3.5 py-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                            dir === "상행" ? "bg-[#d2d2d7] text-[#424245]" : "bg-[#e8f1fd] text-[#0071e3]"
                          }`}>{dir}</span>
                          {a.isExpress && (
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              a.trainTypeName === "직통"
                                ? "bg-[#F3E8FF] text-[#7C3AED]"
                                : "bg-[#FFF3E0] text-[#E65100]"
                            }`}>
                              {a.trainTypeName ?? "급행"}
                            </span>
                          )}
                          <p className="text-[16px] font-bold text-[#1d1d1f]">{a.terminalStation} 방면</p>
                        </div>
                        {!isEst && a.currentStation && (
                          <p className="text-[12px] text-[#6e6e73] mt-0.5">현재: {a.currentStation}</p>
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

      {/* 위치 상태 + 섹션 헤더 — 홈 SectionLabel 스타일 */}
      {tab !== "가볼만한곳" && (
        <div className="flex items-end justify-between px-4 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[19px] font-extrabold text-[#1d1d1f]">
              {tab === "버스" ? "주변 정류장" : "주변 지하철역"}
            </span>
            <span className="flex items-center gap-1 text-[12px] text-[#86868b]">
              <MapPin size={11} className="text-[#0071e3]" />가까운 순
            </span>
            <LocBadge />
          </div>
          <button onClick={refresh} className="flex items-center gap-1 active:opacity-60 pb-0.5">
            <RefreshCw size={12} className={`text-[#6e6e73] ${refreshing ? "animate-spin" : ""}`} />
            <span className="text-[11px] text-[#6e6e73]">{lastUpdated || "새로고침"}</span>
          </button>
        </div>
      )}

      {/* ══ 버스 탭 ══════════════════════════════════════════ */}
      {tab === "버스" && (
        <div className="px-4 space-y-3">
          {/* 검색 바 */}
          <div className="bg-white rounded-xl flex items-center gap-2 px-3 h-10 border border-gray-200 shadow-sm">
            <Search size={15} className="text-[#86868b]" />
            <input
              value={busSearch}
              onChange={e => setBusSearch(e.target.value)}
              placeholder="정류장 이름 · 노선 번호 (전체 검단 검색)"
              className="flex-1 text-[14px] outline-none bg-transparent placeholder:text-[#86868b]"
            />
            {busSearch && (
              <button onClick={() => setBusSearch("")} className="text-[#86868b] active:opacity-60">
                <span className="text-[13px]">✕</span>
              </button>
            )}
          </div>

          {/* ── 광역 검색 결과 (입력 시) ── */}
          {busSearch.trim().length >= 2 && (
            <div className="space-y-2">
              {searching && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 flex items-center gap-2">
                  <RefreshCw size={14} className="text-[#0071e3] animate-spin" />
                  <span className="text-[13px] text-[#6e6e73]">검단 전체에서 검색 중...</span>
                </div>
              )}

              {!searching && searchRoutes.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 py-2 bg-[#f5f5f7] border-b border-gray-200">
                    <span className="text-[12px] font-bold text-[#424245]">노선 {searchRoutes.length}개</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {searchRoutes.map(r => (
                      <button key={r.routeId}
                        onClick={() => setSelectedArrival({
                          routeNo: r.routeNo, routeId: r.routeId,
                          destination: r.endStation || "종점",
                          arrivalMin: -1, remainingStops: 0,
                          isLowFloor: false, isExpress: r.routeNo.startsWith("M") || r.routeNo.includes("급행"),
                          isScheduled: true,
                        })}
                        className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#f5f5f7] text-left">
                        <div className="bg-[#0071e3] rounded-lg px-2.5 py-1 min-w-[48px] text-center shrink-0">
                          <span className="text-white text-[14px] font-black">{r.routeNo}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#1d1d1f] truncate">
                            {r.startStation || "기점"} ↔ {r.endStation || "종점"}
                          </p>
                          {r.routeName && r.routeName !== r.routeNo && (
                            <p className="text-[11px] text-[#86868b] truncate">{r.routeName}</p>
                          )}
                        </div>
                        <ChevronRight size={14} className="text-[#86868b] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!searching && searchStations.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 py-2 bg-[#f5f5f7] border-b border-gray-200">
                    <span className="text-[12px] font-bold text-[#424245]">정류장 {searchStations.length}개</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {searchStations.map(s => {
                      const open = searchExpanded === s.stationId;
                      const arrivals = searchStationArrivals[s.stationId];
                      return (
                        <div key={s.stationId}>
                          <button
                            onClick={() => {
                              const next = open ? null : s.stationId;
                              setSearchExpanded(next);
                              if (next) loadSearchStationArrivals(s.stationId);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#f5f5f7] text-left">
                            <div className="w-8 h-8 rounded-lg bg-[#e8f1fd] flex items-center justify-center shrink-0">
                              <Bus size={14} className="text-[#0071e3]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-[#1d1d1f] truncate">{s.stationName}</p>
                              {s.distanceM > 0 && (
                                <p className="text-[11px] text-[#86868b]">검단 중심 기준 {distLabel(s.distanceM)}</p>
                              )}
                            </div>
                            <button onClick={e => { e.stopPropagation(); toggleStop(s.stationId); }}
                              className="p-1 active:opacity-60">
                              <Star size={15} className={favStops.includes(s.stationId) ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#d2d2d7]"} />
                            </button>
                            {open ? <ChevronUp size={14} className="text-[#86868b] shrink-0" /> : <ChevronDown size={14} className="text-[#86868b] shrink-0" />}
                          </button>
                          {open && (
                            <div className="px-4 pb-3 pt-1 space-y-1.5 bg-[#fafafa]">
                              {!arrivals ? (
                                <div className="bg-[#f5f5f7] rounded-lg px-3 py-2.5 text-center">
                                  <span className="text-[12px] text-[#86868b]">도착 정보 조회 중...</span>
                                </div>
                              ) : arrivals.length === 0 ? (
                                <div className="bg-[#f5f5f7] rounded-lg px-3 py-2.5 text-center">
                                  <span className="text-[12px] text-[#86868b]">도착 정보 없음</span>
                                </div>
                              ) : (
                                arrivals.slice(0, 5).map((a, i) => (
                                  <button key={i}
                                    onClick={() => setSelectedArrival(a)}
                                    className="w-full flex items-center gap-2.5 bg-[#f5f5f7] rounded-lg px-3 py-2 active:bg-[#eaeaea]">
                                    <div className="bg-[#0071e3] rounded px-2 py-0.5 min-w-[40px] text-center shrink-0">
                                      <span className="text-white text-[12px] font-black">{a.routeNo}</span>
                                    </div>
                                    <span className="text-[12px] text-[#1d1d1f] truncate flex-1 text-left">{a.destination} 방면</span>
                                    <ArrivalBadge min={a.arrivalMin} live={isLive} />
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!searching && searchStations.length === 0 && searchRoutes.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-8 text-center">
                  <Search size={28} className="mx-auto text-[#D1D5DB] mb-2" />
                  <p className="text-[13px] font-bold text-[#6e6e73]">검색 결과가 없습니다</p>
                  <p className="text-[11px] text-[#86868b] mt-1">정류장 이름이나 노선 번호를 다시 확인해 주세요</p>
                </div>
              )}
            </div>
          )}

          {/* 데이터 소스 상태 배너 */}
          {!loading && stopSource === "fallback" && (
            <div className="bg-[#FFF3E0] rounded-xl px-3.5 py-2.5 flex items-center gap-2">
              <span className="text-[13px]">📍</span>
              <p className="text-[12px] text-[#7C4700] font-medium">주변 정류장을 못 찾았어요 · 검단 주요 정류장 표시 중</p>
            </div>
          )}
          {!loading && stopSource === "osm" && (
            <div className="bg-[#e8f1fd] rounded-xl px-3.5 py-2.5 flex items-center gap-2">
              <span className="text-[13px]">🗺️</span>
              <p className="text-[12px] text-[#0071e3] font-medium">지도 기반 정류장 · 경유 노선만 표시</p>
            </div>
          )}

          {/* 검색 활성 시에는 주변 정류장 목록을 숨겨 중복 표시 방지 */}
          {busSearch.trim().length >= 2 ? null : loading ? (
            <><SkeletonStop /><SkeletonStop /><SkeletonStop /></>
          ) : stopsWithRoutes.length === 0 ? (
            <div className="bg-white rounded-2xl px-4 py-10 text-center">
              <Bus size={32} className="mx-auto text-[#D1D5DB] mb-2" />
              <p className="text-[14px] font-bold text-[#6e6e73]">주변 버스 정류장을 찾을 수 없습니다</p>
              <p className="text-[12px] text-[#86868b] mt-1">위치 권한을 허용하거나 새로고침해 주세요</p>
            </div>
          ) : (
            // 가까운 4개 우선 노출, 나머지는 "더 보기" 토글로
            (showAllStops ? stopsWithRoutes : stopsWithRoutes.slice(0, 4)).map((stop, idx) => {
              const open = expanded === stop.id;
              const displayArrivals = open ? stop.arrivals : stop.arrivals.slice(0, 3);
              return (
                <div key={stop.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  {/* 정류장 헤더 */}
                  <button onClick={() => setExpanded(open ? null : stop.id)}
                    className="w-full flex items-center justify-between px-4 py-4 active:bg-[#f5f5f7]">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-xl bg-[#e8f1fd] flex items-center justify-center">
                          <Bus size={20} className="text-[#0071e3]" />
                        </div>
                        {idx === 0 && (
                          <span className="absolute -top-1 -right-1 text-[9px] font-black bg-[#0071e3] text-white px-1 rounded-full leading-tight py-0.5">
                            최근접
                          </span>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-[16px] font-bold text-[#1d1d1f] leading-tight">{stop.name}</p>
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
                        <Star size={18} className={favStops.includes(stop.id) ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#d2d2d7]"} />
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
                                  {a.isScheduled ? "경유 노선 · 탭하여 전 경로 보기" : a.remainingStops > 0 ? `${a.remainingStops}정류장 전` : "곧 도착 예정"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {!a.isScheduled && (
                                <button onClick={e => { e.stopPropagation(); toggleRoute(routeFavKey(stop.id, a)); }}
                                  className="p-1 active:opacity-60">
                                  <Star size={15} className={favRoutes.includes(routeFavKey(stop.id, a)) ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#D1D5DB]"} />
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

          {/* 더 보기 (가까운 4개 외 추가 정류장) — 검색 중에는 비표시 */}
          {!loading && busSearch.trim().length < 2 && stopsWithRoutes.length > 4 && (
            <button onClick={() => setShowAllStops(s => !s)}
              className="w-full bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3.5 flex items-center justify-center gap-1.5 active:bg-[#f5f5f7]">
              <span className="text-[13px] font-semibold text-[#0071e3]">
                {showAllStops ? "가까운 정류장만 보기" : `더 보기 (${stopsWithRoutes.length - 4}개)`}
              </span>
              {showAllStops
                ? <ChevronUp size={14} className="text-[#0071e3]" />
                : <ChevronDown size={14} className="text-[#0071e3]" />}
            </button>
          )}

          {/* 범례 — 실시간 연동 시에만 의미 있음 */}
          {isLive && busSearch.trim().length < 2 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 flex gap-4">
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
          {/* 검단 2호선 연장 예정 — 즐겨찾기와 일반 역 정보 사이 */}
          {!subwayLoading && (
            <div className="bg-[#e8f1fd] border border-[#bcd9f7] rounded-xl shadow-sm px-4 py-3.5">
              <p className="text-[14px] font-bold text-[#0071e3]">🚇 검단 2호선 연장 예정</p>
              <p className="text-[13px] text-[#0071e3]/80 mt-1">2026년 하반기 착공 · 2030년 개통 목표</p>
            </div>
          )}

          {subwayLoading ? (
            <><SkeletonStop /><SkeletonStop /></>
          ) : subwayList.length === 0 ? (
            <div className="bg-white rounded-2xl px-4 py-10 text-center">
              <Train size={32} className="mx-auto text-[#D1D5DB] mb-2" />
              <p className="text-[14px] font-bold text-[#6e6e73]">역 목록을 불러오는 중입니다</p>
              <button
                onClick={() => loadSubwayData(GEUMDAN_DEFAULT.lat, GEUMDAN_DEFAULT.lng)}
                className="mt-3 text-[12px] font-bold text-[#0071e3] active:opacity-60"
              >
                다시 시도
              </button>
            </div>
          ) : (() => {
            const gimpoStations = subwayList.filter(s => s.groupKey === GIMPO_AIRPORT_GROUP);
            const otherStations = subwayList.filter(s => s.groupKey !== GIMPO_AIRPORT_GROUP);
            return (
              <>
                {gimpoStations.length > 0 && (
                  <GimpoAirportHubCard
                    stations={gimpoStations}
                    favSubways={favSubways}
                    onToggleFav={toggleSubway}
                    onOpenTimetable={(st) => setTimetableStation(st)}
                  />
                )}
                {otherStations.map((st) => {
              const displayArrivals = st.arrivals.length > 0 ? st.arrivals : estimateNextArrivals(st.timetable);
              const isEstimated = st.arrivals.length === 0;
              const upArrivals   = displayArrivals.filter(a => a.direction === "상행").slice(0, 3);
              const downArrivals = displayArrivals.filter(a => a.direction === "하행").slice(0, 3);
              const lineShort = st.line.replace(/호선|철도/g, "").slice(0, 2);
              return (
                <div key={st.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  {/* 역 헤더 — 라인 컬러 배경 */}
                  <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: st.lineColor }}>
                    <button onClick={() => setTimetableStation(st)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 active:opacity-70 text-left">
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
                        <span className="text-[13px] font-black leading-none" style={{ color: st.lineColor }}>{lineShort}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-extrabold text-[18px] leading-tight truncate">{st.displayName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="flex items-center gap-0.5 text-white/85 text-[12px] font-bold">
                            <Navigation size={11} />{distLabel(st.distM)}
                          </span>
                          <span className="text-white/50">·</span>
                          <span className="flex items-center gap-0.5 text-white/85 text-[12px] font-medium">
                            <Clock size={11} />시간표 보기
                          </span>
                        </div>
                      </div>
                    </button>
                    {!st.planned && (
                      <button onClick={() => toggleSubway(st.id)} className="p-1.5 active:opacity-60 shrink-0">
                        <Star size={20}
                          className={favSubways.includes(st.id) ? "text-yellow-300 fill-yellow-300" : "text-white/50"} />
                      </button>
                    )}
                  </div>

                  {/* 도착 정보 헤더 */}
                  <div className="px-4 py-2 flex items-center justify-between border-b border-[#f5f5f7]">
                    <span className="text-[13px] font-bold text-[#1d1d1f]">도착 정보</span>
                    <div className="flex items-center gap-2">
                      {isEstimated && <span className="text-[11px] text-[#86868b]">⏱ 시간표 기준</span>}
                      {st.timetable.intervalMin > 0 && (
                        <span className="text-[11px] text-[#86868b]">배차 {st.timetable.intervalDisplay ?? `${st.timetable.intervalMin}분`}</span>
                      )}
                    </div>
                  </div>

                  {/* 2열 도착 */}
                  {st.loadingArrivals ? (
                    <div className="grid grid-cols-2 gap-2 p-3">
                      {[0,1].map(i => <div key={i} className="h-20 bg-[#f5f5f7] rounded-xl animate-pulse" />)}
                    </div>
                  ) : displayArrivals.length === 0 ? (
                    <p className="px-3 py-4 text-[14px] text-[#6e6e73] text-center">운행 종료</p>
                  ) : (
                    <div className="grid grid-cols-2 divide-x divide-[#f5f5f7]">
                      {[
                        { label: st.timetable.upDirection, arrivals: upArrivals },
                        { label: st.timetable.downDirection, arrivals: downArrivals },
                      ].map(({ label, arrivals: dirArrivals }, col) => (
                        <div key={col} className="px-3 py-3">
                          <div className="flex items-center gap-0.5 mb-2 pb-1.5 border-b border-[#f5f5f7]">
                            <span className="text-[13px] font-bold text-[#1d1d1f] flex-1 truncate">{label} 방면</span>
                            <ChevronRight size={13} className="text-[#86868b] shrink-0" />
                          </div>
                          {dirArrivals.length > 0 ? dirArrivals.map((a, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5">
                              <div className="flex-1 min-w-0 mr-1">
                                <span className="text-[13px] text-[#424245] block truncate font-medium">{a.terminalStation}</span>
                                {!isEstimated && a.currentStation && (
                                  <span className="text-[10px] text-[#86868b]">{a.currentStation} 출발</span>
                                )}
                                {a.isExpress && (
                                  <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                                    a.trainTypeName === "직통"
                                      ? "bg-[#F3E8FF] text-[#7C3AED]"
                                      : "bg-[#FFF3E0] text-[#E65100]"
                                  }`}>
                                    {a.trainTypeName ?? "급행"}
                                  </span>
                                )}
                              </div>
                              <span className={`text-[18px] font-black shrink-0 ${a.arrivalMin <= 1 ? "text-[#F04452]" : "text-[#0071e3]"}`}>
                                {a.arrivalMin <= 1 ? "곧 도착" : `${a.arrivalMin}분`}
                              </span>
                            </div>
                          )) : (
                            <span className="text-[12px] text-[#86868b]">정보 없음</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 첫차/막차 */}
                  {st.timetable.upFirst !== "-" && (
                    <div className="flex gap-2 px-3 pb-3 pt-1 border-t border-[#f5f5f7]">
                      <div className="flex-1 bg-[#f5f5f7] rounded-xl px-3 py-2.5">
                        <p className="text-[11px] text-[#86868b] mb-0.5">{st.timetable.upDirection} 첫/막차</p>
                        <p className="text-[13px] font-bold text-[#1d1d1f]">{st.timetable.upFirst} / {st.timetable.upLast}</p>
                      </div>
                      <div className="flex-1 bg-[#f5f5f7] rounded-xl px-3 py-2.5">
                        <p className="text-[11px] text-[#86868b] mb-0.5">{st.timetable.downDirection} 첫/막차</p>
                        <p className="text-[13px] font-bold text-[#1d1d1f]">{st.timetable.downFirst} / {st.timetable.downLast}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
              </>
            );
          })()}

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
