CREATE TABLE IF NOT EXISTS test_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  test_id text NOT NULL,
  label text NOT NULL DEFAULT '',
  max_uses integer NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS test_code_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES test_codes(id) ON DELETE CASCADE,
  instagram_id text NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code_id, instagram_id)
);

ALTER TABLE test_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_code_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_codes" ON test_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_regs" ON test_code_registrations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
