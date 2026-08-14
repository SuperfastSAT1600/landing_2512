-- Migration 107: 윈백 플레이 — 이탈 리드에게 특정 상품(AP/SAT 수업권)을 파는 캠페인 단위 실행/측정 로그.
-- 선례: 067_growth_experiments(실험 로그), 039_retry_strategies(전략 마스터).
--
-- 분석 정본은 winback_targets다. students.reactivation_log / consultation_timeline 에는
-- 사람이 읽는 미러 엔트리만 남긴다(기존 재활성화 탭·활동 피드 UI를 그대로 재사용하기 위함).
-- students JSONB 확장을 택하지 않은 이유: 플레이×전략변형 집계에 1,249행 JSONB를 펼쳐야 하고,
-- read-modify-write라 동시 편집 시 lost update가 나며, 메시지 초안 텍스트로 students 행이 비대해진다.

CREATE TABLE winback_plays (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                  TEXT NOT NULL,                  -- "5월 AP Calc BC 윈백"
  product_brief          TEXT NOT NULL,                  -- 자유 입력. 임베딩 쿼리 + 프롬프트 소스
  product_category       TEXT,                           -- payments.product_category와 동일 문자열(전환 귀속 필터)
  product_price          NUMERIC,
  product_hours          INTEGER,
  target_exam_date       DATE,                           -- 시험 대비 소구(예: 2027-05-01)
  audience_hint          TEXT,                           -- "8~11학년, AP 문의 이력"
  rule_filters           JSONB NOT NULL DEFAULT '{}'::jsonb,  -- 추천 사전필터 스냅샷
  score_weights          JSONB,                          -- NULL이면 lib 기본 가중치
  conversion_window_days INTEGER NOT NULL DEFAULT 45,    -- 발송 후 N일 내 결제 = 전환
  contact_cooldown_days  INTEGER NOT NULL DEFAULT 30,    -- 타 플레이 발송 후 N일 내면 후보 제외
  status                 TEXT NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft', 'running', 'done', 'archived')),
  retrospective          TEXT,
  created_by             TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 전략 변형(A/B) — 같은 플레이 안에서 접근법별 반응을 비교하기 위한 단위.
CREATE TABLE winback_play_variants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  play_id    UUID NOT NULL REFERENCES winback_plays(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,        -- "가격 민감형: 할인 프레이밍"
  angle      TEXT,                 -- 메시지 생성 프롬프트에 주입되는 전략 설명
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (play_id, name)
);

CREATE TABLE winback_targets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  play_id    UUID NOT NULL REFERENCES winback_plays(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES winback_play_variants(id) ON DELETE SET NULL,

  -- 추천 근거 스냅샷: 추천 당시 값이며 이후 학생 데이터가 바뀌어도 불변
  rank       INTEGER,
  score      NUMERIC,              -- 0~100 최종 점수
  rule_score NUMERIC,              -- LLM 반영 전 규칙 점수(사후 검증용)
  similarity NUMERIC,              -- 임베딩 코사인 유사도(없으면 NULL)
  llm_fit    SMALLINT,             -- LLM 적합도 1~5
  reason     TEXT,                 -- 관리자에게 보여줄 근거 한 문장
  signals    JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{key,label,delta}] 규칙 매치 내역

  status     TEXT NOT NULL DEFAULT 'candidate'
               CHECK (status IN ('candidate', 'queued', 'sent', 'skipped')),

  -- 메시지 초안 (2차: 생성 API)
  message_draft        TEXT,
  message_generated_at TIMESTAMPTZ,
  message_model        TEXT,

  -- ① 발송 (담당자가 카톡으로 수동 발송한 뒤 기록)
  sent_at      TIMESTAMPTZ,
  sent_by      TEXT,
  sent_channel TEXT NOT NULL DEFAULT 'kakao',

  -- ② 반응 (수동 마킹 — 카톡 답장을 시스템이 볼 수 없음)
  response     TEXT CHECK (response IN ('none', 'positive', 'negative', 'later')),
  responded_at TIMESTAMPTZ,

  -- ③ 상담·콜 재연결 (감지 후 원클릭 확정)
  reconnected_at TIMESTAMPTZ,

  -- ④ 결제 전환 (payments 자동 귀속 + 수동 override)
  converted_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  converted_at         TIMESTAMPTZ,
  conversion_amount    NUMERIC,
  conversion_source    TEXT CHECK (conversion_source IN ('auto', 'manual')),

  reactivation_entry_id UUID,      -- students.reactivation_log 미러 엔트리 id
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (play_id, student_id)
);

CREATE INDEX idx_winback_targets_play_status ON winback_targets(play_id, status);
CREATE INDEX idx_winback_targets_variant     ON winback_targets(variant_id);
CREATE INDEX idx_winback_targets_student     ON winback_targets(student_id);
-- 쿨다운 사전필터: "최근 N일 내 어떤 플레이로든 발송된 학생 제외"
CREATE INDEX idx_winback_targets_student_sent
  ON winback_targets(student_id, sent_at DESC) WHERE sent_at IS NOT NULL;
CREATE INDEX idx_winback_plays_status_created ON winback_plays(status, created_at DESC);

-- RLS (067 관례: 서버는 service_role로만 접근, 클라이언트 직접 접근 차단)
ALTER TABLE winback_plays         ENABLE ROW LEVEL SECURITY;
ALTER TABLE winback_play_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE winback_targets       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON winback_plays
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_deny" ON winback_plays
  FOR ALL TO anon USING (false);

CREATE POLICY "service_role_all" ON winback_play_variants
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_deny" ON winback_play_variants
  FOR ALL TO anon USING (false);

CREATE POLICY "service_role_all" ON winback_targets
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_deny" ON winback_targets
  FOR ALL TO anon USING (false);
