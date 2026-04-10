import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const SUPABASE_URL = 'https://qzupwwmfojmojzyctwmn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6dXB3d21mb2ptb2p6eWN0d21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjY4ODUsImV4cCI6MjA4ODk0Mjg4NX0.yjuNF6DZJTnd992d2UrIY1B3aGYKUFKR4JlIvVGh5EU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});