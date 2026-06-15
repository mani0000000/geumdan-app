"use client";
import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, MapPin, Fuel, X, Search } from "lucide-react";

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

interface SeedSummary {
  opinet_discovered: number;
  inserted: number;
  updated: number;
  skipped: number;
  radius_m: number;
  timestamp: string;
}
interface SeedResponse {
  success: boolean;
  summary?: SeedSummary;
  inserted?: string[];
  updated?: string[];
  skipped?: string[];
  error?: string;
}

interface ScanStation {
  uniId: string; name: string; brandCode: string; brandName: string;
  address: string; lat: number | null; lng: number | null;
  isSelf: boolean; gasoline: number | null; diesel: number | null; lpg: number | null;
  isTargetArea: boolean; alreadyInDb: boolean;
}
interface ScanResponse {
  success: boolean; total: number; targetCount: number;
  stations: ScanStation[]; timestamp: string; error?: string;
}

export default function GasStationsAdminPage() {
  const [stations, setStations]   = useState<DbStation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [seeding, setSeeding]     = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);
  const [seedResult, setSeedResult] = useState<SeedResponse | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [scanFilter, setScanFilter] = useState<"all" | "target" | "new">("target");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<string | null>(null);

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

  async function handleSeed() {
    if (!confirm("오피넷 API로 검단 권역 주유소를 전수 발굴해 DB를 갱신합니다.\n새로운 주유소가 추가되고 없어진 주유소는 비활성화됩니다.\n계속하시겠습니까?")) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/admin/seed-gas", { method: "POST" });
      const data: SeedResponse = await res.json();
      setSeedResult(data);
      if (data.success) loadStations();
    } catch (e) {
      setSeedResult({ success: false, error: String(e) });
    }
    setSeeding(false);
  }

  async function handleScan() {
    setScanning(true);
    setScanResult(null);
    setSelectedIds(new Set());
    try {
      const res = await fetch("/api/admin/scan-gas", { method: "POST" });
      const data: ScanResponse = await res.json();
      setScanResult(data);
      // 타겟 지역 & 미등록 자동 선택
      if (data.success) {
        setSelectedIds(new Set(data.stations.filter(s => s.isTargetArea && !s.alreadyInDb).map(s => s.uniId)));
      }
    } catch (e) {
      setScanResult({ success: false, total: 0, targetCount: 0, stations: [], timestamp: "", error: String(e) });
    }
    setScanning(false);
  }

  async function handleAddSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개 주유소를 DB에 추가할까요?`)) return;
    setAdding(true);
    setAddMsg(null);
    const toAdd = scanResult!.stations.filter(s => selectedIds.has(s.uniId));
    try {
      const res = await fetch("/api/admin/add-gas-stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stations: toAdd }),
      });
      const data = await res.json() as { success?: boolean; inserted?: number; error?: string };
      setAddMsg(data.success ? `✅ ${data.inserted}개 추가 완료` : `❌ ${data.error}`);
      if (data.success) loadStations();
    } catch (e) { setAddMsg(`❌ ${String(e)}`); }
    setAdding(false);
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeed}
              disabled={seeding || syncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#059669] text-white rounded-xl text-[14px] font-semibold disabled:opacity-50 hover:bg-[#047857] transition-colors"
            >
              <Search size={15} className={seeding ? "animate-spin" : ""} />
              {seeding ? "발굴 중..." : "주유소 재발굴"}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || seeding}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#3182F6] text-white rounded-xl text-[14px] font-semibold disabled:opacity-50 hover:bg-[#1C6EE8] transition-colors"
            >
              <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
              {syncing ? "동기화 중..." : "가격 동기화"}
            </button>
          </div>
        </div>
      </div>

      {/* 재발굴 결과 */}
      {seedResult && (
        <div className={`mb-5 rounded-2xl p-4 border ${seedResult.success ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-[#FFF5F5] border-[#FECACA]"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {seedResult.success
                ? <CheckCircle2 size={18} className="text-[#059669] shrink-0 mt-0.5" />
                : <AlertCircle size={18} className="text-[#EF4444] shrink-0 mt-0.5" />
              }
              <div>
                {seedResult.success && seedResult.summary ? (
                  <>
                    <p className="text-[14px] font-semibold text-[#065F46]">주유소 재발굴 완료</p>
                    <p className="text-[13px] text-[#047857] mt-0.5">
                      오피넷 발견 {seedResult.summary.opinet_discovered}개 /
                      신규 추가 {seedResult.summary.inserted}개 /
                      기존 갱신 {seedResult.summary.updated}개 /
                      스킵 {seedResult.summary.skipped}개
                      (반경 {(seedResult.summary.radius_m / 1000).toFixed(0)}km)
                    </p>
                    {(seedResult.inserted?.length ?? 0) > 0 && (
                      <p className="text-[12px] text-[#059669] mt-1">
                        신규: {seedResult.inserted!.join(", ")}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[14px] font-semibold text-[#991B1B]">{seedResult.error ?? "오류 발생"}</p>
                )}
              </div>
            </div>
            <button onClick={() => setSeedResult(null)} className="text-[#6B7280] hover:text-[#1d1d1f]">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

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

      {/* 인천+김포 전체 스캔 섹션 */}
      <div className="mb-6 rounded-2xl border border-[#E5E7EB] overflow-hidden">
        <div className="bg-[#F9FAFB] px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-bold text-[#191F28]">인천+김포 전체 스캔</p>
            <p className="text-[12px] text-[#6B7280]">오피넷에서 인천 서구·김포 전 주유소 조회 후 검단 인근 주소 기준 필터</p>
          </div>
          <button onClick={handleScan} disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] text-white rounded-xl text-[13px] font-bold disabled:opacity-50">
            <Search size={14} className={scanning ? "animate-spin" : ""} />
            {scanning ? "스캔 중..." : "전체 스캔"}
          </button>
        </div>

        {scanResult && scanResult.success && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] text-[#374151]">
                전체 <strong>{scanResult.total}</strong>개 발견 / 검단+인천서구+김포 <strong>{scanResult.targetCount}</strong>개
              </p>
              <div className="flex items-center gap-2">
                <div className="flex rounded-xl border border-[#E5E7EB] overflow-hidden text-[12px]">
                  {(["target","new","all"] as const).map(f => (
                    <button key={f} onClick={() => setScanFilter(f)}
                      className={`px-3 py-1.5 ${scanFilter===f ? "bg-[#3182F6] text-white" : "text-[#374151] hover:bg-[#F3F4F6]"}`}>
                      {f==="target" ? "검단+인근" : f==="new" ? "미등록만" : "전체"}
                    </button>
                  ))}
                </div>
                <button onClick={handleAddSelected} disabled={adding || selectedIds.size===0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#059669] text-white rounded-xl text-[12px] font-bold disabled:opacity-50">
                  {adding ? "추가 중..." : `선택 추가 (${selectedIds.size})`}
                </button>
              </div>
            </div>
            {addMsg && <p className="mb-3 text-[12px] font-medium">{addMsg}</p>}
            <div className="overflow-x-auto max-h-96 overflow-y-auto border border-[#E5E7EB] rounded-xl">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-[#F9FAFB]">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">
                      <input type="checkbox" onChange={e => {
                        const visible = scanResult.stations.filter(s =>
                          scanFilter==="target" ? s.isTargetArea :
                          scanFilter==="new" ? (!s.alreadyInDb && s.isTargetArea) : true
                        );
                        setSelectedIds(e.target.checked ? new Set(visible.map(s=>s.uniId)) : new Set());
                      }} />
                    </th>
                    <th className="px-3 py-2 text-left text-[#6B7280] font-semibold">주유소명</th>
                    <th className="px-3 py-2 text-left text-[#6B7280] font-semibold">주소</th>
                    <th className="px-3 py-2 text-right text-[#6B7280] font-semibold">휘발유</th>
                    <th className="px-3 py-2 text-right text-[#6B7280] font-semibold">경유</th>
                    <th className="px-3 py-2 text-center text-[#6B7280] font-semibold">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {scanResult.stations
                    .filter(s =>
                      scanFilter==="target" ? s.isTargetArea :
                      scanFilter==="new" ? (!s.alreadyInDb && s.isTargetArea) : true
                    )
                    .map(s => (
                      <tr key={s.uniId} className={`border-t border-[#F3F4F6] ${s.isTargetArea ? "" : "opacity-50"}`}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={selectedIds.has(s.uniId)}
                            onChange={e => setSelectedIds(prev => {
                              const next = new Set(prev);
                              e.target.checked ? next.add(s.uniId) : next.delete(s.uniId);
                              return next;
                            })} />
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-[#191F28]">{s.name}</span>
                          <span className="ml-1.5 text-[10px] text-[#6B7280]">{s.brandName}</span>
                          {s.isSelf && <span className="ml-1 text-[10px] text-[#3182F6]">셀프</span>}
                        </td>
                        <td className="px-3 py-2 text-[#4B5563] max-w-[200px] truncate">{s.address}</td>
                        <td className="px-3 py-2 text-right font-medium">{s.gasoline ? `${s.gasoline.toLocaleString()}원` : "—"}</td>
                        <td className="px-3 py-2 text-right font-medium">{s.diesel ? `${s.diesel.toLocaleString()}원` : "—"}</td>
                        <td className="px-3 py-2 text-center">
                          {s.alreadyInDb
                            ? <span className="text-[10px] text-[#059669] font-medium">등록됨</span>
                            : <span className="text-[10px] text-[#F59E0B] font-medium">미등록</span>
                          }
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {scanResult && !scanResult.success && (
          <p className="p-4 text-[13px] text-[#EF4444]">❌ {scanResult.error}</p>
        )}
      </div>

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
