# Test Center 시험 결과 리포트 — 핸드오프 문서

> 이 문서 **하나만으로** 다른 로컬/다른 스택에서 Test Center(모의고사) 결과 리포트 기능을 재현하거나 다른 페이지에 붙일 수 있도록 작성되었습니다. 백엔드는 **동일한 Supabase 프로젝트**를 그대로 사용합니다(데이터 이전 없음).
>
> 구성: §1~§11 = 스펙/가이드, **부록 A~E = 실제 동작 전체 코드**(그대로 복사해 사용 가능).

---

## 0. TL;DR (데이터 흐름)

```
Supabase (test_center_lesson_attempts / test_center_unit_attempts 등)
   │  ① 분석 스크립트 (부록 A: test2-result-analysis.ts)  — curriculumId 단위
   ▼
<name>.md  +  _coach-input/<name>.json  +  _summary.tsv  +  _cohort.md
   │  ② 코치 코멘트 LLM fan-out (부록 C 프롬프트)  → md의 <!-- COACH_COMMENT --> 치환
   ▼
③ HTML 생성 (부록 B: build-score-reports.mjs)  → score-reports/<name>.html (+ index)
```

- **단위**: 학생 1명 × 한 시험(curriculum). 풀랭스 = RW M1·M2(각 27) + Math M1·M2(각 22) = 98문항.
- **비교 기준**: **코호트**(같은 시험 응시자 평균). ※ Study Hall 리포트와 다른 점(거긴 코호트 없음).
- **다른 페이지에 붙일 때**: ①의 데이터 추출 로직으로 **JSON 데이터 계약**(§5)을 만들고 자기 UI로 렌더. ③ HTML 생성기는 정적 산출/디자인 참고용(§7, §9).

---

## 1. 목적 & 산출물

학생이 한 모의고사에서 받은 결과를 **진단 + 학습 습관** 리포트로 만든다. 핵심 지표:

- **환산점수**(1600/800) + 코호트 평균 대비
- 모듈별(RW M1/M2, Math M1/M2) 점수·정답률·상태(시간초과)·소요시간
- **도메인/스킬별** 정답률 + **코호트 비교**
- **풀이 시간 분석**(부주의/개념형), 추측 패턴
- **취약 스킬**(코호트 대비 격차)
- Eden 튜터 대화 발췌
- **코치 코멘트**(진단 + 습관, *향후 계획은 금지*)

검증 기준 샘플: `[2026 June] Full-Length Test #2` 코호트 n=35. 골드 스탠다드 = `김채윤.md`(최종 코멘트 섹션). 또 다른 검증 예: `유시아`(Math 미응시 — 15초 제출 → RW 한정 분석으로 처리됨).

---

## 2. 사전 준비 (환경)

- **런타임**: Node 18+ (분석은 `npx tsx`, HTML 생성기는 순수 Node ESM).
- **deps**: `@supabase/supabase-js`, `dotenv` (분석). HTML 생성기·서빙은 추가 deps 없음(`npx serve`).
- **환경변수** (분석 스크립트가 `.env.local`에서 로드):

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=<같은 Supabase 프로젝트 URL>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

> 🔑 **키 획득**: 기존 앱 리포지토리 `app/.env.local`에서 복사하거나 Supabase 대시보드 → Project Settings → API → `service_role` secret.
> ⚠️ `service_role`은 **RLS 우회** — 서버/스크립트 전용, 클라이언트 노출 금지. 페이지 통합 시 조회는 서버에서.

---

## 3. 데이터 소스 (라이브 Supabase 스키마)

> ⚠️ **마이그레이션 드리프트 주의**: `supabase/migrations`엔 통합 `unit_attempts`만 있고 **라이브엔 없음**. 라이브는 아래 `test_center_*` 테이블을 사용. 이것을 기준으로 작성하세요.

```text
test_center_lesson_attempts          -- 모듈 단위 점수 (ground truth)
  id, student_id, curriculum_id, lesson_id, status ('submitted'|'expired'|'active'),
  score, total, started_at, deadline_at, submitted_at, expired_at, chapter_attempt_id
  -- 완료 판정: status ∈ {submitted, expired}

test_center_unit_attempts            -- 문항 단위
  id, test_lesson_attempt_id, student_id, unit_id, original_unit_id, selected_answer,
  is_correct, time_spent_seconds, eliminated_options, attempted_at
  -- (chat_messages가 있는 라이브도 있음 → Eden 대화. 없으면 생략)

units                                -- 문제 분류 (variant 포함)
  id, section ('reading_and_writing'|'math'), domain (snake key), skill (label),
  difficulty, correct_answer, options, question, passage, explanation
  -- variant 사본은 difficulty/correct_answer/options/question 등이 null → original_unit_id로 폴백

curricula(id, title)    profiles(id, full_name, email)
```

**시험 구조**: 1 curriculum = 2 chapter(RW/Math) × 각 2 lesson(=모듈). 모듈 식별 = chapter가 Math인지 + `order_index`(M1/M2).
**중요**: Test Center에 시험을 publish하면 **새 curriculum 사본(별도 id)** 이 생성되고 응시 데이터는 사본에 쌓임. 응시 0건처럼 보이면 잘못된(미배포) 사본을 보는 것 → `test_center_lesson_attempts`의 distinct `curriculum_id`를 먼저 확인.

도메인 snake key → 라벨 매핑은 **부록 D `sat-taxonomy.ts`** 가 정본(Study Hall과 동일 매핑). `units.skill`은 이미 라벨로 저장됨.

---

## 4. 계산 로직 / 데이터 계약 (주요 상수)

부록 A 코드와 일치(발췌):

```text
COMPLETED = {submitted, expired}     # 완료 모듈
MIN_N_FOR_FLAG = 3                    # 스킬/도메인 취약 플래그 최소 문항수
CARELESS_SECONDS = 30                # 오답 <30s → 부주의(careless)
OVER_INVESTED_SECONDS = 120          # 오답 ≥120s → 개념형(conceptual)
# 추측 패턴 탐지
RUSH_SECONDS = 15                    # 이보다 빠른 답 = 찍기 의심
END_WINDOW_K = 6 / END_RUSH_MIN = 4  # 모듈 끝 6문항 중 4개 급속 → 막판 찍기
RUN_RAPID_K = 3                      # 연속 3개 급속 = 급속 찍기런
SAME_LETTER_K = 4                    # 연속 동일 보기 4개 = 같은 글자 스트릭
GUESS_MIN_WRONG = 2                  # 패턴이 오답 ≥2 유발해야 '찍기'로 인정
WEAK_SKILL_TOP_N = 5  /  MASTERY_TARGET = 0.85
```

규칙 요약:
- **모듈 점수**: `test_center_lesson_attempts.score/total`이 ground truth. 모듈 식별·M1/M2 순서는 chapter/order로.
- **도메인/스킬 정답률**: `test_center_unit_attempts ⨝ units`(variant면 original_unit_id 폴백) 집계.
- **코호트 평균**: 같은 curriculum 응시자 전체의 도메인/스킬/점수 평균(테스트 계정·미응시 제외). `cohortPct`, `deltaPp`로 비교.
- **풀이 시간 분류**(오답): <30s=부주의 / ≥120s=개념형 / 그 외=일반.
- **추측 패턴**: 위 상수로 막판 급속·연속급속·동일글자 탐지하되 **오답을 ≥2개 유발한 경우만** 약점으로. 시간초과인데 찍기 없음 = **강점**으로 프레이밍(코칭 정책).
- **취약 스킬**: n≥3, 코호트 대비 격차 큰 순 상위 5.
- **환산점수(1600)**: 원점수→스케일 변환 곡선은 코드에 없음. (a) 시험 폴더의 `_scaled-scores.json`(이름→{total,rw,math})을 우선 사용, (b) 없으면 HTML 생성기(부록 B)의 내장 anchors(`RW_ANCHORS`/`MATH_ANCHORS`, 10점 단위 반올림)로 근사.
- **미응시 모듈**: 소요시간 <10분인 과목은 미응시로 간주, 해당 과목 점수/분석 제외(부록 B `computeScores`).
- **Supabase `.in()` 청크**는 적당히 작게(수백 UUID 시 URL 한도 주의).

---

## 5. 출력 JSON 스키마 (coach-input, 데이터 계약)

부록 A가 학생별 `_coach-input/<name>.json`을 아래 형태로 생성. **다른 페이지에 붙이기의 핵심 계약**.

```jsonc
{
  "exam": "[2026 June] SuperfastSAT Full-Length Test #2",
  "student": { "id": "uuid", "name": "김채윤", "email": "..." },
  "totals": { "correct": 73, "total": 98 },
  "scaledScore": { "total": 1330, "rw": 570, "math": 760 },   // null 가능(곡선 없을 때)
  "sectionAccuracy": { "reading_and_writing": { "correct": 32, "total": 54 }, "math": { "correct": 41, "total": 44 } },
  "breakdown": [
    { "section": "Reading and Writing", "sectionKey": "reading_and_writing", "correct": 32, "total": 54, "ratePct": 59,
      "domains": [
        { "domain": "Information and Ideas", "correct": 9, "total": 15, "ratePct": 60, "cohortPct": 67,
          "skills": [ { "skill": "...", "correct": 1, "total": 3, "ratePct": 33, "cohortPct": 61 } ] }
      ] }
  ],
  "modules": [ { "label": "RW M1", "score": 19, "total": 27, "status": "expired", "durationSec": 1922 } ],
  "wrongCatCounts": { "careless": 5, "struggle": 6, "conceptual": 14 },
  "wrongByDifficulty": { "hard": 22, "challenging": 2, "medium": 1 },
  "weakSkills": [
    { "skill": "Expression of Ideas ▸ Transitions", "correct": 2, "total": 5, "ratePct": 40, "cohortPct": 71,
      "deltaPp": -31, "wrongBreakdown": { "conceptual": 2, "struggle": 1, "careless": 0 },
      "missedByDifficulty": { "hard": 3 }, "eliminatedCorrectCount": 0, "narrowedTo5050Count": 0 }
  ],
  "guessFindings": [],                 // 추측 패턴(있을 때): {module, kind, evidence, wrongInPattern}
  "timeManagementFlag": false,
  "cleanExpiredModules": ["RW M1","RW M2","Math M1","Math M2"],  // 시간초과+찍기없음 = 강점
  "eliminationExamples": [ { "skillLabel": "...", "phrase": "보기 2개로 좁힌 뒤 오답 (정답 'A', 선택 'B')" } ],
  "edenChats": [ { "skillLabel": "...", "difficulty": "hard", "correct": false, "timeSec": 95,
                   "selected": "B", "correctLetter": "A", "eliminated": ["C","D"],
                   "question": "...", "passage": "...", "options": [...], "explanation": "...",
                   "messages": [ { "role": "user", "content": "what does marginal mean" } ] } ]
}
```

---

## 6. 코치 코멘트 (LLM) — 정책 & 프롬프트

- **정책(Study Hall과 반대)**: Test Center는 **요약평가** → 진단 + 풀이 습관까지만. **향후 학습 계획/주차별 처방 금지**(학생이 실제 SAT를 며칠 뒤 볼 수 있음). 비교 기준은 **코호트**.
- 구조: ① 한 문단 총평(강점→병목) ② bold 진단 2~3개(정답률·코호트 격차 인용 + **학생 Eden 발화 직접 인용**) ③ 시간/풀이 습관(시간초과+찍기없음=강점, 부주의 ≥3이면 언급).
- **무결성 규칙**: 모든 수치 JSON 근거. 인용은 `edenChats`의 `role:"user"` 발화만(없으면 무인용; 명백한 오타만 정리). 지문/문항 용어는 "문항의 표현"으로 귀속(학생 발화로 둔갑 금지). 모듈 미응시(수초 제출·0점)면 해당 섹션은 미응시로 처리하고 분석 제외.
- 전체 프롬프트 = **부록 C** (`COACH-COMMENT-PROMPT.md`). 학생 1명당 LLM 1회, md의 `<!-- COACH_COMMENT -->`(`## 모의고사 결과에 따른 향후 학습 전략` 섹션) 치환.
- **생성 후 감사**: 표본 3명 — 수치 JSON 일치, 인용 실제 존재, 향후 계획 누출 없음, placeholder 잔존 없음.

---

## 7. 리포트 구성 & UI

섹션 순서(부록 B 렌더):

1. 헤더(시험명 + 학생명 + 이메일, 총점 1600 + 정답수·시간초과 표시)
2. 카드 2개: **R&W / Math** 환산점수(+ 코호트 평균 대비 ±)
3. 모듈별 상세 표(점수/정답률/상태/소요시간)
4. 섹션별 도메인·스킬 정답률 표 (**코호트 컬럼** + 코호트 미만 행 ▼ 하이라이트)
5. 풀이 시간 분석
6. **취약점 & 학습 코멘트**(깊은 코치 코멘트) — 작성됐으면 룰 기반 추천을 대체

UI 톤: 파란 그라데이션 헤더, 카드, 표, A4 인쇄 지원. 전체 CSS = 부록 B의 `CSS` 상수. `*italic*`→하이라이트 `<em>`, `**bold**`→`<strong>`. 코호트 미만 행은 `tr.below` 빨강 배경.

---

## 8. 실행 / 재현 단계

```bash
# 0) curriculum id 확인: test_center_lesson_attempts의 distinct curriculum_id (publish 사본 주의)

# 1) 분석: curriculumId → md + _coach-input JSON + _summary.tsv + _cohort.md
npx tsx scripts/test2-result-analysis.ts <curriculumId>
#    출력: C:/Users/kwoo3/Downloads/test-reports/<exam title>/
#    (선택) 환산점수: 해당 폴더에 _scaled-scores.json (이름→{total,rw,math}) 두면 사용, 없으면 raw/근사

# 2) 코치 코멘트: 부록 C 프롬프트로 학생당 LLM 1회 → md의 <!-- COACH_COMMENT --> 치환
#    (재실행해도 기존 코멘트는 보존됨)

# 3) HTML: 부록 B (test-reports md → score-reports html)
node build-score-reports.mjs
#    출력: C:/Users/kwoo3/Downloads/score-reports/<name>.html + index.html

# 4) 로컬 확인
npx -y serve "C:/Users/kwoo3/Downloads/score-reports" -l 8899   # http://localhost:8899/<학생명>
```

> 학생들이 모듈을 계속 제출하므로, 최종 빌드 직전 분석을 다시 돌려 늦은 제출을 반영.

---

## 9. 다른 페이지에 붙이기 (통합 가이드)

1. **데이터 레이어**: 부록 A의 추출/집계 로직(모듈 점수, 도메인·스킬 정답률, 코호트 평균, 타이밍, 취약 스킬, Eden 대화)을 자기 백엔드(서버 전용)로 이식해 §5 JSON을 반환.
2. **렌더**: §5 JSON을 자기 컴포넌트로. 부록 B의 섹션 구조/CSS(코호트 비교 카드, ▼ 하이라이트)를 옮기면 동일 디자인.
3. **코치 코멘트**: 같은 JSON을 부록 C 프롬프트에 넣어 서버에서 LLM 1회 호출.
4. **환산점수**: 페이지에서도 곡선이 필요하면 부록 B의 anchors를 쓰거나 시험별 `_scaled-scores.json` 제공.
5. **주의**: service_role 조회는 서버. 클라이언트엔 §5 JSON + 코멘트 텍스트만.

---

## 10. 엣지케이스 & 주의

- **publish 사본 id**: 응시 0건이면 미배포 사본 — distinct curriculum_id 먼저 확인.
- **variant null 메타데이터**: `units`의 difficulty/correct_answer/options/question이 null이면 `original_unit_id`로 복구.
- **모듈 미응시(<10분)**: 해당 과목 미응시 처리(점수/분석 제외). 코치 코멘트도 그 과목 진단 금지.
- **환산점수 곡선 부재**: `_scaled-scores.json` 없으면 raw 또는 부록 B 근사 — 출시 가능하나 추정치 주석 유지.
- **Eden 인용**: 없으면 무인용. 지문 용어는 문항 표현으로 귀속.
- **시간초과 vs 찍기**: 시간초과인데 찍기 패턴 없음 = 강점(코칭 정책). 찍기는 오답 ≥2 유발 시에만 약점.
- **제외 계정**: 테스트/임시 계정(이름에 `(임시)`/`test`)은 코호트·산출에서 제외.

---

## 11. 받는 사람용 검증 절차

1. **스키마 셀프체크**: `test_center_lesson_attempts`에서 `select('*').limit(1)`, `test_center_unit_attempts` 동일 → 컬럼이 §3과 일치하는지.
2. **수치 대조**: 알려진 curriculum으로 부록 A 실행 → `_cohort.md`의 코호트 n, 특정 학생(예: 김채윤) 모듈 점수/도메인%가 본 세션 산출물과 일치하는지.
3. **HTML**: 부록 B로 생성 후 `npx serve`로 §7 섹션 확인(코호트 비교 카드/▼ 하이라이트 포함).
4. **코멘트 감사**: 부록 C로 1명 생성 → 수치/인용 JSON 대조(환각 0), **향후 계획 누출 없음** 확인.

---

# 부록 — 전체 코드 (그대로 복사 사용)

각 블록은 4-backtick 펜스로 감쌌습니다(내부 코드 펜스 충돌 방지). 파일명/경로는 자유롭게 배치 가능하나, 분석 스크립트는 `.env.local` 경로(부록 A 상단 `loadEnv`)와 헬퍼 import 경로만 맞추면 됩니다. ※ 부록 A(`test2-result-analysis.ts`)는 분량이 큽니다(~1570줄).

## 부록 A. test2-result-analysis.ts (분석 스크립트, ~1570줄)

````ts
/**
 * Test #2 (Full-Length) per-student result extraction & weakness analysis.
 *
 * Targets a Test Center curriculum (default: "[2026 June] SuperfastSAT Full-Length Test #2").
 * For each student who took it, produces:
 *   - Module scores (RW M1/M2, Math M1/M2) from test_center_lesson_attempts.score/total
 *   - Domain & skill accuracy (correct / total) from test_center_unit_attempts ⨝ units
 *   - Timing analysis (slow-wrong vs fast-wrong, time-pressure / expired modules)
 *   - Rule-based weakness summary + study recommendations (vs cohort averages)
 *
 * Live DB schema (NOTE: differs from supabase/migrations — uses test_center_* tables):
 *   curricula
 *   test_center_lesson_attempts(id, student_id, curriculum_id, lesson_id, status, score, total,
 *                               started_at, deadline_at, submitted_at, expired_at)
 *   test_center_unit_attempts(id, test_lesson_attempt_id, student_id, unit_id, original_unit_id,
 *                             selected_answer, is_correct, time_spent_seconds, eliminated_options, attempted_at)
 *   units(id, section, domain, skill, difficulty, correct_answer)
 *   curriculum_chapters → chapters; chapter_lessons → lessons; lesson_units
 *   profiles(id, full_name, email)
 *
 * Usage: cd app && npx tsx scripts/test2-result-analysis.ts [curriculumId]
 * Output: C:/Users/kwoo3/Downloads/test2-report/
 */

import * as path from "path";
import * as fs from "fs";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { SAT_TAXONOMY, DIFFICULTIES, type Section } from "../src/lib/sat-taxonomy";
import { parseCorrectAnswers } from "../src/lib/answer-utils";

loadEnv({ path: path.join(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CURRICULUM_ID =
  process.argv[2] ?? "19c8db9a-cdc1-469b-9510-2aa0ee6b0a78"; // Full-Length Test #2
// Output dir is derived from the curriculum title at runtime (see main()),
// so different tests never overwrite each other. Override with argv[3].
const OUTPUT_DIR_BASE = "C:/Users/kwoo3/Downloads/test-reports";
let OUTPUT_DIR = process.argv[3] ?? "";

const COMPLETED = new Set(["submitted", "expired"]);
const MIN_N_FOR_FLAG = 3; // minimum questions in a skill/domain before flagging weakness
const SAT_SECTION_ORDER: Section[] = ["reading_and_writing", "math"];

// ── Tuning constants ──────────────────────────────────────────────────────────
// Wrong-answer time categorization (user-defined thresholds)
const CARELESS_SECONDS = 30; // wrong in < 30s → careless / rushed mistake
const OVER_INVESTED_SECONDS = 120; // >= 2min → tried hard, conceptual gap if wrong
// Guessing-pattern detection within a module
const RUSH_SECONDS = 15; // an answer faster than this looks like a guess
const END_WINDOW_K = 6; // examine the last K questions of a module
const END_RUSH_MIN = 4; // >= this many fast answers among the last K → end-of-module rush
const RUN_RAPID_K = 3; // >= this many consecutive fast answers → rapid-guess run
const SAME_LETTER_K = 4; // >= this many consecutive identical MCQ answers → letter streak
const GUESS_MIN_WRONG = 2; // a pattern only counts as guessing if it cost >= this many wrong answers
// (a fast/same-letter run that was mostly CORRECT is skill or coincidence, not guessing)
// Reporting
const WEAK_SKILL_TOP_N = 5; // how many weak skills to surface per student
const CHAT_MAX = 3; // max Eden transcripts to embed per student
const MASTERY_TARGET = 0.85; // target accuracy used for shortfall scoring

// difficulty → stars (easy 1 … challenging 4); used to weight missed-item difficulty
const DIFF_STARS = new Map<string, number>(DIFFICULTIES.map((d) => [d.value, d.stars]));

// ── Types ───────────────────────────────────────────────────────────────────
type SectionKey = Section;

interface UnitMeta {
  id: string;
  section: SectionKey | null;
  domain: string | null;
  skill: string | null;
  difficulty: string | null;
  correctAnswer: string | null;
  options: { label: string; text: string }[] | null;
  question: string | null;
  passage: string | null;
  explanation: string | null;
}
interface LessonAttempt {
  id: string;
  student_id: string;
  lesson_id: string;
  status: string;
  score: number | null;
  total: number | null;
  started_at: string | null;
  submitted_at: string | null;
  expired_at: string | null;
}
interface UnitAttempt {
  id: string;
  test_lesson_attempt_id: string;
  student_id: string;
  unit_id: string;
  original_unit_id: string | null;
  selected_answer: string | null;
  is_correct: boolean | null;
  time_spent_seconds: number | null;
  attempted_at: string | null;
  eliminated_options: string[] | null;
  chat_messages: ChatMsg[] | null;
}
interface ChatMsg {
  role: string; // "user" | "assistant"
  content: string;
}
// Full Eden chat record for the coach-input JSON (one per attempt with chat present)
interface ChatRecord {
  skillLabel: string;
  difficulty: string | null;
  correct: boolean;
  timeSec: number;
  selected: string | null;
  correctLetter: string | null;
  eliminated: string[];
  question: string | null;
  passage: string | null;
  options: { label: string; text: string }[] | null;
  explanation: string | null;
  messages: ChatMsg[];
}

// Wrong-answer time categorization
type WrongCat = "careless" | "struggle" | "conceptual";
interface WrongDetail {
  unitId: string;
  section: SectionKey;
  domainKey: string;
  skill: string; // "domainKey ▸ skill" key
  time: number;
  cat: WrongCat;
  difficulty: string | null;
  selected: string | null;
  correctLetter: string | null;
  eliminated: string[];
  isMCQ: boolean;
}
// Ordered per-module item (for guessing detection)
interface SeqItem {
  time: number;
  correct: boolean;
  selected: string | null;
  isMCQ: boolean;
  attemptedAt: string | null;
}
type GuessKind = "end_rush" | "rapid_run" | "letter_streak";
interface GuessFinding {
  module: string;
  kind: GuessKind;
  evidence: string;
  wrongInPattern: number;
  severity: number;
}
interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}
// Scaled-score lookup entry (from the previous HTML score reports)
interface ScaledScore {
  total: number | null;
  rw: number | null;
  math: number | null;
  exam?: string | null;
}

// correct / total counter keyed by string
type CT = { c: number; t: number };
function ct(): CT {
  return { c: 0, t: 0 };
}
function bumpCT(m: Map<string, CT>, key: string, correct: boolean) {
  let v = m.get(key);
  if (!v) {
    v = ct();
    m.set(key, v);
  }
  v.t += 1;
  if (correct) v.c += 1;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(c: number, t: number): string {
  if (!t) return "—";
  return `${Math.round((100 * c) / t)}%`;
}
function sanitizeFilename(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "_").trim();
}
function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function fmtMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function capText(s: string | null, max: number): string | null {
  if (s == null) return null;
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > max ? one.slice(0, max) + "…" : one;
}

// ── Per-student aggregate ──────────────────────────────────────────────────────
interface ModuleScore {
  moduleLabel: string; // e.g. "RW M1"
  section: SectionKey;
  moduleNum: number;
  score: number | null;
  total: number | null;
  status: string;
  durationSec: number | null;
}
interface StudentAgg {
  studentId: string;
  modules: ModuleScore[];
  // section → domain → CT
  domain: Map<SectionKey, Map<string, CT>>;
  // section → "domain ▸ skill" → CT
  skill: Map<SectionKey, Map<string, CT>>;
  // section → CT
  section: Map<SectionKey, CT>;
  // every wrong answer with time categorization + elimination/correct info
  wrongDetails: WrongDetail[];
  carelessCount: number;
  struggleCount: number;
  conceptualCount: number;
  // all wrong (for difficulty breakdown)
  wrongByDifficulty: Map<string, number>;
  // module attemptId → ordered SeqItems (for guessing detection)
  moduleSeq: Map<string, SeqItem[]>;
  moduleLabelByAttempt: Map<string, string>;
  guessFindings: GuessFinding[];
  timeManagementFlag: boolean;
  // module attemptIds that ended expired but show no guessing pattern (positive note)
  cleanExpiredModules: string[];
  // Eden transcripts to surface (wrong + chat present)
  chatPicks: { skillLabel: string; difficulty: string | null; cat: WrongCat; messages: ChatMsg[] }[];
  // ALL attempts with an Eden chat (correct or wrong) — for the coach-input JSON
  chatRecords: ChatRecord[];
  // eliminated-option misconception examples
  elimExamples: { skillLabel: string; phrase: string }[];
  totalQuestions: number;
  totalCorrect: number;
  hadExpiredModule: boolean;
}

function ensureStudent(map: Map<string, StudentAgg>, id: string): StudentAgg {
  let a = map.get(id);
  if (!a) {
    a = {
      studentId: id,
      modules: [],
      domain: new Map(),
      skill: new Map(),
      section: new Map(),
      wrongDetails: [],
      carelessCount: 0,
      struggleCount: 0,
      conceptualCount: 0,
      wrongByDifficulty: new Map(),
      moduleSeq: new Map(),
      moduleLabelByAttempt: new Map(),
      guessFindings: [],
      timeManagementFlag: false,
      cleanExpiredModules: [],
      chatPicks: [],
      chatRecords: [],
      elimExamples: [],
      totalQuestions: 0,
      totalCorrect: 0,
      hadExpiredModule: false,
    };
    map.set(id, a);
  }
  return a;
}
function getSecMap<T>(m: Map<SectionKey, Map<string, T>>, s: SectionKey): Map<string, T> {
  let v = m.get(s);
  if (!v) {
    v = new Map();
    m.set(s, v);
  }
  return v;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // Curriculum
  const { data: cur, error: cErr } = await supabase
    .from("curricula")
    .select("id, title, published_space")
    .eq("id", CURRICULUM_ID)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!cur) {
    console.error(`Curriculum ${CURRICULUM_ID} not found`);
    process.exit(1);
  }
  console.log(`→ Curriculum: ${cur.title} (${cur.id})`);
  if (!OUTPUT_DIR)
    OUTPUT_DIR = path.join(OUTPUT_DIR_BASE, sanitizeFilename(cur.title));

  // Build module identity: lesson_id → { section, moduleNum, label }
  const { data: cChaps } = await supabase
    .from("curriculum_chapters")
    .select("chapter_id, order_index")
    .eq("curriculum_id", CURRICULUM_ID)
    .order("order_index");
  const chapterIds = (cChaps ?? []).map((r) => r.chapter_id);

  const { data: chs } = await supabase
    .from("chapters")
    .select("id, title")
    .in("id", chapterIds.length ? chapterIds : ["x"]);
  const chapterTitle = new Map((chs ?? []).map((c) => [c.id, c.title as string]));

  const { data: chLessons } = await supabase
    .from("chapter_lessons")
    .select("chapter_id, lesson_id, order_index")
    .in("chapter_id", chapterIds.length ? chapterIds : ["x"]);

  // section per chapter (by title), module number per lesson (order within chapter)
  function sectionOfChapter(title: string): SectionKey {
    return /math/i.test(title) ? "math" : "reading_and_writing";
  }
  interface ModInfo {
    section: SectionKey;
    moduleNum: number;
    label: string;
  }
  const lessonModule = new Map<string, ModInfo>();
  {
    const byChapter = new Map<string, { lesson_id: string; order_index: number }[]>();
    for (const r of chLessons ?? []) {
      let arr = byChapter.get(r.chapter_id);
      if (!arr) {
        arr = [];
        byChapter.set(r.chapter_id, arr);
      }
      arr.push({ lesson_id: r.lesson_id, order_index: r.order_index ?? 0 });
    }
    for (const [chId, arr] of byChapter) {
      arr.sort((a, b) => a.order_index - b.order_index);
      const section = sectionOfChapter(chapterTitle.get(chId) ?? "");
      const tag = section === "math" ? "Math" : "RW";
      arr.forEach((l, i) =>
        lessonModule.set(l.lesson_id, {
          section,
          moduleNum: i + 1,
          label: `${tag} M${i + 1}`,
        }),
      );
    }
  }

  // Unit metadata for all units in the curriculum (+ resolve variants later)
  const lessonIds = [...new Set((chLessons ?? []).map((r) => r.lesson_id))];
  const { data: lessonUnits } = await supabase
    .from("lesson_units")
    .select("lesson_id, unit_id")
    .in("lesson_id", lessonIds.length ? lessonIds : ["x"]);
  const unitMeta = new Map<string, UnitMeta>();
  const baseUnitIds = [...new Set((lessonUnits ?? []).map((r) => r.unit_id))];
  await fetchUnitMeta(baseUnitIds, unitMeta);
  console.log(`  ${unitMeta.size} base units loaded`);

  // Lesson attempts for this curriculum
  const lessonAttempts: LessonAttempt[] = [];
  {
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("test_center_lesson_attempts")
        .select(
          "id, student_id, lesson_id, status, score, total, started_at, submitted_at, expired_at",
        )
        .eq("curriculum_id", CURRICULUM_ID)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data?.length) break;
      lessonAttempts.push(...(data as LessonAttempt[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }
  const completedAttempts = lessonAttempts.filter((la) => COMPLETED.has(la.status));
  console.log(
    `  ${lessonAttempts.length} lesson_attempts (${completedAttempts.length} completed)`,
  );

  // Unit attempts for completed lesson attempts
  const completedIds = completedAttempts.map((la) => la.id);
  const unitAttempts: UnitAttempt[] = [];
  for (let i = 0; i < completedIds.length; i += 200) {
    const chunk = completedIds.slice(i, i + 200);
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("test_center_unit_attempts")
        .select(
          "id, test_lesson_attempt_id, student_id, unit_id, original_unit_id, selected_answer, is_correct, time_spent_seconds, attempted_at, eliminated_options, chat_messages",
        )
        .in("test_lesson_attempt_id", chunk)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data?.length) break;
      unitAttempts.push(...(data as UnitAttempt[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }
  console.log(`  ${unitAttempts.length} unit_attempts`);

  // Resolve metadata for any variant unit ids not already known
  const extra = new Set<string>();
  for (const ua of unitAttempts) {
    if (!unitMeta.has(ua.unit_id)) extra.add(ua.unit_id);
    if (ua.original_unit_id && !unitMeta.has(ua.original_unit_id))
      extra.add(ua.original_unit_id);
  }
  await fetchUnitMeta([...extra], unitMeta);

  function resolveUnit(ua: UnitAttempt): UnitMeta | undefined {
    let u = unitMeta.get(ua.unit_id);
    const orig = ua.original_unit_id ? unitMeta.get(ua.original_unit_id) : undefined;
    if ((!u || !u.section || !u.domain) && orig) u = orig;
    // Test Center variant copies often have null `difficulty`/`correct_answer`/`options`;
    // recover each from the original unit so analysis isn't lost to "(unknown)".
    if (u && orig) {
      const patch: Partial<UnitMeta> = {};
      if (u.difficulty == null && orig.difficulty != null) patch.difficulty = orig.difficulty;
      if (u.correctAnswer == null && orig.correctAnswer != null) patch.correctAnswer = orig.correctAnswer;
      if ((u.options == null || u.options.length === 0) && orig.options) patch.options = orig.options;
      if (u.question == null && orig.question != null) patch.question = orig.question;
      if (u.passage == null && orig.passage != null) patch.passage = orig.passage;
      if (u.explanation == null && orig.explanation != null) patch.explanation = orig.explanation;
      if (Object.keys(patch).length) u = { ...u, ...patch };
    }
    return u;
  }

  // Profiles
  const studentIds = [...new Set(lessonAttempts.map((la) => la.student_id))];
  const profileById = new Map<string, Profile>();
  for (let i = 0; i < studentIds.length; i += 500) {
    const chunk = studentIds.slice(i, i + 500);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", chunk);
    for (const p of data ?? []) profileById.set(p.id, p as Profile);
  }

  // ── Aggregate ────────────────────────────────────────────────────────────
  const lessonAttemptById = new Map(lessonAttempts.map((la) => [la.id, la]));
  const students = new Map<string, StudentAgg>();

  // module scores
  for (const la of completedAttempts) {
    const mod = lessonModule.get(la.lesson_id);
    if (!mod) continue;
    const agg = ensureStudent(students, la.student_id);
    let dur: number | null = null;
    if (la.started_at && (la.submitted_at || la.expired_at)) {
      dur =
        (new Date(la.submitted_at ?? la.expired_at!).getTime() -
          new Date(la.started_at).getTime()) /
        1000;
    }
    agg.modules.push({
      moduleLabel: mod.label,
      section: mod.section,
      moduleNum: mod.moduleNum,
      score: la.score,
      total: la.total,
      status: la.status,
      durationSec: dur,
    });
    if (la.status === "expired") agg.hadExpiredModule = true;
  }

  // per-question domain/skill/timing — only count attempts in completed modules
  const completedSet = new Set(completedIds);
  // cohort timing per domain (to set relative slow/fast nuance)
  const cohortDomainTimes = new Map<string, number[]>(); // domain → times (correct+wrong)
  // attempt id → full chat for a wrong detail (parallel to wrongDetails, by index)
  const wrongChatByStudent = new Map<string, ChatMsg[][]>();

  for (const ua of unitAttempts) {
    if (!completedSet.has(ua.test_lesson_attempt_id)) continue;
    const u = resolveUnit(ua);
    if (!u || !u.section || !u.domain) continue;
    const skill = u.skill ?? "(unknown skill)";
    const skillKey = `${u.domain} ▸ ${skill}`;
    const time = ua.time_spent_seconds ?? 0;
    const correct = !!ua.is_correct;
    const isMCQ = !!(u.options && u.options.length);
    const correctLetter = u.correctAnswer ? parseCorrectAnswers(u.correctAnswer)[0] ?? null : null;

    if (time > 0) {
      let arr = cohortDomainTimes.get(u.domain);
      if (!arr) {
        arr = [];
        cohortDomainTimes.set(u.domain, arr);
      }
      arr.push(time);
    }

    const agg = ensureStudent(students, ua.student_id);
    agg.totalQuestions += 1;
    if (correct) agg.totalCorrect += 1;
    // section CT (store directly)
    {
      let s = agg.section.get(u.section);
      if (!s) {
        s = ct();
        agg.section.set(u.section, s);
      }
      s.t += 1;
      if (correct) s.c += 1;
    }
    bumpCT(getSecMap(agg.domain, u.section), u.domain, correct);
    bumpCT(getSecMap(agg.skill, u.section), skillKey, correct);

    // ordered per-module item for guessing detection (ALL attempts, not just wrong)
    let seq = agg.moduleSeq.get(ua.test_lesson_attempt_id);
    if (!seq) {
      seq = [];
      agg.moduleSeq.set(ua.test_lesson_attempt_id, seq);
    }
    seq.push({ time, correct, selected: ua.selected_answer, isMCQ, attemptedAt: ua.attempted_at });

    // full Eden chat record (correct or wrong) for the coach-input JSON
    const chatMsgs = normalizeChat(ua.chat_messages);
    if (chatMsgs.length) {
      agg.chatRecords.push({
        skillLabel: skillLabelOf(u.section, skillKey),
        difficulty: u.difficulty,
        correct,
        timeSec: time,
        selected: ua.selected_answer,
        correctLetter,
        eliminated: Array.isArray(ua.eliminated_options) ? ua.eliminated_options : [],
        question: capText(u.question, 600),
        passage: capText(u.passage, 1200),
        options: u.options,
        explanation: capText(u.explanation, 800),
        messages: chatMsgs,
      });
    }

    if (!correct) {
      const eliminated = Array.isArray(ua.eliminated_options) ? ua.eliminated_options : [];
      agg.wrongDetails.push({
        unitId: ua.unit_id,
        section: u.section,
        domainKey: u.domain,
        skill: skillKey,
        time,
        cat: "struggle", // refined in post-pass
        difficulty: u.difficulty,
        selected: ua.selected_answer,
        correctLetter,
        eliminated,
        isMCQ,
      });
      const chats = wrongChatByStudent.get(agg.studentId) ?? [];
      chats.push(chatMsgs);
      wrongChatByStudent.set(agg.studentId, chats);
      const diff = u.difficulty ?? "(unknown)";
      agg.wrongByDifficulty.set(diff, (agg.wrongByDifficulty.get(diff) ?? 0) + 1);
    }
  }

  // module label per completed attempt (lesson_id → module)
  for (const la of completedAttempts) {
    const mod = lessonModule.get(la.lesson_id);
    if (mod) {
      for (const [, agg] of students) {
        if (agg.moduleSeq.has(la.id)) agg.moduleLabelByAttempt.set(la.id, mod.label);
      }
    }
  }
  const expiredAttemptIds = new Set(
    completedAttempts.filter((la) => la.status === "expired").map((la) => la.id),
  );

  // domain median times (cohort) for relative time nuance
  const domainMedian = new Map<string, number>();
  for (const [d, arr] of cohortDomainTimes) domainMedian.set(d, median(arr));

  // ── Post-pass per student: categorize wrongs, detect guessing, pick chats/elim ──
  for (const [sid, agg] of students) {
    // 1) categorize each wrong answer by time
    for (const w of agg.wrongDetails) {
      w.cat = classifyWrong(w.time, domainMedian.get(w.domainKey) ?? 0);
      if (w.cat === "careless") agg.carelessCount++;
      else if (w.cat === "conceptual") agg.conceptualCount++;
      else agg.struggleCount++;
    }
    // 2) detect guessing patterns per module + flag clean expired modules
    for (const [attemptId, seq] of agg.moduleSeq) {
      const label = agg.moduleLabelByAttempt.get(attemptId) ?? "?";
      const isExpired = expiredAttemptIds.has(attemptId);
      const findings = detectGuessing(seq, label);
      if (findings.length) agg.guessFindings.push(...findings);
      else if (isExpired && !tailCollapsed(seq)) agg.cleanExpiredModules.push(label);
    }
    agg.timeManagementFlag = agg.guessFindings.length > 0;
    // 3) Eden chat picks (wrong + chat present), conceptual misses first then slowest
    const chats = wrongChatByStudent.get(sid) ?? [];
    const withChat = agg.wrongDetails
      .map((w, i) => ({ w, msgs: chats[i] ?? [] }))
      .filter((x) => x.msgs.length > 0);
    withChat.sort((a, b) => {
      const rank = (c: WrongCat) => (c === "conceptual" ? 0 : c === "struggle" ? 1 : 2);
      const r = rank(a.w.cat) - rank(b.w.cat);
      return r !== 0 ? r : b.w.time - a.w.time;
    });
    for (const { w, msgs } of withChat.slice(0, CHAT_MAX)) {
      agg.chatPicks.push({
        skillLabel: skillLabelOf(w.section, w.skill),
        difficulty: w.difficulty,
        cat: w.cat,
        messages: msgs,
      });
    }
    // 4) eliminated-option misconception examples
    for (const ex of analyzeElimination(agg.wrongDetails)) agg.elimExamples.push(ex);
  }

  // ── Cohort domain/skill averages ──────────────────────────────────────────
  const cohortDomain = new Map<SectionKey, Map<string, CT>>();
  const cohortSkill = new Map<SectionKey, Map<string, CT>>();
  for (const [, agg] of students) {
    for (const sec of SAT_SECTION_ORDER) {
      const d = agg.domain.get(sec);
      if (d) {
        const cd = getSecMap(cohortDomain, sec);
        for (const [k, v] of d) {
          const e = cd.get(k) ?? ct();
          e.c += v.c;
          e.t += v.t;
          cd.set(k, e);
        }
      }
      const sk = agg.skill.get(sec);
      if (sk) {
        const cs = getSecMap(cohortSkill, sec);
        for (const [k, v] of sk) {
          const e = cs.get(k) ?? ct();
          e.c += v.c;
          e.t += v.t;
          cs.set(k, e);
        }
      }
    }
  }

  // ── Output ─────────────────────────────────────────────────────────────────
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const coachDir = path.join(OUTPUT_DIR, "_coach-input");
  fs.mkdirSync(coachDir, { recursive: true });

  // Scaled scores (total/RW/Math) — name-keyed lookup, PER-EXAM file inside the
  // exam's output folder (so a new exam never inherits an old exam's scores).
  // Falls back to the legacy global file for backward compatibility.
  let scaledScores: Record<string, ScaledScore> = {};
  const perExamScaled = path.join(OUTPUT_DIR, "_scaled-scores.json");
  const legacyScaled = path.join(OUTPUT_DIR_BASE, "_scaled-scores.json");
  const scaledPath = fs.existsSync(perExamScaled) ? perExamScaled : legacyScaled;
  if (fs.existsSync(scaledPath))
    scaledScores = JSON.parse(fs.readFileSync(scaledPath, "utf-8"));
  console.log(`  scaled scores: ${fs.existsSync(scaledPath) ? scaledPath : "(none)"}`);

  let written = 0;
  for (const [, agg] of students) {
    const p = profileById.get(agg.studentId);
    const name = p?.full_name ?? agg.studentId.slice(0, 8);
    const scaled = (p?.full_name && scaledScores[p.full_name]) || null;
    let md = renderStudent(agg, p, scaled, cohortDomain, cohortSkill, domainMedian);
    const outPath = path.join(OUTPUT_DIR, `${sanitizeFilename(name)}.md`);
    // Preserve an already-written coach comment across regenerations
    if (fs.existsSync(outPath)) {
      const prev = fs.readFileSync(outPath, "utf-8");
      const m = prev.match(
        /## (?:모의고사 결과에 따른 향후 학습 전략|코치 코멘트 \(맞춤\))\s*\n([\s\S]*)$/,
      );
      const existing = m?.[1]?.trim();
      if (existing && existing !== "<!-- COACH_COMMENT -->")
        md = md.replace("<!-- COACH_COMMENT -->", existing);
    }
    fs.writeFileSync(outPath, md, "utf-8");
    fs.writeFileSync(
      path.join(coachDir, `${sanitizeFilename(name)}.json`),
      JSON.stringify(
        buildCoachInput(agg, p, scaled, cur.title, cohortDomain, cohortSkill),
        null,
        2,
      ),
      "utf-8",
    );
    written++;
  }
  console.log(`→ Wrote ${written} student reports (+ _coach-input JSONs)`);

  // summary TSV
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "_summary.tsv"),
    renderSummaryTSV(students, profileById, cohortSkill),
    "utf-8",
  );
  // cohort markdown
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "_cohort.md"),
    renderCohort(cur.title, students, cohortDomain, cohortSkill, domainMedian),
    "utf-8",
  );
  console.log(`→ Wrote _summary.tsv and _cohort.md`);
  console.log(`Done → ${OUTPUT_DIR}`);
}

// ── unit metadata fetch (chunked) ──────────────────────────────────────────────
async function fetchUnitMeta(ids: string[], into: Map<string, UnitMeta>) {
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    if (!chunk.length) continue;
    const { data, error } = await supabase
      .from("units")
      .select(
        "id, section, domain, skill, difficulty, correct_answer, options, question, passage, explanation",
      )
      .in("id", chunk);
    if (error) throw error;
    for (const u of data ?? [])
      into.set(u.id, {
        id: u.id,
        section: u.section as SectionKey | null,
        domain: u.domain,
        skill: u.skill,
        difficulty: u.difficulty,
        correctAnswer: u.correct_answer,
        options: normalizeOptions(u.options),
        question: u.question,
        passage: u.passage,
        explanation: u.explanation,
      });
  }
}

// units.options is jsonb: array of {label,text}. Normalize defensively.
function normalizeOptions(raw: unknown): { label: string; text: string }[] | null {
  let v = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(v)) return null;
  const out: { label: string; text: string }[] = [];
  for (const o of v) {
    if (o && typeof o === "object" && "label" in o)
      out.push({ label: String((o as { label: unknown }).label), text: String((o as { text?: unknown }).text ?? "") });
  }
  return out.length ? out : null;
}

// ── Analysis helpers ───────────────────────────────────────────────────────────

// chat_messages is jsonb: array of {role,content}. Normalize defensively.
function normalizeChat(raw: unknown): ChatMsg[] {
  let v = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  const out: ChatMsg[] = [];
  for (const m of v) {
    if (m && typeof m === "object" && "content" in m)
      out.push({
        role: String((m as { role?: unknown }).role ?? ""),
        content: String((m as { content: unknown }).content ?? ""),
      });
  }
  return out;
}

// "domainKey ▸ skill" → "Domain Label ▸ Skill"
function skillLabelOf(section: SectionKey, skillKey: string): string {
  const [domKey, skill] = skillKey.split(" ▸ ");
  return `${domainLabel(section, domKey)} ▸ ${skill ?? skillKey}`;
}

// Categorize a wrong answer by time. Absolute thresholds win; cohort median only
// nuances the middle band (a fast-relative-to-peers miss → careless; slow → conceptual).
function classifyWrong(t: number, cohortMedian: number): WrongCat {
  if (t > 0 && t < CARELESS_SECONDS) return "careless";
  if (t >= OVER_INVESTED_SECONDS) return "conceptual";
  if (t <= 0) return "struggle"; // no timing → neutral
  if (cohortMedian > 0) {
    if (t >= cohortMedian * 1.5) return "conceptual";
    if (t < cohortMedian * 0.6) return "careless";
  }
  return "struggle";
}

// Was the module's tail (last END_WINDOW_K) collapsing in time vs the rest?
// Used to avoid calling a clean expired module "good" when the end was rushed
// but didn't trip the explicit detectors.
function tailCollapsed(seq: SeqItem[]): boolean {
  const ordered = orderSeq(seq);
  if (ordered.length < END_WINDOW_K * 2) return false;
  const tail = ordered.slice(-END_WINDOW_K).map((s) => s.time).filter((t) => t > 0);
  const rest = ordered.slice(0, -END_WINDOW_K).map((s) => s.time).filter((t) => t > 0);
  if (!tail.length || !rest.length) return false;
  return median(tail) < median(rest) * 0.5;
}

function orderSeq(seq: SeqItem[]): SeqItem[] {
  return [...seq].sort((a, b) => {
    const ta = a.attemptedAt ?? "";
    const tb = b.attemptedAt ?? "";
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}

// Detect guessing patterns within one module (ordered by attempted_at).
function detectGuessing(rawSeq: SeqItem[], moduleLabel: string): GuessFinding[] {
  const seq = orderSeq(rawSeq);
  const out: GuessFinding[] = [];
  const isFast = (s: SeqItem) => s.time > 0 && s.time < RUSH_SECONDS;
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  // 1) end-of-module rush
  if (seq.length >= END_WINDOW_K) {
    const tail = seq.slice(-END_WINDOW_K);
    const fast = tail.filter(isFast);
    const wrongFastTail = tail.filter((s) => isFast(s) && !s.correct).length;
    if (fast.length >= END_RUSH_MIN && wrongFastTail >= GUESS_MIN_WRONG) {
      const wrong = tail.filter((s) => !s.correct).length;
      out.push({
        module: moduleLabel,
        kind: "end_rush",
        evidence: `마지막 ${END_WINDOW_K}문제 중 ${fast.length}문제를 평균 ${Math.round(
          avg(fast.map((s) => s.time)),
        )}초에 처리(오답 ${wrong})`,
        wrongInPattern: wrong,
        severity: fast.length + wrong,
      });
    }
  }

  // 2) consecutive rapid-guess runs (longest reported)
  {
    let bestStart = -1,
      bestLen = 0;
    let i = 0;
    while (i < seq.length) {
      if (isFast(seq[i])) {
        let j = i;
        while (j < seq.length && isFast(seq[j])) j++;
        if (j - i > bestLen) {
          bestLen = j - i;
          bestStart = i;
        }
        i = j;
      } else i++;
    }
    if (bestLen >= RUN_RAPID_K) {
      const run = seq.slice(bestStart, bestStart + bestLen);
      const wrong = run.filter((s) => !s.correct).length;
      if (wrong >= GUESS_MIN_WRONG) {
        out.push({
          module: moduleLabel,
          kind: "rapid_run",
          evidence: `${bestStart + 1}~${bestStart + bestLen}번째 문항 연속 ${bestLen}개를 평균 ${Math.round(
            avg(run.map((s) => s.time)),
          )}초에 처리(오답 ${wrong})`,
          wrongInPattern: wrong,
          severity: bestLen + wrong,
        });
      }
    }
  }

  // 3) same-letter streak (MCQ only)
  {
    let bestLetter = "",
      bestStart = -1,
      bestLen = 0;
    let i = 0;
    while (i < seq.length) {
      const sel = seq[i].selected;
      if (seq[i].isMCQ && sel && /^[A-D]$/i.test(sel)) {
        let j = i;
        while (
          j < seq.length &&
          seq[j].isMCQ &&
          (seq[j].selected ?? "").toUpperCase() === sel.toUpperCase()
        )
          j++;
        if (j - i > bestLen) {
          bestLen = j - i;
          bestStart = i;
          bestLetter = sel.toUpperCase();
        }
        i = j;
      } else i++;
    }
    if (bestLen >= SAME_LETTER_K) {
      const run = seq.slice(bestStart, bestStart + bestLen);
      const wrong = run.filter((s) => !s.correct).length;
      if (wrong >= Math.max(GUESS_MIN_WRONG, Math.ceil(bestLen / 2))) {
        out.push({
          module: moduleLabel,
          kind: "letter_streak",
          evidence: `${bestStart + 1}번째부터 ${bestLen}문항 연속 '${bestLetter}' 선택(오답 ${wrong})`,
          wrongInPattern: wrong,
          severity: bestLen + wrong,
        });
      }
    }
  }

  return out;
}

// Surface eliminated-option misconceptions (capped at ~5).
function analyzeElimination(
  wrongs: WrongDetail[],
): { skillLabel: string; phrase: string }[] {
  const out: { skillLabel: string; phrase: string }[] = [];
  for (const w of wrongs) {
    if (!w.isMCQ || !w.eliminated.length || !w.correctLetter) continue;
    const elimUpper = w.eliminated.map((e) => e.toUpperCase());
    const cl = w.correctLetter.toUpperCase();
    const label = skillLabelOf(w.section, w.skill);
    if (elimUpper.includes(cl)) {
      out.push({ skillLabel: label, phrase: `정답 '${cl}'를 직접 소거한 뒤 오답 — 해당 개념 오해 가능성` });
    } else if (w.eliminated.length === 2) {
      out.push({
        skillLabel: label,
        phrase: `보기 2개로 좁힌 뒤 오답 (정답 '${cl}', 선택 '${(w.selected ?? "?").toUpperCase()}')`,
      });
    }
    if (out.length >= 5) break;
  }
  return out;
}

// difficulty → stars; missing/unknown counts as medium (2)
function diffStars(d: string | null): number {
  return (d && DIFF_STARS.get(d)) || 2;
}

// ── Skill-level weakness ranking ─────────────────────────────────────────────
interface SkillStat {
  section: SectionKey;
  skillKey: string; // "domainKey ▸ skill"
  label: string;
  c: number;
  t: number;
  rate: number;
  cohortRate: number;
  delta: number;
  wrong: number;
  careless: number;
  struggle: number;
  conceptual: number;
  diffMix: Map<string, number>; // difficulty → # of MISSES
  elimCorrect: number;
  elim5050: number;
  score: number;
}

function buildSkillStats(
  agg: StudentAgg,
  cohortSkill: Map<SectionKey, Map<string, CT>>,
): SkillStat[] {
  const stats: SkillStat[] = [];
  for (const sec of SAT_SECTION_ORDER) {
    const skMap = agg.skill.get(sec);
    if (!skMap) continue;
    const cohort = cohortSkill.get(sec);
    for (const [skillKey, v] of skMap) {
      if (v.t < MIN_N_FOR_FLAG) continue;
      const rate = v.c / v.t;
      const co = cohort?.get(skillKey);
      const cohortRate = co && co.t ? co.c / co.t : rate;
      // per-skill wrong-answer breakdown
      const ws = agg.wrongDetails.filter((w) => w.section === sec && w.skill === skillKey);
      const diffMix = new Map<string, number>();
      let careless = 0,
        struggle = 0,
        conceptual = 0,
        elimCorrect = 0,
        elim5050 = 0;
      for (const w of ws) {
        const d = w.difficulty ?? "(unknown)";
        diffMix.set(d, (diffMix.get(d) ?? 0) + 1);
        if (w.cat === "careless") careless++;
        else if (w.cat === "conceptual") conceptual++;
        else struggle++;
        if (w.isMCQ && w.eliminated.length && w.correctLetter) {
          if (w.eliminated.map((e) => e.toUpperCase()).includes(w.correctLetter.toUpperCase()))
            elimCorrect++;
          else if (w.eliminated.length === 2) elim5050++;
        }
      }
      const wrong = ws.length;
      const shortfall = Math.max(0, MASTERY_TARGET - rate);
      const relGap = Math.max(0, -(rate - cohortRate));
      const volume = Math.min(1, v.t / 8);
      const conceptualShare = (conceptual + 0.5 * struggle) / Math.max(1, wrong);
      const avgMissStars =
        wrong > 0 ? ws.reduce((s, w) => s + diffStars(w.difficulty), 0) / wrong : 2;
      const diffActionability = (5 - avgMissStars) / 4; // missing EASY items is more actionable
      const score =
        (0.45 * shortfall + 0.25 * relGap) *
        (0.6 + 0.4 * volume) *
        (0.5 + 0.5 * conceptualShare) *
        (0.7 + 0.3 * diffActionability);
      stats.push({
        section: sec,
        skillKey,
        label: skillLabelOf(sec, skillKey),
        c: v.c,
        t: v.t,
        rate,
        cohortRate,
        delta: rate - cohortRate,
        wrong,
        careless,
        struggle,
        conceptual,
        diffMix,
        elimCorrect,
        elim5050,
        score,
      });
    }
  }
  // candidates: low absolute rate OR below cohort; rank by urgency score
  return stats
    .filter((s) => s.rate < 0.7 || s.delta < -0.1)
    .sort((a, b) => (b.score - a.score) || a.label.localeCompare(b.label, "ko"));
}

// ── Coach-input JSON (handoff to the LLM coach-comment layer) ─────────────────
function buildCoachInput(
  agg: StudentAgg,
  p: Profile | undefined,
  scaled: ScaledScore | null,
  examTitle: string,
  cohortDomain: Map<SectionKey, Map<string, CT>>,
  cohortSkill: Map<SectionKey, Map<string, CT>>,
) {
  const modOrder = (m: ModuleScore) =>
    (m.section === "reading_and_writing" ? 0 : 10) + m.moduleNum;
  const sectionAcc: Record<string, { correct: number; total: number }> = {};
  for (const sec of SAT_SECTION_ORDER) {
    const v = agg.section.get(sec);
    if (v) sectionAcc[sec] = { correct: v.c, total: v.t };
  }
  const pctOf = (c: number, t: number) => (t ? Math.round((100 * c) / t) : null);
  // Full domain → skill accuracy breakdown (for report-site domain cards)
  const breakdown = SAT_SECTION_ORDER.flatMap((sec) => {
    const dMap = agg.domain.get(sec);
    if (!dMap || dMap.size === 0) return [];
    const secCT = agg.section.get(sec) ?? ct();
    const cohortD = cohortDomain.get(sec);
    const skMap = agg.skill.get(sec);
    const cohortS = cohortSkill.get(sec);
    const domains = Object.keys(SAT_TAXONOMY[sec].domains).flatMap((key) => {
      const v = dMap.get(key);
      if (!v) return [];
      const co = cohortD?.get(key);
      const skills = [...(skMap?.entries() ?? [])]
        .filter(([k]) => k.split(" ▸ ")[0] === key)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, sv]) => {
          const cs = cohortS?.get(k);
          return {
            skill: k.split(" ▸ ")[1] ?? k,
            correct: sv.c,
            total: sv.t,
            ratePct: pctOf(sv.c, sv.t),
            cohortPct: cs ? pctOf(cs.c, cs.t) : null,
          };
        });
      return [
        {
          domain: domainLabel(sec, key),
          correct: v.c,
          total: v.t,
          ratePct: pctOf(v.c, v.t),
          cohortPct: co ? pctOf(co.c, co.t) : null,
          skills,
        },
      ];
    });
    return [
      {
        section: SAT_TAXONOMY[sec].label,
        sectionKey: sec,
        correct: secCT.c,
        total: secCT.t,
        ratePct: pctOf(secCT.c, secCT.t),
        domains,
      },
    ];
  });
  return {
    exam: examTitle,
    student: {
      id: agg.studentId,
      name: p?.full_name ?? null,
      email: p?.email ?? null,
    },
    totals: { correct: agg.totalCorrect, total: agg.totalQuestions },
    scaledScore: scaled
      ? { total: scaled.total, rw: scaled.rw, math: scaled.math }
      : null,
    sectionAccuracy: sectionAcc,
    breakdown,
    modules: [...agg.modules]
      .sort((a, b) => modOrder(a) - modOrder(b))
      .map((m) => ({
        label: m.moduleLabel,
        score: m.score,
        total: m.total,
        status: m.status, // "submitted" | "expired"
        durationSec: m.durationSec != null ? Math.round(m.durationSec) : null,
      })),
    wrongCatCounts: {
      careless: agg.carelessCount, // wrong in <30s — likely rushed/slip
      struggle: agg.struggleCount,
      conceptual: agg.conceptualCount, // wrong despite >=2min or well above cohort median
    },
    wrongByDifficulty: Object.fromEntries(agg.wrongByDifficulty),
    weakSkills: buildSkillStats(agg, cohortSkill).map((s) => ({
      skill: s.label,
      correct: s.c,
      total: s.t,
      ratePct: Math.round(s.rate * 100),
      cohortPct: Math.round(s.cohortRate * 100),
      deltaPp: Math.round(s.delta * 100),
      wrongBreakdown: { conceptual: s.conceptual, struggle: s.struggle, careless: s.careless },
      missedByDifficulty: Object.fromEntries(s.diffMix),
      eliminatedCorrectCount: s.elimCorrect, // eliminated the right answer, then missed
      narrowedTo5050Count: s.elim5050, // narrowed to 2 options, then missed
    })),
    guessFindings: agg.guessFindings.map((g) => ({
      module: g.module,
      kind: g.kind, // end_rush | rapid_run | letter_streak
      evidence: g.evidence,
      wrongInPattern: g.wrongInPattern,
    })),
    timeManagementFlag: agg.timeManagementFlag,
    // expired modules WITHOUT any guessing pattern — used full time reviewing; a positive, not a weakness
    cleanExpiredModules: agg.cleanExpiredModules,
    eliminationExamples: agg.elimExamples,
    edenChats: agg.chatRecords,
  };
}

// ── Renderers ──────────────────────────────────────────────────────────────────
function domainLabel(section: SectionKey, key: string): string {
  return SAT_TAXONOMY[section]?.domains[key]?.label ?? key;
}

function renderStudent(
  agg: StudentAgg,
  p: Profile | undefined,
  scaled: ScaledScore | null,
  cohortDomain: Map<SectionKey, Map<string, CT>>,
  cohortSkill: Map<SectionKey, Map<string, CT>>,
  domainMedian: Map<string, number>,
): string {
  const L: string[] = [];
  const name = p?.full_name ?? "(unknown)";
  L.push(`# ${name} — SAT 모의고사 결과 분석`);
  L.push("");
  if (scaled && (scaled.total != null || scaled.rw != null || scaled.math != null)) {
    L.push(renderScoreHero(scaled));
    L.push("");
  }
  L.push(`- 이메일: ${p?.email ?? "—"}`);
  L.push(
    `- 전체: **${agg.totalCorrect} / ${agg.totalQuestions}** (${pct(agg.totalCorrect, agg.totalQuestions)})`,
  );
  if (agg.hadExpiredModule)
    L.push(
      `- 시간초과(expired)로 종료된 모듈 있음 (시간을 끝까지 사용 — 찍기 패턴 여부는 아래 "풀이 습관 & 시간 관리" 참고)`,
    );
  L.push("");

  // Module scores
  L.push(`## 모듈별 점수`);
  L.push("");
  L.push(`| 모듈 | 점수 | 정답률 | 상태 | 소요시간 |`);
  L.push(`|---|---|---|---|---|`);
  const modOrder = (m: ModuleScore) =>
    (m.section === "reading_and_writing" ? 0 : 10) + m.moduleNum;
  for (const m of [...agg.modules].sort((a, b) => modOrder(a) - modOrder(b))) {
    const status = m.status === "expired" ? "⏱ 시간초과" : "제출";
    const dur = m.durationSec != null ? fmtMMSS(m.durationSec) : "—";
    L.push(
      `| ${m.moduleLabel} | ${m.score ?? "—"} / ${m.total ?? "—"} | ${pct(m.score ?? 0, m.total ?? 0)} | ${status} | ${dur} |`,
    );
  }
  L.push("");

  // Per-section domain & skill
  for (const sec of SAT_SECTION_ORDER) {
    const dMap = agg.domain.get(sec);
    if (!dMap || dMap.size === 0) continue;
    const sLabel = SAT_TAXONOMY[sec].label;
    const secCT = agg.section.get(sec) ?? ct();
    L.push(`## ${sLabel} — ${secCT.c}/${secCT.t} (${pct(secCT.c, secCT.t)})`);
    L.push("");
    L.push(`### 도메인별 정답률`);
    L.push("");
    L.push(`| 도메인 | 정답/문항 | 정답률 | 코호트 평균 |`);
    L.push(`|---|---|---|---|`);
    const cohortD = cohortDomain.get(sec);
    for (const key of Object.keys(SAT_TAXONOMY[sec].domains)) {
      const v = dMap.get(key);
      if (!v) continue;
      const co = cohortD?.get(key);
      const coStr = co ? pct(co.c, co.t) : "—";
      L.push(
        `| ${domainLabel(sec, key)} | ${v.c}/${v.t} | ${pct(v.c, v.t)} | ${coStr} |`,
      );
    }
    L.push("");

    // skills (only those attempted), grouped under domain order
    const skMap = agg.skill.get(sec);
    if (skMap && skMap.size) {
      L.push(`### 스킬별 정답률`);
      L.push("");
      L.push(`| 스킬 | 정답/문항 | 정답률 |`);
      L.push(`|---|---|---|`);
      // order by domain order then skill
      const ordered = [...skMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      for (const [k, v] of ordered) {
        const skillName = k.split(" ▸ ")[1] ?? k;
        const domKey = k.split(" ▸ ")[0];
        L.push(`| ${domainLabel(sec, domKey)} ▸ ${skillName} | ${v.c}/${v.t} | ${pct(v.c, v.t)} |`);
      }
      L.push("");
    }
  }

  // Timing analysis — wrong-answer time buckets
  const totalWrong = agg.wrongDetails.length;
  L.push(`## 풀이 시간 분석`);
  L.push("");
  L.push(`- 총 오답 ${totalWrong}문제를 풀이 시간으로 분류:`);
  L.push(
    `  - **부주의형** (<${CARELESS_SECONDS}초): ${agg.carelessCount}문제 — 빠르게 풀고 틀림(실수/성급)`,
  );
  L.push(`  - **일반형** (${CARELESS_SECONDS}~${OVER_INVESTED_SECONDS}초): ${agg.struggleCount}문제`);
  L.push(
    `  - **개념형** (≥${OVER_INVESTED_SECONDS}초 또는 충분히 쓰고도 오답): ${agg.conceptualCount}문제 — 시간 투자에도 틀림(개념 공백)`,
  );
  L.push("");

  // ── Weakness & recommendations ──────────────────────────────────────────────
  const weakSkills = buildSkillStats(agg, cohortSkill).slice(0, WEAK_SKILL_TOP_N);
  L.push(`## 취약점 및 학습 추천`);
  L.push("");

  // 1. core weak skills (type-level)
  L.push(`### 1. 핵심 취약 유형 (스킬 기준, 우선순위순)`);
  L.push("");
  if (weakSkills.length) {
    for (const s of weakSkills) {
      const dpp = Math.round(s.delta * 100);
      const dStr = dpp === 0 ? "±0" : dpp > 0 ? `+${dpp}` : `${dpp}`;
      L.push(
        `- **${s.label}** — 정답률 ${Math.round(s.rate * 100)}% (${s.c}/${s.t}), 코호트 ${Math.round(
          s.cohortRate * 100,
        )}% (Δ${dStr}%p)`,
      );
      L.push(`  - 오답 유형: 개념형 ${s.conceptual} / 일반 ${s.struggle} / 부주의 ${s.careless}`);
      if (s.diffMix.size) {
        const dm = [...s.diffMix.entries()].sort((a, b) => b[1] - a[1]).map(([d, n]) => `${d} ${n}`);
        L.push(`  - 오답 난이도: ${dm.join(" · ")}`);
      }
      if (s.elimCorrect || s.elim5050) {
        const bits = [];
        if (s.elimCorrect) bits.push(`정답 소거 ${s.elimCorrect}회`);
        if (s.elim5050) bits.push(`2개로 좁힌 뒤 오답 ${s.elim5050}회`);
        L.push(`  - 보기 소거 단서: ${bits.join(" · ")}`);
      }
      L.push(`  - 추천: ${skillRec(s)}`);
    }
  } else {
    L.push(`- 두드러진 취약 유형 없음 — 전반적으로 안정적.`);
  }
  L.push("");

  // 2. habits & time management
  L.push(`### 2. 풀이 습관 & 시간 관리`);
  L.push("");
  if (agg.guessFindings.length) {
    L.push(`- ⚠️ 찍기/시간압박 패턴 감지:`);
    for (const g of [...agg.guessFindings].sort((a, b) => b.severity - a.severity)) {
      const kindLabel =
        g.kind === "end_rush" ? "모듈 후반 급함" : g.kind === "rapid_run" ? "연속 급속 처리" : "같은 보기 연속";
      L.push(`  - [${g.module}] ${kindLabel}: ${g.evidence}`);
    }
  } else if (agg.cleanExpiredModules.length) {
    L.push(
      `- 시간초과 모듈(${agg.cleanExpiredModules.join(", ")})이 있으나 찍기 패턴 없음 — **시간을 끝까지 활용해 검토한 것으로 보임(약점 아님)**.`,
    );
  } else {
    L.push(`- 시간 관리 양호 — 찍기/급속 처리 패턴 없음.`);
  }
  if (agg.carelessCount >= 3)
    L.push(
      `- 부주의 오답(<${CARELESS_SECONDS}초) ${agg.carelessCount}문제 — 문제를 끝까지 읽고 보기 소거를 습관화하면 실점 감소 가능.`,
    );
  L.push("");

  // 3. Eden tutor transcripts (wrong + chat present)
  if (agg.chatPicks.length) {
    L.push(`### 3. Eden 튜터 대화 (오답 중 발췌)`);
    L.push("");
    for (const c of agg.chatPicks) {
      const catLabel = c.cat === "conceptual" ? "개념형" : c.cat === "careless" ? "부주의형" : "일반형";
      L.push(`**${c.skillLabel}** (${c.difficulty ?? "—"}, ${catLabel} 오답)`);
      L.push("");
      L.push(renderChat(c.messages));
      L.push("");
    }
  }

  // 4. coach comment placeholder (filled by LLM layer)
  L.push(`## 모의고사 결과에 따른 향후 학습 전략`);
  L.push("");
  L.push(`<!-- COACH_COMMENT -->`);
  L.push("");

  return L.join("\n");
}

// Score banner mimicking the previous HTML score-report design
// (blue gradient header + RW/Math cards). Inline styles so it renders
// in any HTML-passthrough markdown viewer.
function renderScoreHero(s: ScaledScore): string {
  const card = (label: string, v: number | null) => `
    <div style="flex:1;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:10px 16px;">
      <div style="font-size:12px;opacity:.85;font-weight:600;">${label}</div>
      <div style="font-size:28px;font-weight:800;line-height:1.2;">${v ?? "—"}<span style="font-size:14px;font-weight:600;opacity:.7;"> /800</span></div>
    </div>`;
  return `<div style="background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;border-radius:14px;padding:20px 26px;margin:6px 0 18px;">
  <div style="font-size:13px;opacity:.85;letter-spacing:.3px;">총점</div>
  <div style="display:flex;align-items:baseline;gap:10px;">
    <span style="font-size:44px;font-weight:800;line-height:1.1;">${s.total ?? "—"}</span>
    <span style="font-size:18px;font-weight:600;opacity:.8;">/ 1600</span>
  </div>
  <div style="display:flex;gap:14px;margin-top:14px;">${card("Reading &amp; Writing", s.rw)}${card("Math", s.math)}
  </div>
</div>`;
}

// per-skill study recommendation phrasing based on careless-vs-conceptual mix
function skillRec(s: SkillStat): string {
  if (s.elimCorrect >= 2) return `정답 보기를 잘못 소거 — 개념 정의·정답 근거 다시 정리`;
  if (s.conceptual >= Math.max(2, s.wrong * 0.5)) return `개념 복습 우선 (시간 투자에도 오답)`;
  if (s.careless >= Math.max(2, s.wrong * 0.5)) return `개념보다 정확도 — 천천히 끝까지 읽기 + 소거`;
  return `유형 문제 반복 훈련`;
}

// Render an Eden chat transcript as blockquote (length-capped, mid-truncated if long)
function renderChat(messages: ChatMsg[]): string {
  const cap = (s: string) => {
    const one = s.replace(/\s+/g, " ").trim();
    return one.length > 280 ? one.slice(0, 280) + "…" : one;
  };
  let msgs = messages;
  if (msgs.length > 6) msgs = [...msgs.slice(0, 2), { role: "_omit", content: "…(중략)…" }, ...msgs.slice(-2)];
  return msgs
    .map((m) => {
      if (m.role === "_omit") return `> ${m.content}`;
      const who = m.role === "user" ? "**학생:**" : "**튜터:**";
      return `> ${who} ${cap(m.content)}`;
    })
    .join("\n>\n");
}

function renderSummaryTSV(
  students: Map<string, StudentAgg>,
  profileById: Map<string, Profile>,
  cohortSkill: Map<SectionKey, Map<string, CT>>,
): string {
  // RW domain keys & math domain keys
  const rwDomains = Object.keys(SAT_TAXONOMY.reading_and_writing.domains);
  const mathDomains = Object.keys(SAT_TAXONOMY.math.domains);
  const header = [
    "이름",
    "이메일",
    "RW M1",
    "RW M2",
    "Math M1",
    "Math M2",
    "RW 정답수",
    "Math 정답수",
    "총점(정답수)",
    "총문항",
    ...rwDomains.map((k) => `RW:${SAT_TAXONOMY.reading_and_writing.domains[k].label}`),
    ...mathDomains.map((k) => `Math:${SAT_TAXONOMY.math.domains[k].label}`),
    "시간초과모듈",
    "부주의오답수",
    "개념형오답수",
    "시간관리플래그",
    "최약스킬",
    "최약스킬정답률",
  ];
  const rows: string[] = [header.join("\t")];

  const sorted = [...students.values()].sort((a, b) =>
    (profileById.get(a.studentId)?.full_name ?? "").localeCompare(
      profileById.get(b.studentId)?.full_name ?? "",
      "ko",
    ),
  );
  function modScore(agg: StudentAgg, section: SectionKey, num: number): string {
    const m = agg.modules.find((m) => m.section === section && m.moduleNum === num);
    if (!m) return "";
    return m.status === "expired" ? `${m.score}*` : `${m.score}`;
  }
  for (const agg of sorted) {
    const p = profileById.get(agg.studentId);
    const rwCT = agg.section.get("reading_and_writing") ?? ct();
    const mCT = agg.section.get("math") ?? ct();
    const dRW = agg.domain.get("reading_and_writing");
    const dM = agg.domain.get("math");
    const cell = (m: Map<string, CT> | undefined, k: string) => {
      const v = m?.get(k);
      return v ? `${v.c}/${v.t}` : "";
    };
    const topWeak = buildSkillStats(agg, cohortSkill)[0];
    rows.push(
      [
        p?.full_name ?? agg.studentId.slice(0, 8),
        p?.email ?? "",
        modScore(agg, "reading_and_writing", 1),
        modScore(agg, "reading_and_writing", 2),
        modScore(agg, "math", 1),
        modScore(agg, "math", 2),
        String(rwCT.c),
        String(mCT.c),
        String(rwCT.c + mCT.c),
        String(agg.totalQuestions),
        ...rwDomains.map((k) => cell(dRW, k)),
        ...mathDomains.map((k) => cell(dM, k)),
        agg.hadExpiredModule ? "Y" : "",
        String(agg.carelessCount),
        String(agg.conceptualCount),
        agg.timeManagementFlag ? "Y" : "",
        topWeak?.label ?? "",
        topWeak ? `${Math.round(topWeak.rate * 100)}%` : "",
      ].join("\t"),
    );
  }
  rows.push("");
  rows.push(
    "주: 모듈 점수의 * 표시 = 시간초과(expired) 종료. 도메인 셀 = 정답수/문항수. 시간관리플래그 = 찍기/급속처리 패턴 감지(시간초과 자체는 플래그 아님).",
  );
  return rows.join("\n");
}

function renderCohort(
  title: string,
  students: Map<string, StudentAgg>,
  cohortDomain: Map<SectionKey, Map<string, CT>>,
  cohortSkill: Map<SectionKey, Map<string, CT>>,
  domainMedian: Map<string, number>,
): string {
  const L: string[] = [];
  L.push(`# 코호트 요약 — ${title}`);
  L.push("");
  let totC = 0,
    totT = 0;
  for (const [, a] of students) {
    totC += a.totalCorrect;
    totT += a.totalQuestions;
  }
  L.push(`- 분석 학생 수: ${students.size}`);
  L.push(`- 전체 정답률: ${totC}/${totT} (${pct(totC, totT)})`);
  {
    let flagged = 0,
      cleanExpired = 0,
      careless = 0,
      conceptual = 0;
    for (const [, a] of students) {
      if (a.timeManagementFlag) flagged++;
      if (!a.timeManagementFlag && a.cleanExpiredModules.length) cleanExpired++;
      careless += a.carelessCount;
      conceptual += a.conceptualCount;
    }
    L.push(
      `- 시간관리 플래그(찍기/급속처리 패턴 감지): ${flagged}명 · 시간초과지만 패턴 없음(끝까지 활용): ${cleanExpired}명`,
    );
    L.push(`- 오답 유형 합계: 부주의형 ${careless} · 개념형 ${conceptual}`);
  }
  L.push("");
  for (const sec of SAT_SECTION_ORDER) {
    L.push(`## ${SAT_TAXONOMY[sec].label} — 도메인별 코호트 평균`);
    L.push("");
    L.push(`| 도메인 | 정답률 | 평균 풀이시간(중앙값) |`);
    L.push(`|---|---|---|`);
    const cd = cohortDomain.get(sec);
    for (const key of Object.keys(SAT_TAXONOMY[sec].domains)) {
      const v = cd?.get(key);
      if (!v) continue;
      const med = domainMedian.get(key);
      L.push(
        `| ${domainLabel(sec, key)} | ${pct(v.c, v.t)} (${v.c}/${v.t}) | ${med != null ? fmtMMSS(med) : "—"} |`,
      );
    }
    L.push("");
    L.push(`### 스킬별 코호트 평균`);
    L.push("");
    L.push(`| 스킬 | 정답률 |`);
    L.push(`|---|---|`);
    const cs = cohortSkill.get(sec);
    if (cs) {
      for (const [k, v] of [...cs.entries()].sort((a, b) => a[1].c / a[1].t - b[1].c / b[1].t)) {
        const skillName = k.split(" ▸ ")[1] ?? k;
        const domKey = k.split(" ▸ ")[0];
        L.push(`| ${domainLabel(sec, domKey)} ▸ ${skillName} | ${pct(v.c, v.t)} (${v.c}/${v.t}) |`);
      }
    }
    L.push("");
  }
  return L.join("\n");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

````

## 부록 B. build-score-reports.mjs (HTML 생성기)

````js
// Build printable HTML score reports from the per-student markdown analysis files.
//
// Inputs (under C:\Users\kwoo3\Downloads\test-reports):
//   - [2026 June] SuperfastSAT Full-Length Test #2\*.md   (all students)
//   - [2026 June] SuperfastSAT Full-Length Test #1\제나.md (only 제나)
// Output:
//   - C:\Users\kwoo3\Downloads\score-reports\<name>.html  (one per student)
//   - C:\Users\kwoo3\Downloads\score-reports\index.html   (roster)
//
// Scoring: raw correct -> SAT scaled score (200-800) via piecewise-linear
// interpolation through realistic anchor points (non-linear overall curve).

import fs from 'node:fs'
import path from 'node:path'

const DOWNLOADS = 'C:\\Users\\kwoo3\\Downloads'
const REPORTS_ROOT = path.join(DOWNLOADS, 'test-reports')
const TEST2_DIR = path.join(REPORTS_ROOT, '[2026 June] SuperfastSAT Full-Length Test #2')
const TEST1_DIR = path.join(REPORTS_ROOT, '[2026 June] SuperfastSAT Full-Length Test #1')
const OUT_DIR = path.join(DOWNLOADS, 'score-reports')

// ---------------------------------------------------------------------------
// Scoring curve
// ---------------------------------------------------------------------------

const RW_ANCHORS = [
  [0, 200], [5, 270], [10, 330], [15, 390], [20, 450], [25, 500],
  [30, 550], [33, 580], [36, 610], [39, 640], [42, 670], [45, 700],
  [48, 730], [50, 750], [52, 775], [54, 800],
]

const MATH_ANCHORS = [
  [0, 200], [4, 260], [8, 320], [12, 380], [16, 440], [20, 500],
  [24, 550], [28, 600], [32, 650], [36, 700], [38, 725], [40, 750],
  [42, 775], [44, 800],
]

const SECTION_MAX = { rw: 54, math: 44 }

// Domain -> subject mapping (mirrors src/lib/processData.js).
const RW_DOMAINS = [
  'Information and Ideas',
  'Craft and Structure',
  'Expression of Ideas',
  'Standard English Conventions',
]
const MATH_DOMAINS = [
  'Algebra',
  'Advanced Math',
  'Problem-Solving and Data Analysis',
  'Geometry and Trigonometry',
]

// A subject counts as "taken" only if its modules exist AND total spent time
// >= 10 minutes. Otherwise it is treated as not attempted and wiped.
const TAKEN_MIN_SECS = 10 * 60

function subjectModules(modules, key) {
  const re = key === 'rw' ? /^RW\b/i : /^Math\b/i
  return modules.filter((m) => re.test(m.name))
}

function subjectTimeSecs(mods) {
  let total = 0
  for (const m of mods) {
    const mm = String(m.time).match(/(\d+):(\d+)/)
    if (mm) total += Number(mm[1]) * 60 + Number(mm[2])
  }
  return total
}

function isSubjectTaken(modules, key) {
  const mods = subjectModules(modules, key)
  return mods.length > 0 && subjectTimeSecs(mods) >= TAKEN_MIN_SECS
}

function interp(raw, anchors) {
  if (raw <= anchors[0][0]) return anchors[0][1]
  const last = anchors[anchors.length - 1]
  if (raw >= last[0]) return last[1]
  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i]
    const [x1, y1] = anchors[i + 1]
    if (raw >= x0 && raw <= x1) {
      const t = (raw - x0) / (x1 - x0)
      return y0 + t * (y1 - y0)
    }
  }
  return last[1]
}

// raw -> scaled, rounded to nearest 10, clamped 200..800
function scaleScore(raw, section) {
  const anchors = section === 'rw' ? RW_ANCHORS : MATH_ANCHORS
  const v = interp(raw, anchors)
  const rounded = Math.round(v / 10) * 10
  return Math.min(800, Math.max(200, rounded))
}

// ---------------------------------------------------------------------------
// Markdown parsing
// ---------------------------------------------------------------------------

// Return the text block for a `## ` section identified by a heading prefix.
function sectionByPrefix(md, prefix) {
  const lines = md.split(/\r?\n/)
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## ') && lines[i].slice(3).trim().startsWith(prefix)) {
      start = i
      break
    }
  }
  if (start === -1) return null
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { end = i; break }
  }
  return { heading: lines[start].slice(3).trim(), body: lines.slice(start + 1, end).join('\n') }
}

// Split a section body into `### ` subsections -> { title: bodyText }
function subsections(body) {
  const lines = body.split(/\r?\n/)
  const out = {}
  let cur = null
  let buf = []
  const flush = () => { if (cur !== null) out[cur] = buf.join('\n'); buf = [] }
  for (const line of lines) {
    if (line.startsWith('### ')) { flush(); cur = line.slice(4).trim() }
    else buf.push(line)
  }
  flush()
  return out
}

// Parse markdown table rows -> array of cell arrays (skips header + separator).
function parseTable(text) {
  if (!text) return []
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t.startsWith('|')) continue
    if (/^\|[\s|:-]+\|?$/.test(t)) continue // separator
    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
    rows.push(cells)
  }
  // Drop header row (first data row is the column titles like 모듈/점수...)
  return rows.length ? rows.slice(1) : []
}

function splitFrac(s) {
  const m = (s || '').split(/\s*\/\s*/)
  return { correct: Number(m[0]), total: Number(m[1]) }
}

function parseSection(md, prefix) {
  const sec = sectionByPrefix(md, prefix)
  if (!sec) return null
  const headMatch = sec.heading.match(/(\d+)\/(\d+)/)
  const correct = headMatch ? Number(headMatch[1]) : 0
  const total = headMatch ? Number(headMatch[2]) : 0
  const subs = subsections(sec.body)
  const domainText = subs['도메인별 정답률'] || ''
  const skillText = subs['스킬별 정답률'] || ''
  const domains = parseTable(domainText).map((c) => {
    const f = splitFrac(c[1])
    return { name: c[0], correct: f.correct, total: f.total, pct: c[2] || '', cohort: c[3] || '' }
  })
  const skills = parseTable(skillText).map((c) => {
    const f = splitFrac(c[1])
    return { name: c[0], correct: f.correct, total: f.total, pct: c[2] || '' }
  })
  return { correct, total, domains, skills }
}

function parseMd(md) {
  const nameMatch = md.match(/^#\s+(.+?)\s+—/m)
  const name = nameMatch ? nameMatch[1].trim() : '(unknown)'
  const emailMatch = md.match(/이메일:\s*(\S+)/)
  const email = emailMatch ? emailMatch[1] : ''
  const totalMatch = md.match(/전체:\s*\*\*(\d+)\s*\/\s*(\d+)\*\*\s*\((\d+)%\)/)
  const totalRaw = totalMatch ? Number(totalMatch[1]) : 0
  const totalQ = totalMatch ? Number(totalMatch[2]) : 0
  const totalPct = totalMatch ? Number(totalMatch[3]) : 0
  const hasExpired = md.includes('시간초과(expired)로 종료된 모듈 있음')

  // Modules table
  const modSec = sectionByPrefix(md, '모듈별 점수')
  const modules = modSec
    ? parseTable(modSec.body).map((c) => {
        const f = splitFrac(c[1])
        return { name: c[0], correct: f.correct, total: f.total, pct: c[2] || '', status: c[3] || '', time: c[4] || '' }
      })
    : []

  const rw = parseSection(md, 'Reading and Writing')
  const math = parseSection(md, 'Math')

  const timeSec = sectionByPrefix(md, '풀이 시간 분석')
  const recSec = sectionByPrefix(md, '취약점 및 학습 추천')
  const coachSec = sectionByPrefix(md, '모의고사 결과에 따른 향후 학습 전략')

  // The deep LLM coach comment is the body of the 향후 학습 전략 section, but only
  // if it has been written (the analysis script seeds it with a placeholder comment).
  let coachMd = coachSec ? coachSec.body.trim() : ''
  if (coachMd.includes('COACH_COMMENT') || coachMd === '') coachMd = ''

  return {
    name, email, totalRaw, totalQ, totalPct, hasExpired,
    modules, rw, math,
    timeMd: timeSec ? timeSec.body.trim() : '',
    recMd: recSec ? recSec.body.trim() : '',
    coachMd,
  }
}

// ---------------------------------------------------------------------------
// Cohort averages (from _summary.tsv)
// ---------------------------------------------------------------------------

function parseSummaryTsv(file) {
  if (!fs.existsSync(file)) return []
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/).filter((l) => l.includes('\t'))
  const header = lines[0].split('\t')
  const idx = (name) => header.indexOf(name)
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split('\t')
    if (cells.length < 3) continue
    rows.push({
      name: cells[idx('이름')],
      rwM1: cells[idx('RW M1')],
      rwM2: cells[idx('RW M2')],
      mathM1: cells[idx('Math M1')],
      mathM2: cells[idx('Math M2')],
      rwCorrect: Number(cells[idx('RW 정답수')]),
      mathCorrect: Number(cells[idx('Math 정답수')]),
      total: Number(cells[idx('총점(정답수)')]),
    })
  }
  return rows
}

const has = (v) => v != null && String(v).trim() !== ''
const isTestAccount = (name) => /\(임시\)/.test(name) || /test/i.test(name)

function cohortAverages(rows) {
  const valid = rows.filter((r) => !isTestAccount(r.name) && r.total > 2)
  const rwRows = valid.filter((r) => has(r.rwM1) && has(r.rwM2))
  const mathRows = valid.filter((r) => has(r.mathM1) && has(r.mathM2))
  const avg = (arr, key) => (arr.length ? arr.reduce((s, r) => s + r[key], 0) / arr.length : null)
  return {
    rwRaw: avg(rwRows, 'rwCorrect'),
    mathRaw: avg(mathRows, 'mathCorrect'),
    n: valid.length,
  }
}

// ---------------------------------------------------------------------------
// HTML rendering
// ---------------------------------------------------------------------------

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fname(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

// Tiny markdown -> HTML for the time-analysis / recommendation blocks.
function mdToHtml(md) {
  const lines = md.split(/\r?\n/)
  let html = ''
  let inList = false
  let listIndentStack = []
  const closeAll = () => { while (listIndentStack.length) { html += '</li></ul>'; listIndentStack.pop() } ; inList = false }
  for (const raw of lines) {
    const line = raw.replace(/\t/g, '    ')
    const bulletMatch = line.match(/^(\s*)-\s+(.*)$/)
    if (bulletMatch) {
      const indent = bulletMatch[1].length
      let content = bulletMatch[2]
      content = esc(content)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
      if (!inList) { html += '<ul>'; listIndentStack = [indent]; inList = true }
      else if (indent > listIndentStack[listIndentStack.length - 1]) { html += '<ul>'; listIndentStack.push(indent) }
      else if (indent < listIndentStack[listIndentStack.length - 1]) {
        while (listIndentStack.length > 1 && indent < listIndentStack[listIndentStack.length - 1]) {
          html += '</li></ul>'; listIndentStack.pop()
        }
        html += '</li>'
      } else { html += '</li>' }
      html += `<li>${content}`
    } else if (line.trim() === '') {
      // skip blank
    } else {
      closeAll()
      let content = esc(line)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
      html += `<p>${content}</p>`
    }
  }
  if (inList) { while (listIndentStack.length) { html += '</li></ul>'; listIndentStack.pop() } }
  return html
}

function pctNum(s) {
  const m = String(s).match(/(\d+)%/)
  return m ? Number(m[1]) : null
}

function domainRows(domains) {
  return domains
    .map((d) => {
      const sp = pctNum(d.pct)
      const cp = pctNum(d.cohort)
      const below = sp != null && cp != null && sp < cp
      return `<tr class="${below ? 'below' : ''}">
        <td>${esc(d.name)}</td>
        <td class="num">${d.correct}/${d.total}</td>
        <td class="num">${esc(d.pct)}</td>
        <td class="num cohort">${esc(d.cohort || '—')}</td>
      </tr>`
    })
    .join('')
}

function skillRows(skills) {
  return skills
    .map((s) => `<tr>
        <td>${esc(s.name)}</td>
        <td class="num">${s.correct}/${s.total}</td>
        <td class="num">${esc(s.pct)}</td>
      </tr>`)
    .join('')
}

// Cap displayed module time to the section limit (RW 32:00, Math 35:00).
function capTime(name, time) {
  const m = String(time).match(/^(\d+):(\d+)$/)
  if (!m) return time
  const secs = Number(m[1]) * 60 + Number(m[2])
  const limit = /^RW\b/i.test(name) ? 32 * 60 : /^Math\b/i.test(name) ? 35 * 60 : null
  if (limit != null && secs > limit) {
    const mm = Math.floor(limit / 60)
    return `${mm}:00`
  }
  return time
}

function moduleRows(modules) {
  return modules
    .map((m) => {
      const expired = /시간초과/.test(m.status)
      const statusLabel = m.status.replace(/시간초과/g, '시간 종료 제출')
      return `<tr>
        <td>${esc(m.name)}</td>
        <td class="num">${m.correct} / ${m.total}</td>
        <td class="num">${esc(m.pct)}</td>
        <td class="${expired ? 'expired' : ''}">${esc(statusLabel)}</td>
        <td class="num">${esc(capTime(m.name, m.time))}</td>
      </tr>`
    })
    .join('')
}

// Compute a section's scaled score; only valid when both modules attempted.
function sectionScore(section, key) {
  if (!section) return { valid: false, scaled: null, raw: 0, total: 0 }
  const full = SECTION_MAX[key]
  if (section.total !== full) {
    return { valid: false, scaled: null, raw: section.correct, total: section.total }
  }
  return { valid: true, scaled: scaleScore(section.correct, key), raw: section.correct, total: section.total }
}

function scoreCard(label, key, secScore, cohortRaw) {
  if (!secScore.valid) {
    const note = secScore.note
      ? secScore.note
      : secScore.total === 0
        ? '미응시'
        : `1개 모듈만 응시 (${secScore.raw}/${secScore.total})`
    return `<div class="card incomplete">
      <div class="card-label">${label}</div>
      <div class="card-score">—</div>
      <div class="card-sub">${note}</div>
    </div>`
  }
  const cohortScaled = cohortRaw != null ? scaleScore(Math.round(cohortRaw), key) : null
  let cmp = ''
  if (cohortScaled != null) {
    const diff = secScore.scaled - cohortScaled
    const sign = diff > 0 ? '+' : ''
    const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : ''
    cmp = `<div class="card-cmp ${cls}">코호트 평균 ${cohortScaled} <span>(${sign}${diff})</span></div>`
  }
  return `<div class="card">
    <div class="card-label">${label}</div>
    <div class="card-score">${secScore.scaled}<span class="card-max">/800</span></div>
    <div class="card-sub">정답 ${secScore.raw}/${secScore.total}</div>
    ${cmp}
  </div>`
}

const CSS = `
:root{--ink:#1a2233;--muted:#6b7280;--line:#e5e7eb;--brand:#2563eb;--brand-d:#1e40af;--bg:#f8fafc;--good:#059669;--bad:#dc2626;--warn:#b45309;}
*{box-sizing:border-box}
body{font-family:'Segoe UI','Malgun Gothic',system-ui,sans-serif;color:var(--ink);background:var(--bg);margin:0;padding:24px;line-height:1.5;}
.sheet{max-width:880px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);}
.hdr{background:linear-gradient(135deg,var(--brand),var(--brand-d));color:#fff;padding:24px 28px;}
.hdr .exam{font-size:13px;opacity:.85;letter-spacing:.3px;}
.hdr h1{margin:4px 0 2px;font-size:26px;}
.hdr .email{font-size:13px;opacity:.85;}
.badge{display:inline-block;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:2px 10px;font-size:12px;margin-left:8px;vertical-align:middle;}
.badge.test{background:#fde68a;color:#7c2d12;border-color:#f59e0b;}
.total-row{display:flex;align-items:baseline;gap:14px;margin-top:14px;}
.total-row .total{font-size:40px;font-weight:800;line-height:1;}
.total-row .total .max{font-size:18px;font-weight:600;opacity:.8;}
.total-row .meta{font-size:13px;opacity:.9;}
.section{padding:20px 28px;border-top:1px solid var(--line);}
.section h2{font-size:15px;margin:0 0 12px;color:var(--brand-d);letter-spacing:.2px;}
.cards{display:flex;gap:16px;padding:20px 28px;}
.card{flex:1;border:1px solid var(--line);border-radius:12px;padding:16px;text-align:center;background:#fff;}
.card.incomplete{background:#f9fafb;color:var(--muted);}
.card-label{font-size:13px;color:var(--muted);font-weight:600;}
.card-score{font-size:38px;font-weight:800;color:var(--brand-d);margin:4px 0;}
.card-score .card-max{font-size:15px;color:var(--muted);font-weight:600;}
.card-sub{font-size:13px;color:var(--muted);}
.card-cmp{font-size:12px;margin-top:6px;color:var(--muted);}
.card-cmp.up{color:var(--good);} .card-cmp.down{color:var(--bad);}
.card-cmp span{font-weight:700;}
table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;}
th{color:var(--muted);font-weight:600;font-size:12px;background:#f9fafb;}
td.num,th.num{text-align:right;white-space:nowrap;}
td.cohort{color:var(--muted);}
tr.below td{background:#fff5f5;}
tr.below td:first-child::before{content:'▼ ';color:var(--bad);font-size:10px;}
.expired{color:var(--warn);font-weight:600;}
.sub-title{font-size:13px;font-weight:700;margin:14px 0 6px;color:var(--ink);}
.split{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.analysis ul{margin:6px 0;padding-left:20px;} .analysis li{margin:3px 0;font-size:13px;}
.analysis p{font-size:13px;margin:6px 0;}
.coach p{font-size:13.5px;line-height:1.7;margin:9px 0;}
.coach strong{color:var(--ink);}
.coach em{color:var(--brand-d);font-style:normal;background:#eef2ff;padding:0 3px;border-radius:3px;}
.foot{padding:14px 28px;color:var(--muted);font-size:11px;border-top:1px solid var(--line);}
@media print{
  body{background:#fff;padding:0;}
  .sheet{border:none;box-shadow:none;border-radius:0;max-width:none;}
  .section,.cards{break-inside:avoid;}
  .nav{display:none;}
}
@page{size:A4;margin:14mm;}
.nav{max-width:880px;margin:0 auto 12px;font-size:13px;}
.nav a{color:var(--brand);text-decoration:none;}
`

// Decide section scores + which subjects are "taken", excluding subjects with
// < 10 min total time. Used by both renderStudent and the index builder.
function computeScores(s) {
  const rwTaken = isSubjectTaken(s.modules, 'rw') && !!s.rw
  const mathTaken = isSubjectTaken(s.modules, 'math') && !!s.math

  const notTaken = (mods) => ({
    valid: false,
    scaled: null,
    raw: 0,
    total: 0,
    note: mods.length ? '미응시 (소요시간 10분 미만)' : '미응시',
  })

  const rwScore = rwTaken ? sectionScore(s.rw, 'rw') : notTaken(subjectModules(s.modules, 'rw'))
  const mathScore = mathTaken ? sectionScore(s.math, 'math') : notTaken(subjectModules(s.modules, 'math'))

  let totalScaled = null
  let totalNote = ''
  if (rwScore.valid && mathScore.valid) {
    totalScaled = rwScore.scaled + mathScore.scaled
  } else if (rwScore.valid || mathScore.valid) {
    totalScaled = (rwScore.valid ? rwScore.scaled : 0) + (mathScore.valid ? mathScore.scaled : 0)
    totalNote = ' · 부분 응시 (한 섹션만 산정)'
  }

  // Header totals from taken subjects only.
  let headerRaw = 0
  let headerQ = 0
  if (rwTaken && s.rw) { headerRaw += s.rw.correct; headerQ += s.rw.total }
  if (mathTaken && s.math) { headerRaw += s.math.correct; headerQ += s.math.total }
  const headerPct = headerQ ? Math.round((headerRaw / headerQ) * 100) : 0

  return {
    rwTaken, mathTaken, rwScore, mathScore,
    totalScaled, totalNote, headerRaw, headerQ, headerPct,
    anyTaken: rwTaken || mathTaken,
  }
}

// Remove recommendation bullets that reference a wiped subject; drop empty headers.
function keepRecBullet(b, removeDomains, removeLabel) {
  const boldMatch = b.match(/^\s*-\s+\*\*(.+?)\*\*/)
  if (boldMatch) {
    const term = boldMatch[1]
    if (term.includes('▸')) {
      const subj = term.split('▸')[0].trim()
      if (removeLabel && subj === removeLabel) return false
    } else if (removeDomains.includes(term.trim())) {
      return false
    }
  }
  return true
}

function scrubRecMd(md, removeDomains, removeLabel) {
  const lines = md.split(/\r?\n/)
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const headerMatch = line.match(/^\*\*(.+?):\*\*\s*$/)
    if (headerMatch) {
      const buf = []
      let j = i + 1
      while (j < lines.length && lines[j].trim() === '') j++
      while (j < lines.length && /^\s*-\s+/.test(lines[j])) { buf.push(lines[j]); j++ }
      const kept = buf.filter((b) => keepRecBullet(b, removeDomains, removeLabel))
      if (kept.length) { out.push(line, '', ...kept) }
      i = j
    } else {
      if (line.trim() !== '') out.push(line)
      i++
    }
  }
  return out.join('\n')
}

// Remove wiped-subject domain tokens from time-analysis sub-lines and recompute counts.
function scrubTimeMd(md, removeDomains) {
  const lines = md.split(/\r?\n/)
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const headMatch = line.match(/^(-\s+\*\*[^*]+\*\*[^:]*:\s*)(\d+)문제\s*$/)
    const next = lines[i + 1]
    if (headMatch && next && /^\s+-\s+/.test(next)) {
      const subRaw = next.replace(/^\s+-\s+/, '')
      const tokens = subRaw.split(/,\s*/).map((t) => {
        const m = t.match(/^(.+?)\s+(\d+)문제$/)
        return m ? { domain: m[1].trim(), n: Number(m[2]) } : { raw: t }
      })
      const kept = tokens.filter((t) => t.raw || !removeDomains.includes(t.domain))
      const sum = kept.reduce((acc, t) => acc + (t.n || 0), 0)
      if (kept.length === 0 || sum === 0) { i++; continue }
      out.push(`${headMatch[1]}${sum}문제`)
      out.push('  - ' + kept.map((t) => (t.raw ? t.raw : `${t.domain} ${t.n}문제`)).join(', '))
      i++
    } else if (/오답 난이도 분포/.test(line)) {
      // Whole-test aggregate; meaningless once a subject is wiped — drop it.
      continue
    } else {
      out.push(line)
    }
  }
  return out.join('\n')
}

function renderSubject(sec, label) {
  if (!sec) return ''
  const dom = sec.domains.length
    ? `<div class="sub-title">도메인별 정답률</div>
       <table><thead><tr><th>도메인</th><th class="num">정답/문항</th><th class="num">정답률</th><th class="num">코호트</th></tr></thead>
       <tbody>${domainRows(sec.domains)}</tbody></table>`
    : ''
  const skl = sec.skills.length
    ? `<div class="sub-title">스킬별 정답률</div>
       <table><thead><tr><th>스킬</th><th class="num">정답/문항</th><th class="num">정답률</th></tr></thead>
       <tbody>${skillRows(sec.skills)}</tbody></table>`
    : ''
  return `<div><h2>${label} — ${sec.correct}/${sec.total}</h2>${dom}${skl}</div>`
}

function renderStudent(s, cohort, examLabel) {
  const cs = computeScores(s)
  const { rwTaken, mathTaken, rwScore, mathScore, totalScaled, totalNote } = cs

  const testBadge = isTestAccount(s.name) ? '<span class="badge test">테스트 계정</span>' : ''

  // Only show modules for taken subjects.
  const shownModules = s.modules.filter((m) => {
    if (/^RW\b/i.test(m.name)) return rwTaken
    if (/^Math\b/i.test(m.name)) return mathTaken
    return true
  })
  const moduleTable = shownModules.length
    ? `<div class="section"><h2>모듈별 상세</h2>
        <table><thead><tr><th>모듈</th><th class="num">점수</th><th class="num">정답률</th><th>상태</th><th class="num">소요시간</th></tr></thead>
        <tbody>${moduleRows(shownModules)}</tbody></table></div>`
    : ''

  const subjects = (rwTaken || mathTaken)
    ? `<div class="section"><div class="split">
        ${rwTaken ? renderSubject(s.rw, 'Reading and Writing') : ''}
        ${mathTaken ? renderSubject(s.math, 'Math') : ''}
       </div></div>`
    : ''

  // Scrub wiped subject from analysis/recommendation text.
  const removeDomains = []
  let removeLabel = null
  if (!rwTaken) { removeDomains.push(...RW_DOMAINS); removeLabel = 'Reading and Writing' }
  if (!mathTaken) { removeDomains.push(...MATH_DOMAINS); removeLabel = 'Math' }

  const reword = (t) => t.replace(/시간초과/g, '시간 종료 제출')
  const recSrc = removeDomains.length ? scrubRecMd(s.recMd, removeDomains, removeLabel) : s.recMd
  const timeSrc = removeDomains.length ? scrubTimeMd(s.timeMd, removeDomains) : s.timeMd
  const timeBlock = timeSrc.trim() ? `<div class="section analysis"><h2>풀이 시간 분석</h2>${mdToHtml(reword(timeSrc))}</div>` : ''
  const recBlock = recSrc.trim() ? `<div class="section analysis"><h2>취약점 &amp; 학습 추천</h2>${mdToHtml(reword(recSrc))}</div>` : ''
  // Deep LLM coach comment (written aware of wiped subjects, so no scrubbing). When present,
  // it replaces the generic rule-based 취약점 추천 block.
  const coachBlock = s.coachMd && s.coachMd.trim()
    ? `<div class="section analysis coach"><h2>취약점 &amp; 학습 코멘트</h2>${mdToHtml(reword(s.coachMd))}</div>`
    : ''

  const totalDisplay = totalScaled != null
    ? `<span class="total">${totalScaled}<span class="max"> / 1600</span></span>`
    : `<span class="total">—<span class="max"> / 1600</span></span>`

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.name)} — SAT 모의고사 성적표</title><style>${CSS}</style></head>
<body>
<div class="nav"><a href="index.html">← 전체 목록</a></div>
<div class="sheet">
  <div class="hdr">
    <div class="exam">${esc(examLabel)}</div>
    <h1>${esc(s.name)} 성적표${testBadge}</h1>
    <div class="email">${esc(s.email)}</div>
    <div class="total-row">
      ${totalDisplay}
      <span class="meta">전체 정답 ${cs.headerRaw}/${cs.headerQ} (${cs.headerPct}%)${totalNote}${s.hasExpired ? ' · ⏱ 시간 종료 제출 모듈 있음' : ''}</span>
    </div>
  </div>
  <div class="cards">
    ${scoreCard('Reading &amp; Writing', 'rw', rwScore, cohort.rwRaw)}
    ${scoreCard('Math', 'math', mathScore, cohort.mathRaw)}
  </div>
  ${moduleTable}
  ${subjects}
  ${timeBlock}
  ${coachBlock || recBlock}
  <div class="foot">SuperfastSAT · 환산 점수는 비선형 곡선 근사로 산정된 추정치입니다 (참고용). 코호트 평균은 동일 회차 응시자 ${cohort.n}명 기준.</div>
</div>
</body></html>`
}

function renderIndex(entries, examNote) {
  const rows = entries
    .map((e) => {
      const t = e.totalScaled != null ? e.totalScaled : '—'
      const rw = e.rwScaled != null ? e.rwScaled : '—'
      const ma = e.mathScaled != null ? e.mathScaled : '—'
      return `<tr>
        <td><a href="${esc(e.file)}">${esc(e.name)}</a>${e.test ? ' <span class="t">(테스트)</span>' : ''}</td>
        <td class="num">${t}</td><td class="num">${rw}</td><td class="num">${ma}</td>
        <td class="num">${e.totalRaw}/${e.totalQ}</td>
      </tr>`
    })
    .join('')
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SAT 모의고사 성적표 — 전체 목록</title><style>${CSS}
.roster{max-width:880px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:14px;padding:24px 28px;}
h1{font-size:22px;color:var(--brand-d);}
.t{color:var(--muted);font-size:11px;}
a{color:var(--brand);text-decoration:none;} a:hover{text-decoration:underline;}
</style></head><body>
<div class="roster">
<h1>[2026 June] SuperfastSAT — 모의고사 성적표</h1>
<p style="color:var(--muted);font-size:13px;">${esc(examNote)} · 총 ${entries.length}명 · 총점 내림차순</p>
<table><thead><tr><th>이름</th><th class="num">총점</th><th class="num">RW</th><th class="num">Math</th><th class="num">정답수</th></tr></thead>
<tbody>${rows}</tbody></table>
</div></body></html>`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function collectMdFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => path.join(dir, f))
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const test2Cohort = cohortAverages(parseSummaryTsv(path.join(TEST2_DIR, '_summary.tsv')))
  const test1Cohort = cohortAverages(parseSummaryTsv(path.join(TEST1_DIR, '_summary.tsv')))

  const jobs = []
  for (const file of collectMdFiles(TEST2_DIR)) {
    jobs.push({ file, cohort: test2Cohort, examLabel: '[2026 June] SuperfastSAT Full-Length Test #2' })
  }
  jobs.push({
    file: path.join(TEST1_DIR, '제나.md'),
    cohort: test1Cohort,
    examLabel: '[2026 June] SuperfastSAT Full-Length Test #1',
  })

  const entries = []
  const skipped = []
  for (const job of jobs) {
    const md = fs.readFileSync(job.file, 'utf8')
    const s = parseMd(md)
    const cs = computeScores(s)

    // Exclude students who did not genuinely attempt either subject (< 10 min each).
    if (!cs.anyTaken) { skipped.push(s.name); continue }

    const html = renderStudent(s, job.cohort, job.examLabel)
    const outName = `${fname(s.name)}.html`
    fs.writeFileSync(path.join(OUT_DIR, outName), html, 'utf8')

    entries.push({
      name: s.name, file: outName,
      totalScaled: cs.totalScaled,
      rwScaled: cs.rwScore.valid ? cs.rwScore.scaled : null,
      mathScaled: cs.mathScore.valid ? cs.mathScore.scaled : null,
      totalRaw: cs.headerRaw, totalQ: cs.headerQ, test: isTestAccount(s.name),
    })
  }
  if (skipped.length) console.log(`Skipped (no subject ≥10min): ${skipped.join(', ')}`)

  entries.sort((a, b) => (b.totalScaled ?? -1) - (a.totalScaled ?? -1) || a.name.localeCompare(b.name, 'ko'))
  fs.writeFileSync(
    path.join(OUT_DIR, 'index.html'),
    renderIndex(entries, 'Test #2 전체 + Test #1 제나'),
    'utf8'
  )

  // NOTE: we intentionally do NOT delete here. fs.rmSync is unreliable on this
  // Downloads path (cloud/AV filter) and can hard-crash node. Stale orphan HTML
  // for excluded students is reported below and removed out-of-band.
  const keep = new Set(entries.map((e) => e.file).concat('index.html'))
  const orphans = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.html') && !keep.has(f))
  if (orphans.length) console.log(`Stale orphan HTML (delete manually): ${orphans.join(', ')}`)

  console.log(`Generated ${entries.length} reports + index.html in ${OUT_DIR}`)
  console.log(`Test#2 cohort: n=${test2Cohort.n}, RW avg raw=${test2Cohort.rwRaw?.toFixed(1)}, Math avg raw=${test2Cohort.mathRaw?.toFixed(1)}`)
  for (const e of entries.slice(0, 5)) {
    console.log(`  ${e.name}: total=${e.totalScaled} RW=${e.rwScaled} Math=${e.mathScaled}`)
  }
}

main()

````

## 부록 C. COACH-COMMENT-PROMPT.md (코치 코멘트 프롬프트)

````md
# Coach-Comment Prompt — Test Center per-exam report

Reusable spec for the LLM fan-out that writes the final coaching section of each student's
Test Center report. One agent per student. Style reference (gold standard): the final section
`## 모의고사 결과에 따른 향후 학습 전략` of `[2026 June] ... Test #2/김채윤.md`.

Pipeline context: `test2-result-analysis.ts` produces, per student, `<name>.md` (with the
placeholder `<!-- COACH_COMMENT -->`) and `_coach-input/<name>.json` (all signals below).
This prompt turns the JSON into the comment and writes it into the md.

---

## Per-student prompt (fill the {{...}} and hand one to each agent)

You are a SAT coach writing the final coaching section of {{STUDENT_NAME}}'s mock-exam report.

READ FULLY before writing:
1. `{{EXAM_DIR}}/_coach-input/{{STUDENT_NAME}}.json` — this student's complete data.
2. `{{EXAM_DIR}}/김채윤.md` — the final section only, as a STYLE reference (tone, structure,
   how numbers and Eden quotes are woven in). Do NOT copy its content.

### Input JSON fields you must use
- `scaledScore.{total,rw,math}` — the 1600/800 scores (may be null → use raw `totals`/`sectionAccuracy`).
- `sectionAccuracy.{reading_and_writing,math}.{correct,total}` — to identify the bottleneck section.
- `breakdown[].domains[].{domain,ratePct,cohortPct}` and `...skills[]` — domain/skill vs cohort.
- `weakSkills[]` — `{skill, ratePct, cohortPct, deltaPp, wrongBreakdown{conceptual,struggle,careless},
  missedByDifficulty, eliminatedCorrectCount, narrowedTo5050Count}`. These are the diagnoses.
- `wrongCatCounts.{careless,struggle,conceptual}` and `wrongByDifficulty` — for the habits paragraph.
- `modules[].{label,status,durationSec}` — `status:"expired"` = ran out of time.
- `guessFindings[]` — guessing patterns that COST wrong answers. Empty = no guessing.
- `cleanExpiredModules[]` — expired modules WITHOUT guessing (frame as strength, not weakness).
- `eliminationExamples[]` — narrowed-then-missed moments.
- `edenChats[]` — full tutor transcripts: `{skillLabel,difficulty,correct,timeSec,selected,
  correctLetter,messages[{role,content}]}`. Quote the STUDENT's own words (role:"user").

### What to write — structure (mirror 김채윤.md)
1. **One-paragraph 총평**: name the strength first, then the single clearest score bottleneck
   (which section, narrowed to 1–2 concrete skill themes). Use real numbers.
2. **2–3 bold-headed diagnoses** (`**1) ...**`), each:
   - cites accuracy + cohort delta from `weakSkills`/`breakdown` (e.g. "Transitions 2/5, 코호트 -31%p"),
   - **quotes the student's own Eden-chat words** verbatim (from `edenChats[].messages` role:user)
     when they reveal the gap (a vocabulary word they didn't know, a question they asked),
   - frames it as specific & fixable, not "weak reading" in general.
3. **시간 관리 / 풀이 습관** paragraph:
   - expired modules WITH no guessing (`cleanExpiredModules`, empty `guessFindings`) = **a strength**
     ("끝까지 검토에 시간을 썼다"), explicitly NOT a weakness.
   - mention careless count (`wrongCatCounts.careless`) only if ≥3, as a fixable habit.
   - if `guessFindings` is non-empty, name the pattern plainly (cost ≥2 wrong).

### HARD rules
- **No future study plans / weekly prescriptions / "X일 동안 Y하세요".** Diagnosis + habits ONLY
  (the student may sit the real SAT days later). The heading says 향후 전략 but content stays diagnostic.
- 합니다체. Address the student by name (given-name form, e.g. "채윤 학생").
- Signal-based only: every claim traces to a number or a quote in the JSON. No invented facts,
  no invented quotes. If a quote isn't in `edenChats`, don't use it.
- Quoting precision (audited):
  - Student quotes come ONLY from `edenChats[].messages` role:"user". You MAY silently fix an
    obvious typo (e.g. raw "eaning" → "meaning") but must not change wording or meaning.
  - You may quote a passage/question key term (from `edenChats[].question`/`passage`/`options`)
    to name what tripped the student — but attribute it as the item's wording, never as the
    student's words. Tie it to a real signal (e.g. that item was wrong / answered in N seconds).
  - When `edenChats` is empty (student didn't use the tutor), write the comment from numbers,
    `weakSkills`, `eliminationExamples`, and `guessFindings` only — use NO quotes.
- Edge case — module not actually attempted (e.g. `modules[].durationSec` a few seconds and
  score 0/total): say the section/module was effectively not taken and limit the analysis to the
  sections the student actually sat. Do not diagnose a 0% section as a skill weakness.
- Korean output. Keep Math praise proportional if Math is already strong; spend the words on the bottleneck.

### Output action
Replace the exact string `<!-- COACH_COMMENT -->` in `{{EXAM_DIR}}/{{STUDENT_NAME}}.md`
with your written section (markdown, bold sub-headings as in the reference). Edit only that placeholder.

For ENGLISH-page students (config `ENGLISH` list): also write the same comment, in English,
to `{{EXAM_DIR}}/{{STUDENT_NAME}}.en.md` (raw body, no heading).

---

## After the fan-out — 3-sample quality audit
Pick 3 finished reports and verify:
1. Every number in the comment matches the JSON (scores, ratePct, cohortPct, deltaPp).
2. Every quoted phrase actually appears in that student's `edenChats`.
3. No future study plan / weekly schedule leaked in.
4. No remaining `<!-- COACH_COMMENT -->` among non-excluded students.

````

## 부록 D. sat-taxonomy.ts (도메인/스킬 분류 헬퍼)

````ts
export type Section = "reading_and_writing" | "math";

export type Difficulty = "easy" | "medium" | "hard" | "challenging";

export const DIFFICULTIES: { value: Difficulty; label: string; stars: number }[] = [
  { value: "easy",        label: "Easy",        stars: 1 },
  { value: "medium",      label: "Medium",      stars: 2 },
  { value: "hard",        label: "Hard",        stars: 3 },
  { value: "challenging", label: "Challenging", stars: 4 },
];

export const DIFFICULTY_STARS = 4; // max stars

export interface DomainDef {
  label: string;
  skills: string[];
}

export interface SectionDef {
  label: string;
  domains: Record<string, DomainDef>;
}

export const SAT_TAXONOMY: Record<Section, SectionDef> = {
  reading_and_writing: {
    label: "Reading and Writing",
    domains: {
      information_and_ideas: {
        label: "Information and Ideas",
        skills: [
          "Central Ideas and Details",
          "Command of Evidence (Textual)",
          "Command of Evidence (Quantitative)",
          "Inferences",
        ],
      },
      craft_and_structure: {
        label: "Craft and Structure",
        skills: [
          "Words in Context",
          "Text Structure and Purpose",
          "Cross-Text Connections",
        ],
      },
      expression_of_ideas: {
        label: "Expression of Ideas",
        skills: [
          "Rhetorical Synthesis",
          "Transitions",
        ],
      },
      standard_english_conventions: {
        label: "Standard English Conventions",
        skills: [
          "Boundaries",
          "Form, Structure, and Sense",
        ],
      },
    },
  },
  math: {
    label: "Math",
    domains: {
      algebra: {
        label: "Algebra",
        skills: [
          "Linear equations in one variable",
          "Linear equations in two variables",
          "Linear functions",
          "Systems of two linear equations in two variables",
          "Linear inequalities in one or two variables",
        ],
      },
      advanced_math: {
        label: "Advanced Math",
        skills: [
          "Equivalent expressions",
          "Nonlinear equations in one variable and systems of equations in two variables",
          "Nonlinear functions",
        ],
      },
      problem_solving_and_data_analysis: {
        label: "Problem-Solving and Data Analysis",
        skills: [
          "Ratios, rates, proportional relationships, and units",
          "Percentages",
          "One-variable data: Distributions and measures of center and spread",
          "Two-variable data: Models and scatterplots",
          "Probability and conditional probability",
          "Inference from sample statistics and margin of error",
          "Evaluating statistical claims: Observational studies and experiments",
        ],
      },
      geometry_and_trigonometry: {
        label: "Geometry and Trigonometry",
        skills: [
          "Area and volume",
          "Lines, angles, and triangles",
          "Right triangles and trigonometry",
          "Circles",
        ],
      },
    },
  },
};

export function getDomains(section: Section): { key: string; label: string }[] {
  return Object.entries(SAT_TAXONOMY[section].domains).map(([key, d]) => ({
    key,
    label: d.label,
  }));
}

export function getSkills(section: Section, domainKey: string): string[] {
  return SAT_TAXONOMY[section]?.domains[domainKey]?.skills ?? [];
}

export function difficultyStars(value: Difficulty): string {
  const d = DIFFICULTIES.find((d) => d.value === value);
  if (!d) return "";
  return "★".repeat(d.stars) + "☆".repeat(DIFFICULTY_STARS - d.stars);
}

````

## 부록 E. answer-utils.ts (정답 판정 헬퍼)

````ts
/**
 * Utilities for handling correct_answer field.
 * MCQ stores a single label like "A".
 * Short answer can store multiple valid answers as a JSON array string: '["ans1","ans2"]'
 */

/** Parse correct_answer field into an array of valid answers. */
export function parseCorrectAnswers(raw: string): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((a: unknown) => String(a).trim()).filter(Boolean);
      }
    } catch {
      // not valid JSON — treat as single answer
    }
  }
  return [trimmed];
}

/** Check if a student answer matches any correct answer (case-insensitive). */
export function isAnswerCorrect(studentAnswer: string, correctAnswer: string): boolean {
  const validAnswers = parseCorrectAnswers(correctAnswer);
  const normalized = studentAnswer.trim().toLowerCase();
  return validAnswers.some((a) => a.trim().toLowerCase() === normalized);
}

/** Serialize an array of answers back to the correct_answer field value. */
export function serializeCorrectAnswers(answers: string[]): string {
  const filtered = answers.filter(Boolean);
  if (filtered.length === 0) return "";
  if (filtered.length === 1) return filtered[0];
  return JSON.stringify(filtered);
}

````
