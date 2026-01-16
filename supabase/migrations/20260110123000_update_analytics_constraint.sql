-- Fix analytics_tracking check constraint to include all event types
ALTER TABLE public.analytics_tracking DROP CONSTRAINT IF EXISTS analytics_tracking_event_type_check;

ALTER TABLE public.analytics_tracking ADD CONSTRAINT analytics_tracking_event_type_check 
CHECK (event_type IN (
  'view', 
  'like', 
  'download', 
  'share', 
  'click', 
  'read', 
  'play', 
  'play_video_inline', 
  'add_to_playlist', 
  'open_in_youtube', 
  'install'
));
