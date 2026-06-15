# SRM 학생 상세 패널

## Overview

SRM 스케줄 뷰에서 학생 이름 클릭 시 우측에서 슬라이드인되는 사이드 패널.
sfv2 학습 데이터 + CRM 상담 히스토리(연결 시) + 커뮤니케이션 로그 통합 표시.
CRM 미연결 학생은 이름 검색으로 직접 연결 가능.

## Requirements

### REQ-001: 학생 이름 클릭 → 패널 열기
- **Priority**: Must
- **Acceptance Criteria**: ScheduleList, AlertSection의 학생 이름이 클릭 가능. 클릭 시 우측 패널 슬라이드인.
- **Verification**: (BROWSER) 학생 이름 클릭 후 패널 열림 확인

### REQ-002: 커뮤니케이션 로그 조회/추가
- **Priority**: Must
- **Acceptance Criteria**: 해당 학생의 srm_communications 목록 표시. 채널·대상·내용·작성자·날짜 포함. 새 로그 입력 폼 (채널, 대상, 내용) + 저장.
- **Verification**: (BROWSER) 로그 추가 후 목록에 반영 확인

### REQ-003: CRM 연결 UI
- **Priority**: Must
- **Acceptance Criteria**: 미연결 학생은 "CRM 연결" 섹션 표시. 이름 검색 → CRM 후보 목록 → 선택 → 연결. 연결 후 CRM 상담 히스토리 탭 활성화.
- **Verification**: (BROWSER) 연결 플로우 동작 확인

### REQ-004: CRM 상담 히스토리 (연결된 학생)
- **Priority**: Must
- **Acceptance Criteria**: CRM 연결된 학생은 consultation_timeline 역시간순 표시. 날짜·메모 내용.
- **Verification**: (BROWSER) 연결된 학생에서 CRM 히스토리 탭 확인

### REQ-005: API — 커뮤니케이션 CRUD
- **Priority**: Must
- **Description**: GET/POST `/api/admin/srm/communications?studentId=`
- **Verification**: (TEST)

### REQ-006: API — CRM 후보 검색
- **Priority**: Must
- **Description**: GET `/api/admin/srm/crm-candidates?q=이름` — CRM enrolled 학생 이름 검색
- **Verification**: (TEST)

### REQ-007: API — CRM 연결 저장
- **Priority**: Must
- **Description**: POST `/api/admin/srm/link` { sfv2ProfileId, crmStudentId } → students.sfv2_profile_id 업데이트
- **Verification**: (TEST)

### REQ-008: API — 학생 상세 (CRM 히스토리 포함)
- **Priority**: Must
- **Description**: GET `/api/admin/srm/student/[profileId]` — sfv2 profile + CRM link 여부 + consultation_timeline
- **Verification**: (TEST)

## Technical Design

```
srm/
  page.tsx                    ← selectedStudent 상태 추가
  components/
    ScheduleList.tsx           ← 학생 이름 onStudentClick 콜백 추가
    AlertSection.tsx           ← 학생 이름 onStudentClick 콜백 추가
    StudentPanel.tsx           ← 우측 슬라이드 패널 (신규)
    CommLog.tsx                ← 커뮤니케이션 로그 (신규)
    CrmLinkSection.tsx         ← CRM 연결 UI (신규)

api/admin/srm/
  communications/route.ts     ← GET(조회) + POST(추가) — landing_2512 srm_communications
  crm-candidates/route.ts     ← GET — landing_2512 students 이름 검색 (enrolled)
  link/route.ts               ← POST — students.sfv2_profile_id 업데이트
  student/[profileId]/route.ts← GET — sfv2 profile + CRM 조인
```

데이터 흐름:
- 커뮤니케이션 로그: landing_2512 `srm_communications` 읽기/쓰기 (supabaseAdmin)
- CRM 히스토리: landing_2512 `students.consultation_timeline` 읽기 (sfv2_profile_id로 조인)
- sfv2 프로필: sfv2 `profiles` 읽기 (supabaseSFv2)
