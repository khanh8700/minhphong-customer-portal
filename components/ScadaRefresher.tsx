"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function ScadaRefresher({ lastUpdated }: { lastUpdated: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: 20 }}>
        <div style={{ position: 'relative', width: 8, height: 8 }}>
          <span style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: '#10b981', borderRadius: '50%', opacity: 0.75, animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
          <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8, backgroundColor: '#10b981', borderRadius: '50%' }} />
        </div>
        Cập nhật: <strong style={{ fontWeight: 600 }}>{lastUpdated}</strong>
      </div>
      <button 
        onClick={handleRefresh}
        disabled={isPending}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: '50%',
          border: '1px solid #e2e8f0', backgroundColor: 'white',
          color: isPending ? '#94a3b8' : '#3b82f6',
          cursor: isPending ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s'
        }}
        title="Làm mới dữ liệu"
      >
        <RefreshCw size={16} style={{ animation: isPending ? 'spin 1s linear infinite' : 'none' }} />
      </button>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
