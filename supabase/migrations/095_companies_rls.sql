-- Add RLS policies to companies table (missing from 091_companies.sql)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON companies
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_deny" ON companies
  FOR ALL TO anon
  USING (false);
