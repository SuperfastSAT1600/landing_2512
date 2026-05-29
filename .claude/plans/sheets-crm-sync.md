# Google Sheets → CRM Lead Sync

## Overview

META 인스타그램/페이스북 인스턴트폼 리드가 Google Sheets에 쌓이면, Google Apps Script가 즉시 Next.js 웹훅 엔드포인트를 호출해 CRM에 신규 학생을 자동 등록한다. 4개 탭(META리드, 목표시험, AP문의, SuperTest)을 모두 지원하며, 동일 전화번호가 여러 탭에 있으면 하나의 레코드로 병합한다.

## Requirements

### REQ-001: 웹훅 API 엔드포인트
- **Priority**: Must
- **Description**: `POST /api/crm/leads/sheets-sync` 엔드포인트. Apps Script에서 호출. `SHEETS_SYNC_SECRET` 환경변수와 `x-sync-key` 헤더를 비교해 인증.
- **Acceptance Criteria**: 올바른 키 → 200/201 응답. 잘못된 키 → 401. 필수 필드 누락 → 400.
- **Verification**: (TEST) 인증 성공/실패 케이스 유닛 테스트

### REQ-002: 전화번호 정규화
- **Priority**: Must
- **Description**: 시트의 전화번호는 +821012345678, 010-1234-5678, 01012345678 등 다양한 형식. `+82`를 `0`으로 교체, 공백·하이픈 제거해 010XXXXXXXX 형식으로 통일.
- **Acceptance Criteria**: 어떤 입력 형식이든 `normalizePhone()` 결과가 동일한 표준화 문자열을 반환.
- **Verification**: (TEST) 6가지 이상의 입력 형식에 대한 정규화 결과 검증

### REQ-003: 전화번호 기준 중복 제거 (Merge)
- **Priority**: Must
- **Description**: 정규화된 전화번호로 기존 CRM 레코드 조회. 이미 존재하면 `campaign_tags`에 새 태그만 추가(PATCH). 없으면 신규 생성(POST).
- **Acceptance Criteria**: 같은 번호 2회 호출 시 DB 레코드 1개만 존재. campaign_tags는 두 호출의 합집합.
- **Verification**: (TEST) 신규 생성 / 중복 병합 케이스 통합 테스트 (Supabase mock)

### REQ-004: 자동 이름 생성 (탭별 소스명 + 날짜)
- **Priority**: Must
- **Description**: 이름 필드가 없으므로 탭 소스명 + 인입 날짜로 auto-generate. 포맷: `{PREFIX}_{YYYYMMDD}`. Prefix 매핑: META리드_인스턴트폼 → `META리드`, META리드_인스턴트폼_목표시험 → `META목표시험`, AP수업 문의 → `AP문의`, SuperTest 수요조사 → `SuperTest`.
- **Acceptance Criteria**: `generateLeadName('META리드_인스턴트폼', '2026-02-14T00:56:00')` → `'META리드_20260214'`
- **Verification**: (TEST) 4개 탭 소스별 이름 생성 검증

### REQ-005: 학년(grade) 정규화
- **Priority**: Must
- **Description**: 시트의 학년 입력은 "고2", "G10", "11학년", "junior", "y9" 등 비정형. 숫자/한글/영문 패턴 파싱 후 표준 형식으로 변환.
  - 7–8학년 (중1–중2): `"7th"` ~ `"8th"`
  - 9학년/중3/G9/고0: `"9th"`
  - 10학년/고1/G10: `"10th"` ... 12학년/고3/G12: `"12th"`
  - 파싱 불가: `"기타"`
- **Acceptance Criteria**: `normalizeGrade('고2')` → `'11th'`, `normalizeGrade('G10')` → `'10th'`, `normalizeGrade('중3')` → `'9th'`
- **Verification**: (TEST) 10가지 이상 입력 케이스 검증

### REQ-006: 목표점수(target_score) 정규화
- **Priority**: Must
- **Description**: "1570-1600" → 1570, "1500+" → 1500, "1400이상" → 1400, "만점" → 1600, "모름"/"고득점"/"없음"/비정형 → null.
- **Acceptance Criteria**: `normalizeTargetScore('1570-1600')` → 1570, `normalizeTargetScore('만점')` → 1600, `normalizeTargetScore('고득점')` → null
- **Verification**: (TEST) 8가지 이상 입력 케이스 검증

### REQ-007: 목표시험날짜(target_test_date) 정규화
- **Priority**: Must
- **Description**: Tab 2의 응답 텍스트를 실제 SAT 시험 날짜(YYYY-MM-DD)로 매핑.
  - "26년_5월_시험" → 2026-05-03
  - "26년_6월_시험" → 2026-06-07
  - "26년_8월_시험" → 2026-08-23
  - "26년_9월_시험" → 2026-09-13
  - "26년_4분기_시험(10,11,12월)" → 2026-10-04
  - "27년_상반기_시험" → 2027-03-08
  - "27년_하반기_시험" → 2027-08-22
- **Acceptance Criteria**: `mapTestDateText('26년_9월_시험')` → `'2026-09-13'`
- **Verification**: (TEST) 7개 매핑 값 검증

### REQ-008: 탭별 필드 매핑
- **Priority**: Must
- **Description**: 각 탭의 컬럼을 CRM `CreateStudentInput` 필드에 매핑.
  - `platform: 'ig' | 'fb'` → `traffic_source: '인스타그램 광고'`
  - `inquiry_channel`: 모든 탭 → `'인스타그램 링크'`
  - `school_type`: 기본값 `'other'`
  - `desired_subjects`: 기본값 `'Both'`
  - `lead_type`: `'B2C'`
  - campaign_tags: 탭별 고정 태그 + ad_name 포함
    - Tab1: `['META 리드', ad_name]`
    - Tab2: `['META 리드', '목표시험 조사', ad_name]`
    - Tab3: `['AP 문의', ap_subject]`
    - Tab4: `['SuperTest 수요조사', desired_date]`
- **Acceptance Criteria**: 각 탭 소스에 대해 변환된 CRM payload가 required fields를 모두 포함.
- **Verification**: (TEST) 4개 탭 소스별 payload 변환 결과 snapshot 검증

### REQ-009: Google Apps Script 코드
- **Priority**: Must
- **Description**: `scripts/google-apps-script/sheets-crm-sync.gs` 파일로 제공. 기능:
  1. PropertiesService로 탭별 마지막 처리 행 번호 저장
  2. 5분마다 트리거 실행 (시간 기반 트리거)
  3. 4개 탭 각각에서 새 행 감지 후 웹훅 POST
  4. 성공 시 last row 업데이트, 실패 시 재시도 없이 다음 실행에서 재처리
- **Acceptance Criteria**: Apps Script 파일이 설치 가이드 주석과 함께 제공됨. `WEBHOOK_URL`, `SYNC_KEY` 상수를 수정해 바로 사용 가능.
- **Verification**: (MANUAL) Apps Script 에디터에 붙여넣기 후 테스트 실행으로 CRM 등록 확인

## Technical Design

### Architecture

```
Google Sheets (4 tabs)
  ↓ 5분마다 Apps Script 트리거
  ↓ POST /api/crm/leads/sheets-sync (x-sync-key: SHEETS_SYNC_SECRET)
  ↓
  src/app/api/crm/leads/sheets-sync/route.ts
    ├─ normalizePhone()          → 010XXXXXXXX
    ├─ generateLeadName()        → META리드_20260214
    ├─ normalizeGrade()          → 11th
    ├─ normalizeTargetScore()    → 1500
    ├─ mapTestDateText()         → 2026-09-13
    └─ buildCrmPayload()         → CreateStudentInput
         ↓
    supabaseAdmin.from('students')
      .select() WHERE parent_phone = normalized   → 중복 체크
      .insert() 또는 .update(campaign_tags)       → 등록/병합
```

### Key Files

| 파일 | 역할 |
|------|------|
| `src/app/api/crm/leads/sheets-sync/route.ts` | 웹훅 엔드포인트 |
| `src/lib/sheets-sync-utils.ts` | 정규화 순수 함수들 |
| `src/app/api/crm/leads/sheets-sync/__tests__/route.test.ts` | API 통합 테스트 |
| `src/lib/__tests__/sheets-sync-utils.test.ts` | 유닛 테스트 |
| `scripts/google-apps-script/sheets-crm-sync.gs` | Apps Script 코드 |

### Request Body Schema (Apps Script → API)

```typescript
interface SheetsSyncPayload {
  source_tab: 'META리드_인스턴트폼' | 'META리드_인스턴트폼_목표시험' | 'AP수업 문의' | 'SuperTest 수요조사';
  created_time: string;   // ISO 8601: "2026-02-14T00:56:00"
  ad_name: string;
  platform: 'ig' | 'fb';
  phone: string;
  grade?: string;
  // Tab 1 specific
  target_score_text?: string;
  // Tab 2 specific
  target_test_date_text?: string;
  // Tab 3 specific
  ap_subject?: string;
  // Tab 4 specific
  supertest_date?: string;
}
```

### Environment Variables

```
SHEETS_SYNC_SECRET=<random 32-char string>  # Apps Script의 x-sync-key
```

## Traceability Matrix

| REQ ID  | Description              | Verification | Test File | Status |
|---------|--------------------------|--------------|-----------|--------|
| REQ-001 | 웹훅 API 인증            | (TEST)       | `src/app/api/crm/leads/sheets-sync/__tests__/route.test.ts` | Pending |
| REQ-002 | 전화번호 정규화          | (TEST)       | `src/lib/__tests__/sheets-sync-utils.test.ts` | Pending |
| REQ-003 | 중복 제거 (Merge)        | (TEST)       | `src/app/api/crm/leads/sheets-sync/__tests__/route.test.ts` | Pending |
| REQ-004 | 자동 이름 생성           | (TEST)       | `src/lib/__tests__/sheets-sync-utils.test.ts` | Pending |
| REQ-005 | 학년 정규화              | (TEST)       | `src/lib/__tests__/sheets-sync-utils.test.ts` | Pending |
| REQ-006 | 목표점수 정규화          | (TEST)       | `src/lib/__tests__/sheets-sync-utils.test.ts` | Pending |
| REQ-007 | 목표시험날짜 매핑        | (TEST)       | `src/lib/__tests__/sheets-sync-utils.test.ts` | Pending |
| REQ-008 | 탭별 필드 매핑           | (TEST)       | `src/lib/__tests__/sheets-sync-utils.test.ts` | Pending |
| REQ-009 | Google Apps Script       | (MANUAL)     | `scripts/google-apps-script/sheets-crm-sync.gs` | Pending |

## Implementation Order

1. REQ-002, 004, 005, 006, 007 — 순수 함수 (정규화 유틸) 먼저 TDD
2. REQ-008 — 필드 매핑 (`buildCrmPayload`) 유틸 완성
3. REQ-001, 003 — API 엔드포인트 (유틸 의존)
4. REQ-009 — Apps Script (API 완성 후 제공)

## Out of Scope

- Slack 알림 (신규 리드 등록 시) — 별도 스펙으로
- 이름 자동 업데이트 (상담 후 실명으로 교체하는 UI) — 별도 스펙으로
- Meta Graph API 직접 연동 — 현재 시트 기반으로 충분
- 기존 114건 소급 등록 — 수동 처리 또는 별도 스크립트
