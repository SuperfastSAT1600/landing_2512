# SRM 명단 탭

## Overview

SRM에 "명단" 탭을 추가해 funnel_stage='8' (수업 중) 전체 학생 명단을 보여주고,
각 학생 클릭 시 StudentPanel을 열어 바로 상담 기록을 남길 수 있게 한다.

## Requirements

### REQ-001: 수업중 학생 명단 API
- **Priority**: Must
- **Description**: CRM funnel_stage='8' 전체 학생 반환 (v2 연결 여부 무관)
- **Acceptance Criteria**: `GET /api/admin/srm/roster` → id, name, sfv2_profile_id, parent_timezone 반환, 이름순 정렬
- **Verification**: (TEST) funnel_stage='8' 학생 수 반환 확인

### REQ-002: StudentPanel CRM 학생 직접 열기
- **Priority**: Must
- **Description**: sfv2_profile_id 없는 CRM 학생도 StudentPanel 열 수 있어야 함
- **Acceptance Criteria**: StudentPanel이 sfv2ProfileId OR crmStudentId 둘 중 하나로 동작. comm 로그는 crmStudentId 기준으로 저장
- **Verification**: (BROWSER) 미연결 학생 클릭 시 패널 열리고 커뮤니케이션 기록 가능

### REQ-003: 명단 탭 UI
- **Priority**: Must
- **Description**: SRM 탭에 "명단" 추가, 이름 검색, 연결 상태 배지, 클릭 시 StudentPanel 오픈
- **Acceptance Criteria**: 전체 명단 표시, 이름 검색 필터, v2 연결 여부 표시, 학생 클릭 → StudentPanel
- **Verification**: (BROWSER) 명단 탭에서 학생 클릭 → 커뮤니케이션 로그 탭에서 기록 입력 및 저장

## Implementation Order
1. REQ-001 — roster API
2. REQ-002 — StudentPanel crmStudentId 지원
3. REQ-003 — 명단 탭 UI

## Out of Scope
- 페이지네이션 (86명 수준이면 불필요)
- 정렬 옵션
