-- ============================================================================
-- BACKFILL SPARKLE COUNTERS
-- Syncs the counter columns in 'sparkle' table with actual data from 'unified_analytics'
-- ============================================================================

-- Backfill Views
UPDATE sparkle s
SET view_count = (
    SELECT COUNT(DISTINCT ip_address)
    FROM unified_analytics ua
    WHERE ua.module_name = 'sparkle'
    AND ua.item_id = s.id
    AND ua.event_type = 'view'
);

-- Backfill Likes
UPDATE sparkle s
SET like_count = (
    SELECT COUNT(DISTINCT ip_address)
    FROM unified_analytics ua
    WHERE ua.module_name = 'sparkle'
    AND ua.item_id = s.id
    AND ua.event_type = 'like'
);

-- Backfill Downloads
UPDATE sparkle s
SET download_count = (
    SELECT COUNT(DISTINCT ip_address)
    FROM unified_analytics ua
    WHERE ua.module_name = 'sparkle'
    AND ua.item_id = s.id
    AND ua.event_type = 'download'
);

-- Backfill Shares
UPDATE sparkle s
SET share_count = (
    SELECT COUNT(DISTINCT ip_address)
    FROM unified_analytics ua
    WHERE ua.module_name = 'sparkle'
    AND ua.item_id = s.id
    AND ua.event_type = 'share'
);
