// USER PANEL - Supabase Client
// This is the Supabase client for this user panel project (for auth only)

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info.tsx';

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseKey = publicAnonKey;

export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseKey);
};

// Export singleton instance
export const supabase = createClient();
