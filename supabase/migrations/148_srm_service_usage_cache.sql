CREATE TABLE IF NOT EXISTS srm_service_usage_cache (
  date              DATE        NOT NULL,
  sfv2_profile_id   TEXT        NOT NULL,
  name              TEXT        NOT NULL,
  tutoring_status   TEXT        NOT NULL,
  schedule          JSONB       NOT NULL DEFAULT '{}',
  coach_room        JSONB,
  study_hall        JSONB,
  vocab             JSONB,
  test_center       JSONB,
  cached_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (date, sfv2_profile_id)
);

CREATE INDEX IF NOT EXISTS srm_service_usage_cache_date_idx
  ON srm_service_usage_cache (date);
