import { Droplets, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer style={{
      marginTop: 'auto',
      borderTop: '1px solid var(--line)',
      backgroundColor: '#f8fbfc',
      padding: '40px 24px',
      color: 'var(--muted)',
      fontSize: 14,
      width: '100%'
    }}>
      <div className="page" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 32
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, backgroundColor: 'var(--brand)', color: 'white', borderRadius: 8 }}>
              <Droplets size={20} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <strong style={{ fontSize: '1rem', lineHeight: 1.2, color: 'var(--ink)' }}>Công ty TNHH MTV đầu tư Minh Phong</strong>
              <span style={{ fontSize: '0.85rem' }}>Nhà máy nước Đình Tổ</span>
            </div>
          </div>
          <p style={{ lineHeight: 1.6, marginBottom: 16 }}>
            Hệ thống cung cấp dịch vụ tra cứu hóa đơn, sản lượng và thanh toán trực tuyến dành cho khách hàng.
          </p>
        </div>

        <div>
          <strong style={{ display: 'block', color: 'var(--ink)', marginBottom: 16, fontSize: 16 }}>Thông tin liên hệ hỗ trợ</strong>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <MapPin size={18} color="var(--brand)" style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ lineHeight: 1.5 }}>Thôn Đại Trạch, phường Trí Quả, tỉnh Bắc Ninh</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Phone size={18} color="var(--brand)" style={{ flexShrink: 0 }} />
              <span>Hotline: <strong style={{ color: 'var(--ink)' }}>0359 613 267</strong></span>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="page" style={{
        marginTop: 40,
        paddingTop: 24,
        borderTop: '1px solid var(--line)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        fontSize: 13
      }}>
        <span>&copy; {new Date().getFullYear()} Công ty TNHH MTV đầu tư Minh Phong. All rights reserved.</span>
        <span>Phát triển bởi <strong>MP Software</strong></span>
      </div>
    </footer>
  );
}
