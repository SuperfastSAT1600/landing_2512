-- coach_prep_requests: 코치가 첫 수업 + 두 번째 수업 조합을 옵션 1·2로 제안한다.
-- 옵션 1의 첫 수업은 기존 first_lesson_at을 그대로 쓰고, 나머지 세 시각을 추가한다.
-- (157 적용 시점에는 응답 행이 없어 기존 데이터 보정은 필요 없다. second_lesson_at은 앱에서 수락 시 필수로 검증한다.)

ALTER TABLE coach_prep_requests
  ADD COLUMN IF NOT EXISTS second_lesson_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS option2_first_lesson_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS option2_second_lesson_at  TIMESTAMPTZ;

-- 수락이 아닐 때는 어떤 수업 일시도 남기지 않는다
ALTER TABLE coach_prep_requests
  ADD CONSTRAINT coach_prep_second_only_when_accepted
    CHECK (status = 'accepted' OR (second_lesson_at IS NULL AND option2_first_lesson_at IS NULL AND option2_second_lesson_at IS NULL)),
  ADD CONSTRAINT coach_prep_option2_pair
    CHECK ((option2_first_lesson_at IS NULL) = (option2_second_lesson_at IS NULL)),
  ADD CONSTRAINT coach_prep_second_after_first
    CHECK (second_lesson_at IS NULL OR first_lesson_at IS NULL OR second_lesson_at > first_lesson_at),
  ADD CONSTRAINT coach_prep_option2_second_after_first
    CHECK (option2_second_lesson_at IS NULL OR option2_second_lesson_at > option2_first_lesson_at);
