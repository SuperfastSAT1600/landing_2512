# Spec: CRM 매출 집계 타임존(KST) 버그 수정

## 배경
CRM 대시보드 매출 KPI가 실제보다 적게 나옴. `payments.paid_at`(timestamptz)를 기간 필터할 때
`${from}T00:00:00`(오프셋 없음) 리터럴을 써서 Postgres가 **UTC 자정**으로 해석 → KST 자정~오전9시 결제가
전월로 밀려 누락. 예: `4/30 15:00 UTC`(=5/1 00:00 KST) 결제가 5월 매출에서 빠짐 → 5월 총매출 240만원 과소.
`inquiry_date`(naive KST 컬럼)는 정상이므로 손대지 않음.

## 요구사항
- REQ-001 (MANUAL): `paid_at` 기간 필터를 KST 명시(`+09:00`, 종료 `.999`)로 교체. 대상 4파일:
  - `src/app/api/crm/stats/route.ts` (156-157)
  - `src/app/api/crm/stats/detail/route.ts` (46-47)
  - `src/app/api/crm/marketing/stats/route.ts` (75-76)
  - `src/app/api/crm/marketing/weekly/route.ts` (176-177)
  - 변경: `.gte('paid_at', \`${from}T00:00:00+09:00\`)` / `.lte('paid_at', \`${to}T23:59:59.999+09:00\`)`
- REQ-002 (MANUAL): `inquiry_date` 필터는 변경 금지(naive KST).

## 검증
- `npx tsc --noEmit` 에러 0
- dev에서 2026-05 조회 시 총매출 ₩119,835,500(11,983만) = 시트 일치 확인
