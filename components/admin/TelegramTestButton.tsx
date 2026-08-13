"use client";

import { useState } from "react";
import { CheckCircle2, Send, TriangleAlert } from "lucide-react";
import { testTelegramSettings } from "@/app/admin/actions";

export default function TelegramTestButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleTest() {
    setLoading(true);
    setResult(null);
    try {
      setResult(await testTelegramSettings());
    } catch (error: unknown) {
      setResult({ success: false, message: error instanceof Error ? error.message : "Không thể gửi tin nhắn thử." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button type="button" onClick={handleTest} disabled={loading} className="admin-btn" style={{ color: "#0369a1", background: "#e0f2fe", border: "1px solid #bae6fd" }}>
        <Send size={16} /> {loading ? "Đang gửi..." : "Gửi thử Telegram"}
      </button>
      {result && (
        <div role="status" style={{ display: "flex", gap: 7, alignItems: "flex-start", color: result.success ? "#047857" : "#b91c1c", fontSize: 13 }}>
          {result.success ? <CheckCircle2 size={16} /> : <TriangleAlert size={16} />}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}
