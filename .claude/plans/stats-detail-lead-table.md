# Spec: 채널 리드 세부 내역 표 개선

## 배경
`StatsDetailModal`의 leads 테이블(채널 드릴다운 "인스타그램 광고 리드 세부 내역")이
- 상태를 `active`/`inactive` 원시값으로 노출해 알아보기 어렵고
- 문의일 정렬이 없어 순서가 뒤섞여 있다.

## 요구사항

- REQ-1 (TEST): `LeadDetailItem`에 `is_paid: boolean` 추가. `buildStatsDetail`의 모든 leads
  분기에서 최초결제 기준 `isPaid(s)` 값을 채운다. (paid 분기 포함 일관 적용)
- REQ-2 (BROWSER): leads 테이블은 문의일(`date`) 오름차순으로 정렬해 표시한다. date 없는 행은 뒤로.
- REQ-3 (BROWSER): 상태 컬럼을 3-상태 뱃지로 표시.
  - `이탈`(회색/빨강): lead_status === 'inactive' 또는 funnel_stage === 'churned'
  - `결제`(초록): 위가 아니고 is_paid === true
  - `세일즈 중`(파랑): 그 외
- REQ-4 (MANUAL): 테이블 가독성 개선(행 hover, 문의일 `MM.DD` 유지, 정렬/줄바꿈 정돈).

## 검증
- `crm-stats-detail.test.ts`: is_paid 매핑 단위 테스트 추가.
- Playwright: 모달 열어 정렬·뱃지 스크린샷 확인.
