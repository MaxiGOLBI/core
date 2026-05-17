const { createClient } = require('@supabase/supabase-js');

// Server-side client with service_role key.
// persistSession: false prevents any auth.signIn* call from overwriting the
// Authorization header that carries the service_role key, which would cause
// RLS to kick in and block DB operations.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

module.exports = supabase;
