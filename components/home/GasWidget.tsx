"use client";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, Fuel, MapPin, RefreshCw, TrendingDown } from "lucide-react";
import type { GasStation } from "@/app/api/gas/route";

interface ApiResponse {
  stations: GasStation[];
  source: "opinet" | "sample";
  timestamp: string;
  success: boolean;
}

const won = (n: number) => n.toLocaleString("ko-KR");

function BrandBadge({ s }: { s: GasStation }) {
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: s.brandBg }}
    >
      <span className="text-[12px] font-black" style={{ color: s.brandColor }}>
        {s.brandShort}
      </span>
    </div>
  );
}

function PriceRow({
  label, value, lowest,
}: { label: string; value?: number; lowest?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[12px]">
      <span className="text-[#86868b]">{label}</span>
      {value != null ? (
        <span
          className={`font-bold tabular-nums ${
            lowest ? "text-[#F04452]" : "text-[#1d1d1f]"
          }`}
        >
          {won(value)}원
        </span>
      ) : (
        <span className="text-[#c7c7cc]">—</span>
      )}
    </div>
  );
}

export default function GasWidget() {
  const [stations, setStations] = useState<GasStation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (bust = false) => {
    try {
      const res = await fetch(bust ? `/api/gas?t=${Date.now()}` : "/api/gas", {
        cache: bust ? "no-store" : "default",
      });
      const data = (await res.json()) as ApiResponse;
      setStations(data.stations ?? []);
    } catch {
      setStations([]);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }

  // 휘발유 최저가 (있는 것만 비교)
  const lowestGasoline = stations
    ?.map(s => s.prices.gasoline)
    .filter((n): n is number => n != null)
    .reduce<number | undefined>((m, n) => (m == null || n < m ? n : m), undefined);

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[19px] font-extrabold text-[#1d1d1f]">주유소 가격</span>
          <Fuel size={15} className="text-[#0071e3]" />
        </div>
        <button
          onClick={refresh}
          disabled={refreshing || loading}
          className="w-8 h-8 rounded-lg bg-white border border-[#e5e5ea] flex items-center justify-center active:bg-[#f5f5f7] disabled:opacity-40"
          aria-label="새로고침"
        >
          <RefreshCw
            size={14}
            className={`text-[#0071e3] ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      <section className="mb-1">
        {loading ? (
          <div className="overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-3" style={{ width: "max-content" }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="shrink-0 w-[210px] h-[150px] bg-white rounded-2xl animate-pulse border border-[#f0f0f3]"
                />
              ))}
            </div>
          </div>
        ) : !stations || stations.length === 0 ? (
          <p className="px-4 text-[#86868b] text-[13px]">주유소 가격 정보를 불러오지 못했어요.</p>
        ) : (
          <div className="overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-3" style={{ width: "max-content" }}>
              {stations.slice(0, 5).map(s => {
                const isLowest =
                  lowestGasoline != null &&
                  s.prices.gasoline != null &&
                  s.prices.gasoline === lowestGasoline;
                return (
                  <article
                    key={s.id}
                    className={`shrink-0 w-[210px] bg-white rounded-2xl overflow-hidden border ${
                      isLowest ? "border-[#F04452]" : "border-[#f0f0f3]"
                    } shadow-sm`}
                  >
                    {isLowest && (
                      <div className="flex items-center gap-1 bg-[#F04452] px-3 py-1">
                        <TrendingDown size={11} className="text-white" />
                        <span className="text-[10px] font-black text-white tracking-tight">
                          휘발유 최저가
                        </span>
                      </div>
                    )}
                    <div className="px-3 pt-3 pb-2 flex items-start gap-2.5">
                      <BrandBadge s={s} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-[#1d1d1f] truncate">
                          {s.name}
                        </p>
                        <p className="text-[11px] text-[#86868b] mt-0.5 truncate">
                          {s.brandName}
                        </p>
                      </div>
                    </div>
                    <div className="px-3 pb-2 space-y-0.5">
                      <PriceRow label="휘발유" value={s.prices.gasoline} lowest={isLowest} />
                      <PriceRow label="경유"   value={s.prices.diesel} />
                      {s.prices.lpg != null && (
                        <PriceRow label="LPG"  value={s.prices.lpg} />
                      )}
                    </div>
                    <div className="px-3 pb-3 pt-1.5 border-t border-[#f5f5f7] flex items-center gap-1">
                      <MapPin size={10} className="text-[#86868b] shrink-0" />
                      <span className="text-[11px] text-[#86868b] truncate flex-1">
                        {s.address || "주소 정보 없음"}
                      </span>
                      <span className="text-[11px] font-semibold text-[#0071e3] shrink-0">
                        {s.distanceKm > 0 ? `${s.distanceKm}km` : "—"}
                      </span>
                    </div>
                  </article>
                );
              })}
              <a
                href="https://www.opinet.co.kr/searRgSelect.do"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 w-[110px] bg-white/60 rounded-2xl border border-dashed border-[#d2d2d7] flex flex-col items-center justify-center gap-1.5 active:bg-white/80"
              >
                <ChevronRight size={18} className="text-[#0071e3]" />
                <span className="text-[12px] font-semibold text-[#0071e3]">전체보기</span>
                <span className="text-[10px] text-[#86868b]">오피넷</span>
              </a>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
