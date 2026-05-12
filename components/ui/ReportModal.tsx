"use client";
import { useState } from "react";
import { X } from "lucide-react";
import type { ReportReason } from "@/lib/db/reports";

const REASONS: ReportReason[] = [
  '스팸/광고', '욕설/혐오', '음란물', '개인정보 노출', '허위정보', '기타',
];

interface ReportModalProps {
  open: boolean;
  target?: string;
  onClose: () => void;
  onSubmit: (reason: ReportReason, detail: string) => void | Promise<void>;
}

export function ReportModal({ open, onClose, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    await onSubmit(reason, detail);
    setSubmitting(false);
    setDone(true);
    setTimeout(() => { setDone(false); setReason(null); setDetail(''); onClose(); }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[17px] font-bold text-gray-900">신고하기</span>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        {done ? (
          <div className="py-6 text-center">
            <p className="text-[16px] font-semibold text-gray-900">신고가 접수되었습니다</p>
            <p className="text-[14px] text-gray-500 mt-1">검토 후 조치하겠습니다</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  className={`py-2.5 rounded-xl text-[14px] font-medium border transition-colors ${
                    reason === r
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            {reason === '기타' && (
              <textarea
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder="신고 이유를 입력해주세요"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] resize-none h-20 mb-3 focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            )}
            <button onClick={handleSubmit} disabled={!reason || submitting}
              className="w-full py-3.5 bg-red-500 text-white rounded-2xl font-bold text-[15px] disabled:opacity-50 active:bg-red-600 transition-colors">
              {submitting ? '처리 중...' : '신고 제출'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
