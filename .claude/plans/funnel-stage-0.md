# 퍼널 0단계 (리드 인입) 추가

## Overview

META 인스턴트폼 등 외부 채널에서 자동으로 유입된 리드를 "첫 메시지 발송(1단계)" 과 구분하기 위해 `'0'` 단계(리드 인입)를 추가한다. 시트에서 들어온 리드는 `'0'`으로 시작하고, 매니저가 첫 메시지를 보내면 `'1'`로 이동한다.

## Requirements

### REQ-001: FunnelStage 타입에 '0' 추가
- **Priority**: Must
- **Verification**: (TEST) 타입 컴파일 통과

### REQ-002: 칸반에 '리드 인입' 컬럼 추가
- **Priority**: Must
- **Verification**: (BROWSER) 칸반 맨 왼쪽에 '리드 인입' 컬럼 노출

### REQ-003: sheets-sync에서 funnel_stage '0'으로 생성
- **Priority**: Must
- **Verification**: (TEST) 시트에서 들어온 리드가 '0' 단계로 등록

### REQ-004: 통계(stats) '0' 단계 미접촉으로 처리
- **Priority**: Must
- **Verification**: (TEST) funnel_stage '0'은 contacted 아님으로 집계

## Implementation Order
1. REQ-001 → REQ-002 → REQ-003 → REQ-004
