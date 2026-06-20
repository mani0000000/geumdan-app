"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Bell, ThumbsUp, MessageSquare, MessageCircle,
  Ticket, Check, Trash2,
} from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";
import { getOrCreateUserId } from "@/lib/db/userdata";
import {
  fetchNotifications, markAsRead, markAllAsRead, deleteNotification,
  type AppNotification, type NotificationType,
} from "@/lib/db/notifications";
import { formatRelativeTime } from "@/lib/utils";

const typeMeta: Record<NotificationType, {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  bg: string;
  fg: string;
  label: string;
}> = {
  coupon_expiry: { icon: Ticket,         bg: "bg-[#FEF3C7]", fg: "text-[#D97706]", label: "쿠폰" },
  post_like:     { icon: ThumbsUp,       bg: "bg-[#FFE8EF]", fg: "text-[#D63384]", label: "좋아요" },
  post_comment:  { icon: MessageSquare,  bg: "bg-[#e8f1fd]", fg: "text-[#3182F6]", label: "댓글" },
  comment_reply: { icon: MessageCircle,  bg: "bg-[#F3E5F5]", fg: "text-[#6A1B9A]", label: "답글" },
};

function notificationLink(n: AppNotification): string | null {
  if (n.relatedType === "post" && n.relatedId) {
    return `/community/detail/?id=${n.relatedId}`;
  }
  if (n.relatedType === "coupon") {
    return "/coupons/";
  }
  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uid = await getOrCreateUserId();
      if (cancelled) return;
      setUserId(uid);
      const list = await fetchNotifications(uid, 100);
      if (cancelled) return;
      setItems(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const unreadCount = items.filter(n => !n.isRead).length;

  async function handleClick(n: AppNotification) {
    if (!n.isRead) {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      await markAsRead(n.id);
    }
    const link = notificationLink(n);
    if (link) router.push(link);
  }

  async function handleMarkAll() {
    if (!userId) return;
    setItems(prev => prev.map(x => ({ ...x, isRead: true })));
    await markAllAsRead(userId);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setItems(prev => prev.filter(n => n.id !== id));
    await deleteNotification(id);
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-28">
      {/* 헤더 */}
      <div className="bg-white sticky top-0 z-40 border-b border-[#f5f5f7]">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => router.back()} className="active:opacity-60">
            <ChevronLeft size={22} className="text-[#1d1d1f]" />
          </button>
          <h1 className="text-[18px] font-bold text-[#1d1d1f] flex-1">알림</h1>
          {unreadCount > 0 && (
            <button onClick={handleMarkAll}
              className="flex items-center gap-1 text-[13px] font-semibold text-[#3182F6] active:opacity-60">
              <Check size={14} /> 전체 읽음
            </button>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="pt-2">
        {loading ? (
          <div className="px-4 pt-3 space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-[#f5f5f7]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-[#f5f5f7] rounded" />
                  <div className="h-3 w-1/2 bg-[#f5f5f7] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <Bell size={28} className="text-[#d2d2d7]" />
            </div>
            <p className="text-[15px] font-semibold text-[#424245]">아직 알림이 없어요</p>
            <p className="text-[13px] text-[#86868b]">새로운 소식이 있으면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="px-4 pt-2 space-y-2">
            {items.map(n => {
              const meta = typeMeta[n.type];
              const Icon = meta.icon;
              return (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full text-left bg-white rounded-2xl px-4 py-3.5 flex items-start gap-3 active:bg-[#f5f5f7] transition-colors relative ${
                    n.isRead ? "" : "ring-1 ring-[#3182F6]/20"
                  }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                    <Icon size={18} className={meta.fg} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.fg}`}>
                        {meta.label}
                      </span>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#F04452]" />
                      )}
                    </div>
                    <p className={`text-[15px] leading-snug ${n.isRead ? "text-[#424245]" : "text-[#1d1d1f] font-semibold"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[13px] text-[#6e6e73] mt-1 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-[12px] text-[#86868b] mt-1.5">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                  <button onClick={(e) => handleDelete(n.id, e)}
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center active:bg-[#f5f5f7]">
                    <Trash2 size={13} className="text-[#86868b]" />
                  </button>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
