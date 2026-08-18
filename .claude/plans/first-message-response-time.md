# 첫 메시지 발송 시각 + 소스별 평균 첫 응답 시간

## Overview

- 인입 정보(InquirySection)에 **첫 메시지 발송 시간**(년/월/일/시/분) 입력란 추가.
- 문의 날짜는 기존 date 입력 유지(META 리드는 자동 시각 기록).
- 통계 "유입 채널별 성과" 표에 소스별 **문의 → 첫 메시지 평균 시간** 컬럼 추가.
  평균 계산 기준 문의시각 = `created_at`(시스템 생성시각, META 자동), 응답시각 = `first_message_sent_at`.

## Requirements

### REQ-001: first_message_sent_at 컬럼 + 타입
- **Priority**: Must
- **Description**: `students`에 nullable `first_message_sent_at timestamptz` 추가(마이그레이션 062).
  `Student.first_message_sent_at: string | null` 추가.
- **Verification**: (MANUAL) tsc + 마이그레이션 적용 후 PATCH 확인.

### REQ-002: 인입 정보 입력/표시
- **Priority**: Must
- **Description**: `EditForm`에 `first_message_sent_at`(datetime-local 문자열) 추가, `studentToEditForm`에서
  저장값(ISO)→로컬 datetime-local 변환, `handleSaveInquiry`에서 로컬→ISO 변환 저장. InquirySection 편집 모드에
  `type="datetime-local"` 입력란 추가, 읽기 모드에 "첫 메시지 발송" 행 표시(값 있을 때).
- **Verification**: (MANUAL) 저장/재조회 + 코드 확인.

### REQ-003: 소스별 평균 첫 응답 시간 (통계)
- **Priority**: Must
- **Description**: stats 라우트 `by_source`에 `avg_first_response_seconds: number | null` 추가.
  소스별로 `first_message_sent_at`가 있는 리드만 대상으로 `avg(first_message_sent_at − created_at)` 계산.
  `SalesStats`의 `SourceTable`에 "평균 첫 응답" 컬럼 추가(사람이 읽기 쉬운 기간 포맷, 데이터 없으면 '-').
- **Verification**: (MANUAL) curl로 stats 응답 확인 + 표 렌더 확인.

## Technical Design

- `supabase/migrations/062_add_first_message_sent_at.sql`
- `src/types/crm.ts` — `Student.first_message_sent_at`.
- `src/app/admin/crm/components/panel/types.ts` — EditForm 필드 + datetime-local 변환 헬퍼.
- `InquirySection.tsx` — 입력/표시.
- `hooks/useEditForm.ts` — handleSaveInquiry에 필드 추가.
- `src/app/api/crm/stats/route.ts` — `StatsBySource.avg_first_response_seconds`, 집계 로직.
- `SalesStats.tsx` — SourceTable 컬럼 + 기간 포맷 헬퍼.

PATCH 라우트는 필드 통과(화이트리스트 없음)이므로 변경 불필요.

## Traceability Matrix

| REQ ID  | Description                  | Verification | Test File | Status  |
|---------|------------------------------|--------------|-----------|---------|
| REQ-001 | 컬럼+타입                    | (MANUAL)     | —         | Pending |
| REQ-002 | 인입 정보 입력/표시          | (MANUAL)     | —         | Pending |
| REQ-003 | 소스별 평균 첫 응답          | (MANUAL)     | —         | Pending |

## Out of Scope

- 첫 메시지 발송 시각 자동 기록(1단계 진입 시 자동 stamp). 이번엔 수동 입력만.
- 문의 날짜 컬럼의 timestamp 전환.
