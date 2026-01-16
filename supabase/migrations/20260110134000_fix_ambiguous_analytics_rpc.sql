-- FIX: Drop ambiguous functions to resolve overloading issues
-- We must drop signatures explicitly to ensure we don't have multiple versions

-- Drop the OLD signature (7 arguments)
DROP FUNCTION IF EXISTS track_analytics_event(text, text, text, text, text, text, jsonb);

-- Drop the NEW signature (8 arguments) just to be safe and ensure clean recreation
DROP FUNCTION IF EXISTS track_analytics_event(text, text, text, text, text, text, jsonb, uuid);

-- Now Re-Create the correct function
CREATE OR REPLACE FUNCTION track_analytics_event(
    p_module_name text,
    p_item_id text,
    p_event_type text,
    p_ip_address text,
    p_user_agent text DEFAULT NULL,
    p_device_type text DEFAULT 'unknown',
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
    success boolean,
    tracked boolean,
    already_tracked boolean,
    unique_count bigint
) SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
    v_user_id uuid;
    v_tracking_id uuid;
    v_already_tracked boolean;
    v_count bigint;
BEGIN
    -- Determine user_id: use passed parameter, or fall back to authenticated user (if context exists)
    IF p_user_id IS NOT NULL THEN
        v_user_id := p_user_id;
    ELSE
        v_user_id := auth.uid();
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
            -- Downloads, shares, etc. debounced by 1 minute
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
        v_user_id,
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
