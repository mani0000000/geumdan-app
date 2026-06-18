"use client";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Building2, Star, ChevronDown, ChevronUp, BarChart2, Calendar } from "lucide-react";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import type { AptMarketSummary } from "@/lib/reb-price";

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
  const [dong, setDong] = useState<DongTab>("전체");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [latestFetchedAt, setLatestFetchedAt] = useState<string | null>(null);
  const [favApts, setFavApts] = useState<Set<string>>(new Set());
  const [summaries, setSummaries] = useState<AptMarketSummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("realestateFavApts");
    if (raw) setFavApts(new Set((JSON.parse(raw) as {name: string}[]).map(a => a.name)));
  }, []);

  function toggleFavApt(name: string, dongVal: string) {
    setFavApts(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      const raw = localStorage.getItem("realestateFavApts");
      const current: {name: string; dong: string}[] = raw ? JSON.parse(raw) : [];
      const updated = next.has(name)
        ? [...current.filter(a => a.name !== name), { name, dong: dongVal }]
        : current.filter(a => a.name !== name);
      localStorage.setItem("realestateFavApts", JSON.stringify(updated));
      return next;
    });
  }

  // ── 환경 체크 ──────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/realestate/config")
      .then(r => r.json())
      .then((j: { hasApiKey: boolean }) => setHasApiKey(j.hasApiKey))
      .catch(() => setHasApiKey(null));
  }, []);

  // ── 시세 현황 (단지별 평균) ────────────────────────────────
  useEffect(() => {
    if (!summaryOpen) return;
    setSummaryLoading(true);
    fetch("/api/realestate/market-summary")
      .then(r => r.json())
      .then((j: { summaries?: AptMarketSummary[] }) => setSummaries(j.summaries ?? []))
      .catch(() => setSummaries([]))
      .finally(() => setSummaryLoading(false));
  }, [summaryOpen]);

  // ── 매매 실거래가 로드 ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError("");
      try {
        const { data, error: err } = await supabase
          .from("apartment_trades")
          .select("id, apt_name, dong, jibun, exclu_use_ar, pyeong, floor_no, build_year, deal_year, deal_month, deal_day, deal_amount, cancel_yn, fetched_at")
          .eq("cancel_yn", false)
          .order("deal_year", { ascending: false })
          .order("deal_month", { ascending: false })
          .order("deal_day", { ascending: false })
          .limit(200);
        if (err) throw err;
        if (!cancelled) {
          setTrades((data ?? []) as Trade[]);
          const lf = (data ?? []).reduce<string | null>((acc, r) => {
            const t = (r as Trade).fetched_at;
            return !acc || t > acc ? t : acc;
          }, null);
          setLatestFetchedAt(lf);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "데이터 로드 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── 동 필터링 ──────────────────────────────────────────────
  const tradesFiltered = useMemo(() =>
    dong === "전체" ? trades : trades.filter(t => t.dong === dong),
    [trades, dong],
  );

  const latestDealLabel = useMemo(() => {
    const r = trades[0];
    if (!r) return null;
    return `${r.deal_year}년 ${r.deal_month}월`;
  }, [trades]);

  const dongCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of trades) map.set(r.dong, (map.get(r.dong) ?? 0) + 1);
    return map;
  }, [trades]);

  // 같은 아파트 이름의 이전 거래와 가격 비교 (trades는 날짜 내림차순)
  const priceDiff = useMemo(() => {
    const seen = new Map<string, number>();
    const result = new Map<number, "up" | "down" | "same">();
    for (const t of trades) {
      const prev = seen.get(t.apt_name);
      if (prev !== undefined) {
        result.set(t.id, t.deal_amount < prev ? "up" : t.deal_amount > prev ? "down" : "same");
      }
      if (!seen.has(t.apt_name)) seen.set(t.apt_name, t.deal_amount);
    }
    return result;
  }, [trades]);

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

        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-[#3182F6]" />
            <span className="text-[13px] font-bold text-[#1d1d1f]">매매 실거래가</span>
          </div>
          {latestFetchedAt && (
            <div className="flex items-center gap-1 text-[10px] text-[#86868b]">
              <Calendar size={10} />
              <span>수집일 {fmtFetchedDate(latestFetchedAt)}</span>
            </div>
          )}
        </div>
        {latestDealLabel && (
          <div className="mb-1">
            <span className="text-[11px] font-semibold text-[#3182F6] bg-[#EEF5FF] px-2 py-0.5 rounded-full">
              최신 거래: {latestDealLabel} 기준
            </span>
          </div>
        )}
        <p className="text-[10px] text-[#86868b] leading-relaxed mt-1">
          출처: 국토교통부 실거래가 공개시스템 (apis.data.go.kr) — 인천광역시 서구
        </p>
      </div>

      {/* ── 시세 현황 (단지별 평균, 국토부 실거래가 기반) ── */}
      <div className="px-4 mt-3">
        <button
          onClick={() => setSummaryOpen(v => !v)}
          className="w-full flex items-center justify-between bg-white border border-[#d2d2d7] rounded-2xl px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <BarChart2 size={15} className="text-[#3182F6]" />
            <span className="text-[13px] font-semibold text-[#1d1d1f]">단지별 평균 매매가</span>
            <span className="text-[10px] text-[#86868b] bg-[#F2F4F6] rounded px-1.5 py-0.5">최근 6개월 기반</span>
          </div>
          {summaryOpen ? <ChevronUp size={16} className="text-[#86868b]" /> : <ChevronDown size={16} className="text-[#86868b]" />}
        </button>

        {summaryOpen && (
          <div className="mt-2 bg-white border border-[#d2d2d7] rounded-2xl overflow-hidden">
            {summaryLoading && (
              <div className="py-6 text-center text-[#86868b] text-[12px]">
                <RefreshCw size={14} className="inline-block animate-spin mr-1.5" />
                시세 계산 중...
              </div>
            )}

            {!summaryLoading && summaries.length === 0 && (
              <div className="py-6 text-center text-[#86868b]">
                <Building2 size={24} className="mx-auto mb-2 text-[#B0B8C1]" />
                <p className="text-[12px] font-semibold text-[#1d1d1f]">실거래 데이터가 아직 없습니다</p>
                <p className="text-[11px] mt-1">관리자 → 부동산 시세 → 배치 실행 후 표시됩니다</p>
              </div>
            )}

            {!summaryLoading && summaries.length > 0 && (
              <>
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-0 px-3 py-2 border-b border-[#F2F4F6] bg-[#F8F9FA]">
                  <span className="text-[10px] font-semibold text-[#86868b]">단지</span>
                  <span className="text-[10px] font-semibold text-[#86868b] text-center">평형대</span>
                  <span className="text-[10px] font-semibold text-[#86868b] text-right">매매 평균</span>
                </div>
                <div className="divide-y divide-[#F2F4F6] max-h-80 overflow-y-auto">
                  {summaries.filter(s => s.avg_trade_price).map((s, i) => (
                    <div key={i} className="grid grid-cols-[2fr_1fr_1fr] gap-0 px-3 py-2.5 items-center">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-[#1d1d1f] truncate">{s.apt_name}</p>
                        <p className="text-[10px] text-[#86868b]">{s.dong} · {s.trade_count}건</p>
                      </div>
                      <p className="text-[11px] text-[#86868b] text-center">{s.sqm}㎡대</p>
                      <p className="text-[12px] font-bold text-[#3182F6] text-right">
                        {s.avg_trade_price ? fmt만원(s.avg_trade_price) : "—"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-2 border-t border-[#F2F4F6] bg-[#F8F9FA]">
                  <p className="text-[10px] text-[#86868b]">국토부 실거래가 기반 추산 · 실제 시세와 다를 수 있음</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── 법정동 필터 탭 ── */}
      <div className="mt-3 overflow-x-auto px-4 no-scrollbar">
        <div className="flex gap-1.5 pb-1 min-w-max">
          {DONG_TABS.map(d => {
            const active = dong === d;
            const cnt = d === "전체" ? trades.length : (dongCounts.get(d) ?? 0);
            return (
              <button key={d}
                onClick={() => setDong(d)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors
                  ${active ? "bg-[#3182F6] text-white" : "bg-white border border-[#d2d2d7] text-[#1d1d1f]"}`}>
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

        {!loading && !error && tradesFiltered.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#d2d2d7] p-8 text-center">
            <Building2 size={32} className="mx-auto text-[#B0B8C1] mb-2" />
            <p className="text-[13px] font-semibold text-[#1d1d1f]">수집된 매매 실거래가가 없습니다</p>
            <p className="text-[11px] text-[#86868b] mt-1">관리자 페이지 → 부동산 시세 → 배치 관리에서 데이터를 수집해주세요</p>
          </div>
        )}

        {!loading && !error && tradesFiltered.map(t => (
          <article key={t.id} className="bg-white rounded-2xl border border-[#d2d2d7] p-3.5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h3 className="text-[14px] font-bold text-[#1d1d1f] truncate">{t.apt_name}</h3>
                <p className="text-[11px] text-[#86868b] mt-0.5">
                  {t.dong}{t.jibun ? ` · ${t.jibun}` : ""}
                  {t.build_year ? ` · ${t.build_year}년 준공` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end shrink-0 gap-1">
                <button
                  onClick={() => toggleFavApt(t.apt_name, t.dong)}
                  className="active:opacity-60 transition-colors"
                  aria-label={favApts.has(t.apt_name) ? "즐겨찾기 해제" : "즐겨찾기"}
                >
                  <Star size={16} className={favApts.has(t.apt_name) ? "fill-[#FBBF24] text-[#FBBF24]" : "text-[#D1D5DB]"} />
                </button>
                <div className="flex items-center gap-1">
                  {priceDiff.get(t.id) === "up" && (
                    <TrendingUp size={12} className="text-[#f04452]" />
                  )}
                  {priceDiff.get(t.id) === "down" && (
                    <TrendingDown size={12} className="text-[#3182F6]" />
                  )}
                  <p className={`text-[15px] font-extrabold ${
                    priceDiff.get(t.id) === "up" ? "text-[#f04452]" :
                    priceDiff.get(t.id) === "down" ? "text-[#3182F6]" : "text-[#3182F6]"
                  }`}>{fmt만원(t.deal_amount)}</p>
                </div>
                <p className="text-[10px] text-[#86868b]">{fmtDealDate(t.deal_year, t.deal_month, t.deal_day)} 거래</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#4E5968]">
              <span className="bg-[#F2F4F6] rounded-md px-2 py-0.5">{pyeongLabel(t.exclu_use_ar, t.pyeong)}</span>
              {t.floor_no != null && <span className="bg-[#F2F4F6] rounded-md px-2 py-0.5">{t.floor_no}층</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
