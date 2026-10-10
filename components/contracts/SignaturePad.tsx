"use client";

import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { RotateCcw } from "lucide-react";

export interface SignaturePadRef {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
  drawSample?: () => void;
}

interface SignaturePadProps {
  onBegin?: () => void;
  onEnd?: () => void;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(function SignaturePad(
  { onBegin, onEnd },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const isDrawing = useRef(false);

  const getCoordinates = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const drawSample = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Đường nét chữ ký uốn lượn cách điệu tự nhiên
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.65);
    ctx.bezierCurveTo(w * 0.2, h * 0.2, w * 0.3, h * 0.15, w * 0.35, h * 0.45);
    ctx.bezierCurveTo(w * 0.4, h * 0.75, w * 0.25, h * 0.8, w * 0.45, h * 0.5);
    ctx.bezierCurveTo(w * 0.5, h * 0.35, w * 0.55, h * 0.65, w * 0.62, h * 0.45);
    ctx.bezierCurveTo(w * 0.68, h * 0.3, w * 0.72, h * 0.6, w * 0.8, h * 0.4);
    ctx.bezierCurveTo(w * 0.85, h * 0.3, w * 0.88, h * 0.25, w * 0.9, h * 0.35);
    ctx.stroke();

    // Nét gạch chân chữ ký
    ctx.beginPath();
    ctx.moveTo(w * 0.18, h * 0.78);
    ctx.bezierCurveTo(w * 0.4, h * 0.72, w * 0.65, h * 0.84, w * 0.88, h * 0.75);
    ctx.stroke();

    ctx.restore();
    setHasDrawn(true);
  };

  useImperativeHandle(ref, () => ({
    clear: clearCanvas,
    isEmpty: () => !hasDrawn,
    toDataURL: () => {
      const canvas = canvasRef.current;
      if (!canvas) return "";
      return canvas.toDataURL("image/png");
    },
    drawSample,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      if ("touches" in e && e.cancelable) e.preventDefault();
      isDrawing.current = true;
      const coords = getCoordinates(e, canvas);
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
      }
      onBegin?.();
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      if ("touches" in e && e.cancelable) e.preventDefault();
      const coords = getCoordinates(e, canvas);
      if (ctx) {
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
      setHasDrawn(true);
    };

    const stopDrawing = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      if ("touches" in e && e.cancelable) e.preventDefault();
      isDrawing.current = false;
      if (ctx) {
        ctx.closePath();
      }
      onEnd?.();
    };

    // Add mouse listeners
    canvas.addEventListener("mousedown", startDrawing);
    window.addEventListener("mousemove", draw);
    window.addEventListener("mouseup", stopDrawing);

    // Add touch listeners
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    window.addEventListener("touchmove", draw, { passive: false });
    window.addEventListener("touchend", stopDrawing, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      window.removeEventListener("mousemove", draw);
      window.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("touchstart", startDrawing);
      window.removeEventListener("touchmove", draw);
      window.removeEventListener("touchend", stopDrawing);
    };
  }, [onBegin, onEnd]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          border: "2px dashed #cbd5e1",
          borderRadius: 12,
          backgroundColor: "#f8fafc",
          position: "relative",
          touchAction: "none",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: 180,
            cursor: "crosshair",
            backgroundColor: "#ffffff",
          }}
        />
        {!hasDrawn && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "#94a3b8",
              pointerEvents: "none",
              fontSize: 14,
              textAlign: "center",
              userSelect: "none",
            }}
          >
            Vẽ chữ ký của Quý khách vào ô này
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          type="button"
          onClick={clearCanvas}
          disabled={!hasDrawn}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 13,
            color: hasDrawn ? "#64748b" : "#cbd5e1",
            cursor: hasDrawn ? "pointer" : "not-allowed",
          }}
        >
          <RotateCcw size={14} />
          Xóa vẽ lại
        </button>
      </div>
    </div>
  );
});
