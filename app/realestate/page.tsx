"use client";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp, AlertTriangle, RefreshCw, Building2 } from "lucide-react";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";

type RentalType = "all" | "전세" | "월세";
type Tab = "trade" | "jeonse" | "wolse";

const DONG_TABS = ["전체", "검단동", "당하동", "불로동", "마전동", "대곡동", "금곡동", "원당동", "왕길동", "백석동"] as const;
type DongTab = typeof DONG_TABS[number];

interface Trade {
  id: number;
  apt_name: string;
  dong: string;
  jibun: string | null;
  exclu_use_ar: number;
  pyeong: number | null;
  floor_no: number | null;
  build_year: number | null;
  deal_year: number;
  deal_month: number;
  deal_day: number | null;
  deal_amount: number;
  cancel_yn: boolean;
  fetched_at: string;
}

interface Rental {
  id: number;
  apt_name: string;
  dong: string;
  jibun: string | null;
  exclu_use_ar: number;
  pyeong: number | null;
  floor_no: number | null;
  build_year: number | null;
  contract_year: number;
  contract_month: number;
  contract_day: number | null;
  rent_type: "전세" | "월세";
  deposit: number;
  monthly_rent: number;
  fetched_at: string;
}

function fmt만원(v: number): string {
  if (v >= 10000) {
    const eok = Math.floor(v / 10000);
    const man = v % 10000;
    if (man === 0) return `${eok}억`;
    return `${eok}억 ${man.toLocaleString()}만`;
  }
  return `${v.toLocaleString()}만원`;
}

function fmtDealDate(y: number, m: number, d: number | null): string {
  if (d) return `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}`;
  return `${y}.${String(m).padStart(2, "0")}`;
}

function fmtFetchedDate(iso: string): string {
  const dt = new Date(iso);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

function pyeongLabel(sqm: number, pyeong: number | null): string {
  const p = pyeong ?? Math.round(sqm / 3.305785);
  return `${sqm.toFixed(2)}㎡ (${p}평)`;
}

export default function RealestatePage() {
  const [tab, setTab] = useState<Tab>("trade");
  const [dong, setDong] = useState<DongTab>("전체");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [latestFetchedAt, setLatestFetchedAt] = useState<string | null>(null);

  // ── 환경 체크 ──────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/realestate/config")
      .then(r => r.json())
      .then((j: { hasApiKey: boolean }) => setHasApiKey(j.hasApiKey))
      .catch(() => setHasApiKey(null));
  }, []);

  // ── 데이터 로드 ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try {
        if (tab === "trade") {
          const q = supabase.from("apartment_trades")
            .select("id, apt_name, dong, jibun, exclu_use_ar, pyeong, floor_no, build_year, deal_year, deal_month, deal_day, deal_amount, cancel_yn, fetched_at")
            .eq("cancel_yn", false)
            .order("deal_year", { ascending: false })
            .order("deal_month", { ascending: false })
            .order("deal_day", { ascending: false })
            .limit(200);
          const { data, error: err } = await q;
          if (err) throw err;
          if (!cancelled) {
            setTrades((data ?? []) as Trade[]);
            const lf = (data ?? []).reduce<string | null>((acc, r) => {
              const t = (r as Trade).fetched_at;
              return !acc || t > acc ? t : acc;
            }, null);
            setLatestFetchedAt(lf);
          }
        } else {
          const rentType: RentalType = tab === "jeonse" ? "전세" : "월세";
          const q = supabase.from("apartment_rentals")
            .select("id, apt_name, dong, jibun, exclu_use_ar, pyeong, floor_no, build_year, contract_year, contract_month, contract_day, rent_type, deposit, monthly_rent, fetched_at")
            .eq("rent_type", rentType)
            .order("contract_year", { ascending: false })
            .order("contract_month", { ascending: false })
            .order("contract_day", { ascending: false })
            .limit(200);
          const { data, error: err } = await q;
          if (err) throw err;
          if (!cancelled) {
            setRentals((data ?? []) as Rental[]);
            const lf = (data ?? []).reduce<string | null>((acc, r) => {
              const t = (r as Rental).fetched_at;
              return !acc || t > acc ? t : acc;
            }, null);
            setLatestFetchedAt(lf);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "데이터 로드 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tab]);

  // ── 동 필터링 ──────────────────────────────────────────────
  const tradesFiltered = useMemo(() =>
    dong === "전체" ? trades : trades.filter(t => t.dong === dong),
    [trades, dong],
  );
  const rentalsFiltered = useMemo(() =>
    dong === "전체" ? rentals : rentals.filter(t => t.dong === dong),
    [rentals, dong],
  );

  const periodLabel = useMemo(() => {
    if (tab === "trade") {
      const r = trades[0];
      if (!r) return null;
      return `${r.deal_year}년 ${r.deal_month}월`;
    }
    const r = rentals[0];
    if (!r) return null;
    return `${r.contract_year}년 ${r.contract_month}월`;
  }, [tab, trades, rentals]);

  const dongCounts = useMemo(() => {
    const src = tab === "trade" ? trades : rentals;
    const map = new Map<string, number>();
    for (const r of src) map.set(r.dong, (map.get(r.dong) ?? 0) + 1);
    return map;
  }, [tab, trades, rentals]);

  return (
    <div className="pb-20">
      <Header title="검단신도시 시세" showBack />

      {/* ── 안내 / 출처 ── */}
      <div className="px-4 pt-3">
        {hasApiKey === false && (
          <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-2xl p-3 mb-3 flex gap-2">
            <AlertTriangle size={18} className="text-[#EA580C] shrink-0 mt-0.5" />
            <div className="text-[12px] text-[#9A3412]">
              <p className="font-bold">국토부 API 키 미설정</p>
              <p className="mt-0.5">
                <code>MOLIT_API_KEY</code> 환경변수가 설정되지 않아 신규 데이터 수집이 작동하지 않습니다.
                관리자가 환경변수 설정 후 어드민에서 배치를 실행하면 자동으로 표시됩니다.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-[#0071e3]" />
            <span className="text-[12px] font-semibold text-[#1d1d1f]">
              {periodLabel ? `기준: ${periodLabel} 거래` : "검단신도시 실거래가"}
            </span>
          </div>
          <span className="text-[10px] text-[#86868b]">
            {latestFetchedAt ? `수집일 ${fmtFetchedDate(latestFetchedAt)}` : ""}
          </span>
        </div>
        <p className="text-[10px] text-[#86868b] leading-relaxed">
          출처: 국토교통부 실거래가 공개시스템 (apis.data.go.kr) — 인천광역시 서구
        </p>
      </div>

      {/* ── 매매/전세/월세 탭 ── */}
      <div className="px-4 mt-3">
        <div className="grid grid-cols-3 gap-1 bg-[#F2F4F6] rounded-xl p-1">
          {[
            { id: "trade",  label: "매매" },
            { id: "jeonse", label: "전세" },
            { id: "wolse",  label: "월세" },
          ].map(t => (
            <button key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`py-2 rounded-lg text-[13px] font-semibold transition-all
                ${tab === t.id ? "bg-white shadow-sm text-[#1d1d1f]" : "text-[#8B95A1]"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 법정동 탭 ── */}
      <div className="mt-3 overflow-x-auto px-4 no-scrollbar">
        <div className="flex gap-1.5 pb-1 min-w-max">
          {DONG_TABS.map(d => {
            const active = dong === d;
            const cnt = d === "전체"
              ? (tab === "trade" ? trades.length : rentals.length)
              : dongCounts.get(d) ?? 0;
            return (
              <button key={d}
                onClick={() => setDong(d)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors
                  ${active ? "bg-[#0071e3] text-white" : "bg-white border border-[#d2d2d7] text-[#1d1d1f]"}`}>
                {d}{cnt > 0 && <span className={`ml-1 ${active ? "text-white/70" : "text-[#86868b]"}`}>{cnt}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 카드 리스트 ── */}
      <div className="mt-4 px-4 space-y-2">
        {loading && (
          <div className="py-12 text-center text-[#86868b] text-[13px]">
            <RefreshCw size={18} className="inline-block animate-spin mr-2" />
            불러오는 중...
          </div>
        )}

        {!loading && error && (
          <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-2xl p-4 text-[12px] text-[#991B1B]">
            데이터 로드 오류: {error}
          </div>
        )}

        {!loading && !error && tab === "trade" && tradesFiltered.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#d2d2d7] p-8 text-center">
            <Building2 size={32} className="mx-auto text-[#B0B8C1] mb-2" />
            <p className="text-[13px] font-semibold text-[#1d1d1f]">수집된 매매 실거래가가 없습니다</p>
            <p className="text-[11px] text-[#86868b] mt-1">관리자 페이지 → 부동산 시세 → 배치 관리에서 데이터를 수집해주세요</p>
          </div>
        )}

        {!loading && !error && tab !== "trade" && rentalsFiltered.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#d2d2d7] p-8 text-center">
            <Building2 size={32} className="mx-auto text-[#B0B8C1] mb-2" />
            <p className="text-[13px] font-semibold text-[#1d1d1f]">수집된 {tab === "jeonse" ? "전세" : "월세"} 데이터가 없습니다</p>
            <p className="text-[11px] text-[#86868b] mt-1">관리자 페이지 → 부동산 시세 → 배치 관리에서 데이터를 수집해주세요</p>
          </div>
        )}

        {!loading && !error && tab === "trade" && tradesFiltered.map(t => (
          <article key={t.id} className="bg-white rounded-2xl border border-[#d2d2d7] p-3.5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h3 className="text-[14px] font-bold text-[#1d1d1f] truncate">{t.apt_name}</h3>
                <p className="text-[11px] text-[#86868b] mt-0.5">
                  {t.dong}{t.jibun ? ` · ${t.jibun}` : ""}
                  {t.build_year ? ` · ${t.build_year}년 준공` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[15px] font-extrabold text-[#0071e3]">{fmt만원(t.deal_amount)}</p>
                <p className="text-[10px] text-[#86868b]">{fmtDealDate(t.deal_year, t.deal_month, t.deal_day)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#4E5968]">
              <span className="bg-[#F2F4F6] rounded-md px-2 py-0.5">{pyeongLabel(t.exclu_use_ar, t.pyeong)}</span>
              {t.floor_no != null && <span className="bg-[#F2F4F6] rounded-md px-2 py-0.5">{t.floor_no}층</span>}
            </div>
          </article>
        ))}

        {!loading && !error && tab !== "trade" && rentalsFiltered.map(r => (
          <article key={r.id} className="bg-white rounded-2xl border border-[#d2d2d7] p-3.5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h3 className="text-[14px] font-bold text-[#1d1d1f] truncate">{r.apt_name}</h3>
                <p className="text-[11px] text-[#86868b] mt-0.5">
                  {r.dong}{r.jibun ? ` · ${r.jibun}` : ""}
                  {r.build_year ? ` · ${r.build_year}년 준공` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                {r.rent_type === "전세" ? (
                  <p className="text-[15px] font-extrabold text-[#10B981]">{fmt만원(r.deposit)}</p>
                ) : (
                  <>
                    <p className="text-[13px] font-bold text-[#1d1d1f]">보증 {fmt만원(r.deposit)}</p>
                    <p className="text-[13px] font-extrabold text-[#F59E0B]">월 {fmt만원(r.monthly_rent)}</p>
                  </>
                )}
                <p className="text-[10px] text-[#86868b]">{fmtDealDate(r.contract_year, r.contract_month, r.contract_day)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#4E5968]">
              <span className="bg-[#F2F4F6] rounded-md px-2 py-0.5">{pyeongLabel(r.exclu_use_ar, r.pyeong)}</span>
              {r.floor_no != null && <span className="bg-[#F2F4F6] rounded-md px-2 py-0.5">{r.floor_no}층</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
