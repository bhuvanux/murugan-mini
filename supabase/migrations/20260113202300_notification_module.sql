-- Notification Module - Complete Database Schema
-- This migration creates the notifications table and related functions

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Content fields
    title text NOT NULL,
    short_description text,
    message_content text NOT NULL,
    image_url text NOT NULL, -- Mandatory image support
    
    -- Notification metadata
    notification_type text NOT NULL DEFAULT 'normal' CHECK (notification_type IN ('normal', 'important')),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
    target_audience text NOT NULL DEFAULT 'all_users' CHECK (target_audience IN ('all_users', 'segment')),
    
    -- Scheduling
    scheduled_at timestamptz,
    sent_at timestamptz,
    
    -- Analytics
    view_count integer DEFAULT 0,
    open_count integer DEFAULT 0,
    
    -- Audit fields
    created_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Extensibility
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON public.notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON public.notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON public.notifications(created_by);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to read all notifications (for admin panel)
CREATE POLICY "Authenticated users can read notifications" 
ON public.notifications FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to insert notifications (for admin panel)
CREATE POLICY "Authenticated users can create notifications" 
ON public.notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to update notifications (for admin panel)
CREATE POLICY "Authenticated users can update notifications" 
ON public.notifications FOR UPDATE 
TO authenticated 
USING (true);

-- Allow authenticated users to delete notifications (for admin panel)
CREATE POLICY "Authenticated users can delete notifications" 
ON public.notifications FOR DELETE 
TO authenticated 
USING (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get notification statistics
CREATE OR REPLACE FUNCTION public.get_notification_stats()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_notifications', COUNT(*),
        'sent_notifications', COUNT(*) FILTER (WHERE status = 'sent'),
        'scheduled_notifications', COUNT(*) FILTER (WHERE status = 'scheduled'),
        'draft_notifications', COUNT(*) FILTER (WHERE status = 'draft'),
        'important_notifications', COUNT(*) FILTER (WHERE notification_type = 'important'),
        'total_views', COALESCE(SUM(view_count), 0),
        'total_opens', COALESCE(SUM(open_count), 0),
        'open_rate', CASE 
            WHEN SUM(view_count) > 0 THEN 
                ROUND((SUM(open_count)::numeric / SUM(view_count)::numeric * 100), 2)
            ELSE 0 
        END
    )
    INTO result
    FROM public.notifications;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get individual notification analytics
CREATE OR REPLACE FUNCTION public.get_notification_analytics(
    p_notification_id uuid,
    p_start_date timestamptz DEFAULT NULL,
    p_end_date timestamptz DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
    notification_record RECORD;
BEGIN
    -- Get notification details
    SELECT * INTO notification_record
    FROM public.notifications
    WHERE id = p_notification_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Notification not found');
    END IF;
    
    -- Build analytics result
    result := jsonb_build_object(
        'notification_id', notification_record.id,
        'title', notification_record.title,
        'status', notification_record.status,
        'type', notification_record.notification_type,
        'total_views', notification_record.view_count,
        'total_opens', notification_record.open_count,
        'open_rate', CASE 
            WHEN notification_record.view_count > 0 THEN 
                ROUND((notification_record.open_count::numeric / notification_record.view_count::numeric * 100), 2)
            ELSE 0 
        END,
        'sent_at', notification_record.sent_at,
        'scheduled_at', notification_record.scheduled_at
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_notification_view(p_notification_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.notifications
    SET view_count = view_count + 1
    WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment open count
CREATE OR REPLACE FUNCTION public.increment_notification_open(p_notification_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.notifications
    SET open_count = open_count + 1
    WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_notification_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notification_analytics(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_notification_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_notification_open(uuid) TO authenticated;

-- Comment on table
COMMENT ON TABLE public.notifications IS 'Stores push notifications for Tamil Kadavul Murugan app with scheduling and analytics support';
