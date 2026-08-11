-- mathweb: v2 텍스트 기반 문제 지원
-- question_image_url nullable 변경, HTML/JSON 컬럼 추가

ALTER TABLE public.math_problems
  ALTER COLUMN question_image_url DROP NOT NULL;

ALTER TABLE public.math_problems
  ADD COLUMN IF NOT EXISTS question_html   TEXT,
  ADD COLUMN IF NOT EXISTS options_json    JSONB,
  ADD COLUMN IF NOT EXISTS v2_unit_id      TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_math_problems_v2_unit_id
  ON public.math_problems(v2_unit_id)
  WHERE v2_unit_id IS NOT NULL;

-- Rollback:
-- ALTER TABLE public.math_problems ALTER COLUMN question_image_url SET NOT NULL;
-- ALTER TABLE public.math_problems DROP COLUMN IF EXISTS question_html;
-- ALTER TABLE public.math_problems DROP COLUMN IF EXISTS options_json;
-- ALTER TABLE public.math_problems DROP COLUMN IF EXISTS v2_unit_id;
