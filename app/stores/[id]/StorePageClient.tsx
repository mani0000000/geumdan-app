"use client";
import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Phone, MapPin, Camera, Globe, MessageCircle, Star,
  Clock, Tag, CalendarDays, Share2, Bookmark, ShieldCheck,
} from "lucide-react";
import StoreLogo from "@/components/ui/StoreLogo";
import {
  fetchStoreBrandBundle, fetchBuildingById,
  publicCreateReservation, publicCreateWaiting, publicCreateReview, publicUseCoupon,
  type StoreBrand, type StoreMenu, type StoreHour, type StoreEvent,
  type StoreCouponDetail, type StoreReview,
} from "@/lib/db/store-brand";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function todayIdx(): number {
  return new Date().getDay();
}

function isOpenNow(hours: StoreHour[]): boolean {
  const today = hours.find(h => h.day_of_week === todayIdx());
  if (!today || today.is_closed || !today.open_time || !today.close_time) return false;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = today.open_time.split(":").map(Number);
  const [ch, cm] = today.close_time.split(":").map(Number);
  return cur >= oh * 60 + om && cur <= ch * 60 + cm;
}

export default function StoreBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<StoreBrand | null>(null);
  const [menus, setMenus] = useState<StoreMenu[]>([]);
  const [hours, setHours] = useState<StoreHour[]>([]);
  const [events, setEvents] = useState<StoreEvent[]>([]);
  const [coupons, setCoupons] = useState<StoreCouponDetail[]>([]);
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [building, setBuilding] = useState<{ name: string; address: string | null; lat: number | null; lng: number | null } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const bundle = await fetchStoreBrandBundle(id);
    setStore(bundle.store);
    setMenus(bundle.menus);
    setHours(bundle.hours);
    setEvents(bundle.events);
    setCoupons(bundle.coupons);
    setReviews(bundle.reviews);
    if (bundle.store?.building_id) {
      const b = await fetchBuildingById(bundle.store.building_id);
      if (b) setBuilding(b as typeof building);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#f5f5f7] flex items-center justify-center">
        <div className="animate-pulse text-[#86868B] text-[14px]">로딩 중…</div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-dvh bg-[#f5f5f7] flex items-center justify-center">
        <div className="text-center px-8">
          <p className="text-4xl mb-3">🏢</p>
          <p className="text-[17px] font-bold text-[#1d1d1f]">매장을 찾을 수 없어요</p>
          <button onClick={() => router.back()} className="mt-4 h-11 px-6 bg-[#3182F6] rounded-xl text-white text-[15px] font-bold">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const openNow = hours.length > 0 ? isOpenNow(hours) : store.is_open;
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  function renderModule(key: string) {
    switch (key) {
      case "hero":     return <HeroSection key={key} store={store!} building={building} openNow={openNow} avgRating={avgRating} reviewCount={reviews.length} />;
      case "info":     return <InfoSection key={key} store={store!} building={building} />;
      case "menu":     return menus.length > 0 ? <MenuSection key={key} menus={menus} /> : null;
      case "hours":    return hours.length > 0 ? <HoursSection key={key} hours={hours} /> : null;
      case "events":   return events.length > 0 ? <EventsSection key={key} events={events} /> : null;
      case "coupons":  return coupons.length > 0 ? <CouponsSection key={key} coupons={coupons} /> : null;
      case "reviews":  return <ReviewsSection key={key} reviews={reviews} storeId={store!.id} avgRating={avgRating} onCreated={load} />;
      case "map":      return building?.lat && building?.lng ? <MapSection key={key} building={building} /> : null;
      case "reserve":  return <ReserveSection key={key} storeId={store!.id} onCreated={load} />;
      case "waiting":  return <WaitingSection key={key} storeId={store!.id} onCreated={load} />;
      default: return null;
    }
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-[#EBEBED]">
        <div className="max-w-[720px] mx-auto px-4 py-3 flex items-center gap-2">
          <button onClick={() => router.back()} className="p-1.5 -ml-1.5 rounded-full hover:bg-black/5">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#1d1d1f] truncate">{store.name}</p>
          </div>
          <button className="p-1.5 rounded-full hover:bg-black/5" onClick={() => navigator.share?.({ title: store.name, url: location.href }).catch(() => {})}>
            <Share2 size={18} />
          </button>
          <button className="p-1.5 rounded-full hover:bg-black/5">
            <Bookmark size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-[720px] mx-auto">
        {store.page_modules.map(renderModule)}

        <div className="px-4 pt-6">
          <Link
            href={`/stores/${store.id}/admin`}
            className="flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-[#D4D6DA] text-[#86868B] text-[12px] hover:border-[#3182F6] hover:text-[#3182F6]"
          >
            <ShieldCheck size={14} /> 매장 사장님이신가요? 매장 어드민 열기
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────── 섹션 컴포넌트 ──────────────────────────────────

function HeroSection({
  store, building, openNow, avgRating, reviewCount,
}: {
  store: StoreBrand;
  building: { name: string; address: string | null } | null;
  openNow: boolean;
  avgRating: number | null;
  reviewCount: number;
}) {
  const cover = store.cover_image_url
    || `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80&auto=format`;
  return (
    <section className="bg-white">
      <div className="relative h-[180px] sm:h-[240px] overflow-hidden">
        <img src={cover} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/30" />
      </div>

      <div className="px-4 -mt-8 relative">
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 -mt-8 ring-4 ring-white rounded-2xl overflow-hidden bg-white">
              <StoreLogo name={store.name} category={store.category} size={64} rounded="rounded-2xl" />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-[20px] font-extrabold text-[#1d1d1f] leading-tight truncate">{store.name}</h1>
              <p className="text-[12px] text-[#86868B] mt-1 truncate">
                {building?.name ?? "—"} · {store.floor_label} · {store.category}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full
                  ${openNow ? "bg-[#E6F7EE] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${openNow ? "bg-[#16A34A]" : "bg-[#DC2626]"}`} />
                  {openNow ? "영업중" : "영업종료"}
                </span>
                {avgRating !== null && (
                  <span className="inline-flex items-center gap-1 text-[12px] text-[#1d1d1f] font-semibold">
                    <Star size={13} className="text-[#FFBB00] fill-[#FFBB00]" />
                    {avgRating.toFixed(1)}
                    <span className="text-[#86868B] font-normal">({reviewCount})</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {store.short_description && (
            <p className="mt-3 text-[13px] text-[#3C3C43] leading-relaxed">
              {store.short_description}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            {store.phone && (
              <a href={`tel:${store.phone}`} className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 bg-[#3182F6] text-white text-[13px] font-bold rounded-xl">
                <Phone size={14} /> 전화
              </a>
            )}
            {store.website && (
              <a href={store.website} target="_blank" rel="noopener noreferrer" className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 bg-[#F5F6F8] text-[#1d1d1f] text-[13px] font-bold rounded-xl">
                <Globe size={14} /> 홈페이지
              </a>
            )}
            {store.sns_instagram && (
              <a href={`https://instagram.com/${store.sns_instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 bg-[#F5F6F8] text-[#1d1d1f] text-[13px] font-bold rounded-xl">
                <Camera size={14} /> 인스타
              </a>
            )}
            {store.sns_kakao && (
              <a href={store.sns_kakao} target="_blank" rel="noopener noreferrer" className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 bg-[#FEE500] text-[#191919] text-[13px] font-bold rounded-xl">
                <MessageCircle size={14} /> 카톡
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[#3182F6]">{icon}</span>
        <h2 className="text-[16px] font-extrabold text-[#1d1d1f]">{label}</h2>
      </div>
      {sub && <span className="text-[12px] text-[#86868B]">{sub}</span>}
    </div>
  );
}

function InfoSection({ store, building }: { store: StoreBrand; building: { name: string; address: string | null } | null }) {
  if (!store.description) return null;
  return (
    <section className="px-4 mt-4">
      <div className="bg-white rounded-2xl p-4">
        <SectionTitle icon={<Tag size={16} />} label="매장 소개" />
        <p className="text-[14px] text-[#1d1d1f] leading-relaxed whitespace-pre-line">{store.description}</p>
        {(store.parking_info || building?.address) && (
          <div className="mt-3 pt-3 border-t border-[#F2F2F4] space-y-1.5 text-[12px] text-[#86868B]">
            {building?.address && (
              <p className="flex items-start gap-1.5"><MapPin size={12} className="mt-0.5 shrink-0" /> {building.address}</p>
            )}
            {store.parking_info && (
              <p className="flex items-start gap-1.5">🅿️ <span>{store.parking_info}</span></p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function MenuSection({ menus }: { menus: StoreMenu[] }) {
  const cats = Array.from(new Set(menus.map(m => m.category ?? "기타")));
  const [active, setActive] = useState<string>(cats[0] ?? "기타");
  const filtered = menus.filter(m => (m.category ?? "기타") === active);
  return (
    <section className="px-4 mt-3">
      <div className="bg-white rounded-2xl p-4">
        <SectionTitle icon={<Tag size={16} />} label="메뉴" sub={`총 ${menus.length}종`} />
        {cats.length > 1 && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto -mx-1 px-1">
            {cats.map(c => (
              <button key={c}
                onClick={() => setActive(c)}
                className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold border
                  ${active === c ? "bg-[#1d1d1f] text-white border-[#1d1d1f]" : "bg-white text-[#1d1d1f] border-[#E5E5EA]"}`}>
                {c}
              </button>
            ))}
          </div>
        )}
        <ul className="divide-y divide-[#F2F2F4]">
          {filtered.map(m => (
            <li key={m.id} className="py-3 flex items-center gap-3">
              {m.image_url ? (
                <img src={m.image_url} alt="" className="w-16 h-16 rounded-xl object-cover bg-[#F5F6F8]" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#F5F6F8] flex items-center justify-center text-2xl">🍽️</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[14px] font-bold text-[#1d1d1f] truncate">{m.name}</p>
                  {m.is_signature && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#B45309]">시그니처</span>}
                  {!m.is_available && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F2F2F4] text-[#86868B]">품절</span>}
                </div>
                {m.description && <p className="text-[12px] text-[#86868B] truncate mt-0.5">{m.description}</p>}
              </div>
              {m.price !== null && (
                <p className="text-[14px] font-extrabold text-[#1d1d1f] tabular-nums shrink-0">
                  {m.price.toLocaleString()}원
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HoursSection({ hours }: { hours: StoreHour[] }) {
  const todayDow = todayIdx();
  return (
    <section className="px-4 mt-3">
      <div className="bg-white rounded-2xl p-4">
        <SectionTitle icon={<Clock size={16} />} label="영업시간" />
        <ul className="space-y-1.5">
          {DAYS.map((d, idx) => {
            const h = hours.find(x => x.day_of_week === idx);
            const isToday = idx === todayDow;
            return (
              <li key={idx} className={`flex items-center justify-between text-[13px] ${isToday ? "font-bold text-[#1d1d1f]" : "text-[#3C3C43]"}`}>
                <span className="w-8">
                  {d}{isToday && <span className="ml-1 text-[10px] text-[#3182F6]">오늘</span>}
                </span>
                <span className="tabular-nums">
                  {!h || h.is_closed ? <span className="text-[#DC2626]">휴무</span> :
                    `${h.open_time ?? "—"} ~ ${h.close_time ?? "—"}`}
                  {h?.break_start && h?.break_end && (
                    <span className="ml-2 text-[11px] text-[#86868B]">브레이크 {h.break_start}~{h.break_end}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function EventsSection({ events }: { events: StoreEvent[] }) {
  return (
    <section className="px-4 mt-3">
      <div className="bg-white rounded-2xl p-4">
        <SectionTitle icon={<CalendarDays size={16} />} label="진행중인 이벤트" />
        <ul className="space-y-3">
          {events.map(e => (
            <li key={e.id} className="rounded-xl border border-[#F2F2F4] overflow-hidden">
              {e.image_url && <img src={e.image_url} alt="" className="w-full h-40 object-cover" />}
              <div className="p-3">
                <p className="text-[14px] font-bold text-[#1d1d1f]">{e.title}</p>
                {e.description && <p className="text-[13px] text-[#3C3C43] mt-1 leading-relaxed whitespace-pre-line">{e.description}</p>}
                {(e.start_date || e.end_date) && (
                  <p className="text-[11px] text-[#86868B] mt-2">
                    {e.start_date} ~ {e.end_date}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CouponsSection({ coupons }: { coupons: StoreCouponDetail[] }) {
  const [used, setUsed] = useState<Record<string, boolean>>({});
  async function use(c: StoreCouponDetail) {
    if (used[c.id]) return;
    try {
      await publicUseCoupon(c.id, null);
      setUsed(s => ({ ...s, [c.id]: true }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "쿠폰 사용 처리에 실패했습니다.");
    }
  }
  return (
    <section className="px-4 mt-3">
      <div className="bg-white rounded-2xl p-4">
        <SectionTitle icon={<Tag size={16} />} label="쿠폰" />
        <ul className="space-y-2">
          {coupons.map(c => (
            <li key={c.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: `${c.color}10`, border: `1px dashed ${c.color}55` }}>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center font-extrabold text-[14px] text-white shrink-0" style={{ background: c.color }}>
                {c.discount}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#1d1d1f] truncate">{c.title}</p>
                {c.description && <p className="text-[12px] text-[#86868B] truncate">{c.description}</p>}
                <p className="text-[11px] text-[#86868B] mt-0.5">~{c.expiry}{c.code && <> · 코드 <strong>{c.code}</strong></>}</p>
              </div>
              <button
                onClick={() => use(c)}
                disabled={used[c.id]}
                className={`shrink-0 h-9 px-3 rounded-lg text-[12px] font-bold ${used[c.id] ? "bg-[#F2F2F4] text-[#86868B]" : "bg-[#1d1d1f] text-white"}`}>
                {used[c.id] ? "사용완료" : "사용하기"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ReviewsSection({
  reviews, storeId, avgRating, onCreated,
}: { reviews: StoreReview[]; storeId: string; avgRating: number | null; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="px-4 mt-3">
      <div className="bg-white rounded-2xl p-4">
        <SectionTitle
          icon={<Star size={16} />}
          label="리뷰"
          sub={avgRating !== null ? `평균 ${avgRating.toFixed(1)} · ${reviews.length}개` : "아직 없음"}
        />

        {reviews.length === 0 ? (
          <p className="text-[13px] text-[#86868B] py-4 text-center">첫 리뷰를 남겨주세요!</p>
        ) : (
          <ul className="space-y-3">
            {reviews.slice(0, 5).map(r => (
              <li key={r.id} className="border border-[#F2F2F4] rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-bold text-[#1d1d1f]">{r.author_nickname}</p>
                    <div className="flex">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={12} className={i <= r.rating ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#D4D6DA]"} />
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#86868B]">{r.created_at.slice(0, 10)}</p>
                </div>
                {r.content && <p className="text-[13px] text-[#3C3C43] mt-1.5 leading-relaxed">{r.content}</p>}
                {r.owner_reply && (
                  <div className="mt-2 ml-2 pl-3 border-l-2 border-[#3182F6] bg-[#F0F7FF] rounded-r-lg p-2">
                    <p className="text-[11px] font-bold text-[#3182F6] mb-1">사장님 답글</p>
                    <p className="text-[12px] text-[#1d1d1f] leading-relaxed">{r.owner_reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <button onClick={() => setOpen(true)} className="mt-3 w-full h-10 rounded-xl bg-[#F5F6F8] text-[#1d1d1f] text-[13px] font-bold">
          리뷰 작성
        </button>

        {open && <ReviewModal storeId={storeId} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); onCreated(); }} />}
      </div>
    </section>
  );
}

function ReviewModal({ storeId, onClose, onCreated }: { storeId: string; onClose: () => void; onCreated: () => void }) {
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!author.trim() || !content.trim()) return;
    setBusy(true);
    try {
      await publicCreateReview({ store_id: storeId, author_nickname: author.trim(), rating, content: content.trim(), images: [] });
      onCreated();
    } catch (e) {
      alert(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:px-4">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5">
        <h3 className="text-[16px] font-extrabold text-[#1d1d1f] mb-3">리뷰 작성</h3>
        <input
          value={author}
          onChange={e => setAuthor(e.target.value)}
          placeholder="닉네임"
          className="w-full h-10 rounded-lg border border-[#E5E5EA] px-3 text-[14px] mb-2"
        />
        <div className="flex items-center gap-1 mb-2">
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setRating(n)} type="button">
              <Star size={26} className={n <= rating ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#D4D6DA]"} />
            </button>
          ))}
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="방문 경험을 알려주세요"
          rows={4}
          className="w-full rounded-lg border border-[#E5E5EA] p-3 text-[14px] resize-none mb-3"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg bg-[#F2F2F4] text-[#1d1d1f] text-[13px] font-bold">취소</button>
          <button onClick={submit} disabled={busy} className="flex-1 h-10 rounded-lg bg-[#3182F6] text-white text-[13px] font-bold disabled:opacity-50">
            {busy ? "전송 중…" : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MapSection({ building }: { building: { name: string; address: string | null; lat: number | null; lng: number | null } }) {
  if (!building.lat || !building.lng) return null;
  const naverUrl = `https://map.naver.com/p/search/${encodeURIComponent(building.address ?? building.name)}`;
  return (
    <section className="px-4 mt-3">
      <div className="bg-white rounded-2xl p-4">
        <SectionTitle icon={<MapPin size={16} />} label="찾아오시는 길" />
        <div className="rounded-xl overflow-hidden border border-[#F2F2F4]">
          <iframe
            title="map"
            className="w-full h-44"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${building.lng - 0.005}%2C${building.lat - 0.003}%2C${building.lng + 0.005}%2C${building.lat + 0.003}&layer=mapnik&marker=${building.lat}%2C${building.lng}`}
          />
        </div>
        {building.address && (
          <p className="mt-2 text-[12px] text-[#3C3C43] flex items-start gap-1.5">
            <MapPin size={12} className="mt-0.5 shrink-0 text-[#86868B]" /> {building.address}
          </p>
        )}
        <a href={naverUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex h-9 px-3 items-center rounded-lg bg-[#03C75A] text-white text-[12px] font-bold">
          네이버 지도에서 길찾기
        </a>
      </div>
    </section>
  );
}

function ReserveSection({ storeId, onCreated }: { storeId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [size, setSize] = useState(2);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("18:00");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await publicCreateReservation({
        store_id: storeId,
        customer_name: name.trim(),
        customer_phone: phone.trim() || null,
        party_size: size,
        reservation_date: date,
        reservation_time: time,
        status: "pending",
        note: null,
      });
      setDone(true);
      onCreated();
    } catch (e) {
      alert(e instanceof Error ? e.message : "예약 실패");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="px-4 mt-3">
        <div className="bg-white rounded-2xl p-6 text-center">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-[15px] font-bold text-[#1d1d1f]">예약이 신청되었어요</p>
          <p className="text-[12px] text-[#86868B] mt-1">매장 확인 후 연락드릴게요.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 mt-3">
      <div className="bg-white rounded-2xl p-4">
        <SectionTitle icon={<CalendarDays size={16} />} label="예약하기" />
        <div className="space-y-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="이름" className="w-full h-10 rounded-lg border border-[#E5E5EA] px-3 text-[14px]" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="연락처 (선택)" className="w-full h-10 rounded-lg border border-[#E5E5EA] px-3 text-[14px]" />
          <div className="grid grid-cols-3 gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 rounded-lg border border-[#E5E5EA] px-3 text-[14px]" />
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="h-10 rounded-lg border border-[#E5E5EA] px-3 text-[14px]" />
            <input type="number" min={1} max={20} value={size} onChange={e => setSize(Number(e.target.value))} className="h-10 rounded-lg border border-[#E5E5EA] px-3 text-[14px]" />
          </div>
          <button onClick={submit} disabled={busy} className="w-full h-11 rounded-xl bg-[#3182F6] text-white text-[14px] font-bold disabled:opacity-50">
            {busy ? "전송 중…" : "예약 신청"}
          </button>
        </div>
      </div>
    </section>
  );
}

function WaitingSection({ storeId, onCreated }: { storeId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [size, setSize] = useState(2);
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<number | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await publicCreateWaiting({
        store_id: storeId,
        customer_name: name.trim(),
        customer_phone: phone.trim() || null,
        party_size: size,
        status: "waiting",
        note: null,
      });
      setQueue(res.queue_number);
      onCreated();
    } catch (e) {
      alert(e instanceof Error ? e.message : "웨이팅 실패");
    } finally {
      setBusy(false);
    }
  }

  if (queue !== null) {
    return (
      <section className="px-4 mt-3">
        <div className="bg-white rounded-2xl p-6 text-center">
          <p className="text-[12px] text-[#86868B]">내 대기번호</p>
          <p className="text-5xl font-extrabold text-[#3182F6] my-2">{queue}</p>
          <p className="text-[13px] text-[#3C3C43]">호출 시 연락드릴게요.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 mt-3">
      <div className="bg-white rounded-2xl p-4">
        <SectionTitle icon={<Clock size={16} />} label="웨이팅 등록" />
        <div className="space-y-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="이름" className="w-full h-10 rounded-lg border border-[#E5E5EA] px-3 text-[14px]" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="연락처 (선택)" className="w-full h-10 rounded-lg border border-[#E5E5EA] px-3 text-[14px]" />
          <input type="number" min={1} max={20} value={size} onChange={e => setSize(Number(e.target.value))} placeholder="인원" className="w-full h-10 rounded-lg border border-[#E5E5EA] px-3 text-[14px]" />
          <button onClick={submit} disabled={busy} className="w-full h-11 rounded-xl bg-[#1d1d1f] text-white text-[14px] font-bold disabled:opacity-50">
            {busy ? "등록 중…" : "웨이팅 등록"}
          </button>
        </div>
      </div>
    </section>
  );
}
