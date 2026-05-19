"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MypageEditRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/mypage/profile/");
  }, [router]);
  return <div className="min-h-dvh bg-[#f5f5f7]" />;
}
