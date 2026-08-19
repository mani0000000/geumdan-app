"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, CreditCard, MapPin, Sparkles } from "lucide-react";
import HomeWidgetHeader from "@/components/home/HomeWidgetHeader";
import { fetchBenefitStoresFlat, type FlatStore } from "@/lib/db/buildings";
import { CARD_PRODUCTS, getCachedBenefitInstruments, getStaticMerchantBenefitOffers, fetchMerchantBenefitOffers, fetchMyBenefitInstruments, matchMerchantBenefits, type BenefitInstrument, type MerchantBenefitOffer } from "@/lib/db/user-benefits";

const STORE_CACHE_KEY = "geumdan-benefit-stores-v2";
const STORE_CACHE_TTL = 30 * 60 * 1000;

function readStoreCache(): FlatStore[] {
  if (typeof window === "undefined") return [];
  try {
    const cached = JSON.parse(sessionStorage.getItem(STORE_CACHE_KEY) ?? "null") as { at: number; rows: FlatStore[] } | null;
    return cached && Date.now() - cached.at < STORE_CACHE_TTL ? cached.rows : [];
  } catch { return []; }
}

function storeVisual(store: FlatStore) {
  return `/api/store-visual?name=${encodeURIComponent(store.name)}&category=${encodeURIComponent(store.category)}`;
}

function BenefitStoreImage({ store }: { store: FlatStore }) {
  const fallback = storeVisual(store);
  const [source, setSource] = useState(store.thumbnail_url || fallback);
  return <img src={source} alt={`${store.name} 대표`} loading="lazy" decoding="async" className="h-full w-full object-cover opacity-85" onError={() => { if (source !== fallback) setSource(fallback); }} />;
}

export default function BenefitsWalletWidget({ stores: suppliedStores }: { stores?: FlatStore[] }) {
  const [instruments, setInstruments] = useState<BenefitInstrument[]>(() => getCachedBenefitInstruments());
  const [offers, setOffers] = useState<MerchantBenefitOffer[]>(() => getStaticMerchantBenefitOffers());
  const [stores, setStores] = useState<FlatStore[]>(() => suppliedStores ?? readStoreCache());
  const [ready, setReady] = useState(() => instruments.length > 0 || stores.length > 0);

  useEffect(() => {
    let active = true;
    const safetyTimer = window.setTimeout(() => { if (active) setReady(true); }, 1800);
    Promise.allSettled([fetchMyBenefitInstruments(), fetchMerchantBenefitOffers(), suppliedStores ? Promise.resolve(suppliedStores) : fetchBenefitStoresFlat()])
      .then(([wallet, benefitRows, storeRows]) => {
        if (!active) return;
        if (wallet.status === "fulfilled") setInstruments(wallet.value);
        if (benefitRows.status === "fulfilled" && benefitRows.value.length) setOffers(benefitRows.value);
        if (storeRows.status === "fulfilled" && storeRows.value.length) {
          setStores(storeRows.value);
          try { sessionStorage.setItem(STORE_CACHE_KEY, JSON.stringify({ at: Date.now(), rows: storeRows.value })); } catch { /* storage 제한 */ }
        }
        setReady(true);
      });
    return () => { active = false; window.clearTimeout(safetyTimer); };
  }, [suppliedStores]);

  const matches = useMemo(() => matchMerchantBenefits(instruments, offers, stores).slice(0, 12), [instruments, offers, stores]);

  const instrumentsByKey = useMemo(() => new Map(instruments.map((item) => [item.issuer_key, item])), [instruments]);
  const cardByKey = useMemo(() => new Map(CARD_PRODUCTS.map((card) => [card.key, card])), []);

  return (
    <section className="mt-7 overflow-hidden" aria-label="내 혜택 주변 매장">
      <HomeWidgetHeader icon={CreditCard} title="내 카드·멤버십 혜택" description="내가 가진 혜택으로 할인 가능한 검단 매장을 찾아드려요" iconColor="#6D28D9" iconBackground="#F3E8FF" href="/mypage/benefits/" />
      {!ready ? <div className="mx-4 h-32 animate-pulse rounded-[24px] bg-white" /> : instruments.length === 0 ? (
        <Link href="/mypage/benefits/" className="mx-4 flex items-center gap-3 rounded-[24px] border border-[#E9D5FF] bg-[linear-gradient(135deg,#FAF5FF,#FFFFFF)] p-4 shadow-[0_10px_26px_rgba(109,40,217,.08)]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#6D28D9] text-white"><CreditCard size={20}/></span>
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-black text-[#241532]">보유 카드·멤버십 등록</span><span className="mt-1 block text-[11px] font-semibold text-[#7C6A86]">카드번호 없이 상품명만 안전하게 저장해요</span></span>
          <ChevronRight size={17} className="text-[#8B5CF6]"/>
        </Link>
      ) : matches.length === 0 ? (
        <div className="mx-4 rounded-[24px] border border-[#E9D5FF] bg-white p-4"><p className="text-[14px] font-black text-[#241532]">등록한 혜택을 확인하고 있어요</p><p className="mt-1 text-[11px] leading-5 text-[#7C6A86]">공식 제휴처가 확인되면 검단 매장과 자동으로 연결됩니다.</p></div>
      ) : (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 pr-8 [scroll-padding-left:20px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {matches.map(({ store, offer }) => (
            <Link key={`${offer.id}-${store.id}`} href={`/stores/detail/?id=${encodeURIComponent(store.id)}`} className="w-[252px] flex-none snap-start overflow-hidden rounded-[22px] border border-black/[.05] bg-white shadow-[0_9px_24px_rgba(40,20,70,.08)]">
              <div className="relative h-[112px] bg-[linear-gradient(135deg,#6D28D9,#A855F7)]">
                <BenefitStoreImage store={store}/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"/>
                <span className="absolute left-3 top-3 max-w-[150px] truncate rounded-full bg-white/92 px-2.5 py-1 text-[9px] font-black text-[#6D28D9]">{instrumentsByKey.get(offer.provider_key)?.nickname || instrumentsByKey.get(offer.provider_key)?.product_name || offer.provider_name}</span>
                {cardByKey.get(offer.provider_key)?.imageUrl && <span className="absolute right-3 top-3 grid h-9 w-14 place-items-center overflow-hidden rounded-lg bg-white/95 p-1 shadow-sm"><img src={cardByKey.get(offer.provider_key)?.imageUrl} alt={`${offer.provider_name} 카드`} className="h-full w-full object-contain" referrerPolicy="no-referrer"/></span>}
                <p className="absolute bottom-3 left-3 right-3 truncate text-[16px] font-black text-white">{store.name}</p>
              </div>
              <div className="p-3"><p className="truncate text-[10px] font-black text-[#6D28D9]">{instrumentsByKey.get(offer.provider_key)?.issuer_name} · {instrumentsByKey.get(offer.provider_key)?.product_name || offer.provider_name}</p><div className="mt-1 flex items-center gap-1 text-[11px] font-black text-[#4C1D95]"><Sparkles size={11}/>{offer.benefit_title}</div><p className="mt-1.5 line-clamp-2 min-h-8 text-[11px] leading-4 text-[#667085]">{offer.benefit_detail}</p><div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-[#98A2B3]"><MapPin size={10}/>{store.buildingName || "검단 매장"}</div></div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
