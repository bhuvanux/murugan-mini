-- Add RPC for City Analytics
CREATE OR REPLACE FUNCTION get_city_analytics()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'city', city,
      'count', count,
      'color', color
    )
  )
  FROM (
    SELECT 
      COALESCE(metadata->>'city', 'Unknown') as city,
      COUNT(DISTINCT ip_address) as count,
      CASE (ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT ip_address) DESC)) % 5
        WHEN 1 THEN '#10b981' -- Emerald
        WHEN 2 THEN '#3b82f6' -- Blue
        WHEN 3 THEN '#a855f7' -- Purple
        WHEN 4 THEN '#f59e0b' -- Amber
        ELSE '#ec4899'        -- Pink
      END as color
    FROM unified_analytics
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 8
  ) city_data INTO v_result;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_city_analytics TO anon;
GRANT EXECUTE ON FUNCTION get_city_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_city_analytics TO service_role;
