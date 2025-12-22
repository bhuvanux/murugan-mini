


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."auto_publish_scheduled_banners"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE banners
  SET publish_status = 'published'
  WHERE publish_status = 'scheduled'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= NOW();
END;
$$;


ALTER FUNCTION "public"."auto_publish_scheduled_banners"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_publish_scheduled_media"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE media
  SET publish_status = 'published'
  WHERE publish_status = 'scheduled'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= NOW();
END;
$$;


ALTER FUNCTION "public"."auto_publish_scheduled_media"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_publish_scheduled_sparkles"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE sparkles
  SET publish_status = 'published'
  WHERE publish_status = 'scheduled'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= NOW();
END;
$$;


ALTER FUNCTION "public"."auto_publish_scheduled_sparkles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_analytics_tracked"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM analytics_tracking
    WHERE module_name = p_module_name
      AND item_id = p_item_id
      AND event_type = p_event_type
      AND ip_address = p_ip_address
  );
END;
$$;


ALTER FUNCTION "public"."check_analytics_tracked"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_wallpaper_like"("p_user_id" "text", "p_wallpaper_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM wallpaper_likes 
    WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id
  );
END;
$$;


ALTER FUNCTION "public"."check_wallpaper_like"("p_user_id" "text", "p_wallpaper_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_media_likes"("media_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE media SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = media_id;
END;
$$;


ALTER FUNCTION "public"."decrement_media_likes"("media_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_photo_likes"("photo_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE photos
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
  WHERE id = photo_id;
END;
$$;


ALTER FUNCTION "public"."decrement_photo_likes"("photo_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_sparkle_likes"("sparkle_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE sparkles SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = sparkle_id;
END;
$$;


ALTER FUNCTION "public"."decrement_sparkle_likes"("sparkle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_wallpaper_likes"("wallpaper_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE wallpapers SET like_count = GREATEST(0, like_count - 1) WHERE id = wallpaper_id;
END;
$$;


ALTER FUNCTION "public"."decrement_wallpaper_likes"("wallpaper_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_dashboard"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_events', (SELECT COUNT(*) FROM analytics_tracking),
    'unique_ips', (SELECT COUNT(DISTINCT ip_address) FROM analytics_tracking),
    'modules', (
      SELECT jsonb_object_agg(module_name, stats)
      FROM (
        SELECT 
          module_name,
          jsonb_build_object(
            'total_events', COUNT(*),
            'unique_items', COUNT(DISTINCT item_id),
            'unique_ips', COUNT(DISTINCT ip_address),
            'events_by_type', (
              SELECT jsonb_object_agg(event_type, count)
              FROM (
                SELECT event_type, COUNT(*) as count
                FROM analytics_tracking t2
                WHERE t2.module_name = t1.module_name
                GROUP BY event_type
              ) event_counts
            )
          ) as stats
        FROM analytics_tracking t1
        GROUP BY module_name
      ) module_stats
    )
  ) INTO v_result;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;


ALTER FUNCTION "public"."get_analytics_dashboard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_analytics_stats"("p_module_name" "text", "p_item_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_object_agg(event_type, count)
  INTO v_stats
  FROM (
    SELECT event_type, COUNT(DISTINCT ip_address) as count
    FROM unified_analytics
    WHERE module_name = p_module_name
      AND item_id = p_item_id
    GROUP BY event_type
  ) subquery;
  
  RETURN COALESCE(v_stats, '{}'::jsonb);
END;
$$;


ALTER FUNCTION "public"."get_analytics_stats"("p_module_name" "text", "p_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_items_by_event"("p_module_name" "text", "p_event_type" "text", "p_limit" integer DEFAULT 10) RETURNS TABLE("item_id" "uuid", "unique_count" bigint, "last_event_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.item_id,
    COUNT(DISTINCT t.ip_address) as unique_count,
    MAX(t.created_at) as last_event_at
  FROM analytics_tracking t
  WHERE t.module_name = p_module_name
    AND t.event_type = p_event_type
  GROUP BY t.item_id
  ORDER BY unique_count DESC, last_event_at DESC
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_top_items_by_event"("p_module_name" "text", "p_event_type" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_banner_clicks"("banner_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE banners SET click_count = COALESCE(click_count, 0) + 1 WHERE id = banner_id;
END;
$$;


ALTER FUNCTION "public"."increment_banner_clicks"("banner_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_banner_views"("banner_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE banners SET view_count = COALESCE(view_count, 0) + 1 WHERE id = banner_id;
END;
$$;


ALTER FUNCTION "public"."increment_banner_views"("banner_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_counter"("table_name" "text", "record_id" "uuid", "counter_name" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
  EXECUTE format('UPDATE %I SET %I = %I + 1 WHERE id = $1', table_name, counter_name, counter_name)
  USING record_id;
END;
$_$;


ALTER FUNCTION "public"."increment_counter"("table_name" "text", "record_id" "uuid", "counter_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_media_downloads"("media_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE media SET download_count = COALESCE(download_count, 0) + 1 WHERE id = media_id;
END;
$$;


ALTER FUNCTION "public"."increment_media_downloads"("media_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_media_likes"("media_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE media SET like_count = COALESCE(like_count, 0) + 1 WHERE id = media_id;
END;
$$;


ALTER FUNCTION "public"."increment_media_likes"("media_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_media_plays"("media_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE media SET play_count = COALESCE(play_count, 0) + 1 WHERE id = media_id;
END;
$$;


ALTER FUNCTION "public"."increment_media_plays"("media_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_media_shares"("media_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE media SET share_count = COALESCE(share_count, 0) + 1 WHERE id = media_id;
END;
$$;


ALTER FUNCTION "public"."increment_media_shares"("media_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_media_views"("media_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE media SET view_count = COALESCE(view_count, 0) + 1 WHERE id = media_id;
END;
$$;


ALTER FUNCTION "public"."increment_media_views"("media_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_photo_downloads"("photo_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE photos
  SET download_count = COALESCE(download_count, 0) + 1
  WHERE id = photo_id;
END;
$$;


ALTER FUNCTION "public"."increment_photo_downloads"("photo_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_photo_likes"("photo_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE photos
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = photo_id;
END;
$$;


ALTER FUNCTION "public"."increment_photo_likes"("photo_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_photo_shares"("photo_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE photos
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = photo_id;
END;
$$;


ALTER FUNCTION "public"."increment_photo_shares"("photo_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_photo_views"("photo_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE photos
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = photo_id;
END;
$$;


ALTER FUNCTION "public"."increment_photo_views"("photo_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_sparkle_likes"("sparkle_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE sparkles SET like_count = COALESCE(like_count, 0) + 1 WHERE id = sparkle_id;
END;
$$;


ALTER FUNCTION "public"."increment_sparkle_likes"("sparkle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_sparkle_shares"("sparkle_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE sparkles SET share_count = COALESCE(share_count, 0) + 1 WHERE id = sparkle_id;
END;
$$;


ALTER FUNCTION "public"."increment_sparkle_shares"("sparkle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_sparkle_views"("sparkle_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE sparkles SET view_count = COALESCE(view_count, 0) + 1 WHERE id = sparkle_id;
END;
$$;


ALTER FUNCTION "public"."increment_sparkle_views"("sparkle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_temple_clicks"("temple_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE temples
  SET click_count = COALESCE(click_count, 0) + 1,
      updated_at = NOW()
  WHERE id = temple_id;
END;
$$;


ALTER FUNCTION "public"."increment_temple_clicks"("temple_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_wallpaper_downloads"("wallpaper_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE wallpapers SET download_count = download_count + 1 WHERE id = wallpaper_id;
END;
$$;


ALTER FUNCTION "public"."increment_wallpaper_downloads"("wallpaper_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_wallpaper_likes"("wallpaper_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE wallpapers SET like_count = like_count + 1 WHERE id = wallpaper_id;
END;
$$;


ALTER FUNCTION "public"."increment_wallpaper_likes"("wallpaper_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_wallpaper_shares"("wallpaper_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE wallpapers SET share_count = GREATEST(0, share_count + 1) WHERE id = wallpaper_id;
END;
$$;


ALTER FUNCTION "public"."increment_wallpaper_shares"("wallpaper_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_wallpaper_views"("wallpaper_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE wallpapers SET view_count = view_count + 1 WHERE id = wallpaper_id;
END;
$$;


ALTER FUNCTION "public"."increment_wallpaper_views"("wallpaper_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."like_wallpaper"("p_wallpaper_id" "uuid", "p_user_id" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE v_already_liked BOOLEAN; v_like_count INTEGER;
BEGIN
  SELECT EXISTS(SELECT 1 FROM wallpaper_likes WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id) INTO v_already_liked;
  IF v_already_liked THEN
    SELECT COALESCE(like_count, 0) INTO v_like_count FROM wallpapers WHERE id = p_wallpaper_id;
    RETURN json_build_object('success', true, 'liked', true, 'like_count', v_like_count, 'already_liked', true, 'message', 'Already liked');
  ELSE
    INSERT INTO wallpaper_likes (wallpaper_id, user_id) VALUES (p_wallpaper_id, p_user_id) ON CONFLICT DO NOTHING;
    UPDATE wallpapers SET like_count = COALESCE(like_count, 0) + 1 WHERE id = p_wallpaper_id RETURNING COALESCE(like_count, 0) INTO v_like_count;
    RETURN json_build_object('success', true, 'liked', true, 'like_count', v_like_count, 'already_liked', false, 'message', 'Liked successfully');
  END IF;
END; $$;


ALTER FUNCTION "public"."like_wallpaper"("p_wallpaper_id" "uuid", "p_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_temple_click_from_analytics"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.module_name = 'temple' AND NEW.event_type = 'click' THEN
    PERFORM increment_temple_clicks(NEW.item_id);

    INSERT INTO temple_click_logs (temple_id, clicked_at, device_type, user_location)
    VALUES (
      NEW.item_id,
      NEW.created_at,
      NEW.device_type,
      CASE
        WHEN NEW.metadata ? 'user_location' THEN NEW.metadata->'user_location'
        ELSE NULL
      END
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_temple_click_from_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_analytics_stats"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_stats_aggregated;
END;
$$;


ALTER FUNCTION "public"."refresh_analytics_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_analytics_stats"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  IF p_event_type IS NULL THEN
    DELETE FROM analytics_tracking
    WHERE module_name = p_module_name
      AND item_id = p_item_id;
  ELSE
    DELETE FROM analytics_tracking
    WHERE module_name = p_module_name
      AND item_id = p_item_id
      AND event_type = p_event_type;
  END IF;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count
  );
END;
$$;


ALTER FUNCTION "public"."reset_analytics_stats"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_analytics_event"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text", "p_user_agent" "text" DEFAULT NULL::"text", "p_device_type" "text" DEFAULT 'unknown'::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_already_tracked BOOLEAN;
  v_unique_count INTEGER;
BEGIN
  -- For views and downloads, check if IP has already tracked
  IF p_event_type IN ('view', 'download') THEN
    SELECT EXISTS (
      SELECT 1 FROM unified_analytics
      WHERE module_name = p_module_name
        AND item_id = p_item_id
        AND event_type = p_event_type
        AND ip_address = p_ip_address
    ) INTO v_already_tracked;
    
    IF v_already_tracked THEN
      -- Get current unique count
      SELECT COUNT(DISTINCT ip_address) INTO v_unique_count
      FROM unified_analytics
      WHERE module_name = p_module_name
        AND item_id = p_item_id
        AND event_type = p_event_type;
        
      RETURN jsonb_build_object(
        'tracked', false,
        'already_tracked', true,
        'unique_count', v_unique_count
      );
    END IF;
  END IF;
  
  -- Insert the event
  INSERT INTO unified_analytics (
    module_name, item_id, event_type, ip_address,
    user_agent, device_type, metadata
  ) VALUES (
    p_module_name, p_item_id, p_event_type, p_ip_address,
    p_user_agent, p_device_type, p_metadata
  );
  
  -- Get updated unique count
  SELECT COUNT(DISTINCT ip_address) INTO v_unique_count
  FROM unified_analytics
  WHERE module_name = p_module_name
    AND item_id = p_item_id
    AND event_type = p_event_type;
  
  RETURN jsonb_build_object(
    'tracked', true,
    'already_tracked', false,
    'unique_count', v_unique_count
  );
END;
$$;


ALTER FUNCTION "public"."track_analytics_event"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text", "p_user_agent" "text", "p_device_type" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unlike_wallpaper"("p_wallpaper_id" "uuid", "p_user_id" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE v_was_liked BOOLEAN; v_like_count INTEGER;
BEGIN
  SELECT EXISTS(SELECT 1 FROM wallpaper_likes WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id) INTO v_was_liked;
  IF v_was_liked THEN DELETE FROM wallpaper_likes WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id; END IF;
  SELECT COALESCE(like_count, 0) INTO v_like_count FROM wallpapers WHERE id = p_wallpaper_id;
  RETURN json_build_object('success', true, 'liked', false, 'like_count', v_like_count, 'was_liked', v_was_liked, 'message', CASE WHEN v_was_liked THEN 'Unliked successfully' ELSE 'Not previously liked' END);
END; $$;


ALTER FUNCTION "public"."unlike_wallpaper"("p_wallpaper_id" "uuid", "p_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."untrack_analytics_event"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_removed BOOLEAN;
  v_unique_count INTEGER;
BEGIN
  DELETE FROM unified_analytics
  WHERE module_name = p_module_name
    AND item_id = p_item_id
    AND event_type = p_event_type
    AND ip_address = p_ip_address;
  
  GET DIAGNOSTICS v_removed = ROW_COUNT;
  
  -- Get updated unique count
  SELECT COUNT(DISTINCT ip_address) INTO v_unique_count
  FROM unified_analytics
  WHERE module_name = p_module_name
    AND item_id = p_item_id
    AND event_type = p_event_type;
  
  RETURN jsonb_build_object(
    'removed', v_removed > 0,
    'unique_count', COALESCE(v_unique_count, 0)
  );
END;
$$;


ALTER FUNCTION "public"."untrack_analytics_event"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wallpaper_like_toggle"("p_user_id" "text", "p_wallpaper_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  already BOOLEAN;
  new_count INTEGER;
BEGIN
  -- Check if user has already liked this wallpaper
  SELECT EXISTS(
    SELECT 1 FROM wallpaper_likes 
    WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id
  ) INTO already;

  IF already THEN
    -- Unlike: remove from likes table and decrement counter
    DELETE FROM wallpaper_likes WHERE wallpaper_id = p_wallpaper_id AND user_id = p_user_id;
    UPDATE wallpapers SET like_count = GREATEST(COALESCE(like_count,0) - 1, 0) WHERE id = p_wallpaper_id;
    SELECT COALESCE(like_count, 0) FROM wallpapers WHERE id = p_wallpaper_id INTO new_count;
    RETURN json_build_object('action','unliked','like_count', new_count);
  ELSE
    -- Like: add to likes table and increment counter
    INSERT INTO wallpaper_likes (wallpaper_id, user_id) VALUES (p_wallpaper_id, p_user_id)
      ON CONFLICT (wallpaper_id, user_id) DO NOTHING;
    UPDATE wallpapers SET like_count = COALESCE(like_count,0) + 1 WHERE id = p_wallpaper_id;
    SELECT COALESCE(like_count, 0) FROM wallpapers WHERE id = p_wallpaper_id INTO new_count;
    RETURN json_build_object('action','liked','like_count', new_count);
  END IF;
END;
$$;


ALTER FUNCTION "public"."wallpaper_like_toggle"("p_user_id" "text", "p_wallpaper_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_activity_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "admin_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_id" "uuid",
    "details" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_activity_log_action_check" CHECK (("action" = ANY (ARRAY['create'::"text", 'update'::"text", 'delete'::"text", 'publish'::"text", 'unpublish'::"text", 'upload'::"text"])))
);


ALTER TABLE "public"."admin_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_chat_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "chat_id" "uuid",
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "tokens_used" integer,
    "response_time_ms" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_chat_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."ai_chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_chats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "last_message" "text",
    "message_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_name" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "track_anonymous" boolean DEFAULT true,
    "display_name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_name" "text" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "ip_address" "text" NOT NULL,
    "user_agent" "text",
    "device_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "analytics_tracking_event_type_check" CHECK (("event_type" = ANY (ARRAY['view'::"text", 'like'::"text", 'unlike'::"text", 'download'::"text", 'share'::"text", 'play'::"text", 'watch_complete'::"text", 'read'::"text", 'click'::"text"]))),
    CONSTRAINT "analytics_tracking_module_name_check" CHECK (("module_name" = ANY (ARRAY['wallpaper'::"text", 'song'::"text", 'video'::"text", 'sparkle'::"text", 'photo'::"text", 'ask_gugan'::"text", 'banner'::"text", 'temple'::"text"])))
);


ALTER TABLE "public"."analytics_tracking" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."analytics_stats_aggregated" AS
 SELECT "module_name",
    "item_id",
    "event_type",
    "count"(DISTINCT "ip_address") AS "unique_count",
    "count"(*) AS "total_count",
    "max"("created_at") AS "last_event_at"
   FROM "public"."analytics_tracking"
  GROUP BY "module_name", "item_id", "event_type"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."analytics_stats_aggregated" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "filename" "text" NOT NULL,
    "url" "text" NOT NULL,
    "duration_seconds" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "uploaded_by" "text"
);


ALTER TABLE "public"."audios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banner_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "banner_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "banner_analytics_event_type_check" CHECK (("event_type" = ANY (ARRAY['view'::"text", 'click'::"text", 'share'::"text"])))
);


ALTER TABLE "public"."banner_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banner_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#0d5e38'::"text",
    "icon" "text" DEFAULT 'folder'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."banner_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."banners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "link_url" "text",
    "folder_id" "uuid",
    "publish_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "scheduled_at" timestamp with time zone,
    "view_count" integer DEFAULT 0,
    "click_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "text",
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", ((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("description", ''::"text")))) STORED,
    "small_url" "text",
    "medium_url" "text",
    "large_url" "text",
    "original_url" "text",
    "banner_type" "text" DEFAULT 'home'::"text",
    "category" "text",
    "order_index" integer DEFAULT 0,
    "visibility" "text" DEFAULT 'public'::"text",
    "expires_at" timestamp with time zone,
    CONSTRAINT "banners_banner_type_check" CHECK (("banner_type" = ANY (ARRAY['wallpaper'::"text", 'photos'::"text", 'media'::"text", 'sparkle'::"text", 'home'::"text"]))),
    CONSTRAINT "banners_publish_status_check" CHECK (("publish_status" = ANY (ARRAY['published'::"text", 'draft'::"text", 'scheduled'::"text"]))),
    CONSTRAINT "banners_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'private'::"text"])))
);


ALTER TABLE "public"."banners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "type" "text" NOT NULL,
    "icon" "text",
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "categories_type_check" CHECK (("type" = ANY (ARRAY['wallpaper'::"text", 'media'::"text", 'photo'::"text", 'sparkle'::"text", 'banner'::"text"])))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."downloads_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "content_type" "text" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "device_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "downloads_log_content_type_check" CHECK (("content_type" = ANY (ARRAY['wallpaper'::"text", 'photo'::"text", 'media'::"text"])))
);


ALTER TABLE "public"."downloads_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kv_store_4a075ebc" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);


ALTER TABLE "public"."kv_store_4a075ebc" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "content_type" "text" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "likes_log_content_type_check" CHECK (("content_type" = ANY (ARRAY['wallpaper'::"text", 'photo'::"text", 'media'::"text", 'sparkle'::"text"])))
);


ALTER TABLE "public"."likes_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lyrics_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "audio_id" "uuid" NOT NULL,
    "index" integer NOT NULL,
    "start" double precision NOT NULL,
    "end" double precision NOT NULL,
    "text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "edited_by" "text"
);


ALTER TABLE "public"."lyrics_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lyrics_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "audio_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "lyrics_json" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "edited_by" "text"
);


ALTER TABLE "public"."lyrics_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "media_url" "text",
    "thumbnail_url" "text",
    "media_type" "text" NOT NULL,
    "duration" integer,
    "folder_id" "uuid",
    "publish_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "scheduled_at" timestamp with time zone,
    "view_count" integer DEFAULT 0,
    "play_count" integer DEFAULT 0,
    "download_count" integer DEFAULT 0,
    "like_count" integer DEFAULT 0,
    "share_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "text",
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", ((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("description", ''::"text")))) STORED,
    "file_url" "text",
    "youtube_id" "text",
    "youtube_url" "text",
    "storage_path" "text",
    "tags" "text"[],
    "published_at" timestamp with time zone,
    "artist" "text",
    CONSTRAINT "media_media_type_check" CHECK (("media_type" = ANY (ARRAY['audio'::"text", 'video'::"text"]))),
    CONSTRAINT "media_publish_status_check" CHECK (("publish_status" = ANY (ARRAY['published'::"text", 'draft'::"text", 'scheduled'::"text"])))
);


ALTER TABLE "public"."media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "media_analytics_event_type_check" CHECK (("event_type" = ANY (ARRAY['view'::"text", 'play'::"text", 'download'::"text", 'like'::"text", 'share'::"text"])))
);


ALTER TABLE "public"."media_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#0d5e38'::"text",
    "icon" "text" DEFAULT 'folder'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."media_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."photos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "small_url" "text",
    "medium_url" "text",
    "large_url" "text",
    "original_url" "text",
    "storage_path" "text" NOT NULL,
    "width" integer,
    "height" integer,
    "file_size" integer,
    "category_id" "uuid",
    "tags" "text"[] DEFAULT ARRAY[]::"text"[],
    "visibility" "text" DEFAULT 'public'::"text",
    "publish_status" "text" DEFAULT 'draft'::"text",
    "published_at" timestamp with time zone,
    "download_count" integer DEFAULT 0,
    "like_count" integer DEFAULT 0,
    "view_count" integer DEFAULT 0,
    "share_count" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "photos_publish_status_check" CHECK (("publish_status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'scheduled'::"text", 'archived'::"text"]))),
    CONSTRAINT "photos_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'private'::"text"])))
);


ALTER TABLE "public"."photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sparkle" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text",
    "content" "text",
    "description" "text",
    "thumbnail_url" "text",
    "video_id" "text",
    "video_url" "text",
    "source" "text",
    "publish_status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "published_at" timestamp with time zone,
    "subtitle" "text",
    "content_json" "jsonb",
    "cover_image_url" "text",
    "storage_path" "text",
    "author" "text",
    "category_id" "uuid",
    "tags" "text"[] DEFAULT ARRAY[]::"text"[],
    "visibility" "text" DEFAULT 'public'::"text",
    "is_featured" boolean DEFAULT false,
    "read_count" integer DEFAULT 0,
    "like_count" integer DEFAULT 0,
    "share_count" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sparkle" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sparkle_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sparkle_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sparkle_analytics_event_type_check" CHECK (("event_type" = ANY (ARRAY['view'::"text", 'like'::"text", 'share'::"text"])))
);


ALTER TABLE "public"."sparkle_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sparkle_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text" DEFAULT '#0d5e38'::"text",
    "icon" "text" DEFAULT 'folder'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sparkle_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sparkles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "content" "text" NOT NULL,
    "author" "text",
    "image_url" "text",
    "thumbnail_url" "text",
    "folder_id" "uuid",
    "publish_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "scheduled_at" timestamp with time zone,
    "view_count" integer DEFAULT 0,
    "like_count" integer DEFAULT 0,
    "share_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "text",
    "search_vector" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", ((((((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("description", ''::"text")) || ' '::"text") || COALESCE("content", ''::"text")) || ' '::"text") || COALESCE("author", ''::"text")))) STORED,
    CONSTRAINT "sparkles_publish_status_check" CHECK (("publish_status" = ANY (ARRAY['published'::"text", 'draft'::"text", 'scheduled'::"text"])))
);


ALTER TABLE "public"."sparkles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."temple_click_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "temple_id" "uuid",
    "clicked_at" timestamp with time zone DEFAULT "now"(),
    "device_type" "text",
    "user_location" "jsonb"
);


ALTER TABLE "public"."temple_click_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."temple_festivals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "temple_id" "uuid",
    "festival_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."temple_festivals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."temples" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "temple_name_ta" "text" NOT NULL,
    "temple_name_en" "text",
    "temple_fame" "text" NOT NULL,
    "place" "text" NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "google_map_url" "text",
    "is_active" boolean DEFAULT true,
    "is_distance_enabled" boolean DEFAULT true,
    "click_count" integer DEFAULT 0,
    "search_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."temples" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unified_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_name" "text" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "ip_address" "text" NOT NULL,
    "user_agent" "text",
    "device_type" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."unified_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users_app" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "auth_id" "uuid",
    "email" "text",
    "phone" "text",
    "name" "text",
    "avatar_url" "text",
    "profile_bg_url" "text",
    "is_premium" boolean DEFAULT false,
    "premium_expires_at" timestamp with time zone,
    "device_id" "text",
    "fcm_token" "text",
    "last_active_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users_app" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallpaper_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallpaper_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "user_id" "uuid",
    "session_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "wallpaper_analytics_event_type_check" CHECK (("event_type" = ANY (ARRAY['view'::"text", 'download'::"text", 'like'::"text", 'share'::"text"])))
);


ALTER TABLE "public"."wallpaper_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallpaper_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wallpaper_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallpaper_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "wallpaper_id" "uuid" NOT NULL,
    "user_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wallpaper_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallpapers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "image_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "small_url" "text",
    "medium_url" "text",
    "large_url" "text",
    "original_url" "text",
    "storage_path" "text" NOT NULL,
    "is_video" boolean DEFAULT false,
    "video_url" "text",
    "aspect_ratio" "text" DEFAULT '9:16'::"text",
    "width" integer,
    "height" integer,
    "file_size" integer,
    "category_id" "uuid",
    "tags" "text"[] DEFAULT ARRAY[]::"text"[],
    "visibility" "text" DEFAULT 'public'::"text",
    "publish_status" "text" DEFAULT 'draft'::"text",
    "published_at" timestamp with time zone,
    "is_featured" boolean DEFAULT false,
    "download_count" integer DEFAULT 0,
    "like_count" integer DEFAULT 0,
    "view_count" integer DEFAULT 0,
    "share_count" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "folder_id" "uuid",
    "scheduled_at" timestamp with time zone,
    CONSTRAINT "wallpapers_publish_status_check" CHECK (("publish_status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'scheduled'::"text", 'archived'::"text"]))),
    CONSTRAINT "wallpapers_visibility_check" CHECK (("visibility" = ANY (ARRAY['public'::"text", 'private'::"text"])))
);


ALTER TABLE "public"."wallpapers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_activity_log"
    ADD CONSTRAINT "admin_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_chat_messages"
    ADD CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_chats"
    ADD CONSTRAINT "ai_chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_config"
    ADD CONSTRAINT "analytics_config_module_name_event_type_key" UNIQUE ("module_name", "event_type");



ALTER TABLE ONLY "public"."analytics_config"
    ADD CONSTRAINT "analytics_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analytics_tracking"
    ADD CONSTRAINT "analytics_tracking_module_name_item_id_event_type_ip_addres_key" UNIQUE ("module_name", "item_id", "event_type", "ip_address");



ALTER TABLE ONLY "public"."analytics_tracking"
    ADD CONSTRAINT "analytics_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audios"
    ADD CONSTRAINT "audios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banner_analytics"
    ADD CONSTRAINT "banner_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banner_folders"
    ADD CONSTRAINT "banner_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banners"
    ADD CONSTRAINT "banners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."downloads_log"
    ADD CONSTRAINT "downloads_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kv_store_4a075ebc"
    ADD CONSTRAINT "kv_store_4a075ebc_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."likes_log"
    ADD CONSTRAINT "likes_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes_log"
    ADD CONSTRAINT "likes_log_user_id_content_type_content_id_key" UNIQUE ("user_id", "content_type", "content_id");



ALTER TABLE ONLY "public"."lyrics_blocks"
    ADD CONSTRAINT "lyrics_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lyrics_versions"
    ADD CONSTRAINT "lyrics_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_analytics"
    ADD CONSTRAINT "media_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_folders"
    ADD CONSTRAINT "media_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sparkle_analytics"
    ADD CONSTRAINT "sparkle_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sparkle_folders"
    ADD CONSTRAINT "sparkle_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sparkle"
    ADD CONSTRAINT "sparkle_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sparkle"
    ADD CONSTRAINT "sparkle_video_id_key" UNIQUE ("video_id");



ALTER TABLE ONLY "public"."sparkles"
    ADD CONSTRAINT "sparkles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."temple_click_logs"
    ADD CONSTRAINT "temple_click_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."temple_festivals"
    ADD CONSTRAINT "temple_festivals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."temple_festivals"
    ADD CONSTRAINT "temple_festivals_temple_id_festival_id_key" UNIQUE ("temple_id", "festival_id");



ALTER TABLE ONLY "public"."temples"
    ADD CONSTRAINT "temples_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unified_analytics"
    ADD CONSTRAINT "unified_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users_app"
    ADD CONSTRAINT "users_app_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users_app"
    ADD CONSTRAINT "users_app_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallpaper_analytics"
    ADD CONSTRAINT "wallpaper_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallpaper_folders"
    ADD CONSTRAINT "wallpaper_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallpaper_likes"
    ADD CONSTRAINT "wallpaper_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallpaper_likes"
    ADD CONSTRAINT "wallpaper_likes_wallpaper_id_user_id_key" UNIQUE ("wallpaper_id", "user_id");



ALTER TABLE ONLY "public"."wallpapers"
    ADD CONSTRAINT "wallpapers_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_admin_activity_log_created_at" ON "public"."admin_activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ai_chat_messages_chat_id" ON "public"."ai_chat_messages" USING "btree" ("chat_id");



CREATE INDEX "idx_ai_chats_user_id" ON "public"."ai_chats" USING "btree" ("user_id");



CREATE INDEX "idx_analytics_created" ON "public"."analytics_tracking" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_analytics_event" ON "public"."analytics_tracking" USING "btree" ("event_type");



CREATE INDEX "idx_analytics_ip" ON "public"."analytics_tracking" USING "btree" ("ip_address");



CREATE INDEX "idx_analytics_module_event" ON "public"."analytics_tracking" USING "btree" ("module_name", "event_type");



CREATE INDEX "idx_analytics_module_item" ON "public"."analytics_tracking" USING "btree" ("module_name", "item_id");



CREATE UNIQUE INDEX "idx_analytics_stats_unique" ON "public"."analytics_stats_aggregated" USING "btree" ("module_name", "item_id", "event_type");



CREATE INDEX "idx_audios_created_at" ON "public"."audios" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_banner_analytics_banner_id" ON "public"."banner_analytics" USING "btree" ("banner_id");



CREATE INDEX "idx_banner_analytics_created_at" ON "public"."banner_analytics" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_banner_analytics_event_type" ON "public"."banner_analytics" USING "btree" ("event_type");



CREATE INDEX "idx_banner_folders_created_at" ON "public"."banner_folders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_banners_banner_type" ON "public"."banners" USING "btree" ("banner_type");



CREATE INDEX "idx_banners_created_at" ON "public"."banners" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_banners_expires_at" ON "public"."banners" USING "btree" ("expires_at");



CREATE INDEX "idx_banners_folder_id" ON "public"."banners" USING "btree" ("folder_id");



CREATE INDEX "idx_banners_order_index" ON "public"."banners" USING "btree" ("order_index");



CREATE INDEX "idx_banners_publish_status" ON "public"."banners" USING "btree" ("publish_status");



CREATE INDEX "idx_banners_scheduled_at" ON "public"."banners" USING "btree" ("scheduled_at");



CREATE INDEX "idx_banners_search_vector" ON "public"."banners" USING "gin" ("search_vector");



CREATE INDEX "idx_banners_visibility" ON "public"."banners" USING "btree" ("visibility");



CREATE INDEX "idx_downloads_log_content" ON "public"."downloads_log" USING "btree" ("content_type", "content_id");



CREATE INDEX "idx_downloads_log_user_id" ON "public"."downloads_log" USING "btree" ("user_id");



CREATE INDEX "idx_likes_log_user_content" ON "public"."likes_log" USING "btree" ("user_id", "content_type", "content_id");



CREATE UNIQUE INDEX "idx_lyrics_blocks_audio_index" ON "public"."lyrics_blocks" USING "btree" ("audio_id", "index");



CREATE INDEX "idx_lyrics_blocks_audio_start" ON "public"."lyrics_blocks" USING "btree" ("audio_id", "start");



CREATE UNIQUE INDEX "idx_lyrics_versions_audio_version" ON "public"."lyrics_versions" USING "btree" ("audio_id", "version");



CREATE INDEX "idx_media_analytics_created_at" ON "public"."media_analytics" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_media_analytics_event_type" ON "public"."media_analytics" USING "btree" ("event_type");



CREATE INDEX "idx_media_analytics_media_id" ON "public"."media_analytics" USING "btree" ("media_id");



CREATE INDEX "idx_media_created_at" ON "public"."media" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_media_folder_id" ON "public"."media" USING "btree" ("folder_id");



CREATE INDEX "idx_media_folders_created_at" ON "public"."media_folders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_media_media_type" ON "public"."media" USING "btree" ("media_type");



CREATE INDEX "idx_media_publish_status" ON "public"."media" USING "btree" ("publish_status");



CREATE INDEX "idx_media_published_at" ON "public"."media" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_media_scheduled_at" ON "public"."media" USING "btree" ("scheduled_at");



CREATE INDEX "idx_media_search_vector" ON "public"."media" USING "gin" ("search_vector");



CREATE INDEX "idx_media_tags" ON "public"."media" USING "gin" ("tags");



CREATE INDEX "idx_media_youtube_id" ON "public"."media" USING "btree" ("youtube_id");



CREATE INDEX "idx_photos_category_id" ON "public"."photos" USING "btree" ("category_id");



CREATE INDEX "idx_photos_created_at" ON "public"."photos" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_photos_publish_status" ON "public"."photos" USING "btree" ("publish_status");



CREATE INDEX "idx_photos_tags" ON "public"."photos" USING "gin" ("tags");



CREATE INDEX "idx_sparkle_analytics_created_at" ON "public"."sparkle_analytics" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_sparkle_analytics_event_type" ON "public"."sparkle_analytics" USING "btree" ("event_type");



CREATE INDEX "idx_sparkle_analytics_sparkle_id" ON "public"."sparkle_analytics" USING "btree" ("sparkle_id");



CREATE INDEX "idx_sparkle_folders_created_at" ON "public"."sparkle_folders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_sparkle_published_at" ON "public"."sparkle" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_sparkles_created_at" ON "public"."sparkles" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_sparkles_folder_id" ON "public"."sparkles" USING "btree" ("folder_id");



CREATE INDEX "idx_sparkles_publish_status" ON "public"."sparkles" USING "btree" ("publish_status");



CREATE INDEX "idx_sparkles_scheduled_at" ON "public"."sparkles" USING "btree" ("scheduled_at");



CREATE INDEX "idx_sparkles_search_vector" ON "public"."sparkles" USING "gin" ("search_vector");



CREATE INDEX "idx_temple_click_logs_clicked_at" ON "public"."temple_click_logs" USING "btree" ("clicked_at" DESC);



CREATE INDEX "idx_temple_click_logs_temple_id" ON "public"."temple_click_logs" USING "btree" ("temple_id");



CREATE INDEX "idx_temple_festivals_temple_id" ON "public"."temple_festivals" USING "btree" ("temple_id");



CREATE INDEX "idx_temples_click_count" ON "public"."temples" USING "btree" ("click_count" DESC);



CREATE INDEX "idx_temples_is_active" ON "public"."temples" USING "btree" ("is_active");



CREATE INDEX "idx_temples_search_key_trgm" ON "public"."temples" USING "gin" ("search_key" "public"."gin_trgm_ops");



CREATE UNIQUE INDEX "idx_temples_unique_key_place" ON "public"."temples" USING "btree" ("search_key", "place");



CREATE INDEX "idx_unified_analytics_created_at" ON "public"."unified_analytics" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_unified_analytics_event_type" ON "public"."unified_analytics" USING "btree" ("event_type");



CREATE INDEX "idx_unified_analytics_ip" ON "public"."unified_analytics" USING "btree" ("ip_address");



CREATE INDEX "idx_unified_analytics_module_item" ON "public"."unified_analytics" USING "btree" ("module_name", "item_id");



CREATE UNIQUE INDEX "idx_unified_analytics_unique_ip_event" ON "public"."unified_analytics" USING "btree" ("module_name", "item_id", "event_type", "ip_address") WHERE ("event_type" = ANY (ARRAY['view'::"text", 'download'::"text"]));



CREATE INDEX "idx_wallpaper_analytics_created_at" ON "public"."wallpaper_analytics" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_wallpaper_analytics_event_type" ON "public"."wallpaper_analytics" USING "btree" ("event_type");



CREATE INDEX "idx_wallpaper_analytics_wallpaper_event_date" ON "public"."wallpaper_analytics" USING "btree" ("wallpaper_id", "event_type", "created_at" DESC);



CREATE INDEX "idx_wallpaper_analytics_wallpaper_id" ON "public"."wallpaper_analytics" USING "btree" ("wallpaper_id");



CREATE INDEX "idx_wallpaper_folders_created_at" ON "public"."wallpaper_folders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_wallpaper_likes_user" ON "public"."wallpaper_likes" USING "btree" ("user_id");



CREATE INDEX "idx_wallpaper_likes_user_id" ON "public"."wallpaper_likes" USING "btree" ("user_id");



CREATE INDEX "idx_wallpaper_likes_wallpaper" ON "public"."wallpaper_likes" USING "btree" ("wallpaper_id");



CREATE INDEX "idx_wallpaper_likes_wallpaper_id" ON "public"."wallpaper_likes" USING "btree" ("wallpaper_id");



CREATE INDEX "idx_wallpapers_category_id" ON "public"."wallpapers" USING "btree" ("category_id");



CREATE INDEX "idx_wallpapers_created_at" ON "public"."wallpapers" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_wallpapers_folder_id" ON "public"."wallpapers" USING "btree" ("folder_id");



CREATE INDEX "idx_wallpapers_is_featured" ON "public"."wallpapers" USING "btree" ("is_featured");



CREATE INDEX "idx_wallpapers_publish_status" ON "public"."wallpapers" USING "btree" ("publish_status");



CREATE INDEX "idx_wallpapers_tags" ON "public"."wallpapers" USING "gin" ("tags");



CREATE INDEX "idx_wallpapers_visibility" ON "public"."wallpapers" USING "btree" ("visibility");



CREATE INDEX "kv_store_4a075ebc_key_idx" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx1" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx10" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx11" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx12" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx13" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx14" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx15" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx16" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx17" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx18" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx19" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx2" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx20" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx21" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx22" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx23" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx24" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx25" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx26" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx27" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx28" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx29" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx3" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx30" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx31" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx32" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx33" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx34" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx35" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx36" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx37" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx38" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx39" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx4" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx40" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx41" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx42" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx43" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx44" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx45" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx46" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx47" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx48" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx49" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx5" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx50" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx51" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx52" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx53" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx54" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx55" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx56" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx57" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx58" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx59" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx6" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx60" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx61" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx62" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx63" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx64" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx65" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx66" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx67" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx68" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx69" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx7" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx70" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx71" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx72" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx73" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx74" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx75" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx76" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx77" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx78" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx79" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx8" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx80" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx81" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx82" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx83" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx84" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx85" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx86" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx87" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx88" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx89" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx9" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx90" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx91" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx92" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx93" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx94" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_4a075ebc_key_idx95" ON "public"."kv_store_4a075ebc" USING "btree" ("key" "text_pattern_ops");



CREATE OR REPLACE TRIGGER "banner_folders_updated_at_trigger" BEFORE UPDATE ON "public"."banner_folders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "banners_updated_at_trigger" BEFORE UPDATE ON "public"."banners" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "media_folders_updated_at_trigger" BEFORE UPDATE ON "public"."media_folders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "media_updated_at_trigger" BEFORE UPDATE ON "public"."media" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "sparkle_folders_updated_at_trigger" BEFORE UPDATE ON "public"."sparkle_folders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "sparkles_updated_at_trigger" BEFORE UPDATE ON "public"."sparkles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_log_temple_click_from_analytics" AFTER INSERT ON "public"."analytics_tracking" FOR EACH ROW EXECUTE FUNCTION "public"."log_temple_click_from_analytics"();



CREATE OR REPLACE TRIGGER "update_ai_chats_updated_at" BEFORE UPDATE ON "public"."ai_chats" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_photos_updated_at" BEFORE UPDATE ON "public"."photos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_app_updated_at" BEFORE UPDATE ON "public"."users_app" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_wallpaper_folders_updated_at" BEFORE UPDATE ON "public"."wallpaper_folders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_wallpapers_updated_at" BEFORE UPDATE ON "public"."wallpapers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."ai_chat_messages"
    ADD CONSTRAINT "ai_chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."ai_chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_chats"
    ADD CONSTRAINT "ai_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users_app"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banner_analytics"
    ADD CONSTRAINT "banner_analytics_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "public"."banners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."banners"
    ADD CONSTRAINT "banners_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."banner_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."downloads_log"
    ADD CONSTRAINT "downloads_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users_app"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."likes_log"
    ADD CONSTRAINT "likes_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users_app"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lyrics_blocks"
    ADD CONSTRAINT "lyrics_blocks_audio_id_fkey" FOREIGN KEY ("audio_id") REFERENCES "public"."audios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lyrics_versions"
    ADD CONSTRAINT "lyrics_versions_audio_id_fkey" FOREIGN KEY ("audio_id") REFERENCES "public"."audios"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_analytics"
    ADD CONSTRAINT "media_analytics_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."media_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sparkle_analytics"
    ADD CONSTRAINT "sparkle_analytics_sparkle_id_fkey" FOREIGN KEY ("sparkle_id") REFERENCES "public"."sparkles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sparkles"
    ADD CONSTRAINT "sparkles_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."sparkle_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."temple_click_logs"
    ADD CONSTRAINT "temple_click_logs_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "public"."temples"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."temple_festivals"
    ADD CONSTRAINT "temple_festivals_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "public"."temples"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallpaper_analytics"
    ADD CONSTRAINT "wallpaper_analytics_wallpaper_id_fkey" FOREIGN KEY ("wallpaper_id") REFERENCES "public"."wallpapers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallpaper_likes"
    ADD CONSTRAINT "wallpaper_likes_wallpaper_id_fkey" FOREIGN KEY ("wallpaper_id") REFERENCES "public"."wallpapers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallpapers"
    ADD CONSTRAINT "wallpapers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."wallpapers"
    ADD CONSTRAINT "wallpapers_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."wallpaper_folders"("id") ON DELETE SET NULL;



CREATE POLICY "Allow public read" ON "public"."wallpapers" FOR SELECT USING (("visibility" = 'public'::"text"));



CREATE POLICY "Anyone can track events" ON "public"."analytics_tracking" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can view config" ON "public"."analytics_config" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can view analytics" ON "public"."analytics_tracking" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") OR ("auth"."role"() = 'anon'::"text")));



CREATE POLICY "Public can view audios" ON "public"."audios" FOR SELECT USING (true);



CREATE POLICY "Public can view lyrics blocks" ON "public"."lyrics_blocks" FOR SELECT USING (true);



CREATE POLICY "Public can view lyrics versions" ON "public"."lyrics_versions" FOR SELECT USING (true);



CREATE POLICY "Public can view published photos" ON "public"."photos" FOR SELECT USING ((("publish_status" = 'published'::"text") AND ("visibility" = 'public'::"text")));



CREATE POLICY "Public can view published wallpapers" ON "public"."wallpapers" FOR SELECT USING ((("publish_status" = 'published'::"text") AND ("visibility" = 'public'::"text")));



CREATE POLICY "Service role can delete analytics" ON "public"."analytics_tracking" FOR DELETE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can modify config" ON "public"."analytics_config" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can create download logs" ON "public"."downloads_log" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "users_app"."auth_id"
   FROM "public"."users_app"
  WHERE ("users_app"."id" = "downloads_log"."user_id"))));



CREATE POLICY "Users can create own chats" ON "public"."ai_chats" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "users_app"."auth_id"
   FROM "public"."users_app"
  WHERE ("users_app"."id" = "ai_chats"."user_id"))));



CREATE POLICY "Users can create own messages" ON "public"."ai_chat_messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."ai_chats"
  WHERE (("ai_chats"."id" = "ai_chat_messages"."chat_id") AND ("auth"."uid"() = ( SELECT "users_app"."auth_id"
           FROM "public"."users_app"
          WHERE ("users_app"."id" = "ai_chats"."user_id")))))));



CREATE POLICY "Users can manage own likes" ON "public"."likes_log" USING (("auth"."uid"() = ( SELECT "users_app"."auth_id"
   FROM "public"."users_app"
  WHERE ("users_app"."id" = "likes_log"."user_id"))));



CREATE POLICY "Users can update own profile" ON "public"."users_app" FOR UPDATE USING (("auth"."uid"() = "auth_id"));



CREATE POLICY "Users can view own chats" ON "public"."ai_chats" FOR SELECT USING (("auth"."uid"() = ( SELECT "users_app"."auth_id"
   FROM "public"."users_app"
  WHERE ("users_app"."id" = "ai_chats"."user_id"))));



CREATE POLICY "Users can view own messages" ON "public"."ai_chat_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ai_chats"
  WHERE (("ai_chats"."id" = "ai_chat_messages"."chat_id") AND ("auth"."uid"() = ( SELECT "users_app"."auth_id"
           FROM "public"."users_app"
          WHERE ("users_app"."id" = "ai_chats"."user_id")))))));



CREATE POLICY "Users can view own profile" ON "public"."users_app" FOR SELECT USING (("auth"."uid"() = "auth_id"));



ALTER TABLE "public"."ai_chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analytics_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."downloads_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kv_store_4a075ebc" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lyrics_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lyrics_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users_app" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallpapers" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_publish_scheduled_banners"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_publish_scheduled_banners"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_publish_scheduled_banners"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_publish_scheduled_media"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_publish_scheduled_media"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_publish_scheduled_media"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_publish_scheduled_sparkles"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_publish_scheduled_sparkles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_publish_scheduled_sparkles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_analytics_tracked"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_analytics_tracked"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_analytics_tracked"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_wallpaper_like"("p_user_id" "text", "p_wallpaper_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_wallpaper_like"("p_user_id" "text", "p_wallpaper_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_wallpaper_like"("p_user_id" "text", "p_wallpaper_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_media_likes"("media_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_media_likes"("media_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_media_likes"("media_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_photo_likes"("photo_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_photo_likes"("photo_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_photo_likes"("photo_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_sparkle_likes"("sparkle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_sparkle_likes"("sparkle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_sparkle_likes"("sparkle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_wallpaper_likes"("wallpaper_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_wallpaper_likes"("wallpaper_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_wallpaper_likes"("wallpaper_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_dashboard"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_dashboard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_dashboard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analytics_stats"("p_module_name" "text", "p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_analytics_stats"("p_module_name" "text", "p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analytics_stats"("p_module_name" "text", "p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_items_by_event"("p_module_name" "text", "p_event_type" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_items_by_event"("p_module_name" "text", "p_event_type" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_items_by_event"("p_module_name" "text", "p_event_type" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_banner_clicks"("banner_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_banner_clicks"("banner_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_banner_clicks"("banner_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_banner_views"("banner_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_banner_views"("banner_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_banner_views"("banner_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_counter"("table_name" "text", "record_id" "uuid", "counter_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_counter"("table_name" "text", "record_id" "uuid", "counter_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_counter"("table_name" "text", "record_id" "uuid", "counter_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_media_downloads"("media_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_media_downloads"("media_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_media_downloads"("media_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_media_likes"("media_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_media_likes"("media_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_media_likes"("media_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_media_plays"("media_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_media_plays"("media_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_media_plays"("media_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_media_shares"("media_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_media_shares"("media_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_media_shares"("media_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_media_views"("media_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_media_views"("media_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_media_views"("media_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_photo_downloads"("photo_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_photo_downloads"("photo_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_photo_downloads"("photo_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_photo_likes"("photo_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_photo_likes"("photo_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_photo_likes"("photo_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_photo_shares"("photo_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_photo_shares"("photo_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_photo_shares"("photo_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_photo_views"("photo_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_photo_views"("photo_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_photo_views"("photo_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_sparkle_likes"("sparkle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_sparkle_likes"("sparkle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_sparkle_likes"("sparkle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_sparkle_shares"("sparkle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_sparkle_shares"("sparkle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_sparkle_shares"("sparkle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_sparkle_views"("sparkle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_sparkle_views"("sparkle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_sparkle_views"("sparkle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_temple_clicks"("temple_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_temple_clicks"("temple_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_temple_clicks"("temple_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_wallpaper_downloads"("wallpaper_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_wallpaper_downloads"("wallpaper_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_wallpaper_downloads"("wallpaper_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_wallpaper_likes"("wallpaper_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_wallpaper_likes"("wallpaper_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_wallpaper_likes"("wallpaper_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_wallpaper_shares"("wallpaper_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_wallpaper_shares"("wallpaper_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_wallpaper_shares"("wallpaper_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_wallpaper_views"("wallpaper_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_wallpaper_views"("wallpaper_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_wallpaper_views"("wallpaper_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."like_wallpaper"("p_wallpaper_id" "uuid", "p_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."like_wallpaper"("p_wallpaper_id" "uuid", "p_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."like_wallpaper"("p_wallpaper_id" "uuid", "p_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_temple_click_from_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_temple_click_from_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_temple_click_from_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_analytics_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_analytics_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_analytics_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_analytics_stats"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_analytics_stats"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_analytics_stats"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."track_analytics_event"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text", "p_user_agent" "text", "p_device_type" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."track_analytics_event"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text", "p_user_agent" "text", "p_device_type" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_analytics_event"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text", "p_user_agent" "text", "p_device_type" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."unlike_wallpaper"("p_wallpaper_id" "uuid", "p_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unlike_wallpaper"("p_wallpaper_id" "uuid", "p_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlike_wallpaper"("p_wallpaper_id" "uuid", "p_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."untrack_analytics_event"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."untrack_analytics_event"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."untrack_analytics_event"("p_module_name" "text", "p_item_id" "uuid", "p_event_type" "text", "p_ip_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."wallpaper_like_toggle"("p_user_id" "text", "p_wallpaper_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."wallpaper_like_toggle"("p_user_id" "text", "p_wallpaper_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wallpaper_like_toggle"("p_user_id" "text", "p_wallpaper_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."admin_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."ai_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."ai_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."ai_chats" TO "anon";
GRANT ALL ON TABLE "public"."ai_chats" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_chats" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_config" TO "anon";
GRANT ALL ON TABLE "public"."analytics_config" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_config" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_tracking" TO "anon";
GRANT ALL ON TABLE "public"."analytics_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."analytics_stats_aggregated" TO "anon";
GRANT ALL ON TABLE "public"."analytics_stats_aggregated" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_stats_aggregated" TO "service_role";



GRANT ALL ON TABLE "public"."audios" TO "anon";
GRANT ALL ON TABLE "public"."audios" TO "authenticated";
GRANT ALL ON TABLE "public"."audios" TO "service_role";



GRANT ALL ON TABLE "public"."banner_analytics" TO "anon";
GRANT ALL ON TABLE "public"."banner_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."banner_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."banner_folders" TO "anon";
GRANT ALL ON TABLE "public"."banner_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."banner_folders" TO "service_role";



GRANT ALL ON TABLE "public"."banners" TO "anon";
GRANT ALL ON TABLE "public"."banners" TO "authenticated";
GRANT ALL ON TABLE "public"."banners" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."downloads_log" TO "anon";
GRANT ALL ON TABLE "public"."downloads_log" TO "authenticated";
GRANT ALL ON TABLE "public"."downloads_log" TO "service_role";



GRANT ALL ON TABLE "public"."kv_store_4a075ebc" TO "anon";
GRANT ALL ON TABLE "public"."kv_store_4a075ebc" TO "authenticated";
GRANT ALL ON TABLE "public"."kv_store_4a075ebc" TO "service_role";



GRANT ALL ON TABLE "public"."likes_log" TO "anon";
GRANT ALL ON TABLE "public"."likes_log" TO "authenticated";
GRANT ALL ON TABLE "public"."likes_log" TO "service_role";



GRANT ALL ON TABLE "public"."lyrics_blocks" TO "anon";
GRANT ALL ON TABLE "public"."lyrics_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."lyrics_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."lyrics_versions" TO "anon";
GRANT ALL ON TABLE "public"."lyrics_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."lyrics_versions" TO "service_role";



GRANT ALL ON TABLE "public"."media" TO "anon";
GRANT ALL ON TABLE "public"."media" TO "authenticated";
GRANT ALL ON TABLE "public"."media" TO "service_role";



GRANT ALL ON TABLE "public"."media_analytics" TO "anon";
GRANT ALL ON TABLE "public"."media_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."media_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."media_folders" TO "anon";
GRANT ALL ON TABLE "public"."media_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."media_folders" TO "service_role";



GRANT ALL ON TABLE "public"."photos" TO "anon";
GRANT ALL ON TABLE "public"."photos" TO "authenticated";
GRANT ALL ON TABLE "public"."photos" TO "service_role";



GRANT ALL ON TABLE "public"."sparkle" TO "anon";
GRANT ALL ON TABLE "public"."sparkle" TO "authenticated";
GRANT ALL ON TABLE "public"."sparkle" TO "service_role";



GRANT ALL ON TABLE "public"."sparkle_analytics" TO "anon";
GRANT ALL ON TABLE "public"."sparkle_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."sparkle_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."sparkle_folders" TO "anon";
GRANT ALL ON TABLE "public"."sparkle_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."sparkle_folders" TO "service_role";



GRANT ALL ON TABLE "public"."sparkles" TO "anon";
GRANT ALL ON TABLE "public"."sparkles" TO "authenticated";
GRANT ALL ON TABLE "public"."sparkles" TO "service_role";



GRANT ALL ON TABLE "public"."temple_click_logs" TO "anon";
GRANT ALL ON TABLE "public"."temple_click_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."temple_click_logs" TO "service_role";



GRANT ALL ON TABLE "public"."temple_festivals" TO "anon";
GRANT ALL ON TABLE "public"."temple_festivals" TO "authenticated";
GRANT ALL ON TABLE "public"."temple_festivals" TO "service_role";



GRANT ALL ON TABLE "public"."temples" TO "anon";
GRANT ALL ON TABLE "public"."temples" TO "authenticated";
GRANT ALL ON TABLE "public"."temples" TO "service_role";



GRANT ALL ON TABLE "public"."unified_analytics" TO "anon";
GRANT ALL ON TABLE "public"."unified_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."unified_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."users_app" TO "anon";
GRANT ALL ON TABLE "public"."users_app" TO "authenticated";
GRANT ALL ON TABLE "public"."users_app" TO "service_role";



GRANT ALL ON TABLE "public"."wallpaper_analytics" TO "anon";
GRANT ALL ON TABLE "public"."wallpaper_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."wallpaper_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."wallpaper_folders" TO "anon";
GRANT ALL ON TABLE "public"."wallpaper_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."wallpaper_folders" TO "service_role";



GRANT ALL ON TABLE "public"."wallpaper_likes" TO "anon";
GRANT ALL ON TABLE "public"."wallpaper_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."wallpaper_likes" TO "service_role";



GRANT ALL ON TABLE "public"."wallpapers" TO "anon";
GRANT ALL ON TABLE "public"."wallpapers" TO "authenticated";
GRANT ALL ON TABLE "public"."wallpapers" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







