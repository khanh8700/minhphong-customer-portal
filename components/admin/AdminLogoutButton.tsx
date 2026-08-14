"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={isLoggingOut}
      aria-label="Đăng xuất khỏi trang quản trị"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--foreground)",
        borderRadius: 8,
        padding: "9px 13px",
        fontWeight: 600,
        cursor: isLoggingOut ? "wait" : "pointer",
        opacity: isLoggingOut ? 0.7 : 1,
      }}
    >
      <LogOut size={16} />
      {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
    </button>
  );
}
