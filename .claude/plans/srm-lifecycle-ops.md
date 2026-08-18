# SRM Lifecycle & Ops View

## Overview

수업 중인 학생의 라이프사이클(온보딩 → 반복 사이클 → 재결제)을 단계별로 추적하고,
운영자가 매일 아침 "오늘 누구에게 무엇을 해야 하는지" 한눈에 볼 수 있는 날짜별 운영 뷰를 추가한다.

기존 SRM에는 수업 스케줄 뷰와 커뮤니케이션 로그가 있으나,
학생이 현재 어느 단계에 있는지 / 다음 액션이 무엇인지 / 오늘 처리할 작업이 무엇인지를 구조화하는 기능이 없다.

**기존 인프라 (건드리지 않음)**
- `students.sfv2_profile_id` 연결 필드
- `/api/admin/srm/link` 수동 링크 API
- `srm_communications` 커뮤니케이션 로그 테이블
- SRM 날짜별 수업 스케줄 뷰 (DayTabs + ScheduleList)
- StudentPanel (comm 탭 + crm 탭)

---

## Lifecycle 정의

### 온보딩 사이클 (1회, 결제 직후)

| 단계 | stage_key | 완료 조건 |
|------|-----------|----------|
| 코치 매칭 | `onboarding_coach` | 코치 배정 완료 |
| 첫 수업 일정 조율 | `onboarding_first_class` | 첫 수업 날짜 확정 |
| 스터디홀 일정 조율 | `onboarding_studyhall` | 스터디홀 슬롯 확정 |
| 첫 수업 전 사전학습 | `onboarding_prep` | 사전학습 자료 발송 완료 |
| 온보딩 완료 | `active` | 첫 수업 진행 후 반복 사이클 진입 |

### 반복 사이클 (매 수업마다)

| 단계 | stage_key | 완료 조건 |
|------|-----------|----------|
| 다음 수업 조율 | `cycle_next_class` | 다음 수업 날짜 확정 |
| 스터디홀 일정 조율 | `cycle_studyhall` | 스터디홀 슬롯 확정 |
| 수업 진행 중 | `cycle_active` | 다음 수업 완료 → cycle_next_class로 복귀 |

### 기타 상태

| 상태 | stage_key | 설명 |
|------|-----------|------|
| 재결제 대기 | `renewal_pending` | 수업 종료, 재결제 유도 중 |
| 이탈 | `churned` | 재결제 없이 이탈 |

---

## Requirements

### REQ-001: srm_lifecycle_stages 테이블 마이그레이션

- **Priority**: Must
- **Description**: 학생별 라이프사이클 단계를 저장하는 테이블 생성
- **Acceptance Criteria**:
  - `srm_lifecycle_stages` 테이블: `id`, `student_id` (CRM students.id), `sfv2_profile_id`, `stage` (stage_key), `due_date` (단계 완료 목표일), `completed_at`, `note`, `created_at`
  - `student_id` OR `sfv2_profile_id` 중 하나는 필수 (CHECK constraint)
  - `stage` 컬럼은 위 stage_key enum으로 제한
  - supabase migration 파일로 작성
- **Verification**: (TEST) 마이그레이션 실행 후 테이블 존재 및 컬럼 확인

### REQ-002: 학생별 현재 단계 조회 API

- **Priority**: Must
- **Description**: 특정 학생의 현재 활성 라이프사이클 단계를 반환
- **Acceptance Criteria**:
  - `GET /api/admin/srm/lifecycle?profileId={sfv2ProfileId}` → 현재 stage, due_date, 히스토리 반환
  - `GET /api/admin/srm/lifecycle?studentId={crmStudentId}` → 동일
  - 완료되지 않은 가장 최근 단계가 "현재 단계"
  - 단계가 없으면 `{ stage: null }` 반환
- **Verification**: (TEST) profileId/studentId 각각으로 조회, 없는 경우 처리

### REQ-003: 라이프사이클 단계 전환 API

- **Priority**: Must
- **Description**: 현재 단계 완료 처리 + 다음 단계 생성
- **Acceptance Criteria**:
  - `POST /api/admin/srm/lifecycle` body: `{ profileId|studentId, stage, action: 'complete'|'set', dueDate?, note? }`
  - `complete`: 현재 단계 `completed_at` 설정 + 다음 단계 자동 생성
  - `set`: 직접 단계 지정 (온보딩 시작, 재결제 후 재진입 등)
  - 단계 전환 순서 로직: 위 Lifecycle 정의의 순서를 따름
- **Verification**: (TEST) complete 시 다음 단계 자동 생성, set 시 지정 단계로 이동

### REQ-004: 날짜별 운영 할 일 API

- **Priority**: Must
- **Description**: 특정 날짜에 처리해야 할 학생별 운영 작업 목록 반환
- **Acceptance Criteria**:
  - `GET /api/admin/srm/ops-tasks?date={YYYY-MM-DD}` → 해당 날짜가 due_date인 미완료 단계 목록
  - 응답: `[{ profileId, studentName, stage, due_date, is_overdue }]`
  - `is_overdue`: due_date가 요청 date보다 과거인 미완료 항목
  - date 미지정 시 오늘(KST) 기준
- **Verification**: (TEST) due_date 기준 필터링, overdue 플래그 정확성

### REQ-005: 자동 CRM 매칭 큐 API

- **Priority**: Must
- **Description**: v2 신규 유저를 CRM 리드와 phone/email 기준으로 자동 매칭 시도
- **Acceptance Criteria**:
  - `GET /api/admin/srm/match-queue` → `sfv2_profile_id`가 없는 CRM students 중 v2에서 phone/email로 후보 발견된 목록 반환
  - 매칭 점수: phone 일치 95점, email 일치 85점, 둘 다 불일치 0점
  - 점수 0인 항목은 큐에 포함하지 않음 (완전 미매칭은 제외)
  - 응답: `[{ crmStudentId, crmName, sfv2ProfileId, sfv2Name, matchScore, matchReason }]`
- **Verification**: (TEST) phone 일치 시 95점, email 일치 시 85점, 이미 연결된 항목 제외

### REQ-006: 운영 뷰 페이지 — 날짜별 할 일 탭

- **Priority**: Must
- **Description**: SRM 메인에 "운영" 탭 추가 — 날짜별 처리할 학생 액션 목록
- **Acceptance Criteria**:
  - 기존 SRM 페이지에 탭 추가: "스케줄" (기존) / "운영" (신규)
  - 운영 탭: DayTabs 공유, 해당 날짜 ops-tasks API 호출
  - 각 항목: 학생명, 현재 단계(한국어 라벨), due_date, 초과 여부 (빨간 배지)
  - 항목 클릭 시 기존 StudentPanel 열림
  - 오버듀 항목은 상단에 정렬
- **Verification**: (BROWSER) 운영 탭에서 날짜 변경 시 해당 날짜 할 일 목록 갱신 확인

### REQ-007: StudentPanel 라이프사이클 탭 추가

- **Priority**: Must
- **Description**: StudentPanel에 "라이프사이클" 탭 추가 — 현재 단계 표시 + 단계 전환 UI
- **Acceptance Criteria**:
  - StudentPanel 탭: `comm` / `lifecycle` / `crm` (3탭)
  - lifecycle 탭: 현재 단계 강조 표시 + 전체 단계 진행률 표시 (완료/전체)
  - "완료 처리" 버튼 → `POST /lifecycle` complete 호출 → UI 즉시 갱신
  - "단계 직접 설정" 드롭다운 → set 호출
  - due_date 편집 인풋 (날짜 picker)
  - note 인풋 (단계 완료 메모)
- **Verification**: (BROWSER) 완료 처리 후 다음 단계로 이동 확인, due_date 수정 저장 확인

### REQ-008: 매칭 큐 UI

- **Priority**: Should
- **Description**: 자동 매칭 후보를 한 번에 처리하는 큐 UI
- **Acceptance Criteria**:
  - `/admin/srm` 내 "매칭 큐" 섹션 (AlertSection 아래 또는 별도 탭)
  - 매칭 큐가 비어있으면 숨김
  - 각 항목: CRM 이름 + v2 이름 + 매칭 근거 (phone/email) + 점수
  - "연결" 버튼 → 기존 `/api/admin/srm/link` 호출
  - "건너뛰기" 버튼 → 해당 항목 로컬에서 숨김 (DB 변경 없음)
- **Verification**: (BROWSER) 연결 후 해당 항목이 큐에서 사라지는 것 확인

---

## Technical Design

### Architecture

```
supabase (landing_2512)
  └─ srm_lifecycle_stages
       ├─ student_id → students.id (CRM)
       ├─ sfv2_profile_id → sfv2 profiles.id (외부 DB)
       ├─ stage (enum)
       ├─ due_date
       ├─ completed_at
       └─ note

supabase (sfv2 — read-only via supabaseSFv2)
  └─ profiles (phone, email 매칭용)

Next.js API routes (새로 추가)
  ├─ /api/admin/srm/lifecycle       GET + POST
  ├─ /api/admin/srm/ops-tasks       GET
  └─ /api/admin/srm/match-queue     GET

Components (수정/추가)
  ├─ src/app/admin/srm/page.tsx              탭 추가 (스케줄/운영)
  ├─ src/app/admin/srm/components/OpsTaskList.tsx    신규
  ├─ src/app/admin/srm/components/LifecycleTab.tsx   신규
  ├─ src/app/admin/srm/components/MatchQueue.tsx     신규
  └─ src/app/admin/srm/components/StudentPanel.tsx   탭 추가

Migration
  └─ supabase/migrations/009_srm_lifecycle_stages.sql
```

### Stage 전환 로직 (서버사이드)

```
NEXT_STAGE_MAP = {
  onboarding_coach      → onboarding_first_class
  onboarding_first_class→ onboarding_studyhall
  onboarding_studyhall  → onboarding_prep
  onboarding_prep       → active (온보딩 완료)
  active                → cycle_next_class (첫 수업 후)
  cycle_next_class      → cycle_studyhall
  cycle_studyhall       → cycle_active
  cycle_active          → cycle_next_class (수업 완료 후 재진입)
  cycle_active          → renewal_pending (수강 종료 시)
}
```

### Dependencies

- 기존 `supabaseAdmin` (landing_2512) — 읽기/쓰기 (모든 SRM 데이터는 여기에만 저장)
- 기존 `supabaseSFv2` — **읽기 전용. 스키마 변경 절대 금지.** phone/email 조회용으로만 사용
- 기존 `/api/admin/srm/link` — 매칭 큐에서 재사용
- date-fns — KST 날짜 처리 (이미 사용 중)

> **sfv2 DB 불변 원칙**: `supabaseSFv2`는 `profiles` 테이블에서 `phone`, `email`, `full_name` 컬럼을 SELECT만 한다.
> 마이그레이션, INSERT, UPDATE, DELETE 일체 금지. 신규 테이블/컬럼 추가 금지.

---

## Traceability Matrix

| REQ ID  | Description                        | Verification | Status  |
|---------|------------------------------------|--------------|---------|
| REQ-001 | srm_lifecycle_stages 마이그레이션   | (TEST)       | Pending |
| REQ-002 | 학생별 현재 단계 조회 API            | (TEST)       | Pending |
| REQ-003 | 단계 전환 API                       | (TEST)       | Pending |
| REQ-004 | 날짜별 운영 할 일 API               | (TEST)       | Pending |
| REQ-005 | 자동 CRM 매칭 큐 API               | (TEST)       | Pending |
| REQ-006 | 운영 뷰 탭 (날짜별 할 일)           | (BROWSER)    | Pending |
| REQ-007 | StudentPanel 라이프사이클 탭        | (BROWSER)    | Pending |
| REQ-008 | 매칭 큐 UI                         | (BROWSER)    | Pending |

---

## Implementation Order

1. **REQ-001** — 마이그레이션 먼저. 모든 API가 이 테이블에 의존
2. **REQ-002** — 조회 API (읽기 전용, 안전)
3. **REQ-003** — 전환 API (REQ-002 로직 재사용)
4. **REQ-004** — 운영 할 일 API (REQ-001 테이블 의존)
5. **REQ-005** — 매칭 큐 API (sfv2 DB 읽기, 독립적)
6. **REQ-006** — 운영 뷰 탭 (REQ-004 API 필요)
7. **REQ-007** — StudentPanel 라이프사이클 탭 (REQ-002, REQ-003 필요)
8. **REQ-008** — 매칭 큐 UI (REQ-005 필요)

---

## Out of Scope

- 재결제 자동 알림 / Slack 알림 연동
- 학생이 직접 단계를 볼 수 있는 학생용 뷰
- 스터디홀/수업 날짜 자동 감지로 단계 자동 전환 (v1에서는 관리자가 수동 완료 처리)
- person_id 별도 테이블 생성 (기존 `students.sfv2_profile_id` 필드 활용)
- 매칭 큐 "건너뛰기" 영구 기록 (로컬 숨김만)
