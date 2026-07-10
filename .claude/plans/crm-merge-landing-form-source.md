# Spec: 유입소스 "랜딩 상담 폼 카톡" → "랜딩 상담 예약 폼 카톡" 통합

## 배경
유입소스 드롭다운에 `랜딩 상담 폼 카톡 - SuperfastSAT!`(예약 없음)과
`랜딩 상담 예약 폼 카톡 - SuperfastSAT!`(예약)가 둘 다 있음. 사용자 요청으로
**예약 폼 카톡 하나로 통합**(예약 없는 쪽 제거).

DB 현황: `랜딩 상담 폼 카톡`(예약X) students 0건 (이관할 데이터 없음), 예약 쪽 154건.

## 요구사항
- REQ-001 (TEST): `src/types/crm.ts` TrafficSource union + TRAFFIC_SOURCE_OPTIONS에서 `랜딩 상담 폼 카톡 - SuperfastSAT!` 제거.
- REQ-002 (TEST): `src/lib/marketing-groups.ts` SOURCE_GROUP_MAP에서 해당 키 제거.
- REQ-003 (TEST): `src/__tests__/marketing-groups.test.ts` ALL_SOURCES·googleSources에서 제거.
- REQ-004 (MANUAL): 방어적 데이터 이관 SQL (있으면 예약 쪽으로 UPDATE, 현재 0건이라 no-op). students + growth_experiments.

## 검증
- `tsc --noEmit` 0, `vitest run marketing-groups` 통과
- 드롭다운에 "랜딩 상담 폼 카톡"(예약X) 미표시
