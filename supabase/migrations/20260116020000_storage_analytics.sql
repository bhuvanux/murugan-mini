-- Storage & Bandwidth Analytics Schema
-- Tracks file storage, bandwidth usage, and optimization metrics

-- ============================================================
-- STORAGE ASSETS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.storage_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    module TEXT NOT NULL, -- 'wallpapers', 'media', 'sparkle', 'banners'
    file_type TEXT, -- 'image', 'video', 'audio'
    mime_type TEXT,
    original_size BIGINT NOT NULL, -- bytes
    optimized_size BIGINT, -- bytes after compression
    storage_bucket TEXT DEFAULT 'murugan-assets',
    is_optimized BOOLEAN DEFAULT false,
    compression_ratio NUMERIC, -- percentage saved
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ,
    access_count BIGINT DEFAULT 0,
    bandwidth_used BIGINT DEFAULT 0, -- total bytes transferred
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT valid_module CHECK (module IN ('wallpapers', 'media', 'sparkle', 'banners', 'other'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_storage_assets_module ON public.storage_assets(module);
CREATE INDEX IF NOT EXISTS idx_storage_assets_file_type ON public.storage_assets(file_type);
CREATE INDEX IF NOT EXISTS idx_storage_assets_optimized ON public.storage_assets(is_optimized);
CREATE INDEX IF NOT EXISTS idx_storage_assets_upload_date ON public.storage_assets(upload_date);
CREATE INDEX IF NOT EXISTS idx_storage_assets_size ON public.storage_assets(original_size);

-- Enable RLS
ALTER TABLE public.storage_assets ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all storage assets
CREATE POLICY "Admins can view all storage assets"
ON public.storage_assets
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email LIKE '%admin%'
    )
);

-- Policy: Admins can manage storage assets
CREATE POLICY "Admins can manage storage assets"
ON public.storage_assets
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email LIKE '%admin%'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email LIKE '%admin%'
    )
);

-- ============================================================
-- BANDWIDTH TRACKING TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bandwidth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES public.storage_assets(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    bytes_transferred BIGINT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_time TIMESTAMPTZ DEFAULT NOW(),
    event_type TEXT DEFAULT 'download', -- 'download', 'stream', 'view'
    city TEXT,
    device_id TEXT,
    CONSTRAINT positive_bytes CHECK (bytes_transferred >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bandwidth_events_asset ON public.bandwidth_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_bandwidth_events_time ON public.bandwidth_events(event_time);
CREATE INDEX IF NOT EXISTS idx_bandwidth_events_user ON public.bandwidth_events(user_id);

-- Enable RLS
ALTER TABLE public.bandwidth_events ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view bandwidth events
CREATE POLICY "Admins can view bandwidth events"
ON public.bandwidth_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.email LIKE '%admin%'
    )
);

-- ============================================================
-- STORAGE ANALYTICS RPC FUNCTIONS
-- ============================================================

-- Get storage usage by module
CREATE OR REPLACE FUNCTION get_storage_by_module()
RETURNS TABLE (
    module TEXT,
    file_count BIGINT,
    total_original_size BIGINT,
    total_optimized_size BIGINT,
    total_saved BIGINT,
    avg_compression_ratio NUMERIC,
    optimization_percentage NUMERIC
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        sa.module,
        COUNT(*) AS file_count,
        SUM(sa.original_size) AS total_original_size,
        SUM(COALESCE(sa.optimized_size, sa.original_size)) AS total_optimized_size,
        SUM(sa.original_size - COALESCE(sa.optimized_size, sa.original_size)) AS total_saved,
        AVG(sa.compression_ratio) FILTER (WHERE sa.compression_ratio IS NOT NULL) AS avg_compression_ratio,
        ROUND((COUNT(*) FILTER (WHERE sa.is_optimized)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) AS optimization_percentage
    FROM public.storage_assets sa
    GROUP BY sa.module
    ORDER BY total_original_size DESC;
END;
$$;

-- Get top storage consuming files
CREATE OR REPLACE FUNCTION get_top_storage_files(
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    file_name TEXT,
    module TEXT,
    file_type TEXT,
    original_size BIGINT,
    optimized_size BIGINT,
    is_optimized BOOLEAN,
    upload_date TIMESTAMPTZ
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        sa.file_name,
        sa.module,
        sa.file_type,
        sa.original_size,
        sa.optimized_size,
        sa.is_optimized,
        sa.upload_date
    FROM public.storage_assets sa
    ORDER BY sa.original_size DESC
    LIMIT p_limit;
END;
$$;

-- Get compression savings
CREATE OR REPLACE FUNCTION get_compression_savings()
RETURNS TABLE (
    total_original_bytes BIGINT,
    total_optimized_bytes BIGINT,
    bytes_saved BIGINT,
    savings_percentage NUMERIC,
    files_optimized BIGINT,
    files_total BIGINT
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        SUM(sa.original_size) AS total_original_bytes,
        SUM(COALESCE(sa.optimized_size, sa.original_size)) AS total_optimized_bytes,
        SUM(sa.original_size - COALESCE(sa.optimized_size, sa.original_size)) AS bytes_saved,
        CASE 
            WHEN SUM(sa.original_size) > 0 THEN
                ROUND(((SUM(sa.original_size - COALESCE(sa.optimized_size, sa.original_size)))::NUMERIC / 
                       SUM(sa.original_size)::NUMERIC) * 100, 2)
            ELSE 0
        END AS savings_percentage,
        COUNT(*) FILTER (WHERE sa.is_optimized) AS files_optimized,
        COUNT(*) AS files_total
    FROM public.storage_assets sa;
END;
$$;

-- Get bandwidth usage
CREATE OR REPLACE FUNCTION get_bandwidth_usage(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    total_bytes_transferred BIGINT,
    unique_users BIGINT,
    total_downloads BIGINT,
    avg_bytes_per_download BIGINT,
    top_module TEXT,
    top_module_bytes BIGINT
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH bandwidth_stats AS (
        SELECT
            SUM(be.bytes_transferred) AS total_bytes,
            COUNT(DISTINCT be.user_id) AS unique_users,
            COUNT(*) AS total_downloads,
            (SELECT sa.module 
             FROM public.bandwidth_events be2
             JOIN public.storage_assets sa ON sa.id = be2.asset_id
             WHERE be2.event_time BETWEEN p_start_date AND p_end_date
             GROUP BY sa.module
             ORDER BY SUM(be2.bytes_transferred) DESC
             LIMIT 1) AS top_module,
            (SELECT SUM(be2.bytes_transferred)
             FROM public.bandwidth_events be2
             JOIN public.storage_assets sa ON sa.id = be2.asset_id
             WHERE be2.event_time BETWEEN p_start_date AND p_end_date
             GROUP BY sa.module
             ORDER BY SUM(be2.bytes_transferred) DESC
             LIMIT 1) AS top_module_bytes
        FROM public.bandwidth_events be
        WHERE be.event_time BETWEEN p_start_date AND p_end_date
    )
    SELECT
        bs.total_bytes AS total_bytes_transferred,
        bs.unique_users,
        bs.total_downloads,
        CASE 
            WHEN bs.total_downloads > 0 THEN bs.total_bytes / bs.total_downloads
            ELSE 0
        END AS avg_bytes_per_download,
        bs.top_module,
        bs.top_module_bytes
    FROM bandwidth_stats bs;
END;
$$;

-- Get optimization candidates
CREATE OR REPLACE FUNCTION get_optimization_candidates(
    p_min_size_mb NUMERIC DEFAULT 1.0
)
RETURNS TABLE (
    file_name TEXT,
    module TEXT,
    file_type TEXT,
    original_size BIGINT,
    potential_savings_percentage NUMERIC,
    upload_date TIMESTAMPTZ
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        sa.file_name,
        sa.module,
        sa.file_type,
        sa.original_size,
        CASE 
            WHEN sa.file_type = 'image' THEN 60.0 -- Estimate 60% savings for images
            WHEN sa.file_type = 'video' THEN 40.0 -- Estimate 40% savings for videos
            ELSE 30.0
        END AS potential_savings_percentage,
        sa.upload_date
    FROM public.storage_assets sa
    WHERE 
        sa.is_optimized = false
        AND sa.original_size > (p_min_size_mb * 1024 * 1024)::BIGINT
    ORDER BY sa.original_size DESC;
END;
$$;

-- Get storage growth projection
CREATE OR REPLACE FUNCTION get_storage_projection()
RETURNS TABLE (
    current_total_bytes BIGINT,
    growth_rate_per_day BIGINT,
    estimated_capacity_bytes BIGINT,
    days_remaining INT,
    projected_full_date DATE
) SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
    v_current_total BIGINT;
    v_30d_ago_total BIGINT;
    v_daily_growth BIGINT;
    v_capacity BIGINT := 107374182400; -- 100 GB default capacity
    v_days_remaining INT;
BEGIN
    -- Get current total storage
    SELECT COALESCE(SUM(original_size), 0) INTO v_current_total
    FROM public.storage_assets;
    
    -- Get storage usage 30 days ago
    SELECT COALESCE(SUM(original_size), 0) INTO v_30d_ago_total
    FROM public.storage_assets
    WHERE upload_date < (NOW() - INTERVAL '30 days');
    
    -- Calculate daily growth rate
    v_daily_growth := GREATEST((v_current_total - v_30d_ago_total) / 30, 0);
    
    -- Calculate days until full (avoid division by zero)
    IF v_daily_growth > 0 THEN
        v_days_remaining := ((v_capacity - v_current_total) / v_daily_growth)::INT;
    ELSE
        v_days_remaining := 999999; -- Essentially infinite
    END IF;
    
    RETURN QUERY
    SELECT
        v_current_total AS current_total_bytes,
        v_daily_growth AS growth_rate_per_day,
        v_capacity AS estimated_capacity_bytes,
        v_days_remaining AS days_remaining,
        (CURRENT_DATE + v_days_remaining * INTERVAL '1 day')::DATE AS projected_full_date;
END;
$$;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Track file upload
CREATE OR REPLACE FUNCTION track_file_upload(
    p_file_path TEXT,
    p_file_name TEXT,
    p_module TEXT,
    p_file_type TEXT,
    p_original_size BIGINT,
    p_optimized_size BIGINT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
    v_asset_id UUID;
    v_compression_ratio NUMERIC;
BEGIN
    -- Calculate compression ratio if optimized
    IF p_optimized_size IS NOT NULL AND p_original_size > 0 THEN
        v_compression_ratio := ROUND(((p_original_size - p_optimized_size)::NUMERIC / p_original_size::NUMERIC) * 100, 2);
    END IF;
    
    INSERT INTO public.storage_assets (
        file_path,
        file_name,
        module,
        file_type,
        original_size,
        optimized_size,
        is_optimized,
        compression_ratio,
        metadata
    ) VALUES (
        p_file_path,
        p_file_name,
        p_module,
        p_file_type,
        p_original_size,
        p_optimized_size,
        p_optimized_size IS NOT NULL,
        v_compression_ratio,
        p_metadata
    )
    RETURNING id INTO v_asset_id;
    
    RETURN v_asset_id;
END;
$$;

-- Track bandwidth event
CREATE OR REPLACE FUNCTION track_bandwidth_event(
    p_file_path TEXT,
    p_bytes_transferred BIGINT,
    p_user_id UUID DEFAULT NULL,
    p_event_type TEXT DEFAULT 'download',
    p_city TEXT DEFAULT NULL,
    p_device_id TEXT DEFAULT NULL
)
RETURNS UUID SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
    v_event_id UUID;
    v_asset_id UUID;
BEGIN
    -- Get asset ID if exists
    SELECT id INTO v_asset_id
    FROM public.storage_assets
    WHERE file_path = p_file_path;
    
    -- Insert bandwidth event
    INSERT INTO public.bandwidth_events (
        asset_id,
        file_path,
        bytes_transferred,
        user_id,
        event_type,
        city,
        device_id
    ) VALUES (
        v_asset_id,
        p_file_path,
        p_bytes_transferred,
        p_user_id,
        p_event_type,
        p_city,
        p_device_id
    )
    RETURNING id INTO v_event_id;
    
    -- Update asset access stats if asset exists
    IF v_asset_id IS NOT NULL THEN
        UPDATE public.storage_assets
        SET 
            last_accessed = NOW(),
            access_count = access_count + 1,
            bandwidth_used = bandwidth_used + p_bytes_transferred
        WHERE id = v_asset_id;
    END IF;
    
    RETURN v_event_id;
END;
$$;
