"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Search, X, Users, UserX, Coins, Tag } from "lucide-react";
import {
  adminFetchActiveMembers, adminFetchDeletedMembers,
  type AdminMember,
} from "@/lib/db/admin-members";

type Tab = "active" | "deleted";

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });
}

export default function AdminMembersPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [active, setActive] = useState<AdminMember[]>([]);
  const [deleted, setDeleted] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, d] = await Promise.all([
        adminFetchActiveMembers(),
        adminFetchDeletedMembers(),
      ]);
      setActive(a);
      setDeleted(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const list = tab === "active" ? active : deleted;
  const q = search.trim().toLowerCase();
  const filtered = q
    ? list.filter(m =>
        m.nickname?.toLowerCase().includes(q) ||
        m.dong?.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q))
    : list;

  return (
    <div className="p-4 md:p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] md:text-[20px] font-extrabold text-[#191F28]">회원 관리</h1>
          <p className="text-[12px] text-[#8B95A1] mt-0.5">
            활성 {active.length}명 · 탈퇴 {deleted.length}명
          </p>
        </div>
        <button onClick={load}
          className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
          <RefreshCw size={15} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("active")}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${
            tab === "active"
              ? "bg-[#3182F6] text-white"
              : "bg-white border border-[#E5E8EB] text-[#4E5968] hover:bg-[#F2F4F6]"
          }`}>
          <Users size={15} />
          일반 회원 <span className="opacity-80">{active.length}</span>
        </button>
        <button onClick={() => setTab("deleted")}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-colors ${
            tab === "deleted"
              ? "bg-[#F04452] text-white"
              : "bg-white border border-[#E5E8EB] text-[#4E5968] hover:bg-[#F2F4F6]"
          }`}>
          <UserX size={15} />
          탈퇴 회원 <span className="opacity-80">{deleted.length}</span>
        </button>
      </div>

      {/* 검색 */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0B8C1]" />
        <input
          className="w-full pl-9 pr-4 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]"
          placeholder="닉네임·동·ID 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0B8C1]">
            <X size={14} />
          </button>
        )}
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {/* 데스크탑 헤더 */}
        <div className={`hidden md:grid ${
          tab === "active"
            ? "grid-cols-[1fr_auto_auto_auto_auto]"
            : "grid-cols-[1fr_auto_auto_auto_auto]"
        } gap-0 bg-[#F8F9FB] border-b border-[#E5E8EB] px-4 py-2.5`}>
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase">회원</span>
          {tab === "active" ? (
            <>
              <span className="text-[11px] font-bold text-[#8B95A1] uppercase text-center w-20">활동</span>
              <span className="text-[11px] font-bold text-[#8B95A1] uppercase text-center w-20">포인트</span>
              <span className="text-[11px] font-bold text-[#8B95A1] uppercase text-center w-20">등급</span>
              <span className="text-[11px] font-bold text-[#8B95A1] uppercase text-center w-28">가입일</span>
            </>
          ) : (
            <>
              <span className="text-[11px] font-bold text-[#8B95A1] uppercase text-center w-28">탈퇴일</span>
              <span className="text-[11px] font-bold text-[#8B95A1] uppercase text-center w-40">탈퇴 사유</span>
              <span className="text-[11px] font-bold text-[#8B95A1] uppercase text-center w-24">소멸 P</span>
              <span className="text-[11px] font-bold text-[#8B95A1] uppercase text-center w-24">소멸 쿠폰</span>
            </>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#B0B8C1] text-[13px]">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-[#B0B8C1] text-[13px]">
            {tab === "active" ? "회원 없음" : "탈퇴 회원 없음"}
          </div>
        ) : (
          <div className="divide-y divide-[#F2F4F6]">
            {filtered.map(m => (
              <div key={m.id}>
                {/* 데스크탑 행 */}
                <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 items-center px-4 py-3 hover:bg-[#F8F9FB]">
                  <div className="min-w-0 pr-4">
                    <p className="text-[13px] font-semibold text-[#191F28] truncate">
                      {m.nickname || "검단주민"}
                      <span className="text-[11px] text-[#B0B8C1] ml-1.5">{m.dong}</span>
                    </p>
                    <p className="text-[11px] text-[#B0B8C1] font-mono truncate">{m.id.slice(0, 8)}</p>
                  </div>
                  {tab === "active" ? (
                    <>
                      <div className="w-20 text-center text-[12px] text-[#4E5968]">
                        글{m.post_count} · 댓{m.comment_count}
                      </div>
                      <div className="w-20 text-center text-[13px] font-bold text-[#3182F6]">
                        {(m.points ?? 0).toLocaleString()}P
                      </div>
                      <div className="w-20 text-center">
                        <span className="text-[11px] font-bold bg-[#F2F4F6] text-[#4E5968] px-2 py-0.5 rounded-full">
                          {m.level}
                        </span>
                      </div>
                      <div className="w-28 text-center text-[12px] text-[#8B95A1]">{fmtDate(m.joined_at)}</div>
                    </>
                  ) : (
                    <>
                      <div className="w-28 text-center text-[12px] text-[#8B95A1]">{fmtDate(m.deleted_at)}</div>
                      <div className="w-40 text-center text-[12px] text-[#4E5968] truncate px-1">
                        {m.deletion_reason || <span className="text-[#B0B8C1]">미입력</span>}
                      </div>
                      <div className="w-24 text-center text-[13px] font-bold text-[#F04452]">
                        {(m.deleted_points ?? 0).toLocaleString()}P
                      </div>
                      <div className="w-24 text-center text-[13px] font-bold text-[#EA580C]">
                        {m.deleted_coupon_count ?? 0}장
                      </div>
                    </>
                  )}
                </div>

                {/* 모바일 카드 */}
                <div className="md:hidden p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-[#191F28] truncate">
                        {m.nickname || "검단주민"}
                        <span className="text-[11px] text-[#B0B8C1] ml-1.5">{m.dong}</span>
                      </p>
                      <p className="text-[11px] text-[#B0B8C1] font-mono">{m.id.slice(0, 8)}</p>
                    </div>
                    {tab === "active" ? (
                      <span className="text-[11px] font-bold bg-[#F2F4F6] text-[#4E5968] px-2 py-0.5 rounded-full shrink-0">
                        {m.level}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold bg-[#FEF2F2] text-[#F04452] px-2 py-0.5 rounded-full shrink-0">
                        탈퇴
                      </span>
                    )}
                  </div>
                  {tab === "active" ? (
                    <div className="flex items-center gap-3 mt-2 text-[12px] text-[#8B95A1]">
                      <span>글 {m.post_count} · 댓글 {m.comment_count}</span>
                      <span className="font-bold text-[#3182F6]">{(m.points ?? 0).toLocaleString()}P</span>
                      <span className="ml-auto">{fmtDate(m.joined_at)} 가입</span>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2 text-[12px] text-[#8B95A1]">
                        <span>{fmtDate(m.deleted_at)} 탈퇴</span>
                        <span className="truncate">· {m.deletion_reason || "사유 미입력"}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[12px]">
                        <span className="flex items-center gap-1 font-bold text-[#F04452]">
                          <Coins size={12} />{(m.deleted_points ?? 0).toLocaleString()}P 소멸
                        </span>
                        <span className="flex items-center gap-1 font-bold text-[#EA580C]">
                          <Tag size={12} />쿠폰 {m.deleted_coupon_count ?? 0}장 소멸
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
