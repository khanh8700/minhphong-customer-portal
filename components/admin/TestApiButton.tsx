"use client";

import { useState } from "react";
import { testScadaApi } from "@/app/admin/actions";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function TestApiButton({ apiUrl }: { apiUrl: string }) {
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string; data?: any }>({ isOpen: false, type: 'success', title: '', message: '' });

  async function handleTest() {
    setLoading(true);
    try {
      const result = await testScadaApi(apiUrl);
      if (result.error) {
        setModal({ isOpen: true, type: 'error', title: 'Lỗi API', message: result.error });
      } else if (result.success && result.data) {
        setModal({ isOpen: true, type: 'success', title: 'Thử nghiệm thành công!', message: 'Kết nối API hợp lệ. Dữ liệu mẫu nhận được:', data: result.data });
      }
    } catch (err: any) {
      setModal({ isOpen: true, type: 'error', title: 'Đã có lỗi xảy ra', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button 
        type="button"
        onClick={handleTest}
        disabled={loading}
        style={{ 
          color: "#10b981", 
          background: "transparent", 
          border: "none", 
          cursor: loading ? "wait" : "pointer", 
          fontWeight: 600, 
          padding: '6px 12px', 
          borderRadius: 6, 
          transition: 'all 0.2s',
          opacity: loading ? 0.7 : 1
        }} 
        onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#d1fae5')} 
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        {loading ? "Đang thử..." : "Test API"}
      </button>

      {modal.isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: 16, padding: '24px 32px', width: '90%', maxWidth: 420, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            transform: 'scale(1)', animation: 'modalIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              {modal.type === 'error' ? <AlertCircle size={28} color="#ef4444" /> : <CheckCircle2 size={28} color="#10b981" />}
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                {modal.title}
              </h3>
            </div>
            
            <p style={{ margin: '0 0 16px 0', fontSize: 15, color: '#475569', lineHeight: 1.6 }}>
              {modal.message}
            </p>
            
            {modal.data && (
              <div style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 24, fontSize: 13, color: '#334155', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid #e2e8f0', maxHeight: 300, overflowY: 'auto' }}>
                {Object.entries(modal.data).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', paddingBottom: 4 }}>
                    <strong style={{color: '#0f172a', marginRight: 16}}>{key}:</strong> 
                    <span style={{ wordBreak: 'break-all', textAlign: 'right' }}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: !modal.data ? 24 : 0 }}>
              <button 
                onClick={() => setModal({ ...modal, isOpen: false })}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', backgroundColor: modal.type === 'error' ? '#ef4444' : '#3b82f6', color: '#ffffff', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = modal.type === 'error' ? '#dc2626' : '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = modal.type === 'error' ? '#ef4444' : '#3b82f6'}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
