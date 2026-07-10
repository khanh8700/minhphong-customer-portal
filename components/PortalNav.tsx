"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, KeyRound, BarChart3, FileText, Gauge, Home, LogOut, ReceiptText } from "lucide-react";

export function PortalNav({ customerName, hasScada, canChangePassword }: { customerName?: string | null, hasScada?: boolean, canChangePassword?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/dashboard", label: "Tổng quan", icon: Home },
    { href: "/bills", label: "Hóa đơn", icon: FileText },
    { href: "/usage", label: "Sản lượng", icon: Gauge },
    { href: "/payments", label: "Thanh toán", icon: ReceiptText },
  ];

  if (hasScada) {
    links.push({ href: "/scada", label: "Thông số ĐHĐT", icon: Activity });
  }

  async function logout() {
    await fetch("/api/session/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="topbar">
      <div className="page topbar-inner">
        <div className="brand">
          <span className="brand-mark">
            <BarChart3 size={20} />
          </span>
          <span className="brand-name">{customerName || "Customer Portal"}</span>
        </div>
        
        <nav className="nav" aria-label="Điều hướng tra cứu">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className={active ? "active" : ""}>
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="topbar-actions">
          {canChangePassword && (
            <Link href="/change-password" className="action-link">
              <KeyRound size={16} />
              Đổi mật khẩu
            </Link>
          )}
          <button type="button" onClick={logout} title="Thoát phiên tra cứu" className="action-button">
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}

