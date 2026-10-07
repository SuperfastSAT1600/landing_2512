CREATE TABLE IF NOT EXISTS practice_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id text NOT NULL,
  instagram_id text NOT NULL,
  current_index integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, instagram_id)
);
