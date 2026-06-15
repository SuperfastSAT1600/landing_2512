# Coach Student Portal

## Overview

코치가 수업 전 학생 정보를 한 눈에 파악할 수 있는 "코치용 학생 포털" 페이지.
학부모 포털(`/mypage/[studentId]`)이 학부모 관점이라면, 코치 포털은 코칭에 필요한 정보(점수 이력, 학습 배경, 진단 결과, 주간 스케줄)를 코치 관점으로 정제해서 보여준다.

첫 타겟: Samuel Sai (Singapore, 10th, Both, 코치: 박기훈)

## Requirements

### REQ-001: 코치 포털 라우트
- **Priority**: Must
- **Description**: `/admin/coach-prep/[studentId]` 경로에 코치 포털 페이지 생성. 관리자(어드민) 접근 방식 동일 — URL에 학생 CRM ID를 넣으면 해당 학생의 코치 뷰를 표시.
- **Acceptance Criteria**: `/admin/coach-prep/{samuel-id}` 접속 시 Samuel의 코치 포털이 렌더링됨.
- **Verification**: (BROWSER) 페이지가 빈 화면 없이 학생 정보를 표시함.

### REQ-002: 코치 포털 API
- **Priority**: Must
- **Description**: `GET /api/admin/srm/student/crm/[crmStudentId]/coach-view` — CRM student ID를 받아 코치에게 필요한 데이터를 반환.
  반환 필드:
  - name, grade, school_type, desired_subjects
  - location (parent_phone이 아닌 최초상담 메모에서 추출한 위치 — stored as notes)
  - previous_rw_score, previous_math_score, target_score, target_test_date
  - weekly_schedule, ot_datetime, parent_timezone
  - coach_history_entries: consultation_timeline 중 ai_coach_history가 있는 항목 (내용 + 날짜)
  - diagnostic_summary (diagnostic_test_results 조인)
- **Acceptance Criteria**: API가 200을 반환하고 필수 필드를 포함한 JSON을 돌려줌.
- **Verification**: (TEST) `src/__tests__/coach-view-api.test.ts`

### REQ-003: 학생 스냅샷 카드
- **Priority**: Must
- **Description**: 상단에 학생 기본정보 카드 — 이름, 학년, 과목(RW/Math/Both), 위치, 목표 점수 및 시험일을 표시.
- **Acceptance Criteria**: Samuel Sai / 10th / Both / Singapore / 목표 1500+ 등이 카드에 표시됨.
- **Verification**: (BROWSER) 정보가 카드에 정확하게 표시됨.

### REQ-004: 점수 이력 섹션
- **Priority**: Must
- **Description**: 이전 점수(RW + Math) 및 목표 점수를 시각적으로 표시. 점수가 없는 경우 "초기 점수 없음" 표시.
- **Acceptance Criteria**: Samuel의 경우 진단 수학 530, 영어 590, 목표 1500+이 표시됨.
- **Verification**: (BROWSER) 점수 섹션이 올바른 값을 표시함.

### REQ-005: 학습 이력 & 코치 메모 섹션
- **Priority**: Must
- **Description**: consultation_timeline의 ai_coach_history 항목들을 역시간순으로 표시. 각 항목에 날짜, 내용 표시. 항목이 없으면 안내 메시지 표시.
- **Acceptance Criteria**: Samuel의 학습 이력이 표시되거나, 없으면 "코치 메모 없음" 표시됨.
- **Verification**: (BROWSER) 메모 섹션이 렌더링됨.

### REQ-006: 주간 스케줄 표시
- **Priority**: Should
- **Description**: weekly_schedule (WeeklySlot[])을 요일별 표로 시각화. 코치 타임존 기준 변환 옵션은 추후 — 현재는 학부모 타임존 기준으로 표시.
- **Acceptance Criteria**: 스케줄이 있으면 요일/시간 표가 표시됨. 없으면 "스케줄 미입력" 표시.
- **Verification**: (BROWSER) 스케줄 섹션이 표시됨.

### REQ-007: 진단 결과 섹션
- **Priority**: Should
- **Description**: diagnostic_test_results에서 점수와 weak_areas를 가져와 표시. 진단 결과가 없으면 섹션 숨김.
- **Acceptance Criteria**: 진단 결과가 있으면 RW/Math 점수와 약점 영역 목록이 표시됨.
- **Verification**: (BROWSER) 진단 섹션이 조건부로 표시됨.

## Technical Design

### Architecture

새 파일:
- `src/app/admin/coach-prep/[studentId]/page.tsx` — Server Component, 데이터 fetch 후 CoachPrepView에 전달
- `src/app/admin/coach-prep/[studentId]/CoachPrepView.tsx` — Client Component, UI 렌더링
- `src/app/api/admin/srm/student/crm/[crmStudentId]/coach-view/route.ts` — GET API

기존 패턴 참조:
- `/mypage/[studentId]/page.tsx` + `ParentDashboard.tsx` — Server/Client 분리 방식
- `/api/admin/srm/student/crm/[crmStudentId]/route.ts` — CRM student 조회 패턴
- `supabaseAdmin` from `@/lib/supabase-admin` — DB 접근

### Data Flow
```
page.tsx (Server)
  → fetch /api/admin/srm/student/crm/[id]/coach-view
  → CoachPrepView (Client)
    → 학생 스냅샷 카드
    → 점수 이력
    → 학습 이력
    → 주간 스케줄
    → 진단 결과
```

### Dependencies
- Supabase Admin (students, diagnostic_test_results 테이블)
- 기존 타입: `Student`, `WeeklySlot`, `ConsultationEntry` from `@/types/crm`
- 기존 UI 스타일: admin dark theme (bg-gray-900 계열)

## Traceability Matrix

| REQ ID  | Description               | Verification | Status  |
|---------|---------------------------|--------------|---------|
| REQ-001 | 코치 포털 라우트           | (BROWSER)    | Pending |
| REQ-002 | 코치 포털 API              | (TEST)       | Pending |
| REQ-003 | 학생 스냅샷 카드           | (BROWSER)    | Pending |
| REQ-004 | 점수 이력 섹션             | (BROWSER)    | Pending |
| REQ-005 | 학습 이력 & 코치 메모      | (BROWSER)    | Pending |
| REQ-006 | 주간 스케줄 표시           | (BROWSER)    | Pending |
| REQ-007 | 진단 결과 섹션             | (BROWSER)    | Pending |

## Implementation Order

1. REQ-002 — API 먼저 (UI는 API에 의존)
2. REQ-001 + REQ-003 — 라우트 + 기본 카드 (페이지 뼈대)
3. REQ-004 ~ REQ-007 — 나머지 섹션들

### REQ-008: AI 코치 브리핑 생성 API
- **Priority**: Must
- **Description**: `POST /api/admin/srm/student/crm/[crmStudentId]/coach-brief` — 해당 학생의 모든 consultation_timeline 항목을 OpenAI로 처리하여 `ai_coach_history`를 생성·저장.
  AI 제거 대상: 세일즈 전략, 유입 경로, 가격/결제 정보, 직원 간 내부 판단 ("~에 대한 믿음", "이미지 전달" 등), 코치 관계 관리 메모.
  AI 보존 대상: 학생 학습 이력, 현재 점수 수준, 목표 점수, 수업 의지·습관, 학습 스타일, 약점 영역, 스케줄 선호.
  처리 후 timeline 각 entry의 `ai_coach_history` 필드를 업데이트.
- **Acceptance Criteria**: API 호출 후 DB의 consultation_timeline에 `ai_coach_history`가 저장되며, 코치 포털 새로고침 시 정제된 내용이 표시됨.
- **Verification**: (MANUAL) Samuel 브리핑 생성 후 "기훈님에 대한 믿음" 문구가 코치 포털에 노출되지 않음.

### REQ-009: SRM 학생 패널에 코치 브리핑 생성 버튼
- **Priority**: Must
- **Description**: `StudentPanel`의 기존 탭 또는 하단에 "코치 브리핑 생성" 버튼 추가. 클릭 시 REQ-008 API를 호출하고 처리 중 로딩 상태, 완료 후 성공 메시지 표시.
- **Acceptance Criteria**: SRM에서 Samuel 패널 열기 → 버튼 클릭 → 로딩 → 성공 → 코치 포털 확인 시 정제된 내용 표시.
- **Verification**: (BROWSER) 버튼 클릭 후 코치 포털에서 정제된 내용 확인.

## Out of Scope

- 코치 인증/로그인
- 코치가 메모를 직접 작성하는 기능
- 여러 학생을 탐색하는 목록 뷰
- 코치 타임존 기준 스케줄 변환
