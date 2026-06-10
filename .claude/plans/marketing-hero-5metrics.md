# 마케팅 Hero 위젯 — 5대 핵심 지표

## Overview

Hero 위젯 상단에 인입 / 컨택 성공률 / 결제 전환율 / 결제금액 / ROAS
5개 지표를 "이번 주" 기준으로 표시한다.
ROAS = 이번 주 결제금액 / 이번 주 META+구글SEO 광고비 합계.

## Requirements

### REQ-001: 주간 API에 컨택·결제·매출·광고비 데이터 추가
- **Priority**: Must
- **Description**: `/api/crm/marketing/weekly` 응답에 이번 주 컨택 수, 결제 수, 매출, 광고비 합계 추가
- **Acceptance Criteria**:
  - `this_week_contacted`: 이번 주 인입 리드 중 세일즈콜 예약(stage 2) 이상 도달 수
  - `this_week_paid`: 이번 주 최초결제 건수 (paid_at 기준)
  - `this_week_revenue`: 이번 주 결제 총액 (환불 차감)
  - `this_week_ad_spend`: 이번 주(월~오늘) META + 구글 SEO 광고비 합계
  - 기존 필드 유지
- **Verification**: (TEST) 컨택률·전환율·ROAS 계산값 단위 테스트

### REQ-002: Hero 위젯 5대 지표 UI
- **Priority**: Must
- **Description**: Hero 위젯에 5개 핵심 지표 카드를 가로 배치
- **Acceptance Criteria**:
  - 인입 / 컨택 성공률 / 결제 전환율 / 결제금액 / ROAS 순서로 표시
  - 광고비 미입력 시 ROAS 칸에 "+ 광고비 입력" 버튼 표시 → 클릭 시 AdSpend 모달
  - 기존 진척도 바·페이스·YoY 유지 (위에 배치)
- **Verification**: (BROWSER) 광고비 입력 후 ROAS 즉시 반영 확인

## Implementation Order
1. REQ-001 — API 확장
2. REQ-002 — UI 업데이트

## Out of Scope
- 주간 ROI 표시 (ROAS만)
- 채널별 주간 ROAS 분리
