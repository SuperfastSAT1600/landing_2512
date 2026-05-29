# CRM 3탭 구조 개편

## Overview

세일즈 칸반 / 결제 완료 리드 / 리드 풀 3탭 구조로 개편.
MatchingKanban 탭 제거, stage 8·9 제거, lead_status에 'enrolled' 추가.

## Requirements

### REQ-001: DB — lead_status에 enrolled 추가
- **Priority**: Must
- **Verification**: (MANUAL) migration 실행 후 enrolled 값 insert 가능 확인

### REQ-002: FunnelStage에서 8, 9 제거
- **Priority**: Must
- **Verification**: (TEST) tsc --noEmit 통과

### REQ-003: LeadStatus에 enrolled 추가, labels 업데이트
- **Priority**: Must
- **Verification**: (TEST) tsc --noEmit 통과

### REQ-004: SalesKanban SALES_STAGES에서 8, 9 제거
- **Priority**: Must
- **Verification**: (BROWSER) 칸반에 8·9 컬럼 없음

### REQ-005: EnrolledLeads 컴포넌트 신규 추가
- **Priority**: Must
- **Description**: lead_status='enrolled' 학생 목록. 이름/학년/결제일/매출 표시. 수업 종료 → inactive 전환 버튼.
- **Verification**: (BROWSER) 결제 완료 탭에 학생 목록 표시

### REQ-006: page.tsx 탭 구조 개편
- **Priority**: Must
- **Description**: 세일즈 칸반 | 결제 완료 | 리드 풀 | 통계
- **Verification**: (BROWSER) 4탭 표시

## Implementation Order
1. REQ-001 (migration 파일 생성 → 사용자가 실행)
2. REQ-002 + REQ-003 (types)
3. REQ-004 (SalesKanban)
4. REQ-005 (EnrolledLeads)
5. REQ-006 (page.tsx)
