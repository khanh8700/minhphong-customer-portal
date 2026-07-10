"use client";

import { useState, useRef, useEffect } from "react";
import { UserSquare2, Loader2, MapPin } from "lucide-react";
import { searchCustomersAction } from "@/app/admin/actions";

interface Props {
  name: string;
  placeholder?: string;
  required?: boolean;
}

export default function CustomerAutocomplete({ name, placeholder, required }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!inputRef.current) return;
    if (query.trim().length > 0) {
      if (isLoading) {
        inputRef.current.setCustomValidity("Đang kiểm tra mã...");
      } else {
        const exactMatch = suggestions.find(c => c.customer_code.toUpperCase() === query.trim().toUpperCase());
        if (!exactMatch) {
          inputRef.current.setCustomValidity("Mã Khách Hàng không tồn tại.");
        } else {
          inputRef.current.setCustomValidity("");
        }
      }
    } else {
      inputRef.current.setCustomValidity(required ? "Vui lòng nhập Mã Khách Hàng." : "");
    }
  }, [query, isLoading, suggestions, required]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (val.trim().length >= 2) {
      setIsLoading(true);
      timerRef.current = setTimeout(async () => {
        try {
          const results = await searchCustomersAction(val.trim());
          setSuggestions(results);
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      }, 500);
    } else {
      setSuggestions([]);
      setIsLoading(false);
    }
  };

  const handleSelect = (customerCode: string) => {
    setQuery(customerCode);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.setCustomValidity("");
      inputRef.current.focus();
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <UserSquare2 size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#64748b", zIndex: 2 }} />
      <input 
        ref={inputRef}
        type="text" 
        name={name}
        value={query}
        onChange={handleChange}
        onFocus={() => { if (query.trim().length >= 2) setIsOpen(true); }}
        placeholder={placeholder || "Tìm / Nhập mã KH..."}
        required={required}
        autoComplete="off"
        className="admin-input"
        style={{ paddingLeft: 40, position: "relative", zIndex: 1 }}
      />
      {isLoading && (
        <Loader2 size={16} className="animate-spin" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", zIndex: 2 }} />
      )}
      
      {isOpen && (query.trim().length >= 2) && !isLoading && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: 8,
          backgroundColor: "#fff",
          borderRadius: 12,
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
          border: "1px solid #e2e8f0",
          zIndex: 50,
          maxHeight: 250,
          overflowY: "auto"
        }}>
          {suggestions.length > 0 ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 8 }}>
              {suggestions.map((c, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c.customer_code)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      background: "transparent",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                      <strong style={{ fontSize: 14, color: "#3b82f6" }}>{c.customer_code}</strong>
                      <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{c.full_name}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: "16px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
              Không tìm thấy khách hàng nào khớp với &quot;{query}&quot;.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
