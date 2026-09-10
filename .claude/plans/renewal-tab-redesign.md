# 재결제 세일즈 탭 재설계 (renewal-tab-redesign)

## Overview

CRM `리드 현황·통계 > 재결제 세일즈` 탭의 목적은 **주차별 재결제 대상 인원과 결제 전환율 측정**이다.
현재 미커밋 구현은 (1) 보드가 주차와 무관해 상단 전환율이 주차별 표와 어긋나고, (2) 미전환 종결 수단이
하드 삭제뿐이라 전환율 분모가 부정확하고, (3) UI가 프로젝트 디자인 언어(`KanbanStatsStrip`/`SalesKanban`)와
다르고, (4) 후보 학생 목록이 `튜터링 중` 탭과 달라 SRM 잔여시간·튜터링 상태 신호를 버린다.

전체 설계 근거는 `~/.claude/plans/composed-meandering-sifakis.md` 참조.

**사용자 확정 사항**: 전환율은 선정 주차(코호트) 기준 / 미전환은 5번째 터미널 단계 / 카드·후보에 잔여시간·상태 표시 + 급한 순 정렬.

## Requirements

### REQ-001: 미전환 단계 데이터 모델
- **Priority**: Must
- **Description**: `renewal_targets.stage` CHECK 제약을 `('1'..'5')`로 확장하고 `drop_reason TEXT` 컬럼을 추가한다. 마이그레이션 110은 이미 적용되어 있으므로 111을 신규 추가한다. `src/types/crm.ts`에 `RenewalStage '5'`, `RENEWAL_STAGE_LABELS['5'] = '미전환'`, `RenewalTarget.drop_reason`, `RENEWAL_DROP_REASONS`를 반영한다.
- **Acceptance Criteria**: `supabase/migrations/111_renewal_targets_dropped.sql` 존재. 적용 후 `stage='5'` + `drop_reason` insert 성공. 타입에서 `RENEWAL_STAGES.length === 5`.
- **Verification**: (TEST) `RENEWAL_STAGES`/`RENEWAL_STAGE_LABELS`/`RENEWAL_DROP_REASONS` 단정 + (MANUAL) 사용자가 Supabase에서 111 적용

### REQ-002: PATCH가 미전환 단계와 사유를 저장
- **Priority**: Must
- **Description**: `PATCH /api/crm/renewal-targets/[id]`가 `stage '5'`를 허용하고, `stage === '5'`일 때만 `drop_reason`을 저장한다(기존 `converted_payment_id`가 `stage === '4'`에서만 저장되는 패턴과 동일). 응답에 student join을 추가해 GET/POST와 shape을 일치시킨다.
- **Acceptance Criteria**: `{stage:'5', drop_reason:'예산'}` → 200 + 저장. `{stage:'2', drop_reason:'예산'}` → `drop_reason` 미저장. `{stage:'9'}` → 400 `INVALID_STAGE`.
- **Verification**: (TEST) `src/app/api/crm/renewal-targets/[id]/__tests__/route.test.ts`

### REQ-003: 보드 스코프 조회 (`?scope=open`)
- **Priority**: Must
- **Description**: `GET /api/crm/renewal-targets`에 `?scope=open`을 추가해 `stage in ('1','2','3')`만 반환한다. 기존 `?week_start=`(코호트 조회)와 무파라미터(전체)는 유지한다.
- **Acceptance Criteria**: `?scope=open`은 4·5단계 행을 제외한다. `?week_start=`는 해당 주차 5단계 전부를 반환한다.
- **Verification**: (TEST) `src/app/api/crm/renewal-targets/__tests__/route.test.ts`

### REQ-004: 주차별 통계에 진행 중·미전환 추가 + 전체 스캔 제거
- **Priority**: Must
- **Description**: `GET /api/crm/renewal-targets/stats?weeks=N`이 현재 테이블 전체를 select한 뒤 JS에서 slice한다. `src/lib/week-definitions.ts`에 `getRecentWeekStarts(weeks)` 헬퍼를 추가해 하한을 구하고 `.gte('week_start', cutoff)`를 적용한다. 응답에 `open`(1~3), `dropped`(5)를 추가하고 `conversion_rate = completed / selected`를 유지한다.
- **Acceptance Criteria**: 응답 각 행이 `{week_start, week_label, selected, open, completed, dropped, conversion_rate}`. cutoff 밖 주차는 쿼리 단계에서 제외.
- **Verification**: (TEST) `src/app/api/crm/renewal-targets/stats/__tests__/route.test.ts`

### REQ-005: 후보 목록을 `튜터링 중` 탭과 동일한 행 UI로
- **Priority**: Must
- **Description**: `EnrolledLeads.tsx`의 private `TutoringCard` + `STATUS_META`를 `TutoringStudentRow.tsx`로 추출해 공용화한다(우측 액션만 `action?: ReactNode` slot으로 분기). `EnrolledLeads`는 import만 하도록 바꿔 시각적 변화 0을 유지한다. 재결제 후보 패널은 이 행을 쓰고 액션만 `+ 대상 추가`로 바꾼다. 패널은 `+ 재결제 대상 추가` 버튼으로 여닫으며(기본 닫힘) 상태 서브탭 + VIP 토글 + 이름 검색을 포함한다.
- **Acceptance Criteria**: 후보 행에 이름·학년·VIP·상태 배지·전화번호·`잔여 Nh`·유입소스가 `튜터링 중`과 동일하게 표시된다. `튜터링 중` 탭 렌더 결과는 리팩터링 전후 동일.
- **Verification**: (BROWSER) 두 탭 스크린샷 대조 + (TEST) `TutoringStudentRow` 렌더 테스트

### REQ-006: 단일 fetch 소유자 + `튜터링 중`과 동일한 데이터 소스
- **Priority**: Must
- **Description**: `RenewalKanban`이 유일한 fetch 소유자가 되어 `renewal-targets` + `students?lead_status=enrolled` + `admin/srm/tutoring-users` 3개만 병렬 호출하고 `Map<studentId, {remainingHours, status}>`를 만들어 하위로 내린다. `RenewalCandidateAdd`의 자체 fetch(effect deps `[adminKey, targets]` 재fetch 루프), 3번째 `students` fetch, `fetchLinkedStudents` 배치 조회를 삭제한다. `students/route.ts`의 `student_ids` 파라미터를 되돌린다. `renewal-candidate-source.ts`의 `as unknown as Student` 합성을 제거하고 정렬을 `remainingHours 오름차순 → sales 우선 → 이름`으로 바꾼다.
- **Acceptance Criteria**: 드래그·추가·삭제 시 후보 목록 재fetch가 발생하지 않는다. `getRenewalCandidates`는 가짜 학생 객체를 만들지 않는다.
- **Verification**: (TEST) `renewal-candidate-source.test.ts` (정렬·제외 규칙) + (BROWSER) 드래그 후 network 재요청 없음

### REQ-007: 5컬럼 칸반 + 전용 `RenewalCard`
- **Priority**: Must
- **Description**: 컬럼을 5개(1.최초 컨택 전 / 2.컨택 중 / 3.결제 대기 / 4.결제 완료 / 5.미전환)로 확장하고 미사용 `isSearchMatch` prop을 제거한다. 공용 `StudentCard` 재사용을 포기하고 `RenewalCard.tsx`를 만든다 — 잔여시간·튜터링 상태·`stage_updated_at` 기준 단계 D+N·선정 주차 배지를 표시하고, 액션(`결제`/`미전환`/`제외`)을 hover 아이콘이 아닌 상시 노출 라벨 버튼으로 둔다. `StudentCard.tsx`에 추가된 `onRemove`/`hideRemove`/`sortableId`를 되돌린다.
- **Acceptance Criteria**: 3단계 카드에만 `결제` 버튼. 1~3단계에 `미전환`·`제외`. 4·5단계는 액션 없음(5는 `되돌리기`). D+N이 `stage_updated_at` 기준.
- **Verification**: (TEST) `RenewalCard.test.tsx` (단계별 액션 노출, D+N 기준) + (BROWSER) 스크린샷

### REQ-008: 단계 이동 규칙
- **Priority**: Must
- **Description**: 드래그는 1↔2↔3만 허용. 4·5는 터미널로 드래그 진입/이탈 금지. 3→4는 `결제` 버튼(`PaymentModal defaultPaymentType="재결제"`)만. 1~3→5는 `RenewalDropModal`(사유 선택 + 메모)을 거친다. 5→2 `되돌리기` 허용. `제외`(DELETE)는 카드 내 2단계 확인 후 실행.
- **Acceptance Criteria**: 4·5단계 카드는 드래그로 이동하지 않는다. `제외`는 첫 클릭에 삭제되지 않는다.
- **Verification**: (BROWSER) 드래그·버튼 조작 + 새로고침 후 상태 유지

### REQ-009: 주차 스코프 컨트롤 + 인라인 요약 스트립
- **Priority**: Must
- **Description**: `KanbanFilter`(학년/유입소스/희망과목/리드타입 — 재학생에게 무의미)를 제거하고 `주차 셀렉터(기본: 진행 중 전체) + VIP 토글 + 이름 검색 + 대상 추가 버튼`으로 교체한다. `RenewalStatsStrip`을 `KanbanStatsStrip.tsx:84-125` 어법의 인라인 텍스트 스트립으로 재작성하고 **현재 스코프 기준**으로만 계산한다(역대 전환율 제거). 반올림 경로를 공용 `formatRate()` 하나로 통일한다.
- **Acceptance Criteria**: 특정 주차 선택 시 스트립 숫자가 주차별 표의 해당 행과 일치한다. 박스·이중 보더가 없다.
- **Verification**: (TEST) `RenewalStatsStrip.test.tsx` 재작성 + (BROWSER) 스트립 ↔ 표 숫자 대조

### REQ-010: 주차별 표 확장 + 행 클릭 연동
- **Priority**: Should
- **Description**: 컬럼을 `주차 | 선정 | 진행 중 | 결제 완료 | 미전환 | 전환율`로 확장한다. 행 클릭 시 보드 스코프가 그 주차로 바뀐다(선택 행 `bg-blue-50`). 헤더 행에 `bg-gray-50`을 주고 `table`의 무의미한 `text-sm`을 제거한다. API의 `conversion_rate`를 그대로 쓰고 클라이언트 재계산을 삭제한다.
- **Acceptance Criteria**: 행 클릭 → 보드가 해당 코호트만 표시. 전환율 값이 API 값과 동일.
- **Verification**: (BROWSER) 행 클릭 후 보드·스트립 변화 확인

### REQ-011: 결제 → 4단계 전환 실패 복구
- **Priority**: Should
- **Description**: 결제 생성 후 `PATCH stage:'4'`가 실패하면 결제는 남고 카드는 3단계에 머문다. 오류 배너에 `4단계로 이동 재시도` 버튼을 노출한다(PATCH는 멱등). `paymentId`는 `PaymentModal.tsx:270-277`에서 이미 전달된다.
- **Acceptance Criteria**: PATCH 실패를 강제하면 재시도 버튼이 뜨고, 클릭 시 4단계 전환이 완료된다.
- **Verification**: (BROWSER) PATCH 실패 주입 후 재시도

### REQ-012: prettier 재포맷 노이즈 되돌리기
- **Priority**: Must
- **Description**: `PaymentModal.tsx`(251줄 변경 중 실제 변경 2곳), `types/crm.ts`, `students/route.ts`, `StudentCard.tsx`의 포맷 전용 hunk를 되돌려 실제 변경만 남긴다. `PaymentModal`의 `defaultPaymentType`과 `onConfirm(student, paymentId?)`는 유지한다.
- **Acceptance Criteria**: `git diff` 상 각 파일의 변경이 기능 변경 라인만 남는다.
- **Verification**: (MANUAL) `git diff` 검토

### REQ-013: 플랫폼 Payment 페이지 시간 내역을 CRM 재결제 탭에 노출
- **Priority**: Must
- **Description**: 담당자는 재결제 대상을 고를 때 `app.superfastsat.io/admin/payment`에서 잔여 시간을 보고 판단한다. 그 수치를 CRM 안으로 옮겨 탭 이동을 없앤다. `/api/admin/srm/tutoring-users`가 `netRemainingHours`(부호 있는 잔여 = 구매−환불−완료), `scheduledHours`(approved + awaiting_confirmation coach_room), `unscheduledHours`(max(0, 잔여−예약)), `overscheduledHours`(max(0, 예약−잔여)), `subjects`, `paymentStatus`를 추가로 반환한다. 기존 `remainingHours`(0 하한)는 SRM 화면 4곳이 그대로 쓰므로 의미를 바꾸지 않는다. 후보 목록은 Payment 페이지와 같은 정렬 가능 표(`RenewalCandidateTable`)로 바꾸고 행마다 `추가` 버튼을 둔다. 칸반 카드에도 `잔여/예약/초과`를 표시한다.
- **Acceptance Criteria**: Ruby Chung 행이 Payment 페이지와 동일하게 `구매 12 / 완료 15 / 잔여 -3 / 예약 19`를 표시한다. 0 표기 규칙도 동일(구매·완료·잔여·예약은 0도 숫자, 환불·미예약·초과예약은 0이면 `—`). 기본 정렬은 초과예약 desc → 잔여 asc.
- **Verification**: (TEST) `RenewalCandidateTable.test.tsx` + (BROWSER) Payment 페이지 스크린샷과 수치 대조

### REQ-014: Payment 페이지형 SUBJECT / STATUS 체크박스 필터
- **Priority**: Must
- **Description**: Payment 페이지 좌측 사이드바(SEARCH / SUBJECT / STATUS)와 같은 배치의 다중 선택 필터를 후보 패널에 추가한다. `RenewalCandidateFilters`(사이드바 UI) + `renewal-candidate-filters.ts`(순수 규칙). 각 옵션에 해당 인원 수를 표시하고 그룹별 전체 선택/해제와 필터 초기화를 제공한다. 과목·결제 상태가 없는 항목(SRM 미연결)은 `미지정` 옵션으로 명시해 규칙을 모호하지 않게 한다. 이름 검색은 사이드바가 소유하고 `TutoringListControls`의 검색은 `showSearch={false}`로 끈다.
- **Acceptance Criteria**: SUBJECT/결제 상태를 조합해 표가 즉시 좁혀지고, 사이드바 하단에 `N / 전체명`이 표시된다. **기본값은 전체 선택** — Payment 페이지 기본값(Onboarding+Active)을 쓰면 재결제 대상 39명 중 31명(결제 inactive)이 숨는다.
- **Verification**: (TEST) `renewal-candidate-filters.test.ts` (14 pass) + (BROWSER) 실데이터 조합 검증

## Technical Design

### Architecture
- 표현 계층: `RenewalKanban`(상태·fetch 소유) → `RenewalStatsStrip` / `RenewalWeeklyStats` / `RenewalCandidateAdd`(순수) / `RenewalKanbanColumn` → `RenewalCard`.
- 디자인 언어 참조: `KanbanStatsStrip.tsx`(인라인 스트립), `SalesKanban.tsx:249-272`(칸반 컨테이너), `stats-primitives.tsx:191-255`(표), `EnrolledLeads.tsx:70-124`(학생 행).
- 재사용: `PaymentModal`, `ChurnModal`(모달 형식), `getWeekDef`/`getWeekLabel`(`src/lib/week-definitions.ts`), `RefundModal` 패턴.
- DB: `renewal_targets`(마이그레이션 110 적용 완료) + 111로 stage 확장.

### Dependencies
신규 의존성 없음. 기존 `@dnd-kit/core`·`@dnd-kit/sortable`·`lucide-react`·`vitest` 사용.

## Traceability Matrix

| REQ ID  | Description                          | Verification | Test File                                                             | Status  |
|---------|--------------------------------------|--------------|-----------------------------------------------------------------------|---------|
| REQ-001 | 미전환 단계 데이터 모델              | (TEST)/(MANUAL) | `supabase/migrations/111_renewal_targets_dropped.sql`               | 코드 완료 / **111 적용 대기** |
| REQ-002 | PATCH 미전환 + 사유 저장             | (TEST)       | `src/app/api/crm/renewal-targets/[id]/__tests__/route.test.ts` (10 pass) | Done (라이브 경로는 111 적용 후) |
| REQ-003 | `?scope=open` 조회                   | (TEST)       | `src/app/api/crm/renewal-targets/__tests__/route.test.ts` (9 pass)     | Done |
| REQ-004 | 통계 open/dropped + week 하한        | (TEST)       | `src/app/api/crm/renewal-targets/stats/__tests__/route.test.ts` (7 pass) | Done |
| REQ-005 | 후보 행 = 튜터링 중 행               | (TEST)+(BROWSER) | `.../__tests__/TutoringStudentRow.test.tsx` (9 pass)              | Done |
| REQ-006 | 단일 fetch + 후보 소스 일치          | (TEST)       | `.../__tests__/renewal-candidate-source.test.ts` (8 pass)             | Done |
| REQ-007 | 5컬럼 + RenewalCard                  | (TEST)       | `.../__tests__/RenewalCard.test.tsx` (12 pass)                        | Done |
| REQ-008 | 단계 이동 규칙                       | (BROWSER)    | Playwright 1→2 드래그 + 새로고침 유지 확인                            | Done (미전환/되돌리기는 111 적용 후) |
| REQ-009 | 주차 스코프 + 인라인 스트립          | (TEST)+(BROWSER) | `.../__tests__/RenewalStatsStrip.test.tsx` (7 pass)               | Done |
| REQ-010 | 주차별 표 확장 + 행 클릭             | (BROWSER)    | 행 클릭 → 코호트 스코프(선정 5 / 전환율 20%) 확인                     | Done |
| REQ-011 | 결제→4단계 전환 실패 복구            | (BROWSER)    | 재시도 버튼 구현 — 실패 주입 미검증                                    | 코드 완료 / 미검증 |
| REQ-012 | prettier 노이즈 되돌리기             | (MANUAL)     | `git diff` — PaymentModal 251줄 → 20줄                                | Done |
| REQ-013 | Payment 페이지 시간 내역 노출        | (TEST)+(BROWSER) | `.../__tests__/RenewalCandidateTable.test.tsx` (10 pass)           | Done |
| REQ-014 | SUBJECT / 결제 상태 체크박스 필터    | (TEST)+(BROWSER) | `.../__tests__/renewal-candidate-filters.test.ts` (14 pass)        | Done |
| 추가    | `getRecentWeeks` 헬퍼                | (TEST)       | `src/lib/__tests__/week-definitions.test.ts` (5 pass)                 | Done |

## Implementation Order

1. REQ-012 — 포맷 노이즈를 먼저 되돌려 이후 diff가 읽히게 한다
2. REQ-001 — 타입·마이그레이션이 API·UI 전체의 선행 조건
3. REQ-002, REQ-003, REQ-004 — API 계층(서로 독립, 병렬 가능)
4. REQ-005 — `TutoringStudentRow` 추출(후보 패널·튜터링 중 공용)
5. REQ-006 — fetch 소유자 재구성(REQ-005의 행이 필요한 데이터 확정 후)
6. REQ-007, REQ-008 — 카드·컬럼·이동 규칙(REQ-001·006 의존)
7. REQ-009, REQ-010 — 스코프 컨트롤·스트립·표(REQ-004 응답 필드 의존)
8. REQ-011 — 전환 실패 복구(REQ-007 액션 버튼 이후)

## Out of Scope

- 코호트별 재결제 매출 합계 컬럼(`converted_payment_id` → `payments` 조인). 전환율이 이번 목적이라 제외 — 후속 제안으로 남긴다.
- `src/lib/seo/content-generator.ts`, `src/lib/ai-provider.ts`, `.env.example` 및 관련 테스트 — Qwen/AI provider 트랙. 이 PR 커밋 범위에서 제외한다.
- `튜터링 중` 탭의 기능 변경. `TutoringStudentRow` 추출은 순수 리팩터링으로 시각·동작 변화 0을 유지한다.
- 재결제 대상 자동 선정(스케줄러). 후보 추천 배지·정렬까지만 하고 자동 insert는 하지 않는다.
