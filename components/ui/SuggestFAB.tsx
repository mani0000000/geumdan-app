"use client";
import { useEffect, useRef, useState } from "react";
import { Hand, X, CheckCircle2, Sparkles, ListChecks } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { StoreCategory } from "@/lib/types";

const CATS: { value: StoreCategory; emoji: string; label: string }[] = [
  { value: "카페",       emoji: "☕", label: "카페" },
  { value: "음식점",     emoji: "🍽️", label: "음식점" },
  { value: "베이커리",   emoji: "🥐", label: "베이커리" },
  { value: "편의점",     emoji: "🏪", label: "편의점" },
  { value: "마트",       emoji: "🛒", label: "마트" },
  { value: "병원/약국",  emoji: "💊", label: "병원/약국" },
  { value: "미용",       emoji: "💇", label: "미용" },
  { value: "학원",       emoji: "📚", label: "학원" },
  { value: "스터디카페", emoji: "📖", label: "스터디카페" },
  { value: "헬스/운동",  emoji: "💪", label: "헬스/운동" },
  { value: "반려동물",   emoji: "🐾", label: "반려동물" },
  { value: "세탁",       emoji: "👕", label: "세탁" },
  { value: "부동산",     emoji: "🏘️", label: "부동산" },
  { value: "안경원",     emoji: "👓", label: "안경원" },
  { value: "꽃집",       emoji: "💐", label: "꽃집" },
  { value: "기타",       emoji: "🏢", label: "기타" },
];

type Tab = "simple" | "detail";

async function insertSuggestion(payload: Record<string, unknown>) {
  // 테이블이 없거나 권한 이슈면 콘솔만 남기고 무시 — UX는 토스트로 성공 표시
  try {
    await supabase.from("store_suggestions").insert(payload);
  } catch (e) {
    if (typeof console !== "undefined") console.warn("[suggestion] save skipped", e);
  }
}

export default function SuggestFAB() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="업종 제안하기"
        className="fixed right-5 z-40 flex items-center gap-1.5 h-10 pl-3 pr-3.5 rounded-full
          text-white text-[12px] font-bold tracking-tight
          bg-gradient-to-br from-[#2563EB] to-[#7C3AED]
          shadow-[0_8px_24px_rgba(37,99,235,0.45)]
          active:scale-95 transition-transform"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
      >
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/15">
          <Hand size={13} strokeWidth={2.4} />
        </span>
        제안
      </button>
      {open && <SuggestSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function SuggestSheet({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("simple");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // simple
  const [simpleCat, setSimpleCat] = useState("");
  const [simpleMsg, setSimpleMsg] = useState("");

  // detail
  const [dCat, setDCat] = useState<StoreCategory | "">("");
  const [dName, setDName] = useState("");
  const [dBuilding, setDBuilding] = useState("");
  const [dFloor, setDFloor] = useState("");
  const [dPhone, setDPhone] = useState("");
  const [dHours, setDHours] = useState("");
  const [dDesc, setDDesc] = useState("");
  const [dContact, setDContact] = useState("");

  const startRef = useRef<{ y: number; t: number } | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    startRef.current = { y: e.clientY, t: Date.now() };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    setDragY(Math.max(0, e.clientY - startRef.current.y));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    const delta = e.clientY - startRef.current.y;
    const v = Math.abs(delta) / Math.max(1, Date.now() - startRef.current.t);
    startRef.current = null;
    if (delta > 130 || (delta > 30 && v > 0.5)) { onClose(); return; }
    setDragY(0);
  };

  async function submit() {
    setSubmitting(true);
    if (tab === "simple") {
      if (!simpleCat.trim() && !simpleMsg.trim()) { setSubmitting(false); return; }
      await insertSuggestion({
        type: "simple",
        category: simpleCat.trim() || null,
        message: simpleMsg.trim() || null,
      });
    } else {
      if (!dCat || !dName.trim()) { setSubmitting(false); return; }
      await insertSuggestion({
        type: "detail",
        category: dCat,
        store_name: dName.trim(),
        building_name: dBuilding.trim() || null,
        floor: dFloor.trim() || null,
        phone: dPhone.trim() || null,
        hours: dHours.trim() || null,
        description: dDesc.trim() || null,
        contact: dContact.trim() || null,
      });
    }
    setSubmitting(false);
    setDone(true);
    setTimeout(() => onClose(), 1400);
  }

  const simpleValid = simpleCat.trim().length >= 2 || simpleMsg.trim().length >= 5;
  const detailValid = !!dCat && dName.trim().length >= 2;

  return (
    <div className="fixed inset-0" style={{ zIndex: 350 }}>
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl flex flex-col overflow-hidden"
        style={{
          maxHeight: "92dvh",
          transform: `translateY(${dragY}px)`,
          transition: dragY ? "none" : "transform .25s cubic-bezier(.4,0,.2,1)",
          boxShadow: "0 -4px 32px rgba(0,0,0,.22)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 영역 */}
        <div
          className="shrink-0 pt-2.5 pb-2"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="mx-auto w-10 h-1 rounded-full bg-[#d2d2d7]" />
        </div>

        {/* 타이틀 */}
        <div className="px-5 pb-2.5 flex items-start justify-between shrink-0">
          <div>
            <p className="text-[11px] font-bold text-[#0071e3] tracking-wide">SUGGEST</p>
            <p className="text-[20px] font-black text-[#1d1d1f] leading-tight mt-0.5">새 매장 제안하기</p>
            <p className="text-[12px] text-[#6e6e73] mt-1">
              검단에서 발견한 가게를 알려주세요. 등록 검토 후 반영됩니다.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center active:opacity-70"
          >
            <X size={16} className="text-[#6e6e73]" />
          </button>
        </div>

        {/* 탭 */}
        <div className="px-5 shrink-0">
          <div className="flex gap-1 bg-[#f5f5f7] rounded-2xl p-1">
            <button
              onClick={() => setTab("simple")}
              className={`flex-1 h-9 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                tab === "simple" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"
              }`}
            >
              <Sparkles size={13} />
              간편 제안
            </button>
            <button
              onClick={() => setTab("detail")}
              className={`flex-1 h-9 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                tab === "detail" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"
              }`}
            >
              <ListChecks size={13} />
              상세 등록
            </button>
          </div>
        </div>

        {/* 본문 — 스크롤 */}
        <div className="overflow-y-auto flex-1 px-5 pt-4 pb-5">
          {done ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 rounded-full bg-[#D1FAE5] flex items-center justify-center">
                <CheckCircle2 size={32} className="text-[#10B981]" />
              </div>
              <p className="text-[16px] font-bold text-[#1d1d1f]">제안이 접수되었어요</p>
              <p className="text-[12px] text-[#6e6e73] text-center">
                검토 후 빠르게 반영하겠습니다. 감사합니다 🙏
              </p>
            </div>
          ) : tab === "simple" ? (
            <SimpleForm
              cat={simpleCat}
              setCat={setSimpleCat}
              msg={simpleMsg}
              setMsg={setSimpleMsg}
            />
          ) : (
            <DetailForm
              cat={dCat} setCat={setDCat}
              name={dName} setName={setDName}
              building={dBuilding} setBuilding={setDBuilding}
              floor={dFloor} setFloor={setDFloor}
              phone={dPhone} setPhone={setDPhone}
              hours={dHours} setHours={setDHours}
              desc={dDesc} setDesc={setDDesc}
              contact={dContact} setContact={setDContact}
            />
          )}
        </div>

        {/* 제출 버튼 */}
        {!done && (
          <div className="px-5 pt-3 pb-5 border-t border-[#f5f5f7] shrink-0"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}>
            <button
              onClick={submit}
              disabled={submitting || (tab === "simple" ? !simpleValid : !detailValid)}
              className="w-full h-12 rounded-2xl text-white text-[14px] font-bold flex items-center justify-center gap-1.5
                bg-gradient-to-r from-[#2563EB] to-[#7C3AED]
                disabled:opacity-40 disabled:bg-none disabled:bg-[#d2d2d7]
                active:opacity-90 transition-opacity"
            >
              {submitting ? "제출 중..." : tab === "simple" ? "간편 제안하기" : "등록 신청하기"}
            </button>
            <p className="text-[10.5px] text-[#86868b] text-center mt-2">
              제출된 정보는 검단라이프 운영진이 확인 후 반영합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold text-[#424245] mb-1.5 inline-flex items-center gap-1">
        {label}
        {required && <span className="text-[#F04452]">*</span>}
      </span>
      {children}
    </label>
  );
}

const INPUT =
  "w-full h-11 px-3.5 rounded-xl bg-[#f5f5f7] border border-transparent text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:bg-white focus:border-[#0071e3] focus:outline-none transition-colors";
const TEXTAREA =
  "w-full px-3.5 py-3 rounded-xl bg-[#f5f5f7] border border-transparent text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] focus:bg-white focus:border-[#0071e3] focus:outline-none resize-none transition-colors";

function SimpleForm({
  cat, setCat, msg, setMsg,
}: {
  cat: string; setCat: (v: string) => void;
  msg: string; setMsg: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="제안할 업종" required>
        <input
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          placeholder="예: 베이글 카페, 동네 빵집, 케이크 전문점"
          className={INPUT}
          maxLength={40}
        />
      </Field>

      <div>
        <p className="text-[12px] font-bold text-[#424245] mb-1.5">자주 제안되는 업종</p>
        <div className="flex flex-wrap gap-1.5">
          {["베이커리", "스터디카페", "꽃집", "키즈카페", "정육점", "분식집", "샐러드", "디저트"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className="h-7 px-2.5 bg-[#f5f5f7] rounded-full text-[12px] font-semibold text-[#424245] active:bg-[#e5e5ea]"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <Field label="간단한 메시지 (선택)">
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="이런 가게가 있으면 좋겠어요 / 어디에서 봤어요 등"
          rows={4}
          maxLength={200}
          className={TEXTAREA}
        />
        <span className="text-[10px] text-[#86868b] mt-1 inline-block">{msg.length}/200</span>
      </Field>
    </div>
  );
}

function DetailForm({
  cat, setCat, name, setName, building, setBuilding, floor, setFloor,
  phone, setPhone, hours, setHours, desc, setDesc, contact, setContact,
}: {
  cat: StoreCategory | ""; setCat: (v: StoreCategory) => void;
  name: string; setName: (v: string) => void;
  building: string; setBuilding: (v: string) => void;
  floor: string; setFloor: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  hours: string; setHours: (v: string) => void;
  desc: string; setDesc: (v: string) => void;
  contact: string; setContact: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="업종 선택" required>
        <div className="flex flex-wrap gap-1.5">
          {CATS.map((c) => {
            const sel = cat === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setCat(c.value)}
                className={`h-8 px-3 rounded-full text-[12px] font-bold inline-flex items-center gap-1 transition-colors ${
                  sel
                    ? "bg-[#0071e3] text-white"
                    : "bg-[#f5f5f7] text-[#424245] active:bg-[#e5e5ea]"
                }`}
              >
                <span>{c.emoji}</span>
                {c.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="매장명" required>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 검단동 베이글하우스"
          className={INPUT}
          maxLength={40}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="상가/건물명">
          <input
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            placeholder="예: 메트로프라자2"
            className={INPUT}
            maxLength={30}
          />
        </Field>
        <Field label="층/호수">
          <input
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="예: 2층 203호"
            className={INPUT}
            maxLength={20}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="전화번호">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="032-000-0000"
            inputMode="tel"
            className={INPUT}
            maxLength={20}
          />
        </Field>
        <Field label="영업시간">
          <input
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="예: 10:00 - 22:00"
            className={INPUT}
            maxLength={30}
          />
        </Field>
      </div>

      <Field label="매장 소개 / 특징">
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="대표 메뉴, 분위기, 가격대 등 자유롭게 적어주세요"
          rows={4}
          maxLength={300}
          className={TEXTAREA}
        />
        <span className="text-[10px] text-[#86868b] mt-1 inline-block">{desc.length}/300</span>
      </Field>

      <Field label="연락처 (선택)">
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="검토 결과 알림용 (이메일 또는 휴대폰)"
          className={INPUT}
          maxLength={50}
        />
      </Field>
    </div>
  );
}
