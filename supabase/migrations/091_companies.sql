-- 076_companies.sql
-- B2B 업체(파트너) 1급 엔티티 도입 + students.company_id FK + b2b_partner 백필.
-- 매출은 payments.student_id → students.company_id 로 귀속(payments엔 company_id 추가하지 않음).
-- 사용자가 Supabase에서 직접 실행한다.

CREATE TABLE IF NOT EXISTS companies (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL UNIQUE,   -- 업체명
  contact_person text,                    -- 담당자
  contact_phone  text,
  contact_email  text,
  contract_terms text,                    -- 계약조건(수수료율/정산주기 등 자유서술)
  notes          text,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 기존 하드코딩 12개 파트너 시드 (B2B_PARTNER_OPTIONS 와 정확히 일치, 공백 포함)
INSERT INTO companies (name) VALUES
  ('해연'),
  ('커넥티드에듀'),
  ('부산프레스티지'),
  ('인사이트 컨설팅'),
  ('신화 유학원'),
  ('미소남'),
  ('InArt'),
  ('박정 어학원'),
  ('솔로몬에듀'),
  ('Admission AG'),
  ('공부하는 아이들'),
  ('옹글리쉬')
ON CONFLICT (name) DO NOTHING;

-- students → companies FK (nullable). 삭제 시 리드는 유지하고 연결만 해제.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_students_company_id ON students(company_id);

-- b2b_partner 문자열 정확 매칭으로 백필 (전환기 동안 b2b_partner TEXT는 듀얼 라이트로 유지)
UPDATE students s
SET company_id = c.id
FROM companies c
WHERE s.company_id IS NULL AND s.b2b_partner = c.name;

-- partner_portals 정규화 (선택, 분석에 필수는 아님)
ALTER TABLE partner_portals
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;

-- 정합 검증(수동 실행용, 참고):
--   SELECT count(*) FROM companies;                                    -- 기대 >= 12
--   SELECT b2b_partner, count(*) FROM students
--     WHERE b2b_partner IS NOT NULL AND company_id IS NULL GROUP BY 1;  -- 기대 0행(고아)
--   SELECT count(*) FILTER (WHERE company_id IS NOT NULL) AS linked,
--          count(*) FILTER (WHERE b2b_partner IS NOT NULL) AS tagged FROM students; -- linked == tagged
