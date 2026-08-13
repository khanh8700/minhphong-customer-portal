create table if not exists public.scada_hourly_readings (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null,
  captured_at timestamptz not null,
  source_time text,
  device_name text,
  forward_flow_total numeric,
  reverse_flow_total numeric,
  net_flow_total numeric,
  flow_rate numeric,
  velocity numeric,
  internal_battery numeric,
  external_battery numeric,
  created_at timestamptz not null default now(),
  unique (customer_code, captured_at)
);

create index if not exists scada_hourly_readings_customer_time_idx
  on public.scada_hourly_readings (customer_code, captured_at desc);

alter table public.scada_hourly_readings enable row level security;

grant all privileges on table public.scada_hourly_readings to service_role;

comment on table public.scada_hourly_readings is
  'Ảnh chụp SCADA mỗi giờ. Tác vụ định kỳ chỉ giữ dữ liệu trong 3 tháng để tiết kiệm dung lượng.';
