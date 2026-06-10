# 마케팅 API 성능 최적화

## Overview
weekly API의 DB 쿼리 낭비(12회 직렬)와 프론트 불필요 재호출을 제거.

## Requirements

### REQ-001: 12주 평균 — DB 1회 쿼리로 통합
- **Priority**: Must
- **Description**: for 루프 12번 직렬 쿼리 → 12주 전체 날짜 범위 1회 쿼리 후 JS 그루핑
- **Acceptance Criteria**: DB 쿼리 12 → 1회, 결과값 동일
- **Verification**: (TEST) 그루핑 로직 단위 테스트

### REQ-002: YoY + 12주 hist 병렬 실행
- **Priority**: Must
- **Description**: 직렬 await → Promise.all
- **Acceptance Criteria**: YoY와 12주 hist 쿼리가 동시 실행
- **Verification**: (TEST) 병렬 구조 확인

### REQ-003: 프론트 weekly 재호출 제거
- **Priority**: Must
- **Description**: fetchWeekly를 날짜 변경 useEffect에서 분리 → 마운트 1회만
- **Acceptance Criteria**: 날짜 범위 변경 시 weekly API 호출 없음
- **Verification**: (BROWSER) 날짜 변경 시 네트워크 탭 확인

## Implementation Order
1. REQ-001 + REQ-002 (weekly/route.ts)
2. REQ-003 (page.tsx)
