import { requireAdminSession } from "@/lib/admin-session";
import { createPortalAdminClient } from "@/lib/supabase/admin";
import { addScadaMapping, deleteScadaMapping, toggleCustomerAuth, resetCustomerPassword, deleteCustomerAuth, updateSystemSetting } from "./actions";
import TestApiButton from "@/components/admin/TestApiButton";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";
import { Activity, KeyRound, Database, Plus, Ghost, Trash2, RotateCcw, Lock, Unlock, Edit, Settings } from "lucide-react";
import CustomerAutocomplete from "@/components/admin/CustomerAutocomplete";
import EditMappingButton from "@/components/admin/EditMappingButton";
import { getSystemSetting } from "@/lib/settings";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdminSession();
  
  const supabase = createPortalAdminClient();

  const [{ data: mappings }, { data: auths }, historyLimitSetting] = await Promise.all([
    supabase.from("scada_mappings").select("*").order("created_at", { ascending: false }),
    supabase.from("customer_auth").select("*").order("created_at", { ascending: false }),
    getSystemSetting('data_history_months_limit', '12')
  ]);

  const activeTab = searchParams.tab || 'scada';

  const tabStyle = (isActive: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '15px',
    textDecoration: 'none',
    transition: 'all 0.2s',
    backgroundColor: isActive ? 'var(--brand)' : 'var(--surface)',
    color: isActive ? 'white' : 'var(--text-muted)',
    border: isActive ? 'none' : '1px solid var(--border)',
    boxShadow: isActive ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none',
  });

  return (
    <div>
      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
        <Link href="/admin?tab=scada" style={tabStyle(activeTab === 'scada')}>
          <Activity size={18} /> Bản đồ SCADA
        </Link>
        <Link href="/admin?tab=auth" style={tabStyle(activeTab === 'auth')}>
          <KeyRound size={18} /> Quyền Khách hàng
        </Link>
        <Link href="/admin?tab=settings" style={tabStyle(activeTab === 'settings')}>
          <Settings size={18} /> Cài đặt hệ thống
        </Link>
      </div>

      <div style={{ display: 'grid', gap: 32, gridTemplateColumns: '1fr' }}>
      
      {/* SCADA Section */}
      {activeTab === 'scada' && (
        <section className="admin-card">
        <div style={{ marginBottom: 32, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ padding: 12, background: 'linear-gradient(135deg, #e0f2fe, #dbeafe)', color: '#0284c7', borderRadius: 16 }}>
            <Activity size={28} />
          </div>
          <div>
            <h2 className="admin-section-title">Bản đồ SCADA <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 18 }}>(Mappings)</span></h2>
            <p className="admin-section-desc">Quản lý liên kết giữa mã khách hàng và đường dẫn API lấy dữ liệu SCADA thời gian thực.</p>
          </div>
        </div>
        
        <form action={addScadaMapping} style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", marginBottom: 32, padding: 24, backgroundColor: '#f8fafc', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>Mã Khách Hàng</label>
            <CustomerAutocomplete name="customerCode" placeholder="Tìm tên / mã khách hàng..." required />
          </div>
          <div style={{ flex: '2 1 250px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}><Database size={16}/> API URL</label>
            <input type="url" name="apiUrl" placeholder="https://scada.domain.com/api/..." required className="admin-input" />
          </div>
          <ConfirmSubmitButton 
            promptMessage="Bạn có chắc chắn muốn thêm Mapping này?"
            className="admin-btn admin-btn-primary"
            style={{ flex: '0 0 auto' }}
          >
            <Plus size={18} /> Thêm Mapping
          </ConfirmSubmitButton>
        </form>
        
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã KH</th>
                <th>API URL</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {mappings && mappings.length > 0 ? (
                mappings.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.customer_code}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{m.api_url}</td>
                    <td>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <TestApiButton apiUrl={m.api_url} />
                        <EditMappingButton mapping={m} />
                        <form action={deleteScadaMapping.bind(null, m.id)}>
                          <ConfirmSubmitButton 
                            promptMessage={`Bạn có chắc chắn muốn xoá mapping SCADA của khách hàng ${m.customer_code}?`}
                            className="admin-btn"
                            style={{ color: "var(--danger)", padding: '8px 12px', background: 'transparent' }} 
                            title="Xoá mapping"
                          >
                            <Trash2 size={16} />
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>
                    <div className="admin-table-empty">
                      <Ghost size={48} strokeWidth={1} />
                      <span>Chưa có dữ liệu mapping SCADA nào.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* Auth Section */}
      {activeTab === 'auth' && (
      <section className="admin-card">
        <div style={{ marginBottom: 32, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ padding: 12, background: 'linear-gradient(135deg, #fce7f3, #fae8ff)', color: '#db2777', borderRadius: 16 }}>
            <KeyRound size={28} />
          </div>
          <div>
            <h2 className="admin-section-title">Quyền Khách hàng <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 18 }}>(Auth)</span></h2>
            <p className="admin-section-desc">Cho phép khách hàng tự thiết lập mật khẩu truy cập Portal cá nhân thay vì mặc định.</p>
          </div>
        </div>

        <form action={async (formData: FormData) => {
          "use server";
          const code = formData.get("customerCode")?.toString();
          if (code) await toggleCustomerAuth(code.toUpperCase(), true);
        }} style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", marginBottom: 32, padding: 24, backgroundColor: '#f8fafc', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>Cấp quyền theo Mã Khách Hàng</label>
            <CustomerAutocomplete name="customerCode" placeholder="Tìm tên / mã khách hàng..." required />
          </div>
          <ConfirmSubmitButton 
            promptMessage="Bạn có chắc chắn muốn cấp quyền đổi mật khẩu cho mã Khách Hàng này?"
            className="admin-btn admin-btn-primary"
            style={{ flex: '0 0 auto', background: 'linear-gradient(135deg, var(--success), #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}
          >
            <Plus size={18} /> Cấp Quyền Đổi MK
          </ConfirmSubmitButton>
        </form>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã KH</th>
                <th style={{ textAlign: "center" }}>Trạng thái</th>
                <th style={{ textAlign: "center" }}>MK Tùy chỉnh</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {auths && auths.length > 0 ? (
                auths.map((a) => (
                  <tr key={a.customer_code}>
                    <td style={{ fontWeight: 600 }}>{a.customer_code}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`admin-badge ${a.can_change_password ? 'success' : 'neutral'}`}>
                        {a.can_change_password ? "Được phép" : "Đã khóa"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`admin-badge ${a.hashed_password ? 'active' : 'neutral'}`}>
                        {a.hashed_password ? "Đã đặt" : "Mặc định (SĐT)"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <form action={toggleCustomerAuth.bind(null, a.customer_code, !a.can_change_password)}>
                          <ConfirmSubmitButton 
                            promptMessage={`Bạn có chắc chắn muốn ${a.can_change_password ? "tước" : "cấp lại"} quyền đổi mật khẩu của khách hàng ${a.customer_code}?`}
                            className="admin-btn"
                            style={{ color: a.can_change_password ? "#f59e0b" : "#3b82f6", background: "transparent", padding: '8px', minWidth: '40px' }}
                            title={a.can_change_password ? "Tước quyền" : "Cấp lại quyền"}
                          >
                            {a.can_change_password ? <Lock size={16}/> : <Unlock size={16}/>}
                          </ConfirmSubmitButton>
                        </form>
                        
                        <form action={resetCustomerPassword.bind(null, a.customer_code)}>
                          <ConfirmSubmitButton 
                            promptMessage={`Mật khẩu của khách hàng ${a.customer_code} sẽ bị đặt lại về số điện thoại. Bạn có chắc chắn?`}
                            disabled={!a.hashed_password}
                            className="admin-btn"
                            style={{ color: "#ef4444", background: "transparent", padding: '8px', minWidth: '40px' }}
                            title="Đặt lại mật khẩu"
                          >
                            <RotateCcw size={16}/>
                          </ConfirmSubmitButton>
                        </form>
                        
                        <form action={deleteCustomerAuth.bind(null, a.customer_code)}>
                          <ConfirmSubmitButton 
                            promptMessage={`Bạn có chắc chắn muốn Xoá hoàn toàn hồ sơ bảo mật của khách hàng ${a.customer_code}?`}
                            className="admin-btn"
                            style={{ color: "#ef4444", background: "transparent", padding: '8px', minWidth: '40px' }}
                            title="Xoá hồ sơ"
                          >
                            <Trash2 size={16}/>
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    <div className="admin-table-empty">
                      <Ghost size={48} strokeWidth={1} />
                      <span>Chưa có cấu hình quyền bảo mật nào.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {/* Settings Section */}
      {activeTab === 'settings' && (
      <section className="admin-card">
        <div style={{ marginBottom: 32, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ padding: 12, background: 'linear-gradient(135deg, #fef08a, #fef9c3)', color: '#ca8a04', borderRadius: 16 }}>
            <Settings size={28} />
          </div>
          <div>
            <h2 className="admin-section-title">Cài đặt hệ thống <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 18 }}>(Settings)</span></h2>
            <p className="admin-section-desc">Cấu hình các tham số động của toàn bộ hệ thống Cổng thông tin khách hàng.</p>
          </div>
        </div>

        <form action={async (formData: FormData) => {
          "use server";
          const limit = formData.get("limit")?.toString();
          if (limit) await updateSystemSetting("data_history_months_limit", limit);
        }} style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", padding: 24, backgroundColor: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>Giới hạn lịch sử dữ liệu (Số tháng)</label>
            <input type="number" name="limit" min="1" max="120" defaultValue={historyLimitSetting as string} className="admin-input" required />
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Số tháng tối đa được phép tải về (Hóa đơn, Lịch sử dùng nước, Thanh toán).</p>
          </div>
          <ConfirmSubmitButton 
            promptMessage="Bạn có chắc chắn muốn lưu cấu hình mới?"
            className="admin-btn admin-btn-primary"
            style={{ flex: '0 0 auto', background: 'linear-gradient(135deg, #eab308, #ca8a04)', boxShadow: '0 4px 12px rgba(202, 138, 4, 0.25)' }}
          >
            <Edit size={18} /> Lưu Cài đặt
          </ConfirmSubmitButton>
        </form>
      </section>
      )}
      </div>
    </div>
  );
}
