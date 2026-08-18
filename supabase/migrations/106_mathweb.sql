-- Math Web: concept-connected problem graph
-- REQ-002: scope column on vocab_access_codes
-- REQ-003: math_problems table
-- REQ-004: math_concepts + math_problem_concepts tables

-- 1. Extend vocab_access_codes with scope
ALTER TABLE public.vocab_access_codes
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'vocab'
    CHECK (scope IN ('vocab','mathweb','both'));

CREATE INDEX IF NOT EXISTS idx_vocab_access_codes_scope
  ON public.vocab_access_codes(scope);

-- 2. math_problems
CREATE TABLE IF NOT EXISTS public.math_problems (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT,
  question_image_url  TEXT NOT NULL,
  answer_image_url    TEXT,
  memo                TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_math_problems_created_at
  ON public.math_problems(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_math_problems_active
  ON public.math_problems(is_active)
  WHERE is_active = true;

-- 3. math_concepts master table
CREATE TABLE IF NOT EXISTS public.math_concepts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  domain      TEXT,
  skill       TEXT,
  usage_count INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_math_concepts_slug_prefix
  ON public.math_concepts(slug text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_math_concepts_usage
  ON public.math_concepts(usage_count DESC);

-- 4. math_problem_concepts M:N join table
CREATE TABLE IF NOT EXISTS public.math_problem_concepts (
  problem_id  UUID NOT NULL REFERENCES public.math_problems(id) ON DELETE CASCADE,
  concept_id  UUID NOT NULL REFERENCES public.math_concepts(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (problem_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_mpc_concept
  ON public.math_problem_concepts(concept_id);

-- 5. usage_count trigger (REQ-017 autocomplete sort)
CREATE OR REPLACE FUNCTION public.bump_math_concept_usage()
RETURNS TRIGGER LANGUAGE plpgsql AS $trg$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.math_concepts
    SET usage_count = usage_count + 1
    WHERE id = NEW.concept_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.math_concepts
    SET usage_count = GREATEST(usage_count - 1, 0)
    WHERE id = OLD.concept_id;
  END IF;
  RETURN NULL;
END;
$trg$;

DROP TRIGGER IF EXISTS trg_math_concept_usage ON public.math_problem_concepts;
CREATE TRIGGER trg_math_concept_usage
  AFTER INSERT OR DELETE ON public.math_problem_concepts
  FOR EACH ROW EXECUTE FUNCTION public.bump_math_concept_usage();

-- 6. Admin audit log (REQ-016)
CREATE TABLE IF NOT EXISTS public.mathweb_admin_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action     TEXT NOT NULL,
  problem_id UUID,
  payload    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rollback:
-- DROP TABLE IF EXISTS public.mathweb_admin_logs;
-- DROP TRIGGER IF EXISTS trg_math_concept_usage ON public.math_problem_concepts;
-- DROP FUNCTION IF EXISTS public.bump_math_concept_usage;
-- DROP TABLE IF EXISTS public.math_problem_concepts;
-- DROP TABLE IF EXISTS public.math_concepts;
-- DROP TABLE IF EXISTS public.math_problems;
-- ALTER TABLE public.vocab_access_codes DROP COLUMN IF EXISTS scope;
