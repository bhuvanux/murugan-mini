CREATE OR REPLACE FUNCTION public.analytics_experiment_variant_ctr(
  p_experiment_id uuid,
  p_from_ts timestamptz,
  p_to_ts timestamptz
)
RETURNS TABLE (
  variant_key text,
  impressions int,
  clicks int,
  ctr numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ev AS (
    SELECT
      COALESCE((metadata->>'variant')::text, 'unknown') AS variant_key,
      COUNT(*) FILTER (WHERE event_name = 'feature_card_impression')::int AS impressions,
      COUNT(*) FILTER (WHERE event_name = 'feature_card_click')::int AS clicks
    FROM public.analytics_events
    WHERE created_at >= p_from_ts
      AND created_at <= p_to_ts
      AND (metadata->>'experiment_id') = p_experiment_id::text
      AND event_name IN ('feature_card_impression', 'feature_card_click')
    GROUP BY COALESCE((metadata->>'variant')::text, 'unknown')
  )
  SELECT
    ev.variant_key,
    ev.impressions,
    ev.clicks,
    CASE WHEN ev.impressions > 0 THEN (ev.clicks::numeric / ev.impressions::numeric) ELSE 0::numeric END AS ctr
  FROM ev;
$$;

REVOKE ALL ON FUNCTION public.analytics_experiment_variant_ctr(uuid, timestamptz, timestamptz) FROM PUBLIC;
