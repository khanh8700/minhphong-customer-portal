import { requirePortalSession } from "@/lib/session";
import { getCustomerSummary, getLatestBill } from "@/lib/data";
import { createPortalAdminClient } from "@/lib/supabase/admin";
import { fetchScadaData, formatScadaDelay, getScadaDataDelayMinutes, isScadaDataStale, type ScadaResponse } from "@/lib/scada";
import { getScadaDailyProduction } from "@/lib/scada-history";
import { Activity, Battery, BatteryFull, Gauge, Droplets, Zap, AlertCircle, AlertTriangle, Calculator } from "lucide-react";
import { ScadaRefresher } from "@/components/ScadaRefresher";
import { ScadaDailyProductionChart } from "@/components/ScadaDailyProductionChart";

export const dynamic = "force-dynamic";

export default async function ScadaPage() {
  const session = await requirePortalSession();
  const supabase = createPortalAdminClient();
  
  const [customer, latestBill] = await Promise.all([
    getCustomerSummary(session.customer_id),
    getLatestBill(session.customer_id, supabase)
  ]);

  if (!customer) {
    return <main className="page section"><div className="empty">Không tìm thấy thông tin khách hàng.</div></main>;
  }

  const { data: mapping } = await supabase
    .from("scada_mappings")
    .select("api_url")
    .eq("customer_code", customer.customer_code)
    .single();

  if (!mapping) {
    return (
      <main className="page section">
        <h1>Thông số ĐHĐT (SCADA)</h1>
        <div className="empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Activity size={48} color="#94a3b8" />
          <p>Tài khoản của bạn chưa được liên kết với hệ thống SCADA.</p>
        </div>
      </main>
    );
  }

  const scadaData = await fetchScadaData(mapping.api_url);

  if (!scadaData) {
    return (
      <main className="page section">
        <h1>Thông số ĐHĐT (SCADA)</h1>
        <div className="empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <AlertCircle size={48} color="#ef4444" />
          <p>Không thể kết nối đến thiết bị. Vui lòng thử lại sau.</p>
        </div>
      </main>
    );
  }

  const scadaDailyProduction = await getScadaDailyProduction(customer.customer_code, supabase);
  const scadaDelayMinutes = getScadaDataDelayMinutes(scadaData.thoi_gian);
  const isScadaStale = isScadaDataStale(scadaDelayMinutes);

  let formattedTime = scadaData.thoi_gian;
  if (typeof formattedTime === 'string') {
    const parts = formattedTime.split(" ");
    if (parts.length === 2 && parts[0].includes("-")) {
      const [year, month, day] = parts[0].split("-");
      formattedTime = `${parts[1]} ${day}/${month}/${year}`;
    }
  }

  // Parse and group data
  const flowKeys: Array<keyof ScadaResponse> = ['Forward_flow_total', 'Reverse_flow_total', 'Net_flow_total', 'Flow_rate', 'Velocity'];
  const deviceKeys: Array<keyof ScadaResponse> = ['Internal_battery', 'External_battery'];

  const getCardProps = (key: keyof ScadaResponse, value: ScadaResponse[keyof ScadaResponse]) => {
    let Icon = Activity;
    let color = "#3b82f6";
    let bg = "#eff6ff";
    let label: string = key;
    let isWarning = false;
    
    if (key.includes('Flow_rate')) { Icon = Gauge; color = "#0ea5e9"; bg = "#e0f2fe"; label = "Lưu lượng tức thời (m³/h)"; }
    else if (key.includes('Net_flow_total')) { Icon = Droplets; color = "#3b82f6"; bg = "#eff6ff"; label = "Lưu lượng tổng (m³)"; }
    else if (key.includes('Forward_flow_total')) { Icon = Activity; color = "#6366f1"; bg = "#e0e7ff"; label = "Lưu lượng thuận (m³)"; }
    else if (key.includes('Reverse_flow_total')) { Icon = Activity; color = "#8b5cf6"; bg = "#ede9fe"; label = "Lưu lượng nghịch (m³)"; }
    else if (key.includes('Velocity')) { Icon = Zap; color = "#f59e0b"; bg = "#fef3c7"; label = "Vận tốc (m/s)"; }
    else if (key.includes('Internal_battery')) { 
      Icon = Battery; label = "Pin trong (V)";
      if (typeof value === 'number' && value < 3.3) {
        color = "#ef4444"; bg = "#fef2f2"; isWarning = true;
      } else {
        color = "#10b981"; bg = "#d1fae5";
      }
    }
    else if (key.includes('External_battery')) { 
      Icon = BatteryFull; label = "Pin ngoài (V)"; 
      if (typeof value === 'number' && value < 3.3) {
        color = "#ef4444"; bg = "#fef2f2"; isWarning = true;
      } else {
        color = "#10b981"; bg = "#d1fae5";
      }
    }

    return { Icon, color, bg, label, isWarning };
  };

  const renderCard = (key: keyof ScadaResponse) => {
    const value = scadaData[key];
    const { Icon, color, bg, label, isWarning } = getCardProps(key, value);
    
    return (
      <div key={key} style={{ 
        backgroundColor: isWarning ? '#fffcfc' : 'var(--surface)', 
        padding: 24, 
        borderRadius: 16, 
        border: `1px solid ${isWarning ? '#fca5a5' : 'var(--border)'}`, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 16,
        boxShadow: isWarning ? '0 4px 12px rgba(239,68,68,0.1)' : 'none',
        position: 'relative'
      }}>
        {isWarning && (
          <div style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', padding: 4 }}>
            <AlertCircle size={16} />
          </div>
        )}
        <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={24} />
        </div>
        <div>
          <div style={{ fontSize: 13, color: isWarning ? '#b91c1c' : '#475569', marginBottom: 4, fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: isWarning ? '#991b1b' : 'var(--text-primary)' }}>
            {typeof value === 'number' ? value.toLocaleString('vi-VN', { maximumFractionDigits: 3 }) : String(value)}
          </div>
        </div>
      </div>
    );
  };

  // Estimated Consumption and Amount
  let estimatedConsumption = 0;
  let estimatedAmount = 0;
  let baseIndex = 0;
  
  if (latestBill && scadaData?.Forward_flow_total) {
    baseIndex = latestBill.new_reading || 0;
    const currentIndex = Math.floor(scadaData.Forward_flow_total);
    if (currentIndex > baseIndex) {
      estimatedConsumption = currentIndex - baseIndex;
      if (latestBill.consumption && latestBill.consumption > 0) {
        const avgPrice = latestBill.total_amount / latestBill.consumption;
        estimatedAmount = estimatedConsumption * avgPrice;
      }
    }
  }

  return (
    <main className="page section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Activity color="#3b82f6" /> Thông số ĐHĐT
        </h1>
        {formattedTime && (
          <ScadaRefresher lastUpdated={formattedTime} delayMinutes={scadaDelayMinutes} />
        )}
      </div>

      {isScadaStale && scadaDelayMinutes !== null && (
        <section role="alert" style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 24,
          padding: '20px 24px',
          border: '1px solid #fbbf24',
          borderLeft: '6px solid #f59e0b',
          borderRadius: 16,
          color: '#92400e',
          background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
          boxShadow: '0 8px 20px rgba(180, 83, 9, 0.12)',
        }}>
          <div style={{ display: 'flex', width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 12, color: '#b45309', background: '#fef3c7' }}>
            <AlertTriangle size={26} />
          </div>
          <div>
            <h2 style={{ margin: '1px 0 6px', color: '#92400e', fontSize: 18 }}>Dữ liệu SCADA cập nhật chậm</h2>
            <p style={{ margin: 0, color: '#a16207', fontSize: 14, lineHeight: 1.6 }}>
              Thông số nhận được đã chậm <strong>{formatScadaDelay(scadaDelayMinutes)}</strong>, vượt ngưỡng cảnh báo 120 phút. Vui lòng kiểm tra kết nối thiết bị hoặc thử làm mới dữ liệu.
            </p>
          </div>
        </section>
      )}

      {latestBill && estimatedConsumption > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="bill-period-box" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Calculator color="var(--brand)" size={24} />
              <h2 style={{ fontSize: 18, margin: 0, color: 'var(--brand-dark)' }}>Dự toán kỳ hiện tại</h2>
              <span className="badge">Tham khảo</span>
            </div>
            
            <div className="bill-metrics-grid">
              <div>
                <div className="muted-text">Chỉ số cũ kỳ trước</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {baseIndex.toLocaleString('vi-VN')}
                </div>
              </div>
              <div>
                <div className="muted-text">Chỉ số hiện tại (SCADA)</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {Math.floor(scadaData.Forward_flow_total).toLocaleString('vi-VN')}
                </div>
              </div>
              <div>
                <div className="muted-text">Tiêu thụ tạm tính</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand)' }}>
                  {estimatedConsumption.toLocaleString('vi-VN')} <span style={{ fontSize: 14 }}>m³</span>
                </div>
              </div>
              <div>
                <div className="muted-text">Thành tiền tạm tính</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--danger)' }}>
                  {estimatedAmount > 0 ? `${Math.round(estimatedAmount).toLocaleString('vi-VN')} đ` : 'Chưa có đơn giá'}
                </div>
              </div>
            </div>
            <p style={{ marginTop: 16, fontSize: 13, color: '#64748b', fontStyle: 'italic', margin: '16px 0 0 0' }}>
              * Thành tiền tạm tính được ước lượng dựa trên đơn giá bình quân của kỳ thanh toán gần nhất ({latestBill.billing_periods?.period_name || 'kỳ trước'}).
            </p>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 32 }}>
        <ScadaDailyProductionChart data={scadaDailyProduction} />
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16, color: 'var(--ink)' }}>Lưu lượng nước</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {flowKeys.map(renderCard)}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 18, marginBottom: 16, color: 'var(--ink)' }}>Thông số thiết bị</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {deviceKeys.map(renderCard)}
        </div>
      </div>
    </main>
  );
}
