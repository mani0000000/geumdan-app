"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, AlertTriangle, Coins, Tag, FileText,
  Bookmark, UserX, Loader2,
} from "lucide-react";
import {
  getDeleteAccountSummary, getDownloadedCoupons, deleteAccount,
  type DeleteAccountSummary, type DownloadedCoupon,
} from "@/lib/db/userdata";

const REASONS = [
  "앱을 잘 사용하지 않아요",
  "원하는 정보·기능이 없어요",
  "알림이 너무 많아요",
  "개인정보가 걱정돼요",
  "오류·불편이 잦아요",
  "기타",
];

export default function DeleteAccountPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<DeleteAccountSummary | null>(null);
  const [coupons, setCoupons] = useState<DownloadedCoupon[]>([]);
  const [reason, setReason] = useState("");
  const [reasonEtc, setReasonEtc] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    getDeleteAccountSummary().then(setSummary);
    getDownloadedCoupons().then(setCoupons);
  }, []);

  async function handleDelete() {
    setSubmitting(true);
    const finalReason = reason === "기타" ? reasonEtc.trim() : reason;
    try {
      await deleteAccount(finalReason);
      router.replace("/login/");
    } catch {
      setSubmitting(false);
      setConfirmOpen(false);
      alert("탈퇴 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  const pts = summary?.points ?? 0;
  const couponCount = summary?.couponCount ?? 0;
  const postCount = summary?.postCount ?? 0;
  const commentCount = summary?.commentCount ?? 0;

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-32">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-[#f5f5f7] bg-white sticky top-0 z-10">
        <button onClick={() => router.back()} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#1d1d1f]" />
        </button>
        <h1 className="text-[18px] font-bold text-[#1d1d1f]">회원 탈퇴</h1>
      </div>

      {/* 경고 배너 */}
      <div className="mx-4 mt-4 bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-4">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={20} className="text-[#F04452] shrink-0 mt-0.5" />
          <div>
            <p className="text-[15px] font-bold text-[#B91C1C]">탈퇴 전 꼭 확인해 주세요</p>
            <p className="text-[13px] text-[#DC2626] mt-1 leading-relaxed">
              탈퇴하면 아래 데이터가 모두 소멸되며, 한 번 삭제된 정보는 복구할 수 없어요.
            </p>
          </div>
        </div>
      </div>

      {/* 소멸 안내 카드 */}
      <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden">
        <p className="px-4 pt-4 pb-1 text-[13px] font-bold text-[#6e6e73]">소멸되는 데이터</p>

        {/* 포인트 */}
        <div className="flex items-start gap-3 px-4 py-4 border-b border-[#f5f5f7]">
          <div className="w-9 h-9 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0">
            <Coins size={18} className="text-[#D97706]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-[#1d1d1f]">보유 포인트</p>
              <p className="text-[16px] font-black text-[#F04452]">{pts.toLocaleString()}P</p>
            </div>
            <p className="text-[13px] text-[#6e6e73] mt-0.5 leading-relaxed">
              보유하신 포인트는 탈퇴 즉시 전액 소멸되며, 환불·이전되지 않아요.
            </p>
          </div>
        </div>

        {/* 쿠폰 */}
        <div className="flex items-start gap-3 px-4 py-4 border-b border-[#f5f5f7]">
          <div className="w-9 h-9 rounded-full bg-[#FFEDD5] flex items-center justify-center shrink-0">
            <Tag size={18} className="text-[#EA580C]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-[#1d1d1f]">다운로드한 쿠폰</p>
              <p className="text-[16px] font-black text-[#F04452]">{couponCount}장</p>
            </div>
            <p className="text-[13px] text-[#6e6e73] mt-0.5 leading-relaxed">
              미사용 쿠폰도 모두 사라지며 재발급되지 않아요.
            </p>
            {coupons.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {coupons.slice(0, 8).map(c => (
                  <div key={c.id} className="flex items-center gap-2 bg-[#f5f5f7] rounded-lg px-3 py-2">
                    <span className="text-[12px] font-bold text-[#EA580C] shrink-0">{c.discount}</span>
                    <span className="text-[13px] text-[#1d1d1f] truncate">{c.title}</span>
                    <span className="text-[12px] text-[#86868b] ml-auto shrink-0">{c.store_name}</span>
                  </div>
                ))}
                {coupons.length > 8 && (
                  <p className="text-[12px] text-[#86868b] px-1">외 {coupons.length - 8}장</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 글/댓글 */}
        <div className="flex items-start gap-3 px-4 py-4 border-b border-[#f5f5f7]">
          <div className="w-9 h-9 rounded-full bg-[#E0E7FF] flex items-center justify-center shrink-0">
            <FileText size={18} className="text-[#4F46E5]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-[#1d1d1f]">작성한 글·댓글</p>
              <p className="text-[14px] font-bold text-[#6e6e73]">글 {postCount} · 댓글 {commentCount}</p>
            </div>
            <p className="text-[13px] text-[#6e6e73] mt-0.5 leading-relaxed">
              작성하신 글과 댓글은 삭제되지 않고 <strong className="text-[#1d1d1f]">‘탈퇴한 회원’</strong>으로
              익명 처리되어 커뮤니티에 남아요. 개별 삭제를 원하시면 탈퇴 전 직접 삭제해 주세요.
            </p>
          </div>
        </div>

        {/* 북마크 */}
        <div className="flex items-start gap-3 px-4 py-4 border-b border-[#f5f5f7]">
          <div className="w-9 h-9 rounded-full bg-[#FEF9C3] flex items-center justify-center shrink-0">
            <Bookmark size={18} className="text-[#CA8A04]" />
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-bold text-[#1d1d1f]">즐겨찾기·북마크</p>
            <p className="text-[13px] text-[#6e6e73] mt-0.5 leading-relaxed">
              즐겨찾는 버스·상가, 관심 아파트 등 모든 북마크 데이터가 영구 삭제돼요.
            </p>
          </div>
        </div>

        {/* 재가입 안내 */}
        <div className="flex items-start gap-3 px-4 py-4">
          <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0">
            <UserX size={18} className="text-[#6B7280]" />
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-bold text-[#1d1d1f]">탈퇴 후 재가입 안내</p>
            <p className="text-[13px] text-[#6e6e73] mt-0.5 leading-relaxed">
              탈퇴 후 언제든 다시 가입할 수 있지만, 새 계정으로 시작되며
              이전 활동 내역·포인트·등급은 복구되지 않아요.
            </p>
          </div>
        </div>
      </div>

      {/* 탈퇴 사유 (선택) */}
      <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden">
        <p className="px-4 pt-4 pb-2 text-[13px] font-bold text-[#6e6e73]">탈퇴 사유 (선택)</p>
        <div className="px-4 pb-4 space-y-2">
          {REASONS.map(r => (
            <button key={r} onClick={() => setReason(r)}
              className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-left transition-colors ${
                reason === r ? "bg-[#e8f1fd] ring-1 ring-[#0071e3]" : "bg-[#f5f5f7]"
              }`}>
              <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                reason === r ? "border-[#0071e3] bg-[#0071e3]" : "border-[#d2d2d7]"
              }`} />
              <span className="text-[14px] text-[#1d1d1f]">{r}</span>
            </button>
          ))}
          {reason === "기타" && (
            <textarea
              value={reasonEtc}
              onChange={e => setReasonEtc(e.target.value)}
              placeholder="불편했던 점을 알려주시면 개선에 참고할게요."
              rows={3}
              className="w-full mt-1 px-3 py-2.5 bg-[#f5f5f7] rounded-xl text-[14px] text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
            />
          )}
        </div>
      </div>

      {/* 동의 + 탈퇴 버튼 */}
      <div className="mx-4 mt-3">
        <label className="flex items-start gap-2.5 bg-white rounded-2xl p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-[#F04452] shrink-0"
          />
          <span className="text-[14px] text-[#1d1d1f] leading-relaxed">
            위 안내를 모두 확인했으며, <strong className="text-[#F04452]">포인트·쿠폰·북마크 등
            모든 데이터가 소멸</strong>되고 복구할 수 없음에 동의합니다.
          </span>
        </label>

        <button
          disabled={!agreed || submitting}
          onClick={() => setConfirmOpen(true)}
          className={`mt-3 w-full py-4 rounded-2xl text-[15px] font-bold transition-colors ${
            agreed && !submitting
              ? "bg-[#F04452] text-white active:bg-[#D63341]"
              : "bg-[#E5E8EB] text-[#9CA3AF]"
          }`}>
          동의 후 탈퇴하기
        </button>
        <button
          onClick={() => router.back()}
          className="mt-2 w-full h-12 rounded-2xl text-[15px] font-medium text-[#6e6e73] bg-white active:bg-[#f5f5f7]">
          취소하고 돌아가기
        </button>
      </div>

      {/* 최종 확인 모달 */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/50">
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={24} className="text-[#F04452]" />
              </div>
              <p className="text-[17px] font-bold text-[#1d1d1f]">정말 탈퇴하시겠어요?</p>
              <p className="text-[14px] text-[#6e6e73] mt-1.5 leading-relaxed">
                {pts.toLocaleString()}P와 쿠폰 {couponCount}장이 즉시 소멸되며
                이 작업은 되돌릴 수 없어요.
              </p>
            </div>
            <div className="flex border-t border-[#f5f5f7]">
              <button
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-4 text-[15px] font-medium text-[#6e6e73] active:bg-[#f5f5f7] border-r border-[#f5f5f7]">
                취소
              </button>
              <button
                disabled={submitting}
                onClick={handleDelete}
                className="flex-1 py-4 text-[15px] font-bold text-[#F04452] active:bg-[#FEF2F2] flex items-center justify-center gap-1.5">
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "처리 중…" : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
