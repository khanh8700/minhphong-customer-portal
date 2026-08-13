import { requireAdminSession } from "@/lib/admin-session";
import { createPortalAdminClient } from "@/lib/supabase/admin";
import { acknowledgeSystemAlert, addScadaMapping, deleteScadaMapping, saveAdminUser, saveTelegramSettings, toggleAdminUser, toggleCustomerAuth, resetCustomerPassword, deleteCustomerAuth, updateSystemSetting, deleteAuditLogs } from "./actions";
import TestApiButton from "@/components/admin/TestApiButton";
import ConfirmSubmitButton from "@/components/admin/ConfirmSubmitButton";
import { Activity, KeyRound, Database, Plus, Ghost, Trash2, RotateCcw, Lock, Unlock, Edit, Settings, ClipboardList, Filter, Search, LayoutDashboard, BellRing, Shield, CheckCheck } from "lucide-react";
import CustomerAutocomplete from "@/components/admin/CustomerAutocomplete";
import EditMappingButton from "@/components/admin/EditMappingButton";
import ViewScadaDetailsButton from "@/components/admin/ViewScadaDetailsButton";
import ViewScadaHistoryButton from "@/components/admin/ViewScadaHistoryButton";
import { getSystemSetting } from "@/lib/settings";
import { getScadaAlertThresholds, getTelegramAlertConfig } from "@/lib/scada-operations";
import TelegramTestButton from "@/components/admin/TelegramTestButton";
import ExportScadaReportButton from "@/components/admin/ExportScadaReportButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

const auditActionLabels: Record<string, string> = {
  lookup_success: "Tra cứu thành công",
  lookup_failed: "Tra cứu thất bại",
  lookup_failed_invalid_input: "Tra cứu thiếu dữ liệu",
  lookup_rate_limited: "Tra cứu bị giới hạn",
  download_invoice_pdf: "Tải PDF hóa đơn",
  admin_add_scada_mapping: "Admin thêm mapping SCADA",
  admin_update_scada_mapping: "Admin sửa mapping SCADA",
  admin_delete_scada_mapping: "Admin xóa mapping SCADA",
  admin_update_customer_auth: "Admin đổi quyền khách hàng",
  admin_reset_customer_password: "Admin đặt lại mật khẩu",
  admin_delete_customer_auth: "Admin xóa hồ sơ bảo mật",
  admin_update_setting: "Admin đổi cài đặt",
  admin_update_telegram: "Admin cấu hình Telegram",
  admin_delete_audit_logs: "Admin xóa audit log",
  admin_save_admin_user: "Admin lưu tài khoản quản trị",
  admin_toggle_admin_user: "Admin đổi trạng thái admin",
  admin_acknowledge_alert: "Admin tiếp nhận cảnh báo",
};

const auditActionColors: Record<string, { color: string; background: string }> = {
  lookup_success: { color: "#047857", background: "#d1fae5" },
  lookup_failed: { color: "#b91c1c", background: "#fee2e2" },
  lookup_failed_invalid_input: { color: "#b45309", background: "#fef3c7" },
  lookup_rate_limited: { color: "#b91c1c", background: "#fee2e2" },
  download_invoice_pdf: { color: "#1d4ed8", background: "#dbeafe" },
  admin_add_scada_mapping: { color: "#1d4ed8", background: "#dbeafe" },
  admin_update_scada_mapping: { color: "#1d4ed8", background: "#dbeafe" },
  admin_delete_scada_mapping: { color: "#b91c1c", background: "#fee2e2" },
  admin_update_telegram: { color: "#0369a1", background: "#e0f2fe" },
  admin_delete_audit_logs: { color: "#b91c1c", background: "#fee2e2" },
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

const roleLabels: Record<string, string> = {
  system_admin: "Quản trị hệ thống",
  scada_operator: "Vận hành SCADA",
  accountant: "Kế toán / Báo cáo",
  viewer: "Chỉ xem",
};

export default async function AdminPage(props: { searchParams: Promise<{ tab?: string; auditCustomer?: string; auditAction?: string; auditPeriod?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  const adminSession = await requireAdminSession();
  
  const supabase = createPortalAdminClient();

  const activeTab = searchParams.tab || 'dashboard';
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
  let dashboardStatuses: Array<{ customer_code: string; status: string; last_checked_at: string; last_error: string | null; internal_battery: number | null; external_battery: number | null }> = [];
  let openAlerts: Array<{ id: string; customer_code: string; type: string; severity: string; title: string; message: string; status: string; last_detected_at: string }> = [];
  let telegramConfig = null as Awaited<ReturnType<typeof getTelegramAlertConfig>> | null;
  let alertThresholds = null as Awaited<ReturnType<typeof getScadaAlertThresholds>> | null;
  let adminUsers: Array<{ id: string; email: string; role: string; is_active: boolean; created_at: string }> = [];

  if (activeTab === "dashboard") {
    const [{ data: statuses }, { data: alerts }] = await Promise.all([
      supabase.from("scada_device_statuses").select("customer_code, status, last_checked_at, last_error, internal_battery, external_battery").order("last_checked_at", { ascending: false }),
      supabase.from("system_alerts").select("id, customer_code, type, severity, title, message, status, last_detected_at").in("status", ["open", "acknowledged"]).order("last_detected_at", { ascending: false }).limit(50),
    ]);
    dashboardStatuses = (statuses ?? []) as typeof dashboardStatuses;
    openAlerts = (alerts ?? []) as typeof openAlerts;
  }

  if (activeTab === "settings") [telegramConfig, alertThresholds] = await Promise.all([getTelegramAlertConfig(supabase), getScadaAlertThresholds(supabase)]);
  if (activeTab === "admins") {
    const { data } = await supabase.from("admin_users").select("id, email, role, is_active, created_at").order("created_at", { ascending: true });
    adminUsers = (data ?? []) as typeof adminUsers;
  }

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
        <Link href="/admin?tab=dashboard" style={tabStyle(activeTab === 'dashboard')}>
          <LayoutDashboard size={18} /> Tổng quan SCADA
        </Link>
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
        {adminSession.role === "system_admin" && <Link href="/admin?tab=admins" style={tabStyle(activeTab === 'admins')}>
          <Shield size={18} /> Phân quyền admin
        </Link>}
      </div>

      {searchParams.error === "forbidden" && <div role="alert" className="error-box">Tài khoản hiện tại không có quyền thực hiện thao tác này.</div>}

      <div style={{ display: 'grid', gap: 32, gridTemplateColumns: '1fr' }}>

      {activeTab === 'dashboard' && (
      <section className="admin-card">
        <div style={{ marginBottom: 28, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ padding: 12, background: 'linear-gradient(135deg, #e0f2fe, #dbeafe)', color: '#0284c7', borderRadius: 16 }}><LayoutDashboard size={28} /></div>
          <div><h2 className="admin-section-title">Tổng quan vận hành SCADA</h2><p className="admin-section-desc">Theo dõi trạng thái đồng hồ, cảnh báo đang mở và lần kiểm tra gần nhất.</p></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 28 }}>
          {[
            ["Tổng đồng hồ", dashboardStatuses.length, '#0f172a', '#f8fafc'],
            ["Trực tuyến", dashboardStatuses.filter((item) => item.status === 'online').length, '#047857', '#ecfdf5'],
            ["Dữ liệu chậm", dashboardStatuses.filter((item) => item.status === 'stale').length, '#b45309', '#fffbeb'],
            ["Mất kết nối", dashboardStatuses.filter((item) => item.status === 'offline').length, '#b91c1c', '#fef2f2'],
            ["Cảnh báo mở", openAlerts.length, '#7c3aed', '#f5f3ff'],
          ].map(([label, value, color, background]) => <div key={String(label)} style={{ padding: 18, borderRadius: 14, border: `1px solid ${background}`, background: String(background) }}><div style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</div><div style={{ color: String(color), fontSize: 28, fontWeight: 750, marginTop: 6 }}>{value}</div></div>)}
        </div>
        <h3 style={{ margin: '0 0 14px', fontSize: 17 }}>Cần xử lý</h3>
        <div className="admin-table-container">
          <table className="admin-table"><thead><tr><th>Khách hàng</th><th>Cảnh báo</th><th>Thời điểm phát hiện</th><th style={{ textAlign: 'right' }}>Thao tác</th></tr></thead><tbody>
            {openAlerts.length ? openAlerts.map((alert) => <tr key={alert.id}><td style={{ fontWeight: 700 }}>{alert.customer_code}</td><td><strong style={{ color: alert.severity === 'critical' ? '#b91c1c' : '#b45309' }}>{alert.title}</strong><div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{alert.message}</div></td><td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{formatAuditTime(alert.last_detected_at)}</td><td style={{ textAlign: 'right' }}>{alert.status === 'open' && <form action={acknowledgeSystemAlert.bind(null, alert.id)}><ConfirmSubmitButton promptMessage={`Xác nhận đã tiếp nhận cảnh báo của ${alert.customer_code}?`} className="admin-btn" style={{ padding: '8px 10px', color: '#047857', background: '#ecfdf5' }}><CheckCheck size={16} /> Đã tiếp nhận</ConfirmSubmitButton></form>}</td></tr>) : <tr><td colSpan={4}><div className="admin-table-empty"><CheckCheck size={42} strokeWidth={1} /><span>Không có cảnh báo đang mở.</span></div></td></tr>}
          </tbody></table>
        </div>
      </section>
      )}
      
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
                        <ExportScadaReportButton customerCode={m.customer_code} />
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

        {telegramConfig && (
          <div style={{ marginTop: 24, padding: 24, borderRadius: 16, border: '1px solid #bae6fd', background: '#f8fbff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}><BellRing size={22} color="#0284c7" /><div><h3 style={{ margin: 0, fontSize: 17 }}>Cảnh báo Telegram</h3><p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Bot token được mã hóa khi lưu. Bỏ trống token để giữ nguyên token đã cấu hình.</p></div></div>
            <form action={saveTelegramSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, alignItems: 'end' }}>
              <div style={{ display: 'grid', gap: 7 }}><label htmlFor="telegramToken" style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Bot Token</label><input id="telegramToken" name="botToken" type="password" placeholder={telegramConfig.bot_token_encrypted ? "Đã cấu hình — để trống để giữ nguyên" : "Dán Bot Token từ BotFather"} className="admin-input" autoComplete="new-password" /></div>
              <div style={{ display: 'grid', gap: 7 }}><label htmlFor="telegramChatId" style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Chat ID / Group ID</label><input id="telegramChatId" name="chatId" defaultValue={telegramConfig.chat_id} placeholder="Ví dụ: -1001234567890" className="admin-input" required /></div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, color: '#334155', fontWeight: 600 }}><input name="enabled" type="checkbox" defaultChecked={telegramConfig.enabled} /> Bật gửi Telegram</label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 16, padding: '12px 0' }}>
                {[['alert_scada_offline', 'Mất kết nối', 'scada_offline'], ['alert_scada_stale', 'Dữ liệu chậm', 'scada_stale'], ['alert_battery_low', 'Pin yếu', 'battery_low'], ['alert_usage_anomaly', 'Dùng bất thường', 'usage_anomaly']].map(([name, label, key]) => <label key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#475569', fontSize: 13 }}><input name={name} type="checkbox" defaultChecked={telegramConfig.alert_types[key]} /> {label}</label>)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, gridColumn: '1 / -1' }}><ConfirmSubmitButton promptMessage="Bạn có chắc chắn muốn lưu cấu hình Telegram?" className="admin-btn admin-btn-primary"><BellRing size={16} /> Lưu cấu hình Telegram</ConfirmSubmitButton><TelegramTestButton /></div>
            </form>
          </div>
        )}

        {alertThresholds && <div style={{ marginTop: 24, padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 17 }}>Ngưỡng cảnh báo SCADA</h3>
          <form action={async (formData: FormData) => { "use server"; await updateSystemSetting("scada_alert_thresholds", { stale_minutes: Number(formData.get("staleMinutes") ?? 120), battery_voltage: Number(formData.get("batteryVoltage") ?? 3.3), anomaly_multiplier: Number(formData.get("anomalyMultiplier") ?? 2), notification_cooldown_minutes: Number(formData.get("cooldownMinutes") ?? 360) }); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, alignItems: 'end' }}>
            {[['staleMinutes', 'Dữ liệu chậm (phút)', alertThresholds.stale_minutes, 1, 1440], ['batteryVoltage', 'Pin yếu (V)', alertThresholds.battery_voltage, 0.1, 10], ['anomalyMultiplier', 'Hệ số bất thường', alertThresholds.anomaly_multiplier, 1.1, 10], ['cooldownMinutes', 'Gửi lặp sau (phút)', alertThresholds.notification_cooldown_minutes, 15, 4320]].map(([name, label, value, min, max]) => <div key={String(name)} style={{ display: 'grid', gap: 7 }}><label htmlFor={String(name)} style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{label}</label><input id={String(name)} name={String(name)} type="number" defaultValue={Number(value)} min={Number(min)} max={Number(max)} step={String(name) === 'batteryVoltage' || String(name) === 'anomalyMultiplier' ? '0.1' : '1'} className="admin-input" required /></div>)}
            <ConfirmSubmitButton promptMessage="Bạn có chắc chắn muốn cập nhật ngưỡng cảnh báo SCADA?" className="admin-btn admin-btn-primary"><Edit size={16} /> Lưu ngưỡng</ConfirmSubmitButton>
          </form>
        </div>}

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

      {activeTab === 'admins' && adminSession.role === 'system_admin' && (
      <section className="admin-card">
        <div style={{ marginBottom: 28, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ padding: 12, background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)', color: '#4f46e5', borderRadius: 16 }}><Shield size={28} /></div>
          <div><h2 className="admin-section-title">Phân quyền quản trị</h2><p className="admin-section-desc">Mỗi email đăng nhập bằng mật khẩu quản trị chung sẽ nhận quyền tương ứng. Tài khoản đầu tiên được tạo là Quản trị hệ thống.</p></div>
        </div>
        <form action={saveAdminUser} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end', padding: 20, marginBottom: 24, borderRadius: 16, border: '1px dashed #c7d2fe', background: '#f8faff' }}>
          <div style={{ flex: '1 1 260px', display: 'grid', gap: 7 }}><label htmlFor="adminEmail" style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Email quản trị</label><input id="adminEmail" type="email" name="email" placeholder="admin@company.com" className="admin-input" required /></div>
          <div style={{ flex: '1 1 220px', display: 'grid', gap: 7 }}><label htmlFor="adminRole" style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Vai trò</label><select id="adminRole" name="role" defaultValue="viewer" className="admin-input">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <ConfirmSubmitButton promptMessage="Bạn có chắc chắn muốn lưu tài khoản quản trị này?" className="admin-btn admin-btn-primary"><Plus size={16} /> Lưu tài khoản</ConfirmSubmitButton>
        </form>
        <div className="admin-table-container"><table className="admin-table"><thead><tr><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th style={{ textAlign: 'right' }}>Thao tác</th></tr></thead><tbody>{adminUsers.length ? adminUsers.map((user) => <tr key={user.id}><td style={{ fontWeight: 600 }}>{user.email}{user.email === adminSession.email && <span style={{ marginLeft: 8, color: '#64748b', fontSize: 12 }}>(Bạn)</span>}</td><td><span className="admin-badge active">{roleLabels[user.role] ?? user.role}</span></td><td><span className={`admin-badge ${user.is_active ? 'success' : 'neutral'}`}>{user.is_active ? 'Đang hoạt động' : 'Đã khóa'}</span></td><td style={{ textAlign: 'right' }}>{user.email !== adminSession.email && <form action={toggleAdminUser.bind(null, user.id, !user.is_active)}><ConfirmSubmitButton promptMessage={`Bạn có chắc chắn muốn ${user.is_active ? 'khóa' : 'mở khóa'} tài khoản ${user.email}?`} className="admin-btn" style={{ padding: '8px 10px', color: user.is_active ? '#b91c1c' : '#047857', background: user.is_active ? '#fef2f2' : '#ecfdf5' }}>{user.is_active ? <Lock size={16} /> : <Unlock size={16} />}{user.is_active ? 'Khóa' : 'Mở khóa'}</ConfirmSubmitButton></form>}</td></tr>) : <tr><td colSpan={4}><div className="admin-table-empty"><Ghost size={48} strokeWidth={1} /><span>Chưa có tài khoản quản trị.</span></div></td></tr>}</tbody></table></div>
      </section>
      )}
      </div>
    </div>
  );
}
