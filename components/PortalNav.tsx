"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, FileText, Gauge, Home, LogOut, ReceiptText } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Tổng quan", icon: Home },
  { href: "/bills", label: "Hóa đơn", icon: FileText },
  { href: "/usage", label: "Sản lượng", icon: Gauge },
  { href: "/payments", label: "Thanh toán", icon: ReceiptText }
];

export function PortalNav({ customerName }: { customerName?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

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
          <span>{customerName || "Customer Portal"}</span>
        </div>
        <nav className="nav" aria-label="Điều hướng tra cứu">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className={active ? "active" : undefined}>
                <Icon size={16} />
                {link.label}
              </Link>
            );
          })}
          <button className="icon-button" type="button" onClick={logout} title="Thoát phiên tra cứu">
            <LogOut size={16} />
          </button>
        </nav>
      </div>
    </header>
  );
}

