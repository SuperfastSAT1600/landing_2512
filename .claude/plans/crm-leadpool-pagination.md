# 이탈 리드풀 — 페이지네이션

## Overview
이탈 리드풀 목록이 (1) Supabase 기본 1,000행 상한에 걸려 ~999명만 보이고, (2) 한 화면에 수백 카드를 렌더해 무겁다.
**전체 풀 조회(상한 우회) + 클라이언트 페이지네이션(50명/페이지)**으로 해결한다.
모든 기존 필터(이탈유형·사유·학년·기간·상담 키워드)·선택·AI 검색이 그대로 동작해야 한다(키워드 필터는 JSONB라 서버로 못 옮기므로 클라이언트 유지).

## Requirements

### REQ-001: 1,000행 상한 우회 (전체 풀 조회)
- **Priority**: Must
- **Description**: `/api/crm/students?pool=true` 목록 조회에 `.range(0, 4999)`를 적용해 1,000행 상한을 넘겨 전체 이탈 풀을 반환한다. (stats_only 경로는 그대로 count만.)
- **Acceptance Criteria**: 1,170명 전체가 조회된다.
- **Verification**: (MANUAL) 응답 행 수 확인

### REQ-002: 클라이언트 페이지네이션 UI
- **Priority**: Must
- **Description**: 이탈 탭 목록을 50명/페이지로 나눠 표시하고, 하단에 페이지 컨트롤(이전/다음 + "N / M 페이지, 총 K명")을 둔다. 필터·검색·탭·AI결과 변경 시 1페이지로 리셋. 선택·일괄작업·AI검색은 기존 동작 유지.
- **Acceptance Criteria**: 페이지를 넘기며 전체 목록을 볼 수 있고, 필터가 전체에 적용된다.
- **Verification**: (BROWSER) 페이지 이동 + 필터 동작 확인

## Technical Design
- `src/app/api/crm/students/route.ts` (수정): pool 목록 쿼리에 `.range(0, 4999)` 추가.
- `src/app/admin/crm/components/LeadPool.tsx` (수정): `page` state, `currentList`를 50개씩 slice, 페이지 컨트롤 렌더, 필터/검색/탭/AI 변경 시 page=1 리셋.
- 서버 페이지네이션이 아닌 이유: 상담 키워드 필터가 JSONB라 PostgREST ilike 불가(400) → 서버 페이지네이션 시 필터가 페이지 단위로만 적용되어 깨짐. 전체 조회 후 클라이언트 분할이 모든 필터를 보존.

## Traceability Matrix
| REQ ID  | Description            | Verification | Test File | Status  |
|---------|------------------------|--------------|-----------|---------|
| REQ-001 | 1000행 상한 우회(배치)  | (MANUAL)     | curl (1171행) | Done |
| REQ-002 | 클라이언트 페이지네이션 | (BROWSER)    | manual (스크린샷) | Done |

## Out of Scope
- 서버 오프셋 페이지네이션(키워드 JSONB 필터 제약으로 보류)
- 초기 로드 시간 단축(전체 조회 특성상 유지) — 1회 로드
- 페이지 간 전체선택(현재 필터셋 기준 선택 동작 유지)
