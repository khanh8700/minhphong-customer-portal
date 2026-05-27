# Customer Portal Plan - Tra cứu hóa đơn nước

## 1. Mục tiêu

Xây dựng hệ thống cho khách hàng:
- Tra cứu lịch sử sử dụng nước
- Xem công nợ
- Xem và tải hóa đơn PDF
- Không dùng OTP SMS thường xuyên
- Tận dụng Zalo OA để đăng nhập/định danh

Nguyên tắc:
- Không mở trực tiếp ERP cho khách
- Tách riêng hệ thống portal
- ERP là source of truth

---

## 2. Kiến trúc tổng thể

### Thành phần

1. ERP nội bộ (hiện có)
2. Customer Portal (Next.js)
3. Data Sync Layer (đồng bộ dữ liệu)

### Luồng

ERP → Sync Job → Portal DB → Customer Portal → User

---

## 3. Hạ tầng

### ERP
- Supabase project hiện tại
- Vercel project hiện tại

### Portal
- Supabase project mới
- Vercel project mới
- Domain riêng (vd: portal.domain.com)

---

## 4. Chức năng chính

### Đăng nhập
- Từ Zalo OA
- Không dùng OTP mỗi lần
- Liên kết tài khoản 1 lần

### Tra cứu
- Thông tin khách hàng
- Danh sách hóa đơn
- Chi tiết hóa đơn
- Lịch sử sử dụng nước
- Lịch sử thanh toán
- Tải PDF hóa đơn

---

## 5. Xác thực không dùng OTP

### Flow

1. User vào từ Zalo
2. Nếu chưa liên kết:
   - Nhập:
     - Mã khách hàng
     - SĐT / thông tin đối soát
3. Verify
4. Lưu mapping:
   - zalo_user_id → customer_id
5. Lần sau vào không cần OTP

---

## 6. Database Schema (Portal)

### customers
- id
- customer_code
- full_name
- phone
- address

### service_accounts
- id
- customer_id
- contract_code
- meter_code

### meter_readings
- id
- service_account_id
- billing_period
- previous_reading
- current_reading
- consumption

### bills
- id
- service_account_id
- billing_period
- total_amount
- status
- due_date

### payments
- id
- bill_id
- amount
- payment_date
- status

### invoice_files
- id
- bill_id
- storage_path

### portal_identities
- id
- customer_id
- zalo_user_id

### audit_logs
- id
- customer_id
- action
- created_at

---

## 7. Bảo mật

### Nguyên tắc
- Không query ERP trực tiếp
- Không public dữ liệu
- Tất cả qua backend API

### Cụ thể

#### Database
- Bật RLS
- Filter theo customer_id

#### API
- Validate session
- Rate limit
- Chống brute force

#### Storage
- Private bucket
- Signed URL

#### Logging
- Log login
- Log xem hóa đơn
- Log tải file

---

## 8. Data Sync

### Dữ liệu sync
- customers
- contracts
- bills
- payments
- meter readings

### Không sync
- dữ liệu nội bộ
- nhân sự
- config ERP

### Phương án
- Cron job (15–60 phút)
- Incremental sync

---

## 9. Zalo OA Integration

### Vai trò
- Entry point
- Điều hướng vào portal
- Định danh user

### Không dùng để
- gửi OTP hàng loạt
- bypass xác thực

### Flow
Zalo OA → Menu → Portal → Verify → Dashboard

---

## 10. UI Screens

1. Landing
2. Link account screen
3. Dashboard
4. Bills list
5. Bill detail
6. Usage history
7. Payment history

---

## 11. Roadmap triển khai

### Phase 1 - Setup (3–5 ngày)
- Tạo Supabase + Vercel
- Thiết kế schema
- Chuẩn bị env

---

### Phase 2 - Data Sync (5–7 ngày)
- Tạo DB
- Viết sync job
- Sync dữ liệu mẫu

---

### Phase 3 - Auth + Zalo (5–7 ngày)
- Flow liên kết tài khoản
- API verify
- Lưu mapping

---

### Phase 4 - Portal UI (7–10 ngày)
- Dashboard
- Bills
- Detail
- PDF

---

### Phase 5 - Security (3–5 ngày)
- RLS
- Rate limit
- Logging

---

### Phase 6 - UAT (5–7 ngày)
- Test nội bộ
- Test user thật
- Fix UX

---

## 12. Repo Structure

### Tách repo

- erp-repo
- portal-repo

### Optional shared
- shared-lib

---

## 13. Rủi ro

### Mapping sai user
→ dùng 2 yếu tố xác minh

### Sync chậm
→ cron + retry

### Tải cao
→ cache + tách Vercel

---

## 14. MVP Definition

Hoàn thành khi:

- User login qua Zalo
- Liên kết tài khoản thành công
- Xem được hóa đơn
- Tải được PDF
- Không dùng OTP SMS
- Không ảnh hưởng ERP

---

## 15. Tech Stack

- Next.js
- Supabase (DB + Auth + Storage)
- Vercel
- Zalo OA / Mini App

---

## 16. Ưu tiên triển khai

1. Tách hạ tầng
2. Sync data
3. Auth + linking
4. Bills UI
5. PDF
6. Security
