-- Partner portals: B2B 파트너가 학생 학습 현황을 열람하는 포털
CREATE TABLE IF NOT EXISTS partner_portals (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token                 text        UNIQUE NOT NULL,
  name                  text        NOT NULL,           -- 파트너 표시명 (예: "A학원")
  passcode_hash         text,                           -- bcrypt hash of 6-digit PIN
  passcode_attempts     integer     NOT NULL DEFAULT 0,
  passcode_locked_until timestamptz,
  student_names         text[]      NOT NULL DEFAULT '{}', -- 열람 허용 학생 이름 목록
  created_at            timestamptz NOT NULL DEFAULT now()
);
