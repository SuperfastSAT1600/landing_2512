# SRM 스케줄 통합 타임라인

## Overview

현재 SRM 스케줄 탭은 수업(코치룸)과 스터디홀을 좌우 두 컬럼으로 분리해 보여준다.
알림을 시간순으로 처리해야 할 때 한쪽을 다 끝내고 나서 다른 쪽으로 넘어가면 시간을 놓치는 문제가 있다.
`starts_at` 기준 단일 타임라인으로 통합해 "지금 뭘 해야 하는지"를 바로 볼 수 있게 한다.

## Requirements

### REQ-001: 통합 타임라인 컴포넌트 — 연락 시각 기준 정렬
- **Priority**: Must
- **Description**: 내일 이벤트의 sort key = `starts_at - 24h` ("오늘 같은 시각에 연락"). 오늘/내일 섹션 구분 없이 하나의 flat 피드로 렌더링. 내일 이벤트 행에는 "내일" 뱃지 표시.
- **Acceptance Criteria**: 오늘 14:00 수업 + 내일 13:00 수업 → 13:00(내일) → 14:00(오늘) 순서로 표시
- **Verification**: (BROWSER) 내일 9시 스터디홀이 오늘 14시 수업보다 위에 나타난다

### REQ-002: 이벤트 타입 뱃지
- **Priority**: Must
- **Description**: 각 이벤트 행에 "수업" 또는 "스터디홀" 타입 뱃지를 표시한다
- **Acceptance Criteria**: 수업은 파란색 "수업" 뱃지, 스터디홀은 회색 "스터디홀" 뱃지가 붙는다
- **Verification**: (BROWSER) 두 타입이 섞인 리스트에서 각 행의 타입을 육안으로 구분할 수 있다

### REQ-003: 복사 버튼 타입별 메시지
- **Priority**: Must
- **Description**: 복사 버튼 클릭 시 이벤트 타입에 따라 수업 메시지 또는 스터디홀 메시지를 생성한다
- **Acceptance Criteria**: 기존 `buildCopyMessage` / `buildStudyHallCopyMessage` 로직을 그대로 재사용한다
- **Verification**: (BROWSER) 수업 행 복사 → 수업 알림 문구, 스터디홀 행 복사 → 스터디홀 문구

### REQ-004: page.tsx 교체
- **Priority**: Must
- **Description**: 기존 두 `ScheduleList` 컴포넌트를 제거하고 `UnifiedTimeline` 하나로 교체한다
- **Acceptance Criteria**: 스케줄 탭에 좌우 분리 컬럼 없이 단일 피드가 표시된다
- **Verification**: (BROWSER) 스케줄 탭 접속 시 수업·스터디홀이 하나의 목록에 시간순으로 보인다

## Technical Design

### Architecture

- 새 파일: `src/app/admin/srm/components/UnifiedTimeline.tsx`
- 수정 파일: `src/app/admin/srm/page.tsx` (두 ScheduleList → UnifiedTimeline 교체)
- `ScheduleList.tsx`의 유틸 함수(`toTimeStr`, `buildCopyMessage`, `buildStudyHallCopyMessage`, `buildLocalParts`, `TZ_REGION`, `tzToRegion`)를 `UnifiedTimeline.tsx`로 이동 또는 공유
- `ScheduleList` 컴포넌트 자체는 삭제하지 않음 (다른 곳에서 사용 가능성)

### 병합 로직

```ts
type TaggedEvent = ScheduleEvent & { type: 'coachRoom' | 'studyHall'; day: 'today' | 'tomorrow' };

function mergeAndSort(
  todayCoach: ScheduleEvent[], todaySH: ScheduleEvent[],
  tomorrowCoach: ScheduleEvent[], tomorrowSH: ScheduleEvent[]
): TaggedEvent[] {
  return [
    ...todayCoach.map(e => ({ ...e, type: 'coachRoom', day: 'today' })),
    ...todaySH.map(e => ({ ...e, type: 'studyHall', day: 'today' })),
    ...tomorrowCoach.map(e => ({ ...e, type: 'coachRoom', day: 'tomorrow' })),
    ...tomorrowSH.map(e => ({ ...e, type: 'studyHall', day: 'tomorrow' })),
  ].sort((a, b) => {
    if (a.day !== b.day) return a.day === 'today' ? -1 : 1;
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });
}
```

### Dependencies

- 기존 `ScheduleEvent` 타입 (route.ts export)
- 기존 `useAdminAuth` hook
- 기존 copy-log API (`/api/admin/srm/copy-log`)

## Traceability Matrix

| REQ ID  | Description              | Verification | Status  |
|---------|--------------------------|--------------|---------|
| REQ-001 | 통합 타임라인 병합·정렬   | (BROWSER)    | Pending |
| REQ-002 | 타입 뱃지                | (BROWSER)    | Pending |
| REQ-003 | 복사 메시지 타입별 분기   | (BROWSER)    | Pending |
| REQ-004 | page.tsx 교체            | (BROWSER)    | Pending |

## Implementation Order

1. REQ-001+002+003 — `UnifiedTimeline.tsx` 신규 작성 (병합·뱃지·복사 한 번에)
2. REQ-004 — `page.tsx`에서 두 ScheduleList 제거 후 UnifiedTimeline 삽입

## Out of Scope

- 기존 `ScheduleList` 컴포넌트 삭제
- 뷰 모드 토글 (분리 보기 / 타임라인 보기)
- 알림 발송 자동화
