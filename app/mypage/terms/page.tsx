"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { fetchAllTerms, type Term } from "@/lib/db/terms";

const TYPE_LABEL: Record<Term["type"], string> = {
  service: "서비스 이용약관",
  privacy: "개인정보처리방침",
  location: "위치기반 서비스 이용약관",
  marketing: "마케팅 정보 수신 동의",
};

const TYPE_ORDER: Term["type"][] = ["service", "privacy", "location", "marketing"];

export default function TermsListPage() {
  const router = useRouter();
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllTerms().then(rows => {
      const active = rows.filter(t => t.is_active);
      active.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
      setTerms(active);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-dvh bg-[#f5f5f7]">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="flex items-center gap-2 h-[52px] px-4">
          <button onClick={() => router.back()} aria-label="뒤로" className="active:opacity-60">
            <ChevronLeft size={24} className="text-[#1d1d1f]" />
          </button>
          <h1 className="text-[18px] font-bold text-[#1d1d1f]">약관 및 정책</h1>
        </div>
      </header>

      <div className="px-4 pt-4 pb-10">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-2xl bg-white animate-pulse" />
            ))}
          </div>
        ) : terms.length === 0 ? (
          <div className="bg-white rounded-2xl py-12 px-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#f5f5f7] flex items-center justify-center mb-3">
              <ScrollText size={28} className="text-[#86868b]" />
            </div>
            <p className="text-[15px] font-bold text-[#1d1d1f]">등록된 약관이 없어요</p>
          </div>
        ) : (
          <ul className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-[#f5f5f7]">
            {terms.map(t => (
              <li key={t.id}>
                <Link
                  href={`/terms/${t.type}/`}
                  className="w-full flex items-center px-4 py-4 active:bg-[#f5f5f7] transition-colors"
                >
                  <ScrollText size={18} className="text-[#6e6e73] mr-3 shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[15px] font-semibold text-[#1d1d1f] truncate">
                      {t.title || TYPE_LABEL[t.type]}
                    </p>
                    <p className="text-[12px] text-[#86868b] mt-0.5">
                      버전 {t.version} · 시행일 {t.effective_date}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-[#d2d2d7] shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
