# Spec: 유입소스(traffic_source) 이름 개편

## 배경
네이버 스프레드시트 매핑표에 맞춰 CRM 유입소스 옵션 이름을 실제 채널명 기준으로 재정의한다.
값은 `students.traffic_source` 에 raw TEXT로 저장되므로 코드 상수 변경 + 기존 데이터 마이그레이션이 함께 필요하다.

## 매핑 (기존 → 변경)
- 구글폼에서 즉시상담 → 랜딩 상담 예약 폼 카톡 - SuperfastSAT!  (기존 데이터 이관 대상, 사용자 확정)
- (구)랜딩페이지 즉시상담 → (구) 랜딩 즉시 카톡 상담 - [LD] SuperfastSAT
- (구)랜딩페이지 상담예약 → (구) 랜딩 구글폼 상담 예약
- (신)랜딩 페이지 상담예약 → (신) 랜딩 구글폼 상담 예약
- 네이버 검색 후 상담예약 → 네이버 블로그 게시물
- 브런치 → 브런치 카톡 - [BR]SuperfastSAT
- 공식 블로그 → 고스트블로그 메인페이지 카톡 - SuperfastSAT(@공식블로그)
- 소개/추천 → 소개  (referral 로직 유지)

동일 유지: 인스타그램 광고 / 인스타그램 오가닉 / B2B 파트너 / 책 / 레딧 / 기존DB / 대표전화 / 네이버 카페

신규 추가 (기존 데이터 없음):
- 랜딩 상담 폼 카톡 - SuperfastSAT!
- (신) 랜딩 즉시 카톡 상담 - [T] SuperfastSAT
- 네이버 블로그 메인 페이지 히어로 섹션 카톡 - [B]SuperfastsSAT
- 고스트블로그 게시물 푸터 카톡 - [BR]SuperfastSAT

## 요구사항
- REQ-001 (TEST): `src/types/crm.ts` `TrafficSource` union + `TRAFFIC_SOURCE_OPTIONS` 배열을 새 값·순서로 교체.
- REQ-002 (TEST): `src/lib/marketing-groups.ts` `SOURCE_GROUP_MAP` 키를 새 값으로 교체 (모든 옵션이 그룹에 매핑되어야 함).
- REQ-003 (TEST): `src/__tests__/marketing-groups.test.ts` 를 새 값으로 갱신, all-mapped 불변식 유지.
- REQ-004 (TEST): referral 리터럴 `'소개/추천'` → `'소개'` (`useEditForm.ts`, `InquirySection.tsx`).
- REQ-005 (TEST): `src/lib/sheets-sync-utils.ts` `TAB_META` 의 (구)/(신) 랜딩 값 갱신.
- REQ-006 (MANUAL): 기존 데이터 UPDATE 마이그레이션 SQL 작성 (사용자가 Supabase에서 직접 실행).

## 검증
- `npx vitest run src/__tests__/marketing-groups.test.ts src/lib/__tests__/sheets-sync-utils.test.ts`
- `npx tsc --noEmit` 로 union 타입 정합성 확인.
