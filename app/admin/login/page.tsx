"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      setError("Mật khẩu không đúng");
      return;
    }

    router.push("/admin");
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", marginTop: 40 }} className="card">
      <h2 style={{ marginBottom: 16 }}>Đăng nhập Admin</h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="error-box">{error}</div>}
        <div className="field">
          <label>Mật khẩu quản trị</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="primary-button" style={{ width: "100%" }}>
          Đăng nhập
        </button>
      </form>
    </div>
  );
}
