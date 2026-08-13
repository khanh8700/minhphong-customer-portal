"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Battery,
  BatteryCharging,
  Clock3,
  Droplets,
  Eye,
  Gauge,
  RefreshCw,
  Radio,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  getScadaDetails,
  type AdminScadaDetailsResult,
} from "@/app/admin/actions";
import type { ScadaResponse } from "@/lib/scada";
import { formatScadaDelay, getScadaDataDelayMinutes, isScadaDataStale } from "@/lib/scada";

type ViewScadaDetailsButtonProps = {
  mappingId: string;
  customerCode: string;
};

type MetricConfig = {
  key: keyof ScadaResponse;
  label: string;
  unit: string;
  icon: LucideIcon;
  color: string;
  background: string;
};

const metrics: MetricConfig[] = [
  { key: "Forward_flow_total", label: "Lưu lượng thuận", unit: "m³", icon: ArrowUpRight, color: "#4f46e5", background: "#eef2ff" },
  { key: "Reverse_flow_total", label: "Lưu lượng nghịch", unit: "m³", icon: ArrowDownLeft, color: "#7c3aed", background: "#f5f3ff" },
  { key: "Net_flow_total", label: "Lưu lượng tổng", unit: "m³", icon: Droplets, color: "#2563eb", background: "#eff6ff" },
  { key: "Flow_rate", label: "Lưu lượng tức thời", unit: "m³/h", icon: Gauge, color: "#0284c7", background: "#e0f2fe" },
  { key: "Velocity", label: "Vận tốc dòng chảy", unit: "m/s", icon: Zap, color: "#d97706", background: "#fffbeb" },
  { key: "Internal_battery", label: "Pin trong", unit: "V", icon: Battery, color: "#059669", background: "#ecfdf5" },
  { key: "External_battery", label: "Pin ngoài", unit: "V", icon: BatteryCharging, color: "#059669", background: "#ecfdf5" },
];

function formatValue(value: unknown) {
  if (typeof value === "number") {
    return value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
  }

  if (typeof value === "string" && value.trim()) return value;
  return "—";
}

function formatScadaTime(value: string | undefined) {
  if (!value) return "Không có thời gian cập nhật";

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/);
  if (match) return `${match[4]} ${match[3]}/${match[2]}/${match[1]}`;

  return value;
}

export default function ViewScadaDetailsButton({ mappingId, customerCode }: ViewScadaDetailsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdminScadaDetailsResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  async function loadDetails() {
    setLoading(true);
    try {
      setResult(await getScadaDetails(mappingId));
    } catch (error: unknown) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Không thể lấy thông số đồng hồ điện từ.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function openDetails() {
    setIsOpen(true);
    setResult(null);
    await loadDetails();
  }

  const scadaData = result?.success ? result.data : null;
  const scadaDelayMinutes = scadaData ? getScadaDataDelayMinutes(scadaData.thoi_gian) : null;
  const isScadaStale = isScadaDataStale(scadaDelayMinutes);

  return (
    <>
      <button
        type="button"
        onClick={openDetails}
        disabled={loading}
        className="admin-btn"
        style={{
          color: "#2563eb",
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          padding: "8px 12px",
          whiteSpace: "nowrap",
        }}
        title={`Xem thông số đồng hồ điện từ của ${customerCode}`}
      >
        <Eye size={16} />
        {loading && !isOpen ? "Đang tải..." : "Xem thông số"}
      </button>

      {isOpen && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(5px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`scada-details-title-${mappingId}`}
            style={{
              width: "min(920px, 100%)",
              maxHeight: "min(760px, calc(100vh - 40px))",
              overflowY: "auto",
              borderRadius: 20,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              boxShadow: "0 30px 70px rgba(15, 23, 42, 0.25)",
            }}
          >
            <header style={{
              position: "sticky",
              top: 0,
              zIndex: 1,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              padding: "22px 24px",
              borderBottom: "1px solid #e2e8f0",
              background: "rgba(255, 255, 255, 0.96)",
              backdropFilter: "blur(10px)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  borderRadius: 12,
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
                }}>
                  <Activity size={23} />
                </div>
                <div>
                  <h2 id={`scada-details-title-${mappingId}`} style={{ margin: 0, color: "#0f172a", fontSize: 20 }}>
                    Thông số đồng hồ điện từ
                  </h2>
                  <div style={{ marginTop: 5, color: "#64748b", fontSize: 14 }}>
                    Khách hàng <strong style={{ color: "#334155" }}>{customerCode}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Đóng hộp thông số"
                onClick={() => setIsOpen(false)}
                style={{
                  width: 38,
                  height: 38,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "none",
                  borderRadius: 10,
                  color: "#64748b",
                  background: "#f1f5f9",
                }}
              >
                <X size={20} />
              </button>
            </header>

            <div style={{ padding: 24 }}>
              {loading && !scadaData && (
                <div style={{ minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, color: "#64748b" }}>
                  <RefreshCw size={34} color="#0284c7" style={{ animation: "scada-detail-spin 1s linear infinite" }} />
                  <span>Đang lấy thông số mới nhất từ SCADA...</span>
                </div>
              )}

              {result && !result.success && (
                <div style={{ minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", color: "#dc2626", background: "#fef2f2" }}>
                    <AlertCircle size={30} />
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 6px", color: "#991b1b", fontSize: 17 }}>Không lấy được dữ liệu</h3>
                    <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>{result.error}</p>
                  </div>
                  <button type="button" onClick={loadDetails} disabled={loading} className="admin-btn admin-btn-primary" style={{ marginTop: 8 }}>
                    <RefreshCw size={16} /> Thử lại
                  </button>
                </div>
              )}

              {scadaData && (
                <>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 14,
                    marginBottom: 22,
                    padding: "14px 16px",
                    border: "1px solid #dbeafe",
                    borderRadius: 14,
                    background: "#f8fbff",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#047857", fontSize: 13, fontWeight: 700 }}>
                        <Radio size={16} /> Trực tuyến
                      </span>
                      {scadaData.name && (
                        <span style={{ color: "#334155", fontSize: 14 }}>
                          Thiết bị: <strong>{scadaData.name}</strong>
                        </span>
                      )}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#64748b", fontSize: 13 }}>
                        <Clock3 size={15} /> {formatScadaTime(scadaData.thoi_gian)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={loadDetails}
                      disabled={loading}
                      className="admin-btn"
                      style={{ padding: "8px 12px", color: "#0369a1", background: "#e0f2fe" }}
                    >
                      <RefreshCw size={16} style={loading ? { animation: "scada-detail-spin 1s linear infinite" } : undefined} />
                      {loading ? "Đang làm mới" : "Làm mới"}
                    </button>
                  </div>

                  {isScadaStale && scadaDelayMinutes !== null && (
                    <div role="alert" style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 22, padding: "14px 16px", border: "1px solid #fbbf24", borderLeft: "5px solid #f59e0b", borderRadius: 12, color: "#92400e", background: "#fffbeb" }}>
                      <AlertTriangle size={21} style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <strong>Dữ liệu SCADA cập nhật chậm</strong>
                        <div style={{ marginTop: 3, color: "#a16207", fontSize: 13, lineHeight: 1.5 }}>
                          Thời điểm nhận được đã chậm {formatScadaDelay(scadaDelayMinutes)}, vượt ngưỡng 120 phút.
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                    {metrics.map((metric) => {
                      const Icon = metric.icon;
                      const value = scadaData[metric.key];
                      const isLowBattery = metric.key.includes("battery") && typeof value === "number" && value < 3.3;

                      return (
                        <article key={metric.key} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          minHeight: 104,
                          padding: 16,
                          borderRadius: 14,
                          border: `1px solid ${isLowBattery ? "#fecaca" : "#e2e8f0"}`,
                          background: isLowBattery ? "#fffafa" : "#ffffff",
                        }}>
                          <div style={{
                            width: 44,
                            height: 44,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            borderRadius: 12,
                            color: isLowBattery ? "#dc2626" : metric.color,
                            background: isLowBattery ? "#fef2f2" : metric.background,
                          }}>
                            <Icon size={22} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ marginBottom: 5, color: isLowBattery ? "#b91c1c" : "#64748b", fontSize: 12, fontWeight: 600 }}>
                              {metric.label}
                            </div>
                            <div style={{ color: isLowBattery ? "#991b1b" : "#0f172a", fontSize: 22, fontWeight: 750, lineHeight: 1.2 }}>
                              {formatValue(value)} <span style={{ color: "#64748b", fontSize: 13, fontWeight: 600 }}>{metric.unit}</span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <style>{`@keyframes scada-detail-spin { to { transform: rotate(360deg); } }`}</style>
          </section>
        </div>
      )}
    </>
  );
}
