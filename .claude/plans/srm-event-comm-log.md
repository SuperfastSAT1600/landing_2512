# SRM 커뮤니케이션 로그 — 이벤트 기준 + 다중 대상 태그

## Overview

현재 커뮤니케이션 로그는 단일 `target`(학생/학부모/코치) 드롭다운으로 대화 상대를 하나만 선택한다.
이를 **이벤트 기준**으로 바꾸고, 해당 이벤트에 연관된 집단을 **복수 태그**로 선택할 수 있게 변경한다.
"우리" 태그를 추가해 내부 실수·조치도 기록 가능하게 한다.

## Requirements

### REQ-001: DB — parties 컬럼 추가
- **Priority**: Must
- **Description**: `srm_communications` 테이블에 `parties text[] DEFAULT '{}'` 추가. 기존 `target` 컬럼은 유지(구 데이터 호환).
- **Acceptance Criteria**: INSERT/SELECT에서 `parties` 배열 정상 동작
- **Verification**: (MANUAL) Supabase SQL Editor에서 컬럼 추가 후 확인

### REQ-002: API — parties 지원
- **Priority**: Must
- **Description**: POST에서 `parties: string[]` 받아 저장. GET에서 `parties` 반환. `CommEntry` 인터페이스에 `parties: string[]` 추가
- **Acceptance Criteria**: 기존 `target` 없이 `parties`만으로 저장/조회 가능
- **Verification**: (MANUAL) curl POST 테스트

### REQ-003: AddForm UI — 다중 태그 토글
- **Priority**: Must
- **Description**: `target` 드롭다운 제거, 대신 **학생 / 학부모 / 코치 / 우리** 토글 칩 버튼 (복수 선택 가능, 최소 1개 필수)
- **Acceptance Criteria**: 칩 클릭 시 on/off 토글, 선택된 칩은 강조 표시
- **Verification**: (BROWSER) AddForm에서 복수 선택 후 저장 확인

### REQ-004: AddForm — 이벤트 컨텍스트 표시
- **Priority**: Must
- **Description**: `eventId`가 있을 때 폼 상단에 "수업 HH:MM" 또는 "스터디홀 HH:MM" 이벤트 칩 표시. 없으면 표시 안 함
- **Acceptance Criteria**: 스케줄에서 학생 클릭 → 패널 → 이벤트 정보 폼 상단에 보임
- **Verification**: (BROWSER) 스케줄 뷰에서 학생 클릭 시 이벤트 칩 표시 확인

### REQ-005: 타임라인 표시 업데이트
- **Priority**: Must
- **Description**: 기존 단일 target 뱃지 → parties 배열의 각 항목을 뱃지로 표시. "우리" 태그는 빨간 뱃지
- **Acceptance Criteria**: 복수 태그가 개별 뱃지로 나열됨
- **Verification**: (BROWSER) StudentPanel 타임라인에서 복수 뱃지 확인

### REQ-006: 하위 호환 — 구 target 데이터 표시
- **Priority**: Must
- **Description**: `parties`가 빈 배열인 구 데이터는 `target` 필드를 폴백으로 사용해 표시
- **Acceptance Criteria**: 기존 커뮤니케이션 로그가 정상 표시됨
- **Verification**: (BROWSER) 기존 기록 확인

## Technical Design

### DB Migration (사용자 실행)
```sql
ALTER TABLE srm_communications 
  ADD COLUMN IF NOT EXISTS parties text[] DEFAULT '{}';
```

### 새 parties 값
- `'student'` — 학생
- `'parent'` — 학부모  
- `'coach'` — 코치
- `'us'` — 우리 (내부 실수/조치)

### AddForm 변경
- `target` state 제거
- `parties: Set<string>` state 추가 (기본값: `new Set(['student'])`)
- onSave 시그니처: `parties: string[]` 포함

### StudentPanel handleAdd 변경
- `target` 제거, `parties` 배열 전달

### 이벤트 컨텍스트
- `eventId` prop이 있고, `eventMeta?: { time: string; type: 'coachRoom' | 'studyHall' }` prop 추가
- StudentPanel에서 이벤트 메타 생성 후 AddForm에 전달

## Implementation Order
1. REQ-001 — DB 마이그레이션
2. REQ-002 — API 업데이트
3. REQ-003 + REQ-004 — AddForm UI
4. REQ-005 + REQ-006 — 타임라인 표시
5. StudentPanel handleAdd 연결

## Out of Scope
- 이벤트 검색/선택 UI (eventId는 스케줄 클릭으로만 전달)
- target 컬럼 삭제
