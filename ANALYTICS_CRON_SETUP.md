# Analytics Aggregation Cron Setup

This repo exposes a canonical aggregation endpoint:

- `POST /api/analytics/aggregate-hourly`
- `POST /api/analytics/aggregate-daily`
- `POST /api/analytics/purge` (retention cleanup)

It supports:
- **hourly**: `POST /api/analytics/aggregate-hourly`
- **daily**: `POST /api/analytics/aggregate-daily` (defaults to yesterday UTC)
- **purge**: `POST /api/analytics/purge` (defaults to 90 days retention)

## Required server env
Set this on your Supabase Edge Functions environment:

- `ANALYTICS_CRON_SECRET` (string)

If set, the endpoint requires this header:

- `x-analytics-cron-secret: <ANALYTICS_CRON_SECRET>`

## GitHub Actions cron
A workflow is included:

- `.github/workflows/analytics-aggregate-cron.yml`

### Required GitHub Secrets
Add these GitHub repository secrets:

- `ANALYTICS_AGGREGATE_URL`
  - Example (Supabase Functions):
    - `https://<PROJECT_REF>.functions.supabase.co/make-server-4a075ebc/api/analytics/aggregate`
  - Or if you front it via your web domain:
    - `https://<YOUR_DOMAIN>/api/analytics/aggregate`

- `ANALYTICS_CRON_SECRET`
  - Must match the Edge Functions environment variable.

## Manual test

```bash
curl -sS -X POST "https://<PROJECT_REF>.functions.supabase.co/make-server-4a075ebc/api/analytics/aggregate" \
  -H "Content-Type: application/json" \
  -H "x-analytics-cron-secret: <ANALYTICS_CRON_SECRET>" \
  -d '{"mode":"hourly"}'

# Hourly
curl -sS -X POST "https://<PROJECT_REF>.functions.supabase.co/make-server-4a075ebc/api/analytics/aggregate-hourly" \
  -H "Content-Type: application/json" \
  -H "x-analytics-cron-secret: <ANALYTICS_CRON_SECRET>" \
  -d '{}'

# Daily (yesterday UTC)
curl -sS -X POST "https://<PROJECT_REF>.functions.supabase.co/make-server-4a075ebc/api/analytics/aggregate-daily" \
  -H "Content-Type: application/json" \
  -H "x-analytics-cron-secret: <ANALYTICS_CRON_SECRET>" \
  -d '{}'

# Purge (90 days)
curl -sS -X POST "https://<PROJECT_REF>.functions.supabase.co/make-server-4a075ebc/api/analytics/purge" \
  -H "Content-Type: application/json" \
  -H "x-analytics-cron-secret: <ANALYTICS_CRON_SECRET>" \
  -d '{"retention_days":90}'
```

## What gets written
Aggregation writes rollups into:

- `analytics_page_stats`
- `analytics_feature_stats`
- `analytics_session_stats`

Purge deletes old raw data from:

- `analytics_events` (by `created_at`)
- `analytics_sessions` (by `started_at`)
