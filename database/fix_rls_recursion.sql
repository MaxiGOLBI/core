-- Fix recursive RLS on users table.
-- The previous policies used (SELECT company_id FROM users WHERE id = auth.uid())
-- inside a policy ON users — this causes infinite recursion and Postgres kills the query.
-- Solution: a SECURITY DEFINER function that runs as the table owner (bypasses RLS).
-- Run ONCE in Supabase SQL editor.

-- 1. Helper function — runs as superuser, no RLS applied
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated;

-- 2. Replace the recursive SELECT policy
DROP POLICY IF EXISTS "users_select_own_company" ON users;
CREATE POLICY "users_select_own_company"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()                         -- always can see own row
    OR company_id = get_my_company_id()     -- can see company peers
  );

-- 3. Replace the recursive UPDATE policy
DROP POLICY IF EXISTS "users_update_own_company" ON users;
CREATE POLICY "users_update_own_company"
  ON users
  FOR UPDATE
  TO authenticated
  USING      (company_id = get_my_company_id())
  WITH CHECK (company_id = get_my_company_id());

-- 4. Replace the recursive DELETE policy
DROP POLICY IF EXISTS "users_delete_own_company" ON users;
CREATE POLICY "users_delete_own_company"
  ON users
  FOR DELETE
  TO authenticated
  USING (company_id = get_my_company_id());
