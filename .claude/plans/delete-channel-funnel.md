# Spec: 채널 퍼널 기능 완전 삭제

## 배경
채널 퍼널(세일즈 전략 > 채널 퍼널) 기능을 완전 삭제. 나중에 재기획 후 새로 만들 예정.
숨김이 아니라 코드 삭제. DB 테이블/마이그레이션은 역사 보존 위해 남긴다(추후 필요 시 별도 drop).

## footprint (조사 완료 — 완전 격리, 테스트 없음)
- 컴포넌트: `FunnelBoard.tsx`
- API: `api/crm/strategy-funnel/route.ts`, `api/crm/funnel-notes/route.ts`, `api/crm/funnel-notes/[id]/route.ts`
- 타입: `types/crm.ts` 의 "채널 퍼널 시도 전략 주석" 블록(`FunnelStageKey`, `FunnelNote`)
- 진입: `StrategiesTab.tsx` 의 `funnel` 서브탭(현재 기본 탭)

## 요구사항
- REQ-1: 위 컴포넌트·API 3파일 삭제, `FunnelBoard` import·렌더·탭 항목 제거.
- REQ-2: `SubTab`에서 `'funnel'` 제거, 기본 서브탭을 `'experiment'`(남은 첫 탭)로 변경. `max-w-6xl` 폭 조건에서 funnel 제거.
- REQ-3: `types/crm.ts`에서 `FunnelStageKey`·`FunnelNote` 블록 삭제. (메인 `FunnelStage` 시스템은 건드리지 않음)
- REQ-4 (BROWSER): 세일즈 전략 탭 바에 "채널 퍼널"이 없고, 나머지 탭(실험/세일즈 로직 통계/전략 라이브러리) 정상 동작. 기본 진입 = 실험.
- REQ-5 (MANUAL): typecheck/lint clean(orphan import·type 없음). 공유 lib(week-definitions, crm-stats-core, funnel-stats)은 다른 기능이 쓰므로 유지.

## 보존(삭제 안 함)
- `funnel_notes` 테이블 + 마이그레이션 094 (역사 보존). 추후 완전 정리 원하면 별도 drop 마이그레이션.

## 검증
- Playwright: 세일즈 전략 화면 스크린샷 → "채널 퍼널" 탭 없음, 기본=실험.
- `tsc --noEmit` 통과, `next build` 라우트 에러 없음.
