"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { fetchNoticeById, type Notice } from "@/lib/db/notices";
import { supabase } from "@/lib/supabase";

export async function generateStaticParams() {
  try {
    const { data } = await supabase.from("notices").select("id");
    if (data && data.length > 0) return data.map((n: { id: string }) => ({ id: String(n.id) }));
  } catch { /* fallback */ }
  return [];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function NoticeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchNoticeById(id)
      .then(setNotice)
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 flex items-center h-[52px] px-2">
        <button
          onClick={() => router.push("/notices")}
          className="p-2 rounded-xl active:bg-[#f5f5f7] text-[#1d1d1f]"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-bold text-[#1d1d1f] mr-10">공지사항</h1>
      </div>

      {loading ? (
        <div className="px-4 pt-6 space-y-4 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/4" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded" />
            <div className="h-4 bg-gray-100 rounded w-5/6" />
            <div className="h-4 bg-gray-100 rounded w-4/6" />
          </div>
        </div>
      ) : !notice ? (
        <div className="text-center py-20 text-[#86868b] text-[15px]">
          공지사항을 찾을 수 없습니다
        </div>
      ) : (
        <div className="px-4 pt-6">
          {notice.is_pinned && (
            <span className="inline-block text-[12px] font-bold bg-[#FEF3C7] text-[#92400E] px-2.5 py-1 rounded-full mb-3">
              📌 고정 공지
            </span>
          )}
          <h1 className="text-[22px] font-extrabold text-[#1d1d1f] leading-tight mb-2">
            {notice.title}
          </h1>
          <p className="text-[13px] text-[#86868b] mb-5">{formatDate(notice.created_at)}</p>

          {notice.image_url && (
            <img
              src={notice.image_url}
              alt={notice.title}
              className="w-full rounded-2xl object-cover mb-5 max-h-[320px]"
            />
          )}

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-[15px] text-[#1d1d1f] leading-relaxed whitespace-pre-wrap">
              {notice.content}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
