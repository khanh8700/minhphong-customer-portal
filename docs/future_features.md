# Kế hoạch phát triển các tính năng mở rộng (Future Features)

Tài liệu này ghi chú lại cấu trúc cơ sở dữ liệu đã được chuẩn bị sẵn trong đợt cập nhật (Migration) hệ thống để phục vụ cho các tính năng sẽ được phát triển trong tương lai. Việc chuẩn bị trước cấu trúc này giúp giảm thiểu rủi ro khi thay đổi Database sau này.

## 1. Hệ thống cấu hình động (System Settings)
Bảng `system_settings` đã được tạo để lưu trữ các cấu hình của hệ thống có thể thay đổi linh hoạt từ trang Admin mà không cần sửa code.
- **Bảng DB:** `system_settings`
- **Các Key đã cấu hình:**
  - `data_history_months_limit`: Giới hạn số tháng dữ liệu (Hóa đơn, Lịch sử dùng nước, Thanh toán) được tải về mặc định (VD: 12 tháng).

## 2. Tính năng Thông báo BQL (Announcements)
Tính năng cho phép Ban Quản Lý (Admin) gửi các thông báo đến khách hàng trên Portal (Ví dụ: Thông báo lịch cắt nước, nhắc nhở thanh toán...).
- **Bảng DB:** `announcements`
- **Cấu trúc:**
  - `id` (uuid): Khóa chính
  - `title` (text): Tiêu đề thông báo
  - `content` (text): Nội dung chi tiết
  - `type` (text): Phân loại (info, warning, danger)
  - `is_active` (boolean): Trạng thái hiển thị
  - `created_at` (timestamptz)
- **Hướng phát triển UI:**
  - Admin: Thêm màn hình soạn thảo thông báo.
  - Portal: Hiển thị icon Chuông thông báo trên Topbar, hoặc Banner nổi bật ngoài trang chủ.

## 3. Hệ thống Khiếu nại / Hỗ trợ (Support Tickets)
Tính năng cho phép khách hàng chủ động gửi các yêu cầu hỗ trợ (Ví dụ: Báo đồng hồ chạy sai, ống nước vỡ, hỏi đáp về hóa đơn).
- **Bảng DB:** `support_tickets`
- **Cấu trúc:**
  - `id` (uuid): Khóa chính
  - `customer_code` (text): Mã khách hàng tạo yêu cầu
  - `subject` (text): Tiêu đề yêu cầu
  - `description` (text): Nội dung chi tiết
  - `status` (text): Trạng thái xử lý (open, processing, resolved)
  - `created_at` (timestamptz)
- **Hướng phát triển UI:**
  - Admin: Màn hình danh sách Ticket để nhân viên CSKH tiếp nhận và xử lý.
  - Portal: Trang "Hỗ trợ" để khách hàng tạo Ticket và theo dõi tiến độ giải quyết.
