-- 학생이 실제로 치른 SAT 회차별 성적.
-- students.previous_rw_score/previous_math_score 는 단일 값이라 회차가 쌓이면 이전 값이 덮인다.
-- 회차는 학생당 여러 건이므로 payments 처럼 전용 테이블로 둔다.
CREATE TABLE IF NOT EXISTS student_exam_scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  -- 'YYYY-MM'. <input type="month"> 값과 그대로 맞고, 사전순 정렬이 곧 시간순이다.
  exam_month  TEXT NOT NULL CHECK (exam_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  -- SAT 섹션 점수는 200~800의 10점 단위. 모르는 섹션은 NULL 로 둔다.
  rw_score    INTEGER CHECK (rw_score   IS NULL OR (rw_score   BETWEEN 200 AND 800 AND rw_score   % 10 = 0)),
  math_score  INTEGER CHECK (math_score IS NULL OR (math_score BETWEEN 200 AND 800 AND math_score % 10 = 0)),
  -- 총점은 저장하지 않는다(합계 불일치를 만들지 않기 위해). 조회 측에서 합산한다.
  note        TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 한 학생이 같은 달에 SAT 를 두 번 보지는 않는다. 중복 입력 방지.
  CONSTRAINT student_exam_scores_month_unique UNIQUE (student_id, exam_month),
  -- 둘 다 비어 있으면 기록할 내용이 없다.
  CONSTRAINT student_exam_scores_any_score CHECK (rw_score IS NOT NULL OR math_score IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS student_exam_scores_student_idx
  ON student_exam_scores (student_id, exam_month DESC);

COMMENT ON TABLE student_exam_scores IS
  '학생이 실제 응시한 SAT 회차별 성적. 목표(target_score)·직전 점수(previous_*)와 별개의 실적 기록.';

ALTER TABLE student_exam_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON student_exam_scores;

CREATE POLICY "service_role_all" ON student_exam_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);
