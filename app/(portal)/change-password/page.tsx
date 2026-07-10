"use client";

import { useState } from "react";

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải dài ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra, vui lòng thử lại.");
      }

      setSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page section">
      <div className="card" style={{ maxWidth: 500, margin: "0 auto", marginTop: 40, padding: 32 }}>
        <h2 style={{ marginBottom: 24 }}>Đổi Mật Khẩu</h2>
        
        {success && (
          <div style={{ padding: 16, backgroundColor: "#dcfce7", color: "#166534", borderRadius: 8, marginBottom: 24, fontWeight: 500 }}>
            ✅ Đổi mật khẩu thành công! Hãy sử dụng mật khẩu mới cho lần đăng nhập sau.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <div className="error-box" style={{ padding: 12, backgroundColor: "#fee2e2", color: "#b91c1c", borderRadius: 8 }}>{error}</div>}
          
          <div className="field" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>Mật khẩu hiện tại</label>
            <input 
              type="password" 
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Nhập MK hiện tại (hoặc SĐT)"
              required
              style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 8 }}
            />
          </div>

          <div className="field" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>Mật khẩu mới</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Ít nhất 6 ký tự"
              required
              minLength={6}
              style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 8 }}
            />
          </div>

          <div className="field" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontWeight: 600 }}>Xác nhận mật khẩu mới</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại MK mới"
              required
              minLength={6}
              style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 8 }}
            />
          </div>

          <button 
            type="submit" 
            className="primary-button" 
            disabled={loading}
            style={{ padding: 12, marginTop: 8, borderRadius: 8, fontSize: 16, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </button>
        </form>
      </div>
    </main>
  );
}
