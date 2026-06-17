# 진단 테스트 패널 섹션

## Overview

학생 상세 패널(`StudentDetailPanel`)에 새 섹션 **"진단 테스트"** 를 추가한다.
- 상단: "진단 테스트 현황" 드롭다운 — 진단 테스트 전용 퍼널(0~3)을 보고/변경.
- 하단: 기존 학생 정보 섹션에 있던 "진단테스트 연결" 기능을 이 섹션으로 이동.

진단 테스트 퍼널 단계:
- 0. 진단 테스트 진행하지 않고 결제
- 1. 안내 완료 후 대기
- 2. Report 세일즈 진행 완료 (Report 링크 전달 안하고 콜로만 진행)
- 3. Report 세일즈 진행 완료 (Report 링크 전달함)

## Requirements

### REQ-001: diagnostic_funnel_stage 컬럼 + 타입/라벨
- **Priority**: Must
- **Description**: `students`에 nullable `diagnostic_funnel_stage smallint` 추가(마이그레이션 061).
  `Student` 타입에 `diagnostic_funnel_stage: number | null` 추가, `DIAGNOSTIC_FUNNEL_LABELS` 상수 추가.
- **Acceptance Criteria**: 타입체크 통과, PATCH로 값 저장/조회 가능(마이그레이션 적용 후).
- **Verification**: (MANUAL) tsc + 마이그레이션 적용 후 PATCH 확인.

### REQ-002: DiagnosticSection 컴포넌트
- **Priority**: Must
- **Description**: `SectionCard` 기반 새 섹션. 상단 "진단 테스트 현황" 드롭다운(현재 단계 라벨 표시,
  4개 단계 선택 → `onDiagFunnelChange(stage)` 호출). 하단에 진단테스트 연결 UI(검색/연결/해제).
- **Acceptance Criteria**: 패널에 "진단 테스트" 카드가 보이고, 현황 선택 시 단계가 저장·반영되며, 연결 기능이 동작.
- **Verification**: (MANUAL) 패널 렌더 + 코드 연결 확인.

### REQ-003: StudentInfoSection에서 연결 기능 이동
- **Priority**: Must
- **Description**: `StudentInfoSection`에서 진단테스트 연결 버튼·검색 picker와 관련 props를 제거하고
  `DiagnosticSection`으로 옮긴다. VIP 토글은 그대로 둔다. 패널은 diagHook을 DiagnosticSection에 전달.
- **Acceptance Criteria**: 학생 정보 섹션에 연결 버튼이 더 이상 없고, 진단 테스트 섹션에서 동일 기능 동작. 중복 없음.
- **Verification**: (MANUAL) 코드 확인 + tsc.

## Technical Design

- `supabase/migrations/061_add_diagnostic_funnel_stage.sql` — 컬럼 추가.
- `src/types/crm.ts` — `Student.diagnostic_funnel_stage`, `DIAGNOSTIC_FUNNEL_LABELS`.
- `src/app/admin/crm/components/panel/sections/DiagnosticSection.tsx` — 신규.
- `StudentInfoSection.tsx` — diag 연결 UI/props 제거.
- `StudentDetailPanel.tsx` — DiagnosticSection 렌더 + `handleDiagFunnelChange`(setLocalStudent+onUpdate).

기존 PATCH 라우트는 필드를 그대로 통과(화이트리스트 없음)하므로 라우트 변경 불필요.

## Traceability Matrix

| REQ ID  | Description                  | Verification | Test File | Status  |
|---------|------------------------------|--------------|-----------|---------|
| REQ-001 | 컬럼+타입+라벨               | (MANUAL)     | —         | Pending |
| REQ-002 | DiagnosticSection 컴포넌트   | (MANUAL)     | —         | Pending |
| REQ-003 | 연결 기능 이동               | (MANUAL)     | —         | Pending |

## Out of Scope

- 진단 테스트 현황 기반 별도 집계/대시보드.
- 진단 결과 자동 연결(여전히 수동 검색·연결).
