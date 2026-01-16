-- Ensure columns exist in users table for identity and tracking
alter table public.users add column if not exists "name" text;
alter table public.users add column if not exists "device" text;
alter table public.users add column if not exists "notified_admin" boolean default false;

-- Sync existing full_name to name for backward compatibility
update public.users set name = full_name where name is null and full_name is not null;

-- Remove the Telegram related trigger and function
drop trigger if exists on_user_activity_trigger on public.users;
drop trigger if exists on_user_signup on public.users;
drop function if exists public.handle_user_activity_notification();
drop function if exists public.handle_new_user_signup();
