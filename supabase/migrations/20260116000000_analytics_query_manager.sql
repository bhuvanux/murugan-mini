-- Analytics Query Manager - Saved Queries Schema
-- Stores admin-saved analytics queries for quick re-execution

-- Create saved_analytics_queries table
CREATE TABLE IF NOT EXISTS public.saved_analytics_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query_name TEXT NOT NULL,
    query_template_id TEXT NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_executed_at TIMESTAMPTZ,
    execution_count INT DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    category TEXT,
    CONSTRAINT query_name_not_empty CHECK (length(query_name) > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_queries_admin_user ON public.saved_analytics_queries(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_saved_queries_template ON public.saved_analytics_queries(query_template_id);
CREATE INDEX IF NOT EXISTS idx_saved_queries_category ON public.saved_analytics_queries(category);
CREATE INDEX IF NOT EXISTS idx_saved_queries_pinned ON public.saved_analytics_queries(is_pinned) WHERE is_pinned = true;

-- Enable RLS
ALTER TABLE public.saved_analytics_queries ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage their own saved queries
CREATE POLICY "Admins can view their own saved queries"
ON public.saved_analytics_queries
FOR SELECT
TO authenticated
USING (admin_user_id = auth.uid());

CREATE POLICY "Admins can insert their own saved queries"
ON public.saved_analytics_queries
FOR INSERT
TO authenticated
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Admins can update their own saved queries"
ON public.saved_analytics_queries
FOR UPDATE
TO authenticated
USING (admin_user_id = auth.uid())
WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Admins can delete their own saved queries"
ON public.saved_analytics_queries
FOR DELETE
TO authenticated
USING (admin_user_id = auth.uid());

-- RPC: Get saved queries for current admin
CREATE OR REPLACE FUNCTION get_my_saved_queries()
RETURNS TABLE (
    id UUID,
    query_name TEXT,
    query_template_id TEXT,
    parameters JSONB,
    created_at TIMESTAMPTZ,
    last_executed_at TIMESTAMPTZ,
    execution_count INT,
    is_pinned BOOLEAN,
    category TEXT
) SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sq.id,
        sq.query_name,
        sq.query_template_id,
        sq.parameters,
        sq.created_at,
        sq.last_executed_at,
        sq.execution_count,
        sq.is_pinned,
        sq.category
    FROM public.saved_analytics_queries sq
    WHERE sq.admin_user_id = auth.uid()
    ORDER BY sq.is_pinned DESC, sq.last_executed_at DESC NULLS LAST;
END;
$$;

-- RPC: Update query execution timestamp
CREATE OR REPLACE FUNCTION update_query_execution(p_query_id UUID)
RETURNS VOID SECURITY DEFINER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.saved_analytics_queries
    SET 
        last_executed_at = NOW(),
        execution_count = execution_count + 1
    WHERE id = p_query_id AND admin_user_id = auth.uid();
END;
$$;

-- RPC: Toggle query pin status
CREATE OR REPLACE FUNCTION toggle_query_pin(p_query_id UUID)
RETURNS BOOLEAN SECURITY DEFINER LANGUAGE plpgsql AS $$
DECLARE
    new_pin_status BOOLEAN;
BEGIN
    UPDATE public.saved_analytics_queries
    SET is_pinned = NOT is_pinned
    WHERE id = p_query_id AND admin_user_id = auth.uid()
    RETURNING is_pinned INTO new_pin_status;
    
    RETURN new_pin_status;
END;
$$;
