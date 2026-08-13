import { requireAdminSession } from "@/lib/admin-session";
import { createPortalAdminClient } from "@/lib/supabase/admin";
import { addScadaMapping, deleteScadaMapping, toggleCustomerAuth, resetCustomerPassword, deleteCustomerAuth, updateSystemSetting, deleteAuditLogs } from "./actions";
import TestApiButton from "@/components/admin/TestApiButton";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";
import { Activity, KeyRound, Database, Plus, Ghost, Trash2, RotateCcw, Lock, Unlock, Edit, Settings, ClipboardList, Filter, Search } from "lucide-react";
import CustomerAutocomplete from "@/components/admin/CustomerAutocomplete";
import EditMappingButton from "@/components/admin/EditMappingButton";
import ViewScadaDetailsButton from "@/components/admin/ViewScadaDetailsButton";
import ViewScadaHistoryButton from "@/components/admin/ViewScadaHistoryButton";
import { getSystemSetting } from "@/lib/settings";
import Link from "next/link";

export const dynamic = "force-dynamic";

const auditActionLabels: Record<string, string> = {
  lookup_success: "Tra cứu thành công",
  lookup_failed: "Tra cứu thất bại",
  lookup_failed_invalid_input: "Tra cứu thiếu dữ liệu",
  lookup_rate_limited: "Tra cứu bị giới hạn",
  download_invoice_pdf: "Tải PDF hóa đơn",
};

const auditActionColors: Record<string, { color: string; background: string }> = {
  lookup_success: { color: "#047857", background: "#d1fae5" },
  lookup_failed: { color: "#b91c1c", background: "#fee2e2" },
  lookup_failed_invalid_input: { color: "#b45309", background: "#fef3c7" },
  lookup_rate_limited: { color: "#b91c1c", background: "#fee2e2" },
  download_invoice_pdf: { color: "#1d4ed8", background: "#dbeafe" },
};

function formatAuditMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "—";

  const entries = Object.entries(metadata as Record<string, unknown>)
    .filter(([key]) => !["customer_code", "reset_at"].includes(key))
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);

  return entries.length > 0 ? entries.join(" · ") : "—";
}

function formatAuditTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function getAuditCustomer(value: unknown): { customer_code: string | null; full_name: string | null } | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== "object") return null;

  const customer = candidate as Record<string, unknown>;
  return {
    customer_code: typeof customer.customer_code === "string" ? customer.customer_code : null,
    full_name: typeof customer.full_name === "string" ? customer.full_name : null,
  };
}

export default async function AdminPage(props: { searchParams: Promise<{ tab?: string; auditCustomer?: string; auditAction?: string; auditPeriod?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdminSession();
  
  const supabase = createPortalAdminClient();

  const activeTab = searchParams.tab || 'scada';
  const auditCustomer = searchParams.auditCustomer?.trim().toUpperCase() ?? "";
  const auditAction = searchParams.auditAction?.trim() ?? "";
  const auditPeriod = ["1", "7", "30", "all"].includes(searchParams.auditPeriod ?? "")
    ? searchParams.auditPeriod!
    : "7";

  const [{ data: mappings }, { data: auths }, historyLimitSetting] = await Promise.all([
    supabase.from("scada_mappings").select("*").order("created_at", { ascending: false }),
    supabase.from("customer_auth").select("*").order("created_at", { ascending: false }),
    getSystemSetting('data_history_months_limit', '12')
  ]);

  let auditLogs: Array<{
    id: string;
    action: string;
    metadata: unknown;
    created_at: string;
    customers: unknown;
  }> = [];
  let auditError: string | null = null;

  if (activeTab === "audit") {
    try {
      let customerIds: string[] | null = null;
      if (auditCustomer) {
        const { data: customers, error } = await supabase
          .from("customers")
          .select("id")
          .ilike("customer_code", `%${auditCustomer}%`)
          .limit(100);
        if (error) throw error;
        customerIds = (customers ?? []).map((customer) => customer.id as string);
      }

      if (!customerIds || customerIds.length > 0) {
        let auditQuery = supabase
          .from("audit_logs")
          .select("id, action, metadata, created_at, customers(customer_code, full_name)")
          .order("created_at", { ascending: false })
          .limit(200);

        if (customerIds) auditQuery = auditQuery.in("customer_id", customerIds);
        if (auditAction) auditQuery = auditQuery.eq("action", auditAction);
        if (auditPeriod !== "all") {
          const start = new Date();
          start.setDate(start.getDate() - Number(auditPeriod));
          auditQuery = auditQuery.gte("created_at", start.toISOString());
        }

        const { data, error } = await auditQuery;
        if (error) throw error;
        auditLogs = (data ?? []) as unknown as typeof auditLogs;
      }
    } catch (error: unknown) {
      auditError = error instanceof Error ? error.message : "Không thể tải nhật ký hoạt động.";
    }
  }

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
        <Link href="/admin?tab=audit" style={tabStyle(activeTab === 'audit')}>
          <ClipboardList size={18} /> Nhật ký hoạt động
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
                        <ViewScadaHistoryButton mappingId={m.id} customerCode={m.customer_code} />
                        <ViewScadaDetailsButton mappingId={m.id} customerCode={m.customer_code} />
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

      {activeTab === 'audit' && (
      <section className="admin-card">
        <div style={{ marginBottom: 32, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ padding: 12, background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)', color: '#6366f1', borderRadius: 16 }}>
            <ClipboardList size={28} />
          </div>
          <div>
            <h2 className="admin-section-title">Nhật ký hoạt động <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 18 }}>(Audit log)</span></h2>
            <p className="admin-section-desc">Theo dõi các hoạt động truy cập và tải tài liệu của khách hàng. Hiển thị tối đa 200 bản ghi mới nhất.</p>
          </div>
        </div>

        <form action="/admin" method="get" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 24, padding: 20, backgroundColor: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
          <input type="hidden" name="tab" value="audit" />
          <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label htmlFor="auditCustomer" style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Mã khách hàng</label>
            <input id="auditCustomer" name="auditCustomer" defaultValue={auditCustomer} placeholder="Ví dụ: KD29" className="admin-input" />
          </div>
          <div style={{ flex: '1 1 190px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label htmlFor="auditAction" style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Hoạt động</label>
            <select id="auditAction" name="auditAction" defaultValue={auditAction} className="admin-input">
              <option value="">Tất cả hoạt động</option>
              {Object.entries(auditActionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <label htmlFor="auditPeriod" style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Thời gian</label>
            <select id="auditPeriod" name="auditPeriod" defaultValue={auditPeriod} className="admin-input">
              <option value="1">24 giờ qua</option>
              <option value="7">7 ngày qua</option>
              <option value="30">30 ngày qua</option>
              <option value="all">Tất cả</option>
            </select>
          </div>
          <button type="submit" className="admin-btn admin-btn-primary" style={{ padding: '12px 18px' }}>
            <Filter size={16} /> Lọc nhật ký
          </button>
          {(auditCustomer || auditAction || auditPeriod !== "7") && (
            <Link href="/admin?tab=audit" className="admin-btn" style={{ padding: '12px 18px', color: '#475569', background: '#ffffff', border: '1px solid #cbd5e1' }}>
              <Search size={16} /> Xóa lọc
            </Link>
          )}
        </form>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
          <details style={{ position: 'relative' }}>
            <summary className="admin-btn" style={{ listStyle: 'none', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', cursor: 'pointer' }}>
              <Trash2 size={16} /> Xóa log
            </summary>
            <div style={{ position: 'absolute', zIndex: 5, top: 'calc(100% + 8px)', right: 0, minWidth: 300, padding: 14, borderRadius: 14, border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 12px 28px rgba(15, 23, 42, 0.16)' }}>
              <p style={{ margin: '0 0 12px', color: '#475569', fontSize: 13, lineHeight: 1.5 }}>Chọn phạm vi xóa. Thao tác này không thể hoàn tác.</p>
              <div style={{ display: 'grid', gap: 8 }}>
                <form action={deleteAuditLogs.bind(null, "keep_90_days")}>
                  <ConfirmSubmitButton promptMessage="Bạn có chắc chắn muốn xóa các audit log cũ hơn 90 ngày?" className="admin-btn" style={{ width: '100%', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', padding: '10px 12px' }}>
                    Giữ lại 90 ngày gần nhất
                  </ConfirmSubmitButton>
                </form>
                <form action={deleteAuditLogs.bind(null, "all")}>
                  <ConfirmSubmitButton promptMessage="Bạn có chắc chắn muốn xóa toàn bộ audit log? Toàn bộ lịch sử hoạt động sẽ bị mất." className="admin-btn" style={{ width: '100%', color: '#ffffff', background: '#dc2626', padding: '10px 12px' }}>
                    Xóa toàn bộ log
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
          </details>
        </div>

        {auditError ? (
          <div className="empty" style={{ color: 'var(--danger)' }}>Không thể tải nhật ký: {auditError}</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Khách hàng</th>
                  <th>Hoạt động</th>
                  <th>Thông tin liên quan</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length > 0 ? auditLogs.map((log) => {
                  const actionStyle = auditActionColors[log.action] ?? { color: '#475569', background: '#f1f5f9' };
                  const customer = getAuditCustomer(log.customers);
                  const customerCode = customer?.customer_code
                    ?? (typeof log.metadata === "object" && log.metadata !== null && "customer_code" in log.metadata
                      ? String((log.metadata as Record<string, unknown>).customer_code)
                      : "—");

                  return (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{formatAuditTime(log.created_at)}</td>
                      <td>
                        <strong>{customerCode}</strong>
                        {customer?.full_name && <div style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: 12 }}>{customer.full_name}</div>}
                      </td>
                      <td><span className="admin-badge" style={actionStyle}>{auditActionLabels[log.action] ?? log.action}</span></td>
                      <td style={{ color: 'var(--text-muted)', maxWidth: 360, wordBreak: 'break-word' }}>{formatAuditMetadata(log.metadata)}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={4}>
                      <div className="admin-table-empty">
                        <Ghost size={48} strokeWidth={1} />
                        <span>Chưa có bản ghi phù hợp với bộ lọc.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}
      </div>
    </div>
  );
}
