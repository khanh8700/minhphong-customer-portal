# Customer Portal

Đây là ứng dụng Cổng thông tin Khách hàng (Customer Portal) dành cho hệ thống quản lý nước sạch, cho phép khách hàng tra cứu hóa đơn, lịch sử dùng nước và công nợ. Ứng dụng được xây dựng bằng **Next.js**, **Tailwind CSS** và **Supabase**.

---

## 1. Hướng dẫn Triển khai (Deployment Guide) lên Vercel

Ứng dụng này được tối ưu để chạy trên nền tảng Serverless của Vercel. 

> **Lưu ý cực kỳ quan trọng về Database:** Hiện tại nếu bạn đang code ở máy tính (dùng Supabase Localhost `127.0.0.1`), Vercel sẽ không thể kết nối được. Để chạy thực tế, bạn cần tạo dự án Supabase trên Cloud (Staging/Production) và migrate schema lên đó trước khi deploy Vercel.

### Các bước đẩy code và deploy:
1. Đẩy mã nguồn lên một Repository trên GitHub (ví dụ: `minhphong-customer-portal`).
2. Đăng nhập vào [Vercel](https://vercel.com), bấm **Add New...** > **Project** và Import repository từ GitHub.
3. Trong phần **Environment Variables**, khai báo toàn bộ các biến môi trường cần thiết (tham khảo file `.env.local`). **Lưu ý sử dụng URL và Key của Supabase Cloud, tuyệt đối không dùng 127.0.0.1**.
4. Bấm **Deploy** và chờ Vercel cấp đường dẫn public (VD: `minhphong-portal.vercel.app`).

---

## 2. Hướng dẫn Cấu hình GitHub Actions (CI/CD)

Dự án này sử dụng GitHub Actions để tự động hóa 2 quy trình rất quan trọng: **Đồng bộ dữ liệu (Sync ERP)** và **Cập nhật Database (Supabase Migrations)**.

Để các luồng tự động này hoạt động được, bạn cần vào trang quản lý Repository trên GitHub, truy cập tab **Settings > Secrets and variables > Actions** và thêm các biến bảo mật (Repository Secrets) sau:

### 2.1 Cấu hình cho Database Migrations
Quy trình này sẽ tự động kiểm tra cú pháp file SQL và áp dụng (push) các thay đổi Database lên môi trường Production khi code được merge vào nhánh `main` (có thể yêu cầu duyệt thủ công nếu cấu hình Required Reviewers). Bạn cần khai báo:

- `SUPABASE_ACCESS_TOKEN`: Token truy cập cá nhân tạo từ tài khoản Supabase.
- `PROD_SUPABASE_PROJECT_REF`: Mã Project Ref của Supabase môi trường Production.
- `PROD_SUPABASE_DB_PASSWORD`: Mật khẩu kết nối Database của môi trường Production.

### 2.2 Cấu hình cho Cron Job Đồng bộ dữ liệu (Sync ERP)
Quy trình này giải quyết vấn đề giới hạn Cron của gói Vercel Hobby. Action sẽ tự động gọi API đồng bộ dữ liệu mỗi 60 phút. Bạn cần khai báo:

- `PORTAL_URL`: Đường dẫn gốc của website trên Vercel (VD: `https://minhphong-portal.vercel.app`, **không có dấu `/` ở cuối**).
- `CRON_SECRET`: Một chuỗi bảo mật ngẫu nhiên (Giống hệt biến `CRON_SECRET` đã cài trên Vercel) để xác thực, ngăn chặn người ngoài gọi trộm API đồng bộ.
- `SCADA_API_KEY`: Khoá xác thực API SCADA. Workflow cũng lưu một ảnh chụp chỉ số mỗi giờ và tự xoá dữ liệu quá 3 tháng.

---

## 3. Khởi chạy ở Môi trường Phát triển (Local)

1. Cài đặt các thư viện:
```bash
npm install
```

2. Cài đặt biến môi trường:
Copy file `.env.example` thành `.env.local` và điền các thông số Supabase.

3. Chạy server ở máy cá nhân:
```bash
npm run dev
```
Mở trình duyệt tại [http://localhost:3000](http://localhost:3000) để xem ứng dụng.
