create table if not exists public.scada_mappings (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique,
  api_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_auth (
  customer_code text primary key,
  can_change_password boolean not null default false,
  hashed_password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.scada_mappings enable row level security;
alter table public.customer_auth enable row level security;

-- Ensure service_role has access (useful for local environments where default privileges might be missing)
grant all privileges on table public.scada_mappings to service_role;
grant all privileges on table public.customer_auth to service_role;
