"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchNotices, type Notice } from "@/lib/db/notices";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
        <div className="w-16 h-16 bg-gray-200 rounded-xl shrink-0" />
      </div>
    </div>
  );
}

export default function NoticesPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotices()
      .then(setNotices)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 flex items-center h-[52px] px-2">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl active:bg-[#f5f5f7] text-[#1d1d1f]"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-bold text-[#1d1d1f] mr-10">공지사항</h1>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : notices.length === 0 ? (
          <div className="text-center py-20 text-[#86868b] text-[15px]">
            등록된 공지사항이 없습니다
          </div>
        ) : (
          notices.map(notice => (
            <button
              key={notice.id}
              onClick={() => router.push(`/notices/${notice.id}`)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:bg-[#f5f5f7] transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {notice.is_pinned && (
                      <span className="text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full shrink-0">
                        📌 고정
                      </span>
                    )}
                    <p className="text-[15px] font-semibold text-[#1d1d1f] truncate">{notice.title}</p>
                  </div>
                  <p className="text-[13px] text-[#86868b]">{formatDate(notice.created_at)}</p>
                </div>
                {notice.image_url ? (
                  <img
                    src={notice.image_url}
                    alt={notice.title}
                    className="w-16 h-16 object-cover rounded-xl shrink-0"
                  />
                ) : (
                  <ChevronRight size={16} className="text-[#d2d2d7] shrink-0 mt-1" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
