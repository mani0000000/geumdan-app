"use client";
import { useState } from "react";
import { X } from "lucide-react";
import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  type ReportReason,
} from "@/lib/db/reports";

interface Props {
  open: boolean;
  target: "post" | "comment";
  onClose: () => void;
  onSubmit: (reason: ReportReason, detail: string) => Promise<void>;
}

export function ReportModal({ open, target, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const targetLabel = target === "post" ? "게시글" : "댓글";

  const reset = () => {
    setReason(null);
    setDetail("");
    setSubmitting(false);
    setDone(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(reason, detail.trim());
      setDone(true);
      setTimeout(() => { handleClose(); }, 1200);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center sm:justify-center" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative z-10 w-full max-w-[430px] mx-auto bg-white rounded-t-3xl sm:rounded-3xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#f5f5f7]">
          <h2 className="text-[17px] font-bold text-[#1d1d1f]">{targetLabel} 신고</h2>
          <button onClick={handleClose} className="active:opacity-60">
            <X size={20} className="text-[#6e6e73]" />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[16px] font-semibold text-[#0071e3]">신고가 접수되었습니다.</p>
            <p className="text-[13px] text-[#6e6e73] mt-1">검토 후 조치하겠습니다.</p>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <p className="text-[13px] font-semibold text-[#1d1d1f] mb-2">
                  신고 사유 <span className="text-[#F04452]">*</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {REPORT_REASONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setReason(r)}
                      className={`h-10 rounded-xl text-[13px] font-medium border transition-colors active:opacity-70 ${
                        reason === r
                          ? "bg-[#0071e3] text-white border-[#0071e3]"
                          : "bg-white text-[#424245] border-[#d2d2d7]"
                      }`}
                    >
                      {REPORT_REASON_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[13px] font-semibold text-[#1d1d1f] mb-2">
                  상세 사유 (선택)
                </p>
                <textarea
                  value={detail}
                  onChange={e => setDetail(e.target.value)}
                  placeholder={`구체적인 신고 사유를 입력해주세요. (최대 500자)`}
                  maxLength={500}
                  rows={4}
                  className="w-full px-3 py-2.5 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b] border border-[#d2d2d7] rounded-xl outline-none resize-none focus:border-[#0071e3]"
                />
                <p className="text-right text-[11px] text-[#86868b] mt-1">{detail.length}/500</p>
              </div>

              <div className="bg-[#FFF8E1] rounded-xl px-3.5 py-3">
                <p className="text-[12px] text-[#8C5500] leading-relaxed">
                  허위 신고 시 정보통신망법에 따라 처벌받을 수 있습니다.
                  접수된 신고는 운영진이 검토 후 처리합니다.
                </p>
              </div>
            </div>

            <div className="px-5 pt-2 pb-4 border-t border-[#f5f5f7] flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 h-11 rounded-xl border border-[#d2d2d7] text-[14px] font-semibold text-[#6e6e73] active:opacity-60"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="flex-1 h-11 rounded-xl bg-[#F04452] text-white text-[14px] font-bold disabled:opacity-40 active:opacity-80"
              >
                {submitting ? "접수 중..." : "신고하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
