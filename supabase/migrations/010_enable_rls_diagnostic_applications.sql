-- Migration 010: Enable RLS on diagnostic_applications table
-- Fixes: Supabase security alert — rls_disabled_in_public

ALTER TABLE diagnostic_applications ENABLE ROW LEVEL SECURITY;

-- Only service role (server-side API) can read/write
-- Public (anon) has no access
CREATE POLICY "service_role_only" ON diagnostic_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
