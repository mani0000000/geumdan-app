"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle, Fuel,
  List, Map as MapIcon,
  MapPin, Navigation, RefreshCw, TrendingDown, X, Zap,
} from "lucide-react";
import type { GasStation } from "@/lib/types";
import { fetchGasStationsWithPrices } from "@/lib/db/gas-stations";

// ── Leaflet 지도 동적 로드 (SSR 비활성화) ─────────────────────
const GasWidgetMap = dynamic(() => import("./GasWidgetMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#f5f5f7]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-[2.5px] border-[#3182F6] border-t-transparent rounded-full animate-spin" />
        <p className="text-[12px] text-[#6e6e73]">지도 불러오는 중...</p>
      </div>
    </div>
  ),
});

// ── 유틸 ─────────────────────────────────────────────────────
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function distLabel(km: number) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km}km`;
}

// ── 태그 ─────────────────────────────────────────────────────
function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ background: color ? `${color}18` : "#f0f0f3", color: color ?? "#86868b" }}
    >
      {children}
    </span>
  );
}

// ── 스켈레톤 ─────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-2 px-4 pb-3">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="h-[64px] bg-[#f5f5f7] rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

// ── 주유소 상세 바텀시트 ──────────────────────────────────────
function StationSheet({
  station, userLat, userLng, rank, onClose,
}: {
  station: GasStation;
  userLat: number | null;
  userLng: number | null;
  rank: number;
  onClose: () => void;
}) {
  const dist = userLat != null && userLng != null
    ? haversineKm(userLat, userLng, station.lat, station.lng)
    : station.distanceKm;
  const hasPrice = station.prices.gasoline != null || station.prices.diesel != null || station.prices.lpg != null;

  return (
    <div className="fixed inset-0" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl"
        style={{ zIndex: 2, boxShadow: "0 -4px 32px rgba(0,0,0,.22)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3">
          <div className="w-10 h-1 bg-[#d2d2d7] rounded-full" />
        </div>

        <div className="px-5 pt-4 pb-2 flex items-start gap-3">
          {/* 브랜드 뱃지 */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-center shrink-0 font-black"
            style={{ background: station.brandBg, color: station.brandColor }}
          >
            <div>
              <div style={{ fontSize: 20 }}>⛽</div>
              <div style={{ fontSize: 10, fontWeight: 900 }}>{station.brandShort}</div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {rank <= 3 && (
                <span className="text-[10px] font-black text-white px-1.5 py-0.5 rounded-full"
                  style={{ background: rank === 1 ? "#DC2626" : rank === 2 ? "#EA580C" : "#D97706" }}>
                  {rank}위
                </span>
              )}
              <h2 className="text-[18px] font-bold text-[#1d1d1f]">{station.name}</h2>
              {station.isAlttul && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669]">알뜰</span>}
              {station.isSelf  && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0058B0]">셀프</span>}
            </div>
            <p className="text-[12px] text-[#86868b] flex items-center gap-1 mt-0.5">
              <MapPin size={10} className="shrink-0" />
              {station.area} · {station.address.replace(/^인천 서구 /, "")}
            </p>
            {dist > 0 && (
              <p className="text-[11px] text-[#86868b] flex items-center gap-1 mt-0.5">
                <Zap size={10} className="shrink-0" />
                {distLabel(dist)} 거리
              </p>
            )}
          </div>
          <button onClick={onClose} className="mt-1 active:opacity-60">
            <X size={20} className="text-[#6e6e73]" />
          </button>
        </div>

        <div className="px-5 pb-7">
          <div className="bg-[#f5f5f7] rounded-2xl p-4">
            {hasPrice ? (
              <div className="space-y-3">
                {station.prices.gasoline != null && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                      <span className="text-[14px] font-semibold text-[#424245]">휘발유</span>
                    </div>
                    <span className="text-[22px] font-black text-[#DC2626] tabular-nums">
                      {won(station.prices.gasoline)}
                    </span>
                  </div>
                )}
                {station.prices.diesel != null && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#3182F6]" />
                      <span className="text-[14px] font-semibold text-[#424245]">경유</span>
                    </div>
                    <span className="text-[19px] font-bold text-[#3182F6] tabular-nums">
                      {won(station.prices.diesel)}
                    </span>
                  </div>
                )}
                {station.prices.lpg != null && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                      <span className="text-[14px] font-semibold text-[#424245]">LPG</span>
                    </div>
                    <span className="text-[19px] font-bold text-[#059669] tabular-nums">
                      {won(station.prices.lpg)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-[#86868b] text-center py-2">가격 정보 없음</p>
            )}
          </div>
          <p className="text-[10px] text-[#aeaeb2] text-center mt-2">
            오피넷 실시간 기준 · 현장 가격과 다를 수 있어요
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
type SortKey = "price" | "distance";
type ViewKey = "list" | "map";

interface WidgetData {
  stations:  GasStation[];
  timestamp: string | null;
  hasPrice:  boolean;
  error:     boolean;
}

export default function GasWidget() {
  const [data,       setData]       = useState<WidgetData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort,       setSort]       = useState<SortKey>("price");
  const [view,       setView]       = useState<ViewKey>("list");
  const [userLat,    setUserLat]    = useState<number | null>(null);
  const [userLng,    setUserLng]    = useState<number | null>(null);
  const [locating,   setLocating]   = useState(false);
  const [selected,   setSelected]   = useState<GasStation | null>(null);
  const [flyTo,      setFlyTo]      = useState<[number, number] | null>(null);
  const [myPos,      setMyPos]      = useState<[number, number] | null>(null);
  const [showAll,    setShowAll]    = useState(false);

  const PAGE = 4; // 초기 표시 개수

  // ── 데이터 로드 (Supabase 직접 — 정적 빌드 호환) ──────────────
  const load = useCallback(async () => {
    try {
      const result = await fetchGasStationsWithPrices();
      setData({ ...result, error: result.stations.length === 0 });
    } catch {
      setData({ stations: [], timestamp: null, hasPrice: false, error: true });
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // ── 위치 취득 ────────────────────────────────────────────
  const locate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLat(p[0]);
        setUserLng(p[1]);
        setMyPos(p);
        setFlyTo(p);
        setSort("distance");
        setShowAll(false);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }, []);

  // ── 정렬 ────────────────────────────────────────────────
  const raw    = data?.stations ?? [];
  const sorted = [...raw].sort((a, b) => {
    if (sort === "price") {
      const ap = a.prices.gasoline ?? Infinity;
      const bp = b.prices.gasoline ?? Infinity;
      return ap !== bp ? ap - bp : a.distanceKm - b.distanceKm;
    }
    if (userLat != null && userLng != null) {
      return haversineKm(userLat, userLng, a.lat, a.lng) - haversineKm(userLat, userLng, b.lat, b.lng);
    }
    return a.distanceKm - b.distanceKm;
  });

  const lowestGasoline = sorted.map(s => s.prices.gasoline).find((p): p is number => p != null);
  const lowestStation  = lowestGasoline != null ? sorted.find(s => s.prices.gasoline === lowestGasoline) : undefined;
  const hasError       = data?.error ?? false;

  function handleSelect(s: GasStation) {
    setSelected(s);
    if (view === "map") setFlyTo([s.lat, s.lng]);
  }

  // ── 렌더 ─────────────────────────────────────────────────
  return (
    <>
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Fuel size={17} className="text-[#FF6B35]" />
          <span className="text-[19px] font-extrabold text-[#1d1d1f]">주유소 가격</span>
          {!loading && <span className="text-[11px] font-medium text-[#86868b]">검단 {sorted.length}개소</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {/* 새로고침 */}
          <button
            onClick={refresh}
            disabled={refreshing || loading}
            className="w-7 h-7 rounded-full bg-[#f5f5f7] flex items-center justify-center active:bg-[#e5e5ea] disabled:opacity-40"
          >
            <RefreshCw size={12} className={`text-[#86868b] ${refreshing ? "animate-spin" : ""}`} />
          </button>
          {/* 지도/목록 토글 */}
          <div className="flex bg-[#f5f5f7] rounded-xl p-0.5 gap-0.5">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1 px-2.5 h-7 rounded-[9px] text-[11px] font-semibold transition-all ${view === "list" ? "bg-white shadow-sm text-[#1d1d1f]" : "text-[#86868b]"}`}
            >
              <List size={12} />목록
            </button>
            <button
              onClick={() => setView("map")}
              className={`flex items-center gap-1 px-2.5 h-7 rounded-[9px] text-[11px] font-semibold transition-all ${view === "map" ? "bg-white shadow-sm text-[#1d1d1f]" : "text-[#86868b]"}`}
            >
              <MapIcon size={12} />지도
            </button>
          </div>
        </div>
      </div>

      {/* ── 지도 뷰 ── */}
      {view === "map" && (
        <div className="px-4 mb-3">
          <div
            className="rounded-2xl overflow-hidden relative"
            style={{ height: 310, border: "1px solid #e5e5ea", boxShadow: "0 2px 12px rgba(0,0,0,.08)" }}
          >
            {loading ? (
              <div className="w-full h-full flex items-center justify-center bg-[#f5f5f7]">
                <div className="w-6 h-6 border-[2.5px] border-[#3182F6] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <GasWidgetMap
                stations={sorted}
                selectedId={selected?.id ?? null}
                onSelect={handleSelect}
                myPos={myPos}
                flyTo={flyTo}
              />
            )}

            {/* 위치 버튼 (지도 위 오버레이) */}
            <button
              onClick={locate}
              disabled={locating}
              style={{
                position: "absolute", bottom: 56, right: 10, zIndex: 1000,
                width: 38, height: 38, background: "white",
                border: myPos ? "2px solid #3182F6" : "1.5px solid #d2d2d7",
                borderRadius: 11, boxShadow: "0 2px 8px rgba(0,0,0,.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: locating ? "wait" : "pointer",
              }}
            >
              {locating ? (
                <div style={{ width: 14, height: 14, border: "2px solid #3182F6", borderTopColor: "transparent", borderRadius: "50%", animation: "gw-spin .8s linear infinite" }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke={myPos ? "#3182F6" : "#6e6e73"} strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" fill={myPos ? "#3182F6" : "none"} />
                  <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
                  <circle cx="12" cy="12" r="7" strokeWidth="1.2" opacity=".35" />
                </svg>
              )}
            </button>
          </div>
          <style>{`@keyframes gw-spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ── 정렬 컨트롤 (목록 뷰에서 표시) ── */}
      {view === "list" && !loading && !hasError && (
        <div className="flex items-center gap-1.5 px-4 mb-3">
          <button
            onClick={locate}
            disabled={locating}
            className={`h-7 px-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              sort === "distance" && userLat != null ? "bg-[#3182F6] text-white" : "bg-[#f5f5f7] text-[#636366]"
            } disabled:opacity-40`}
          >
            {locating ? <RefreshCw size={10} className="animate-spin" /> : <Navigation size={10} />}
            거리순
          </button>
          <button
            onClick={() => { setSort("price"); setShowAll(false); }}
            className={`h-7 px-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              sort === "price" ? "bg-[#DC2626] text-white" : "bg-[#f5f5f7] text-[#636366]"
            }`}
          >
            <TrendingDown size={10} />
            최저가순
          </button>
        </div>
      )}

      {/* ── 최저가 배너 ── */}
      {!loading && !hasError && lowestStation && (view === "list") && (
        <div className="mx-4 mb-3 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FEF2F2] to-[#FFF5F5] border border-[#FECACA] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#DC2626] flex items-center justify-center shrink-0">
            <TrendingDown size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-[#DC2626]">검단 휘발유 최저가</p>
            <p className="text-[13px] font-extrabold text-[#1d1d1f] truncate">
              {won(lowestGasoline!)} · {lowestStation.name}
              <span className="ml-1 text-[11px] font-medium text-[#86868b]">{lowestStation.area}</span>
            </p>
          </div>
          {lowestStation.isAlttul && <Tag color="#059669">알뜰</Tag>}
        </div>
      )}

      {/* ── 본문 ── */}
      <section className="px-4 space-y-1.5 mb-3">
        {loading ? (
          <Skeleton />
        ) : hasError ? (
          <div className="p-3 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-[#DC2626] mt-0.5 shrink-0" />
            <div className="text-[12px]">
              <p className="font-bold text-[#991B1B]">가격 정보를 불러오지 못했습니다</p>
              <p className="text-[#991B1B]">잠시 후 새로고침해 주세요.</p>
            </div>
          </div>
        ) : (
          /* ── 주유소 목록 (처음 4개 + 더보기) ── */
          <>
            {(showAll ? sorted : sorted.slice(0, PAGE)).map((s, idx) => {
              const isLowest  = lowestGasoline != null && s.prices.gasoline === lowestGasoline;
              const isSelected = selected?.id === s.id;
              const dist = userLat != null && userLng != null
                ? haversineKm(userLat, userLng, s.lat, s.lng)
                : s.distanceKm;
              const dText = dist > 0 ? distLabel(dist) : null;
              const hasPrice = s.prices.gasoline != null || s.prices.diesel != null;

              return (
                <button
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                    isSelected ? "border-[#3182F6] bg-[#EFF6FF]" :
                    isLowest   ? "bg-[#FFF5F5] border-[#FECACA]" :
                                 "bg-white border-[#f0f0f3]"
                  }`}
                >
                  {/* 순위 */}
                  <div className="w-5 text-center shrink-0">
                    <span className={`text-[12px] font-black ${
                      idx === 0 ? "text-[#DC2626]" : idx === 1 ? "text-[#EA580C]" : idx === 2 ? "text-[#D97706]" : "text-[#d2d2d7]"
                    }`}>{idx + 1}</span>
                  </div>

                  {/* 브랜드 뱃지 */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-black leading-tight text-center"
                    style={{ background: s.brandBg, color: s.brandColor }}
                  >
                    <div>
                      <div style={{ fontSize: 13 }}>⛽</div>
                      <div>{s.brandShort}</div>
                    </div>
                  </div>

                  {/* 이름 + 지역 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[13px] font-bold truncate ${isLowest ? "text-[#DC2626]" : "text-[#1d1d1f]"}`}>
                        {s.name}
                      </span>
                      {s.isAlttul && <Tag color="#059669">알뜰</Tag>}
                      {s.isSelf   && <Tag color="#3182F6">셀프</Tag>}
                    </div>
                    <p className="text-[10px] text-[#86868b] mt-0.5 flex items-center gap-0.5 truncate">
                      <MapPin size={8} className="shrink-0" />
                      {s.area}
                      {dText && <> · <Zap size={8} className="shrink-0" />{dText}</>}
                    </p>
                  </div>

                  {/* 가격 */}
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {hasPrice ? (
                      <>
                        {s.prices.gasoline != null && (
                          <span className={`text-[13px] font-black tabular-nums ${isLowest ? "text-[#DC2626]" : "text-[#1d1d1f]"}`}>
                            {won(s.prices.gasoline)}
                          </span>
                        )}
                        {s.prices.diesel != null && (
                          <span className="text-[10px] text-[#86868b] tabular-nums">
                            경유 {won(s.prices.diesel)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-[#c7c7cc]">가격 없음</span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* ── 더보기 버튼 ── */}
            {!showAll && sorted.length > PAGE && (
              <button
                onClick={() => setShowAll(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-dashed border-[#d2d2d7] bg-[#fafafa] text-[12px] font-semibold text-[#86868b] active:bg-[#f0f0f3] transition-colors"
              >
                <span>나머지 {sorted.length - PAGE}개 주유소 더보기</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            )}
          </>
        )}
      </section>

      {/* ── 업데이트 시각 ── */}
      {data?.timestamp && !loading && data.hasPrice && (
        <p className="px-4 pb-3 text-[10px] text-[#c7c7cc]">
          오피넷 기준 · {new Date(data.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 업데이트
        </p>
      )}

      {/* ── 주유소 상세 바텀시트 ── */}
      {selected && (
        <StationSheet
          station={selected}
          userLat={userLat}
          userLng={userLng}
          rank={sorted.findIndex(s => s.id === selected.id) + 1}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
