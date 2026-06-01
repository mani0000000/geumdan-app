"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  useEffect(() => {
    sessionStorage.setItem("admin_auth", "1");
    router.replace("/admin/stores");
  }, [router]);
  return null;
}
