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
  FileText
} from "lucide-react";

interface ContractPdfViewerProps {
  pdfUrl?: string | null;
  title?: string;
  className?: string;
  showToolbar?: boolean;
}

export function ContractPdfViewer({
  pdfUrl,
  title = "Văn bản hợp đồng dịch vụ cấp nước",
  className = "",
  showToolbar = true,
}: ContractPdfViewerProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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
        borderRadius: isFullscreen ? 0 : 16,
        overflow: "hidden",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
        ...(isFullscreen
          ? { position: "fixed", inset: 0, zIndex: 9999, height: "100vh" }
          : { height: "100%", minHeight: 650 }),
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
            padding: "10px 16px",
            backgroundColor: "#1e293b",
            borderBottom: "1px solid #334155",
            userSelect: "none",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f8fafc", fontSize: 13, fontWeight: 600 }}>
            <FileText size={16} color="#38bdf8" />
            <span style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Zoom Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#0f172a",
                borderRadius: 8,
                padding: "2px 4px",
                marginRight: 6,
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
                <ZoomOut size={14} />
              </button>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "#e2e8f0", minWidth: 42, textAlign: "center" }}>
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
                <ZoomIn size={14} />
              </button>
            </div>

            {/* Rotate */}
            <button
              type="button"
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
              <RotateCw size={14} />
            </button>

            {/* In */}
            <button
              type="button"
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
              <Printer size={14} />
            </button>

            {/* Tải về */}
            <button
              type="button"
              onClick={handleNativeDownload}
              style={{
                background: "#2563eb",
                border: "none",
                color: "#ffffff",
                padding: "6px 10px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
              title="Tải tệp PDF"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Tải PDF</span>
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
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
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
          padding: 16,
          backgroundColor: "#334155",
        }}
      >
        <div
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
            transition: "transform 0.15s ease",
            width: "100%",
            maxWidth: 880,
            height: isFullscreen ? "calc(100vh - 80px)" : "820px",
            backgroundColor: "#ffffff",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0`}
            title={title}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </div>
      </div>
    </div>
  );
}
