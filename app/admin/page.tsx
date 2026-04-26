"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DiagResult {
  usingServiceKey: boolean;
  keyType: string;
  keyPrefix: string;
  fix: string;
  tableResults: Record<string, string>;
}

export default function AdminPage() {
  const router = useRouter();
  const [diag, setDiag] = useState<DiagResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/diag")
      .then(r => r.json())
      .then(d => { setDiag(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // If service key is set and all tables look ok, redirect to stores
  useEffect(() => {
    if (!diag) return;
    const allOk = diag.usingServiceKey &&
      Object.values(diag.tableResults).every(v => v.startsWith("✅"));
    if (allOk) router.replace("/admin/stores");
  }, [diag, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[15px] text-gray-500 animate-pulse">연결 확인 중...</div>
      </div>
    );
  }

  if (!diag) {
    return (
      <div className="p-6">
        <div className="bg-red-50 rounded-2xl p-5">
          <p className="font-bold text-red-600">진단 API 호출 실패</p>
          <p className="text-sm text-red-500 mt-1">/api/admin/diag 에 응답 없음</p>
        </div>
      </div>
    );
  }

  const tableEntries = Object.entries(diag.tableResults ?? {});
  const failedTables = tableEntries.filter(([, v]) => !v.startsWith("✅"));
  const okTables = tableEntries.filter(([, v]) => v.startsWith("✅"));

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <h1 className="text-[20px] font-extrabold text-[#1d1d1f] mb-5">어드민 연결 진단</h1>

      {/* 키 상태 */}
      <div className={`rounded-2xl p-4 mb-4 ${diag.usingServiceKey ? "bg-green-50" : "bg-amber-50"}`}>
        <div className="flex items-center gap-2">
          <span className="text-[18px]">{diag.usingServiceKey ? "✅" : "⚠️"}</span>
          <span className="font-bold text-[15px]">
            {diag.usingServiceKey ? "서비스 롤 키 사용 중 (RLS 우회)" : "어논 키 사용 중 (RLS 적용됨)"}
          </span>
        </div>
        <p className="text-[12px] text-gray-600 mt-1 font-mono">{diag.keyPrefix}</p>
        {!diag.usingServiceKey && (
          <p className="text-[13px] text-amber-700 mt-2 font-semibold">{diag.fix}</p>
        )}
      </div>

      {/* 실패한 테이블 */}
      {failedTables.length > 0 && (
        <div className="bg-red-50 rounded-2xl p-4 mb-4">
          <p className="font-bold text-red-600 mb-3">❌ 접근 불가 테이블 ({failedTables.length}개)</p>
          <div className="space-y-1.5">
            {failedTables.map(([table, result]) => (
              <div key={table} className="flex items-start gap-2">
                <span className="font-mono text-[12px] font-bold text-[#1d1d1f] min-w-[140px]">{table}</span>
                <span className="text-[12px] text-red-600">{result}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 정상 테이블 */}
      {okTables.length > 0 && (
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <p className="font-bold text-green-700 mb-3">✅ 정상 테이블 ({okTables.length}개)</p>
          <div className="space-y-1.5">
            {okTables.map(([table, result]) => (
              <div key={table} className="flex items-start gap-2">
                <span className="font-mono text-[12px] font-bold text-[#1d1d1f] min-w-[140px]">{table}</span>
                <span className="text-[12px] text-gray-500">{result}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 안내 */}
      {diag.usingServiceKey && failedTables.length === 0 && (
        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="font-bold text-blue-700">모든 테이블 접근 정상</p>
          <p className="text-[13px] text-blue-600 mt-1">
            행 수가 0이면 아직 데이터가 없는 것입니다. 각 관리 메뉴에서 직접 추가해주세요.
          </p>
          <button
            onClick={() => router.replace("/admin/stores")}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-xl text-[13px] font-bold"
          >
            어드민으로 이동
          </button>
        </div>
      )}
    </div>
  );
}
