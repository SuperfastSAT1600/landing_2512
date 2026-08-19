# CRM 주차 계획·이행 → 트랙 중심 재설계

## Context

`주차 계획·이행` 탭은 1일 전(`ac117051`)에 주간 운영 루프로 재구성됐지만, 실제로 써 보니 **한 주의 계획을 다섯 군데에 쪼개서 입력**해야 한다: `이번 주 집중 전략`(전략+목표+메모) / `이번 주 실행·결과` / `목표 vs 실적`(지표 목표) / `이번 주 할 일`(체크리스트) / `보완 기록`. 목표는 두 곳에, 실행은 세 곳에 흩어져 있고 어디에 뭘 적어야 하는지가 화면에서 드러나지 않는다.

사용자가 실제로 쓰는 주차 계획 문서의 구조는 훨씬 단순하다:

```
B2C
  신규리드 (목표: 인스타리드 2건 결제)
    a. 컨택 단계에서 ~까지 상담 완료 후 진단 테스트 진행 시 20만원 할인
    b. 첫 세일즈콜 완료 후 상담 포탈 전달
    c. 운영시간 외 인스타리드 자동메시지
  이탈 리드 캠페인 (목표: 각각 결제 2건씩)
    a. 새 유형 반영 진단 테스트 후 Report 및 로드맵 논의
B2B
  소프트웨어 판매 (목표: 오프라인 영업 미팅 1건 확정)
  학생 소개 (목표: 온라인 영업 미팅 1건 확정)
```

즉 실제 단위는 **"목표 하나 + 그 목표를 위한 실행 항목들" = 트랙**이다. 이 문서 위계를 화면 구조로 그대로 옮겨서, 월요일 저녁에 한 화면에서 주 계획을 다 세우고 주중에는 체크만 하면 되게 만든다.

목표: 섹션 5개 → **실적 띠 + 트랙 카드 + 회고** 3덩어리. 입력 지점 1개(트랙 카드).

## Decisions (사용자 확인 완료)

| 항목 | 결정 |
|---|---|
| 화면 구조 | 목표 카드(트랙) 하나로 통합. 집중 전략·목표 vs 실적·할 일이 트랙 안으로 흡수 |
| 목표 표현 | 자유 텍스트 + (선택) 지표 연결. 지표 없으면 수동 달성 체크 |
| 세그먼트 | B2C·B2B를 한 화면에. 필터 칩 `전체`(기본)/`B2C`/`B2B` |
| 주 전산 목표 수치 | **UI에서 제거** — 상단은 읽기 전용 실적 띠만. `targets` 컬럼은 보존(삭제 안 함) |
| 트랙 외 잡일 | 목표 없는 `기타` 트랙으로. 별도 `할 일` 섹션 없음 |
| 생산성 장치 | 실행 항목 Enter 연속 입력 + 트랙 이름 프리셋 칩 (지난주 복사·회고 접기는 범위 밖) |

## 핵심 설계 판단

**트랙 진행률은 주 전체 실적이 아니라 트랙에 연결된 전략의 집계로 계산한다.** 문서의 "신규리드 결제 2건"과 "이탈 리드 캠페인 결제 2건"은 서로 다른 리드 집합이므로, 주 전체 `paid`를 두 트랙에 똑같이 보여주면 틀린 숫자가 된다. `src/lib/weekly-execution.ts`가 이미 전략별 `applied/contacted/paid/revenue + leads[]`를 주 범위로 내주므로, **트랙 = 연결된 전략들의 리드 합집합(student_id 중복 제거)** 으로 계산하면 정확하다. 주 전체 숫자는 상단 실적 띠(`data.actuals`)가 담당한다.

**세그먼트별 저장은 그대로 둔다.** `weekly_plans`는 `UNIQUE (segment, week_start)`이고 실적·집계도 세그먼트별로 갈린다. "한 화면"은 저장 구조를 바꾸는 게 아니라 `useWeeklyPlan`을 b2c/b2b 두 번 호출해 한 화면에 렌더하는 것으로 구현한다. 트랙 편집은 각자의 행에 저장된다.

## Requirements

### REQ-001: 트랙 CRUD + 실행 항목 체크리스트
- **Priority**: Must
- **Description**: 트랙(이름 + 자유 텍스트 목표)을 추가·삭제하고, 그 안에 실행 항목을 추가·체크·삭제한다. 트랙 이름 프리셋 칩(B2C: 신규리드/이탈 리드 캠페인/재결제/기타, B2B: 소프트웨어 판매/학생 소개/기타)으로 이름을 한 번에 채운다.
- **Acceptance**: 구조 변경(트랙·항목 추가·삭제, 체크 토글, 지표·전략 연결)은 **즉시 저장**. 자유 텍스트(트랙 이름, 목표, 항목 텍스트)는 **blur 저장**. `완료` 버튼은 어디에도 두지 않는다. 항목 입력에서 Enter → 추가 후 포커스 유지(연속 입력), Esc → 닫기.
- **Verification**: (TEST) `components/__tests__/WeeklyTrackCard.test.tsx`, `WeeklyTracks.test.tsx`

### REQ-002: 트랙 목표 — 자유 텍스트 + 선택적 지표 연결
- **Priority**: Must
- **Description**: 목표는 문서에 쓰던 문장 그대로 적는다. 원하면 지표(`적용 리드`/`컨택`/`결제`/`매출`)와 목표값을 붙여 자동 진행률을 받고, 안 붙이면 수동 `달성` 체크만 둔다.
- **Acceptance**: 지표 연결 시 진행률은 **트랙에 연결된 전략의 리드 합집합** 기준(student_id 중복 제거). 연결된 전략이 없으면 0으로 표시하고 "전략을 연결하면 자동 집계됩니다" 힌트를 준다. 100% 이상은 emerald.
- **Verification**: (TEST) `src/lib/__tests__/weekly-track-progress.test.ts`

### REQ-003: 실행 항목 ↔ 전략 라이브러리 연결
- **Priority**: Must
- **Description**: 실행 항목에 전략 라이브러리의 전략을 연결한다(선택). 연결되면 그 전략의 주간 집계가 트랙 진행률과 `적용 리드 N명`에 반영된다. 트랙 카드에서 바로 `적용 기록`(quick-log)을 열면 그 트랙의 전략만 후보로 뜬다.
- **Acceptance**: 전략명·타입은 스냅샷 저장(전략 삭제·개명 후에도 과거 주차 보존). 트랙의 어느 항목에도 연결되지 않은 전략 실행은 `계획 외 실행` 블록에 모인다.
- **Verification**: (TEST) `components/__tests__/WeeklyTracks.test.tsx` + (BROWSER)

### REQ-004: B2C·B2B 한 화면 + 읽기 전용 실적 띠
- **Priority**: Must
- **Description**: 필터 칩 `전체`/`B2C`/`B2B`(기본 `전체`). 상단에 세그먼트별 이번 주 실적 한 줄(신규 리드·컨택·결제·매출·실수익), 편집 없음.
- **Acceptance**: `전체`에서 두 세그먼트 트랙이 세그먼트 소제목과 함께 보이고, 편집은 각 세그먼트 행에 저장된다. 회고·보완 기록·지난주 회고 배너는 **현재 워크스페이스 세그먼트 것만** 표시하고 제목에 세그먼트를 표기한다(`이 주 회고 · B2C`).
- **Verification**: (TEST) `components/__tests__/WeeklyKpiStrip.test.tsx` + (BROWSER) B2C·B2B 각각

### REQ-005: 레거시 주차 파생 (데이터 유실 없음)
- **Priority**: Must
- **Description**: `tracks`가 한 번도 기록되지 않은 주차(컬럼 `NULL`)는 기존 `focus_strategies` + `actions`에서 트랙을 파생해 보여준다.
- **Acceptance**: `focus_strategy` 1건 → 트랙 1개(이름=전략명, 목표=`goal`, `memo`는 목표 뒤에 ` — memo`로 합침, 항목 1개에 전략 연결, `carried_from_week` 보존). `actions`가 있으면 `기타` 트랙 1개로 묶고 `done`/`done_at` 보존. 파생은 **읽기 전용** — 사용자가 저장할 때 비로소 `tracks`에 기록된다. 사용자가 트랙을 전부 지운 `[]` 상태는 파생을 되살리지 않는다(`NULL`과 `[]`를 구분).
- **Verification**: (TEST) `src/lib/__tests__/weekly-track-derive.test.ts`, `api/crm/weekly-plan/__tests__/sanitize.test.ts`

### REQ-006: 부분 저장 + 회고 이어받기 대상 변경
- **Priority**: Must
- **Description**: `PUT /api/crm/weekly-plan`이 `tracks`를 받는다. 회고의 `다음 주로`는 다음 주 `actions`가 아니라 다음 주 `지난주 회고 이어받기` 트랙에 항목으로 들어간다.
- **Acceptance**: body에 있는 키만 갱신(기존 규칙 유지). 이어받기 트랙은 없으면 생성, 있으면 항목 추가하고 `carried_from_week`를 남긴다. 이관 실패 시 `carried_to` 미기록(기존 동작 유지).
- **Verification**: (TEST) `api/crm/weekly-plan/__tests__/{sanitize,route}.test.ts`, `components/__tests__/WeeklyRetro.test.tsx`

### REQ-007: B2B 주차 계획 탭 빈 화면 버그 수정
- **Priority**: Must
- **Description**: `WeeklyPlan.tsx:34`가 `subView`를 항상 `'today'`로 초기화하는데 B2B는 `dailyView`를 넘기지 않아(`B2bWorkspace.tsx:75-86`) 토글도 계획도 렌더되지 않는다 — 지금 B2B 주차 계획 탭은 **빈 화면**이다.
- **Acceptance**: `useState(dailyView ? 'today' : 'plan')`으로 초기화. B2B에서 탭 진입 즉시 계획이 보인다.
- **Verification**: (TEST) `components/__tests__/WeeklyPlan.test.tsx` + (BROWSER)

## Technical Design

### 1. 데이터 — `supabase/migrations/116_weekly_plan_tracks.sql`

```sql
ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS tracks jsonb;  -- DEFAULT 없음: NULL = 레거시 파생 대상
COMMENT ON COLUMN weekly_plans.tracks IS
  '주간 실행 트랙 [{id,name,goal_text,metric,target_value,achieved,items:[{id,text,done,done_at,strategy_id,strategy_name,strategy_type}],carried_from_week}] — 전략명·타입은 스냅샷';
```

**`DEFAULT '[]'`를 일부러 넣지 않는다.** `NULL`(=트랙 체제 이전 주차, 파생 대상)과 `[]`(=사용자가 명시적으로 비운 상태, 파생 금지)를 구분해야 REQ-005의 "지운 트랙이 되살아나는" 버그가 안 생긴다.

**적용 순서(사용자가 Supabase에서 직접 실행 — [[db-migration-apply]])**: `112_weekly_plan_focus_retro.sql` → `116_weekly_plan_tracks.sql`. 112는 미적용 가능성이 있고 `ADD COLUMN IF NOT EXISTS`라 재실행이 안전하다. 112 미적용 상태에서는 지금도 집중 전략·회고 저장이 500으로 떨어진다.

`targets` / `actions` / `focus_strategies` 컬럼은 **드롭하지 않는다**(파생 소스 + 과거 주차 보존).

### 2. 타입 — `src/types/crm.ts` (기존 weekly 블록 309-441 뒤에 추가)

```ts
export type WeeklyTrackMetric = 'applied' | 'contacted' | 'paid' | 'revenue';
export const WEEKLY_TRACK_METRIC_KEYS: WeeklyTrackMetric[] = ['applied', 'contacted', 'paid', 'revenue'];
export const WEEKLY_TRACK_METRIC_LABELS: Record<WeeklyTrackMetric, string> = {
  applied: '적용 리드', contacted: '컨택', paid: '결제', revenue: '매출',
};

export interface WeeklyTrackItem {
  id: string; text: string; done: boolean; done_at: string | null;
  strategy_id: string | null;
  strategy_name: string | null;               // 스냅샷
  strategy_type: StrategyHistoryType | null;  // 스냅샷
}

/** 목표 하나 + 그 목표를 위한 실행 항목들. 사용자의 주차 계획 문서 위계와 1:1. */
export interface WeeklyTrack {
  id: string;
  name: string;
  goal_text: string;                    // "인스타리드 2건 결제" — 문서 문장 그대로
  metric: WeeklyTrackMetric | null;     // null이면 수동 달성 체크
  target_value: number;
  achieved: boolean;                    // metric === null 일 때만 의미
  items: WeeklyTrackItem[];
  carried_from_week?: string | null;
}
```
`WeeklyPlan`에 `tracks: WeeklyTrack[]`, `useWeeklyPlan.ts`의 `WeeklyPlanPatch`에 `tracks` 추가.

### 3. 순수 로직 (신규, 테스트 대상)

**`src/lib/weekly-track-progress.ts`** — `WeeklyExecutionRow[]`(기존 `weekly-execution.ts` 산출물)에서 트랙 진행률 계산.
```ts
export interface WeeklyTrackProgress {
  applied: number; contacted: number; paid: number; revenue: number;
  leads: WeeklyExecutionLead[];   // student_id 중복 제거, applied_at 최신순
  value: number;                  // metric 기준 현재값
  pct: number | null;             // target_value > 0 일 때만
  linkedStrategyIds: string[];
}
export function computeTrackProgress(track: WeeklyTrack, execution: WeeklyExecutionRow[]): WeeklyTrackProgress;
/** 어느 트랙에도 연결되지 않은 실행 행 → '계획 외 실행' */
export function unplannedRows(tracks: WeeklyTrack[], execution: WeeklyExecutionRow[]): WeeklyExecutionRow[];
/** 트랙 항목의 전략 스냅샷 → fetchWeeklyExecution의 planned 판정용 */
export function trackStrategyRefs(tracks: WeeklyTrack[]): WeeklyFocusRef[];
```
리드 중복 제거가 핵심: 한 리드가 트랙 내 여러 전략을 받으면 `applied`는 1로 센다.

**`src/lib/weekly-track-derive.ts`** — `deriveTracksFromLegacy(focus, actions): WeeklyTrack[]` (REQ-005 규칙).

### 4. API — `src/app/api/crm/weekly-plan/`

- `sanitize.ts`: `sanitizeTracks()` 추가(id 없으면 `crypto.randomUUID()`, name/goal_text/항목 text trim, 빈 text 항목 드롭, `metric`은 `WEEKLY_TRACK_METRIC_KEYS`에 있을 때만 유지·아니면 `null`, `target_value = Math.max(0, Number(...) || 0)`, `done`일 때 `done_at` 스탬프 — 기존 `sanitizeActions` 패턴 그대로). `buildPlanPatch`에 `tracks` 키 추가.
- `normalizePlanRow()`: `row.tracks == null ? deriveTracksFromLegacy(focus, actions) : sanitizeTracks(row.tracks)`.
- `route.ts` GET: `fetchWeeklyExecution(segment, week, trackStrategyRefs(plan?.tracks ?? []))` — 지금 넘기는 `plan?.focus_strategies`를 대체. 파생 트랙도 전략 연결을 물고 있으므로 레거시 주차의 `planned` 판정이 그대로 유지된다.

### 5. 컴포넌트 — `src/app/admin/crm/components/`

**`WeeklyPlan.tsx`** (셸, 재작성):
- `useWeeklyPlan('b2c', …)` + `useWeeklyPlan('b2b', …)` 둘 다 항상 호출(훅 규칙). 필터는 표시 전용.
- `segmentFilter: 'all' | 'b2c' | 'b2b'` 상태, 기본 `'all'`.
- `subView` 초기화 버그 수정(REQ-007).
- `carryOver`를 다음 주 `지난주 회고 이어받기` 트랙으로 변경(`appendToWeek` 재사용).
- 렌더 순서: 주 네비 → 배너(primary) → `WeeklyKpiStrip` → `WeeklyTracks` → `WeeklyNotes`(primary) → `WeeklyRetro`(primary).

**신규**
| 파일 | 역할 |
|---|---|
| `weekly/WeeklyKpiStrip.tsx` | 읽기 전용 실적 한 줄(세그먼트별). `format.ts`의 `formatMetric`/`manwon` 재사용 |
| `weekly/WeeklyTracks.tsx` | 섹션 셸 — 헤더(필터 칩, `트랙 추가`), 세그먼트 소제목, 카드 목록, `계획 외 실행` 접기 |
| `weekly/WeeklyTrackCard.tsx` | 카드 헤더(이름 inline 편집, 삭제) + 목표 행(텍스트·지표·목표값·진행 게이지) + `적용 리드 N명` 접기 + `적용 기록` |
| `weekly/WeeklyTrackItems.tsx` | 항목 체크리스트 + Enter 연속 입력 + 전략 연결 드롭다운 |
| `weekly/LeadChips.tsx` | 리드 칩 목록 — `WeeklyExecutionCard`에서 추출해 카드와 공유 |
| `weekly/useStrategyLibrary.ts` | `/api/crm/retry-strategies?segment=` 조회 훅 — `WeeklyTrackItems`·`WeeklyQuickLog` 공유 |
| `weekly/presets.ts` | `WEEKLY_TRACK_PRESETS: Record<WeeklyPlanSegment, string[]>` |
| `weekly/WeeklyUnplanned.tsx` | `계획 외 실행` 블록(`WeeklyExecutionCard` 재사용) |

**수정**: `weekly/WeeklyQuickLog.tsx` — 옵션 프롭 `strategyIds?: string[]`(후보 제한) / `presetStrategyId?: string` 추가, 전략 조회를 `useStrategyLibrary`로 교체.

**삭제**: `weekly/WeeklyFocusStrategies.tsx`, `weekly/WeeklyTargets.tsx`, `weekly/WeeklyActions.tsx`, `weekly/WeeklyExecution.tsx` + `components/__tests__/WeeklyFocusStrategies.test.tsx`.
**유지**: `WeeklyExecutionCard`, `WeeklyQuickLog`, `WeeklyNotes`, `WeeklyRetro`, `WeeklyRetroBanner`, `format.ts`, `useWeeklyPlan.ts`.

모든 파일 200줄 이하(`essential-rules.md`).

### 6. 저장 타이밍 규칙 (화면 전체 일관)

원래 불편의 절반은 저장 시점이 섹션마다 달랐던 것(`목표 vs 실적`은 `완료` 클릭, 집중 전략은 blur, 할 일은 즉시)이다. 통일한다:
- **즉시 저장**: 트랙 추가·삭제, 항목 추가·삭제, 체크 토글, 지표 선택, 목표값 변경, 전략 연결
- **blur 저장**: 트랙 이름, 목표 텍스트, 항목 텍스트
- `완료` 버튼 없음

## 범위 밖 (후속)

- `winback_plays`(이탈 리드 캠페인 엔티티)와 트랙 연결 — 이미 별개 캠페인 모델이 있으나 이번엔 안 건드린다
- 세그먼트 판정 불일치: 전략 카탈로그는 `segment` 컬럼, 주간 집계는 `company_id` 기준(`fetch-execution.ts:25-27`), 학생 패널은 `lead_type` 기준(`StrategyHistorySection.tsx:79`)
- 지난주 계획 복사, 회고 기본 접기, 회고 AI 초안, 월요일 슬랙 리포트 양방향 연동

## Verification

1. **마이그레이션** — 사용자가 Supabase에서 `112` → `116` 순서 실행. 적용 후 `select tracks from weekly_plans limit 1;`로 컬럼 확인.
2. **단위 테스트**
   ```bash
   npx vitest run src/lib/__tests__/weekly-track-progress.test.ts \
     src/lib/__tests__/weekly-track-derive.test.ts \
     src/app/api/crm/weekly-plan \
     src/app/admin/crm/components/__tests__/Weekly
   ```
   진행률 리드 중복 제거, 지표 없는 목표의 수동 달성, `NULL` vs `[]` 파생 분기, 레거시 `focus_strategies`+`actions` → 트랙 매핑을 반드시 커버.
3. **API 라운드트립**
   ```bash
   curl -s -X PUT localhost:3000/api/crm/weekly-plan -H 'x-admin-key: …' -H 'content-type: application/json' \
     -d '{"segment":"b2c","week_start":"2026-08-17","tracks":[{"id":"t1","name":"신규리드","goal_text":"인스타리드 2건 결제","metric":"paid","target_value":2,"achieved":false,"items":[{"id":"i1","text":"첫 세일즈콜 후 상담 포탈 전달","done":false}]}]}'
   curl -s 'localhost:3000/api/crm/weekly-plan?segment=b2c&week_start=2026-08-17' -H 'x-admin-key: …' | jq '.data.plan.tracks'
   ```
4. **Playwright MCP** (`resource-usage.md` 필수) — dev server 직접 띄우고 `/admin/crm`:
   - B2C 주차 계획: 트랙 추가(프리셋 칩) → 항목 Enter 연속 입력 3건 → 전략 연결 → 체크 → 새로고침 후 유지 확인 → 스크린샷
   - 필터 칩 `전체`에서 B2C·B2B 트랙이 함께 보이는지 스크린샷
   - **B2B 워크스페이스 주차 계획 탭이 빈 화면이 아닌지**(REQ-007) 스크린샷
5. **회고 이어받기** — 회고 항목 `다음 주로` → 다음 주 `지난주 회고 이어받기` 트랙에 항목이 생기는지 브라우저 확인.

## 작업 순서

1. `.claude/plans/crm-weekly-tracks.md`에 이 스펙을 REQ ID 그대로 복사(Phase 1 훅 통과용)
2. 마이그레이션 116 작성 → 사용자에게 112·116 실행 요청
3. 타입 → 순수 로직(`weekly-track-progress`, `weekly-track-derive`) TDD → API sanitize/normalize/route
4. 컴포넌트: `WeeklyKpiStrip` → `WeeklyTrackItems` → `WeeklyTrackCard` → `WeeklyTracks` → `WeeklyUnplanned` → `WeeklyPlan` 셸
5. 구 컴포넌트·테스트 삭제, `WeeklyQuickLog` 프롭 추가
6. 전체 테스트 + Playwright 검증 → `/checkpoint`


---

## Traceability Matrix (구현 후)

| REQ ID | Verification | Test File | Status |
|---|---|---|---|
| REQ-001 | (TEST) | `components/__tests__/WeeklyTracks.test.tsx` (15), `WeeklyTrackCard.test.tsx` (14) | Passing |
| REQ-002 | (TEST) | `src/lib/__tests__/weekly-track-progress.test.ts` (11) | Passing |
| REQ-003 | (TEST)(BROWSER) | `WeeklyTracks.test.tsx` 전략 연결 케이스 | Passing / 브라우저는 마이그레이션 116 후 |
| REQ-004 | (TEST)(BROWSER) | `WeeklyKpiStrip.test.tsx` (4), `WeeklyPlan.test.tsx` (6) | Passing / B2C·B2B 스크린샷 확인 |
| REQ-005 | (TEST) | `weekly-track-derive.test.ts` (9), `weekly-plan/__tests__/sanitize.test.ts` (23) | Passing / 실 DB GET으로 파생 확인 |
| REQ-006 | (TEST) | `weekly-plan/__tests__/{sanitize,route}.test.ts` | Passing / 이어받기 브라우저는 116 후 |
| REQ-007 | (TEST)(BROWSER) | `WeeklyPlan.test.tsx` | Passing / B2B 탭 렌더 스크린샷 확인 |

전체: `npx vitest run` → 101 파일 934 테스트 통과. `npx tsc --noEmit` 신규 오류 없음. eslint 통과.

## 검증 완료 (2026-08-19, 마이그레이션 116 적용 후)

DB 레벨 확인 — `curl` 라운드트립:
- 쓰기 200. 정제 규칙 실동작: 공백 트림, `"2"` → `2`, `-5` → `0`, 빈 텍스트 항목 드롭, 미지원 지표(`net_revenue`) → `null`, id 자동 생성
- **`NULL` vs `[]` 구분이 실 Postgres에서 성립**: 같은 레거시 데이터(focus 1 + actions 1)를 두고 `2024-11-18`(tracks `[]`)은 빈 채로 유지, `2024-11-25`(tracks `NULL`)은 2트랙으로 파생 → 지운 트랙이 되살아나지 않음
- 파생 규칙 실동작: `goal` + `memo` → `"결제 3건 — 전환율 높았음"`, `기타` 트랙에 `done: true` 보존
- `trackStrategyRefs` → `fetchWeeklyExecution` 연결 확인: 파생 트랙의 전략이 `planned: true`로 잡혀 '계획 외'로 오분류되지 않음

브라우저 확인 — Playwright CLI (Playwright MCP가 이 세션에 미연결이라 CLI로 대체):
- 프리셋 칩으로 트랙 추가 → 즉시 저장(에러 0)
- 실행 항목 Enter 연속 입력 2건 → 입력칸 비고 **포커스 유지**
- 전략 연결 드롭다운 13개 후보 → 연결 시 "전략을 연결하면 자동 집계됩니다" 힌트 사라지고 `적용 리드 N명` 표시
- `적용 기록` 후보가 **트랙의 전략만** 3개(placeholder + 2) — 전체 라이브러리 13개가 아님
- 새로고침 후 트랙·항목·목표·지표 모두 유지
- 회고 `다음 주로` → 다음 주에 `지난주 회고 이어받기` 트랙 생성 + `지난주 회고에서` 배지 + `carried_to` 기록
- B2B 워크스페이스 탭이 빈 화면이 아님(REQ-007), 콘솔 에러 없음(기존 admin layout hydration 경고만)
- B2B 전략 라이브러리가 실제로 비어 있어 드롭다운이 "전략 라이브러리가 비어 있습니다."를 정상 표시

## 미완 / 후속

- 검증 과정에서 생긴 잔여 행(과거 주차, 실사용과 무관): `weekly_plans`의 `(b2c, 2024-11-11)`, `(b2c, 2024-11-18)`, `(b2c, 2024-11-25)`, `(b2b, 2026-08-24)`. 정리 SQL은 사용자에게 전달.
- `2026-08-17` b2b에 문서 내용대로 `소프트웨어 판매` 트랙(목표 `오프라인 영업 미팅 1건 확정`, 지표 `적용 리드` 1, 항목 2건)이 남아 있다 — 검증 중 입력한 실제 계획 내용이라 지우지 않았다.
- B2B 전략 라이브러리가 비어 있어 B2B 트랙은 지표 자동 집계를 쓸 수 없다. `세일즈 전략 > 전략 라이브러리`에서 B2B 전략을 먼저 만들어야 한다.
- 범위 밖(그대로): `winback_plays` 연결, 지난주 계획 복사, 회고 기본 접기, 회고 AI 초안, 월요일 슬랙 리포트 양방향 연동, 세그먼트 판정 불일치(`segment` 컬럼 vs `company_id` vs `lead_type`).


---

## 후속 변경 (2026-08-19, 사용자 피드백)

### 실적 띠 → '이번 주 인입 리드' + 명단 아코디언

**매출·실수익 제거.** `payments.paid_at` 기준 "이번 주 입금액"(최초결제+재결제 현금 기준)인데
옆의 `결제`는 "이번 주 인입 리드 중 언제든 최초결제"라는 코호트 기준이라, 나란히 놓으면
"결제 0인데 매출 1,484만"으로 읽혀 오해를 만들었다(실제 그 주 매출은 전액 재결제 6건).
남은 `신규 리드 / 컨택 / 결제`는 모두 같은 코호트 축이다. 제목도 `이번 주 실적` → `이번 주 인입 리드`.
트랙 목표의 `매출` 지표는 그 트랙 리드의 최초결제만 세므로 그대로 유지.

**지표 클릭 → 리드 명단 아코디언.** `GET /api/crm/stats/detail?metric=&segment=&from=&to=` 재사용.
결제한 리드는 emerald, 칩 클릭 → 학생 패널. 값이 0이면 비활성.

### 발견·수정한 선행 버그 — overview와 detail의 코호트 불일치

아코디언을 붙이기 전 두 라우트의 카운트를 43주차에 걸쳐 대조해 **5건 불일치**를 발견했다.
숫자를 설명하는 아코디언이 다른 숫자를 보여주면 없는 것보다 나쁘므로 근본 수정했다.

| 불일치 | 원인 | 예 |
|---|---|---|
| `leads`·`contacted` | detail이 `created_at` 폴백을 써서 레거시 대량 임포트(inquiry_date NULL)를 끌어옴 | 2026-05-25주: 띠 19 vs 명단 **472** |
| `paid` | detail이 기간 내 결제만 봐서 "인입 후 다음 달 결제" 리드를 놓침 | 2026-05-04주: 띠 4 vs 명단 1 |

이 둘은 기존 `리드 현황·통계` 탭 드릴다운에도 있던 버그다(결제 명단 과소, 리드 명단 과대).

**수정**: 두 라우트가 드리프트할 수 없게 코호트 조회를 `src/lib/crm-stats-core.ts` 한 곳으로 옮겼다.
- `leadCohortQuery(db, select, from, to, segment)` — `inquiry_date`만, `created_at` 폴백 없음
- `paidCohortQuery(db)` — 기간 무관 전체 최초결제(환불 제외)
- `buildStatsDetail(..., opts.paidCohort)` — 넘기면 '언제든 결제' 집합으로 판정(미지정 시 기존 동작 유지)

수정 후 **43주차 전부 일치(불일치 0)**.

### 검증
- `npx vitest run` → 939 통과. `WeeklyKpiStrip.test.tsx` 9개(매출 미표시, 아코디언 열기/닫기, 조회 URL, 빈 명단, 0 비활성, 학생 패널 콜백)
- tsc·eslint 통과
- 브라우저: `신규 리드 6` → 칩 6개, `컨택 1` → 칩 1개(숫자와 명단 일치), `결제 0` 비활성, 재클릭 시 접힘, 콘솔 에러 없음
