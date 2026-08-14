import { ShieldCheck } from "lucide-react";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell" style={{ backgroundColor: 'var(--background)', minHeight: '100vh' }}>
      <header className="topbar" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ width: '100%', padding: '0 32px', height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 20, fontWeight: 700 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), #8b5cf6)', color: 'white', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)' }}>
              <ShieldCheck size={22} />
            </div>
            <span style={{ background: 'linear-gradient(to right, var(--foreground), #475569)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Admin Portal
            </span>
          </div>
          <AdminLogoutButton />
        </div>
      </header>
      <main style={{ width: '100%', padding: '32px' }}>
        {children}
      </main>
    </div>
  );
}
