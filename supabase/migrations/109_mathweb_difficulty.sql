-- mathweb: difficulty 컬럼 추가 + v2 임포트 백필

ALTER TABLE public.math_problems
  ADD COLUMN IF NOT EXISTS difficulty TEXT
    CHECK (difficulty IN ('easy', 'medium', 'hard', 'killer'));

-- v2 임포트 시 memo에 저장된 difficulty 값을 새 컬럼으로 이전
UPDATE public.math_problems
  SET difficulty = memo
  WHERE v2_unit_id IS NOT NULL
    AND memo IN ('easy', 'medium', 'hard', 'killer');

UPDATE public.math_problems
  SET memo = NULL
  WHERE v2_unit_id IS NOT NULL
    AND memo IN ('easy', 'medium', 'hard', 'killer');

-- Rollback:
-- ALTER TABLE public.math_problems DROP COLUMN IF EXISTS difficulty;
