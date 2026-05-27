"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function LookupForm() {
  const router = useRouter();
  const [customerCode, setCustomerCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customer_code: customerCode, phone })
    });
    const payload = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(payload.error || "Không thể tra cứu lúc này.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="form-panel" onSubmit={submit}>
      {error ? <div className="error-box">{error}</div> : null}
      <div className="field">
        <label htmlFor="customer_code">Mã khách hàng</label>
        <input
          id="customer_code"
          autoComplete="off"
          value={customerCode}
          onChange={(event) => setCustomerCode(event.target.value)}
          placeholder="VD: TTH307"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="phone">Số điện thoại đã đăng ký</label>
        <input
          id="phone"
          inputMode="tel"
          autoComplete="off"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="VD: 0912345678"
          required
        />
      </div>
      <button className="primary-button" type="submit" disabled={loading} style={{ width: "100%", marginBottom: 16 }}>
        <Search size={18} />
        {loading ? "Đang kiểm tra" : "Tra cứu"}
      </button>
      
      <div style={{ textAlign: "center", fontSize: 14, color: "var(--muted-text)" }}>
        Cần hỗ trợ? Liên hệ Hotline: <strong>0359 613 267</strong>
      </div>
    </form>
  );
}

