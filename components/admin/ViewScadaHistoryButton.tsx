"use client";

import { useEffect, useState } from "react";
import { BarChart3, RefreshCw, X } from "lucide-react";
import { getScadaDailyProductionForAdmin, type AdminScadaHistoryResult } from "@/app/admin/actions";
import { ScadaDailyProductionChart } from "@/components/ScadaDailyProductionChart";

type ViewScadaHistoryButtonProps = {
  mappingId: string;
  customerCode: string;
};

export default function ViewScadaHistoryButton({ mappingId, customerCode }: ViewScadaHistoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdminScadaHistoryResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setIsOpen(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  async function loadHistory() {
    setLoading(true);
    try {
      setResult(await getScadaDailyProductionForAdmin(mappingId));
    } catch (error: unknown) {
      setResult({ success: false, error: error instanceof Error ? error.message : "Không thể tải lịch sử SCADA." });
    } finally {
      setLoading(false);
    }
  }

  async function openHistory() {
    setIsOpen(true);
    setResult(null);
    await loadHistory();
  }

  return (
    <>
      <button
        type="button"
        onClick={openHistory}
        disabled={loading}
        className="admin-btn"
        style={{ color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", padding: "8px 12px", whiteSpace: "nowrap" }}
      >
        <BarChart3 size={16} /> Biểu đồ
      </button>

      {isOpen && (
        <div
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setIsOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(5px)" }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby={`scada-history-title-${mappingId}`} style={{ width: "min(980px, 100%)", maxHeight: "min(700px, calc(100vh - 40px))", overflowY: "auto", borderRadius: 20, background: "#fff", boxShadow: "0 30px 70px rgba(15, 23, 42, 0.25)" }}>
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "20px 24px", borderBottom: "1px solid #e2e8f0" }}>
              <div>
                <h2 id={`scada-history-title-${mappingId}`} style={{ margin: 0, fontSize: 20 }}>Sản lượng SCADA · {customerCode}</h2>
                <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 13 }}>Dữ liệu lưu theo giờ, chỉ giữ trong 3 tháng.</p>
              </div>
              <button type="button" aria-label="Đóng biểu đồ" onClick={() => setIsOpen(false)} style={{ width: 38, height: 38, border: "none", borderRadius: 10, color: "#64748b", background: "#f1f5f9" }}><X size={20} /></button>
            </header>
            <div style={{ padding: 24 }}>
              {loading && <div className="empty"><RefreshCw size={22} style={{ animation: "scada-history-spin 1s linear infinite" }} /> Đang tải biểu đồ...</div>}
              {result && !result.success && <div className="empty">{result.error}</div>}
              {result?.success && <ScadaDailyProductionChart data={result.data} />}
            </div>
            <style>{`@keyframes scada-history-spin { to { transform: rotate(360deg); } }`}</style>
          </section>
        </div>
      )}
    </>
  );
}
