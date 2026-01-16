-- Drop the stub track_analytics_event function to resolve function ambiguity
-- The correct function with UUID parameter type already exists from 003_unified_analytics_system.sql

DROP FUNCTION IF EXISTS public.track_analytics_event(
  p_module_name text,
  p_item_id text,
  p_event_type text,
  p_ip_address text,
  p_user_agent text,
  p_device_type text,
  p_metadata jsonb
);

-- Also drop the stub untrack function
DROP FUNCTION IF EXISTS public.untrack_analytics_event(
  p_module_name text,
  p_item_id text,
  p_event_type text,
  p_ip_address text
);
