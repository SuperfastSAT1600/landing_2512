# Study Hall 일일 학습 리포트 — 핸드오프 문서

> 이 문서 **하나만으로** 다른 로컬/다른 스택에서 Study Hall 일일 리포트 기능을 재현하거나 다른 페이지에 붙일 수 있도록 작성되었습니다. 백엔드는 **동일한 Supabase 프로젝트**를 그대로 사용합니다(데이터 이전 없음).
>
> 구성: §1~§11 = 스펙/가이드, **부록 A~E = 실제 동작 전체 코드**(그대로 복사해 사용 가능).

---

## 0. TL;DR (데이터 흐름)

```
Supabase (study_hall_unit_attempts 등)
   │  ① 분석 스크립트 (부록 A: study-hall-daily-analysis.ts)
   ▼
<name>.md  +  _coach-input/<name>.json     ← 학생×하루 단위 구조화 데이터(데이터 계약)
   │  ② 코치 코멘트 LLM fan-out (부록 C 프롬프트)  → md의 <!-- COACH_COMMENT --> 치환
   ▼
③ HTML 생성 (부록 B: build-study-reports.mjs)  → html/<name>.html
```

- **단위**: 학생 1명 × 하루(KST).
- **다른 페이지에 붙일 때**: ①의 데이터 추출 로직만 자기 백엔드로 가져와 **JSON 데이터 계약**(§5)을 만들고, 자기 UI로 렌더하면 됩니다. ③ HTML 생성기는 정적 산출/디자인 참고용입니다(§7, §9).

---

## 1. 목적 & 산출물

학생이 하루 동안 Study Hall에서 학습한 결과를 **진단 + 다음 학습 제안** 형태의 리포트로 만든다. 핵심 지표:

- 목표 vs 실제 **학습시간**(달성률)
- 그날 **누적 정답률**(correct/total)
- **도메인/스킬별** 정답률, 난이도 분포
- 학습한 **커리큘럼/레슨**
- **메타인지**(자신감-오답, 보기 소거, 해설 검토율 등)
- 본인 **일별 추세**(코호트 비교 아님)
- **코치 코멘트**(진단 + 다음 학습 제안)

검증 기준 샘플(이 문서 작성 시 실제 생성): `유지아 / 2026-06-18` → 학습시간 90/90분(100%), 정답률 34/46(74%), Eden 16건(모두 assistant).

---

## 2. 사전 준비 (환경)

- **런타임**: Node 18+ (스크립트 실행은 `npx tsx`, HTML 생성기는 순수 Node ESM).
- **deps**: `@supabase/supabase-js`, `dotenv` (분석 스크립트). HTML 생성기·로컬 서빙은 추가 deps 없음(`npx serve`만).
- **환경변수** (분석 스크립트가 `.env.local`에서 로드):

```bash
# .env.local  (스크립트와 같은 위치 또는 부록 A의 loadEnv 경로에 맞춰 배치)
NEXT_PUBLIC_SUPABASE_URL=<같은 Supabase 프로젝트 URL>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

> 🔑 **키 획득**: 기존 앱 리포지토리의 `app/.env.local`에서 복사하거나, Supabase 대시보드 → Project Settings → API → `service_role` secret.
> ⚠️ `service_role` 키는 **RLS를 우회**합니다. 서버/스크립트에서만 사용하고 **브라우저/클라이언트 번들에 절대 노출 금지**. 페이지에 붙일 때도 데이터 조회는 서버(Server Action / Route Handler / Edge)에서 수행하세요.

---

## 3. 데이터 소스 (라이브 Supabase 스키마)

> ⚠️ **마이그레이션 드리프트 주의**: 리포지토리의 `supabase/migrations`와 라이브 DB 스키마가 다릅니다. 아래는 **라이브에서 실제 검증된(probe)** 테이블/컬럼입니다. 이것을 기준으로 작성하세요.

```text
study_hall_unit_attempts            -- 문항 단위 ground truth (Study Hall)
  id, student_id, unit_id, original_unit_id, selected_answer, is_correct,
  time_spent_seconds, attempted_at, curriculum_id, lesson_id,
  eliminated_options (text[]), confidence_level (int 0|25|50|75|100),
  review_time_seconds (int), chat_messages (jsonb [{role,content}]),
  study_hall_session_id

study_hall_session                  -- 세션(학습시간 wall-clock 산출용)
  id, user_id, started_at, ended_at, scheduled_event_id, ended_reason
  -- 주의: student가 아니라 user_id 컬럼. 한 학생의 하루 세션들의 (ended-started) 합 = 실제 학습시간.

scheduled_events                    -- 목표 학습시간 (category='study_hall')
  id, category, title, starts_at, ends_at, curriculum_id, lesson_id, status, matching_id, ...
scheduled_event_participants
  event_id, user_id                 -- 학생 ↔ 이벤트 매핑

units                               -- 문제 분류 (variant 포함)
  id, section ('reading_and_writing'|'math'), domain (snake key), skill (label), difficulty
  -- variant 사본은 section/domain 등이 null일 수 있음 → original_unit_id로 폴백 조회.

curricula(id, title)   lessons(id, title)   profiles(id, full_name, email, role)
```

**도메인 snake key → 라벨 매핑**(헬퍼 없이도 데이터층 재현 가능하도록 인라인; 정본은 부록 D `sat-taxonomy.ts`):

```text
reading_and_writing:
  information_and_ideas        → Information and Ideas
  craft_and_structure          → Craft and Structure
  expression_of_ideas          → Expression of Ideas
  standard_english_conventions → Standard English Conventions
math:
  algebra                      → Algebra
  advanced_math                → Advanced Math
  problem_solving_and_data_analysis → Problem-Solving and Data Analysis
  geometry_and_trigonometry    → Geometry and Trigonometry
```
(정확한 key 문자열·skill 목록은 부록 D를 정본으로 사용. `units.skill`은 이미 사람이 읽는 라벨로 저장됨.)

---

## 4. 계산 로직 / 데이터 계약

모든 상수와 규칙(부록 A 코드와 일치):

```text
PAGE = 1000                 # supabase range 페이지 크기
TREND_DAYS = 7              # 추세에 보여줄 최근 활동일 수(오늘 포함)
MIN_N_FOR_WEAK = 3          # 취약 스킬로 잡기 위한 최소 문항수
WEAK_TOP_N = 5             # 취약 스킬 최대 표시 개수
CARELESS_SECONDS = 30       # 오답을 30초 미만에 → 부주의형
CONCEPTUAL_SECONDS = 120    # 오답에 120초 이상 → 개념형
CONFIDENT_LEVEL = 75        # confidence_level ≥ 75 → "확신"
REVIEWED_SECONDS = 3        # review_time_seconds ≥ 3 → 해설을 본 것으로 간주
```

규칙:
- **KST 날짜**: DB 타임스탬프는 timestamptz(UTC). 리포트의 "하루"는 KST. → `kstDate(ts) = (UTC + 9시간)의 yyyy-mm-dd`. 그날 학습 = `kstDate(attempted_at) === 대상날짜`.
- **정답률(그날 누적)**: 대상날짜의 `study_hall_unit_attempts` 중 `is_correct` true 비율. 코호트 비교 없음.
- **실제 학습시간**: `study_hall_session`에서 `user_id=학생` & `kstDate(started_at)=날짜`인 세션들의 `(ended_at||started_at - started_at)` 합(분).
- **목표 학습시간**: `scheduled_event_participants`로 학생의 event_id 수집 → `scheduled_events`에서 `category='study_hall'` & `kstDate(starts_at)=날짜`인 이벤트의 `(ends_at - starts_at)` 합(분). 없으면 null(목표 섹션 생략).
- **도메인/스킬 분해**: 각 attempt의 unit 메타(`section/domain/skill/difficulty`)를 집계. variant라 null이면 `original_unit_id`로 폴백.
- **타이밍 분류**(오답만): `time_spent_seconds<30`→careless, `≥120`→conceptual, 그 외/누락→normal.
- **메타인지**: `confidentWrong`=confidence≥75 & 오답, `lowConfCorrect`=confidence≤25 & 정답, `eliminationUsed`=eliminated_options 비어있지 않음, `reviewed/reviewableWrong`=오답 중 review_time≥3 비율.
- **취약 스킬**: n≥3인 스킬을 정답률 오름차순(동률은 n 많은 순) 상위 5.
- **추세**: 학생의 전체 attempt를 KST일자로 묶어 정답률, 대상날짜 이하 최근 7일.
- **Supabase `.in()` 청크 ≤ 120** (UUID 다수 필터 시 URL 16KB 한도 초과 방지).

---

## 5. 출력 JSON 스키마 (coach-input, 데이터 계약)

**이것이 "다른 페이지에 붙이기"의 핵심 계약**입니다. 부록 A가 학생별로 `_coach-input/<name>.json`을 이 형태로 생성합니다.

```jsonc
{
  "date": "2026-06-18",
  "student": { "id": "uuid", "name": "유지아", "email": "..." },
  "studyTime": { "goalMinutes": 90, "actualMinutes": 90, "attainmentPct": 100, "sessions": 1 },
  "totals": { "correct": 34, "total": 46, "accuracyPct": 74 },
  "curricula": [ { "curriculum": "Information and Ideas", "lesson": "Hard", "correct": 18, "total": 24, "ratePct": 75 } ],
  "breakdown": [
    { "section": "Reading and Writing", "sectionKey": "reading_and_writing", "correct": 34, "total": 46, "ratePct": 74,
      "domains": [
        { "domain": "Information and Ideas", "correct": 18, "total": 24, "ratePct": 75,
          "skills": [ { "skill": "Information and Ideas ▸ Inferences", "correct": 18, "total": 24, "ratePct": 75 } ] }
      ] }
  ],
  "weakSkills": [ { "skill": "Craft and Structure ▸ Text Structure and Purpose", "section": "reading_and_writing", "correct": 16, "total": 22, "ratePct": 73 } ],
  "difficultyMix": [ { "difficulty": "hard", "correct": 34, "total": 46 } ],
  "timing": { "careless": 0, "normal": 8, "conceptual": 4 },
  "metacognition": { "confidentWrong": 4, "lowConfCorrect": 14, "eliminationUsed": 13, "reviewed": 11, "reviewableWrong": 12 },
  "trend": [ { "date": "2026-06-16", "correct": 29, "total": 41, "accuracyPct": 71 }, { "date": "2026-06-18", "correct": 34, "total": 46, "accuracyPct": 74 } ],
  "edenChats": [ { "skillLabel": "Information and Ideas ▸ Inferences", "difficulty": "hard", "correct": false, "timeSec": 95, "selected": "B", "messages": [ { "role": "assistant", "content": "..." } ] } ]
}
```

---

## 6. 코치 코멘트 (LLM) — 정책 & 프롬프트

- **정책(Test Center와 의도적으로 반대)**: Study Hall은 매일 하는 형성평가 → **진단 + 다음 학습 제안**을 모두 포함. 비교 기준은 **본인 일별 추세**(코호트 아님). 톤은 격려·과정 중심.
- **생성 방식**: 학생 1명당 LLM 1회 호출. 입력 = 해당 학생의 `_coach-input/<name>.json`. 출력 = md의 `<!-- COACH_COMMENT -->` 자리(`## 오늘 학습 총평 및 다음 학습 제안` 섹션)에 치환.
- **무결성 규칙(중요)**: 모든 수치는 JSON 근거. 인용은 `edenChats`의 `role:"user"` 발화만(없으면 무인용). ⚠️ **Study Hall은 학생이 UI로 답하고 채팅 입력을 거의 안 해 `chat_messages`가 assistant 전용인 경우가 많음** → 인용 없이 숫자 기반으로 작성되는 게 정상.
- 전체 프롬프트 = **부록 C** (`STUDY-HALL-COMMENT-PROMPT.md`). 그대로 LLM에 전달하면 됨.
- **생성 후 감사**: 표본 1~3명에 대해 (1) 코멘트 수치가 JSON과 일치 (2) 인용이 실제 존재 (3) 다음 학습 제안이 그날 취약 스킬에 근거 (4) placeholder 잔존 없음.

---

## 7. 리포트 구성 & UI

섹션 순서(부록 B가 렌더하는 순서):

1. 헤더(날짜 + 학생명 + 이메일, 브랜드 그라데이션)
2. 카드 2개: **학습시간**(목표 대비 진행바 + 달성률), **그날 누적 정답률**
3. 학습한 커리큘럼/레슨 표
4. 섹션별(RW/Math) 도메인·스킬 정답률 표 (코호트 컬럼 없음)
5. 난이도 분포 표
6. 풀이 습관 & 메타인지(리스트)
7. 오늘의 취약 스킬
8. 최근 학습 추세(일별 정답률 막대)
9. **오늘 학습 총평 & 다음 학습 제안**(코치 코멘트)

UI 톤: Test Center 리포트와 동일 디자인 시스템(파란 그라데이션 헤더, 카드, 표, A4 인쇄 지원). 전체 CSS는 **부록 B**의 `CSS` 상수에 포함. `*italic*` → 하이라이트 `<em>`, `**bold**` → `<strong>`.

---

## 8. 실행 / 재현 단계

```bash
# 1) 분석: 학생×날짜 → md + _coach-input JSON  (학생 생략 시 그날 학습한 전원)
#    (부록 A를 scripts/study-hall-daily-analysis.ts 로 두고, 같은 위치에 .env.local)
npx tsx scripts/study-hall-daily-analysis.ts 2026-06-18 유지아
#    출력: <OUT_BASE>/<date>/<name>.md, _coach-input/<name>.json, _summary.tsv
#    OUT_BASE 기본값은 부록 A 상단 상수(OUT_BASE)에서 변경.

# 2) 코치 코멘트: 부록 C 프롬프트로 LLM 1회 → md의 <!-- COACH_COMMENT --> 치환

# 3) HTML: (부록 B를 build-study-reports.mjs 로 두고)
node build-study-reports.mjs 2026-06-18
#    출력: <date>/html/<name>.html + index.html

# 4) 로컬 확인
npx -y serve "<date>/html" -l 8898   # http://localhost:8898/<학생명>
```

> 활동한 날짜를 모르면: `study_hall_unit_attempts`에서 학생의 `attempted_at`을 KST일자로 그룹핑해 확인(부록 A의 로직과 동일).

---

## 9. 다른 페이지에 붙이기 (통합 가이드)

부록 A는 파일로 떨구는 CLI 스크립트이지만, **페이지 통합 시 필요한 것은 데이터 계약(§5)뿐**입니다.

1. **데이터 레이어**: 부록 A의 핵심 함수들(`fetchAllAttempts`, `actualStudyMinutes`, `goalStudyMinutes`, `buildStudent`)을 자기 백엔드(서버 전용)로 이식. `buildStudent(student, day)`가 §5 JSON을 반환하도록 되어 있음 → 그대로 API/Server Action의 응답으로 사용.
2. **렌더**: §5 JSON을 자기 컴포넌트로 렌더. 부록 B(HTML 생성기)의 섹션 구조/CSS를 React/JSX로 옮기면 동일 디자인 재현.
3. **코치 코멘트**: 같은 JSON을 부록 C 프롬프트에 넣어 LLM 1회 호출(서버에서). 결과 텍스트를 그대로 표시.
4. **주의**: service_role 조회는 반드시 서버. 클라이언트엔 §5 JSON과 코멘트 텍스트만 전달.

---

## 10. 엣지케이스 & 주의

- **Eden 인용 희소**: `chat_messages`가 assistant 전용 많음 → 코치 코멘트는 숫자 기반으로 충분히 작성 가능(프롬프트가 처리).
- **목표시간 없는 날**: `scheduled_events`에 study_hall 일정이 없으면 `goalMinutes=null` → 목표/달성률 생략(실제시간만 표시).
- **variant 문항**: `units`의 section/domain 등이 null이면 `original_unit_id`로 폴백(부록 A `unitMeta`).
- **KST 경계**: UTC+9 변환을 빠뜨리면 자정 근처 데이터가 옆 날짜로 샘. 반드시 `kstDate` 사용.
- **`.in()` 청크**: UUID 100~120개 초과 시 URL 한도 초과 에러(`UND_ERR_HEADERS_OVERFLOW`) → 청크 ≤120 유지.
- **세션 미종료**: `ended_at`이 null인 진행 중 세션은 학습시간 0으로 계산(부록 A). 필요시 `last_active_at` 기반으로 보정 가능.

---

## 11. 받는 사람용 검증 절차

1. **스키마 셀프체크**: `study_hall_unit_attempts`에서 `select('*').limit(1)` → 컬럼이 §3과 일치하는지 확인.
2. **수치 대조**: `유지아 / 2026-06-18`로 부록 A 실행 → 정답률 34/46(74%), 학습시간 90/90분, Eden 16건과 일치하는지 확인.
3. **HTML**: 부록 B로 생성 후 `npx serve`로 열어 §7 섹션이 모두 보이는지.
4. **코멘트 감사**: 부록 C로 1명 생성 → 수치/인용 JSON 대조(환각 0), 다음 학습 제안이 취약 스킬 기반인지.

---

# 부록 — 전체 코드 (그대로 복사 사용)

각 블록은 4-backtick 펜스로 감쌌습니다(내부 코드 펜스 충돌 방지). 파일명/경로는 자유롭게 배치 가능하나, 분석 스크립트는 `.env.local` 경로(부록 A 상단 `loadEnv`)와 헬퍼 import 경로만 맞추면 됩니다.

## 부록 A. study-hall-daily-analysis.ts (분석 스크립트)

````ts
/**
 * Study Hall DAILY per-student report extraction.
 *
 * For one KST day, for each student who studied in Study Hall, produces:
 *   - Goal vs actual study time (scheduled_events vs study_hall_session)
 *   - That day's cumulative accuracy (study_hall_unit_attempts ⨝ units)
 *   - Domain & skill accuracy, difficulty mix
 *   - Per curriculum/lesson breakdown
 *   - Timing categorization (careless / conceptual) from time_spent_seconds
 *   - Metacognition signals: confidence calibration, elimination use, explanation review
 *   - Day-over-day trend (recent active days)
 *   - Eden tutor chat excerpts (chat_messages) for quoting
 *
 * Live DB schema (drift — confirmed via probe):
 *   study_hall_unit_attempts(id, student_id, unit_id, original_unit_id, selected_answer,
 *     is_correct, time_spent_seconds, attempted_at, curriculum_id, lesson_id,
 *     eliminated_options, confidence_level, review_time_seconds, chat_messages, study_hall_session_id)
 *   study_hall_session(id, user_id, started_at, ended_at, scheduled_event_id, ended_reason)
 *   scheduled_events(id, category, starts_at, ends_at, curriculum_id, lesson_id, ...) + scheduled_event_participants(event_id, user_id)
 *   units(id, section, domain, skill, difficulty); curricula(id, title); lessons(id, title)
 *
 * Usage: cd app && npx tsx scripts/study-hall-daily-analysis.ts <YYYY-MM-DD> [studentName|--id=uuid]
 * Output: C:/Users/kwoo3/Downloads/study-reports/<YYYY-MM-DD>/<name>.md + _coach-input/<name>.json
 */
import * as path from "path";
import * as fs from "fs";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { SAT_TAXONOMY } from "../src/lib/sat-taxonomy";

loadEnv({ path: path.join(__dirname, "../.env.local") });
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env vars in app/.env.local");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const OUT_BASE = "C:/Users/kwoo3/Downloads/study-reports";
const PAGE = 1000;
const TREND_DAYS = 7;           // recent active days shown in trend
const MIN_N_FOR_WEAK = 3;       // min attempts in a skill before flagging
const WEAK_TOP_N = 5;
const CARELESS_SECONDS = 30;    // wrong in <30s → careless
const CONCEPTUAL_SECONDS = 120; // wrong in >=120s → conceptual
const CONFIDENT_LEVEL = 75;     // confidence >= this counts as "confident"
const REVIEWED_SECONDS = 3;     // review_time >= this → looked at the explanation

// ── KST helpers (DB timestamps are timestamptz/UTC; report day is KST) ──────────
const kstDate = (ts: string | null): string =>
  ts ? new Date(new Date(ts).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10) : "";

// ── taxonomy label maps ─────────────────────────────────────────────────────────
const DOMAIN_LABEL = new Map<string, string>();
const SECTION_OF_DOMAIN = new Map<string, string>();
const DOMAIN_ORDER: string[] = [];
for (const [secKey, sec] of Object.entries(SAT_TAXONOMY))
  for (const [k, d] of Object.entries((sec as any).domains)) {
    DOMAIN_LABEL.set(k, (d as any).label);
    SECTION_OF_DOMAIN.set(k, secKey);
    DOMAIN_ORDER.push(k);
  }
const SECTION_LABEL: Record<string, string> = {
  reading_and_writing: "Reading and Writing",
  math: "Math",
};
const SECTION_ORDER = ["reading_and_writing", "math"];
const domLabel = (d: string | null) => (d ? DOMAIN_LABEL.get(d) ?? d : "(기타)");
const secLabel = (s: string | null) => (s ? SECTION_LABEL[s] ?? s : "(기타)");

// ── unit metadata cache (section/domain/skill/difficulty) with variant fallback ──
type UnitMeta = { section: string | null; domain: string | null; skill: string | null; difficulty: string | null };
const unitsCache = new Map<string, UnitMeta | null>();
async function loadUnits(ids: string[]) {
  const missing = [...new Set(ids)].filter((id) => id && !unitsCache.has(id));
  for (let i = 0; i < missing.length; i += 120) {
    const chunk = missing.slice(i, i + 120);
    const { data, error } = await supabase
      .from("units").select("id, section, domain, skill, difficulty").in("id", chunk);
    if (error) throw error;
    const seen = new Set<string>();
    for (const u of data ?? []) {
      unitsCache.set(u.id, { section: u.section, domain: u.domain, skill: u.skill, difficulty: u.difficulty });
      seen.add(u.id);
    }
    for (const id of chunk) if (!seen.has(id)) unitsCache.set(id, null);
  }
}
function unitMeta(unitId: string, originalId: string | null): UnitMeta {
  let u = unitsCache.get(unitId);
  if ((!u || !u.section) && originalId) u = unitsCache.get(originalId);
  return u ?? { section: null, domain: null, skill: null, difficulty: null };
}

// ── types ───────────────────────────────────────────────────────────────────────
interface Attempt {
  unit_id: string; original_unit_id: string | null; selected_answer: string | null;
  is_correct: boolean | null; time_spent_seconds: number | null; attempted_at: string | null;
  curriculum_id: string | null; lesson_id: string | null;
  eliminated_options: string[] | null; confidence_level: number | null;
  review_time_seconds: number | null; chat_messages: any;
}

const pct = (c: number, t: number) => (t > 0 ? Math.round((1000 * c) / t) / 10 : 0);
const acc = (c: number, t: number) => (t > 0 ? Math.round((100 * c) / t) : 0);

// ── student resolution ────────────────────────────────────────────────────────
async function resolveStudent(): Promise<{ id: string; name: string; email: string } | null> {
  const args = process.argv.slice(3);
  const idArg = args.find((a) => a.startsWith("--id="))?.slice(5);
  if (idArg) {
    const { data } = await supabase.from("profiles").select("id, full_name, email").eq("id", idArg).limit(1);
    const p = data?.[0];
    return p ? { id: p.id, name: p.full_name, email: p.email } : null;
  }
  const name = args.find((a) => !a.startsWith("--"));
  if (!name) return null; // no student → all students that day
  const { data } = await supabase.from("profiles").select("id, full_name, email, role").eq("full_name", name);
  const cands = data ?? [];
  const p = cands.find((x: any) => x.role === "student") ?? cands[0];
  return p ? { id: p.id, name: p.full_name, email: p.email } : null;
}

async function fetchAllAttempts(studentId: string): Promise<Attempt[]> {
  const out: Attempt[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("study_hall_unit_attempts")
      .select("unit_id, original_unit_id, selected_answer, is_correct, time_spent_seconds, attempted_at, curriculum_id, lesson_id, eliminated_options, confidence_level, review_time_seconds, chat_messages")
      .eq("student_id", studentId)
      .order("attempted_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...(data as any));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

// study time (minutes) for a KST day, from study_hall_session wall-clock
async function actualStudyMinutes(studentId: string, day: string): Promise<{ minutes: number; sessions: number }> {
  const { data, error } = await supabase
    .from("study_hall_session").select("started_at, ended_at").eq("user_id", studentId);
  if (error) return { minutes: 0, sessions: 0 };
  let sec = 0, n = 0;
  for (const s of data ?? []) {
    if (kstDate(s.started_at) !== day) continue;
    const start = new Date(s.started_at).getTime();
    const end = s.ended_at ? new Date(s.ended_at).getTime() : start;
    if (end > start) sec += (end - start) / 1000;
    n++;
  }
  return { minutes: Math.round(sec / 60), sessions: n };
}

// goal study time (minutes) for a KST day, from scheduled_events (study_hall)
async function goalStudyMinutes(studentId: string, day: string): Promise<number | null> {
  const { data: parts } = await supabase
    .from("scheduled_event_participants").select("event_id").eq("user_id", studentId);
  const ids = [...new Set((parts ?? []).map((p: any) => p.event_id).filter(Boolean))];
  if (!ids.length) return null;
  let total = 0, found = false;
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data } = await supabase
      .from("scheduled_events").select("starts_at, ends_at, category").in("id", chunk).eq("category", "study_hall");
    for (const e of data ?? []) {
      if (kstDate(e.starts_at) !== day) continue;
      const s = new Date(e.starts_at).getTime(), en = new Date(e.ends_at).getTime();
      if (en > s) { total += (en - s) / 1000; found = true; }
    }
  }
  return found ? Math.round(total / 60) : null;
}

async function titleMap(table: string, ids: string[]): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  const uniq = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < uniq.length; i += 100) {
    const { data } = await supabase.from(table).select("id, title").in("id", uniq.slice(i, i + 100));
    for (const r of data ?? []) m.set(r.id, r.title);
  }
  return m;
}

// ── build one student's report data ──────────────────────────────────────────────
async function buildStudent(student: { id: string; name: string; email: string }, day: string) {
  const all = await fetchAllAttempts(student.id);
  await loadUnits(all.flatMap((a) => [a.unit_id, a.original_unit_id]).filter(Boolean) as string[]);
  const today = all.filter((a) => kstDate(a.attempted_at) === day);
  if (!today.length) return null;

  const correct = today.filter((a) => a.is_correct === true).length;
  const total = today.length;

  // study time
  const { minutes: actualMin, sessions } = await actualStudyMinutes(student.id, day);
  const goalMin = await goalStudyMinutes(student.id, day);

  // curriculum / lesson titles
  const currTitle = await titleMap("curricula", today.map((a) => a.curriculum_id).filter(Boolean) as string[]);
  const lessTitle = await titleMap("lessons", today.map((a) => a.lesson_id).filter(Boolean) as string[]);

  // section → domain → skill breakdown
  type Bucket = { correct: number; total: number };
  const secAgg = new Map<string, Bucket>();
  const domAgg = new Map<string, Bucket>();           // key: section|domain
  const skillAgg = new Map<string, Bucket>();         // key: section|domain|skill
  const diffMix = new Map<string, Bucket>();
  const currLessonAgg = new Map<string, Bucket>();    // key: curriculum||lesson
  for (const a of today) {
    const m = unitMeta(a.unit_id, a.original_unit_id);
    const ok = a.is_correct === true;
    const sec = m.section ?? "(기타)";
    const bump = (mp: Map<string, Bucket>, k: string) => {
      const b = mp.get(k) ?? { correct: 0, total: 0 }; b.total++; if (ok) b.correct++; mp.set(k, b);
    };
    bump(secAgg, sec);
    bump(domAgg, `${sec}|${m.domain ?? "(기타)"}`);
    if (m.skill) bump(skillAgg, `${sec}|${m.domain ?? "(기타)"}|${m.skill}`);
    bump(diffMix, m.difficulty ?? "unknown");
    const cTitle = a.curriculum_id ? currTitle.get(a.curriculum_id) ?? "(커리큘럼 미상)" : "(커리큘럼 미상)";
    const lTitle = a.lesson_id ? lessTitle.get(a.lesson_id) ?? "(레슨 미상)" : "(레슨 미상)";
    bump(currLessonAgg, `${cTitle}||${lTitle}`);
  }

  const breakdown = SECTION_ORDER.filter((s) => secAgg.has(s)).map((secKey) => {
    const sb = secAgg.get(secKey)!;
    const domains = DOMAIN_ORDER.filter((d) => SECTION_OF_DOMAIN.get(d) === secKey && domAgg.has(`${secKey}|${d}`))
      .map((d) => {
        const db = domAgg.get(`${secKey}|${d}`)!;
        const skills = [...skillAgg.entries()]
          .filter(([k]) => k.startsWith(`${secKey}|${d}|`))
          .map(([k, b]) => ({ skill: `${domLabel(d)} ▸ ${k.split("|")[2]}`, correct: b.correct, total: b.total, ratePct: acc(b.correct, b.total) }))
          .sort((a, b) => a.skill.localeCompare(b.skill));
        return { domain: domLabel(d), correct: db.correct, total: db.total, ratePct: acc(db.correct, db.total), skills };
      });
    return { section: secLabel(secKey), sectionKey: secKey, correct: sb.correct, total: sb.total, ratePct: acc(sb.correct, sb.total), domains };
  });

  // weak skills (n>=MIN, lowest accuracy)
  const weakSkills = [...skillAgg.entries()]
    .map(([k, b]) => {
      const [sec, dom, sk] = k.split("|");
      return { skill: `${domLabel(dom)} ▸ ${sk}`, section: sec, correct: b.correct, total: b.total, ratePct: acc(b.correct, b.total) };
    })
    .filter((s) => s.total >= MIN_N_FOR_WEAK)
    .sort((a, b) => a.ratePct - b.ratePct || b.total - a.total)
    .slice(0, WEAK_TOP_N);

  // timing categorization of WRONG answers
  let careless = 0, normal = 0, conceptual = 0;
  for (const a of today) {
    if (a.is_correct !== false) continue;
    const t = a.time_spent_seconds;
    if (t == null) { normal++; continue; }
    if (t < CARELESS_SECONDS) careless++;
    else if (t >= CONCEPTUAL_SECONDS) conceptual++;
    else normal++;
  }

  // metacognition
  let confidentWrong = 0, lowConfCorrect = 0, eliminationUsed = 0, reviewed = 0, reviewableWrong = 0;
  for (const a of today) {
    const conf = a.confidence_level;
    if (conf != null && conf >= CONFIDENT_LEVEL && a.is_correct === false) confidentWrong++;
    if (conf != null && conf <= 25 && a.is_correct === true) lowConfCorrect++;
    if (Array.isArray(a.eliminated_options) && a.eliminated_options.length) eliminationUsed++;
    if (a.is_correct === false) { reviewableWrong++; if ((a.review_time_seconds ?? 0) >= REVIEWED_SECONDS) reviewed++; }
  }

  // trend (recent active days incl today)
  const byDate = new Map<string, { correct: number; total: number }>();
  for (const a of all) {
    const d = kstDate(a.attempted_at); if (!d) continue;
    const b = byDate.get(d) ?? { correct: 0, total: 0 }; b.total++; if (a.is_correct) b.correct++; byDate.set(d, b);
  }
  const trend = [...byDate.entries()].filter(([d]) => d <= day).sort((a, b) => b[0].localeCompare(a[0])).slice(0, TREND_DAYS)
    .map(([d, b]) => ({ date: d, correct: b.correct, total: b.total, accuracyPct: acc(b.correct, b.total) })).reverse();

  // Eden chats (today's attempts with student utterances)
  const edenChats: any[] = [];
  for (const a of today) {
    const msgs = Array.isArray(a.chat_messages) ? a.chat_messages : [];
    if (!msgs.length) continue;
    const m = unitMeta(a.unit_id, a.original_unit_id);
    edenChats.push({
      skillLabel: m.skill ? `${domLabel(m.domain)} ▸ ${m.skill}` : domLabel(m.domain),
      difficulty: m.difficulty, correct: a.is_correct === true,
      timeSec: a.time_spent_seconds, selected: a.selected_answer,
      messages: msgs.map((x: any) => ({ role: x.role, content: x.content })),
    });
  }

  const curricula = [...currLessonAgg.entries()].map(([k, b]) => {
    const [c, l] = k.split("||");
    return { curriculum: c, lesson: l, correct: b.correct, total: b.total, ratePct: acc(b.correct, b.total) };
  }).sort((a, b) => a.curriculum.localeCompare(b.curriculum) || a.lesson.localeCompare(b.lesson));

  const difficultyMix = [...diffMix.entries()].map(([k, b]) => ({ difficulty: k, correct: b.correct, total: b.total }));

  return {
    date: day, student,
    studyTime: { goalMinutes: goalMin, actualMinutes: actualMin, attainmentPct: goalMin ? Math.round((100 * actualMin) / goalMin) : null, sessions },
    totals: { correct, total, accuracyPct: acc(correct, total) },
    curricula, breakdown, weakSkills, difficultyMix,
    timing: { careless, normal, conceptual },
    metacognition: { confidentWrong, lowConfCorrect, eliminationUsed, reviewed, reviewableWrong },
    trend, edenChats,
  };
}

// ── markdown rendering ────────────────────────────────────────────────────────
function fmtMin(m: number | null): string {
  if (m == null) return "—";
  const h = Math.floor(m / 60), mm = m % 60;
  return h ? `${h}시간 ${mm}분` : `${mm}분`;
}
function renderMd(r: any): string {
  const L: string[] = [];
  L.push(`# ${r.student.name} — Study Hall 일일 학습 리포트 (${r.date})`, "");
  L.push(`- 이메일: ${r.student.email}`);
  const st = r.studyTime;
  L.push(`- 목표 학습시간: ${fmtMin(st.goalMinutes)} / 실제 학습시간: ${fmtMin(st.actualMinutes)}${st.attainmentPct != null ? ` (달성률 ${st.attainmentPct}%)` : ""}`);
  L.push(`- 그날 누적 정답률: **${r.totals.correct} / ${r.totals.total}** (${r.totals.accuracyPct}%)`, "");

  L.push(`## 학습한 커리큘럼 / 레슨`, "");
  L.push(`| 커리큘럼 | 레슨 | 정답/문항 | 정답률 |`, `|---|---|---|---|`);
  for (const c of r.curricula) L.push(`| ${c.curriculum} | ${c.lesson} | ${c.correct}/${c.total} | ${c.ratePct}% |`);
  L.push("");

  for (const sec of r.breakdown) {
    L.push(`## ${sec.section} — ${sec.correct}/${sec.total} (${sec.ratePct}%)`, "");
    L.push(`### 도메인별 정답률`, "");
    L.push(`| 도메인 | 정답/문항 | 정답률 |`, `|---|---|---|`);
    for (const d of sec.domains) L.push(`| ${d.domain} | ${d.correct}/${d.total} | ${d.ratePct}% |`);
    L.push("");
    const skills = sec.domains.flatMap((d: any) => d.skills);
    if (skills.length) {
      L.push(`### 스킬별 정답률`, "");
      L.push(`| 스킬 | 정답/문항 | 정답률 |`, `|---|---|---|`);
      for (const s of skills) L.push(`| ${s.skill} | ${s.correct}/${s.total} | ${s.ratePct}% |`);
      L.push("");
    }
  }

  // difficulty mix
  const dmOrder = ["easy", "medium", "hard", "challenging", "unknown"];
  const dm = r.difficultyMix.slice().sort((a: any, b: any) => dmOrder.indexOf(a.difficulty) - dmOrder.indexOf(b.difficulty));
  if (dm.length) {
    L.push(`## 난이도 분포`, "");
    L.push(`| 난이도 | 정답/문항 | 정답률 |`, `|---|---|---|`);
    for (const d of dm) L.push(`| ${d.difficulty} | ${d.correct}/${d.total} | ${acc(d.correct, d.total)}% |`);
    L.push("");
  }

  // timing + metacognition
  const t = r.timing, mc = r.metacognition;
  const totalWrong = t.careless + t.normal + t.conceptual;
  L.push(`## 풀이 습관 & 메타인지`, "");
  if (totalWrong) {
    L.push(`- 오답 ${totalWrong}문제 시간 분류: 부주의형(<30초) ${t.careless} · 일반형 ${t.normal} · 개념형(≥120초) ${t.conceptual}`);
  }
  L.push(`- 보기 소거 활용: ${mc.eliminationUsed}문항`);
  if (mc.reviewableWrong) L.push(`- 오답 해설 검토: ${mc.reviewableWrong}개 중 ${mc.reviewed}개 확인 (${acc(mc.reviewed, mc.reviewableWrong)}%)`);
  if (mc.confidentWrong) L.push(`- ⚠️ 확신했는데 틀린 문항(자신감 ≥${CONFIDENT_LEVEL}): ${mc.confidentWrong}개 — 개념 오해 가능`);
  if (mc.lowConfCorrect) L.push(`- 자신 없었지만 맞힌 문항: ${mc.lowConfCorrect}개`);
  L.push("");

  // weak skills
  if (r.weakSkills.length) {
    L.push(`## 오늘의 취약 스킬 (정답률 낮은 순, n≥${MIN_N_FOR_WEAK})`, "");
    for (const w of r.weakSkills) L.push(`- **${w.skill}** — ${w.correct}/${w.total} (${w.ratePct}%)`);
    L.push("");
  }

  // trend
  if (r.trend.length > 1) {
    L.push(`## 최근 학습 추세 (정답률)`, "");
    L.push(`| 날짜 | 정답/문항 | 정답률 |`, `|---|---|---|`);
    for (const d of r.trend) L.push(`| ${d.date}${d.date === r.date ? " (오늘)" : ""} | ${d.correct}/${d.total} | ${d.accuracyPct}% |`);
    L.push("");
  }

  L.push(`## 오늘 학습 총평 및 다음 학습 제안`, "", `<!-- COACH_COMMENT -->`, "");
  return L.join("\n");
}

// ── main ─────────────────────────────────────────────────────────────────────
async function listStudentsOnDay(day: string): Promise<{ id: string; name: string; email: string }[]> {
  // pull distinct student_ids with attempts, then filter by KST day (small volume)
  const ids = new Set<string>();
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("study_hall_unit_attempts").select("student_id, attempted_at").order("attempted_at", { ascending: false }).range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const a of data) if (kstDate(a.attempted_at) === day) ids.add(a.student_id);
    // stop once we're well past the target day (descending order)
    const oldest = data[data.length - 1]?.attempted_at;
    if (oldest && kstDate(oldest) < day) break;
    if (data.length < PAGE) break;
    from += PAGE;
  }
  if (!ids.size) return [];
  const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", [...ids]);
  return (profs ?? []).map((p: any) => ({ id: p.id, name: p.full_name, email: p.email }));
}

async function main() {
  const day = process.argv[2];
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    console.error("Usage: npx tsx scripts/study-hall-daily-analysis.ts <YYYY-MM-DD> [studentName|--id=uuid]");
    process.exit(1);
  }
  const outDir = path.join(OUT_BASE, day);
  const ciDir = path.join(outDir, "_coach-input");
  fs.mkdirSync(ciDir, { recursive: true });

  const one = await resolveStudent();
  const students = one ? [one] : await listStudentsOnDay(day);
  if (!students.length) { console.log(`No study hall activity on ${day}.`); return; }

  const summary: string[] = [];
  for (const s of students) {
    const r = await buildStudent(s, day);
    if (!r) { console.log(`  ${s.name}: no activity on ${day}, skipped`); continue; }
    const safe = s.name.replace(/[\\/:*?"<>|]/g, "_");
    fs.writeFileSync(path.join(outDir, `${safe}.md`), renderMd(r), "utf8");
    fs.writeFileSync(path.join(ciDir, `${safe}.json`), JSON.stringify(r, null, 2), "utf8");
    summary.push(`${s.name}\t${r.totals.correct}/${r.totals.total}\t${r.totals.accuracyPct}%\t목표 ${fmtMin(r.studyTime.goalMinutes)}\t실제 ${fmtMin(r.studyTime.actualMinutes)}`);
    console.log(`  ${s.name}: ${r.totals.correct}/${r.totals.total} (${r.totals.accuracyPct}%), study ${r.studyTime.actualMinutes}m/${r.studyTime.goalMinutes ?? "—"}m, eden ${r.edenChats.length}`);
  }
  fs.writeFileSync(path.join(outDir, "_summary.tsv"), "이름\t정답\t정답률\t목표시간\t실제시간\n" + summary.join("\n"), "utf8");
  console.log(`\nGenerated ${summary.length} report(s) → ${outDir}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

````

## 부록 B. build-study-reports.mjs (HTML 생성기)

````js
// Build printable HTML daily Study Hall reports from study-hall-daily-analysis output.
//
// Inputs (under C:\Users\kwoo3\Downloads\study-reports\<date>):
//   - <name>.md                  (coach comment lives in the final section)
//   - _coach-input\<name>.json   (all structured data — cards/tables come from here)
// Output:
//   - C:\Users\kwoo3\Downloads\study-reports\<date>\html\<name>.html  (one per student)
//   - ...\html\index.html  (roster)
//
// Shares the Test Center report UI tone (build-score-reports.mjs): same CSS, same
// mdToHtml/coach-comment rendering. Differences: study-time + accuracy cards (no
// scaled score, no cohort), curriculum/lesson + metacognition + trend sections.
//
// Usage: node build-study-reports.mjs <YYYY-MM-DD>

import fs from 'node:fs'
import path from 'node:path'

const DOWNLOADS = 'C:\\Users\\kwoo3\\Downloads'
const day = process.argv[2]
if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
  console.error('Usage: node build-study-reports.mjs <YYYY-MM-DD>')
  process.exit(1)
}
const DATE_DIR = path.join(DOWNLOADS, 'study-reports', day)
const CI_DIR = path.join(DATE_DIR, '_coach-input')
const OUT_DIR = path.join(DATE_DIR, 'html')

// --------------------------------------------------------------------------- utils
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function fname(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}
function fmtMin(m) {
  if (m == null) return '—'
  const h = Math.floor(m / 60), mm = m % 60
  return h ? `${h}시간 ${mm}분` : `${mm}분`
}
const acc = (c, t) => (t > 0 ? Math.round((100 * c) / t) : 0)

// Coach comment = body of the final `## ...총평...` section in the md (if written).
function extractCoach(md) {
  const lines = md.split(/\r?\n/)
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## ') && /총평/.test(lines[i])) { start = i; break }
  }
  if (start === -1) return ''
  const body = lines.slice(start + 1).join('\n').trim()
  if (!body || body.includes('COACH_COMMENT')) return ''
  return body
}

// Tiny markdown -> HTML for the coach comment block (bold, italic, paragraphs, bullets).
function mdToHtml(md) {
  const lines = md.split(/\r?\n/)
  let html = ''
  let inList = false
  const closeList = () => { if (inList) { html += '</ul>'; inList = false } }
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
  for (const raw of lines) {
    const line = raw.trim()
    const bullet = line.match(/^-\s+(.*)$/)
    if (bullet) { if (!inList) { html += '<ul>'; inList = true } html += `<li>${inline(bullet[1])}</li>` }
    else if (line === '') { closeList() }
    else { closeList(); html += `<p>${inline(line)}</p>` }
  }
  closeList()
  return html
}

// --------------------------------------------------------------------------- tables
function table(headers, rows) {
  const th = headers.map((h, i) => `<th${i ? ' class="num"' : ''}>${esc(h)}</th>`).join('')
  const body = rows.map((r) =>
    '<tr>' + r.map((c, i) => `<td${i ? ' class="num"' : ''}>${esc(c)}</td>`).join('') + '</tr>'
  ).join('')
  return `<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`
}

function curriculumSection(r) {
  if (!r.curricula?.length) return ''
  const rows = r.curricula.map((c) => [`${c.curriculum} · ${c.lesson}`, `${c.correct}/${c.total}`, `${c.ratePct}%`])
  return `<div class="section"><h2>학습한 커리큘럼 / 레슨</h2>${table(['커리큘럼 · 레슨', '정답/문항', '정답률'], rows)}</div>`
}

function subjectSection(r) {
  if (!r.breakdown?.length) return ''
  const cols = r.breakdown.map((sec) => {
    const dom = table(['도메인', '정답/문항', '정답률'],
      sec.domains.map((d) => [d.domain, `${d.correct}/${d.total}`, `${d.ratePct}%`]))
    const skills = sec.domains.flatMap((d) => d.skills)
    const skl = skills.length
      ? `<div class="sub-title">스킬별 정답률</div>` + table(['스킬', '정답/문항', '정답률'],
          skills.map((s) => [s.skill, `${s.correct}/${s.total}`, `${s.ratePct}%`]))
      : ''
    return `<div><h2>${esc(sec.section)} — ${sec.correct}/${sec.total} (${sec.ratePct}%)</h2>
      <div class="sub-title">도메인별 정답률</div>${dom}${skl}</div>`
  }).join('')
  return `<div class="section"><div class="${r.breakdown.length > 1 ? 'split' : ''}">${cols}</div></div>`
}

function difficultySection(r) {
  if (!r.difficultyMix?.length) return ''
  const order = ['easy', 'medium', 'hard', 'challenging', 'unknown']
  const dm = r.difficultyMix.slice().sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty))
  const rows = dm.map((d) => [d.difficulty, `${d.correct}/${d.total}`, `${acc(d.correct, d.total)}%`])
  return `<div class="section"><h2>난이도 분포</h2>${table(['난이도', '정답/문항', '정답률'], rows)}</div>`
}

function habitsSection(r) {
  const t = r.timing || {}, mc = r.metacognition || {}
  const wrong = (t.careless || 0) + (t.normal || 0) + (t.conceptual || 0)
  const items = []
  if (wrong) items.push(`오답 ${wrong}문제 시간 분류 — 부주의형(&lt;30초) <strong>${t.careless}</strong> · 일반형 <strong>${t.normal}</strong> · 개념형(≥120초) <strong>${t.conceptual}</strong>`)
  if (mc.eliminationUsed) items.push(`보기 소거 활용 <strong>${mc.eliminationUsed}</strong>문항`)
  if (mc.reviewableWrong) items.push(`오답 해설 검토 ${mc.reviewableWrong}개 중 <strong>${mc.reviewed}</strong>개 확인 (${acc(mc.reviewed, mc.reviewableWrong)}%)`)
  if (mc.confidentWrong) items.push(`<span class="warn">⚠️ 확신했는데 틀린 문항 <strong>${mc.confidentWrong}</strong>개 — 개념 오해 가능</span>`)
  if (mc.lowConfCorrect) items.push(`자신 없었지만 맞힌 문항 <strong>${mc.lowConfCorrect}</strong>개`)
  if (!items.length) return ''
  return `<div class="section analysis"><h2>풀이 습관 &amp; 메타인지</h2><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`
}

function weakSection(r) {
  if (!r.weakSkills?.length) return ''
  const rows = r.weakSkills.map((w) => [w.skill, `${w.correct}/${w.total}`, `${w.ratePct}%`])
  return `<div class="section"><h2>오늘의 취약 스킬 <span class="muted">(정답률 낮은 순)</span></h2>${table(['스킬', '정답/문항', '정답률'], rows)}</div>`
}

function trendSection(r) {
  if (!r.trend || r.trend.length < 2) return ''
  const max = 100
  const bars = r.trend.map((d) => {
    const isToday = d.date === r.date
    const h = Math.max((d.accuracyPct / max) * 90, 6)
    return `<div class="tbar-wrap">
      <div class="tbar-val">${d.accuracyPct}%</div>
      <div class="tbar ${isToday ? 'today' : ''}" style="height:${h}px"></div>
      <div class="tbar-date">${esc(d.date.slice(5))}${isToday ? '<br><b>오늘</b>' : ''}</div>
    </div>`
  }).join('')
  return `<div class="section"><h2>최근 학습 추세 <span class="muted">(일별 정답률)</span></h2><div class="trend">${bars}</div></div>`
}

// study-time progress + accuracy cards
function cards(r) {
  const st = r.studyTime || {}
  const goal = st.goalMinutes, actual = st.actualMinutes ?? 0
  const pctBar = goal ? Math.min(100, Math.round((100 * actual) / goal)) : null
  const timeCard = `<div class="card">
    <div class="card-label">학습 시간</div>
    <div class="card-score">${fmtMin(actual)}</div>
    <div class="card-sub">목표 ${fmtMin(goal)}${st.sessions ? ` · ${st.sessions}세션` : ''}</div>
    ${goal != null ? `<div class="pbar"><div class="pbar-fill" style="width:${pctBar}%"></div></div>
      <div class="card-cmp ${pctBar >= 100 ? 'up' : ''}">달성률 <span>${st.attainmentPct}%</span></div>` : ''}
  </div>`
  const t = r.totals || {}
  const accCard = `<div class="card">
    <div class="card-label">그날 누적 정답률</div>
    <div class="card-score">${t.accuracyPct}<span class="card-max">%</span></div>
    <div class="card-sub">정답 ${t.correct}/${t.total}</div>
  </div>`
  return `<div class="cards">${timeCard}${accCard}</div>`
}

function coachSection(comment) {
  if (!comment) return ''
  return `<div class="section analysis coach"><h2>오늘 학습 총평 &amp; 다음 학습 제안</h2>${mdToHtml(comment)}</div>`
}

// --------------------------------------------------------------------------- CSS (Test Center tone + study extras)
const CSS = `
:root{--ink:#1a2233;--muted:#6b7280;--line:#e5e7eb;--brand:#2563eb;--brand-d:#1e40af;--bg:#f8fafc;--good:#059669;--bad:#dc2626;--warn:#b45309;}
*{box-sizing:border-box}
body{font-family:'Segoe UI','Malgun Gothic',system-ui,sans-serif;color:var(--ink);background:var(--bg);margin:0;padding:24px;line-height:1.5;}
.sheet{max-width:880px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06);}
.hdr{background:linear-gradient(135deg,var(--brand),var(--brand-d));color:#fff;padding:24px 28px;}
.hdr .exam{font-size:13px;opacity:.85;letter-spacing:.3px;}
.hdr h1{margin:4px 0 2px;font-size:26px;}
.hdr .email{font-size:13px;opacity:.85;}
.section{padding:20px 28px;border-top:1px solid var(--line);}
.section h2{font-size:15px;margin:0 0 12px;color:var(--brand-d);letter-spacing:.2px;}
.muted{color:var(--muted);font-weight:400;font-size:12px;}
.cards{display:flex;gap:16px;padding:20px 28px;}
.card{flex:1;border:1px solid var(--line);border-radius:12px;padding:16px;background:#fff;}
.card-label{font-size:13px;color:var(--muted);font-weight:600;}
.card-score{font-size:34px;font-weight:800;color:var(--brand-d);margin:4px 0;}
.card-score .card-max{font-size:15px;color:var(--muted);font-weight:600;}
.card-sub{font-size:13px;color:var(--muted);}
.card-cmp{font-size:12px;margin-top:6px;color:var(--muted);} .card-cmp.up{color:var(--good);} .card-cmp span{font-weight:700;}
.pbar{height:8px;background:#eef2ff;border-radius:99px;margin-top:10px;overflow:hidden;}
.pbar-fill{height:100%;background:linear-gradient(90deg,var(--brand),var(--brand-d));border-radius:99px;}
table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;}
th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;}
th{color:var(--muted);font-weight:600;font-size:12px;background:#f9fafb;}
td.num,th.num{text-align:right;white-space:nowrap;}
.sub-title{font-size:13px;font-weight:700;margin:14px 0 6px;color:var(--ink);}
.split{display:grid;grid-template-columns:1fr 1fr;gap:24px;}
.analysis ul{margin:6px 0;padding-left:20px;} .analysis li{margin:4px 0;font-size:13px;}
.analysis .warn{color:var(--warn);}
.coach p{font-size:13.5px;line-height:1.7;margin:9px 0;}
.coach strong{color:var(--ink);} .coach em{color:var(--brand-d);font-style:normal;background:#eef2ff;padding:0 3px;border-radius:3px;}
.trend{display:flex;gap:10px;align-items:flex-end;height:130px;padding-top:8px;}
.tbar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;}
.tbar{width:60%;max-width:34px;background:#c7d2fe;border-radius:5px 5px 0 0;}
.tbar.today{background:linear-gradient(180deg,var(--brand),var(--brand-d));}
.tbar-val{font-size:11px;color:var(--muted);} .tbar-date{font-size:10px;color:var(--muted);text-align:center;}
.foot{padding:14px 28px;color:var(--muted);font-size:11px;border-top:1px solid var(--line);}
.nav{max-width:880px;margin:0 auto 12px;font-size:13px;} .nav a{color:var(--brand);text-decoration:none;}
@media print{body{background:#fff;padding:0;}.sheet{border:none;box-shadow:none;border-radius:0;max-width:none;}.section,.cards{break-inside:avoid;}.nav{display:none;}}
@page{size:A4;margin:14mm;}
`

function renderStudent(r, comment) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(r.student.name)} — Study Hall 일일 리포트 (${esc(r.date)})</title><style>${CSS}</style></head>
<body>
<div class="nav"><a href="index.html">← 전체 목록</a></div>
<div class="sheet">
  <div class="hdr">
    <div class="exam">Study Hall 일일 학습 리포트 · ${esc(r.date)}</div>
    <h1>${esc(r.student.name)}</h1>
    <div class="email">${esc(r.student.email)}</div>
  </div>
  ${cards(r)}
  ${curriculumSection(r)}
  ${subjectSection(r)}
  ${difficultySection(r)}
  ${habitsSection(r)}
  ${weakSection(r)}
  ${trendSection(r)}
  ${coachSection(comment)}
  <div class="foot">SuperfastSAT · Study Hall 일일 리포트 · 정답률은 해당 날짜에 학습한 문항 누적 기준입니다.</div>
</div>
</body></html>`
}

function renderIndex(entries) {
  const rows = entries.map((e) => `<tr>
    <td><a href="${esc(e.file)}">${esc(e.name)}</a></td>
    <td class="num">${e.accuracyPct}% (${e.correct}/${e.total})</td>
    <td class="num">${fmtMin(e.actualMin)}${e.goalMin != null ? ` / ${fmtMin(e.goalMin)}` : ''}</td>
  </tr>`).join('')
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Study Hall 일일 리포트 — ${esc(day)}</title><style>${CSS}
.roster{max-width:880px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:14px;padding:24px 28px;}
h1{font-size:22px;color:var(--brand-d);} a{color:var(--brand);text-decoration:none;} a:hover{text-decoration:underline;}
</style></head><body><div class="roster">
<h1>Study Hall 일일 리포트 — ${esc(day)}</h1>
<p style="color:var(--muted);font-size:13px;">총 ${entries.length}명 · 정답률 내림차순</p>
<table><thead><tr><th>이름</th><th class="num">정답률</th><th class="num">학습시간(실제/목표)</th></tr></thead>
<tbody>${rows}</tbody></table>
</div></body></html>`
}

// --------------------------------------------------------------------------- main
function main() {
  if (!fs.existsSync(CI_DIR)) { console.error(`No _coach-input dir: ${CI_DIR}`); process.exit(1) }
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const jsons = fs.readdirSync(CI_DIR).filter((f) => f.endsWith('.json'))
  const entries = []
  for (const jf of jsons) {
    const r = JSON.parse(fs.readFileSync(path.join(CI_DIR, jf), 'utf8'))
    const base = jf.replace(/\.json$/, '')
    const mdPath = path.join(DATE_DIR, `${base}.md`)
    const comment = fs.existsSync(mdPath) ? extractCoach(fs.readFileSync(mdPath, 'utf8')) : ''
    const out = `${fname(r.student.name)}.html`
    fs.writeFileSync(path.join(OUT_DIR, out), renderStudent(r, comment), 'utf8')
    entries.push({
      name: r.student.name, file: out,
      accuracyPct: r.totals.accuracyPct, correct: r.totals.correct, total: r.totals.total,
      actualMin: r.studyTime.actualMinutes, goalMin: r.studyTime.goalMinutes,
      hasComment: !!comment,
    })
  }
  entries.sort((a, b) => b.accuracyPct - a.accuracyPct || a.name.localeCompare(b.name, 'ko'))
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderIndex(entries), 'utf8')

  const missing = entries.filter((e) => !e.hasComment).map((e) => e.name)
  if (missing.length) console.log(`코치 코멘트 없음(준비 중): ${missing.join(', ')}`)
  console.log(`Generated ${entries.length} study report(s) + index.html → ${OUT_DIR}`)
}
main()

````

## 부록 C. STUDY-HALL-COMMENT-PROMPT.md (코치 코멘트 프롬프트)

````md
# Study Hall Coach-Comment Prompt — daily per-student report

Reusable spec for the LLM fan-out that writes the final section of each student's **daily Study Hall**
report (`## 오늘 학습 총평 및 다음 학습 제안`). One agent per student per day.

Sibling of `COACH-COMMENT-PROMPT.md` (Test Center), but with a DELIBERATELY INVERTED policy:
- Study Hall is **daily formative practice**, not a summative exam → next-step suggestions ARE wanted.
- Comparison is the student's **own daily trend**, NOT a cohort (study content differs per student).
- Tone is **encouraging / process-focused** (effort + habits), not score-anxious.

Pipeline: `app/scripts/study-hall-daily-analysis.ts <date> <name>` produces, per student,
`<name>.md` (with placeholder `<!-- COACH_COMMENT -->`) and `_coach-input/<name>.json` (all signals).
This prompt turns the JSON into the comment and writes it into the md.

---

## Per-student prompt (fill the {{...}} and hand one to each agent)

You are a SAT study coach writing the final section of {{STUDENT_NAME}}'s **daily Study Hall report**
for {{DATE}}. Diagnose today's practice and suggest what to do next.

READ FULLY before writing:
1. This student's data: `{{REPORT_DIR}}/_coach-input/{{STUDENT_NAME}}.json` — the complete signal source.

### Input JSON fields you must use
- `studyTime.{goalMinutes,actualMinutes,attainmentPct,sessions}` — effort/consistency. (goal may be null.)
- `totals.{correct,total,accuracyPct}` — the day's cumulative accuracy.
- `curricula[].{curriculum,lesson,correct,total,ratePct}` — what was practiced.
- `breakdown[].domains[].{domain,ratePct}` and `...skills[]` — domain/skill accuracy today.
- `weakSkills[]` — `{skill, correct, total, ratePct}` lowest-accuracy skills (n≥3). The diagnoses.
- `difficultyMix[]` — `{difficulty, correct, total}`; note if today was all-hard etc.
- `timing.{careless,normal,conceptual}` — wrong-answer time categories.
- `metacognition.{confidentWrong, lowConfCorrect, eliminationUsed, reviewed, reviewableWrong}` —
  confidence calibration, elimination habit, explanation-review rate.
- `trend[]` — `{date, accuracyPct, ...}` recent active days incl. today (for "vs 지난번" framing).
- `edenChats[]` — tutor transcripts today: `{skillLabel,difficulty,correct,timeSec,selected,
  messages[{role,content}]}`. Quote the STUDENT's own words (role:"user").

### What to write — structure
1. **오늘 학습 총평 (한 문단)**: acknowledge effort/consistency first using real numbers
   (study time vs goal, attempt count, accuracy vs the previous active day in `trend`), then name
   today's single clearest focus area. Keep it warm but specific.
2. **2–3 진단 (bold-headed)**, each:
   - cites today's accuracy from `weakSkills`/`breakdown` (e.g. "Inferences 18/24, 75%"),
   - **quotes the student's own Eden-chat words** verbatim when they reveal the gap (a word they didn't
     know, a question they asked). If `edenChats` is empty, use NO quotes — diagnose from numbers only.
   - is specific and fixable, not "weak reading" in general.
3. **다음 학습 제안 (다음 학습 제안: bold)**: 1–3 concrete next steps grounded in today's data — which
   skill/difficulty to practice next, or a habit to apply. This is the KEY difference from the Test
   Center prompt: here, prescriptive next-steps are encouraged. Keep them to study-hall practice
   (more items of skill X, slow down on Y) — not real-exam logistics.
4. **메타인지 한 줄** (when data supports it): e.g. if `confidentWrong ≥ 2`, gently flag confident-but-wrong
   items as a concept-check opportunity; praise a high explanation-review rate (`reviewed/reviewableWrong`)
   or a strong elimination habit; note `lowConfCorrect` as evidence they know more than they think.

### HARD rules
- 합니다체. Address the student by given-name form (e.g. "지아 학생").
- Signal-based only: every number traces to the JSON; every quote is a real `edenChats` user message
  (you may silently fix an obvious typo). No invented facts/quotes. Item/passage terms may be quoted
  but attributed to the item, not the student.
- Korean output. Encouraging, process-focused. Do NOT over-praise a low day or over-warn a strong one.
- Replace the EXACT string `<!-- COACH_COMMENT -->` in `{{REPORT_DIR}}/{{STUDENT_NAME}}.md`. Edit only that.

When done, report a short summary of the diagnoses + next-steps, and list every direct quote used (for audit).

---

## After the fan-out — quality audit
1. Every number matches the JSON (study time, accuracy, ratePct, trend).
2. Every quoted phrase appears in that student's `edenChats`.
3. Next-step suggestions are present and grounded in today's weak skills (not generic).
4. No remaining `<!-- COACH_COMMENT -->`.

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
