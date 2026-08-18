# CRM 진단테스트 명단 검색

## Overview

StudentDetailPanel의 진단테스트 연결 picker에서 전체 명단을 미리 로드하지 않고,
이름/이메일 입력 시 검색 결과를 보여주도록 변경한다.

현재: picker 열면 student_id IS NULL인 최신 30건 자동 로드
변경: picker 열면 검색 input만 표시, 입력 시 debounce 300ms → API 검색

## Requirements

### REQ-001: API 검색 파라미터 지원
- **Priority**: Must
- **Description**: GET `/api/crm/students/[id]/diagnostic-link?search=query` — search가 있을 때 diagnostic_test_results 전체에서 student_name/student_email ilike 검색, 최대 10건 반환. search 없으면 candidates 빈 배열 반환 (linked 정보만).
- **Acceptance Criteria**: `?search=홍길동` 요청 시 이름에 "홍길동" 포함된 결과만 반환
- **Verification**: (BROWSER) 검색 시 결과 확인

### REQ-002: 자동 로드 제거
- **Priority**: Must
- **Description**: picker 열 때 fetchDiagLink를 호출하지 않는다. 대신 초기 상태(diagLinked)만 panel 최초 로드 시 가져온다.
- **Acceptance Criteria**: picker 버튼 클릭 시 네트워크 요청 없이 바로 picker UI 표시
- **Verification**: (BROWSER) 브라우저 네트워크 탭에서 picker 열 때 추가 요청 없음

### REQ-003: 검색 input 추가
- **Priority**: Must
- **Description**: picker 내부 상단에 텍스트 input 추가. placeholder "이름 또는 이메일 검색…". 입력 시 300ms debounce 후 API 검색. 2자 미만이면 요청 안 함.
- **Acceptance Criteria**: input에 타이핑하면 결과 목록이 업데이트됨
- **Verification**: (BROWSER) 이름 입력 → 결과 표시

### REQ-004: 빈 상태 UX
- **Priority**: Should
- **Description**: 검색어 없을 때 "이름 또는 이메일로 검색하세요" 안내. 결과 없을 때 "결과 없음". 로딩 중 스피너.
- **Acceptance Criteria**: 각 상태별 적절한 메시지 표시
- **Verification**: (BROWSER) 각 상태 확인

## Technical Design

### Backend
- `route.ts` GET: `searchParams.get('search')` 추출
- search 있으면: `.or('student_name.ilike.%q%,student_email.ilike.%q%').limit(10)` (student_id 조건 없음 — 전체 검색)
- search 없으면: candidates = []

### Frontend
- 새 state: `diagSearchQuery: string`
- `fetchDiagLink()`: linked 정보만 가져오도록 유지 (panel 마운트 시 1회)
- 새 함수 `searchDiagCandidates(q: string)`: `?search=q` 붙여서 fetch
- useEffect on `diagSearchQuery` + `showDiagPicker`: 300ms debounce, q.length >= 2일 때만 실행
- picker 버튼: `setShowDiagPicker(!showDiagPicker)` 만 (fetchDiagLink 제거)
- picker UI: input 추가, 상태별 안내

## Out of Scope
- 검색 결과 페이징
- 날짜 필터
