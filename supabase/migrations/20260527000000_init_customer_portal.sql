create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key,
  customer_code text not null,
  customer_code_normalized text not null unique,
  full_name text not null,
  address text,
  phone_masked text,
  phone_normalized_values text[] not null default '{}',
  tax_code text,
  current_meter_id uuid,
  area_name text,
  route_name text,
  status_bool boolean,
  credit_balance numeric not null default 0,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now()
);

create table if not exists public.meters (
  id uuid primary key,
  meter_code text not null,
  meter_size text,
  meter_class text,
  status text,
  source_created_at timestamptz,
  synced_at timestamptz not null default now()
);

create table if not exists public.billing_periods (
  id uuid primary key,
  period_name text not null,
  start_date date,
  end_date date,
  status text,
  source_created_at timestamptz,
  synced_at timestamptz not null default now()
);

create table if not exists public.meter_readings (
  id uuid primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  period_id uuid references public.billing_periods(id) on delete set null,
  meter_id uuid references public.meters(id) on delete set null,
  old_reading numeric,
  new_reading numeric,
  consumption numeric,
  status text,
  reading_time timestamptz,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now()
);

create table if not exists public.bills (
  id uuid primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  reading_id uuid references public.meter_readings(id) on delete set null,
  period_id uuid references public.billing_periods(id) on delete set null,
  old_reading numeric,
  new_reading numeric,
  consumption numeric,
  unit_price numeric,
  pre_tax_amount numeric,
  tax numeric,
  tax_amount numeric,
  total_amount numeric not null default 0,
  paid_amount numeric not null default 0,
  status text,
  due_date date,
  start_date date,
  end_date date,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key,
  customer_id uuid not null references public.customers(id) on delete cascade,
  amount numeric not null default 0,
  payment_method_code text,
  note text,
  payment_date timestamptz,
  status text,
  source_created_at timestamptz,
  synced_at timestamptz not null default now()
);

create table if not exists public.payment_allocations (
  id uuid primary key,
  payment_id uuid not null references public.payments(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  allocated_amount numeric not null default 0,
  source_created_at timestamptz,
  synced_at timestamptz not null default now()
);

create table if not exists public.customer_debt_snapshots (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  customer_code text,
  full_name text,
  total_invoiced numeric not null default 0,
  total_collected numeric not null default 0,
  debt_amount numeric not null default 0,
  credit_balance numeric not null default 0,
  source_refreshed_at timestamptz,
  synced_at timestamptz not null default now()
);

create table if not exists public.lookup_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  token_hash text not null unique,
  ip_hash text,
  user_agent text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}',
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  key_hash text not null,
  bucket text not null,
  count integer not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (key_hash, bucket)
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  mode text not null default 'incremental',
  stats jsonb not null default '{}',
  error text
);

create table if not exists public.sync_state (
  entity text primary key,
  watermark timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists customers_phone_values_idx on public.customers using gin (phone_normalized_values);
create index if not exists meter_readings_customer_time_idx on public.meter_readings (customer_id, reading_time desc);
create index if not exists bills_customer_created_idx on public.bills (customer_id, source_created_at desc);
create index if not exists bills_customer_status_idx on public.bills (customer_id, status);
create index if not exists payments_customer_date_idx on public.payments (customer_id, payment_date desc);
create index if not exists lookup_sessions_customer_idx on public.lookup_sessions (customer_id, expires_at desc);
create index if not exists audit_logs_customer_action_idx on public.audit_logs (customer_id, action, created_at desc);
create index if not exists rate_limits_expiry_idx on public.rate_limits (expires_at);

alter table public.customers enable row level security;
alter table public.meters enable row level security;
alter table public.billing_periods enable row level security;
alter table public.meter_readings enable row level security;
alter table public.bills enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.customer_debt_snapshots enable row level security;
alter table public.lookup_sessions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limits enable row level security;
alter table public.sync_runs enable row level security;
alter table public.sync_state enable row level security;

