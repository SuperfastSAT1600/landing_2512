-- 2026-09 학년도 롤오버 일괄 승급 (762행 변경 예정)
-- 생성: scripts/grade-rollup-2026.ts (로컬, scripts/ 는 gitignore)  |  로직 원본: src/lib/grade-rollup.ts (테스트 44케이스)
-- 롤백: UPDATE students s SET grade = b.grade_before
--       FROM students_grade_backup_202609 b WHERE s.id = b.id AND s.grade = b.grade_after;

BEGIN;

CREATE TABLE IF NOT EXISTS students_grade_backup_202609 (
  id            uuid PRIMARY KEY,
  grade_before  text NOT NULL,
  grade_after   text NOT NULL,
  bump          int  NOT NULL,
  inquiry_date  timestamp,
  school_type   text,
  backed_up_at  timestamptz NOT NULL DEFAULT now()
);

WITH bumped AS (
  -- 학년 경계: 한국 학제는 3월, IB/AP/국제학교는 8월. 2026-08-01 이후 인입은 대상이 아니다.
  SELECT s.id, s.grade AS grade_before, s.inquiry_date, s.school_type,
    CASE
      WHEN s.inquiry_date >= TIMESTAMP '2026-08-01' THEN 0
      WHEN s.school_type = '한국 학제' THEN
        CASE WHEN s.inquiry_date >= TIMESTAMP '2026-03-01' THEN 0
             WHEN s.inquiry_date >= TIMESTAMP '2025-03-01' THEN 1
             WHEN s.inquiry_date >= TIMESTAMP '2024-03-01' THEN 2
             ELSE 3 END
      ELSE
        CASE WHEN s.inquiry_date >= TIMESTAMP '2025-08-01' THEN 1
             WHEN s.inquiry_date >= TIMESTAMP '2024-08-01' THEN 2
             ELSE 3 END
    END AS bump
  FROM students s
  WHERE s.inquiry_date IS NOT NULL
),
mapping (grade_before, bump, grade_after) AS (
  -- 표기 형식을 보존한다. 여기 없는 (학년, 승급폭) 조합은 조인되지 않아 변경되지 않는다.
  VALUES
    ('[1] US11', 1, 'US12'),
    ('[1] US12', 1, '졸업'),
    ('10th', 1, '11th'),
    ('11th', 1, '12th'),
    ('12th', 1, '졸업'),
    ('5th', 1, '6th'),
    ('6th', 1, '7th'),
    ('7th', 1, '8th'),
    ('8th', 1, '9th'),
    ('9th', 1, '10th'),
    ('US08', 1, 'US09'),
    ('US12', 1, '졸업'),
    ('Y10', 1, 'Y11'),
    ('Y11', 1, 'Y12'),
    ('Y8', 1, 'Y9'),
    ('[1] US10', 2, 'US12'),
    ('10th', 2, '12th'),
    ('11th', 2, '졸업'),
    ('12th', 2, '졸업'),
    ('7th', 2, '9th'),
    ('9th', 2, '11th')
)
INSERT INTO students_grade_backup_202609 (id, grade_before, grade_after, bump, inquiry_date, school_type)
SELECT b.id, b.grade_before, m.grade_after, b.bump, b.inquiry_date, b.school_type
FROM   bumped b
JOIN   mapping m ON m.grade_before = b.grade_before AND m.bump = b.bump
ON CONFLICT (id) DO NOTHING;

-- grade_before가 지금도 그대로인 행만 바꾼다. 그 사이 매니저가 손댄 행은 건드리지 않는다.
UPDATE students s
SET    grade = b.grade_after
FROM   students_grade_backup_202609 b
WHERE  s.id = b.id
  AND  s.grade = b.grade_before;

COMMIT;

-- 실행 후 확인
SELECT bump, count(*) FROM students_grade_backup_202609 GROUP BY bump ORDER BY bump;
SELECT count(*) AS 불일치 FROM students_grade_backup_202609 b JOIN students s ON s.id = b.id
WHERE  s.grade <> b.grade_after;
