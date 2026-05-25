"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RealEstateDetailPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/community/?tab=시세");
  }, [router]);
  return null;
}
