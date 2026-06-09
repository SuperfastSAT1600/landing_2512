# 이탈 리드풀 — 검색 없이 기본 목록 표시

## Overview
현재 이탈 리드풀(LeadPool)은 이름을 검색해야만 학생 목록이 뜬다("이름을 입력하면 리드풀 학생을 검색합니다" 안내).
탭 진입 시 검색 없이도 전체 리드풀 목록이 바로 보이게 한다.

## Requirements

### REQ-001: 진입 시 전체 풀 목록 표시
- **Priority**: Must
- **Description**: LeadPool 진입(마운트) 시 빈 검색으로 전체 풀을 조회해 목록을 표시한다. 이름 입력 시 필터링, 비우면 다시 전체. `/api/crm/students?pool=true&search=`는 빈 검색에서 전체 풀(inactive+reactivating)을 반환하므로 이를 재사용.
- **Acceptance Criteria**: 이탈 리드풀 탭을 열면 검색 입력 없이 학생 목록이 보인다.
- **Verification**: (BROWSER) 이탈 리드풀 탭 진입 → 목록 표시 확인

## Technical Design
- `src/app/admin/crm/components/LeadPool.tsx` (수정): 이름 검색 디바운스 effect를 "빈 검색이면 비움" → "빈 검색이면 전체 로드(timeout 0), 입력 시 300ms 디바운스 필터"로 변경. 기존 stats-only 카운트 로드는 유지.
- 필터/탭/AI 검색 로직 변경 없음.

## Traceability Matrix
| REQ ID  | Description           | Verification | Test File | Status  |
|---------|-----------------------|--------------|-----------|---------|
| REQ-001 | 진입 시 전체 목록 표시 | (BROWSER)    | manual    | Pending |

## Out of Scope
- 페이지네이션/무한스크롤 (전체 로드)
- AI 검색·필터 동작 변경
