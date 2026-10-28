-- RLS Policies for YojnaMitra Admin Dashboard
-- This file contains Row Level Security policies to protect admin operations

-- Enable RLS on schemes table
ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;

-- Policy: Public users can only read active schemes
CREATE POLICY "Public users can read active schemes"
ON schemes
FOR SELECT
TO public
USING (is_active = true);

-- Policy: Admins can read all schemes
CREATE POLICY "Admins can read all schemes"
ON schemes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM app_admins
    WHERE app_admins.user_id = auth.uid()
  )
);

-- Policy: Admins can insert schemes
CREATE POLICY "Admins can insert schemes"
ON schemes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_admins
    WHERE app_admins.user_id = auth.uid()
  )
);

-- Policy: Admins can update schemes
CREATE POLICY "Admins can update schemes"
ON schemes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM app_admins
    WHERE app_admins.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_admins
    WHERE app_admins.user_id = auth.uid()
  )
);

-- Policy: Admins can delete schemes
CREATE POLICY "Admins can delete schemes"
ON schemes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM app_admins
    WHERE app_admins.user_id = auth.uid()
  )
);

-- Enable RLS on app_admins table
ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can read app_admins (for checking admin status)
CREATE POLICY "Authenticated users can read app_admins"
ON app_admins
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only service role can insert admins (superadmin only)
CREATE POLICY "Service role can insert admins"
ON app_admins
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Only service role can delete admins (superadmin only)
CREATE POLICY "Service role can delete admins"
ON app_admins
FOR DELETE
TO service_role
USING (true);

-- Policy: No updates allowed to app_admins
CREATE POLICY "No updates to app_admins"
ON app_admins
FOR UPDATE
TO authenticated
USING (false);

-- Note: To add a new admin, you must use the service role key or Supabase dashboard
-- Example SQL to add an admin (run in Supabase SQL editor with service role):
-- INSERT INTO app_admins (user_id) VALUES ('user-uuid-here');
