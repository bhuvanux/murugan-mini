create extension if not exists "pgcrypto";

create table if not exists public.dg_admin_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text unique,
  scope text not null check (scope in ('global','media','network','ux','ai')),
  enabled boolean not null default true,
  priority integer not null default 0,
  match jsonb,
  action jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

create index if not exists dg_admin_rules_enabled_priority_idx
  on public.dg_admin_rules (enabled, priority desc, updated_at desc);

create table if not exists public.dg_admin_rule_audit (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid,
  actor_email text,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dg_admin_rule_audit_rule_id_idx
  on public.dg_admin_rule_audit (rule_id, created_at desc);

create or replace function public.set_updated_at_dg_admin_rules()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_dg_admin_rules on public.dg_admin_rules;
create trigger trg_set_updated_at_dg_admin_rules
before update on public.dg_admin_rules
for each row
execute function public.set_updated_at_dg_admin_rules();
