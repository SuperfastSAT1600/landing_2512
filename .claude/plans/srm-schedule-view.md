# SRM 스케줄 뷰

## Overview

SuperfastSAT v2(uvyzmnpdxreatmczlsds)의 수업/스터디홀 스케줄 데이터를 landing_2512 어드민에서 시각화하는 페이지. 오늘 기준 3일치 수업(코치룸)·스터디홀 스케줄과, 스케줄을 잡지 않은 위험 학생 목록을 한눈에 보여준다. CRM 메뉴 아래 SRM 메뉴 항목으로 추가.

## Requirements

### REQ-001: 네비게이션 — SRM 메뉴 추가
- **Priority**: Must
- **Description**: admin layout NAV_ITEMS에 `/admin/srm` 항목 추가 (CRM 아래)
- **Acceptance Criteria**: 사이드바에 SRM 메뉴가 보이고 클릭 시 `/admin/srm`으로 이동
- **Verification**: (BROWSER) 사이드바에서 SRM 메뉴 확인

### REQ-002: 3일 탭
- **Priority**: Must
- **Description**: 오늘(KST D+0) / 내일(D+1) / 모레(D+2) 탭. 탭 클릭 시 해당 날짜 데이터로 전환.
- **Acceptance Criteria**: 탭에 날짜(MM/DD 요일) 표시. 기본 선택은 오늘.
- **Verification**: (BROWSER) 탭 클릭 시 날짜 변경 확인

### REQ-003: 수업 스케줄 목록
- **Priority**: Must
- **Description**: 선택된 날짜의 coach_room 이벤트를 KST 시간순으로 표시. 각 행: 시간대, 학생명(들), 코치명, status(완료/예정)
- **Acceptance Criteria**: 시간 오름차순 정렬. completed는 ✓, approved는 ● 표시.
- **Verification**: (BROWSER) 오늘 날짜 탭에서 수업 목록 확인

### REQ-004: 스터디홀 스케줄 목록
- **Priority**: Must
- **Description**: 선택된 날짜의 study_hall 이벤트를 KST 시간순으로 표시. 각 행: 시간대, 학생명(들), status
- **Acceptance Criteria**: 시간 오름차순 정렬. completed는 ✓, approved는 ○ 표시.
- **Verification**: (BROWSER) 오늘 날짜 탭에서 스터디홀 목록 확인

### REQ-005: 수업 미잡힌 조합 경고 목록
- **Priority**: Must
- **Description**: 최근 4주 내 수업이 있었으나 향후 2주 수업 스케줄이 없는 학생-코치 조합 목록
- **Acceptance Criteria**: 학생명 + 코치명 + 마지막 수업일 표시. 건수 뱃지 표시.
- **Verification**: (BROWSER) 경고 섹션에서 목록 확인

### REQ-006: 스터디홀 미세팅 학생 경고 목록
- **Priority**: Must
- **Description**: 최근 4주 내 수업이 있었으나 다음 7일 스터디홀 스케줄이 없는 학생 목록
- **Acceptance Criteria**: 학생명 목록 표시. 건수 뱃지 표시.
- **Verification**: (BROWSER) 경고 섹션에서 목록 확인

### REQ-007: API Route — SuperfastSAT v2 데이터 조회
- **Priority**: Must
- **Description**: `/api/admin/srm/schedule?date=YYYY-MM-DD` — 해당 날짜(KST)의 coach_room + study_hall 이벤트와 참여자 이름 반환. SMS_SUPABASE_URL + SMS_SUPABASE_SERVICE_KEY 사용. 서버사이드 전용.
- **Acceptance Criteria**: date 파라미터 기준 KST 00:00~23:59를 UTC로 변환해 쿼리. 응답: `{ coachRoom: [...], studyHall: [...] }`
- **Verification**: (TEST) API route unit test

### REQ-008: API Route — 위험 학생 목록 조회
- **Priority**: Must
- **Description**: `/api/admin/srm/alerts` — 수업 미잡힌 조합(48개) + 스터디홀 미세팅 학생(63개) 반환
- **Acceptance Criteria**: `{ noUpcomingClass: [...], noStudyHall: [...] }` 형태 반환
- **Verification**: (TEST) API route unit test

## Technical Design

### Architecture

```
src/
  app/
    admin/
      layout.tsx          ← NAV_ITEMS에 SRM 추가
      srm/
        page.tsx           ← 메인 페이지 (client component)
        components/
          DayTabs.tsx       ← 3일 탭
          ScheduleList.tsx  ← 수업/스터디홀 공통 리스트
          AlertSection.tsx  ← 경고 섹션
  api/
    admin/
      srm/
        schedule/route.ts  ← GET ?date=YYYY-MM-DD
        alerts/route.ts    ← GET
  lib/
    supabase-sfv2.ts       ← SuperfastSAT v2 서버 클라이언트
```

### SuperfastSAT v2 Supabase 클라이언트

```ts
// src/lib/supabase-sfv2.ts
import { createClient } from '@supabase/supabase-js';
const url = process.env.SMS_SUPABASE_URL!;
const key = process.env.SMS_SUPABASE_SERVICE_KEY!;
export const supabaseSFv2 = createClient(url, key);
```

### 시간 변환 규칙

- KST = UTC + 9h
- `date=2026-06-11` (KST) → UTC 범위: `2026-06-10T15:00:00Z` ~ `2026-06-11T14:59:59Z`

### 데이터 조회 패턴

schedule API:
1. `scheduled_events` WHERE category IN (coach_room, study_hall) AND starts_at IN [UTC range] AND status != cancelled
2. 이벤트 ID 목록으로 `scheduled_event_participants` 조회
3. user_id 목록으로 `profiles` 조회 (full_name, role)
4. 이벤트별로 학생/코치 조합 조립

alerts API:
1. 최근 4주 coach_room matching_id 집합 A
2. 향후 2주 coach_room matching_id 집합 B
3. A - B = 수업 미잡힌 매칭 → matching_students/teachers → profiles
4. 최근 4주 수업 있던 student_id 집합 C
5. 다음 7일 study_hall 있는 student_id 집합 D
6. C - D = 스터디홀 미세팅 학생 → profiles

### 의존성

- 환경변수: `SMS_SUPABASE_URL`, `SMS_SUPABASE_SERVICE_KEY` (기존 `.env.local`에 있음)
- `@supabase/supabase-js`: 기존 설치됨
- UI: 기존 admin 다크테마 (`bg-[#151719]`) 스타일 준수

## Traceability Matrix

| REQ ID  | Description                  | Verification | Status  |
|---------|------------------------------|--------------|---------|
| REQ-001 | SRM 네비게이션 메뉴           | (BROWSER)    | Pending |
| REQ-002 | 3일 탭                       | (BROWSER)    | Pending |
| REQ-003 | 수업 스케줄 목록              | (BROWSER)    | Pending |
| REQ-004 | 스터디홀 스케줄 목록          | (BROWSER)    | Pending |
| REQ-005 | 수업 미잡힌 조합 경고         | (BROWSER)    | Pending |
| REQ-006 | 스터디홀 미세팅 경고          | (BROWSER)    | Pending |
| REQ-007 | schedule API route           | (TEST)       | Pending |
| REQ-008 | alerts API route             | (TEST)       | Pending |
