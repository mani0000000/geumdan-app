"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DiagResult {
  keySource: string;
  keyPrefix: string;
  isServiceKey: boolean;
  readResults: Record<string, string>;
  writeResult: string;
  writeOk: boolean;
  allReadOk: boolean;
  advice: string;
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

  useEffect(() => {
    if (!diag) return;
    if (diag.allReadOk && diag.writeOk) router.replace("/admin/stores");
  }, [diag, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[15px] text-gray-500 animate-pulse">연결 확인 중…</div>
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

  const readEntries = Object.entries(diag.readResults ?? {});
  const failedReads = readEntries.filter(([, v]) => !v.startsWith("✅"));
  const okReads = readEntries.filter(([, v]) => v.startsWith("✅"));
  const allOk = diag.allReadOk && diag.writeOk;

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <h1 className="text-[20px] font-extrabold text-[#1d1d1f] mb-5">어드민 연결 진단</h1>

      {/* 키 상태 */}
      <div className={`rounded-2xl p-4 mb-4 ${diag.isServiceKey ? "bg-green-50" : "bg-amber-50"}`}>
        <div className="flex items-center gap-2">
          <span className="text-[18px]">{diag.isServiceKey ? "✅" : "⚠️"}</span>
          <span className="font-bold text-[15px]">
            {diag.isServiceKey ? "서비스 롤 키 (RLS 우회)" : `어논/관리 키 (${diag.keySource})`}
          </span>
        </div>
        <p className="text-[12px] text-gray-600 mt-1 font-mono">{diag.keyPrefix}</p>
      </div>

      {/* 쓰기 테스트 */}
      <div className={`rounded-2xl p-4 mb-4 ${diag.writeOk ? "bg-green-50" : "bg-red-50"}`}>
        <div className="flex items-center gap-2">
          <span className="text-[16px]">{diag.writeOk ? "✅" : "❌"}</span>
          <span className="font-bold text-[14px]">쓰기(INSERT) 테스트</span>
        </div>
        <p className="text-[12px] mt-1 font-mono text-gray-700">{diag.writeResult}</p>
      </div>

      {/* 해결책 */}
      {!allOk && diag.advice && (
        <div className="bg-blue-50 rounded-2xl p-4 mb-4">
          <p className="font-bold text-blue-700 text-[14px] mb-1">해결 방법</p>
          <p className="text-[13px] text-blue-800 leading-relaxed">{diag.advice}</p>

          {!diag.isServiceKey && (
            <div className="mt-3 bg-white/60 rounded-xl p-3 text-[12px] text-gray-700 space-y-1">
              <p className="font-bold">① Supabase 서비스 롤 키 복사</p>
              <p>Supabase → Project Settings → API → <strong>service_role</strong> secret</p>
              <p className="font-bold mt-1">② Vercel 환경변수 설정</p>
              <p>이름: <code className="bg-gray-100 px-1 rounded font-mono">SUPABASE_SERVICE_KEY</code></p>
              <p>값: 복사한 service_role 키</p>
              <p className="font-bold mt-1">③ Vercel 재배포 (Deployments → Redeploy)</p>
            </div>
          )}

          {diag.isServiceKey && !diag.writeOk && (
            <div className="mt-3 bg-white/60 rounded-xl p-3 text-[12px] text-gray-700">
              <p className="font-bold mb-1">Supabase SQL Editor에서 실행:</p>
              <pre className="bg-gray-100 rounded p-2 overflow-x-auto text-[11px] whitespace-pre-wrap">{`DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'banners','marts','stores','pharmacies',
    'community_posts','site_settings','sports_matches',
    'home_widget_config','news_articles','store_coupons',
    'store_openings','places','youtube_videos','instagram_posts'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY IF NOT EXISTS "anon_all" ON %I FOR ALL USING (true) WITH CHECK (true)',
      t);
  END LOOP;
END $$;`}</pre>
            </div>
          )}
        </div>
      )}

      {/* 실패 테이블 */}
      {failedReads.length > 0 && (
        <div className="bg-red-50 rounded-2xl p-4 mb-4">
          <p className="font-bold text-red-600 mb-3">❌ 읽기 실패 ({failedReads.length}개)</p>
          <div className="space-y-1.5">
            {failedReads.map(([table, result]) => (
              <div key={table} className="flex items-start gap-2">
                <span className="font-mono text-[12px] font-bold text-[#1d1d1f] min-w-[160px]">{table}</span>
                <span className="text-[12px] text-red-600 break-all">{result}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 정상 테이블 */}
      {okReads.length > 0 && (
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <p className="font-bold text-green-700 mb-3">✅ 읽기 정상 ({okReads.length}개)</p>
          <div className="space-y-1.5">
            {okReads.map(([table, result]) => (
              <div key={table} className="flex items-start gap-2">
                <span className="font-mono text-[12px] font-bold text-[#1d1d1f] min-w-[160px]">{table}</span>
                <span className="text-[12px] text-gray-500">{result}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {allOk && (
        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="font-bold text-blue-700">읽기·쓰기 모두 정상</p>
          <button onClick={() => router.replace("/admin/stores")}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-xl text-[13px] font-bold">
            어드민으로 이동
          </button>
        </div>
      )}

      <button onClick={() => window.location.reload()}
        className="mt-4 w-full py-3 rounded-xl border border-gray-200 text-[13px] text-gray-600 font-semibold">
        다시 진단
      </button>
    </div>
  );
}
