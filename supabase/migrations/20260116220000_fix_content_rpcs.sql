-- Content Analytics RPCs

-- 1. Detailed Content Stats for KPIs
CREATE OR REPLACE FUNCTION get_content_stats(p_start_date timestamptz, p_end_date timestamptz)
RETURNS TABLE (
    wallpapers_viewed bigint,
    songs_played bigint,
    videos_played bigint,
    sparkle_views bigint
) 
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        count(*) FILTER (WHERE event_type IN ('wallpaper_view', 'wallpaper_download', 'wallpaper_share'))::bigint as wallpapers_viewed,
        count(*) FILTER (WHERE event_type IN ('song_play', 'song_download'))::bigint as songs_played,
        count(*) FILTER (WHERE event_type IN ('video_play', 'video_download'))::bigint as videos_played,
        count(*) FILTER (WHERE event_type IN ('sparkle_view', 'sparkle_like', 'sparkle_share'))::bigint as sparkle_views
    FROM public.analytics_tracking
    WHERE created_at BETWEEN p_start_date AND p_end_date;
END;
$$;

-- 2. Content Usage Trends for Charts
CREATE OR REPLACE FUNCTION get_content_trends(p_days_ago int DEFAULT 30)
RETURNS TABLE (
    activity_date text,
    wallpapers_count bigint,
    media_count bigint,
    sparkle_count bigint
)
SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as activity_date,
        count(*) FILTER (WHERE event_type LIKE 'wallpaper%')::bigint as wallpapers_count,
        count(*) FILTER (WHERE event_type IN ('song_play', 'video_play', 'song_download', 'video_download'))::bigint as media_count,
        count(*) FILTER (WHERE event_type LIKE 'sparkle%')::bigint as sparkle_count
    FROM public.analytics_tracking
    WHERE created_at > (now() - (p_days_ago || ' days')::interval)
    GROUP BY 1
    ORDER BY 1 ASC;
END;
$$;
