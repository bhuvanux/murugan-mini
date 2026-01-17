-- Additional tables for subscription management
-- These extend the base subscription_schema with admin features

-- Pricing Plans Table
create table if not exists pricing_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  currency text default 'INR',
  interval text not null check (interval in ('monthly', 'yearly')),
  features jsonb default '[]'::jsonb,
  status text default 'active' check (status in ('active', 'draft', 'archived')),
  promotional_price numeric,
  display_order integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table pricing_plans enable row level security;

-- Allow public read for active plans
create policy "Public can view active pricing plans"
  on pricing_plans for select
  to anon, authenticated
  using (status = 'active');

-- Service role full access
create policy "Service role full access on pricing_plans"
  on pricing_plans for all
  to service_role
  using (true)
  with check (true);

-- Coupons Table
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric not null,
  valid_from timestamptz default now(),
  valid_until timestamptz,
  usage_limit integer,
  used_count integer default 0,
  applicable_plans uuid[],
  status text default 'active' check (status in ('active', 'inactive', 'expired')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table coupons enable row level security;

-- Service role full access
create policy "Service role full access on coupons"
  on coupons for all
  to service_role
  using (true)
  with check (true);

-- Campaigns Table
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  target_audience jsonb default '{}'::jsonb,
  offer_details jsonb default '{}'::jsonb,
  conversions integer default 0,
  revenue numeric default 0,
  status text default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table campaigns enable row level security;

-- Service role full access
create policy "Service role full access on campaigns"
  on campaigns for all
  to service_role
  using (true)
  with check (true);

-- Insert default Gugan plan
insert into pricing_plans (name, price, currency, interval, features, status, display_order)
values (
  'Gugan Plan',
  29,
  'INR',
  'monthly',
  '["Ad-free Experience", "Unlimited 4K Wallpaper Downloads", "Exclusive Divine Music Access", "Support the Devotee Community"]'::jsonb,
  'active',
  1
) on conflict do nothing;

-- Create indexes for better query performance
create index if not exists idx_pricing_plans_status on pricing_plans(status);
create index if not exists idx_coupons_code on coupons(code);
create index if not exists idx_coupons_status on coupons(status);
create index if not exists idx_campaigns_status on campaigns(status);
create index if not exists idx_campaigns_dates on campaigns(start_date, end_date);
