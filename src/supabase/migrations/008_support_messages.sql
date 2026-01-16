-- ====================================================================
-- SUPPORT MESSAGES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users_app(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_support_messages_user_id ON support_messages(user_id);
CREATE INDEX idx_support_messages_status ON support_messages(status);
CREATE INDEX idx_support_messages_created_at ON support_messages(created_at DESC);

-- Enable RLS
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Note: No public policies needed as this is handled via service role in edge functions.
-- Admin can view all messages via service role.
