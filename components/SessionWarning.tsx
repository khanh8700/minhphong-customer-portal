"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

export function SessionWarning({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const expireTime = new Date(expiresAt).getTime();
    
    const checkTime = () => {
      const now = Date.now();
      const remainingMinutes = Math.floor((expireTime - now) / 60000);
      setTimeLeft(remainingMinutes);
    };

    checkTime();
    const interval = setInterval(checkTime, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Show warning if less than 5 minutes remaining
  if (timeLeft === null || timeLeft > 5) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      backgroundColor: '#fef2f2',
      border: '1px solid #fca5a5',
      color: '#991b1b',
      padding: '12px 20px',
      borderRadius: 12,
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      zIndex: 50,
      animation: 'slideUp 0.3s ease-out'
    }}>
      <AlertTriangle size={20} color="#dc2626" />
      <div>
        <strong>Cảnh báo phiên làm việc</strong>
        <div style={{ fontSize: 13, marginTop: 2 }}>
          {timeLeft > 0 
            ? `Phiên tra cứu của bạn sẽ tự động đăng xuất sau ${timeLeft} phút nữa.`
            : 'Phiên tra cứu đã hết hạn. Vui lòng tải lại trang.'}
        </div>
      </div>
    </div>
  );
}
