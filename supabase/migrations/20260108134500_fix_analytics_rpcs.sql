-- Migration to add missing analytics RPCs
-- Fixes 500 errors in Admin Dashboard

-- 1. get_analytics_dashboard
CREATE OR REPLACE FUNCTION get_analytics_dashboard()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'active_today', (SELECT count(*) FROM auth.users WHERE last_sign_in_at > current_date),
    'new_signups', (SELECT count(*) FROM auth.users WHERE created_at > current_date),
    'otp_conversion', 0 -- Placeholder
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 2. get_analytics_stats
CREATE OR REPLACE FUNCTION get_analytics_stats(p_module_name text, p_item_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Return mock/empty stats for now to prevent crashes
  -- Real implementation would query analytics tables
  SELECT json_build_object(
    'view_count', 0,
    'like_count', 0,
    'share_count', 0,
    'download_count', 0
  ) INTO result;

  RETURN result;
END;
$$;

-- 3. check_analytics_tracked
CREATE OR REPLACE FUNCTION check_analytics_tracked(p_module_name text, p_item_id text, p_event_type text, p_ip_address text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Always return false for now
  RETURN false;
END;
$$;

-- 4. track_analytics_event (Stub)
CREATE OR REPLACE FUNCTION track_analytics_event(
  p_module_name text,
  p_item_id text,
  p_event_type text,
  p_ip_address text,
  p_user_agent text,
  p_device_type text,
  p_metadata jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN json_build_object(
    'success', true,
    'tracked', true,
    'unique_count', 1
  );
END;
$$;

-- 5. untrack_analytics_event (Stub)
CREATE OR REPLACE FUNCTION untrack_analytics_event(
  p_module_name text,
  p_item_id text,
  p_event_type text,
  p_ip_address text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN json_build_object(
    'success', true,
    'removed', true,
    'unique_count', 0
  );
END;
$$;
