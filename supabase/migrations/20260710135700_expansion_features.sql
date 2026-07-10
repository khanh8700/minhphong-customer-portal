create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  type text not null default 'info',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null,
  subject text not null,
  description text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.system_settings enable row level security;
alter table public.announcements enable row level security;
alter table public.support_tickets enable row level security;

-- Service Role Access
grant all privileges on table public.system_settings to service_role;
grant all privileges on table public.announcements to service_role;
grant all privileges on table public.support_tickets to service_role;

-- Seed Default Settings
insert into public.system_settings (key, value, description)
values ('data_history_months_limit', '12', 'Giới hạn số tháng dữ liệu lịch sử được lấy về (Mặc định: 12 tháng)')
on conflict (key) do nothing;
