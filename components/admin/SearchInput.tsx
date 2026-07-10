"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useRef } from "react";
import { UserSquare2 } from "lucide-react";

interface Props {
  name: string;
  paramName: string;
  placeholder?: string;
  required?: boolean;
}

export default function SearchInput({ name, paramName, placeholder, required }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  const initialQuery = searchParams.get(paramName) || "";
  const [query, setQuery] = useState(initialQuery);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (val.trim()) {
        params.set(paramName, val.trim());
      } else {
        params.delete(paramName);
      }
      router.replace(pathname + "?" + params.toString(), { scroll: false });
    }, 500);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <UserSquare2 size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
      <input 
        type="text" 
        name={name}
        value={query}
        onChange={handleChange}
        placeholder={placeholder || "Mã Khách Hàng..."}
        required={required}
        className="admin-input"
        style={{ paddingLeft: 40 }}
      />
    </div>
  );
}
