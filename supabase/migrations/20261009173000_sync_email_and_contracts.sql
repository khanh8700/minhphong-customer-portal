-- Migration: Bổ sung trường email, contract_id và bảng contracts cho Customer Portal
-- Phục vụ đồng bộ dữ liệu từ Minh Phong ERP sang Customer Portal

-- 1. Bổ sung trường email và contract_id vào bảng public.customers
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS contract_id uuid;

-- 2. Tạo bảng public.contracts lưu trữ hợp đồng đã ký phục vụ khách hàng tra cứu
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_code text NOT NULL,
  contract_number text NOT NULL,
  status text NOT NULL,
  template_code text,
  signing_channel text,
  customer_signer_type text,
  final_pdf_url text,
  paper_scan_pdf_url text,
  pdf_sha256 text,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_contracts_customer_id ON public.contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_contracts_customer_code ON public.contracts(customer_code);

-- 3. Bật RLS và phân quyền
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service role full access on contracts" ON public.contracts;
CREATE POLICY "Allow service role full access on contracts"
ON public.contracts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
