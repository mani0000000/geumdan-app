"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ThumbsUp, MessageSquare, Bell, Megaphone, Tag, Star, Gift } from "lucide-react";

type NotifType = "like" | "comment" | "notice" | "system" | "coupon" | "point";

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  href?: string;
  urgent?: boolean;
}

const mockNotifs: Notif[] = [
  {
    id: "n_c1", type: "coupon", title: "쿠폰 만료 임박 ⚠️",
    body: "이디야커피 아이스음료 500원 할인 쿠폰이 오늘 만료돼요! 지금 바로 사용하세요.",
    time: "방금 전", read: false, href: "/mypage/", urgent: true,
  },
  {
    id: "n1", type: "comment", title: "새 댓글",
    body: "검단맘 님이 내 글 \"당하동 어린이집 추천해주세요\"에 댓글을 달았어요: \"정보 공유 감사해요!\"",
    time: "5분 전", read: false, href: "/community/detail/?id=p1",
  },
  {
    id: "n2", type: "like", title: "좋아요 28개",
    body: "내 글 \"당하동 어린이집 추천해주세요\"에 좋아요 28개가 달렸어요 🎉",
    time: "1시간 전", read: false, href: "/community/detail/?id=p1",
  },
  {
    id: "n_p1", type: "point", title: "포인트 적립",
    body: "글 작성 완료! +10 포인트가 쌓였어요. 현재 누적 1,250P",
    time: "2시간 전", read: false, href: "/mypage/",
  },
  {
    id: "n3", type: "notice", title: "공지사항",
    body: "검단 라이프 서비스 업데이트 안내 (v1.1.0) — 날씨 위젯, 카드 뉴스, 포인트 시스템이 추가됐어요.",
    time: "어제", read: true, href: undefined,
  },
  {
    id: "n4", type: "comment", title: "새 댓글",
    body: "신혼부부 님이 답글을 달았어요: \"대기가 얼마나 걸리나요?\"",
    time: "어제", read: true, href: "/community/detail/?id=p6",
  },
  {
    id: "n_c2", type: "coupon", title: "새 쿠폰 등록",
    body: "올리브영 3,000원 할인쿠폰이 등록됐어요! 4월 15일까지 사용 가능해요.",
    time: "2일 전", read: true, href: "/mypage/",
  },
  {
    id: "n5", type: "system", title: "레벨 업 🎊",
    body: "축하해요! '이웃' 레벨로 올라갔어요. 포인트 보너스 50P가 지급됐습니다.",
    time: "3일 전", read: true, href: "/mypage/",
  },
  {
    id: "n6", type: "like", title: "좋아요",
    body: "내 댓글 \"검단사거리 국밥집 강추입니다\"에 좋아요 5개가 달렸어요",
    time: "3일 전", read: true, href: "/community/",
  },
  {
    id: "n_p2", type: "point", title: "주간 미션 완료",
    body: "이번 주 좋아요 5회 달성! 보너스 +10P 지급됐어요. 총 1,250P",
    time: "4일 전", read: true, href: "/mypage/",
  },
  {
    id: "n7", type: "notice", title: "검단 2호선 소식",
    body: "검단 신도시 지하철 2호선 연장 착공이 올해 하반기로 확정됐어요.",
    time: "5일 전", read: true, href: "/news/",
  },
  {
    id: "n_s1", type: "system", title: "7일 연속 방문",
    body: "7일 연속 방문을 달성했어요 🔥 출석 보너스 +35P가 지급됐어요.",
    time: "1주 전", read: true, href: "/mypage/",
  },
];

const iconMap: Record<NotifType, React.ReactNode> = {
  like: <ThumbsUp size={16} className="text-[#F04452]" />,
  comment: <MessageSquare size={16} className="text-[#3182F6]" />,
  notice: <Megaphone size={16} className="text-[#F59E0B]" />,
  system: <Star size={16} className="text-[#8B5CF6]" />,
  coupon: <Tag size={16} className="text-[#00C471]" />,
  point: <Gift size={16} className="text-[#F97316]" />,
};

const bgMap: Record<NotifType, string> = {
  like: "bg-[#FFEBEE]",
  comment: "bg-[#EBF3FE]",
  notice: "bg-[#FEF3C7]",
  system: "bg-[#EDE9FE]",
  coupon: "bg-[#D1FAE5]",
  point: "bg-[#FFEDD5]",
};

const typeLabel: Record<NotifType, string> = {
  like: "좋아요", comment: "댓글", notice: "공지", system: "시스템", coupon: "쿠폰", point: "포인트",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs] = useState(mockNotifs);
  const [filter, setFilter] = useState<NotifType | "전체">("전체");

  const unreadCount = notifs.filter(n => !n.read).length;
  const urgentCount = notifs.filter(n => n.urgent && !n.read).length;

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));

  const filtered = filter === "전체" ? notifs : notifs.filter(n => n.type === filter);
  const filterTypes: (NotifType | "전체")[] = ["전체", "like", "comment", "coupon", "point", "notice", "system"];

  const handleTap = (n: Notif) => {
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    if (n.href) router.push(n.href);
  };

  return (
    <div className="min-h-dvh bg-[#F2F4F6]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#F2F4F6] bg-white sticky top-0 z-10">
        <button onClick={() => router.back()} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#191F28]" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-[17px] font-bold text-[#191F28]">알림</h1>
          {unreadCount > 0 && (
            <span className="bg-[#F04452] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 ? (
          <button onClick={markAllRead} className="text-[13px] text-[#3182F6] font-medium active:opacity-60">
            모두 읽음
          </button>
        ) : <div className="w-16" />}
      </div>

      {/* 임박 쿠폰 긴급 배너 */}
      {urgentCount > 0 && (
        <button onClick={() => router.push("/mypage/")}
          className="w-full flex items-center gap-3 bg-[#FFF9C4] border-b-2 border-[#F59E0B] px-4 py-3 active:opacity-80">
          <Tag size={18} className="text-[#F59E0B] shrink-0" />
          <p className="flex-1 text-[13px] font-bold text-[#92400E] text-left">만료 임박 쿠폰 {urgentCount}개가 있어요! 오늘 사용하세요</p>
          <span className="text-[11px] font-bold text-[#F59E0B]">보기 →</span>
        </button>
      )}

      {/* 필터 탭 */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white border-b border-[#F2F4F6]" style={{ scrollbarWidth: "none" }}>
        {filterTypes.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-bold transition-colors active:opacity-70 ${
              filter === f ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#4E5968]"
            }`}>
            {f === "전체" ? "전체" : typeLabel[f]}
          </button>
        ))}
      </div>

      {/* 알림 목록 */}
      <div className="mt-0.5 space-y-0.5">
        {filtered.map(n => (
          <button key={n.id} onClick={() => handleTap(n)}
            className={`w-full flex items-start gap-3 px-4 py-4 text-left transition-colors active:opacity-70 ${
              n.read ? "bg-white" : n.urgent ? "bg-[#FFFBEB]" : "bg-[#F0F6FF]"
            }`}>
            <div className={`w-10 h-10 rounded-full ${bgMap[n.type]} flex items-center justify-center shrink-0 mt-0.5 relative`}>
              {iconMap[n.type]}
              {n.urgent && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#F04452] rounded-full border-2 border-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[13px] font-bold text-[#191F28]">{n.title}</p>
                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[#3182F6] shrink-0" />}
              </div>
              <p className="text-[13px] text-[#4E5968] leading-relaxed">{n.body}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[11px] text-[#B0B8C1]">{n.time}</p>
                {n.href && <span className="text-[11px] text-[#3182F6]">바로가기 →</span>}
              </div>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-24 text-center px-8">
          <Bell size={48} className="text-[#E5E8EB] mb-4" />
          <p className="text-[16px] font-bold text-[#191F28]">알림이 없어요</p>
          <p className="text-[14px] text-[#8B95A1] mt-2">새로운 소식이 오면 알려드릴게요</p>
        </div>
      )}
    </div>
  );
}
