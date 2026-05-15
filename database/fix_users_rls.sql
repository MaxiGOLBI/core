-- Fix RLS policies on users table so the Supabase auth trigger
-- (runs as supabase_auth_admin) and backend (service_role) can insert/upsert.
-- Run ONCE in Supabase SQL editor.

-- 1. Remove any default restrictive INSERT policies Supabase may have added
DROP POLICY IF EXISTS "Users can insert their own profile."   ON users;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON users;
DROP POLICY IF EXISTS "Allow individual insert access"        ON users;
DROP POLICY IF EXISTS "users_insert_own"                      ON users;

-- 2. Allow the Supabase auth trigger (supabase_auth_admin) to insert new rows
--    This fires when auth.admin.createUser() is called from the backend.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'auth_trigger_can_insert'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "auth_trigger_can_insert"
        ON users
        FOR INSERT
        TO supabase_auth_admin
        WITH CHECK (true);
    $pol$;
  END IF;
END $$;

-- 3. Allow authenticated users to read members of their own company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'users_select_own_company'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "users_select_own_company"
        ON users
        FOR SELECT
        TO authenticated
        USING (company_id = (
          SELECT company_id FROM users WHERE id = auth.uid()
        ));
    $pol$;
  END IF;
END $$;

-- 4. Allow authenticated users (owners) to update users of their company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'users_update_own_company'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "users_update_own_company"
        ON users
        FOR UPDATE
        TO authenticated
        USING      (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
        WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
    $pol$;
  END IF;
END $$;

-- 5. Allow authenticated users (owners) to delete users of their company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'users_delete_own_company'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "users_delete_own_company"
        ON users
        FOR DELETE
        TO authenticated
        USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
    $pol$;
  END IF;
END $$;
