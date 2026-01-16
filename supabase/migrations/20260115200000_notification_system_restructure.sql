-- Notification System Restructuring
-- Updates schema to support 3 notification types with new fields

-- Add new columns for navigation and button customization
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS display_type text,
ADD COLUMN IF NOT EXISTS navigation_url text,
ADD COLUMN IF NOT EXISTS button_text text,
ADD COLUMN IF NOT EXISTS layout_config jsonb DEFAULT '{}'::jsonb;

-- Update display_type to use new enum values
-- First, set default values for existing notifications
UPDATE public.notifications 
SET display_type = 'banner' 
WHERE display_type IS NULL OR display_type IN ('card', 'modal');

UPDATE public.notifications 
SET display_type = 'fullscreen_banner' 
WHERE display_type = 'fullscreen';

-- Now add constraint for the new enum values
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_display_type_check 
CHECK (display_type IN ('push', 'banner', 'fullscreen_banner'));

-- Set display_type to be required (NOT NULL) with default value
ALTER TABLE public.notifications 
ALTER COLUMN display_type SET NOT NULL,
ALTER COLUMN display_type SET DEFAULT 'banner';

-- Create index for display_type
CREATE INDEX IF NOT EXISTS idx_notifications_display_type 
ON public.notifications(display_type);

-- Add comment for documentation
COMMENT ON COLUMN public.notifications.display_type IS 'Notification display type: push (Android native), banner (top banner with button), fullscreen_banner (9:16 vertical image)';
COMMENT ON COLUMN public.notifications.navigation_url IS 'URL to navigate to when notification is tapped/clicked';
COMMENT ON COLUMN public.notifications.button_text IS 'Custom button text for banner type notifications';
COMMENT ON COLUMN public.notifications.layout_config IS 'Additional layout configuration (e.g., button color, position)';
