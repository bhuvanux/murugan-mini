-- FIX: Type Mismatch (UUID vs TEXT)
-- The user_id column in analytics_tracking appears to be TEXT, but we tried to pass UUID.

-- 1. Drop the function with UUID signature (the one we just created)
DROP FUNCTION IF EXISTS track_analytics_event(text, text, text, text, text, text, jsonb, uuid);

-- 2. Drop the old function too just in case
DROP FUNCTION IF EXISTS track_analytics_event(text, text, text, text, text, text, jsonb);

-- 3. Re-create with TEXT type for p_user_id
CREATE OR REPLACE FUNCTION track_analytics_event(
    p_module_name text,
    p_item_id text,
    p_event_type text,
    p_ip_address text,
    p_user_agent text DEFAULT NULL,
    p_device_type text DEFAULT 'unknown',
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_user_id text DEFAULT NULL  -- Changed to TEXT
)
RETURNS TABLE (
    success boolean,
    tracked boolean,
    already_tracked boolean,
    unique_count bigint
) SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
    v_user_id text; -- Changed to TEXT
    v_tracking_id uuid;
    v_already_tracked boolean;
    v_count bigint;
BEGIN
    -- Determine user_id
    IF p_user_id IS NOT NULL THEN
        v_user_id := p_user_id;
    ELSE
        -- Cast auth.uid() to text
        v_user_id := auth.uid()::text;
    END IF;

    -- Check if already tracked within 24h for unique events (view/read)
    IF p_event_type IN ('view', 'read', 'play') THEN
        SELECT EXISTS (
            SELECT 1 FROM public.analytics_tracking
            WHERE module_name = p_module_name
            AND item_id = p_item_id
            AND event_type = p_event_type
            AND (
                (v_user_id IS NOT NULL AND user_id = v_user_id) OR
                (v_user_id IS NULL AND ip_address = p_ip_address)
            )
            AND created_at > NOW() - INTERVAL '24 hours'
        ) INTO v_already_tracked;
    ELSE
        -- For 'like', check if currently liked (not just last 24h)
        IF p_event_type = 'like' THEN
             SELECT EXISTS (
                SELECT 1 FROM public.analytics_tracking
                WHERE module_name = p_module_name
                AND item_id = p_item_id
                AND event_type = 'like'
                AND (
                    (v_user_id IS NOT NULL AND user_id = v_user_id) OR
                    (v_user_id IS NULL AND ip_address = p_ip_address)
                )
            ) INTO v_already_tracked;
        ELSE
            -- Downloads debounced
             SELECT EXISTS (
                SELECT 1 FROM public.analytics_tracking
                WHERE module_name = p_module_name
                AND item_id = p_item_id
                AND event_type = p_event_type
                AND (
                    (v_user_id IS NOT NULL AND user_id = v_user_id) OR
                    (v_user_id IS NULL AND ip_address = p_ip_address)
                )
                AND created_at > NOW() - INTERVAL '1 minute'
            ) INTO v_already_tracked;
        END IF;
    END IF;

    IF v_already_tracked THEN
        -- Get current count without inserting
        SELECT count(*) INTO v_count
        FROM public.analytics_tracking
        WHERE module_name = p_module_name
        AND item_id = p_item_id
        AND event_type = p_event_type;
        
        RETURN QUERY SELECT true, false, true, v_count;
        RETURN;
    END IF;

    -- Insert new event
    INSERT INTO public.analytics_tracking (
        module_name,
        item_id,
        event_type,
        user_id,
        ip_address,
        user_agent,
        device_type,
        metadata
    ) VALUES (
        p_module_name,
        p_item_id,
        p_event_type,
        v_user_id, -- Now text
        p_ip_address,
        p_user_agent,
        p_device_type,
        p_metadata
    ) RETURNING id INTO v_tracking_id;

    -- Get updated count
    SELECT count(*) INTO v_count
    FROM public.analytics_tracking
    WHERE module_name = p_module_name
    AND item_id = p_item_id
    AND event_type = p_event_type;

    RETURN QUERY SELECT true, true, false, v_count;
END;
$$;
