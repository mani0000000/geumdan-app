"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Fuel, List, Map as MapIcon,
  MapPin, Navigation, RefreshCw, TrendingDown, X, Zap,
} from "lucide-react";
import type { GasApiResponse, GasStation } from "@/lib/types";
import Header from "@/components/layout/Header";

// ── SSR 비활성화 동적 임포트 ──────────────────────────────────
const GasMapView = dynamic(() => import("./GasMapView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#f5f5f7]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-[#3182F6] border-t-transparent rounded-full animate-spin" />
        <p className="text-[13px] text-[#6e6e73]">지도 불러오는 중...</p>
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
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function distText(km: number) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km}km`;
}

// ── 주유소 상세 바텀시트 ──────────────────────────────────────
function StationSheet({
  station, userLat, userLng, onClose,
}: {
  station: GasStation;
  userLat: number | null;
  userLng: number | null;
  onClose: () => void;
}) {
  const dist = userLat != null && userLng != null
    ? haversineKm(userLat, userLng, station.lat, station.lng)
    : station.distanceKm;

  const hasPrice = station.prices.gasoline != null || station.prices.diesel != null || station.prices.lpg != null;

  return (
    <div className="fixed inset-0" style={{ zIndex: 300 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl"
        style={{ zIndex: 2, boxShadow: "0 -4px 32px rgba(0,0,0,.22)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 bg-[#d2d2d7] rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="px-5 pt-4 pb-2 flex items-start gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-[12px] font-black shrink-0 text-center leading-tight"
            style={{ background: station.brandBg, color: station.brandColor }}
          >
            <div>
              <div style={{ fontSize: 20 }}>⛽</div>
              <div style={{ fontSize: 10, fontWeight: 900 }}>{station.brandShort}</div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-[19px] font-bold text-[#1d1d1f]">{station.name}</h2>
              {station.isAlttul && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669]">알뜰</span>
              )}
              {station.isSelf && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0058B0]">셀프</span>
              )}
            </div>
            <p className="text-[12px] text-[#86868b] flex items-center gap-1 mt-0.5">
              <MapPin size={10} className="shrink-0" />
              {station.area} · {station.address.replace(/^인천 서구 /, "")}
            </p>
            {dist > 0 && (
              <p className="text-[11px] text-[#86868b] flex items-center gap-1 mt-0.5">
                <Zap size={10} className="shrink-0" />
                {distText(dist)} 거리
              </p>
            )}
          </div>
          <button onClick={onClose} className="mt-1 active:opacity-60 shrink-0">
            <X size={20} className="text-[#6e6e73]" />
          </button>
        </div>

        {/* 가격 */}
        <div className="px-5 pb-6">
          <div className="bg-[#f5f5f7] rounded-2xl p-4">
            {hasPrice ? (
              <div className="space-y-3">
                {station.prices.gasoline != null && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                      <span className="text-[14px] font-semibold text-[#424245]">휘발유</span>
                    </div>
                    <span className="text-[22px] font-black text-[#DC2626] tabular-nums">{won(station.prices.gasoline)}</span>
                  </div>
                )}
                {station.prices.diesel != null && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#3182F6]" />
                      <span className="text-[14px] font-semibold text-[#424245]">경유</span>
                    </div>
                    <span className="text-[19px] font-bold text-[#3182F6] tabular-nums">{won(station.prices.diesel)}</span>
                  </div>
                )}
                {station.prices.lpg != null && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                      <span className="text-[14px] font-semibold text-[#424245]">LPG</span>
                    </div>
                    <span className="text-[19px] font-bold text-[#059669] tabular-nums">{won(station.prices.lpg)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 py-3">
                <span className="text-3xl">📊</span>
                <p className="text-[13px] text-[#86868b]">가격 정보를 불러오지 못했습니다</p>
                <p className="text-[11px] text-[#aeaeb2]">오피넷 조회 실패 또는 미등록 주유소</p>
              </div>
            )}
          </div>

          <p className="text-[10px] text-[#aeaeb2] text-center mt-2">
            오피넷 실시간 가격 기준 · 가격은 달라질 수 있어요
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 정렬 타입 ─────────────────────────────────────────────────
type SortKey = "price" | "distance";

// ── 메인 페이지 클라이언트 ────────────────────────────────────
export default function GasPageClient() {
  const router = useRouter();

  const [data,       setData]       = useState<GasApiResponse | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState<"map" | "list">("map");
  const [sort,       setSort]       = useState<SortKey>("price");
  const [userLat,    setUserLat]    = useState<number | null>(null);
  const [userLng,    setUserLng]    = useState<number | null>(null);
  const [locating,   setLocating]   = useState(false);
  const [selected,   setSelected]   = useState<GasStation | null>(null);
  const [flyTo,      setFlyTo]      = useState<GasStation | null>(null);

  // ── 데이터 로드 ───────────────────────────────────────────
  const load = useCallback(async (bust = false) => {
    try {
      const res  = await fetch(bust ? `/api/gas?t=${Date.now()}` : "/api/gas", {
        cache: bust ? "no-store" : "default",
      });
      const json = await res.json() as GasApiResponse;
      setData(json);
    } catch {
      setData({ stations: [], source: "error", timestamp: new Date().toISOString(), success: false });
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  // ── 위치 ──────────────────────────────────────────────────
  const locate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setSort("distance");
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }, []);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }

  // ── 정렬 ──────────────────────────────────────────────────
  const stations = data?.stations ?? [];

  const sorted = [...stations].sort((a, b) => {
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

  function handleSelect(s: GasStation) {
    setSelected(s);
    setFlyTo(s);
    if (tab === "list") setTab("map");
  }

  // ── 렌더 ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col">
      <Header />

      {/* ── 서브 헤더 ── */}
      <div className="bg-white border-b border-[#f0f0f3] px-4 py-3 flex items-center gap-2 sticky top-[56px] z-30">
        <button onClick={() => router.back()} className="mr-1 active:opacity-60">
          <ArrowLeft size={22} className="text-[#1d1d1f]" />
        </button>
        <Fuel size={16} className="text-[#FF6B35] shrink-0" />
        <span className="text-[17px] font-bold text-[#1d1d1f] flex-1">주유소 정보</span>
        {!loading && <span className="text-[12px] text-[#86868b]">검단 {stations.length}개소</span>}

        {/* 새로고침 */}
        <button
          onClick={refresh}
          disabled={refreshing || loading}
          className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center active:bg-[#e5e5ea] disabled:opacity-40"
        >
          <RefreshCw size={14} className={`text-[#86868b] ${refreshing ? "animate-spin" : ""}`} />
        </button>

        {/* 탭 토글 */}
        <div className="flex bg-[#f5f5f7] rounded-xl p-0.5 gap-0.5">
          <button onClick={() => setTab("map")}
            className={`flex items-center gap-1 px-3 h-8 rounded-[10px] text-[12px] font-semibold transition-all ${tab === "map" ? "bg-white shadow-sm text-[#1d1d1f]" : "text-[#86868b]"}`}>
            <MapIcon size={13} />지도
          </button>
          <button onClick={() => setTab("list")}
            className={`flex items-center gap-1 px-3 h-8 rounded-[10px] text-[12px] font-semibold transition-all ${tab === "list" ? "bg-white shadow-sm text-[#1d1d1f]" : "text-[#86868b]"}`}>
            <List size={13} />목록
          </button>
        </div>
      </div>

      {tab === "map" ? (
        /* ── 지도 탭 ── */
        <div className="flex-1 relative" style={{ height: "calc(100dvh - 116px)" }}>
          {loading ? (
            <div className="flex items-center justify-center h-full bg-[#f5f5f7]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-[3px] border-[#3182F6] border-t-transparent rounded-full animate-spin" />
                <p className="text-[13px] text-[#6e6e73]">주유소 정보 불러오는 중...</p>
              </div>
            </div>
          ) : (
            <GasMapView
              stations={sorted}
              selectedId={selected?.id ?? null}
              onSelect={s => { setSelected(s); setFlyTo(s); }}
              flyToStation={flyTo}
            />
          )}

          {/* 최저가 배너 (지도 위) */}
          {!loading && lowestGasoline != null && (
            <div
              className="absolute top-3 left-3 right-16 z-[500] bg-white/95 backdrop-blur-sm rounded-2xl px-3 py-2.5 flex items-center gap-2.5"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,.15)" }}
            >
              <div className="w-6 h-6 rounded-lg bg-[#DC2626] flex items-center justify-center shrink-0">
                <TrendingDown size={13} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-[#DC2626]">검단 최저가 (휘발유)</p>
                <p className="text-[13px] font-black text-[#1d1d1f] truncate">
                  {won(lowestGasoline)}
                  <span className="text-[11px] font-medium text-[#86868b] ml-1">
                    {sorted.find(s => s.prices.gasoline === lowestGasoline)?.name}
                  </span>
                </p>
              </div>
            </div>
          )}

          {selected && (
            <StationSheet
              station={selected}
              userLat={userLat}
              userLng={userLng}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      ) : (
        /* ── 목록 탭 ── */
        <div className="flex-1 overflow-y-auto pb-24">
          {/* 정렬 컨트롤 */}
          <div className="bg-white px-4 py-2.5 flex items-center gap-2 border-b border-[#f0f0f3] sticky top-0 z-10">
            <button onClick={locate} disabled={locating}
              className={`h-8 px-3 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-colors ${sort === "distance" && userLat != null ? "bg-[#3182F6] text-white" : "bg-[#f5f5f7] text-[#636366]"} disabled:opacity-40`}>
              {locating ? <RefreshCw size={11} className="animate-spin" /> : <Navigation size={11} />}
              거리순
            </button>
            <button onClick={() => setSort("price")}
              className={`h-8 px-3 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-colors ${sort === "price" ? "bg-[#DC2626] text-white" : "bg-[#f5f5f7] text-[#636366]"}`}>
              <TrendingDown size={11} />
              최저가순
            </button>
            {lowestGasoline != null && (
              <div className="flex-1 text-right">
                <span className="text-[11px] font-bold text-[#DC2626]">최저 {won(lowestGasoline)}</span>
              </div>
            )}
          </div>

          {/* 목록 */}
          {loading ? (
            <div className="space-y-2 px-4 pt-4">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="h-[76px] bg-white rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="px-4 pt-3 space-y-2">
              {sorted.map((s, idx) => {
                const isLowest = lowestGasoline != null && s.prices.gasoline === lowestGasoline;
                const dist = userLat != null && userLng != null
                  ? haversineKm(userLat, userLng, s.lat, s.lng)
                  : s.distanceKm;
                const dText = dist > 0 ? distText(dist) : null;

                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelect(s)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3.5 rounded-2xl border text-left transition-all active:scale-[0.99] ${
                      isLowest ? "bg-[#FFF5F5] border-[#FECACA]" : "bg-white border-[#f0f0f3]"
                    }`}
                  >
                    {/* 순위 */}
                    <div className="w-6 text-center shrink-0">
                      {idx === 0 ? (
                        <span className="text-[18px] leading-none">🥇</span>
                      ) : idx === 1 ? (
                        <span className="text-[18px] leading-none">🥈</span>
                      ) : idx === 2 ? (
                        <span className="text-[18px] leading-none">🥉</span>
                      ) : (
                        <span className="text-[12px] font-black text-[#aeaeb2]">{idx + 1}</span>
                      )}
                    </div>

                    {/* 브랜드 */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 text-center leading-tight"
                      style={{ background: s.brandBg, color: s.brandColor }}
                    >
                      <div>
                        <div style={{ fontSize: 14 }}>⛽</div>
                        <div>{s.brandShort}</div>
                      </div>
                    </div>

                    {/* 이름 + 위치 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[14px] font-bold ${isLowest ? "text-[#DC2626]" : "text-[#1d1d1f]"}`}>
                          {s.name}
                        </span>
                        {s.isAlttul && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669]">알뜰</span>}
                        {s.isSelf  && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0058B0]">셀프</span>}
                      </div>
                      <p className="text-[11px] text-[#86868b] mt-0.5 flex items-center gap-0.5 truncate">
                        <MapPin size={9} className="shrink-0" />
                        {s.area} · {s.address.replace(/^인천 서구 /, "")}
                      </p>
                    </div>

                    {/* 가격 + 거리 */}
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      {s.prices.gasoline != null ? (
                        <span className={`text-[15px] font-black tabular-nums ${isLowest ? "text-[#DC2626]" : "text-[#1d1d1f]"}`}>
                          {won(s.prices.gasoline)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#c7c7cc]">가격 없음</span>
                      )}
                      {s.prices.diesel != null && (
                        <span className="text-[10px] text-[#86868b] tabular-nums">경유 {won(s.prices.diesel)}</span>
                      )}
                      {dText && (
                        <span className="text-[10px] text-[#86868b] flex items-center gap-0.5">
                          <Zap size={9} />{dText}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 업데이트 시각 */}
          {data?.timestamp && !loading && (
            <p className="px-4 pt-3 pb-2 text-[10px] text-[#c7c7cc] text-center">
              오피넷 기준 · {new Date(data.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 업데이트
            </p>
          )}
        </div>
      )}

    </div>
  );
}
