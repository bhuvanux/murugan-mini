-- Migration: Subscription Schema Support
-- Description: Adds payments tracking, app configuration, and user subscription status columns.

-- 1. Create 'payments' table
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete set null,
    amount numeric not null,
    currency text default 'INR',
    provider_payment_id text,
    provider_order_id text,
    status text check (status in ('pending', 'success', 'failed', 'refunded')),
    plan_id text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for payments
alter table public.payments enable row level security;

-- Policies for payments
create policy "Users can view own payments"
    on public.payments for select
    using ( auth.uid() = user_id );

-- 2. Create 'app_config' table for dynamic settings (e.g., Plan pricing)
create table if not exists public.app_config (
    key text primary key,
    value jsonb not null,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for app_config
alter table public.app_config enable row level security;

-- Policies for app_config
create policy "Public read access for app_config"
    on public.app_config for select
    using ( true );

create policy "Admins can manage app_config"
    on public.app_config for all
    using ( 
        auth.role() = 'service_role' OR 
        exists (select 1 from public.users where id = auth.uid() and (metadata->>'is_admin')::boolean = true)
    );

-- 3. Update 'users' table
alter table public.users 
add column if not exists is_premium boolean default false,
add column if not exists subscription_end_date timestamp with time zone,
add column if not exists plan_type text;

-- 4. Insert default 'Gugan' plan configuration
insert into public.app_config (key, value, description)
values (
    'subscription_plan_gugan',
    '{
        "id": "gugan",
        "name": "Gugan Plan",
        "price": 29,
        "currency": "INR",
        "interval": "month",
        "features": [
            "Ad-free Experience",
            "Unlimited 4K Wallpaper Downloads",
            "Exclusive Divine Music Access",
            "Support the Devotee Community"
        ],
        "button_text": "Subscribe for ₹29",
        "button_gradient_start": "#0d5e38",
        "button_gradient_end": "#0a4a2b"
    }'::jsonb,
    'Configuration for the Gugan subscription plan'
) on conflict (key) do nothing;

-- 5. Create index for performance
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_status_idx on public.payments(status);
