-- Fix INSERT RLS on users table so both the auth trigger AND the backend
-- service_role can insert/upsert without "violates row-level security" errors.
-- Run ONCE in Supabase SQL editor.

-- 1. Drop ALL existing INSERT policies to start clean
DROP POLICY IF EXISTS "auth_trigger_can_insert"                    ON users;
DROP POLICY IF EXISTS "Users can insert their own profile."        ON users;
DROP POLICY IF EXISTS "Enable insert for users based on user_id"   ON users;
DROP POLICY IF EXISTS "Allow individual insert access"             ON users;
DROP POLICY IF EXISTS "users_insert_own"                           ON users;
DROP POLICY IF EXISTS "allow_dueno_insert_users"                   ON users;
DROP POLICY IF EXISTS "service_role_full_access"                   ON users;

-- 2. Allow supabase_auth_admin (the role that fires when auth.admin.createUser()
--    triggers an on_auth_user_created hook) to insert any row.
CREATE POLICY "auth_trigger_can_insert"
  ON users
  FOR INSERT
  TO supabase_auth_admin
  WITH CHECK (true);

-- 3. Allow service_role (what the backend uses with SUPABASE_KEY = service role key)
--    to bypass RLS entirely for INSERT/UPDATE/SELECT/DELETE.
--    Even though service_role normally bypasses RLS via PostgREST config,
--    this explicit policy removes any ambiguity.
CREATE POLICY "service_role_full_access"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Allow an authenticated dueno to insert users that belong to their own company.
--    This covers the case where the backend somehow runs as authenticated instead of service_role.
CREATE POLICY "dueno_can_insert_users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_my_company_id());
