"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, History } from "lucide-react";

export function LookupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customerCode, setCustomerCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const hasAutoSubmitted = useRef(false);

  async function executeLookup(codeToLookup: string, phoneToLookup: string) {
    setError(null);
    setLoading(true);

    const res = await fetch("/api/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customer_code: codeToLookup, phone: phoneToLookup })
    });
    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      setError(payload.error || "Không thể tra cứu lúc này.");
      return;
    }

    try {
      const newHistory = [codeToLookup, ...history.filter(c => c !== codeToLookup)].slice(0, 3);
      localStorage.setItem("recentCustomerCodes", JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (e) {}

    router.push("/dashboard");
    router.refresh();
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem("recentCustomerCodes");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {}

    // Auto-fill and auto-submit from URL search params
    const paramCode = searchParams.get("customer_code") || searchParams.get("code") || "";
    const paramPhone = searchParams.get("phone") || "";
    const auto = searchParams.get("auto");

    if (paramCode) {
      setCustomerCode(paramCode.toUpperCase());
    }
    if (paramPhone) {
      setPhone(paramPhone);
    }

    if (paramCode && paramPhone && (auto === "1" || auto === "true") && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      executeLookup(paramCode.toUpperCase(), paramPhone);
    }
  }, [searchParams]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    executeLookup(customerCode, phone);
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
          onChange={(event) => setCustomerCode(event.target.value.toUpperCase())}
          placeholder="VD: TTH307"
          required
        />
        {history.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <History size={12} /> Gần đây:
            </span>
            {history.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setCustomerCode(code)}
                style={{ 
                  fontSize: 12, padding: '2px 8px', borderRadius: 12, 
                  backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', 
                  color: '#334155', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              >
                {code}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="field">
        <label htmlFor="phone">Số điện thoại / Mật khẩu</label>
        <input
          id="phone"
          autoComplete="off"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="VD: 0912345678"
          required
        />
      </div>
      <button 
        className="primary-button" 
        type="submit" 
        disabled={loading} 
        style={{ width: "100%", marginBottom: 16, opacity: loading ? 0.8 : 1, cursor: loading ? 'wait' : 'pointer' }}
      >
        {loading ? (
          <>
            <svg className="animate-spin" style={{ marginRight: 8, height: 18, width: 18 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang xử lý...
          </>
        ) : (
          <>
            <Search size={18} style={{ marginRight: 8 }} />
            Tra cứu
          </>
        )}
      </button>
      
      <div style={{ textAlign: "center", fontSize: 14, color: "var(--muted-text)" }}>
        Cần hỗ trợ? Liên hệ Hotline: <strong>0359 613 267</strong>
      </div>
    </form>
  );
}

