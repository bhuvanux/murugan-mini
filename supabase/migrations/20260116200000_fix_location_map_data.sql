-- Update get_location_map_data to use auth.users profile city
CREATE OR REPLACE FUNCTION get_location_map_data(p_start_date timestamptz, p_end_date timestamptz)
RETURNS TABLE (city text, user_count bigint, event_count bigint) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(
            au.raw_user_meta_data->>'city',  -- 1. Try User Profile (Most Accurate)
            at.metadata->>'city',            -- 2. Try Event Metadata
            'Unknown'
        ) as city_name,
        count(DISTINCT at.user_id) as user_count,
        count(*) as event_count
    FROM public.analytics_tracking at
    LEFT JOIN auth.users au ON at.user_id = au.id
    WHERE at.created_at BETWEEN p_start_date AND p_end_date
    -- Only show rows where we can identify a city or have significant activity
    AND (au.raw_user_meta_data->>'city' IS NOT NULL OR at.metadata->>'city' IS NOT NULL)
    GROUP BY 1
    ORDER BY user_count DESC;
END;
$$;
