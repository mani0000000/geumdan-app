"use client";
import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, MapPin, Fuel, X } from "lucide-react";

interface SyncResult {
  id: number; name: string; status: string;
  opinet_name?: string; score?: number;
  lat_before?: number; lng_before?: number;
  lat_after?: number; lng_after?: number;
  prices?: { gasoline?: number; diesel?: number; lpg?: number };
}

interface SyncSummary {
  total: number; opinet_stations: number;
  matched: number; unmatched: number;
  coord_updated: number; errors: number;
  timestamp: string;
}

interface SyncResponse {
  success: boolean;
  summary: SyncSummary;
  results: SyncResult[];
  error?: string;
}

interface DbStation {
  id: number; name: string; brand_code: string; area: string;
  address: string; lat: number; lng: number;
  opinet_id: string | null;
  price_gasoline: number | null;
  price_diesel: number | null;
  price_lpg: number | null;
  price_updated_at: string | null;
}

const BRAND_SHORT: Record<string, string> = {
  SKE: "SK", GSC: "GS", HDO: "현대", SOL: "S-OIL",
  RTO: "알뜰", RTX: "알뜰", NHO: "NH", ETC: "일반",
};
const BRAND_COLOR: Record<string, string> = {
  SKE: "#EF4444", GSC: "#0058B0", HDO: "#16A34A", SOL: "#F59E0B",
  RTO: "#6366F1", RTX: "#6366F1", NHO: "#059669", ETC: "#6B7280",
};

export default function GasStationsAdminPage() {
  const [stations, setStations]   = useState<DbStation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  async function loadStations() {
    setLoading(true);
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const res = await fetch(
        `${url}/rest/v1/gas_stations?select=id,name,brand_code,area,address,lat,lng,opinet_id,price_gasoline,price_diesel,price_lpg,price_updated_at&active=eq.true&order=sort_order.asc`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      );
      const data = await res.json();
      setStations(Array.isArray(data) ? data : []);
    } catch {
      setStations([]);
    }
    setLoading(false);
  }

  useEffect(() => { loadStations(); }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/sync-gas", { method: "POST" });
      const data: SyncResponse = await res.json();
      setSyncResult(data);
      if (data.success) loadStations();
    } catch (e) {
      setSyncResult({ success: false, summary: {} as SyncSummary, results: [], error: String(e) });
    }
    setSyncing(false);
  }

  const priceTs = stations.find(s => s.price_updated_at)?.price_updated_at;
  const priceAge = priceTs ? Math.round((Date.now() - new Date(priceTs).getTime()) / 3600000) : null;

  return (
    <div className="p-6 max-w-6xl">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[22px] font-bold text-[#191F28]">주유소 관리</h1>
            <p className="text-[13px] text-[#6B7280] mt-0.5">
              Opinet API 기반 가격·좌표 동기화 — {stations.length}개 주유소
              {priceAge !== null && (
                <span className={`ml-2 font-medium ${priceAge > 12 ? "text-[#F04452]" : "text-[#059669]"}`}>
                  (가격 갱신: {priceAge}시간 전)
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3182F6] text-white rounded-xl text-[14px] font-semibold disabled:opacity-50 hover:bg-[#1C6EE8] transition-colors"
          >
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            {syncing ? "동기화 중..." : "Opinet 동기화"}
          </button>
        </div>
      </div>

      {/* 동기화 결과 */}
      {syncResult && (
        <div className={`mb-5 rounded-2xl p-4 border ${syncResult.success ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-[#FFF5F5] border-[#FECACA]"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {syncResult.success
                ? <CheckCircle2 size={18} className="text-[#059669] shrink-0 mt-0.5" />
                : <AlertCircle size={18} className="text-[#EF4444] shrink-0 mt-0.5" />
              }
              <div>
                {syncResult.success && syncResult.summary ? (
                  <>
                    <p className="text-[14px] font-semibold text-[#065F46]">동기화 완료</p>
                    <p className="text-[13px] text-[#047857] mt-0.5">
                      매칭 {syncResult.summary.matched}개 / 미매칭 {syncResult.summary.unmatched}개 /
                      좌표 갱신 {syncResult.summary.coord_updated}개 /
                      오피넷 {syncResult.summary.opinet_stations}개 감지
                    </p>
                  </>
                ) : (
                  <p className="text-[14px] font-semibold text-[#991B1B]">{syncResult.error ?? "오류 발생"}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {syncResult.success && (
                <button onClick={() => setShowDetail(d => !d)}
                  className="text-[12px] text-[#047857] underline font-medium">
                  {showDetail ? "접기" : "상세 보기"}
                </button>
              )}
              <button onClick={() => setSyncResult(null)} className="text-[#6B7280] hover:text-[#1d1d1f]">
                <X size={16} />
              </button>
            </div>
          </div>

          {showDetail && syncResult.results && (
            <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
              {syncResult.results.map(r => (
                <div key={r.id} className="flex items-center gap-2 text-[12px]">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    r.status === "matched_exact" ? "bg-[#059669]" :
                    r.status === "matched_fuzzy" ? "bg-[#F59E0B]" :
                    r.status === "unmatched" ? "bg-[#EF4444]" : "bg-[#6B7280]"
                  }`} />
                  <span className="font-medium text-[#1d1d1f] min-w-[110px]">{r.name}</span>
                  {r.opinet_name && r.opinet_name !== r.name && (
                    <span className="text-[#6B7280]">→ {r.opinet_name}</span>
                  )}
                  {r.prices && (
                    <span className="text-[#047857] ml-auto shrink-0">
                      {r.prices.gasoline ? `휘발유 ${r.prices.gasoline}원` : ""}
                      {r.prices.diesel ? ` 경유 ${r.prices.diesel}원` : ""}
                      {r.prices.lpg ? ` LPG ${r.prices.lpg}원` : ""}
                    </span>
                  )}
                  {r.status === "unmatched" && <span className="text-[#EF4444] ml-auto shrink-0">미매칭</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 주유소 테이블 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={20} className="animate-spin text-[#6B7280]" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <th className="text-left px-4 py-3 font-semibold text-[#6B7280]">주유소명</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B7280]">브랜드</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B7280]">지역</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B7280] hidden md:table-cell">좌표</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#6B7280]">Opinet ID</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#6B7280]">휘발유</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#6B7280]">경유</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#6B7280] hidden md:table-cell">LPG</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((s, i) => (
                  <tr key={s.id} className={`border-b border-[#F3F4F6] ${i % 2 === 0 ? "" : "bg-[#F9FAFB]"}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#191F28]">{s.name}</div>
                      <div className="text-[11px] text-[#9CA3AF] mt-0.5 hidden md:block">{s.address}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-white text-[11px] font-bold"
                        style={{ backgroundColor: BRAND_COLOR[s.brand_code] ?? "#6B7280" }}>
                        {BRAND_SHORT[s.brand_code] ?? s.brand_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#374151]">{s.area}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-[#6B7280]">
                        <MapPin size={11} />
                        <span>{s.lat?.toFixed(4)}, {s.lng?.toFixed(4)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.opinet_id
                        ? <span className="text-[#059669] font-mono text-[11px]">{s.opinet_id}</span>
                        : <span className="text-[#EF4444] text-[11px]">미설정</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.price_gasoline
                        ? <span className="font-semibold text-[#191F28]">{s.price_gasoline.toLocaleString()}원</span>
                        : <span className="text-[#D1D5DB]">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.price_diesel
                        ? <span className="font-semibold text-[#191F28]">{s.price_diesel.toLocaleString()}원</span>
                        : <span className="text-[#D1D5DB]">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      {s.price_lpg
                        ? <span className="font-semibold text-[#191F28]">{s.price_lpg.toLocaleString()}원</span>
                        : <span className="text-[#D1D5DB]">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {stations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-[#9CA3AF]">
              <Fuel size={28} className="mb-2" />
              <p className="text-[14px]">주유소 데이터가 없습니다</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
