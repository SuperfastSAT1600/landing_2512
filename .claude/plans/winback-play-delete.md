# 윈백 플레이 삭제 UI

## Overview

`/api/crm/winback-plays/[id]` DELETE는 이미 구현·동작한다(타겟·변형은 `ON DELETE CASCADE`로 함께 삭제,
학생 상담메모 미러는 발송 사실 기록이라 남김). 하지만 UI에 삭제를 호출하는 지점이 없어
관리자가 잘못 만든/끝난 플레이를 캠페인 관리 화면에서 지울 방법이 없다.

목록(`WinbackPlayList`)과 상세(`WinbackPlayDetail`) 양쪽에 삭제 버튼을 추가한다.
기존 `ExperimentBoard`의 삭제 UX(휴지통 아이콘 + `window.confirm` + 실패 시 에러 노출)를 그대로 따른다.

## Requirements

### REQ-001: 훅에 deletePlay 추가
- **Priority**: Must
- **Description**: `useWinbackPlays`에 `deletePlay(playId): Promise<void>`를 추가한다.
  `DELETE /api/crm/winback-plays/{id}`를 호출하고 성공하면 `fetchPlays()`로 목록을 갱신한다.
  실패하면 기존 `call()` 헬퍼와 동일하게 에러를 throw한다(호출부가 처리).
- **Acceptance Criteria**: 성공 시 목록 재조회 1회 발생. 실패(4xx/5xx) 시 에러 메시지를 담아 throw.
- **Verification**: (TEST) fetch mock으로 성공/실패 2케이스

### REQ-002: 목록에서 삭제
- **Priority**: Must
- **Description**: `WinbackPlayList` 각 항목에 휴지통 아이콘 버튼을 추가한다.
  클릭 시 `onOpen`으로 전파되지 않도록 `stopPropagation`, `confirm('"{title}" 플레이를 삭제할까요? 타겟·변형 기록도 함께 삭제됩니다.')`
  통과 시 `onDelete(playId)` 호출. 삭제 중엔 버튼 비활성화, 실패 시 `alert(message)`로 알린다
  (기존 컴포넌트에 별도 토스트 인프라 없음 — `ExperimentBoard` 관례 따름).
- **Acceptance Criteria**: 확인 취소 시 삭제 호출 안 됨. 확인 시 `deletePlay` 호출되고 목록에서 사라짐.
- **Verification**: (TEST) React Testing Library로 confirm mock true/false 케이스 + 목록 갱신 확인

### REQ-003: 상세 화면에서 삭제
- **Priority**: Must
- **Description**: `WinbackPlayDetail` 헤더(새로고침 버튼 옆)에 삭제 버튼을 추가한다.
  같은 confirm 문구 사용. 성공하면 `onBack()`을 호출해 목록으로 돌아간다(목록은 REQ-001의 fetchPlays로 이미 갱신됨).
- **Acceptance Criteria**: 삭제 성공 시 상세 화면이 닫히고 목록 화면으로 돌아간다.
- **Verification**: (TEST) deletePlay mock 성공 시 onBack 호출 확인

### REQ-004: 배선
- **Priority**: Must
- **Description**: `WinbackPlaysTab`이 `winback.deletePlay`를 `WinbackPlayList`(`onDelete`)와
  `WinbackPlayDetail`(`deletePlay`)에 전달한다.
- **Acceptance Criteria**: 두 화면 모두 실제 삭제가 동작한다(dev 서버 수동 확인).
- **Verification**: (BROWSER) dev 서버에서 테스트 플레이 생성 → 목록에서 삭제 → 상세에서 삭제 확인

## Technical Design

### Architecture
- `src/app/admin/crm/components/winback/hooks/useWinbackPlays.ts` — `deletePlay` 추가.
- `src/app/admin/crm/components/winback/WinbackPlayList.tsx` — 항목별 삭제 버튼, `onDelete` prop 추가.
- `src/app/admin/crm/components/winback/WinbackPlayDetail.tsx` — 헤더 삭제 버튼, `deletePlay` prop 추가.
- `src/app/admin/crm/components/winback/WinbackPlaysTab.tsx` — 위 두 곳에 `winback.deletePlay` 배선.
- API 변경 없음(이미 존재).

### Dependencies
없음. 기존 `/api/crm/winback-plays/[id]` DELETE 재사용.

## Traceability Matrix

| REQ ID  | Description          | Verification | Test File                                                        | Status  |
|---------|-----------------------|--------------|-------------------------------------------------------------------|---------|
| REQ-001 | 훅 deletePlay          | (TEST)       | `src/app/admin/crm/components/winback/hooks/__tests__/useWinbackPlays.test.ts` | Done |
| REQ-002 | 목록 삭제 UI           | (TEST)       | `src/app/admin/crm/components/winback/__tests__/WinbackPlayList.test.tsx` | Done |
| REQ-003 | 상세 삭제 UI           | (TEST)       | `src/app/admin/crm/components/winback/__tests__/WinbackPlayDetail.test.tsx` | Done |
| REQ-004 | 배선                   | (BROWSER)    | 수동 확인                                                          | Done |

## Implementation Order

1. REQ-001 — 훅부터(다른 두 UI가 이 함수에 의존)
2. REQ-002 · REQ-003 — 병렬 가능(서로 독립)
3. REQ-004 — 배선 후 브라우저 확인

## Out of Scope

- 삭제 대신 상태를 `archived`로 바꾸는 소프트 삭제(요청은 명시적으로 "삭제")
- 대량 선택 삭제(체크박스 다중 삭제) — 이번엔 개별 삭제만
