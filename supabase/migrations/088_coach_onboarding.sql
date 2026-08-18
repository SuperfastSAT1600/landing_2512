-- Coach onboarding: invite tokens + form submissions

CREATE TABLE IF NOT EXISTS coach_onboarding_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  coach_name text NOT NULL,
  coach_email text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coach_onboarding_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid REFERENCES coach_onboarding_invites(id),
  -- Step 1
  name text NOT NULL,
  high_school text NOT NULL,
  university text NOT NULL,
  undergrad_major text NOT NULL,
  university_entry_year integer NOT NULL,
  enrollment_status text NOT NULL CHECK (enrollment_status IN ('graduated','enrolled_3plus','enrolled_under3')),
  grad_school text,
  grad_major text,
  sat_rw_score integer CHECK (sat_rw_score BETWEEN 200 AND 800),
  sat_math_score integer CHECK (sat_math_score BETWEEN 200 AND 800),
  -- Step 2
  teaching_years integer NOT NULL,
  teaching_hours_total integer NOT NULL,
  students_taught integer NOT NULL,
  past_academies jsonb,
  appeal_points text NOT NULL,
  subjects text[] NOT NULL,
  subjects_other text,
  language_preference text NOT NULL CHECK (language_preference IN ('english','korean','any')),
  -- Step 3
  teaching_philosophy text NOT NULL,
  subject_directions jsonb,
  score_improvement_screenshot_urls text[],
  -- Computed
  completeness_score integer,
  head_coach_criteria jsonb,
  head_coach_criteria_met integer DEFAULT 0,
  is_head_coach_eligible boolean DEFAULT false,
  -- Admin
  status text DEFAULT 'submitted' CHECK (status IN ('submitted','reviewed','approved','rejected')),
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_onboarding_invites_token ON coach_onboarding_invites(token);
CREATE INDEX IF NOT EXISTS idx_coach_onboarding_submissions_invite_id ON coach_onboarding_submissions(invite_id);
CREATE INDEX IF NOT EXISTS idx_coach_onboarding_submissions_status ON coach_onboarding_submissions(status);
