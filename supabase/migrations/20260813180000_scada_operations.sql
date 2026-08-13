create table if not exists public.scada_device_statuses (
  customer_code text primary key,
  status text not null default 'unknown' check (status in ('online', 'stale', 'offline', 'warning', 'unknown')),
  last_checked_at timestamptz not null default now(),
  last_source_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  internal_battery numeric,
  external_battery numeric,
  updated_at timestamptz not null default now()
);

create table if not exists public.system_alerts (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null,
  type text not null check (type in ('scada_offline', 'scada_stale', 'battery_low', 'usage_anomaly')),
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text not null,
  metadata jsonb not null default '{}',
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  last_notified_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_code, type)
);

create index if not exists system_alerts_status_detected_idx
  on public.system_alerts (status, last_detected_at desc);

create index if not exists scada_device_statuses_status_idx
  on public.scada_device_statuses (status, last_checked_at desc);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'viewer' check (role in ('system_admin', 'scada_operator', 'accountant', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scada_device_statuses enable row level security;
alter table public.system_alerts enable row level security;
alter table public.admin_users enable row level security;

grant all privileges on table public.scada_device_statuses to service_role;
grant all privileges on table public.system_alerts to service_role;
grant all privileges on table public.admin_users to service_role;

insert into public.system_settings (key, value, description)
values
  ('scada_alert_thresholds', '{"stale_minutes":120,"battery_voltage":3.3,"anomaly_multiplier":2,"notification_cooldown_minutes":360}', 'Ngưỡng cảnh báo SCADA và thời gian chống gửi trùng'),
  ('telegram_alert_config', '{"enabled":false,"chat_id":"","bot_token_encrypted":"","alert_types":{"scada_offline":true,"scada_stale":true,"battery_low":true,"usage_anomaly":true}}', 'Cấu hình gửi cảnh báo Telegram cho quản trị viên')
on conflict (key) do nothing;
