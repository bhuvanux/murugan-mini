-- ============================================================================
-- FIX ANALYTICS UNTRACK FUNCTION - Fixes "boolean > integer" Error
-- ============================================================================
-- This fixes the type mismatch error in the untrack_analytics_event function
-- Run this in your ADMIN Supabase SQL Editor
-- ============================================================================

-- Drop and recreate the untrack function with correct logic
CREATE OR REPLACE FUNCTION untrack_analytics_event(
  p_module_name TEXT,
  p_item_id UUID,
  p_event_type TEXT,
  p_ip_address TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  -- Delete the tracking record
  DELETE FROM analytics_tracking
  WHERE module_name = p_module_name
    AND item_id = p_item_id
    AND event_type = p_event_type
    AND ip_address = p_ip_address;
  
  -- FOUND is a boolean that's true if any rows were affected
  v_deleted := FOUND;
  
  -- Get updated count
  RETURN jsonb_build_object(
    'success', true,
    'removed', v_deleted,
    'unique_count', (
      SELECT COUNT(DISTINCT ip_address)
      FROM analytics_tracking
      WHERE module_name = p_module_name
        AND item_id = p_item_id
        AND event_type = p_event_type
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION untrack_analytics_event TO authenticated, anon;

-- ============================================================================
-- Test the fix (optional)
-- ============================================================================
-- You can test by trying to unlike a wallpaper in the app
-- The error should now be gone!
