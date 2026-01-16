-- Add metadata column to notifications table for storing analytics/delivery stats
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN notifications.metadata IS 'Stores additional data like FCM delivery stats, JSON payloads, etc.';
