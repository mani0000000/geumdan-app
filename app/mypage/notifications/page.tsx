"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ThumbsUp, MessageSquare, Bell, Megaphone } from "lucide-react";

type NotifType = "like" | "comment" | "notice" | "system";

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const mockNotifs: Notif[] = [
  { id: "n1", type: "comment", title: "새 댓글", body: "검단맘 님이 내 글에 댓글을 달았어요: \"정보 공유 감사해요!\"", time: "방금 전", read: false },
  { id: "n2", type: "like", title: "좋아요", body: "내 글 \"당하동 어린이집 추천해주세요\"에 좋아요 28개가 달렸어요", time: "1시간 전", read: false },
  { id: "n3", type: "notice", title: "공지사항", body: "검단 라이프 서비스 업데이트 안내 (v1.1.0)", time: "어제", read: true },
  { id: "n4", type: "comment", title: "새 댓글", body: "신혼부부 님이 답글을 달았어요: \"대기가 얼마나 걸리나요?\"", time: "어제", read: true },
  { id: "n5", type: "system", title: "레벨 업", body: "축하해요! '이웃' 레벨로 올라갔어요 🎉", time: "3일 전", read: true },
  { id: "n6", type: "like", title: "좋아요", body: "내 댓글에 좋아요 5개가 달렸어요", time: "3일 전", read: true },
  { id: "n7", type: "notice", title: "공지사항", body: "검단 신도시 지하철 2호선 연장 착공 소식이 등록됐어요", time: "5일 전", read: true },
  { id: "n8", type: "system", title: "출석 체크", body: "7일 연속 방문을 달성했어요! 활동 포인트 +50", time: "1주 전", read: true },
];

const iconMap: Record<NotifType, React.ReactNode> = {
  like: <ThumbsUp size={16} className="text-[#F04452]" />,
  comment: <MessageSquare size={16} className="text-[#3182F6]" />,
  notice: <Megaphone size={16} className="text-[#F59E0B]" />,
  system: <Bell size={16} className="text-[#8B5CF6]" />,
};

const bgMap: Record<NotifType, string> = {
  like: "bg-[#FFEBEE]",
  comment: "bg-[#EBF3FE]",
  notice: "bg-[#FEF3C7]",
  system: "bg-[#EDE9FE]",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs] = useState(mockNotifs);

  const unreadCount = notifs.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="min-h-dvh bg-[#F2F4F6]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#F2F4F6] bg-white sticky top-0 z-10">
        <button onClick={() => router.back()} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#191F28]" />
        </button>
        <h1 className="text-[17px] font-bold text-[#191F28]">알림</h1>
        {unreadCount > 0 ? (
          <button onClick={markAllRead} className="text-[13px] text-[#3182F6] font-medium active:opacity-60">
            모두 읽음
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {unreadCount > 0 && (
        <div className="mx-4 mt-4 bg-[#EBF3FE] rounded-2xl px-4 py-3 flex items-center gap-2">
          <Bell size={15} className="text-[#3182F6]" />
          <p className="text-[13px] text-[#3182F6] font-medium">읽지 않은 알림 {unreadCount}개가 있어요</p>
        </div>
      )}

      <div className="mt-3 space-y-0.5">
        {notifs.map((n) => (
          <button
            key={n.id}
            onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
            className={`w-full flex items-start gap-3 px-4 py-4 text-left transition-colors active:opacity-70 ${n.read ? "bg-white" : "bg-[#F0F6FF]"}`}
          >
            <div className={`w-10 h-10 rounded-full ${bgMap[n.type]} flex items-center justify-center shrink-0 mt-0.5`}>
              {iconMap[n.type]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[13px] font-bold text-[#191F28]">{n.title}</p>
                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[#3182F6]" />}
              </div>
              <p className="text-[13px] text-[#4E5968] leading-relaxed">{n.body}</p>
              <p className="text-[11px] text-[#B0B8C1] mt-1">{n.time}</p>
            </div>
          </button>
        ))}
      </div>

      {notifs.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-24 text-center px-8">
          <Bell size={48} className="text-[#E5E8EB] mb-4" />
          <p className="text-[16px] font-bold text-[#191F28]">알림이 없어요</p>
          <p className="text-[14px] text-[#8B95A1] mt-2">새로운 소식이 오면 알려드릴게요</p>
        </div>
      )}
    </div>
  );
}
