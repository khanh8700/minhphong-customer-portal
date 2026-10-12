"use client";

import { useState } from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Printer, 
  Maximize2, 
  Minimize2,
  FileText,
  ShieldCheck
} from "lucide-react";
import { CertificateDetailModal } from "./CertificateDetailModal";

interface ContractPdfViewerProps {
  pdfUrl?: string | null;
  title?: string;
  className?: string;
  showToolbar?: boolean;
  contract?: any;
  onViewCert?: () => void;
}

export function ContractPdfViewer({
  pdfUrl,
  title = "Văn bản hợp đồng dịch vụ cấp nước",
  className = "",
  showToolbar = true,
  contract,
  onViewCert,
}: ContractPdfViewerProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState<boolean>(false);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 175));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 60));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleNativePrint = () => {
    if (pdfUrl) {
      const win = window.open(pdfUrl, "_blank");
      win?.print();
    }
  };

  const handleNativeDownload = () => {
    if (pdfUrl) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = `${title.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (!pdfUrl) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
          backgroundColor: "#f8fafc",
          border: "1px dashed #cbd5e1",
          borderRadius: 16,
          color: "#64748b",
          minHeight: 450,
        }}
        className={className}
      >
        <FileText size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
        <p style={{ fontWeight: 600, fontSize: 15, color: "#334155", margin: 0 }}>
          Chưa có tệp văn bản hợp đồng
        </p>
        <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
          Tài liệu hợp đồng PDF đang được tạo hoặc bảo vệ.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0f172a",
        border: "1px solid #334155",
        borderRadius: isFullscreen ? 0 : 12,
        overflow: "hidden",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
        ...(isFullscreen
          ? { position: "fixed", inset: 0, zIndex: 9999, height: "100vh" }
          : { height: "100%", minHeight: 0, flex: 1 }),
      }}
      className={className}
    >
      {/* Toolbar */}
      {showToolbar && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            backgroundColor: "#1e293b",
            borderBottom: "1px solid #334155",
            userSelect: "none",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f8fafc", fontSize: 12, fontWeight: 600, minWidth: 0 }}>
            <FileText size={15} color="#38bdf8" style={{ flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={title}>
              {title}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            {/* Zoom Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#0f172a",
                borderRadius: 8,
                padding: "2px 4px",
              }}
            >
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 60}
                style={{
                  background: "transparent",
                  border: "none",
                  color: zoom <= 60 ? "#475569" : "#cbd5e1",
                  padding: "4px 6px",
                  borderRadius: 4,
                  cursor: zoom <= 60 ? "not-allowed" : "pointer",
                }}
                title="Thu nhỏ"
              >
                <ZoomOut size={13} />
              </button>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "#e2e8f0", minWidth: 36, textAlign: "center" }}>
                {zoom}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 175}
                style={{
                  background: "transparent",
                  border: "none",
                  color: zoom >= 175 ? "#475569" : "#cbd5e1",
                  padding: "4px 6px",
                  borderRadius: 4,
                  cursor: zoom >= 175 ? "not-allowed" : "pointer",
                }}
                title="Phóng to"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Rotate (Desktop only) */}
            <button
              type="button"
              className="hide-on-mobile"
              onClick={handleRotate}
              style={{
                background: "#0f172a",
                border: "1px solid #334155",
                color: "#cbd5e1",
                padding: "6px 8px",
                borderRadius: 8,
                cursor: "pointer",
              }}
              title="Xoay 90 độ"
            >
              <RotateCw size={13} />
            </button>

            {/* In (Desktop only) */}
            <button
              type="button"
              className="hide-on-mobile"
              onClick={handleNativePrint}
              style={{
                background: "#0f172a",
                border: "1px solid #334155",
                color: "#cbd5e1",
                padding: "6px 8px",
                borderRadius: 8,
                cursor: "pointer",
              }}
              title="In văn bản"
            >
              <Printer size={13} />
            </button>

            {/* Tra cứu Chứng Thư Số */}
            <button
              type="button"
              onClick={() => {
                if (onViewCert) onViewCert();
                else setIsCertModalOpen(true);
              }}
              style={{
                background: "#065f46",
                border: "1px solid #059669",
                color: "#ecfdf5",
                padding: "6px 9px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 11.5,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
              title="Xem chi tiết chữ ký số & chứng thư số"
            >
              <ShieldCheck size={13} color="#34d399" />
              <span className="hide-on-mobile">Chứng Thư</span>
            </button>

            {/* Tải về */}
            <button
              type="button"
              onClick={handleNativeDownload}
              style={{
                background: "#2563eb",
                border: "none",
                color: "#ffffff",
                padding: "6px 9px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 11.5,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
              title="Tải tệp PDF"
            >
              <Download size={13} />
              <span className="hide-on-mobile">Tải PDF</span>
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                background: "#0f172a",
                border: "1px solid #334155",
                color: "#cbd5e1",
                padding: "6px 8px",
                borderRadius: 8,
                cursor: "pointer",
              }}
              title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>
      )}

      {/* Frame hiển thị PDF */}
      <div
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          overflow: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
          backgroundColor: "#1e293b",
        }}
      >
        <div
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
            transition: "transform 0.15s ease",
            width: "100%",
            maxWidth: 880,
            height: "100%",
            minHeight: isFullscreen ? "calc(100vh - 80px)" : "600px",
            backgroundColor: "#ffffff",
            boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.4)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0`}
            title={title}
            style={{ width: "100%", height: "100%", minHeight: "100%", border: "none", display: "block" }}
          />
        </div>
      </div>

      <CertificateDetailModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        contract={contract}
      />
    </div>
  );
}
