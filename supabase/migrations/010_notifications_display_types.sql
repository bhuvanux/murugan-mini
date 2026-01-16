-- Add display type and layout configuration to notifications table
-- This enables multiple notification display styles (banner, card, modal, fullscreen)
-- with customizable layouts controlled from admin panel

-- Add display_type column (default: banner for backward compatibility)
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS display_type TEXT DEFAULT 'banner' 
CHECK (display_type IN ('banner', 'card', 'modal', 'fullscreen'));

-- Add layout_config column for UI customization
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{}';

-- Add comment explaining the schema
COMMENT ON COLUMN notifications.display_type IS 'How notification appears in app: banner (top slide), card (overlay), modal (center popup), fullscreen (takeover)';
COMMENT ON COLUMN notifications.layout_config IS 'UI customization: { backgroundColor, textColor, buttonText, buttonColor, position, showIcon, iconType }';

-- Create index for faster queries by display type
CREATE INDEX IF NOT EXISTS idx_notifications_display_type ON notifications(display_type);
