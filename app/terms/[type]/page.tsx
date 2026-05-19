"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, FileText } from "lucide-react";
import { fetchTerm, type Term } from "@/lib/db/terms";

const TYPE_MAP: Record<string, Term["type"]> = {
  service: "service",
  privacy: "privacy",
  location: "location",
  marketing: "marketing",
};

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return (
        <h2 key={i} className="text-[16px] font-extrabold text-[#1d1d1f] mt-6 mb-2 first:mt-0">
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith("• ")) {
      return (
        <p key={i} className="text-[14px] text-[#3d3d3f] leading-relaxed pl-3">
          {line}
        </p>
      );
    }
    if (line.trim() === "") {
      return <div key={i} className="h-2" />;
    }
    return (
      <p key={i} className="text-[14px] text-[#3d3d3f] leading-relaxed">
        {line}
      </p>
    );
  });
}

export default function TermsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const typeParam = Array.isArray(params.type) ? params.type[0] : (params.type ?? "");
  const termType = TYPE_MAP[typeParam];

  const [term, setTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!termType) { setNotFound(true); setLoading(false); return; }
    fetchTerm(termType).then(t => {
      if (!t) setNotFound(true);
      else setTerm(t);
      setLoading(false);
    });
  }, [termType]);

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#f0f0f3]">
        <div className="flex items-center h-[52px] px-4 gap-2">
          <button onClick={() => router.back()} className="active:opacity-60 p-1 -ml-1">
            <ChevronLeft size={24} className="text-[#1d1d1f]" />
          </button>
          <h1 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight flex-1 truncate">
            {term?.title ?? "약관"}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-5 py-5 pb-16">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-5 bg-[#f0f0f3] rounded-lg w-2/3" />
            <div className="h-4 bg-[#f0f0f3] rounded-lg w-full" />
            <div className="h-4 bg-[#f0f0f3] rounded-lg w-5/6" />
            <div className="h-4 bg-[#f0f0f3] rounded-lg w-full" />
          </div>
        ) : notFound ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <FileText size={40} className="text-[#c7c7cc]" />
            <p className="text-[15px] text-[#86868b]">약관을 찾을 수 없어요</p>
          </div>
        ) : term ? (
          <>
            <div className="mb-5 pb-4 border-b border-[#f0f0f3]">
              <p className="text-[12px] text-[#86868b]">
                버전 {term.version} · 시행일 {term.effective_date}
              </p>
            </div>
            <div className="space-y-0.5">
              {renderContent(term.content)}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
