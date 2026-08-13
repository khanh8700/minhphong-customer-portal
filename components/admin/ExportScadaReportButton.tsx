"use client";

import { Download } from "lucide-react";

export default function ExportScadaReportButton({ customerCode }: { customerCode: string }) {
  return (
    <a href={`/api/admin/reports/scada?customerCode=${encodeURIComponent(customerCode)}`} className="admin-btn" style={{ color: "#047857", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "8px 12px", whiteSpace: "nowrap" }}>
      <Download size={16} /> CSV
    </a>
  );
}
