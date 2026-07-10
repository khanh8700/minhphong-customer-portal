import { Activity } from "lucide-react";

export default function ScadaLoading() {
  return (
    <main className="page section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Activity color="#3b82f6" /> Thông số ĐHĐT
        </h1>
        <div style={{ width: 150, height: 28, backgroundColor: '#e2e8f0', borderRadius: 20, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16, color: 'var(--ink)' }}>Lưu lượng nước</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ backgroundColor: 'var(--surface)', padding: 24, borderRadius: 16, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#f1f5f9', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: '60%', height: 14, backgroundColor: '#f1f5f9', marginBottom: 8, borderRadius: 4, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                <div style={{ width: '80%', height: 28, backgroundColor: '#e2e8f0', borderRadius: 6, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 18, marginBottom: 16, color: 'var(--ink)' }}>Thông số thiết bị</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ backgroundColor: 'var(--surface)', padding: 24, borderRadius: 16, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#f1f5f9', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: '50%', height: 14, backgroundColor: '#f1f5f9', marginBottom: 8, borderRadius: 4, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                <div style={{ width: '70%', height: 28, backgroundColor: '#e2e8f0', borderRadius: 6, animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}} />
    </main>
  );
}
