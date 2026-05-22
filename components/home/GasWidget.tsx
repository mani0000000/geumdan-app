"use client";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, ChevronDown, ChevronUp, Fuel, Info,
  MapPin, Navigation, RefreshCw, TrendingDown, Zap,
} from "lucide-react";
import type { GasApiResponse, GasStation } from "@/lib/types";

// ── 유틸 ─────────────────────────────────────────────────────────────────
const won = (n: number) =>
  n.toLocaleString("ko-KR") + "원";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

// ── 브랜드 뱃지 ────────────────────────────────────────────────────────────
function BrandBadge({ s }: { s: GasStation }) {
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black leading-none"
      style={{ background: s.brandBg, color: s.brandColor }}
    >
      {s.brandShort}
    </div>
  );
}

// ── 가격 칩 ────────────────────────────────────────────────────────────────
function PriceChip({
  label, value, highlight, dimmed,
}: {
  label: string; value?: number; highlight?: boolean; dimmed?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <span
        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
          highlight
            ? "bg-[#FEE2E2] text-[#DC2626]"
            : dimmed
            ? "bg-[#f5f5f7] text-[#aeaeb2]"
            : "bg-[#f5f5f7] text-[#86868b]"
        }`}
      >
        {label}
      </span>
      {value != null ? (
        <span
          className={`text-[13px] font-bold tabular-nums ${
            highlight ? "text-[#DC2626]" : dimmed ? "text-[#c7c7cc]" : "text-[#1d1d1f]"
          }`}
        >
          {won(value)}
        </span>
      ) : (
        <span className="text-[12px] text-[#c7c7cc]">—</span>
      )}
    </div>
  );
}

// ── 태그 뱃지 ─────────────────────────────────────────────────────────────
function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full"
      style={{
        background: color ? `${color}18` : "#f0f0f3",
        color: color ?? "#86868b",
      }}
    >
      {children}
    </span>
  );
}

// ── 스켈레톤 ─────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-2 px-4">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="h-[68px] bg-[#f5f5f7] rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
type SortKey = "price" | "distance";

export default function GasWidget() {
  const [data, setData]           = useState<GasApiResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort]           = useState<SortKey>("price");
  const [userLat, setUserLat]     = useState<number | null>(null);
  const [userLng, setUserLng]     = useState<number | null>(null);
  const [locating, setLocating]   = useState(false);
  const [expanded, setExpanded]   = useState(false);

  // 위치 취득
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

  const load = useCallback(async (bust = false) => {
    try {
      const res = await fetch(bust ? `/api/gas?t=${Date.now()}` : "/api/gas", {
        cache: bust ? "no-store" : "default",
      });
      const json = (await res.json()) as GasApiResponse;
      setData(json);
    } catch {
      setData({ stations: [], source: "error", timestamp: new Date().toISOString(), success: false, error: "network" });
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }

  const raw = data?.stations ?? [];

  // ── 정렬 ───────────────────────────────────────────────────────────────
  const sorted = [...raw].sort((a, b) => {
    if (sort === "price") {
      const ap = a.prices.gasoline ?? Infinity;
      const bp = b.prices.gasoline ?? Infinity;
      return ap !== bp ? ap - bp : a.distanceKm - b.distanceKm;
    }
    // distance
    if (userLat != null && userLng != null) {
      const ad = haversineKm(userLat, userLng, a.lat, a.lng);
      const bd = haversineKm(userLat, userLng, b.lat, b.lng);
      return ad - bd;
    }
    return a.distanceKm - b.distanceKm;
  });

  const displayed = expanded ? sorted : sorted.slice(0, 5);

  // 최저가 주유소
  const lowestGasoline = sorted
    .map(s => s.prices.gasoline)
    .filter((n): n is number => n != null)
    .at(0);
  const lowestStation = lowestGasoline != null
    ? sorted.find(s => s.prices.gasoline === lowestGasoline)
    : undefined;

  const source = data?.source;

  return (
    <>
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Fuel size={17} className="text-[#FF6B35]" />
          <span className="text-[19px] font-extrabold text-[#1d1d1f]">주유소 가격</span>
          <span className="text-[11px] font-medium text-[#86868b]">검단 전체</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* 위치 버튼 */}
          <button
            onClick={locate}
            disabled={locating || loading}
            className={`h-7 px-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              sort === "distance" && userLat != null
                ? "bg-[#0071e3] text-white"
                : "bg-[#f5f5f7] text-[#636366]"
            } disabled:opacity-40`}
            title="내 위치 기준 거리순"
          >
            {locating ? (
              <RefreshCw size={11} className="animate-spin" />
            ) : (
              <Navigation size={11} />
            )}
            거리순
          </button>
          {/* 가격순 버튼 */}
          <button
            onClick={() => setSort("price")}
            className={`h-7 px-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              sort === "price"
                ? "bg-[#DC2626] text-white"
                : "bg-[#f5f5f7] text-[#636366]"
            }`}
          >
            <TrendingDown size={11} />
            최저가순
          </button>
          {/* 새로고침 */}
          <button
            onClick={refresh}
            disabled={refreshing || loading}
            className="w-7 h-7 rounded-full bg-[#f5f5f7] flex items-center justify-center active:bg-[#e5e5ea] disabled:opacity-40"
          >
            <RefreshCw size={12} className={`text-[#86868b] ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 최저가 배너 ── */}
      {!loading && lowestStation && (
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
          {lowestStation.isAlttul && (
            <Tag color="#059669">알뜰</Tag>
          )}
        </div>
      )}

      {/* ── 본문 ── */}
      <section className="px-4 space-y-2 mb-3">
        {loading ? (
          <Skeleton />
        ) : source === "error" ? (
          <div className="p-3 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-[#DC2626] mt-0.5 shrink-0" />
            <div className="text-[12px]">
              <p className="font-bold text-[#991B1B]">오피넷 API 호출 실패</p>
              <p className="text-[#991B1B]">잠시 후 새로고침해 주세요.{data?.error ? ` (${data.error})` : ""}</p>
            </div>
          </div>
        ) : source === "no_key" ? (
          <div className="p-3 rounded-2xl bg-[#FFF8E1] border border-[#FFE082] flex items-start gap-2.5">
            <Info size={15} className="text-[#B45309] mt-0.5 shrink-0" />
            <div className="text-[12px]">
              <p className="font-bold text-[#92400E]">오피넷 API 키 미등록</p>
              <p className="text-[#92400E]">환경변수 <code className="font-mono bg-white/70 px-1 rounded">OPINET_API_KEY</code> 를 설정해야 가격이 표시됩니다.</p>
            </div>
          </div>
        ) : (
          <>
            {displayed.map((s, idx) => {
              const isLowest = lowestGasoline != null && s.prices.gasoline === lowestGasoline;
              const distDisplay = (() => {
                if (userLat != null && userLng != null) {
                  return `${haversineKm(userLat, userLng, s.lat, s.lng)}km`;
                }
                return s.distanceKm > 0 ? `${s.distanceKm}km` : null;
              })();
              const hasPrice = s.prices.gasoline != null || s.prices.diesel != null;

              return (
                <article
                  key={s.id}
                  className={`flex items-center gap-3 px-3 py-3 rounded-2xl border transition-all ${
                    isLowest
                      ? "bg-[#FFF5F5] border-[#FECACA]"
                      : "bg-white border-[#f0f0f3]"
                  }`}
                >
                  {/* 순위 */}
                  <div className="w-5 text-center shrink-0">
                    {sort === "price" && hasPrice ? (
                      <span className={`text-[12px] font-black ${idx === 0 ? "text-[#DC2626]" : idx === 1 ? "text-[#EA580C]" : "text-[#aeaeb2]"}`}>
                        {idx + 1}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#c7c7cc]">{idx + 1}</span>
                    )}
                  </div>

                  {/* 브랜드 */}
                  <BrandBadge s={s} />

                  {/* 이름 + 지역 + 태그 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[13px] font-bold truncate ${isLowest ? "text-[#DC2626]" : "text-[#1d1d1f]"}`}>
                        {s.name}
                      </span>
                      {s.isAlttul && <Tag color="#059669">알뜰</Tag>}
                      {s.isSelf && <Tag color="#0071e3">셀프</Tag>}
                    </div>
                    <p className="text-[11px] text-[#86868b] mt-0.5 flex items-center gap-1">
                      <MapPin size={9} className="shrink-0" />
                      {s.area} · {s.address.replace(/^인천 서구 /, "")}
                    </p>
                  </div>

                  {/* 가격 + 거리 */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {hasPrice ? (
                      <>
                        <PriceChip label="휘발유" value={s.prices.gasoline} highlight={isLowest} />
                        {s.prices.diesel != null && (
                          <PriceChip label="경유" value={s.prices.diesel} dimmed />
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-[#c7c7cc]">가격 없음</span>
                    )}
                    {distDisplay && (
                      <span className="text-[10px] font-semibold text-[#86868b] flex items-center gap-0.5">
                        <Zap size={9} />
                        {distDisplay}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}

            {/* 더보기 / 접기 */}
            {sorted.length > 5 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border border-dashed border-[#d2d2d7] text-[12px] font-semibold text-[#0071e3] bg-white/60 active:bg-white"
              >
                {expanded ? (
                  <>
                    <ChevronUp size={14} />
                    접기
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    나머지 {sorted.length - 5}개 더보기
                  </>
                )}
              </button>
            )}
          </>
        )}
      </section>

      {/* ── 업데이트 시각 ── */}
      {data?.timestamp && !loading && (
        <p className="px-4 pb-1 text-[10px] text-[#c7c7cc]">
          오피넷 기준 · {new Date(data.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 업데이트
        </p>
      )}
    </>
  );
}
