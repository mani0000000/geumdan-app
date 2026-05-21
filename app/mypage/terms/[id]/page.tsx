"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, FileText } from "lucide-react";
import { fetchTermById, fetchAllTerms, type Term } from "@/lib/db/terms";

export function generateStaticParams() {
  return [
    { id: "service" },
    { id: "privacy" },
    { id: "location" },
    { id: "marketing" },
  ];
}

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
  const idParam = Array.isArray(params.id) ? params.id[0] : (params.id ?? "");

  const [term, setTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!idParam) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    // id가 UUID면 직접 조회, 아니면 type으로 간주해 전체 조회
    const isUuid = /^[0-9a-f-]{36}$/i.test(idParam);
    if (isUuid) {
      fetchTermById(idParam).then((t) => {
        if (!t) setNotFound(true);
        else setTerm(t);
        setLoading(false);
      });
    } else {
      fetchAllTerms().then((all) => {
        const found = all.find((t) => t.type === idParam);
        if (!found) setNotFound(true);
        else setTerm(found);
        setLoading(false);
      });
    }
  }, [idParam]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#f5f5f7] flex items-center justify-center">
        <p className="text-[15px] text-[#6e6e73]">불러오는 중...</p>
      </div>
    );
  }

  if (notFound || !term) {
    return (
      <div className="min-h-dvh bg-[#f5f5f7] flex flex-col items-center justify-center gap-4">
        <FileText size={40} className="text-[#d2d2d7]" />
        <p className="text-[15px] text-[#6e6e73]">약관을 찾을 수 없습니다.</p>
        <button
          onClick={() => router.back()}
          className="h-10 px-6 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-12">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[#f5f5f7]">
        <div className="flex items-center h-14 px-4 gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-[#f5f5f7]"
          >
            <ChevronLeft size={22} className="text-[#1d1d1f]" />
          </button>
          <h1 className="text-[17px] font-bold text-[#1d1d1f] flex-1 truncate">
            {term.title}
          </h1>
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="mx-4 mt-4 mb-2 flex items-center gap-3">
        <span className="text-[12px] text-[#6e6e73]">버전 {term.version}</span>
        <span className="text-[12px] text-[#d2d2d7]">·</span>
        <span className="text-[12px] text-[#6e6e73]">
          시행일: {term.effective_date?.slice(0, 10)}
        </span>
      </div>

      {/* 본문 */}
      <div className="mx-4 bg-white rounded-2xl px-5 py-5 space-y-0.5">
        {renderContent(term.content)}
      </div>
    </div>
  );
}
