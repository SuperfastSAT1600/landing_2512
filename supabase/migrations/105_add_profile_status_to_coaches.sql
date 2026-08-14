-- 코치가 온보딩 폼을 사용하지 않은 경우 수동으로 프로필 단계를 지정하기 위한 컬럼
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS profile_status TEXT
    CHECK (profile_status IN ('none', 'in_progress', 'submitted', 'expired'))
    DEFAULT 'none';
