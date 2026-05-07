"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Bus, Store, Building, Trash2 } from "lucide-react";
import {
  getFavoriteBuses, removeFavoriteBus,
  getFavoriteStores, removeFavoriteStore,
  getFavoriteApts, removeFavoriteApt,
  type FavoriteBus, type FavoriteStore, type FavoriteApt,
} from "@/lib/db/userdata";

type TabKey = "bus" | "store" | "apt";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "bus",   label: "교통",     icon: <Bus size={16} /> },
  { key: "store", label: "상가",     icon: <Store size={16} /> },
  { key: "apt",   label: "아파트",   icon: <Building size={16} /> },
];

function FavoritesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = (params.get("tab") as TabKey) || "bus";
  const [tab, setTab] = useState<TabKey>(
    TABS.some(t => t.key === initial) ? initial : "bus"
  );

  const [buses, setBuses] = useState<FavoriteBus[]>([]);
  const [stores, setStores] = useState<FavoriteStore[]>([]);
  const [apts, setApts] = useState<FavoriteApt[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [b, s, a] = await Promise.all([
      getFavoriteBuses(), getFavoriteStores(), getFavoriteApts(),
    ]);
    setBuses(b); setStores(s); setApts(a);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const setTabAndUrl = (k: TabKey) => {
    setTab(k);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", k);
    window.history.replaceState({}, "", url.toString());
  };

  const removeBus = async (id: string) => { await removeFavoriteBus(id); reload(); };
  const removeStore = async (id: string) => { await removeFavoriteStore(id); reload(); };
  const removeApt = async (id: string) => { await removeFavoriteApt(id); reload(); };

  return (
    <div className="min-h-dvh bg-[#f5f5f7]">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="flex items-center gap-2 h-[52px] px-4">
          <button onClick={() => router.back()} className="active:opacity-60">
            <ChevronLeft size={24} className="text-[#1d1d1f]" />
          </button>
          <h1 className="text-[18px] font-bold text-[#1d1d1f]">즐겨찾기</h1>
        </div>
        <div className="flex gap-2 px-4 pb-3">
          {TABS.map(t => {
            const active = tab === t.key;
            const count = t.key === "bus" ? buses.length : t.key === "store" ? stores.length : apts.length;
            return (
              <button
                key={t.key}
                onClick={() => setTabAndUrl(t.key)}
                className={`h-9 px-3.5 rounded-full text-[13px] font-bold flex items-center gap-1.5 transition-colors ${
                  active ? "bg-[#2563EB] text-white" : "bg-white text-[#424245]"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                <span className={`text-[11px] ${active ? "text-white/85" : "text-[#86868b]"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="px-4 pt-4 pb-10">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-white animate-pulse" />)}
          </div>
        ) : tab === "bus" ? (
          buses.length === 0 ? (
            <Empty icon={<Bus size={28} className="text-[#86868b]" />} title="즐겨찾는 노선이 없어요" sub="교통 페이지에서 자주 타는 버스를 추가해 보세요" cta="교통 가기" href="/transport/" />
          ) : (
            <ul className="space-y-2.5">
              {buses.map(b => (
                <li key={b.id} className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center">
                  <Link href={`/transport/?route=${encodeURIComponent(b.route_id)}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex w-8 h-8 rounded-lg bg-[#10B981]/10 items-center justify-center">
                        <Bus size={16} className="text-[#10B981]" />
                      </span>
                      <span className="text-[15px] font-bold text-[#1d1d1f]">{b.route_name}</span>
                    </div>
                    {b.stop_name && <p className="mt-1.5 ml-10 text-[12px] text-[#86868b] truncate">{b.stop_name}</p>}
                  </Link>
                  <button
                    onClick={() => removeBus(b.route_id)}
                    aria-label="삭제"
                    className="ml-2 w-9 h-9 rounded-full hover:bg-[#f5f5f7] active:bg-[#e8e8ea] flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={16} className="text-[#86868b]" />
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : tab === "store" ? (
          stores.length === 0 ? (
            <Empty icon={<Store size={28} className="text-[#86868b]" />} title="찜한 상가가 없어요" sub="상가 페이지에서 자주 가는 매장을 추가해 보세요" cta="상가 가기" href="/stores/" />
          ) : (
            <ul className="space-y-2.5">
              {stores.map(s => (
                <li key={s.id} className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center">
                  <Link href={`/stores/detail/?id=${encodeURIComponent(s.store_id)}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex w-8 h-8 rounded-lg bg-[#F59E0B]/10 items-center justify-center">
                        <Store size={16} className="text-[#F59E0B]" />
                      </span>
                      <span className="text-[15px] font-bold text-[#1d1d1f] truncate">{s.store_name}</span>
                    </div>
                    {s.building_name && <p className="mt-1.5 ml-10 text-[12px] text-[#86868b] truncate">{s.building_name}</p>}
                  </Link>
                  <ChevronRight size={18} className="text-[#c7c7cc] mr-1" />
                  <button
                    onClick={() => removeStore(s.store_id)}
                    aria-label="삭제"
                    className="w-9 h-9 rounded-full hover:bg-[#f5f5f7] active:bg-[#e8e8ea] flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={16} className="text-[#86868b]" />
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          apts.length === 0 ? (
            <Empty icon={<Building size={28} className="text-[#86868b]" />} title="관심 아파트가 없어요" sub="시세에서 단지를 추가해 보세요" cta="시세 가기" href="/community/?tab=시세" />
          ) : (
            <ul className="space-y-2.5">
              {apts.map(a => (
                <li key={a.id} className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center">
                  <Link href={`/community/?tab=시세&apt=${encodeURIComponent(a.apt_id)}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex w-8 h-8 rounded-lg bg-[#2563EB]/10 items-center justify-center">
                        <Building size={16} className="text-[#2563EB]" />
                      </span>
                      <span className="text-[15px] font-bold text-[#1d1d1f] truncate">{a.apt_name}</span>
                    </div>
                    {a.dong && <p className="mt-1.5 ml-10 text-[12px] text-[#86868b] truncate">{a.dong}</p>}
                  </Link>
                  <button
                    onClick={() => removeApt(a.apt_id)}
                    aria-label="삭제"
                    className="ml-2 w-9 h-9 rounded-full hover:bg-[#f5f5f7] active:bg-[#e8e8ea] flex items-center justify-center transition-colors"
                  >
                    <Trash2 size={16} className="text-[#86868b]" />
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}

function Empty({ icon, title, sub, cta, href }: { icon: React.ReactNode; title: string; sub: string; cta: string; href: string }) {
  return (
    <div className="bg-white rounded-2xl py-12 px-6 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-[#f5f5f7] flex items-center justify-center mb-3">{icon}</div>
      <p className="text-[15px] font-bold text-[#1d1d1f]">{title}</p>
      <p className="text-[13px] text-[#86868b] mt-1">{sub}</p>
      <Link
        href={href}
        className="mt-5 h-10 px-5 rounded-full bg-[#2563EB] text-white text-[14px] font-bold flex items-center active:opacity-80 transition-opacity"
      >
        {cta}
      </Link>
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#f5f5f7]" />}>
      <FavoritesInner />
    </Suspense>
  );
}
