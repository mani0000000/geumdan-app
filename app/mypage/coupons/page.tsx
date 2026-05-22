"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Tag, Trash2 } from "lucide-react";
import { getDownloadedCoupons, removeDownloadedCoupon, type DownloadedCoupon } from "@/lib/db/userdata";

function getDaysUntilExpiry(expiry: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(expiry);
  expiryDate.setHours(0, 0, 0, 0);
  return Math.ceil((expiryDate.getTime() - today.getTime()) / 86400000);
}

function ExpiryBadge({ expiry }: { expiry: string }) {
  const days = getDaysUntilExpiry(expiry);

  if (days < 0) {
    return (
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#86868b]">
        만료됨
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF0F0] text-[#F04452]">
        D-{days}
      </span>
    );
  }
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e8f1fd] text-[#0071e3]">
      D-{days}
    </span>
  );
}

export default function DownloadedCouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<DownloadedCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    getDownloadedCoupons().then((data) => {
      setCoupons(data);
      setLoading(false);
    });
  }, []);

  async function handleRemove(couponId: string) {
    setRemoving(couponId);
    await removeDownloadedCoupon(couponId);
    setCoupons((prev) => prev.filter((c) => c.coupon_id !== couponId));
    setRemoving(null);
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
          <h1 className="text-[17px] font-bold text-[#1d1d1f] flex-1">다운로드한 쿠폰</h1>
          <span className="text-[14px] text-[#6e6e73]">{coupons.length}개</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center mt-20">
          <p className="text-[15px] text-[#6e6e73]">불러오는 중...</p>
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 gap-3">
          <Tag size={44} className="text-[#d2d2d7]" />
          <p className="text-[15px] text-[#6e6e73]">다운로드한 쿠폰이 없습니다.</p>
          <p className="text-[13px] text-[#86868b]">상가 쿠폰 페이지에서 쿠폰을 받아보세요.</p>
          <button
            onClick={() => router.push("/")}
            className="mt-2 h-10 px-6 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium"
          >
            홈으로
          </button>
        </div>
      ) : (
        <div className="mx-4 mt-4 bg-white rounded-2xl overflow-hidden divide-y divide-[#f5f5f7]">
          {coupons.map((coupon) => {
            const expired = getDaysUntilExpiry(coupon.expiry) < 0;
            return (
              <div
                key={coupon.id}
                className={`flex items-center px-4 py-3.5 gap-3 ${expired ? "opacity-50" : ""}`}
              >
                <div className="flex-1 flex items-start gap-3 min-w-0">
                  <span className="text-[12px] font-bold bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                    {coupon.store_name}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{coupon.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px] font-bold text-[#F59E0B]">{coupon.discount}</span>
                      <span className="text-[12px] text-[#86868b]">~{coupon.expiry}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ExpiryBadge expiry={coupon.expiry} />
                  <button
                    onClick={() => handleRemove(coupon.coupon_id)}
                    disabled={removing === coupon.coupon_id}
                    className="w-8 h-8 flex items-center justify-center active:opacity-60"
                  >
                    <Trash2
                      size={15}
                      className={
                        removing === coupon.coupon_id ? "text-[#d2d2d7]" : "text-[#F04452]"
                      }
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
