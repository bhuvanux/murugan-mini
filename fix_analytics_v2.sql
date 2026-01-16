-- ANALYTICS FIX V2 (Final Type Casts)

-- 1. Ensure user_id column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'analytics_tracking' AND column_name = 'user_id') THEN
        ALTER TABLE public.analytics_tracking ADD COLUMN user_id text;
    END IF;
END $$;

-- 2. Create V2 function
CREATE OR REPLACE FUNCTION track_analytics_event_v2(
    p_module_name text,
    p_item_id text,
    p_event_type text,
    p_ip_address text,
    p_user_agent text DEFAULT NULL,
    p_device_type text DEFAULT 'unknown',
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_user_id text DEFAULT NULL
)
RETURNS TABLE (
    success boolean,
    tracked boolean,
    already_tracked boolean,
    unique_count bigint
) SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
    v_user_id text;
    v_tracking_id uuid;
    v_already_tracked boolean;
    v_count bigint;
BEGIN
    -- Determine user_id
    IF p_user_id IS NOT NULL THEN
        v_user_id := p_user_id;
    ELSE
        v_user_id := auth.uid()::text;
    END IF;

    -- Check duplication
    IF p_event_type IN ('view', 'read', 'play') THEN
        SELECT EXISTS (
            SELECT 1 FROM public.analytics_tracking
            WHERE module_name = p_module_name
            AND item_id::text = p_item_id  -- Compare as text
            AND event_type = p_event_type
            AND (
                (v_user_id IS NOT NULL AND user_id::text = v_user_id) OR
                (v_user_id IS NULL AND ip_address = p_ip_address)
            )
            AND created_at > NOW() - INTERVAL '24 hours'
        ) INTO v_already_tracked;
    ELSE
        IF p_event_type = 'like' THEN
             SELECT EXISTS (
                SELECT 1 FROM public.analytics_tracking
                WHERE module_name = p_module_name
                AND item_id::text = p_item_id
                AND event_type = 'like'
                AND (
                    (v_user_id IS NOT NULL AND user_id::text = v_user_id) OR
                    (v_user_id IS NULL AND ip_address = p_ip_address)
                )
            ) INTO v_already_tracked;
        ELSE
             SELECT EXISTS (
                SELECT 1 FROM public.analytics_tracking
                WHERE module_name = p_module_name
                AND item_id::text = p_item_id
                AND event_type = p_event_type
                AND (
                    (v_user_id IS NOT NULL AND user_id::text = v_user_id) OR
                    (v_user_id IS NULL AND ip_address = p_ip_address)
                )
                AND created_at > NOW() - INTERVAL '1 minute'
            ) INTO v_already_tracked;
        END IF;
    END IF;

    IF v_already_tracked THEN
        SELECT count(*) INTO v_count
        FROM public.analytics_tracking
        WHERE module_name = p_module_name
        AND item_id::text = p_item_id
        AND event_type = p_event_type;
        
        RETURN QUERY SELECT true, false, true, v_count;
        RETURN;
    END IF;

    -- Insert new event
    -- CAST VALUES TO UUID EXPLICITLY
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
        p_item_id::uuid, -- Explicit cast to UUID
        p_event_type,
        v_user_id::uuid, -- Explicit cast to UUID
        p_ip_address,
        p_user_agent,
        p_device_type,
        p_metadata
    ) RETURNING id INTO v_tracking_id;

    SELECT count(*) INTO v_count
    FROM public.analytics_tracking
    WHERE module_name = p_module_name
    AND item_id::text = p_item_id
    AND event_type = p_event_type;

    RETURN QUERY SELECT true, true, false, v_count;

EXCEPTION WHEN OTHERS THEN
    -- If casting fails (e.g. invalid UUID), we log error or just return false
    -- But since we can't easily return error message in this table structure, we'll just fail.
    -- Re-raising allows the client to see "invalid input syntax for type uuid"
    RAISE;
END;
$$;
