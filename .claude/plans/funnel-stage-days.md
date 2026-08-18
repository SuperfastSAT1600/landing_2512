# 칸반 카드: 퍼널 스테이지 체류 일수 표시

## Overview

세일즈 칸반 카드에 인입 총 경과일(D+n) 외에, 현재 퍼널 스테이지에 머문 일수(S+n)를 추가로 표시한다.
이를 위해 DB에 `funnel_stage_updated_at` 컬럼을 추가하고, 스테이지 이동 시 자동으로 기록한다.

## Requirements

### REQ-001: DB 컬럼 추가
- **Priority**: Must
- **Description**: `students` 테이블에 `funnel_stage_updated_at TIMESTAMPTZ` 컬럼 추가
- **Acceptance Criteria**: 마이그레이션 SQL 파일 생성, 기존 행의 값은 NULL (= created_at으로 폴백)
- **Verification**: (MANUAL) Supabase Studio에서 컬럼 확인

### REQ-002: Student 타입 업데이트
- **Priority**: Must
- **Description**: `src/types/crm.ts`의 `Student` 인터페이스에 `funnel_stage_updated_at: string | null` 추가
- **Acceptance Criteria**: TypeScript 컴파일 오류 없음
- **Verification**: (TEST) `npx tsc --noEmit` 통과

### REQ-003: 스테이지 이동 시 타임스탬프 기록
- **Priority**: Must
- **Description**: `SalesKanban.tsx`의 `handleDragEnd`에서 `funnel_stage` 변경 시 `funnel_stage_updated_at: new Date().toISOString()` 함께 전송
- **Acceptance Criteria**: 드래그로 카드를 다른 컬럼으로 이동하면 DB의 `funnel_stage_updated_at`이 현재 시각으로 갱신됨
- **Verification**: (MANUAL) 드래그 후 Supabase Studio에서 값 확인

### REQ-004: StudentCard에 스테이지 체류 일수 표시
- **Priority**: Must
- **Description**: `StudentCard.tsx`에서 `funnel_stage_updated_at`(없으면 `created_at` 폴백)을 기준으로 S+n 배지 표시
- **Acceptance Criteria**: 카드 하단에 `D+{total}  S+{stage}` 형태로 두 배지가 나란히 표시. S+n은 3일 이상 amber, 7일 이상 red 색상
- **Verification**: (BROWSER) 칸반 카드에서 두 배지 확인

## Technical Design

### Architecture
- 마이그레이션: `supabase/migrations/049_funnel_stage_updated_at.sql`
- 타입: `src/types/crm.ts` — Student 인터페이스
- 퍼널 이동 기록: `src/app/admin/crm/components/SalesKanban.tsx` — handleDragEnd
- UI: `src/app/admin/crm/components/StudentCard.tsx` — 하단 배지 영역

### 폴백 로직
- `funnel_stage_updated_at`이 NULL이면 `created_at`을 폴백으로 사용 (마이그레이션 전 기존 데이터 대응)

## Traceability Matrix

| REQ ID  | Description                    | Verification | Status  |
|---------|--------------------------------|--------------|---------|
| REQ-001 | DB 컬럼 추가                   | (MANUAL)     | Pending |
| REQ-002 | Student 타입 업데이트          | (TEST)       | Pending |
| REQ-003 | 스테이지 이동 시 타임스탬프 기록 | (MANUAL)     | Pending |
| REQ-004 | StudentCard S+n 배지 표시      | (BROWSER)    | Pending |

## Implementation Order

1. REQ-001 — DB 스키마 먼저
2. REQ-002 — 타입 정의
3. REQ-003 — 비즈니스 로직 (타입 의존)
4. REQ-004 — UI (타입 의존)

## Out of Scope

- 기존 데이터의 `funnel_stage_updated_at` 백필 (NULL → created_at 폴백으로 충분)
- 팔로업 배너나 재활성화 섹션에는 미표시
