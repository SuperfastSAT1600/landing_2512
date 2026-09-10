# 재결제 세일즈 칸반 + 주차별 통계

## Context

CRM B2C는 지금까지 "최초 세일즈"(신규 리드 → 결제)만 칸반으로 관리했다. 이미 결제해서 수강 중인 학생이 잔여 시간을 소진해 재결제가 필요해지는 흐름은 관리 도구가 없다 — `EnrolledLeads.tsx`의 "튜터링 중" 탭 안에 "재결제세일즈"라는 서브탭이 있긴 하지만, 이건 SFv2 잔여시간을 실시간 계산해서 보여주는 **평면 리스트**일 뿐 칸반도 아니고 담당자가 "이번 주에 누구를 챙길지" 선택하는 절차도, 그 결과를 추적할 저장 공간도 없다.

사용자가 원하는 것:
1. 재결제 담당자가 매주 대상자를 고르면 → 칸반 1단계로 진입
2. 4단계 퍼널: **1. 최초 컨택 전 → 2. 컨택 중 → 3. 결제 대기 → 4. 결제 완료**
3. 주차별 통계 (선정 인원 / 결제 완료 / 전환율)

**확정된 배치**: 완전히 새로운 탭. 기존 재시도(`RetryKanban`, 이탈 리드 재접촉용 — 개념이 다름)를 재활용하지 않는다. 위치는 "최초 세일즈" 탭 바로 옆.

조사 결과 대상 모수를 가리는 로직은 이미 존재한다 — `src/app/api/admin/srm/tutoring-users/route.ts`가 SFv2 잔여시간과 결제 상태를 계산해 `status: 'sales'`를 매긴다("사용 시간이 구매 시간 초과 + 활성 결제 → 재결제 세일즈", L193-203). 이 계산 로직은 그대로 재사용하고, 새로 만드는 것은 **그 후보군 중 누구를 이번 주에 파이프라인에 올렸고 지금 몇 단계인지 추적하는 저장소 + 칸반 UI**다.

## Requirements

### REQ-001: DB — `renewal_targets` 테이블 (마이그레이션 110)
- **Priority**: Must
- **Description**: 재결제는 학생 생애주기 동안 반복된다(패키지가 끝날 때마다 다시 대상이 됨). `retry_strategy_id`/`retry_stage`처럼 `students` 컬럼을 덮어쓰면 지난 주차 이력이 사라져 REQ-003(주차별 통계)이 불가능해진다. `winback_targets`(마이그레이션 107)와 동일한 이유로 **전용 테이블**을 쓴다.
  ```sql
  CREATE TABLE renewal_targets (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id            UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    week_start            DATE NOT NULL,  -- src/lib/week-definitions.ts WEEK_DEFINITIONS[].start 와 일치
    stage                 TEXT NOT NULL DEFAULT '1' CHECK (stage IN ('1','2','3','4')),
    stage_updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    converted_payment_id  UUID REFERENCES payments(id) ON DELETE SET NULL,
    created_by            TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, week_start)
  );
  CREATE INDEX idx_renewal_targets_stage ON renewal_targets(stage);
  CREATE INDEX idx_renewal_targets_week  ON renewal_targets(week_start DESC);
  CREATE INDEX idx_renewal_targets_student ON renewal_targets(student_id);
  ```
  RLS는 067/107 관례 그대로: `service_role_all` FOR ALL USING(true), `anon_deny` FOR ALL USING(false).
- **Acceptance Criteria**: 마이그레이션 실행 후 테이블 존재 확인. 같은 학생을 같은 주에 두 번 넣으면 UNIQUE 제약으로 막힘.
- **Verification**: (MANUAL) 사용자가 Supabase에서 직접 실행 후 `\d renewal_targets` 확인 (이 저장소 관례: DB 변경은 사용자가 Supabase 콘솔에서 직접 적용)

### REQ-002: 타입 정의
- **Priority**: Must
- **Description**: `src/types/crm.ts`에 추가:
  ```ts
  export type RenewalStage = '1' | '2' | '3' | '4';
  export const RENEWAL_STAGES: RenewalStage[] = ['1', '2', '3', '4'];
  export const RENEWAL_STAGE_LABELS: Record<RenewalStage, string> = {
    '1': '최초 컨택 전', '2': '컨택 중', '3': '결제 대기', '4': '결제 완료',
  };
  export interface RenewalTarget {
    id: string;
    student_id: string;
    week_start: string;
    stage: RenewalStage;
    stage_updated_at: string;
    converted_payment_id: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    student?: Student; // API가 join해서 내려줄 때만 존재
  }
  ```
  `FunnelStage`/`RETRY_STAGES` 옆에 나란히 정의해 기존 패턴과 통일한다.
- **Acceptance Criteria**: 타입 추가 후 `npm run type-check` 통과.
- **Verification**: (TEST) 별도 테스트 불필요 — 아래 REQ들의 타입체크로 커버됨

### REQ-003: API — 목록/생성/이동/삭제
- **Priority**: Must
- **Description**: 기존 `retry-strategies`/`winback-targets` 라우트 스타일을 그대로 따른다 (`isAuthenticated` → `supabaseAdmin` → `{ data }`/`{ error }`).
  - `GET /api/crm/renewal-targets` — 전체 목록 반환, `students`를 join해서 카드 렌더링에 필요한 필드(`name`, `grade`, `parent_phone`, `is_vip` 등) 포함. `?week_start=` 쿼리로 특정 주차만 필터 가능(통계용, REQ-005와 공유).
  - `POST /api/crm/renewal-targets` — body `{ student_id }`. 서버가 `week_start`를 현재 날짜 기준 `getWeekDef()`(`src/lib/week-definitions.ts`)로 자동 계산해 stage `'1'`로 생성. **가드**: 해당 학생에게 이미 열려있는(`stage IN ('1','2','3')`) 행이 있으면 409 반환("이미 재결제 파이프라인에 있습니다") — UNIQUE(student_id, week_start)만으로는 동일 학생이 다른 주에 중복 추가되는 걸 못 막으므로 애플리케이션 레벨에서 별도 체크.
  - `PATCH /api/crm/renewal-targets/[id]` — body `{ stage, converted_payment_id? }`. `stage_updated_at`을 항상 갱신. `stage: '4'`로 갈 때만 `converted_payment_id` 저장.
  - `DELETE /api/crm/renewal-targets/[id]` — 잘못 추가한 경우 파이프라인에서 제거(학생 자체엔 영향 없음).
- **Acceptance Criteria**: POST 중복 시 409. PATCH로 stage 변경 시 `stage_updated_at` 갱신 확인. DELETE 후 GET 목록에서 사라짐.
- **Verification**: (TEST) `src/app/api/crm/renewal-targets/__tests__/route.test.ts`, `src/app/api/crm/renewal-targets/[id]/__tests__/route.test.ts` — `src/app/api/crm/payments/__tests__/route.test.ts` 패턴(`vi.mock('@/lib/supabase-admin')`, `x-admin-key`) 그대로 따름

### REQ-004: API — 주차별 통계
- **Priority**: Must
- **Description**: `GET /api/crm/renewal-targets/stats`. `renewal_targets`를 `week_start`로 그룹핑해 반환:
  ```ts
  interface RenewalWeeklyStat {
    week_start: string;
    week_label: string;   // getWeekLabel(week_start) — "25년 05월 03주차"
    selected: number;     // 그 주 전체 선정 인원
    completed: number;    // stage === '4'
    conversion_rate: number; // completed / selected
  }
  ```
  `src/app/api/crm/stats/route.ts`의 `weekMap` 집계 패턴(Map으로 그룹핑 후 정렬된 배열 반환)을 그대로 따른다. 최근 N주(기본 8주, `?weeks=` 로 조절 가능)만 반환.
- **Acceptance Criteria**: 서로 다른 주차 데이터가 섞이지 않고 주차별로 정확히 집계된다.
- **Verification**: (TEST) `src/app/api/crm/renewal-targets/stats/__tests__/route.test.ts`

### REQ-005: UI — `RenewalKanban` 컴포넌트
- **Priority**: Must
- **Description**: 새 파일 `src/app/admin/crm/components/RenewalKanban.tsx`. `SalesKanban.tsx`의 구조(4단계 고정 배열, `@dnd-kit` DnD, `useMemo`로 stage별 그룹핑, `StudentCard` 재사용)를 따르되 컬럼 4개, 전략 사이드바 없음(단일 보드 — RetryKanban처럼 여러 전략 나눌 필요 없음).
  - 상단에 "재결제 대상 추가" 버튼 → 검색 팝오버. 후보 목록은 **새 API를 만들지 않고** `EnrolledLeads.tsx`가 이미 하는 방식 그대로: `/api/crm/students?lead_status=enrolled` + `/api/admin/srm/tutoring-users` 를 병렬 fetch → `status === 'sales'`인 학생만, 그중 이미 열린 `renewal_targets` 행이 없는 학생만 필터링 → 이름 검색.
  - 컬럼 1~3: 드래그로 자유 이동 (`PATCH /api/crm/renewal-targets/[id]` `{ stage }`).
  - 컬럼 4(결제 완료) 진입은 **드래그 금지, 버튼으로만** — `SalesKanban`이 stage 8을 드래그로 못 들어가게 막는 것과 동일 이유(결제는 실제 트랜잭션이 있어야 함). 컬럼 3의 카드에 "결제 완료 처리" 버튼 → 기존 `PaymentModal` 재사용 → 확인 시 `PATCH { stage: '4', converted_payment_id }`.
  - 카드의 "제외" 버튼 → `DELETE` (실수로 추가한 경우).
- **Acceptance Criteria**: 후보 검색 → 추가 → 1단계 카드 생성. 드래그로 1→2→3 이동. 3에서 결제 완료 처리 → 4로 이동 + payments 테이블에 `payment_type: '재결제'` 행 생성.
- **Verification**: (BROWSER) dev 서버에서 실제 드래그 + 결제 완료까지 전체 플로우 확인

### REQ-006: `PaymentModal`에 결제 유형 기본값 prop 추가
- **Priority**: Should
- **Description**: `src/app/admin/crm/components/PaymentModal.tsx`에 `defaultPaymentType?: PaymentType` prop 추가. `useState<PaymentType | null>(defaultPaymentType ?? null)`로 초기화만 바꾸면 된다(한 줄). `RenewalKanban`에서 `defaultPaymentType="재결제"`로 호출해 담당자가 매번 "재결제"를 수동으로 고르지 않아도 되게 한다. 기존 `SalesKanban` 호출부는 prop 생략 → 동작 변화 없음.
- **Acceptance Criteria**: RenewalKanban에서 연 PaymentModal은 "재결제" 단계가 미리 선택돼 있다. SalesKanban에서 연 것은 기존과 동일하게 미선택 상태.
- **Verification**: (BROWSER)

### REQ-007: 새 탭 배치
- **Priority**: Must
- **Description**: `src/app/admin/crm/components/LeadsHub.tsx`:
  - `HubTab` 유니온에 `'renewal'` 추가: `'kanban' | 'renewal' | 'retry' | 'enrolled' | 'pool' | 'stats'`
  - 탭 버튼 배열에서 `{ key: 'kanban', label: '최초 세일즈' }` **바로 다음**에 `{ key: 'renewal', label: '재결제 세일즈' }` 삽입 (요청대로 최초 세일즈 옆)
  - `{subTab === 'renewal' && <RenewalKanban adminKey={adminKey} onStudentClick={onStudentClick} onStudentUpdate={onStudentUpdate} />}` 블록 추가
  - 3단계 수정 패턴은 커밋 `4ea47787`(재시도 탭 추가) 방식 그대로 반복
- **Acceptance Criteria**: CRM → 리드 현황·통계 → 탭 순서가 [최초 세일즈] [재결제 세일즈] [재시도] [튜터링 중] [이탈 리드풀] [통계] 로 보인다.
- **Verification**: (BROWSER)

### REQ-008: UI — 주차별 통계 (탭 내부)
- **Priority**: Must
- **Description**: `RenewalKanban.tsx` 상단(칸반 위)에 `RenewalWeeklyStats` 서브컴포넌트. `SalesStats.tsx`의 `WeeklyTable` 관례를 따라 **recharts가 아니라 HTML 테이블**로 최근 8주: 주차 / 선정 인원 / 결제 완료 / 전환율. `GET /api/crm/renewal-targets/stats` 호출.
- **Acceptance Criteria**: 주차별 행이 최신순으로 보이고 숫자가 칸반 데이터와 일치한다.
- **Verification**: (BROWSER)

---

## Technical Design

### 새로 만드는 파일

| 파일 | 내용 |
|---|---|
| `supabase/migrations/110_renewal_targets.sql` | REQ-001 |
| `src/app/api/crm/renewal-targets/route.ts` | GET(목록)/POST(생성) — REQ-003 |
| `src/app/api/crm/renewal-targets/[id]/route.ts` | PATCH(단계 이동)/DELETE — REQ-003 |
| `src/app/api/crm/renewal-targets/stats/route.ts` | GET(주차별 집계) — REQ-004 |
| `src/app/admin/crm/components/RenewalKanban.tsx` | 칸반 본체 — REQ-005 |
| `src/app/admin/crm/components/RenewalWeeklyStats.tsx` | 주차별 통계 테이블 — REQ-008 (파일 200줄 상한 고려해 분리) |

### 수정하는 파일

| 파일 | 변경 |
|---|---|
| `src/types/crm.ts` | `RenewalStage`, `RENEWAL_STAGES`, `RENEWAL_STAGE_LABELS`, `RenewalTarget` 추가 — REQ-002 |
| `src/app/admin/crm/components/LeadsHub.tsx` | 탭 추가 3곳 — REQ-007 |
| `src/app/admin/crm/components/PaymentModal.tsx` | `defaultPaymentType` prop 1줄 — REQ-006 |

### 재사용할 기존 코드 (새로 만들지 않는 것)

| 용도 | 위치 |
|---|---|
| 재결제 후보 판별 로직 (SFv2 잔여시간 계산) | `src/app/api/admin/srm/tutoring-users/route.ts` — 그대로 호출, 수정 없음 |
| 후보 검색 dual-fetch 패턴 | `src/app/admin/crm/components/EnrolledLeads.tsx` L143-159 (`lead_status=enrolled` + `tutoring-users` 병렬 fetch 후 클라이언트 매칭) |
| 칸반 DnD 골격 | `src/app/admin/crm/components/SalesKanban.tsx` (`@dnd-kit`, `useMemo` 그룹핑, stage 4 드래그 금지 패턴은 stage 8 금지 로직과 동일 원리) |
| 학생 카드 | `src/app/admin/crm/components/StudentCard.tsx` |
| 결제 모달·API | `PaymentModal.tsx` + `POST /api/crm/students/[id]/payment` — `payment_type: '재결제'`는 이미 지원됨(`payments` 테이블 CHECK 제약, 마이그레이션 028) |
| 주차 정의/라벨 | `src/lib/week-definitions.ts` (`getWeekDef`, `getWeekDefByStart`, `getWeekLabel`) — 새 주차 계산 로직 절대 새로 만들지 않는다 |
| 주차별 통계 집계 패턴 | `src/app/api/crm/stats/route.ts` L292-350 (`weekMap` Map 그룹핑 → 정렬된 배열) |
| 주차별 테이블 UI 패턴 | `src/app/admin/crm/components/SalesStats.tsx` L197-242 `WeeklyTable` — recharts 아님, HTML `<table>` |

### 데이터 흐름

```
1. 담당자가 [재결제 세일즈] 탭 → "재결제 대상 추가"
2. 후보 검색 (tutoring-users status='sales' ∩ lead_status=enrolled ∩ 열린 renewal_target 없음)
3. 선택 → POST /api/crm/renewal-targets { student_id }
     → 서버가 현재 주차(week_start) 자동 계산, stage='1' 로 생성
4. 담당자가 드래그: 1(최초 컨택 전) → 2(컨택 중) → 3(결제 대기)
     → PATCH { stage }
5. 3에서 "결제 완료 처리" → PaymentModal(defaultPaymentType='재결제')
     → POST /api/crm/students/[id]/payment (기존 API, 변경 없음)
     → 성공 시 PATCH /api/crm/renewal-targets/[id] { stage:'4', converted_payment_id }
6. 통계 테이블: GET /api/crm/renewal-targets/stats → 주차별 선정/완료/전환율
```

### Dependencies

신규 의존성 없음. `@dnd-kit/*`는 이미 설치됨. recharts는 이번 기능에서 쓰지 않는다(REQ-008이 테이블 방식을 택한 이유).

---

## Traceability Matrix

| REQ ID | Description | Verification | Test File | Status |
|---|---|---|---|---|
| REQ-001 | `renewal_targets` 마이그레이션 | (MANUAL) | — | Pending |
| REQ-002 | 타입 정의 | — | — | Pending |
| REQ-003 | 목록/생성/이동/삭제 API | (TEST) | `src/app/api/crm/renewal-targets/__tests__/route.test.ts`, `.../[id]/__tests__/route.test.ts` | Pending |
| REQ-004 | 주차별 통계 API | (TEST) | `src/app/api/crm/renewal-targets/stats/__tests__/route.test.ts` | Pending |
| REQ-005 | RenewalKanban UI | (BROWSER) | — | Pending |
| REQ-006 | PaymentModal 기본 결제유형 | (BROWSER) | — | Pending |
| REQ-007 | 탭 배치 | (BROWSER) | — | Pending |
| REQ-008 | 주차별 통계 UI | (BROWSER) | — | Pending |

## Implementation Order

1. **REQ-001** — 마이그레이션 작성 (사용자가 Supabase에서 직접 실행할 것이므로, 파일만 만들고 실행 대기 상태로 둔다)
2. **REQ-002** — 타입. 이후 모든 것이 이 타입을 참조
3. **REQ-003** — CRUD API. 테스트 먼저(TDD 훅)
4. **REQ-004** — 통계 API
5. **REQ-006** — PaymentModal 1줄 변경 (REQ-005가 의존)
6. **REQ-005** — RenewalKanban 본체
7. **REQ-008** — 주차별 통계 UI (RenewalKanban 내부에 배치)
8. **REQ-007** — 탭 연결 (마지막 — 이 시점부터 실제로 화면에 보임)

---

## Verification

```bash
npm test
npm run check     # format:check + lint + typecheck
npm run dev
```

**E2E 수동 확인**
1. `/admin/crm` → B2C → 리드 현황·통계 → **[재결제 세일즈]** 탭이 최초 세일즈 옆에 보이는지 확인
2. "재결제 대상 추가" → SFv2 잔여시간 소진 학생이 검색되는지 확인 (없으면 테스트 학생의 tutoring 데이터를 조정하거나 Supabase에서 임시로 `renewal_targets` 행을 직접 넣어 칸반 렌더링만 우선 확인)
3. 드래그로 1→2→3 이동
4. 3에서 "결제 완료 처리" → PaymentModal에 "재결제"가 미리 선택돼 있는지 확인 → 결제 완료 → 카드가 4번 컬럼으로 이동
5. `payments` 테이블에 `payment_type='재결제'` 행이 생겼는지 Supabase에서 확인
6. 상단 주차별 통계 테이블에 이번 주 선정 1명 / 완료 1명 / 전환율 100% 로 반영되는지 확인

**DB 확인**
```sql
select * from renewal_targets order by created_at desc limit 5;
```

---

## Out of Scope

- 재결제 대상 자동 알림(카톡/슬랙) — 담당자가 수동으로 "튜터링 중" 탭 또는 이 새 탭에서 확인 후 수동 추가
- `MatchingKanban.tsx`처럼 미사용 상태로 방치될 위험 — 이번엔 `LeadsHub`에 바로 연결하므로 해당 없음
- 기존 "튜터링 중 → 재결제세일즈" 서브탭(`EnrolledLeads.tsx` L37) 제거 — 그대로 둔다. 그 서브탭은 "후보 전체 목록"이고 새 칸반은 "이번 주 파이프라인"이라 역할이 다르며, 후보 검색 시 그 로직을 그대로 재사용하므로 중복 유지 비용이 낮다
- 재결제 실패(이탈) 처리 자동화 — 카드에 "제외"(DELETE, 파이프라인에서만 제거)만 두고, 실제 이탈 처리(`ChurnModal`)는 이번 범위에서 배선하지 않는다. 다음 이터레이션에서 필요성 판단
