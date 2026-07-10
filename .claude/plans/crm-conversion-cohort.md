# Spec: 결제 전환율 코호트 기준 수정 + ₩1 placeholder 제외

## 배경
대시보드 결제 전환율이 실제보다 낮게 나옴. `stats/route.ts`가 결제자(paidCount)를
"기간 내(paid_at) 최초결제"로만 세서, 인입한 달에 결제까지 안 하고 **다음 달에 결제한 리드**를
놓침(4월 4명·5월 4명 확인). 전환율은 "그 달 인입 코호트가 언제든 결제했나"여야 함.
또 ₩1 placeholder 결제(유지아·오승유)가 결제자로 잡혀 과다집계됨.

## 요구사항
- REQ-001 (MANUAL): 결제자 판단(paidStudentIds/Names)을 기간(paid_at) 무관 **최초결제 有** 코호트 기준으로 변경.
  `payments`에서 `payment_type='최초결제' AND amount>1` 전체 조회해 집합 구성.
- REQ-002 (MANUAL): `amount>1` 조건으로 **₩1 placeholder 결제 제외**.
- REQ-003 (MANUAL): 매출·환불(총매출/순매출)은 **기간(paid_at, KST) 기준 그대로 유지** — paymentList 합산 로직 불변.
- 대상: `src/app/api/crm/stats/route.ts` (대시보드 KPI). marketing/stats는 후속 검토.

## 검증
- `tsc --noEmit` 에러 0
- 4월 전환율 21.43%(12/56) → 28.57%(16/56), 5월 35.29%(18/51) → 39.22%(20/51, ₩1 2건 제외)
- 총매출 4월 ₩118,151,500 / 5월 ₩119,835,500 불변
